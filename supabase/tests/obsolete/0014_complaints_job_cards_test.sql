-- Test for migration 0014 (complaints, job cards, tasks, assignment, final inspection).
-- Safe to run: everything happens inside a transaction that is rolled back.
-- Success = no error.  Failure = an error naming the broken expectation.
-- Needs demonstration mode (the JC / JID / CMPID number formats are provisional).

begin;

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 't7-ho@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c3', 'authenticated', 'authenticated', 't7-am@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c4', 'authenticated', 'authenticated', 't7-tic@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c5', 'authenticated', 'authenticated', 't7-tm@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c6', 'authenticated', 'authenticated', 't7-sup@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c7', 'authenticated', 'authenticated', 't7-tic2@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c8', 'authenticated', 'authenticated', 't7-tm2@test.invalid');
insert into public.employees (id, employee_code, full_name, role_code, org_unit_id) values
  ('00000000-0000-0000-0000-0000000000e1', 'T7-HO',   'T7 HO',   'HO',  null),
  ('00000000-0000-0000-0000-0000000000e3', 'T7-AM',   'T7 AM',   'AM',  null),
  ('00000000-0000-0000-0000-0000000000e4', 'T7-TIC',  'T7 TIC',  'TIC', (select id from public.org_units where code = 'TNR')),
  ('00000000-0000-0000-0000-0000000000e5', 'T7-TM',   'T7 TM',   'TM',  (select id from public.org_units where code = 'TNR')),
  ('00000000-0000-0000-0000-0000000000e6', 'T7-SUP',  'T7 SUP',  'SUP', (select id from public.org_units where code = 'TNR')),
  ('00000000-0000-0000-0000-0000000000e7', 'T7-TIC2', 'T7 TIC2', 'TIC', (select id from public.org_units where code = 'AD')),
  ('00000000-0000-0000-0000-0000000000e8', 'T7-TM2',  'T7 TM2',  'TM',  (select id from public.org_units where code = 'TNR'));
insert into public.profiles (id, employee_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000e4'),
  ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000e5'),
  ('00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000e6'),
  ('00000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-0000000000e7'),
  ('00000000-0000-0000-0000-0000000000c8', '00000000-0000-0000-0000-0000000000e8');

-- helpers (rolled back with everything else)
create function public.t_as(who text) returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}',
    case who when 'ho' then 'c1' when 'am' then 'c3' when 'tic' then 'c4' when 'tm' then 'c5' when 'sup' then 'c6' when 'tic2' then 'c7' else 'c8' end), true);
  execute 'set local role authenticated';
end $$;
grant execute on function public.t_as(text) to authenticated;

create function public.t_propose(p_entity text, p_action text, p_target uuid, p_payload text) returns uuid language plpgsql as $$
declare v uuid;
begin
  perform public.t_as('ho');
  v := public.master_request_create(p_entity, p_action::public.master_action, p_target, p_payload::jsonb, 'test');
  perform public.master_request_submit(v);
  execute 'reset role';
  return v;
end $$;
create function public.t_do(p_entity text, p_action text, p_target uuid, p_payload text) returns uuid language plpgsql as $$
declare v uuid; t uuid;
begin
  v := public.t_propose(p_entity, p_action, p_target, p_payload);
  perform public.t_as('am'); perform public.master_request_approve(v); execute 'reset role';
  select target_id into t from public.master_change_requests where id = v;
  return t;
end $$;

do $$
declare
  n int; ct uuid; ct_new uuid; f_mn uuid; f_ad uuid; cmp1 uuid; cmp2 uuid; cmp3 uuid; jc uuid; jc2 uuid; jc3 uuid; t record;
  tasks uuid[]; tm uuid := '00000000-0000-0000-0000-0000000000e5'; tm2 uuid := '00000000-0000-0000-0000-0000000000e8';
  tic2 uuid := '00000000-0000-0000-0000-0000000000e7'; tic uuid := '00000000-0000-0000-0000-0000000000e4';
begin
  assert (select (value #>> '{}')::boolean from public.application_settings where key = 'demo_mode'), 'this test needs demonstration mode';
  select id into f_mn from public.fleets where fleet_no = 'T0401';
  select id into f_ad from public.fleets where fleet_no = 'A0301';
  select id into ct from public.complaint_types where complaint_code = 'CT-002';

  -- seeds and registry
  select count(*) into n from public.complaint_types; assert n = 12, 'twelve complaint types expected';
  select count(*) into n from public.master_entity_registry where is_enabled; assert n = 9, 'nine enabled master types';

  -- ---------------- complaint master through the engine ----------------
  begin perform public.t_propose('complaint_type', 'CREATE', null, '{"complaint_code":"CT-001","complaint_name":"x"}'); assert false, 'duplicate code'; exception when raise_exception then null; end;
  begin perform public.t_propose('complaint_type', 'CREATE', null, '{"complaint_code":"CT-050","complaint_name":"tread worn below limit"}'); assert false, 'duplicate name'; exception when raise_exception then null; end;
  begin perform public.t_propose('complaint_type', 'CREATE', null, '{"complaint_code":"CT-050","complaint_name":"New","required_jobs":["JOB-007"]}'); assert false, 'unknown job'; exception when raise_exception then null; end;
  ct_new := public.t_do('complaint_type', 'CREATE', null, '{"complaint_code":"CT-050","complaint_name":"  Wheel nut loose  ","required_jobs":["JOB-003","JOB-003","JOB-001"]}');
  assert (select complaint_name from public.complaint_types where id = ct_new) = 'Wheel nut loose', 'complaint type not created';
  select count(*) into n from public.complaint_type_jobs where complaint_type_id = ct_new; assert n = 2, 'required jobs not de-duplicated';
  perform public.t_do('complaint_type', 'UPDATE', ct_new, '{"required_jobs":[]}');
  select count(*) into n from public.complaint_type_jobs where complaint_type_id = ct_new; assert n = 0, 'required jobs not cleared';
  begin perform public.t_do('complaint_type', 'UPDATE', ct_new, '{"complaint_code":"CT-051"}'); assert false, 'code changed'; exception when raise_exception then null; end;
  execute 'reset role';

  -- ---------------- raising complaints ----------------
  perform public.t_as('tic');
  cmp1 := public.raise_complaint(f_mn, 'FR', ct, 'slow leak on front right');
  assert (select complaint_no from public.complaints where id = cmp1) like 'CMPID-%', 'complaint number not generated';
  assert (select source from public.complaints where id = cmp1) = 'TYRE_IC', 'source should come from the role';
  begin perform public.raise_complaint(f_ad, 'FR', ct, 'other depot'); assert false, 'fleet of another depot accepted'; exception when raise_exception then null; end;
  begin perform public.raise_complaint(f_mn, 'XX', ct, 'bad position'); assert false, 'bad position accepted'; exception when raise_exception then null; end;
  begin perform public.raise_complaint(f_mn, 'FR', gen_random_uuid(), 'bad type'); assert false, 'unknown type accepted'; exception when raise_exception then null; end;
  perform public.t_as('sup');
  begin perform public.raise_complaint(f_mn, 'FL', ct, 'no driver'); assert false, 'log-sheet complaint without driver'; exception when raise_exception then null; end;
  cmp2 := public.raise_complaint(f_mn, 'FL', ct, 'driver reported pull', '{"driver_name":"Test Driver","run_km":120}'::jsonb);
  assert (select source from public.complaints where id = cmp2) = 'LOG_SHEET', 'log sheet source';
  perform public.t_as('tm');
  cmp3 := public.raise_complaint(f_mn, null, ct, 'noticed while passing');
  assert (select source from public.complaints where id = cmp3) = 'TYRE_MAN', 'tyre man source';
  select count(*) into n from public.complaints; assert n = 1, 'a Tyre Man should see only the complaints they raised';
  perform public.t_as('ho');
  begin perform public.raise_complaint(f_mn, 'FR', ct, 'ho'); assert false, 'HO raised a complaint'; exception when insufficient_privilege then null; end;
  select count(*) into n from public.complaints; assert n = 3, 'HO should see every complaint';
  perform public.t_as('tic2'); select count(*) into n from public.complaints; assert n = 0, 'another depot sees complaints';

  -- triage: only the Tyre IC rejects, with a reason
  perform public.t_as('sup');
  begin perform public.complaint_reject(cmp3, 'no'); assert false, 'supervisor rejected'; exception when insufficient_privilege then null; end;
  perform public.t_as('tic2');
  begin perform public.complaint_reject(cmp3, 'not mine'); assert false, 'other depot rejected'; exception when raise_exception then null; end;
  perform public.t_as('tic');
  begin perform public.complaint_reject(cmp3, ' '); assert false, 'reject without reason'; exception when raise_exception then null; end;
  perform public.complaint_reject(cmp3, 'duplicate of a known issue');
  assert (select status from public.complaints where id = cmp3) = 'REJECTED', 'complaint not rejected';
  begin perform public.complaint_reject(cmp3, 'again'); assert false, 'rejected twice'; exception when raise_exception then null; end;

  -- ---------------- job cards ----------------
  perform public.t_as('sup');
  begin perform public.job_card_create(f_mn, 'INSPECTION'); assert false, 'supervisor created a job card (UQ-06 default)'; exception when insufficient_privilege then null; end;
  perform public.t_as('tic');
  begin perform public.job_card_create(f_ad, 'INSPECTION'); assert false, 'card for another depot fleet'; exception when raise_exception then null; end;
  begin perform public.job_card_create(f_mn, 'INSPECTION', cmp3); assert false, 'card from a rejected complaint'; exception when raise_exception then null; end;
  begin perform public.job_card_create(f_mn, 'INSPECTION', cmp1, 'XX'); assert false, 'bad position'; exception when raise_exception then null; end;
  jc := public.job_card_create(f_mn, 'INSPECTION', cmp1, 'FR', null, 'check the valve first');
  select * into t from public.job_cards where id = jc;
  assert t.job_card_no like 'JC-%' and t.status = 'NOT_ASSIGNED' and t.source = 'COMPLAINT' and t.org_unit_id = (select org_unit_id from public.fleets where id = f_mn), 'job card not created correctly';
  assert (select status from public.complaints where id = cmp1) = 'ASSIGNED' and (select job_card_id from public.complaints where id = cmp1) = jc, 'complaint not linked';
  select count(*) into n from public.job_tasks where job_card_id = jc; assert n = 1, 'a simple card has one task';
  assert (select j.job_code from public.job_tasks k join public.maintenance_jobs j on j.id = k.job_id where k.job_card_id = jc) = 'JOB-003', 'task not linked to the Inspection job';
  begin perform public.job_card_create(f_mn, 'INSPECTION', cmp1); assert false, 'complaint used twice'; exception when raise_exception then null; end;

  jc2 := public.job_card_create(f_mn, 'TYRE_CHANGING', null, 'FR');
  select count(*) into n from public.job_tasks where job_card_id = jc2; assert n = 4, 'a Tyre Changing card has a chain of four tasks';
  select array_agg(id order by seq) into tasks from public.job_tasks where job_card_id = jc2;
  assert (select array_agg(work_category::text order by seq) from public.job_tasks where job_card_id = jc2) = array['TYRE_REMOVAL','TYRE_UNSETTING','TYRE_SETTING','TYRE_FITMENT'], 'wrong chain order';
  assert (select depends_on_task_id from public.job_tasks where id = tasks[3]) = tasks[2], 'chain dependency missing';
  assert (select depends_on_task_id from public.job_tasks where id = tasks[1]) is null, 'first task must not depend on anything';

  -- visibility
  perform public.t_as('tm'); select count(*) into n from public.job_cards; assert n = 0, 'an unassigned Tyre Man should see no job cards';
  select count(*) into n from public.job_tasks; assert n = 0, 'an unassigned Tyre Man should see no tasks';
  perform public.t_as('tic2'); select count(*) into n from public.job_cards; assert n = 0, 'another depot sees job cards';
  perform public.t_as('sup'); select count(*) into n from public.job_cards; assert n = 2, 'the Supervisor should monitor the depot job cards';
  perform public.t_as('ho'); select count(*) into n from public.job_cards; assert n = 2, 'HO should see all job cards';

  -- ---------------- assignment ----------------
  perform public.t_as('sup');
  begin perform public.job_task_assign(tasks[1], tm); assert false, 'supervisor assigned'; exception when insufficient_privilege then null; end;
  perform public.t_as('tic2');
  begin perform public.job_task_assign(tasks[1], tm); assert false, 'other depot assigned'; exception when raise_exception then null; end;
  perform public.t_as('tic');
  begin perform public.job_task_assign(tasks[1], tic2); assert false, 'assigned to staff of another depot'; exception when raise_exception then null; end;
  begin perform public.job_task_assign(tasks[1], '00000000-0000-0000-0000-0000000000e6'); assert false, 'assigned to a supervisor'; exception when raise_exception then null; end;
  perform public.job_task_assign(tasks[1], tm);
  assert (select status from public.job_cards where id = jc2) = 'NOT_ASSIGNED', 'card is assigned only when every task is';
  begin perform public.job_task_assign(tasks[1], tm); assert false, 'same assignee twice'; exception when raise_exception then null; end;
  begin perform public.job_task_assign(tasks[1], tm2); assert false, 'replace without reason'; exception when raise_exception then null; end;
  perform public.job_task_assign(tasks[1], tm2, null, 'tyre man absent today');
  perform public.job_task_assign(tasks[1], tm, null, 'back again');
  select count(*) into n from public.job_assignments where task_id = tasks[1]; assert n = 3, 'assignment history missing';
  select count(*) into n from public.job_assignments where task_id = tasks[1] and is_current; assert n = 1, 'exactly one current assignment';
  perform public.job_task_assign(tasks[2], tm); perform public.job_task_assign(tasks[3], tm2); perform public.job_task_assign(tasks[4], tm);
  assert (select status from public.job_cards where id = jc2) = 'ASSIGNED', 'card should be assigned once every task is';
  perform public.job_task_assign((select id from public.job_tasks where job_card_id = jc limit 1), tm);

  -- the Tyre Man now sees exactly what is theirs
  perform public.t_as('tm');
  select count(*) into n from public.job_tasks; assert n = 4, 'Tyre Man should see 3 chain tasks + 1 inspection task';
  select count(*) into n from public.job_tasks where assigned_employee_id <> tm; assert n = 0, 'Tyre Man sees someone else''s task';
  perform public.t_as('tm2'); select count(*) into n from public.job_tasks; assert n = 1, 'second Tyre Man should see only the Setting task';

  -- ---------------- execution: the chain order ----------------
  perform public.t_as('tm');
  begin perform public.job_task_start(tasks[2]); assert false, 'unsetting started before removal submitted'; exception when raise_exception then null; end;
  begin perform public.job_task_submit(tasks[2]); assert false, 'unsetting submitted before removal'; exception when raise_exception then null; end;
  perform public.t_as('tm2');
  begin perform public.job_task_start(tasks[1]); assert false, 'started someone else''s job'; exception when raise_exception then null; end;
  perform public.t_as('tm');
  perform public.job_task_start(tasks[1]);
  assert (select status from public.job_cards where id = jc2) = 'IN_PROGRESS', 'card should be in progress';
  perform public.job_task_submit(tasks[1]);
  perform public.job_task_start(tasks[2]); perform public.job_task_submit(tasks[2]);
  -- the Setting task belongs to the other Tyre Man; the Tyre IC may submit it on their behalf, with a reason
  perform public.t_as('tic');
  begin perform public.job_task_submit(tasks[3]); assert false, 'on behalf without reason'; exception when raise_exception then null; end;
  perform public.job_task_submit(tasks[3], 'tyre man called away to a breakdown');
  assert (select submitted_on_behalf_by from public.job_tasks where id = tasks[3]) = tic, 'on-behalf actor not recorded';
  perform public.t_as('tm');
  perform public.job_task_start(tasks[4]); perform public.job_task_submit(tasks[4]);
  assert (select status from public.job_cards where id = jc2) = 'AWAITING_FINAL_INSPECTION', 'card should await final inspection';
  perform public.job_task_submit((select id from public.job_tasks where job_card_id = jc limit 1));
  assert (select status from public.job_cards where id = jc) = 'AWAITING_FINAL_INSPECTION', 'simple card should await final inspection';
  begin perform public.job_task_submit(tasks[4]); assert false, 'submitted twice'; exception when raise_exception then null; end;

  -- ---------------- final inspection ----------------
  perform public.t_as('tm');
  begin perform public.final_inspection(jc2, 'PASS'); assert false, 'tyre man inspected'; exception when insufficient_privilege then null; end;
  perform public.t_as('sup');
  begin perform public.final_inspection(jc2, 'PASS'); assert false, 'supervisor inspected (UQ-06 default)'; exception when insufficient_privilege then null; end;
  perform public.t_as('tic2');
  begin perform public.final_inspection(jc2, 'PASS'); assert false, 'other depot inspected'; exception when raise_exception then null; end;
  perform public.t_as('tic');
  begin perform public.final_inspection(jc2, 'FAIL'); assert false, 'fail without remarks'; exception when raise_exception then null; end;
  begin perform public.final_inspection(jc2, 'MAYBE'); assert false, 'bad result'; exception when raise_exception then null; end;
  perform public.final_inspection(jc2, 'FAIL', 'valve cap missing after fitment');
  assert (select status from public.job_cards where id = jc2) = 'REWORK', 'card should be in rework';
  select count(*) into n from public.job_tasks where job_card_id = jc2 and status = 'REWORK'; assert n = 4, 'tasks should be in rework';
  perform public.t_as('tm');
  perform public.job_task_start(tasks[1]); perform public.job_task_submit(tasks[1]);
  perform public.job_task_start(tasks[2]); perform public.job_task_submit(tasks[2]);
  perform public.t_as('tm2'); perform public.job_task_start(tasks[3]); perform public.job_task_submit(tasks[3]);
  perform public.t_as('tm'); perform public.job_task_start(tasks[4]); perform public.job_task_submit(tasks[4]);
  assert (select status from public.job_cards where id = jc2) = 'AWAITING_FINAL_INSPECTION', 'reworked card should await inspection again';
  perform public.t_as('tic');
  perform public.final_inspection(jc2, 'PASS', 'ok now');
  select * into t from public.job_cards where id = jc2;
  assert t.status = 'CLOSED' and t.closed_at is not null, 'card not closed';
  select count(*) into n from public.job_tasks where job_card_id = jc2 and status = 'COMPLETED'; assert n = 4, 'tasks not completed';
  select count(*) into n from public.final_inspections where job_card_id = jc2; assert n = 2, 'both inspections should be kept';
  begin perform public.final_inspection(jc2, 'PASS'); assert false, 'closed card inspected again'; exception when raise_exception then null; end;
  perform public.final_inspection(jc, 'PASS');
  assert (select status from public.complaints where id = cmp1) = 'CLOSED', 'complaint should close with its job card';

  -- ---------------- cancel ----------------
  jc3 := public.job_card_create(f_mn, 'CENSUS', cmp2);
  assert (select status from public.complaints where id = cmp2) = 'ASSIGNED', 'complaint 2 not assigned';
  perform public.t_as('tic2'); begin perform public.job_card_cancel(jc3, 'x'); assert false, 'other depot cancelled'; exception when raise_exception then null; end;
  perform public.t_as('tic');
  begin perform public.job_card_cancel(jc3, ' '); assert false, 'cancel without reason'; exception when raise_exception then null; end;
  perform public.job_card_cancel(jc3, 'fleet withdrawn from service');
  assert (select status from public.job_cards where id = jc3) = 'CANCELLED', 'card not cancelled';
  assert (select status from public.complaints where id = cmp2) = 'NEW', 'complaint should return to the queue';
  select count(*) into n from public.job_tasks where job_card_id = jc3 and status = 'CANCELLED'; assert n = 1, 'task not cancelled';
  begin perform public.job_card_cancel(jc2, 'closed card'); assert false, 'closed card cancelled'; exception when raise_exception then null; end;

  -- ---------------- history, audit and direct writes ----------------
  select count(*) into n from public.job_card_events where job_card_id = jc2; assert n >= 14, 'timeline events missing';
  begin update public.job_card_events set event = 'x'; assert false, 'events edited'; exception when insufficient_privilege or integrity_constraint_violation then null; end;
  begin insert into public.job_cards (job_card_no, org_unit_id, work_category, source, fleet_id, due_date, created_by)
        values ('HACK', (select org_unit_id from public.fleets where id = f_mn), 'CENSUS', 'REACTIVE', f_mn, current_date, tic); assert false, 'direct insert allowed';
  exception when insufficient_privilege then null; end;
  begin update public.job_tasks set status = 'COMPLETED'; assert false, 'direct update allowed'; exception when insufficient_privilege then null; end;
  execute 'reset role';
  select count(*) into n from public.audit_logs where table_name = 'job_cards' and record_id = jc2; assert n >= 3, 'job card not audited';
  assert not has_function_privilege('authenticated', 'app.refresh_card(uuid)', 'execute'), 'refresh_card callable';
  assert not has_function_privilege('authenticated', 'app.actor(text)', 'execute'), 'actor callable';
  assert not has_function_privilege('anon', 'public.job_card_create(uuid, public.work_category, uuid, text, date, text)', 'execute'), 'anon can create job cards';
end $$;

rollback;
