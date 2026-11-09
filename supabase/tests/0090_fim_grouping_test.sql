-- Test for migration 0090 (Final Inspection Master + checklist, selected final inspection, D1 grouping, Replace selected). Rolled back.
begin;
create function public.t_as(who text) returns void language plpgsql as $$
declare v_sub text;
begin
  execute 'reset role';
  select p.id::text into v_sub from public.profiles p join public.employees e on e.id = p.employee_id
   where e.employee_code = case who when 'sup' then 'SUP-2231' when 'tic' then 'TIC-1147' else 'TM-3092' end;
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_sub), true);
  execute 'set local role authenticated';
end $$;
grant execute on function public.t_as(text) to authenticated;

do $$
declare ticid uuid; tm uuid; dep uuid; c1 uuid; c2 uuid; ok boolean; f1 uuid; f2 uuid; f3 uuid; sch uuid; ga uuid; gb uuid; n int; run uuid; items uuid[];
begin
  select id, org_unit_id into ticid, dep from public.employees where employee_code = 'TIC-1147';
  select id into tm from public.employees where employee_code = 'TM-3092';
  assert (select count(*) from public.fim_checklists) >= 7, 'FIM-001..007 seeded';
  assert exists (select 1 from public.master_entity_registry where entity_type = 'final_inspection_master' and is_enabled), 'FIM master enabled';

  -- Final inspection with a checklist
  insert into public.job_cards (job_card_no, org_unit_id, job_type, expected_date, status, created_by) values ('JC-T9001', dep, 'JOB_CODE', current_date, 'FINAL_INSPECTION', ticid) returning id into c1;
  insert into public.job_cards (job_card_no, org_unit_id, job_type, expected_date, status, created_by) values ('JC-T9002', dep, 'JOB_CODE', current_date, 'FINAL_INSPECTION', ticid) returning id into c2;
  perform public.t_as('tm');
  begin perform public.final_inspection(c1, 'PASS', null, '{}', null); ok := false; exception when others then ok := true; end;
  assert ok, 'a Tyre Man cannot do the final inspection';
  perform public.t_as('tic');
  begin perform public.final_inspection(c1, 'PASS', null, '{}', '[{"item":"a","pass":true},{"item":"b","pass":false}]'); ok := false; exception when others then ok := true; end;
  assert ok, 'a failed checklist item blocks a Pass';
  perform public.final_inspection(c1, 'PASS', null, '{}', '[{"item":"a","pass":true},{"item":"b","pass":true}]');
  execute 'reset role';
  assert (select status from public.job_cards where id = c1) = 'COMPLETED', 'passed';
  assert (select jsonb_array_length(checklist) from public.final_inspections where job_card_id = c1) = 2, 'checklist kept';
  -- selected
  perform public.t_as('tic');
  begin perform public.final_inspection_selected(array[c2], 'REWORK', 'x'); ok := false; exception when others then ok := true; end;
  assert ok, 'selected: pass or fail only';
  n := public.final_inspection_selected(array[c2], 'FAIL', 'wheel nuts loose', '[{"item":"a","pass":false}]'); assert n = 1, 'selected fail';
  execute 'reset role';
  assert (select status from public.job_cards where id = c2) = 'FINAL_INSPECTION_FAILED', 'failed';

  -- grouping: a fleet is in one group per schedule; saved at once
  select id into sch from public.maintenance_schedules where schedule_code = 'SCH001';
  select id into f1 from public.fleets where fleet_no = 'J0264'; select id into f2 from public.fleets where fleet_no = 'J0322'; select id into f3 from public.fleets where fleet_no = 'J0340';
  perform public.t_as('tm');
  begin perform public.group_save(sch, null, 'T-A', array[f1], 'r'); ok := false; exception when others then ok := true; end;
  assert ok, 'a Tyre Man cannot save a group';
  perform public.t_as('tic');
  begin perform public.group_save(sch, null, 'T-A', array[f1], ''); ok := false; exception when others then ok := true; end;
  assert ok, 'reason required';
  ga := public.group_save(sch, null, 'T-A', array[f1, f2], 'first');
  gb := public.group_save(sch, null, 'T-B', array[f2, f3], 'move f2');
  execute 'reset role';
  assert (select count(*) from public.fleet_group_revision_members m join public.fleet_groups g on g.current_revision_id = m.revision_id where g.id = ga) = 1, 'f2 left group A';
  assert (select count(*) from public.fleet_group_revision_members m join public.fleet_groups g on g.current_revision_id = m.revision_id where g.id = gb) = 2, 'group B has f2 and f3';
  assert (select r.status from public.fleet_group_revisions r join public.fleet_groups g on g.current_revision_id = r.id where g.id = gb) = 'APPROVED', 'active at once';
  perform public.t_as('tic');
  n := public.group_board_save(sch, jsonb_build_object(ga::text, jsonb_build_array(f2), gb::text, jsonb_build_array(f1, f3)), 'swap'); assert n = 2, 'board saved';
  begin perform public.group_board_save(sch, jsonb_build_object(ga::text, jsonb_build_array(f1), gb::text, jsonb_build_array(f1)), 'dup'); ok := false; exception when others then ok := true; end;
  assert ok, 'a fleet cannot be in two columns';
  execute 'reset role';
  assert exists (select 1 from public.fleet_group_revision_members m join public.fleet_groups g on g.current_revision_id = m.revision_id where g.id = ga and m.fleet_id = f2), 'board: A has f2';

  -- Replace selected
  perform public.t_as('tic');
  select id into sch from public.maintenance_schedules where schedule_code = 'SCH003';
  run := public.schedule_run_create(sch, app.business_today(), app.business_today(), array[f1]);
  select array_agg(id) into items from public.schedule_items where run_id = run;
  begin perform public.schedule_replace(items, array[tm]); ok := false; exception when others then ok := true; end;
  assert ok, 'nothing assigned yet -> nothing to replace';
  perform public.schedule_assign(run, items, array[tm], null, null, null);
  n := public.schedule_replace(items, array[ticid]); assert n >= 1, 'replaced: ' || n;
  execute 'reset role';
  assert exists (select 1 from public.job_id_assignees a join public.job_ids j on j.id = a.job_id_ref join public.schedule_items i on i.job_card_id = j.job_card_id where i.run_id = run and a.employee_id = ticid), 'Tyre IC now holds the work';
  assert not exists (select 1 from public.job_id_assignees a join public.job_ids j on j.id = a.job_id_ref join public.schedule_items i on i.job_card_id = j.job_card_id where i.run_id = run and a.employee_id = tm), 'Tyre Man no longer holds it';
  raise notice 'PASS: 0090';
end $$;
rollback;
