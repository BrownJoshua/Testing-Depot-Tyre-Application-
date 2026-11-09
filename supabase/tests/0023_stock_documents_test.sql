-- Test for migration 0023 (WSR / WSR GIN / GRN / MRN / SRN, Removal and Fitment Orders, Tyre Changing job cards).
-- Safe to run: everything happens inside a transaction that is rolled back.
-- Uses the real demonstration accounts (TIC, TMAN, SUPE) and the seeded Mandaveli fleets J0264 and J0322.

begin;

create function public.t_as(who text) returns void language plpgsql as $$
declare v_sub text;
begin
  execute 'reset role';
  select p.id::text into v_sub from public.profiles p join public.employees e on e.id = p.employee_id
   where e.employee_code = case who when 'ho' then 'HOT' when 'am' then 'HOTAE' when 'sup' then 'SUPE' when 'tic' then 'TIC' else 'TMAN' end;
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_sub), true);
  execute 'set local role authenticated';
end $$;
grant execute on function public.t_as(text) to authenticated;

do $$
declare
  n int; q numeric; tic uuid; tm uuid; f1 uuid; f2 uuid; depot uuid; card uuid; card2 uuid; card3 uuid; card4 uuid; r record; j record;
  t1 uuid; t2 uuid; t3 uuid; t4 uuid; l1 uuid; l2 uuid; l3 uuid; l4 uuid; l5 uuid; gin uuid; v_no text; pos1 text; pos2 text; ok boolean; msg text; w uuid; wl uuid; srn uuid; mrn uuid;
begin
  select id into tic from public.employees where employee_code = 'TIC';
  select id into tm from public.employees where employee_code = 'TMAN';
  select id into f1 from public.fleets where fleet_no = 'J0264';
  select id into f2 from public.fleets where fleet_no = 'J0322';
  select org_unit_id into depot from public.employees where id = tic;

  -- seeds
  select count(*) into n from public.stock_items where owner_org_unit_id = depot and stock_place = 'LIVE_STOCK'; assert n >= 90, 'live stock of tube / flap / disc seeded: ' || n;
  assert exists (select 1 from public.document_number_series where series_code = 'SRN' and is_confirmed), 'SRN series';

  -- fitted tyres of the two fleets, and Good live-stock tyres
  select (array_agg(id order by fitted_position))[1], (array_agg(id order by fitted_position))[2] into t1, t2 from public.tyres where fleet_id = f1 and stock_place = 'FITTED';
  select (array_agg(id order by fitted_position))[1], (array_agg(id order by fitted_position))[2] into t3, t4 from public.tyres where fleet_id = f2 and stock_place = 'FITTED';
  select (array_agg(id order by mtc_no))[1], (array_agg(id order by mtc_no))[2], (array_agg(id order by mtc_no))[3], (array_agg(id order by mtc_no))[4]
    into l1, l2, l3, l4 from public.tyres where owner_org_unit_id = depot and stock_place = 'LIVE_STOCK' and stock_category = 'GOOD' and folio_id is not null;
  assert t1 is not null and t2 is not null and t3 is not null and l4 is not null, 'test data: tyres';

  -- permissions
  perform public.t_as('sup');
  begin perform public.tyre_change_create(f1, jsonb_build_array(jsonb_build_object('tyre_id', t1, 'reason', 'worn', 'fit', 'WANT'))); ok := false; exception when others then ok := true; end;
  assert ok, 'a Supervisor cannot create a Tyre Changing card';
  perform public.t_as('tm');
  begin perform public.tyre_change_create(f1, jsonb_build_array(jsonb_build_object('tyre_id', t1, 'reason', 'worn', 'fit', 'WANT'))); ok := false; exception when others then ok := true; end;
  assert ok, 'a Tyre Man cannot create a Tyre Changing card';

  -- 1. Live stock Set tyre: Removal -> Fitment, WSR + GIN made and issued at once, MRN waits for the removal
  perform public.t_as('tic');
  begin perform public.tyre_change_create(f1, jsonb_build_array(jsonb_build_object('tyre_id', t1, 'reason', '', 'fit', 'LIVE_SET', 'fit_tyre_id', l1))); ok := false; exception when others then ok := true; end;
  assert ok, 'a removal reason is required';
  begin perform public.tyre_change_create(f1, jsonb_build_array(jsonb_build_object('tyre_id', t3, 'reason', 'worn', 'fit', 'LIVE_SET', 'fit_tyre_id', l1))); ok := false; exception when others then ok := true; end;
  assert ok, 'the tyre must be on the chosen fleet';
  card := public.tyre_change_create(f1, jsonb_build_array(jsonb_build_object('tyre_id', t1, 'reason', 'Worn out', 'fit', 'LIVE_SET', 'fit_tyre_id', l1)), null, null, null, 'tyre change test');
  execute 'reset role';
  select position into pos1 from public.fleet_orders where job_card_id = card and part = 'TYRE' and order_type = 'REMOVAL';
  select count(*) into n from public.job_ids where job_card_id = card; assert n = 2, 'Removal + Fitment Job IDs: ' || n;
  select count(*) into n from public.fleet_orders where job_card_id = card and status = 'CREATED'; assert n = 2, '1 Removal + 1 Fitment Order, Created: ' || n;
  assert (select stock_place from public.tyres where id = l1) = 'IN_TRANSIT', 'the issued tyre leaves live stock';
  assert (select count(*) from public.wsrs w join public.wsr_lines l on l.wsr_id = w.id where l.job_card_id = card and w.status = 'ISSUED') = 1, 'WSR issued';
  assert (select count(*) from public.wsr_gins g join public.wsrs w on w.id = g.wsr_id join public.wsr_lines l on l.wsr_id = w.id where l.job_card_id = card) = 1, 'WSR GIN made';
  assert exists (select 1 from public.mrns where job_card_id = card and not ready and auto), 'the removal MRN waits for the Removal Job ID';
  select id into gin from public.wsr_gins where wsr_id = (select wsr_id from public.wsr_lines where job_card_id = card limit 1);

  -- assign and work in order
  perform public.t_as('tic');
  perform public.job_card_assign_work(card, array[tm]);
  perform public.t_as('tm');
  select id into j from public.job_ids where job_card_id = card and job_code_id = (select id from public.maintenance_jobs where job_code = 'JOB-009');
  begin perform public.job_id_start(j.id); ok := false; msg := ''; exception when others then ok := true; msg := sqlerrm; end;
  assert ok and msg like '%earlier step%', 'the order lock: Fitment waits for Removal (' || msg || ')';
  select id into j from public.job_ids where job_card_id = card and job_code_id = (select id from public.maintenance_jobs where job_code = 'JOB-008');
  perform public.job_id_start(j.id); perform public.job_id_complete(j.id);
  execute 'reset role';
  assert (select stock_place from public.tyres where id = t1) = 'IN_TRANSIT' and (select fleet_id from public.tyres where id = t1) is null, 'removed tyre is with the Tyre Man';
  assert (select status from public.fleet_orders where job_card_id = card and order_type = 'REMOVAL') = 'DONE', 'Removal Order Done';
  assert exists (select 1 from public.mrns where job_card_id = card and ready), 'the MRN is ready after removal';
  perform public.t_as('tm');
  select id into j from public.job_ids where job_card_id = card and job_code_id = (select id from public.maintenance_jobs where job_code = 'JOB-009');
  begin perform public.job_id_start(j.id); ok := false; msg := ''; exception when others then ok := true; msg := sqlerrm; end;
  assert ok and msg like '%GRN%', 'receive the GIN before fitting (' || msg || ')';
  select line.id into wl from public.wsr_lines line where line.wsr_id = (select wsr_id from public.wsr_gins where id = gin) limit 1;
  begin perform public.grn_receive_wsr_gin(gin, '[]'::jsonb); ok := false; exception when others then ok := true; end;
  assert ok, 'every item needs a result';
  v_no := public.grn_receive_wsr_gin(gin, jsonb_build_array(jsonb_build_object('line_id', wl, 'accept', true)));
  assert v_no like 'GRN-%', 'GRN number made: ' || v_no;
  perform public.job_id_start(j.id); perform public.job_id_complete(j.id);
  execute 'reset role';
  assert (select stock_place from public.tyres where id = l1) = 'FITTED' and (select fleet_id from public.tyres where id = l1) = f1 and (select fitted_position from public.tyres where id = l1) = pos1,
    'the new tyre is fitted at the removed tyre''s position';
  assert (select status from public.job_cards where id = card) = 'FINAL_INSPECTION', 'all Job IDs done -> final inspection';
  assert (select count(*) from public.fleet_orders where job_card_id = card and status = 'DONE') = 2, 'both orders Done';

  -- Tyre IC receives the removed tyre by the MRN (Material Return GRN)
  select id into mrn from public.mrns where job_card_id = card;
  perform public.t_as('tic');
  begin perform public.mrn_receive(mrn, true, null); ok := false; exception when others then ok := true; end;
  assert ok, 'a tyre MRN needs Good / Repair';
  v_no := public.mrn_receive(mrn, true, 'REPAIR', 'checked');
  execute 'reset role';
  assert (select stock_place from public.tyres where id = t1) = 'LIVE_STOCK' and (select stock_category from public.tyres where id = t1) = 'REPAIR', 'removed tyre is in Repair live stock';
  assert (select grn_no from public.mrns where id = mrn) = v_no and (select status from public.mrns where id = mrn) = 'RECEIVED', 'MRN received with a GRN number';

  -- 2. Live stock Unset tyre: flap reused (Unsetting), tube and disc from live stock (WSR): Removal -> Unsetting -> Setting -> Fitment
  perform public.t_as('tic');
  card2 := public.tyre_change_create(f1, jsonb_build_array(jsonb_build_object('tyre_id', t2, 'reason', 'Cut', 'fit', 'LIVE_UNSET', 'fit_tyre_id', l2, 'tube', 'OTHER', 'flap', 'REUSE', 'disc', 'OTHER')));
  execute 'reset role';
  select count(*) into n from public.job_ids where job_card_id = card2; assert n = 4, 'Removal, Unsetting, Setting, Fitment: ' || n;
  select count(*) into n from public.fleet_orders where job_card_id = card2 and order_type = 'REMOVAL'; assert n = 2, 'Removal Orders: tyre + reused flap: ' || n;
  select count(*) into n from public.fleet_orders where job_card_id = card2 and order_type = 'FITMENT'; assert n = 4, 'Fitment Orders: tyre + tube + flap + disc: ' || n;
  select count(*) into n from public.wsr_lines where job_card_id = card2 and line_status = 'ISSUED'; assert n = 3, 'WSR: tyre + tube + disc issued: ' || n;
  assert (select count(*) from public.fleet_orders where job_card_id = card2 and part in ('TUBE', 'DISC') and order_type = 'FITMENT' and item_id is not null) = 2, 'issued items are on the Fitment Orders';
  assert (select count(*) from public.stock_items where id in (select issued_item_id from public.wsr_lines where job_card_id = card2)) = 2, 'two items left live stock';
  perform public.t_as('tic'); perform public.job_card_assign_work(card2, array[tm]);
  perform public.t_as('tm');
  select id into gin from public.wsr_gins where wsr_id = (select wsr_id from public.wsr_lines where job_card_id = card2 limit 1);
  perform public.grn_receive_wsr_gin(gin, (select jsonb_agg(jsonb_build_object('line_id', id, 'accept', true)) from public.wsr_lines where wsr_id = (select wsr_id from public.wsr_gins where id = gin)));
  foreach msg in array array['JOB-008', 'JOB-011', 'JOB-010', 'JOB-009'] loop
    select ji.id into w from public.job_ids ji join public.maintenance_jobs m on m.id = ji.job_code_id where ji.job_card_id = card2 and m.job_code = msg;
    perform public.job_id_start(w); perform public.job_id_complete(w);
  end loop;
  execute 'reset role';
  assert (select setting_status from public.tyres where id = t2) = 'UNSET', 'the removed tyre is Unset after Unsetting';
  assert (select count(*) from public.stock_items where tyre_id = l2 and stock_place = 'FITTED') = 2, 'tube and disc are fitted on the new tyre';
  assert (select stock_place from public.tyres where id = l2) = 'FITTED', 'new tyre fitted';
  assert (select count(*) from public.fleet_orders where job_card_id = card2 and status <> 'DONE') = 0, 'every order Done';

  -- 3. swap of two fleets in one job card: no MRN, 2 Removal + 2 Fitment Orders
  perform public.t_as('tic');
  begin perform public.tyre_change_create(f1, jsonb_build_array(jsonb_build_object('tyre_id', l1, 'reason', 'swap', 'fit', 'SWAP', 'swap_tyre_id', t3))); ok := false; exception when others then ok := true; end;
  assert ok, 'a swap needs the second fleet';
  select fitted_position into pos1 from public.tyres where id = l1; select fitted_position into pos2 from public.tyres where id = t3;
  card3 := public.tyre_change_create(f1, jsonb_build_array(jsonb_build_object('tyre_id', l1, 'reason', 'swap', 'fit', 'SWAP', 'swap_tyre_id', t3)), f2);
  execute 'reset role';
  assert (select fleet2_id from public.job_cards where id = card3) = f2, 'the card has two fleets';
  select count(*) into n from public.job_ids where job_card_id = card3; assert n = 4, 'swap: 2 Removal + 2 Fitment Job IDs: ' || n;
  assert (select count(*) from public.fleet_orders where job_card_id = card3) = 4, 'swap: 4 orders';
  assert (select count(*) from public.mrns where job_card_id = card3) = 0, 'no MRN for a swap';
  perform public.t_as('tic'); perform public.job_card_assign_work(card3, array[tm]); perform public.t_as('tm');
  for w in select ji.id from public.job_ids ji join public.maintenance_jobs m on m.id = ji.job_code_id where ji.job_card_id = card3 order by m.job_code loop
    begin perform public.job_id_start(w); perform public.job_id_complete(w); exception when others then null; end;
  end loop;
  for w in select ji.id from public.job_ids ji where ji.job_card_id = card3 and ji.status = 'ASSIGNED' loop
    perform public.job_id_start(w); perform public.job_id_complete(w);
  end loop;
  execute 'reset role';
  assert (select fleet_id from public.tyres where id = l1) = f2 and (select fitted_position from public.tyres where id = l1) = pos2, 'tyre 1 now on fleet 2 at the other tyre''s position';
  assert (select fleet_id from public.tyres where id = t3) = f1 and (select fitted_position from public.tyres where id = t3) = pos1, 'tyre 3 now on fleet 1';

  -- 4. Want of Tyre: Fitment waits; the Tyre IC provides a tyre
  perform public.t_as('tic');
  card4 := public.tyre_change_create(f2, jsonb_build_array(jsonb_build_object('tyre_id', t4, 'reason', 'burst', 'fit', 'WANT')));
  execute 'reset role';
  select id into w from public.job_ids where job_card_id = card4 and status = 'WAITING_FOR_TYRE'; assert w is not null, 'fitment is Waiting for tyre';
  perform public.t_as('tic');
  perform public.job_card_assign_work(card4, array[tm]);
  execute 'reset role';
  assert (select status from public.job_ids where id = w) = 'WAITING_FOR_TYRE', 'a waiting Job ID is not assigned';
  perform public.t_as('tic');
  perform public.fitment_provide_tyre(w, l3);
  execute 'reset role';
  assert (select status from public.job_ids where id = w) = 'ASSIGNED' and (select tyre_id from public.job_ids where id = w) = l3, 'the provided tyre makes the Fitment assignable';
  assert (select stock_place from public.tyres where id = l3) = 'IN_TRANSIT', 'the provided tyre is issued';

  -- 5. ad hoc WSR raised by the Tyre Man, partly issued by the Tyre IC (the balance closes)
  perform public.t_as('tm');
  w := public.wsr_create(jsonb_build_array(jsonb_build_object('part', 'TUBE', 'size_id', (select size_id from public.stock_items where part = 'TUBE' limit 1)),
                                           jsonb_build_object('part', 'FLAP', 'size_id', (select size_id from public.stock_items where part = 'FLAP' limit 1))));
  begin perform public.wsr_issue(w, '[]'); ok := false; exception when others then ok := true; end;
  assert ok, 'a Tyre Man cannot issue';
  perform public.t_as('tic');
  select id into l5 from public.wsr_lines where wsr_id = w and part = 'TUBE';
  gin := public.wsr_issue(w, jsonb_build_array(jsonb_build_object('line_id', l5, 'item_id', (select id from public.stock_items where part = 'TUBE' and stock_place = 'LIVE_STOCK' and size_id = (select size_id from public.wsr_lines where id = l5) limit 1))));
  execute 'reset role';
  assert (select status from public.wsrs where id = w) = 'PARTLY_ISSUED', 'WSR is Partly Issued';
  assert (select line_status from public.wsr_lines where wsr_id = w and part = 'FLAP') = 'CLOSED', 'the balance closes';
  -- rejecting an item returns it to live stock
  perform public.t_as('tm');
  perform public.grn_receive_wsr_gin(gin, jsonb_build_array(jsonb_build_object('line_id', l5, 'accept', false, 'reason', 'torn')));
  execute 'reset role';
  assert (select stock_place from public.stock_items where id = (select issued_item_id from public.wsr_lines where id = l5)) = 'LIVE_STOCK', 'a rejected item goes back to live stock';

  -- 6. Scrap Return Note + scrap stock
  perform public.t_as('tm');
  begin perform public.srn_create(card, jsonb_build_array(jsonb_build_object('material', 'Gold', 'qty', 1, 'unit', 'kg'))); ok := false; exception when others then ok := true; end;
  assert ok, 'unknown scrap material refused';
  v_no := public.srn_create(card, jsonb_build_array(jsonb_build_object('material', 'Rubber', 'qty', 2.5, 'unit', 'kg'), jsonb_build_object('material', 'Scrap tube', 'qty', 1, 'unit', 'nos')));
  assert v_no like 'SRN%', 'SRN number: ' || v_no;
  execute 'reset role';
  select id into srn from public.srns where srn_no = v_no;
  perform public.t_as('tm');
  begin perform public.srn_receive(srn); ok := false; exception when others then ok := true; end;
  assert ok, 'a Tyre Man cannot receive an SRN';
  perform public.t_as('tic'); perform public.srn_receive(srn);
  select stock_qty into q from public.v_scrap_stock where material = 'Rubber' and unit = 'kg'; assert q >= 2.5, 'scrap stock Rubber at least 2.5 kg: ' || coalesce(q::text, 'none');

  execute 'reset role';
  raise notice 'PASS: 0023 stock documents and Tyre Changing';
end $$;

rollback;
