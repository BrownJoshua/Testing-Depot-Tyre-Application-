-- Test for migration 0060 (Tyre Man rounds: readings, checklist, hold, fleet round complete). Rolled back.
begin;

create function public.t_as(who text) returns void language plpgsql as $$
declare v_sub text;
begin
  execute 'reset role';
  select p.id::text into v_sub from public.profiles p join public.employees e on e.id = p.employee_id
   where e.employee_code = case who when 'sup' then 'SUPE' when 'tic' then 'TIC' else 'TMAN' end;
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_sub), true);
  execute 'set local role authenticated';
end $$;
grant execute on function public.t_as(text) to authenticated;

do $$
declare n int; tm uuid; f uuid; tyre_ids uuid[]; card uuid; card2 uuid; card3 uuid; j record; ok boolean; v_nsd numeric; fr uuid;
begin
  select id into tm from public.employees where employee_code = 'TMAN';
  select id into f from public.fleets where fleet_no = 'J0322';
  select array_agg(id order by fitted_position) into tyre_ids from public.tyres where fleet_id = f and stock_place = 'FITTED';
  assert cardinality(tyre_ids) >= 4, 'test data: fitted tyres';
  assert (select count(*) from public.psi_norms) >= 4, 'psi norms seeded';
  assert (select target_psi from public.v_tyre_psi_target where tyre_id = tyre_ids[1]) is not null, 'a target PSI for a fitted tyre';

  -- Air Inflation round
  perform public.t_as('tic');
  card := public.job_card_create('JOB_CODE', f, tyre_ids, array['JOB-001']);
  perform public.job_card_assign_work(card, array[tm]);
  perform public.t_as('tm');
  select ji.id into j from public.job_ids ji where ji.job_card_id = card limit 1;
  perform public.reading_save(j.id, jsonb_build_object('present_psi', 40, 'inflated_psi', 120));
  execute 'reset role';
  assert (select psi_flag from public.job_readings where job_id_ref = j.id) = 'LOW', 'a very low found pressure is flagged';
  assert (select status from public.job_ids where id = j.id) = 'STARTED', 'saving a reading starts the Job ID';
  perform public.t_as('tm');
  begin perform public.fleet_round_complete(card, '{"level_surface":"Y","tyre_damage":"Y","gauge":"Y"}'); ok := false; exception when others then ok := true; end;
  assert ok, 'all tyres need readings';
  for j in select id from public.job_ids where job_card_id = card loop
    perform public.reading_save(j.id, jsonb_build_object('present_psi', 100, 'inflated_psi', 120));
  end loop;
  begin perform public.fleet_round_complete(card, null); ok := false; exception when others then ok := true; end;
  assert ok, 'the checklist is needed';
  begin perform public.fleet_round_complete(card, '{"level_surface":"N","tyre_damage":"Y","gauge":"Y"}'); ok := false; exception when others then ok := true; end;
  assert ok, 'a No on level surface stops the job';
  perform public.job_hold((select id from public.job_ids where job_card_id = card limit 1), 'vehicle not available');
  execute 'reset role';
  assert (select count(*) from public.job_ids where job_card_id = card and on_hold) = 1, 'job on hold';
  perform public.t_as('tm');
  n := public.fleet_round_complete(card, '{"level_surface":"Y","tyre_damage":"Y","gauge":"Y"}', 'ok');
  execute 'reset role';
  assert n = cardinality(tyre_ids), 'completed every tyre: ' || n;
  assert (select count(*) from public.job_ids where job_card_id = card and status = 'DONE' and not on_hold) = cardinality(tyre_ids), 'Job IDs done, hold cleared';
  assert (select status from public.job_cards where id = card) = 'FINAL_INSPECTION', 'card waits for final inspection';
  assert exists (select 1 from public.card_checklists where job_card_id = card), 'checklist saved';

  -- Census: NSD = lowest groove reading; tyre NSD replaced on complete
  perform public.t_as('tic');
  card2 := public.job_card_create('JOB_CODE', f, tyre_ids, array['JOB-006']);
  perform public.job_card_assign_work(card2, array[tm]);
  perform public.t_as('tm');
  begin perform public.reading_save((select id from public.job_ids where job_card_id = card2 limit 1), jsonb_build_object('groove_readings', '12', 'grooves', 4, 'wear_pattern', 'Even wear')); ok := false; exception when others then ok := true; end;
  assert ok, 'the number of readings must match the grooves';
  for j in select id from public.job_ids where job_card_id = card2 loop
    perform public.reading_save(j.id, jsonb_build_object('groove_readings', '12-13-10-10', 'grooves', 4, 'wear_pattern', 'Even wear'));
  end loop;
  perform public.fleet_round_complete(card2);
  execute 'reset role';
  select nsd_mm into v_nsd from public.tyres where id = tyre_ids[1]; assert v_nsd = 10, 'census NSD is the lowest reading: ' || v_nsd;

  -- Rotation needs the odometer
  select id into fr from public.tyres where fleet_id = f and fitted_position = 'FR';
  perform public.t_as('tic');
  card3 := public.job_card_create('JOB_CODE', f, array[fr], array['JOB-004']);
  perform public.job_card_assign_work(card3, array[tm]);
  perform public.t_as('tm');
  begin perform public.fleet_round_complete(card3); ok := false; exception when others then ok := true; end;
  assert ok, 'rotation needs the odometer';
  perform public.reading_save((select id from public.job_ids where job_card_id = card3 limit 1), jsonb_build_object('odometer_km', 123456));
  perform public.fleet_round_complete(card3);
  execute 'reset role';
  assert (select live_odometer_km from public.fleets where id = f) = 123456, 'fleet odometer updated';

  -- a Supervisor cannot work
  perform public.t_as('sup');
  begin perform public.reading_save((select id from public.job_ids where job_card_id = card limit 1), '{}'); ok := false; exception when others then ok := true; end;
  assert ok, 'a Supervisor cannot save readings';
  execute 'reset role';
  raise notice 'PASS: 0060 tm rounds';
end $$;

rollback;
