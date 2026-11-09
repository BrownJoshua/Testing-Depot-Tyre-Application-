-- Test for migrations 0080 / 0081 (Rotation outcome, Tyre Man work forms, Set tyre not available, Setting / Unsetting cards). Rolled back.
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
declare
  tm uuid; today date; sch uuid; fa uuid; fb uuid; fc uuid; run_a uuid; run_b uuid; ca uuid; cb uuid; cc uuid; item uuid; ok boolean; n int;
  fr_a uuid; fl_a uuid; fr_b uuid; fl_b uuid; rot_a date; j record; w uuid; gin uuid; l1 uuid; l2 uuid; l3 uuid; rm uuid; mtc text; cs uuid; cr uuid; cs2 uuid; rep uuid; good uuid; msg text;
  pr text := 'data:image/jpeg;base64,AAAA';
begin
  select id into tm from public.employees where employee_code = 'TM-3092';
  today := app.business_today();
  select id into sch from public.maintenance_schedules where schedule_code = 'SCH004';
  -- three fleets of the depot with both front tyres fitted and no open job card
  select (array_agg(f.id order by f.fleet_no))[1], (array_agg(f.id order by f.fleet_no))[2], (array_agg(f.id order by f.fleet_no))[3] into fa, fb, fc
    from public.fleets f where f.org_unit_id = (select org_unit_id from public.employees where id = tm) and f.status = 'ACTIVE'
     and (select count(*) from public.tyres t where t.fleet_id = f.id and t.fitted_position in ('FR', 'FL') and t.stock_place = 'FITTED') = 2
     and not exists (select 1 from public.job_cards c where c.fleet_id = f.id and c.status not in ('COMPLETED', 'CLOSED'));
  assert fc is not null, 'test data: three free fleets';

  -- 3. Rotation, Not swapped: due tyre Done, partner Closed, no swap, no date change
  select id into fr_a from public.tyres where fleet_id = fa and fitted_position = 'FR'; select id into fl_a from public.tyres where fleet_id = fa and fitted_position = 'FL';
  select last_rotation_date into rot_a from public.tyres where id = fr_a;
  perform public.t_as('tic');
  run_a := public.schedule_run_create(sch, today - 60, today + 60, array[fa]);
  select id into item from public.schedule_items where run_id = run_a and tyre_id = fr_a limit 1;
  perform public.schedule_assign(run_a, array[item], array[tm]);
  select id into ca from public.job_cards where schedule_run_id = run_a;
  perform public.t_as('tm');
  begin perform public.rotation_complete(ca, null, 1000); ok := false; exception when others then ok := true; end; assert ok, 'Swapped / Not swapped must be chosen';
  begin perform public.rotation_complete(ca, true, null); ok := false; exception when others then ok := true; end; assert ok, 'odometer is mandatory';
  begin perform public.rotation_complete(ca, false, 1000, null, 'rim crack', null); ok := false; exception when others then ok := true; end; assert ok, 'Not swapped needs a photo';
  begin perform public.rotation_complete(ca, false, 1000, null, '', pr); ok := false; exception when others then ok := true; end; assert ok, 'Not swapped needs a reason';
  n := public.rotation_complete(ca, false, 1000, null, 'Wheel nut seized', pr); assert n = 1, 'only the due tyre is completed: ' || n;
  execute 'reset role';
  assert (select status from public.job_ids where job_card_id = ca and tyre_id = fr_a) = 'DONE', 'due tyre Job ID Done';
  assert (select status from public.job_ids where job_card_id = ca and tyre_id = fl_a) = 'CLOSED', 'partner Job ID Closed';
  assert (select fitted_position from public.tyres where id = fr_a) = 'FR', 'not swapped: the tyre stays in place';
  assert (select last_rotation_date from public.tyres where id = fr_a) is not distinct from rot_a, 'not swapped: no rotation date';
  assert (select status from public.job_cards where id = ca) = 'FINAL_INSPECTION', 'card goes to final inspection';
  assert (select live_odometer_km from public.fleets where id = fa) = 1000, 'fleet odometer updated';
  assert exists (select 1 from public.job_work_forms where job_card_id = ca and swapped is false and not_swapped_reason = 'Wheel nut seized'), 'form stored';

  -- 3. Rotation, Swapped
  select id into fr_b from public.tyres where fleet_id = fb and fitted_position = 'FR'; select id into fl_b from public.tyres where fleet_id = fb and fitted_position = 'FL';
  perform public.t_as('tic');
  run_b := public.schedule_run_create(sch, today - 60, today + 60, array[fb]);
  select id into item from public.schedule_items where run_id = run_b and tyre_id = fr_b limit 1;
  perform public.schedule_assign(run_b, array[item], array[tm]);
  select id into cb from public.job_cards where schedule_run_id = run_b;
  perform public.t_as('tm');
  n := public.rotation_complete(cb, true, 2000); assert n = 2, 'both tyres completed: ' || n;
  execute 'reset role';
  assert (select fitted_position from public.tyres where id = fr_b) = 'FL' and (select fitted_position from public.tyres where id = fl_b) = 'FR', 'swapped: FR and FL exchanged';
  assert (select count(*) from public.job_ids where job_card_id = cb and status = 'DONE') = 2, 'both Job IDs Done';

  -- 13. Tyre Changing through the work forms
  select (array_agg(id order by mtc_no))[1], (array_agg(id order by mtc_no))[2] into l1, l2 from public.tyres t where owner_org_unit_id = (select org_unit_id from public.employees where id = tm)
    and stock_place = 'LIVE_STOCK' and stock_category = 'GOOD' and setting_status = 'SET' and folio_id is not null and not exists (select 1 from public.job_ids ji where ji.tyre_id = t.id);
  assert l2 is not null, 'test data: two good set tyres';
  select id, mtc_no into rm, mtc from public.tyres where fleet_id = fc and fitted_position = 'FR';
  perform public.t_as('tic');
  cc := public.tyre_change_create(fc, jsonb_build_array(jsonb_build_object('tyre_id', rm, 'reason', 'Worn out', 'fit', 'LIVE_SET', 'fit_tyre_id', l1)));
  perform public.job_card_assign_work(cc, array[tm]);
  select id into gin from public.wsr_gins where wsr_id = (select wsr_id from public.wsr_lines where job_card_id = cc limit 1);
  perform public.t_as('tm');
  select id into w from public.job_ids where job_card_id = cc and tyre_id = rm;
  begin perform public.work_form_complete(w, jsonb_build_object('scanned_no', 'WRONG1', 'odometer_km', 100)); ok := false; msg := ''; exception when others then ok := true; msg := sqlerrm; end;
  assert ok and msg like '%not the tyre%', 'a wrong tyre number is refused: ' || msg;
  begin perform public.work_form_complete(w, jsonb_build_object('scanned_no', mtc)); ok := false; exception when others then ok := true; end; assert ok, 'removal needs the odometer';
  perform public.work_form_complete(w, jsonb_build_object('scanned_no', lower(mtc), 'odometer_km', 5000, 'nsd_mm', 3.5, 'wear_pattern', 'Even wear'));
  execute 'reset role';
  assert (select status from public.job_ids where id = w) = 'DONE', 'removal done through the form';
  assert (select nsd_mm from public.tyres where id = rm) = 3.5, 'NSD at removal stored on the tyre';
  -- receive the GIN, then "Set tyre not available" at the Fitment
  perform public.t_as('tm');
  perform public.grn_receive_wsr_gin(gin, (select jsonb_agg(jsonb_build_object('line_id', id, 'accept', true)) from public.wsr_lines where wsr_id = (select wsr_id from public.wsr_gins where id = gin)));
  select id into w from public.job_ids where job_card_id = cc and tyre_id = l1;
  begin perform public.fitment_set_tyre_unavailable((select id from public.job_ids where job_card_id = cc and tyre_id = rm)); ok := false; exception when others then ok := true; end; assert ok, 'only on a Fitment step';
  perform public.fitment_set_tyre_unavailable(w, 'tyre is not mounted');
  execute 'reset role';
  assert (select status from public.job_ids where id = w) = 'WAITING_FOR_TYRE' and (select tyre_id from public.job_ids where id = w) is null, 'Fitment waits for a tyre';
  assert exists (select 1 from public.complaints c join public.complaint_types t on t.id = c.complaint_type_id where t.complaint_code = 'CMP067' and c.remarks like 'Set tyre not available -%' and c.fleet_id = fc), 'the complaint is raised';
  assert exists (select 1 from public.mrns where tyre_id = l1 and ready and status = 'CREATED'), 'the planned tyre is returned by an MRN';
  assert not exists (select 1 from public.job_id_assignees where job_id_ref = w), 'the waiting Fitment has no assignee';
  perform public.t_as('tic');
  perform public.fitment_provide_tyre(w, l2);
  select id into gin from public.wsr_gins where wsr_id = (select wsr_id from public.wsr_lines where job_id_ref = w limit 1);
  perform public.t_as('tm');
  assert (select status from public.job_ids where id = w) = 'ASSIGNED', 'the provided tyre makes the Fitment assignable again';
  perform public.grn_receive_wsr_gin(gin, (select jsonb_agg(jsonb_build_object('line_id', id, 'accept', true)) from public.wsr_lines where wsr_id = (select wsr_id from public.wsr_gins where id = gin)));
  perform public.work_form_complete(w, jsonb_build_object('scanned_no', (select mtc_no from public.tyres where id = l2), 'odometer_km', 5001, 'psi_after', 110));
  execute 'reset role';
  assert (select fleet_id from public.tyres where id = l2) = fc and (select stock_place from public.tyres where id = l2) = 'FITTED', 'the new tyre is fitted';

  -- 21. Setting / Unsetting cards for live-stock tyres
  select id into rep from public.tyres t where owner_org_unit_id = (select org_unit_id from public.employees where id = tm) and stock_place = 'LIVE_STOCK' and stock_category = 'REPAIR'
     and not exists (select 1 from public.job_ids ji where ji.tyre_id = t.id) limit 1;
  update public.tyres set setting_status = 'SET' where id = rep;
  select id into good from public.tyres t where owner_org_unit_id = (select org_unit_id from public.employees where id = tm) and stock_place = 'LIVE_STOCK' and stock_category = 'GOOD'
     and setting_status = 'UNSET' and not exists (select 1 from public.job_ids ji where ji.tyre_id = t.id) limit 1;
  assert rep is not null and good is not null, 'test data: a repair set tyre and a good unset tyre';
  perform public.t_as('tm');
  begin perform public.tyre_service_create('JOB-011', rep); ok := false; exception when others then ok := true; end; assert ok, 'a Tyre Man cannot create the card';
  perform public.t_as('tic');
  begin perform public.tyre_service_create('JOB-011', good); ok := false; exception when others then ok := true; end; assert ok, 'Unsetting needs a Repair set tyre';
  begin perform public.tyre_service_create('JOB-010', rep); ok := false; exception when others then ok := true; end; assert ok, 'Setting needs a Good unset tyre';
  begin perform public.tyre_service_create('JOB-008', rep); ok := false; exception when others then ok := true; end; assert ok, 'only Setting or Unsetting';
  cs := public.tyre_service_create('JOB-011', rep, null, null, 'unset for transit');
  begin perform public.tyre_service_create('JOB-011', rep); ok := false; exception when others then ok := true; end; assert ok, 'one open card per tyre';
  cs2 := public.tyre_service_create('JOB-010', good);
  assert (select fleet_id from public.job_cards where id = cs) is null, 'no fleet';
  perform public.job_card_assign_work(cs, array[tm]); perform public.job_card_assign_work(cs2, array[tm]);
  perform public.t_as('tm');
  select id into w from public.job_ids where job_card_id = cs;
  begin perform public.work_form_complete(w, jsonb_build_object('scanned_no', (select mtc_no from public.tyres where id = rep), 'parts', jsonb_build_object('tube', jsonb_build_object('no', 'T1', 'condition', 'USABLE')))); ok := false; exception when others then ok := true; end;
  assert ok, 'Unsetting needs the tube, flap and disc with a condition';
  perform public.work_form_complete(w, jsonb_build_object('scanned_no', (select mtc_no from public.tyres where id = rep), 'parts', jsonb_build_object(
    'tube', jsonb_build_object('no', 'TB1', 'condition', 'USABLE'), 'flap', jsonb_build_object('no', 'FL1', 'condition', 'NOT_USABLE'), 'disc', jsonb_build_object('no', 'DS1', 'condition', 'USABLE'))));
  select id into w from public.job_ids where job_card_id = cs2;
  perform public.work_form_complete(w, jsonb_build_object('scanned_no', (select mtc_no from public.tyres where id = good), 'powder_applied', true));
  execute 'reset role';
  assert (select setting_status from public.tyres where id = rep) = 'UNSET' and (select stock_place from public.tyres where id = rep) = 'LIVE_STOCK', 'unset tyre stays in live stock';
  assert (select setting_status from public.tyres where id = good) = 'SET', 'set tyre is Good Set';
  assert (select status from public.job_cards where id = cs) = 'FINAL_INSPECTION', 'the Unsetting card is at final inspection';
  assert (select parts -> 'flap' ->> 'condition' from public.job_work_forms where job_card_id = cs) = 'NOT_USABLE', 'part condition stored';

  -- isolation: forms follow the Job ID
  perform public.t_as('sup');
  assert (select count(*) from public.job_work_forms) >= 1, 'the Supervisor reads the depot forms';
  assert not has_function_privilege('anon', 'public.work_form_complete(uuid, jsonb, text)', 'execute'), 'anon cannot complete';
  execute 'reset role';
  raise notice 'PASS: 0080 work forms';
end $$;

rollback;
