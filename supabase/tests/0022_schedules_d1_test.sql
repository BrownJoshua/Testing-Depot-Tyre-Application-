-- Test for migration 0022 (D1 schedules: Schedule Master, Schedule IDs, chart, Assign Technician, Rotation / Discout rules).
-- Safe to run: everything happens inside a transaction that is rolled back.
-- Uses the real demonstration accounts and the seeded Mandaveli fleets J0264 and J0322.

begin;

insert into auth.users (id, aud, role, email) values ('00000000-0000-0000-0000-0000000000c7', 'authenticated', 'authenticated', 't11-tic2@test.invalid');
insert into public.employees (id, employee_code, full_name, role_code, org_unit_id)
values ('00000000-0000-0000-0000-0000000000e7', 'T11-TIC2', 'T11 TIC2', 'TIC', (select id from public.org_units where code = 'AD'));
insert into public.profiles (id, employee_id) values ('00000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-0000000000e7');

create function public.t_as(who text) returns void language plpgsql as $$
declare v_sub text;
begin
  execute 'reset role';
  select p.id::text into v_sub from public.profiles p join public.employees e on e.id = p.employee_id
   where e.employee_code = case who when 'ho' then 'HOT-0114' when 'am' then 'HOT-AE-021' when 'sup' then 'SUP-2231' when 'tic' then 'TIC-1147' when 'tm' then 'TM-3092' else 'T11-TIC2' end;
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_sub), true);
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
  n int; f1 uuid; f2 uuid; fad uuid; sch_air uuid; sch_cen uuid; sch_rot uuid; sch_dis uuid; sch_inactive uuid; run1 uuid; run_c uuid; run_r uuid; items uuid[]; r record;
  tm uuid; tic uuid; today date; card record; tyre_fr uuid; tyre_fl uuid; sch_new uuid; item1 uuid; fr_card uuid;
begin
  select id into tm from public.employees where employee_code = 'TM-3092';
  select id into tic from public.employees where employee_code = 'TIC-1147';
  select id into f1 from public.fleets where fleet_no = 'J0264';
  select id into f2 from public.fleets where fleet_no = 'J0322';
  select id into fad from public.fleets where org_unit_id = (select id from public.org_units where code = 'AD') and status = 'ACTIVE' limit 1;
  select id into sch_air from public.maintenance_schedules where schedule_code = 'SCH001';
  select id into sch_cen from public.maintenance_schedules where schedule_code = 'SCH007';
  select id into sch_rot from public.maintenance_schedules where schedule_code = 'SCH004';
  select id into sch_dis from public.maintenance_schedules where schedule_code = 'SCH005';
  select id into sch_inactive from public.maintenance_schedules where schedule_code = 'SCH006';
  today := app.business_today();

  -- seeds: the seven D1 schedules
  select count(*) into n from public.maintenance_schedules; assert n = 7, 'SCH001..SCH007 expected';
  assert (select every_n_days from public.maintenance_schedules where schedule_code = 'SCH002') = 3, 'nitrogen every 3 days';
  assert (select every_n_days from public.maintenance_schedules where schedule_code = 'SCH003') = 2, 'inspection every 2 days';
  assert (select frequency_kind || every_n_days || every_km from public.maintenance_schedules where schedule_code = 'SCH005') = 'DATE_KM12010000', 'discout 120 days or 10,000 km';
  assert (select particular_days from public.maintenance_schedules where schedule_code = 'SCH007') = array[15, 30], 'census on the 15th and 30th';
  assert (select status from public.maintenance_schedules where schedule_code = 'SCH006') = 'INACTIVE', 'SCH006 inactive';

  -- HO master: particular days through the approval engine
  begin perform public.t_propose('maintenance_schedule', 'CREATE', null, '{"schedule_code":"SCH008","schedule_name":"x","work_category":"CENSUS","particular_days":[32],"effective_from":"2026-09-01"}'); assert false, 'day 32'; exception when raise_exception then null; end;
  begin perform public.t_propose('maintenance_schedule', 'CREATE', null, '{"schedule_code":"SCH008","schedule_name":"x","work_category":"CENSUS","effective_from":"2026-09-01"}'); assert false, 'no frequency'; exception when raise_exception then null; end;
  sch_new := public.t_do('maintenance_schedule', 'CREATE', null, '{"schedule_code":"SCH008","schedule_name":"Monthly census","work_category":"CENSUS","job_code":"JOB-006","particular_days":[10,20,10],"effective_from":"2026-09-01"}');
  assert (select particular_days from public.maintenance_schedules where id = sch_new) = array[10, 20], 'particular days not stored sorted and distinct';
  execute 'reset role';

  -- ---------------- Schedule ID ----------------
  perform public.t_as('sup');
  begin perform public.schedule_run_create(sch_air, today, today + 5, array[f1]); assert false, 'supervisor created a Schedule ID'; exception when insufficient_privilege then null; end;
  perform public.t_as('tic2');
  begin perform public.schedule_run_create(sch_air, today, today + 5, array[f1]); assert false, 'fleet of another depot'; exception when raise_exception then null; end;
  perform public.t_as('tic');
  begin perform public.schedule_run_create(sch_inactive, today, today + 5, array[f1]); assert false, 'inactive schedule'; exception when raise_exception then null; end;
  begin perform public.schedule_run_create(sch_air, today + 5, today, array[f1]); assert false, 'backwards period'; exception when raise_exception then null; end;
  begin perform public.schedule_run_create(sch_air, today, today + 400, array[f1]); assert false, 'period too long'; exception when raise_exception then null; end;
  run1 := public.schedule_run_create(sch_air, today, today + 5, array[f1, f2]);
  assert (select schedule_no from public.schedule_runs where id = run1) >= 'SCHID-4101', 'Schedule ID numbering';
  select count(*) into n from public.schedule_items where run_id = run1; assert n = 6, 'every 2 days over 6 days = 3 dates x 2 fleets';
  select count(*) into n from public.schedule_items where run_id = run1 and tyre_id is not null; assert n = 0, 'Air Inflation rows are per fleet';
  select count(*) into n from public.v_schedule_chart where run_id = run1 and state = 'PENDING'; assert n = 6, 'chart rows start Pending';

  -- Census on particular dates
  run_c := public.schedule_run_create(sch_cen, date_trunc('month', today)::date, (date_trunc('month', today) + interval '1 month - 1 day')::date, array[f1]);
  select count(*) into n from public.schedule_items where run_id = run_c; assert n = 2, 'census falls on the 15th and the 30th';
  assert (select array_agg(extract(day from due_date)::int order by due_date) from public.schedule_items where run_id = run_c) = array[15, 30], 'census dates';

  -- ---------------- Assign Technician ----------------
  select array_agg(id) into items from public.schedule_items where run_id = run1;
  perform public.t_as('sup');
  begin perform public.schedule_assign(run1, items, array[tm]); assert false, 'supervisor assigned'; exception when insufficient_privilege then null; end;
  perform public.t_as('tic');
  begin perform public.schedule_assign(run1, items, '{}'::uuid[]); assert false, 'nobody chosen'; exception when raise_exception then null; end;
  begin perform public.schedule_assign(run1, '{}'::uuid[], array[tm]); assert false, 'no rows chosen'; exception when raise_exception then null; end;
  begin perform public.schedule_assign(run1, items, array['00000000-0000-0000-0000-0000000000e7'::uuid]); assert false, 'staff of another depot'; exception when raise_exception then null; end;
  n := public.schedule_assign(run1, items, array[tm, tic], null, (select id from public.shifts where shift_code = 'NIGHT'), 'air round');
  assert n = 2, 'one job card per fleet';
  select count(*) into n from public.job_cards where schedule_run_id = run1 and job_type = 'SCHEDULE' and status = 'ASSIGNED_FOR_WORK'; assert n = 2, 'two schedule cards assigned for work';
  for card in select * from public.job_cards where schedule_run_id = run1 loop
    select count(*) into n from public.job_ids where job_card_id = card.id;
    assert n = (select count(*) from public.tyres where fleet_id = card.fleet_id and stock_place = 'FITTED'), 'a Job ID for the Job Code on every fitted tyre';
    assert card.estimated_minutes = n * (30 + 5 * n), 'JOB-001: (30 per fleet + 5 per tyre x tyres) per Job ID';
    assert (select count(distinct employee_id) from public.job_id_assignees a join public.job_ids j on j.id = a.job_id_ref where j.job_card_id = card.id) = 1, 'one Tyre Man per fleet';
  end loop;
  assert (select count(distinct a.employee_id) from public.job_id_assignees a join public.job_ids j on j.id = a.job_id_ref join public.job_cards c on c.id = j.job_card_id where c.schedule_run_id = run1) = 2, 'fleets shared among the Tyre Men in turn';
  select count(*) into n from public.v_schedule_chart where run_id = run1 and state = 'ASSIGNED'; assert n = 6, 'rows become Assigned';
  begin perform public.schedule_assign(run1, items, array[tm]); assert false, 'rows assigned twice'; exception when raise_exception then null; end;

  -- Tyre Man works the card of his fleet; the chart rows get a done date
  perform public.t_as('tm');
  select j.job_card_id into fr_card from public.job_ids j join public.job_id_assignees a on a.job_id_ref = j.id where a.employee_id = tm and j.status = 'ASSIGNED' limit 1;
  for r in select j.id from public.job_ids j where j.job_card_id = fr_card order by job_id_no loop perform public.job_id_start(r.id); perform public.job_id_complete(r.id); end loop;
  execute 'reset role';
  assert (select status from public.job_cards where id = fr_card) = 'FINAL_INSPECTION', 'all Job IDs done -> Final Inspection';
  select count(*) into n from public.schedule_items where job_card_id = fr_card and done_date = today; assert n = 3, 'the 3 chart rows of the fleet are done today';
  assert (select state from public.v_schedule_chart where job_card_id = fr_card order by due_date limit 1) in ('ON_TIME', 'DELAYED'), 'done rows are On Time or Delayed';

  -- ---------------- Rotation: front tyres only, due 30 days after the last rotation ----------------
  select id into tyre_fr from public.tyres where fleet_id = f1 and fitted_position = 'FR';
  select id into tyre_fl from public.tyres where fleet_id = f1 and fitted_position = 'FL';
  perform public.t_as('tic');
  run_r := public.schedule_run_create(sch_rot, today - 60, today + 60, array[f1]);
  select count(*) into n from public.schedule_items where run_id = run_r and tyre_id is not null and tyre_id not in (tyre_fr, tyre_fl); assert n = 0, 'only front tyres';
  select count(*) into n from public.schedule_items i join public.tyres t on t.id = i.tyre_id where i.run_id = run_r and t.fitted_position not in ('FR', 'FL'); assert n = 0, 'no rear tyre in a Rotation';
  select id into item1 from public.schedule_items where run_id = run_r and tyre_id = tyre_fr;
  assert item1 is not null, 'the FR tyre has a rotation date, so it is due';
  assert (select due_date from public.schedule_items where id = item1) = (select last_rotation_date + 30 from public.tyres where id = tyre_fr), 'due = last rotation date + 30 days';
  assert (select state from public.v_schedule_chart where id = item1) = 'OVERDUE', 'a row due before today and not done is Overdue';

  perform public.schedule_assign(run_r, array[item1], array[tm]);
  select id into fr_card from public.job_cards where schedule_run_id = run_r;
  select count(*) into n from public.job_ids j join public.maintenance_jobs m on m.id = j.job_code_id where j.job_card_id = fr_card and m.job_code = 'JOB-004'; assert n = 2, 'Rotation: the due tyre and its FR / FL partner';
  assert exists (select 1 from public.job_ids where job_card_id = fr_card and tyre_id = tyre_fl), 'the partner tyre has a Job ID';
  perform public.t_as('tm');
  for r in select id from public.job_ids where job_card_id = fr_card order by job_id_no loop perform public.job_id_start(r.id); perform public.job_id_complete(r.id); end loop;
  execute 'reset role';
  assert (select fitted_position from public.tyres where id = tyre_fr) = 'FL' and (select fitted_position from public.tyres where id = tyre_fl) = 'FR', 'FR <-> FL swapped';
  assert (select last_rotation_date from public.tyres where id = tyre_fr) = today and (select last_rotation_date from public.tyres where id = tyre_fl) = today, 'both tyres get the new rotation date';
  assert (select done_date from public.schedule_items where id = item1) = today and (select state from public.v_schedule_chart where id = item1) = 'DELAYED', 'done after the due date = Delayed';
  select count(*) into n from public.tyres where fleet_id = f1 and fitted_position = 'FR'; assert n = 1, 'one tyre per position after the swap';

  -- ---------------- Prepone / Postpone ----------------
  perform public.t_as('tic');
  select id into item1 from public.schedule_items where run_id = run1 and job_card_id is not null limit 1;
  begin perform public.schedule_item_move((select id from public.schedule_items where run_id = run_c limit 1), today + 3, ' '); assert false, 'move without reason'; exception when raise_exception then null; end;
  perform public.schedule_item_move((select id from public.schedule_items where run_id = run_c order by due_date limit 1), today + 3, 'fleet at the workshop');
  assert (select moved_reason from public.schedule_items where run_id = run_c order by due_date limit 1) = 'fleet at the workshop', 'move reason kept';
  begin perform public.schedule_item_move(item1, today + 9, 'late'); assert false, 'moved a done row'; exception when raise_exception then null; end;

  -- ---------------- visibility and direct writes ----------------
  perform public.t_as('sup'); select count(*) into n from public.v_schedule_chart; assert n > 0, 'the Supervisor monitors the chart';
  perform public.t_as('tic2'); select count(*) into n from public.schedule_runs; assert n = 0, 'another depot sees Schedule IDs';
  select count(*) into n from public.v_schedule_chart; assert n = 0, 'another depot sees the chart';
  perform public.t_as('tm'); select count(*) into n from public.schedule_items; assert n = 0, 'a Tyre Man does not see the planning rows';
  perform public.t_as('tic');
  begin insert into public.schedule_runs (schedule_no, org_unit_id, schedule_id, from_date, to_date, created_by) values ('HACK', (select org_unit_id from public.fleets where id = f1), sch_air, today, today, tic); assert false, 'direct insert allowed';
  exception when insufficient_privilege then null; end;
  begin update public.schedule_items set done_date = today; assert false, 'direct update allowed'; exception when insufficient_privilege then null; end;
  execute 'reset role';
  assert not has_function_privilege('authenticated', 'app.on_job_done(uuid)', 'execute'), 'on_job_done callable';
  assert not has_function_privilege('anon', 'public.schedule_assign(uuid, uuid[], uuid[], date, uuid, text)', 'execute'), 'anon can assign';
end $$;

rollback;
