-- Test for migrations 0019 / 0020 (D1 job model: complaints with inspection, job cards, Job IDs, work, Final Inspection).
-- Safe to run: everything happens inside a transaction that is rolled back.
-- Uses the real demonstration accounts (TIC, TMAN, SUPE, HOT) and the seeded Mandaveli fleet J0264.
-- Success = no error.  Failure = an error naming the broken expectation.

begin;

-- a Tyre IC of another depot (Adyar has none), to prove depot isolation
insert into auth.users (id, aud, role, email) values ('00000000-0000-0000-0000-0000000000c7', 'authenticated', 'authenticated', 't10-tic2@test.invalid');
insert into public.employees (id, employee_code, full_name, role_code, org_unit_id)
values ('00000000-0000-0000-0000-0000000000e7', 'T10-TIC2', 'T10 TIC2', 'TIC', (select id from public.org_units where code = 'AD'));
insert into public.profiles (id, employee_id) values ('00000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-0000000000e7');

create function public.t_as(who text) returns void language plpgsql as $$
declare v_sub text;
begin
  execute 'reset role';
  select p.id::text into v_sub from public.profiles p join public.employees e on e.id = p.employee_id
   where e.employee_code = case who when 'ho' then 'HOT' when 'am' then 'HOTAE' when 'sup' then 'SUPE' when 'tic' then 'TIC' when 'tm' then 'TMAN' else 'T10-TIC2' end;
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_sub), true);
  execute 'set local role authenticated';
end $$;
grant execute on function public.t_as(text) to authenticated;

do $$
declare
  n int; fl uuid; tyres uuid[]; ty_fr uuid; ty_rri uuid; ty_other_fleet uuid; ctype_valve uuid; ctype_nolink2 uuid; ctype_linked uuid;
  c1 uuid; c2 uuid; c_tm uuid; card uuid; card2 uuid; ins uuid; ins2 uuid; jids uuid[]; r record; tm uuid; tic uuid; j1 uuid; shift_id uuid; newj uuid; comp record;
begin
  select id into tm from public.employees where employee_code = 'TMAN';
  select id into tic from public.employees where employee_code = 'TIC';
  select id into fl from public.fleets where fleet_no = 'J0264';
  select id into ty_fr from public.tyres where fleet_id = fl and fitted_position = 'FR';
  select id into ty_rri from public.tyres where fleet_id = fl and fitted_position = 'RRI';
  select id into ty_other_fleet from public.tyres where fleet_id <> fl and stock_place = 'FITTED' limit 1;
  select id into shift_id from public.shifts where shift_code = 'NIGHT';
  select id into ctype_valve from public.complaint_types where complaint_code = 'CMP001';
  select t.id into ctype_linked from public.complaint_types t where exists (select 1 from public.complaint_type_jobs l where l.complaint_type_id = t.id) order by complaint_code limit 1;
  select t.id into ctype_nolink2 from public.complaint_types t where not exists (select 1 from public.complaint_type_jobs l where l.complaint_type_id = t.id) order by complaint_code offset 1 limit 1;

  -- seeds
  select count(*) into n from public.complaint_types; assert n = 67, 'the 67 D1 complaint types';
  select count(*) into n from public.complaint_type_jobs; assert n = 74, 'required-job links of the D1 complaint master';
  select count(*) into n from public.maintenance_jobs where status = 'ACTIVE' and job_code between 'JOB-001' and 'JOB-012'; assert n = 10, 'ten active D1 jobs';
  assert (select status from public.maintenance_jobs where job_code = 'JOB-007') = 'INACTIVE', 'JOB-007 exists but inactive';
  assert (select status from public.maintenance_jobs where job_code = 'JOB-012') = 'INACTIVE', 'JOB-012 exists but inactive';
  assert (select est_minutes_per_fleet || '/' || est_minutes_per_tyre from public.maintenance_jobs where job_code = 'JOB-003') = '30/5', 'JOB-003 minutes';
  null;

  -- ---------------- complaints ----------------
  perform public.t_as('tm');
  c_tm := public.raise_complaint(fl, ty_fr, ctype_valve, 'noticed during air round');
  select * into comp from public.complaints where id = c_tm;
  assert comp.complaint_no >= 'CMPID-0601' and comp.source = 'TYRE_MAN' and comp.state = 'NEW', 'complaint not created as the D1 numbering / source say';
  begin perform public.raise_complaint(fl, ty_other_fleet, ctype_valve); assert false, 'tyre of another fleet accepted'; exception when raise_exception then null; end;
  perform public.t_as('sup');
  begin perform public.raise_complaint(fl, ty_fr, ctype_valve, 'no driver'); assert false, 'log sheet without driver'; exception when raise_exception then null; end;
  c1 := public.raise_complaint(fl, ty_rri, ctype_linked, 'driver says it pulls', null, '{"driver_name":"Test Driver"}'::jsonb);
  assert (select source from public.complaints where id = c1) = 'LOG_SHEET', 'log sheet source';
  perform public.t_as('ho');
  begin perform public.raise_complaint(fl, ty_fr, ctype_valve); assert false, 'HO raised a complaint'; exception when insufficient_privilege then null; end;
  perform public.t_as('tm'); select count(*) into n from public.complaints; assert n >= 1 and not exists (select 1 from public.complaints where raised_by <> app.my_employee_id() and inspection_id is null), 'a Tyre Man sees only complaints he raised or inspects';

  -- ---------------- complaint job card ----------------
  perform public.t_as('sup');
  begin perform public.job_card_create('COMPLAINT', fl, '{}', '{}', array[c1]); assert false, 'supervisor created a card'; exception when insufficient_privilege then null; end;
  perform public.t_as('tic2');
  begin perform public.job_card_create('COMPLAINT', fl, '{}', '{}', array[c1]); assert false, 'other depot used this fleet'; exception when raise_exception then null; end;
  perform public.t_as('tic');
  begin perform public.job_card_create('COMPLAINT', fl); assert false, 'complaint card without a complaint'; exception when raise_exception then null; end;
  begin perform public.job_card_create('SCHEDULE', fl); assert false, 'schedule card created by hand'; exception when raise_exception then null; end;
  card := public.job_card_create('COMPLAINT', fl, '{}', '{}', array[c1, c_tm],
            format('[{"tyre_id":"%s","complaint_type_id":"%s","remarks":"found by tyre ic"}]', ty_fr, ctype_nolink2)::jsonb, null, shift_id, 'check front right first');
  select * into r from public.job_cards where id = card;
  assert r.job_card_no >= 'JC-6201' and r.status = 'DRAFT' and r.job_type = 'COMPLAINT' and r.expected_date = app.business_today(), 'complaint card wrong';
  select count(*) into n from public.complaints where job_card_id = card and state = 'PENDING_INSPECTION'; assert n = 3, 'three complaints should wait for inspection';
  select count(*) into n from public.job_ids where job_card_id = card; assert n = 0, 'a complaint never becomes a Job ID directly';
  begin perform public.job_card_assign_work(card, array[tm]); assert false, 'work assigned before inspection'; exception when raise_exception then null; end;
  begin perform public.complaint_close(c1); assert false, 'closed a complaint that is not rejected'; exception when raise_exception then null; end;

  -- inspection by a Tyre Man
  begin perform public.job_card_assign_inspection(card, '00000000-0000-0000-0000-0000000000e7'::uuid); assert false, 'inspector of another depot'; exception when raise_exception then null; end;
  ins := public.job_card_assign_inspection(card, tm, null, shift_id, 'please inspect');
  assert (select inspection_no from public.inspections where id = ins) >= 'INSID-0001', 'inspection number';
  assert (select status from public.job_cards where id = card) = 'ASSIGNED_FOR_INSPECTION', 'card should be assigned for inspection';
  perform public.t_as('tm');
  select count(*) into n from public.job_cards; assert n >= 1, 'the inspector should see the card';
  select count(*) into n from public.complaints; assert n >= 3, 'the inspector should see the complaints of his inspection';
  perform public.t_as('tic');
  begin perform public.inspection_decide(ins, '[]'); assert false, 'a Tyre IC decided an inspection assigned to a Tyre Man'; exception when insufficient_privilege then null; end;
  perform public.t_as('tm');
  begin perform public.inspection_decide(ins, format('[{"complaint_id":"%s","approve":true}]', c1)::jsonb); assert false, 'not every complaint decided'; exception when raise_exception then null; end;
  begin perform public.inspection_decide(ins, format('[{"complaint_id":"%s","approve":false},{"complaint_id":"%s","approve":true},{"complaint_id":"%s","approve":true,"job_codes":["JOB-003"]}]',
                                          c_tm, c1, (select id from public.complaints where job_card_id = card and complaint_type_id = ctype_nolink2))::jsonb);
    assert false, 'a rejection without a reason'; exception when raise_exception then null; end;
  begin perform public.inspection_decide(ins, format('[{"complaint_id":"%s","approve":true},{"complaint_id":"%s","approve":true},{"complaint_id":"%s","approve":false,"reason":"ok"}]',
                                          (select id from public.complaints where job_card_id = card and complaint_type_id = ctype_nolink2), c1, c_tm)::jsonb);
    assert false, 'a complaint with no job code approved'; exception when raise_exception then null; end;
  -- reject the Tyre Man's own valve complaint (with a reason), approve the linked one (suggested job codes), approve the unlinked one with JOB-003
  perform public.inspection_decide(ins, format('[{"complaint_id":"%s","approve":false,"reason":"valve is fine"},{"complaint_id":"%s","approve":true},{"complaint_id":"%s","approve":true,"job_codes":["JOB-003"]}]',
                                     c_tm, c1, (select id from public.complaints where job_card_id = card and complaint_type_id = ctype_nolink2))::jsonb,
                                  format('[{"tyre_id":"%s","complaint_type_id":"%s","remarks":"found while inspecting","job_codes":["JOB-001"]}]', ty_rri, ctype_nolink2)::jsonb, 'inspected');
  execute 'reset role';
  assert (select status from public.job_cards where id = card) = 'INSPECTION_DONE', 'card should be inspection done';
  assert (select state from public.complaints where id = c_tm) = 'REJECTED', 'complaint not rejected';
  assert (select count(*) from public.complaints where job_card_id = card and source = 'INSPECTION' and state = 'APPROVED') = 1, 'the inspector''s new complaint is approved at once';
  select count(*) into n from public.job_ids where job_card_id = card and complaint_id = c1; assert n = (select count(*) from public.complaint_type_jobs l join public.maintenance_jobs j on j.id = l.job_id where l.complaint_type_id = ctype_linked and j.status = 'ACTIVE'), format('suggested job codes not used: got %s', n);
  select count(*) into n from public.job_ids where job_card_id = card; assert n >= 3, 'approved complaints should make Job IDs';
  assert (select min(job_id_no) from public.job_ids where job_card_id = card) >= 'JID-4201', 'Job ID numbering';
  assert (select estimated_minutes from public.job_cards where id = card) = (select sum(estimated_minutes) from public.job_ids where job_card_id = card) and (select estimated_minutes from public.job_cards where id = card) > 0, 'card total = sum of Job IDs';
  begin perform public.inspection_decide(ins, '[]'); assert false, 'inspection decided twice'; exception when raise_exception then null; end;

  -- the Tyre IC closes the rejected complaint; the card is not closed because other complaints are approved
  perform public.t_as('tic');
  perform public.complaint_reinspect(c_tm);
  assert (select state from public.complaints where id = c_tm) = 'PENDING_INSPECTION', 'reinspect should reopen the complaint';
  begin perform public.complaint_close(c_tm); assert false, 'closed a pending complaint'; exception when raise_exception then null; end;
  ins2 := public.job_card_assign_inspection(card, tic);
  perform public.t_as('tic');
  perform public.inspection_decide(ins2, format('[{"complaint_id":"%s","approve":false,"reason":"still fine"}]', c_tm)::jsonb);
  perform public.complaint_close(c_tm, 'driver agrees');
  assert (select state from public.complaints where id = c_tm) = 'CLOSED', 'complaint not closed';
  assert (select status from public.job_cards where id = card) = 'INSPECTION_DONE', 'the card must stay open while approved complaints remain';

  -- ---------------- assign work ----------------
  perform public.t_as('sup');
  begin perform public.job_card_assign_work(card, array[tm]); assert false, 'supervisor assigned work'; exception when insufficient_privilege then null; end;
  perform public.t_as('tic2');
  begin perform public.job_card_assign_work(card, array[tm]); assert false, 'other depot assigned work'; exception when raise_exception then null; end;
  perform public.t_as('tic');
  begin perform public.job_card_assign_work(card, array['00000000-0000-0000-0000-0000000000e7'::uuid]); assert false, 'staff of another depot'; exception when raise_exception then null; end;
  begin perform public.job_card_assign_work(card, '{}'::uuid[]); assert false, 'nobody chosen'; exception when raise_exception then null; end;
  perform public.job_card_assign_work(card, array[tm, tic], null, null, shift_id, 'MTC', 'night round');
  select count(*) into n from public.job_ids where job_card_id = card and status = 'ASSIGNED'; assert n = (select count(*) from public.job_ids where job_card_id = card), 'every Job ID should be assigned';
  select count(*) into n from public.job_id_assignees a join public.job_ids j on j.id = a.job_id_ref where j.job_card_id = card; assert n = 2 * (select count(*) from public.job_ids where job_card_id = card), 'both people on every Job ID by default';
  assert (select status from public.job_cards where id = card) = 'ASSIGNED_FOR_WORK', 'card should be assigned for work';

  -- ---------------- work ----------------
  select array_agg(id order by job_id_no) into jids from public.job_ids where job_card_id = card;
  perform public.t_as('tm'); select count(*) into n from public.job_ids; assert n >= cardinality(jids), 'the Tyre Man sees his Job IDs';
  begin perform public.job_id_complete(jids[1]); assert false, 'completed without Start Work'; exception when raise_exception then null; end;
  perform public.job_id_start(jids[1]);
  begin perform public.job_id_start(jids[1]); assert false, 'started twice'; exception when raise_exception then null; end;
  perform public.job_id_complete(jids[1]);
  assert (select status from public.job_ids where id = jids[1]) = 'DONE', 'Job ID not done';
  perform public.t_as('tic');
  begin perform public.job_id_complete(jids[2]); assert false, 'on behalf without reason'; exception when raise_exception then null; end;
  -- the Tyre IC is also an assignee of every Job ID, so he completes his own; the on-behalf path is tested with a card he is not on
  perform public.job_id_start(jids[2]); perform public.job_id_complete(jids[2]);
  for n in 3..cardinality(jids) loop perform public.job_id_start(jids[n]); perform public.job_id_complete(jids[n]); end loop;
  assert (select status from public.job_cards where id = card) = 'FINAL_INSPECTION', 'every Job ID done -> Final Inspection';

  -- ---------------- final inspection ----------------
  perform public.t_as('tm');
  begin perform public.final_inspection(card, 'PASS'); assert false, 'tyre man inspected'; exception when insufficient_privilege then null; end;
  perform public.t_as('sup');
  begin perform public.final_inspection(card, 'PASS'); assert false, 'supervisor inspected'; exception when insufficient_privilege then null; end;
  perform public.t_as('tic');
  begin perform public.final_inspection(card, 'REWORK'); assert false, 'rework without remarks'; exception when raise_exception then null; end;
  begin perform public.final_inspection(card, 'REWORK', 'redo', '{}'); assert false, 'rework without Job IDs'; exception when raise_exception then null; end;
  begin perform public.final_inspection(card, 'MAYBE'); assert false, 'bad result'; exception when raise_exception then null; end;
  perform public.final_inspection(card, 'REWORK', 'valve cap missing', array[jids[1]]);
  assert (select status from public.job_cards where id = card) = 'ASSIGNED_FOR_WORK', 'rework sends the card back to work';
  select * into r from public.job_ids where rework_of = jids[1];
  assert r.status = 'ASSIGNED' and r.tyre_id is not distinct from (select tyre_id from public.job_ids where id = jids[1]) and r.job_code_id = (select job_code_id from public.job_ids where id = jids[1]), 'rework Job ID wrong';
  assert (select count(*) from public.job_id_assignees where job_id_ref = r.id) = 2, 'rework Job ID keeps the assignees';
  perform public.job_id_start(r.id); perform public.job_id_complete(r.id);
  assert (select status from public.job_cards where id = card) = 'FINAL_INSPECTION', 'back to Final Inspection after the rework';
  perform public.final_inspection(card, 'FAIL', 'tyre pressure low');
  assert (select status from public.job_cards where id = card) = 'FINAL_INSPECTION_FAILED', 'fail';
  perform public.final_inspection(card, 'PASS');
  assert (select status from public.job_cards where id = card) = 'COMPLETED' and (select completed_at from public.job_cards where id = card) is not null, 'not completed';
  assert (select count(*) from public.complaints where job_card_id = card and state = 'APPROVED') = 0, 'approved complaints close with the card';
  select count(*) into n from public.final_inspections where job_card_id = card; assert n = 3, 'every inspection kept (rework, fail, pass)';
  begin perform public.final_inspection(card, 'PASS'); assert false, 'completed card inspected again'; exception when raise_exception then null; end;

  -- ---------------- job code card (no inspection) ----------------
  begin perform public.job_card_create('JOB_CODE', fl, array[ty_other_fleet], array['JOB-003']); assert false, 'tyre of another fleet'; exception when raise_exception then null; end;
  begin perform public.job_card_create('JOB_CODE', fl, array[ty_fr], array['JOB-007']); assert false, 'inactive group job code'; exception when raise_exception then null; end;
  card2 := public.job_card_create('JOB_CODE', fl, array[ty_fr, ty_rri], array['JOB-003']);
  select count(*) into n from public.job_ids where job_card_id = card2; assert n = 2, 'one Job ID per tyre for the job code';
  assert (select estimated_minutes from public.job_cards where id = card2) = 80, 'JOB-003: (30 per fleet + 5 x 2 tyres) x 2 Job IDs = 80 minutes';
  assert (select count(*) from public.job_ids where job_card_id = card2 and estimated_minutes = 40) = 2, 'each Job ID 40 minutes';
  begin perform public.job_card_assign_inspection(card2, tm); assert false, 'inspection on a job code card'; exception when raise_exception then null; end;
  perform public.job_card_assign_work(card2, array[tm]);
  assert (select status from public.job_cards where id = card2) = 'ASSIGNED_FOR_WORK', 'job code card goes from Draft straight to work';
  -- on behalf: the Tyre IC is not an assignee here
  perform public.t_as('tic');
  select id into j1 from public.job_ids where job_card_id = card2 order by job_id_no limit 1;
  begin perform public.job_id_complete(j1); assert false, 'on behalf without a reason'; exception when raise_exception then null; end;
  perform public.job_id_complete(j1, 'tyre man called to a breakdown');
  assert (select on_behalf_by from public.job_ids where id = j1) = tic, 'on-behalf actor kept';
  perform public.t_as('tm');
  perform public.job_id_start((select id from public.job_ids where job_card_id = card2 and status = 'ASSIGNED'));
  perform public.job_id_complete((select id from public.job_ids where job_card_id = card2 and status = 'STARTED'));
  assert (select status from public.job_cards where id = card2) = 'FINAL_INSPECTION', 'job code card at final inspection';

  -- ---------------- isolation, history, direct writes ----------------
  perform public.t_as('tic2');
  select count(*) into n from public.job_cards; assert n = 0, 'another depot sees job cards';
  select count(*) into n from public.complaints; assert n = 0, 'another depot sees complaints';
  select count(*) into n from public.job_ids; assert n = 0, 'another depot sees Job IDs';
  perform public.t_as('ho'); select count(*) into n from public.job_cards; assert n >= 2, 'HO sees every depot''s job cards';
  select count(*) into n from public.job_card_events where job_card_id = card; assert n >= 12, 'timeline events missing';
  perform public.t_as('tic');
  begin update public.job_card_events set event = 'x'; assert false, 'events edited'; exception when insufficient_privilege or integrity_constraint_violation then null; end;
  begin update public.job_cards set status = 'COMPLETED'; assert false, 'direct update allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.job_ids (job_id_no, job_card_id, org_unit_id, job_code_id) values ('HACK', card, (select org_unit_id from public.job_cards where id = card), (select id from public.maintenance_jobs limit 1)); assert false, 'direct insert allowed';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  assert not has_function_privilege('authenticated', 'app.new_job_id(uuid, uuid, uuid, uuid, uuid, uuid, uuid)', 'execute'), 'new_job_id callable';
  assert not has_function_privilege('anon', 'public.job_card_create(text, uuid, uuid[], text[], uuid[], jsonb, date, uuid, text)', 'execute'), 'anon can create job cards';
end $$;

rollback;
