-- Test for migration 0015 (shifts, maintenance schedules, fleet grouping, schedule planner, duty roster).
-- Safe to run: everything happens inside a transaction that is rolled back.
-- Success = no error.  Failure = an error naming the broken expectation.
-- Needs demonstration mode (job card numbers are provisional).

begin;

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 't8-ho@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c3', 'authenticated', 'authenticated', 't8-am@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c4', 'authenticated', 'authenticated', 't8-tic@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c5', 'authenticated', 'authenticated', 't8-tm@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c6', 'authenticated', 'authenticated', 't8-sup@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c7', 'authenticated', 'authenticated', 't8-tic2@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c8', 'authenticated', 'authenticated', 't8-tm2@test.invalid');
insert into public.employees (id, employee_code, full_name, role_code, org_unit_id) values
  ('00000000-0000-0000-0000-0000000000e1', 'T8-HO',   'T8 HO',   'HO',  null),
  ('00000000-0000-0000-0000-0000000000e3', 'T8-AM',   'T8 AM',   'AM',  null),
  ('00000000-0000-0000-0000-0000000000e4', 'T8-TIC',  'T8 TIC',  'TIC', (select id from public.org_units where code = 'TNR')),
  ('00000000-0000-0000-0000-0000000000e5', 'T8-TM',   'T8 TM',   'TM',  (select id from public.org_units where code = 'TNR')),
  ('00000000-0000-0000-0000-0000000000e6', 'T8-SUP',  'T8 SUP',  'SUP', (select id from public.org_units where code = 'TNR')),
  ('00000000-0000-0000-0000-0000000000e7', 'T8-TIC2', 'T8 TIC2', 'TIC', (select id from public.org_units where code = 'AD')),
  ('00000000-0000-0000-0000-0000000000e8', 'T8-TM2',  'T8 TM2',  'TM',  (select id from public.org_units where code = 'TNR'));
insert into public.profiles (id, employee_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000e4'),
  ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000e5'),
  ('00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000e6'),
  ('00000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-0000000000e7'),
  ('00000000-0000-0000-0000-0000000000c8', '00000000-0000-0000-0000-0000000000e8');

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
  n int; sch_air uuid; sch_rot uuid; sch_new uuid; f uuid[]; f_ad uuid; rev1 uuid; rev2 uuid; rev3 uuid; revB uuid; grp1 uuid; r record; ids uuid[];
  today date; first_date date; week date; ro uuid; tm uuid := '00000000-0000-0000-0000-0000000000e5'; tm2 uuid := '00000000-0000-0000-0000-0000000000e8';
  tic2e uuid := '00000000-0000-0000-0000-0000000000e7'; sup_e uuid := '00000000-0000-0000-0000-0000000000e6'; cards int;
begin
  assert (select (value #>> '{}')::boolean from public.application_settings where key = 'demo_mode'), 'this test needs demonstration mode';
  today := app.business_today();
  select array_agg(id order by fleet_no) into f from public.fleets where fleet_no in ('T0401', 'T0402', 'T0403', 'T0404', 'T0405', 'T0406');
  select id into f_ad from public.fleets where fleet_no = 'A0301';
  select id into sch_air from public.maintenance_schedules where schedule_code = 'SCH001';
  select id into sch_rot from public.maintenance_schedules where schedule_code = 'SCH004';

  -- seeds and registry
  select count(*) into n from public.shifts; assert n = 4, 'four shifts';
  assert (select start_time from public.shifts where shift_code = 'NIGHT') = time '22:00', 'night shift start';
  select count(*) into n from public.maintenance_schedules; assert n = 3, 'three seeded schedules';
  select count(*) into n from public.maintenance_schedules where schedule_code in ('SCH002', 'SCH003', 'SCH007'); assert n = 0, 'unknown-frequency schedules must not be seeded';
  assert (select every_n_days from public.maintenance_schedules where id = sch_air) = 2 and (select uses_working_days from public.maintenance_schedules where id = sch_air), 'SCH001 every 2 working days';
  select count(*) into n from public.master_entity_registry where is_enabled; assert n = 10, 'ten enabled master types';

  -- ---------------- schedule master through the engine ----------------
  begin perform public.t_propose('maintenance_schedule', 'CREATE', null, '{"schedule_code":"SCH001","schedule_name":"x","work_category":"INSPECTION","every_n_days":3,"effective_from":"2026-09-01"}'); assert false, 'duplicate code'; exception when raise_exception then null; end;
  begin perform public.t_propose('maintenance_schedule', 'CREATE', null, '{"schedule_code":"SCH008","schedule_name":"x","work_category":"TYRE_CHANGING","every_n_days":3,"effective_from":"2026-09-01"}'); assert false, 'chain category'; exception when raise_exception then null; end;
  begin perform public.t_propose('maintenance_schedule', 'CREATE', null, '{"schedule_code":"SCH008","schedule_name":"x","work_category":"INSPECTION","every_n_days":0,"effective_from":"2026-09-01"}'); assert false, 'zero days'; exception when raise_exception then null; end;
  begin perform public.t_propose('maintenance_schedule', 'CREATE', null, '{"schedule_code":"SCH008","schedule_name":"x","work_category":"INSPECTION","every_n_days":3}'); assert false, 'missing date'; exception when raise_exception then null; end;
  begin perform public.t_propose('maintenance_schedule', 'CREATE', null, '{"schedule_code":"SCH008","schedule_name":"x","work_category":"INSPECTION","every_n_days":3,"effective_from":"1/9/2026"}'); assert false, 'bad date'; exception when raise_exception then null; end;
  begin perform public.t_do('maintenance_schedule', 'CREATE', null, '{"schedule_code":"SCH008","schedule_name":"x","work_category":"INSPECTION","job_code":"JOB-001","every_n_days":3,"effective_from":"2026-09-01"}'); assert false, 'job of another category'; exception when raise_exception then null; end;
  execute 'reset role';
  sch_new := public.t_do('maintenance_schedule', 'CREATE', null, '{"schedule_code":"SCH008","schedule_name":"  Inspection every 3 days ","work_category":"INSPECTION","job_code":"JOB-003","every_n_days":3,"effective_from":"2026-09-01"}');
  assert (select schedule_name from public.maintenance_schedules where id = sch_new) = 'Inspection every 3 days', 'schedule not created';
  perform public.t_do('maintenance_schedule', 'UPDATE', sch_new, '{"every_n_days":4,"uses_working_days":true}');
  assert (select every_n_days from public.maintenance_schedules where id = sch_new) = 4 and (select job_id from public.maintenance_schedules where id = sch_new) is not null, 'schedule update changed the wrong fields';
  begin perform public.t_do('maintenance_schedule', 'UPDATE', sch_new, '{"schedule_code":"SCH009"}'); assert false, 'code changed'; exception when raise_exception then null; end;
  execute 'reset role';

  -- ---------------- fleet grouping ----------------
  first_date := today - 5;
  perform public.t_as('sup');
  begin perform public.group_propose(sch_air, 'Air A', f[1:3], first_date, 'x'); assert false, 'supervisor proposed'; exception when insufficient_privilege then null; end;
  perform public.t_as('tic');
  begin perform public.group_propose(sch_air, 'Air A', f[1:3], first_date, ' '); assert false, 'no reason'; exception when raise_exception then null; end;
  begin perform public.group_propose(sch_air, 'Air A', f[1:3] || f_ad, first_date, 'new'); assert false, 'fleet of another depot'; exception when raise_exception then null; end;
  begin perform public.group_propose(sch_air, 'Air A', '{}', first_date, 'new'); assert false, 'empty group'; exception when raise_exception then null; end;
  begin perform public.group_propose(sch_air, ' ', f[1:3], first_date, 'new'); assert false, 'unnamed group'; exception when raise_exception then null; end;
  begin perform public.group_propose(sch_air, 'Air A', f[1:3], null, 'new'); assert false, 'no first date'; exception when raise_exception then null; end;
  rev1 := public.group_propose(sch_air, 'Air A', f[1:3], first_date, 'initial grouping');
  select group_id into grp1 from public.fleet_group_revisions where id = rev1;
  begin perform public.group_propose(sch_air, 'air a', f[4:4], first_date, 'dup name'); assert false, 'duplicate group name'; exception when raise_exception then null; end;
  begin perform public.group_propose(sch_air, null, f[1:4], first_date, 'dup pending', grp1); assert false, 'second pending revision'; exception when raise_exception then null; end;
  select count(*) into n from public.fleet_group_revision_members where revision_id = rev1; assert n = 3, 'members not stored';
  -- nothing is current until the Supervisor approves
  assert (select current_revision_id from public.fleet_groups where id = grp1) is null, 'group current before approval';
  assert public.planner_refresh(first_date, first_date + 13) = 0, 'a pending group must not generate due rows';

  perform public.t_as('tic');
  begin perform public.group_decide(rev1, true); assert false, 'tic approved own proposal'; exception when insufficient_privilege then null; end;
  perform public.t_as('tm'); select count(*) into n from public.fleet_groups; assert n = 0, 'tyre man sees groups';
  perform public.t_as('tic2'); select count(*) into n from public.fleet_groups; assert n = 0, 'other depot sees groups';
  perform public.t_as('sup');
  select count(*) into n from public.fleet_group_revisions; assert n = 1, 'supervisor should see the proposal';
  begin perform public.group_decide(rev1, false, ' '); assert false, 'return without reason'; exception when raise_exception then null; end;
  perform public.group_decide(rev1, false, 'add fleet T0404 too');
  assert (select status from public.fleet_group_revisions where id = rev1) = 'RETURNED', 'not returned';
  begin perform public.group_decide(rev1, true); assert false, 'decided twice'; exception when raise_exception then null; end;

  perform public.t_as('tic');
  rev2 := public.group_propose(sch_air, null, f[1:4], first_date, 'with T0404', grp1);
  assert (select revision_no from public.fleet_group_revisions where id = rev2) = 2, 'revision number';
  begin perform public.group_withdraw(rev2, ' '); assert false, 'withdraw without reason'; exception when raise_exception then null; end;
  perform public.group_withdraw(rev2, 'wrong fleets');
  assert (select status from public.fleet_group_revisions where id = rev2) = 'WITHDRAWN', 'not withdrawn';
  rev2 := public.group_propose(sch_air, null, f[1:3], first_date, 'resubmitted as first proposal', grp1);
  perform public.t_as('sup');
  perform public.group_decide(rev2, true);
  assert (select current_revision_id from public.fleet_groups where id = grp1) = rev2 and (select status from public.fleet_group_revisions where id = rev2) = 'APPROVED', 'not approved';

  -- one current group per schedule per fleet
  perform public.t_as('tic');
  revB := public.group_propose(sch_air, 'Air B', f[3:4], first_date, 'second group overlaps T0403');
  perform public.t_as('sup');
  begin perform public.group_decide(revB, true); assert false, 'fleet in two groups'; exception when raise_exception then null; end;
  perform public.group_decide(revB, false, 'T0403 is already in Air A');
  -- a revised group supersedes the previous revision
  perform public.t_as('tic');
  rev3 := public.group_propose(sch_air, null, f[1:2], first_date, 'drop T0403', grp1);
  perform public.t_as('sup'); perform public.group_decide(rev3, true);
  assert (select status from public.fleet_group_revisions where id = rev2) = 'SUPERSEDED', 'previous revision not superseded';
  perform public.t_as('tic');
  rev3 := public.group_propose(sch_air, null, f[1:3], first_date, 'T0403 back', grp1);
  perform public.t_as('sup'); perform public.group_decide(rev3, true);
  -- a rotation group on another schedule may reuse fleets
  perform public.t_as('tic');
  rev1 := public.group_propose(sch_rot, 'Rot A', f[5:5], first_date, 'rotation group');
  perform public.t_as('sup'); perform public.group_decide(rev1, true);

  -- ---------------- planner ----------------
  perform public.t_as('sup');
  begin perform public.planner_refresh(first_date, first_date + 13); assert false, 'supervisor refreshed'; exception when insufficient_privilege then null; end;
  perform public.t_as('tic');
  begin perform public.planner_refresh(first_date + 5, first_date); assert false, 'backwards range'; exception when raise_exception then null; end;
  begin perform public.planner_refresh(first_date, first_date + 100); assert false, 'range too long'; exception when raise_exception then null; end;
  n := public.planner_refresh(first_date, first_date + 13);
  assert n between 19 and 22, format('expected 18-21 air rows + 1 rotation row, got %s', n);
  assert public.planner_refresh(first_date, first_date + 13) = 0, 'refresh must be idempotent';
  select count(*) into n from public.schedule_instances where schedule_id = sch_rot; assert n = 1, 'rotation (30 days) should be due once';
  select count(*) into n from public.schedule_instances i join public.fleets fl on fl.id = i.fleet_id where i.schedule_id = sch_air and extract(dow from i.due_date) = 0; assert n = 0, 'working-day schedule is due on a Sunday';
  select count(*) into n from public.schedule_instances where schedule_id = sch_air and due_date = first_date and fleet_id = any (f[1:3]); assert n = 3 or extract(dow from first_date) = 0, 'first date should be due for every fleet in the group';
  select count(*) into n from public.v_schedule_planner where state = 'PLANNED' or state = 'OVERDUE'; assert n > 0, 'planner view empty';
  select count(*) into n from public.v_schedule_planner where state = 'OVERDUE' and due_date >= today; assert n = 0, 'a future item is overdue';
  perform public.t_as('tic2'); select count(*) into n from public.schedule_instances; assert n = 0, 'other depot sees due rows';
  perform public.t_as('tm'); select count(*) into n from public.schedule_instances; assert n = 0, 'tyre man sees due rows';

  -- due rows become scheduled job cards
  perform public.t_as('tic');
  select array_agg(id) into ids from (select id from public.schedule_instances where schedule_id = sch_air order by due_date, fleet_id limit 2) q;
  begin perform public.schedule_create_cards('{}'); assert false, 'nothing selected'; exception when raise_exception then null; end;
  cards := public.schedule_create_cards(ids); assert cards = 2, 'two cards expected';
  select * into r from public.job_cards where schedule_instance_id = ids[1];
  assert r.source = 'SCHEDULED' and r.work_category = 'AIR_INFLATION' and r.status = 'NOT_ASSIGNED', 'scheduled card wrong';
  assert (select job_card_id from public.schedule_instances where id = ids[1]) = r.id, 'instance not linked';
  assert (select state from public.v_schedule_planner where id = ids[1]) = 'JOB_CREATED', 'state should be JOB_CREATED';
  assert public.schedule_create_cards(ids) = 0, 'creating twice must skip existing cards';
  perform public.job_card_cancel(r.id, 'fleet in workshop');
  assert (select state from public.v_schedule_planner where id = ids[1]) in ('PLANNED', 'OVERDUE'), 'cancelled card should reopen the item';
  assert public.schedule_create_cards(array[ids[1]]) = 1, 'a cancelled item can be raised again';
  perform public.t_as('sup');
  begin perform public.schedule_create_cards(array[ids[2]]); assert false, 'supervisor created cards'; exception when insufficient_privilege then null; end;

  -- ---------------- duty roster ----------------
  week := date_trunc('week', today)::date;
  perform public.t_as('sup');
  begin perform public.roster_save(week, '[]'); assert false, 'supervisor saved a roster'; exception when insufficient_privilege then null; end;
  perform public.t_as('tic');
  begin perform public.roster_save(week + 1, '[]'); assert false, 'week not starting Monday'; exception when raise_exception then null; end;
  begin perform public.roster_save(week, format('[{"employee_id":"%s","duty_date":"%s","shift_code":"MORNING"}]', tic2e, week)::jsonb); assert false, 'person of another depot'; exception when raise_exception then null; end;
  begin perform public.roster_save(week, format('[{"employee_id":"%s","duty_date":"%s","shift_code":"MORNING"}]', sup_e, week)::jsonb); assert false, 'supervisor on a duty roster'; exception when raise_exception then null; end;
  begin perform public.roster_save(week, format('[{"employee_id":"%s","duty_date":"%s","shift_code":"NOPE"}]', tm, week)::jsonb); assert false, 'bad shift'; exception when raise_exception then null; end;
  begin perform public.roster_save(week, format('[{"employee_id":"%s","duty_date":"%s","shift_code":"MORNING"}]', tm, week + 7)::jsonb); assert false, 'date outside the week'; exception when raise_exception then null; end;
  ro := public.roster_save(week, '[]');
  begin perform public.roster_submit(ro); assert false, 'empty roster submitted'; exception when raise_exception then null; end;
  ro := public.roster_save(week, format('[{"employee_id":"%s","duty_date":"%s","shift_code":"MORNING"},{"employee_id":"%s","duty_date":"%s","shift_code":null},{"employee_id":"%s","duty_date":"%s","shift_code":"NIGHT"}]',
                                       tm, week, tm, week + 1, tm2, week)::jsonb);
  select count(*) into n from public.duty_roster_entries where roster_id = ro; assert n = 3, 'entries not saved';
  assert (select shift_id from public.duty_roster_entries where roster_id = ro and employee_id = tm and duty_date = week + 1) is null, 'off day should have no shift';
  perform public.t_as('tm'); select count(*) into n from public.duty_rosters; assert n = 0, 'a Tyre Man sees a roster that is not posted';
  perform public.t_as('tic'); perform public.roster_submit(ro);
  begin perform public.roster_save(week, '[]'); assert false, 'edited while pending'; exception when raise_exception then null; end;
  perform public.t_as('tic');
  begin perform public.roster_decide(ro, true); assert false, 'tic posted own roster'; exception when insufficient_privilege then null; end;
  perform public.t_as('sup');
  begin perform public.roster_decide(ro, false, ' '); assert false, 'return without reason'; exception when raise_exception then null; end;
  perform public.roster_decide(ro, false, 'night shift needs two people');
  assert (select status from public.duty_rosters where id = ro) = 'RETURNED', 'roster not returned';
  perform public.t_as('tic');
  ro := public.roster_save(week, format('[{"employee_id":"%s","duty_date":"%s","shift_code":"MORNING"},{"employee_id":"%s","duty_date":"%s","shift_code":"NIGHT"},{"employee_id":"%s","duty_date":"%s","shift_code":"NIGHT"}]',
                                       tm, week, tm2, week, tm, week + 2)::jsonb);
  select count(*) into n from public.duty_roster_entries where roster_id = ro; assert n = 3, 'roster not replaced on re-save';
  perform public.roster_submit(ro);
  perform public.t_as('sup'); perform public.roster_decide(ro, true);
  assert (select status from public.duty_rosters where id = ro) = 'POSTED', 'roster not posted';
  begin perform public.roster_decide(ro, true); assert false, 'posted twice'; exception when raise_exception then null; end;
  perform public.t_as('tic');
  begin perform public.roster_save(week, '[]'); assert false, 'edited a posted roster'; exception when raise_exception then null; end;
  perform public.t_as('tm');
  select count(*) into n from public.duty_rosters; assert n = 1, 'a Tyre Man should see the posted roster';
  select count(*) into n from public.duty_roster_entries; assert n = 2, 'a Tyre Man should see only their own entries';
  perform public.t_as('tic2'); select count(*) into n from public.duty_rosters; assert n = 0, 'other depot sees the roster';

  -- ---------------- direct writes ----------------
  perform public.t_as('tic');
  begin insert into public.fleet_groups (org_unit_id, schedule_id, group_name) values ((select org_unit_id from public.fleets where id = f[1]), sch_air, 'HACK'); assert false, 'direct insert allowed';
  exception when insufficient_privilege then null; end;
  begin update public.duty_rosters set status = 'POSTED'; assert false, 'direct roster update allowed'; exception when insufficient_privilege then null; end;
  begin update public.maintenance_schedules set every_n_days = 1; assert false, 'direct schedule update allowed'; exception when insufficient_privilege then null; end;
  execute 'reset role';
  assert not has_function_privilege('anon', 'public.planner_refresh(date, date)', 'execute'), 'anon can refresh the planner';
  assert not has_function_privilege('authenticated', 'app.apply_maintenance_schedule(uuid)', 'execute'), 'apply_maintenance_schedule callable';
end $$;

rollback;
