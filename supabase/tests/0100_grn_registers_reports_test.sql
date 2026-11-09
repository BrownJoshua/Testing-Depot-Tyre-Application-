-- Test for migration 0100 (GRN receive, PSI norms, air-type requests, PFR / damage / DRN, tyre corrections, Tyre Detailed Master). Rolled back.
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
create function public.t_do(p_entity text, p_target uuid, p_action text, p_payload text) returns uuid language plpgsql as $$
declare v uuid; t uuid;
begin
  perform public.t_as('ho');
  v := public.master_request_create(p_entity, p_action::public.master_action, p_target, p_payload::jsonb, 'test');
  perform public.master_request_submit(v);
  perform public.t_as('am'); perform public.master_request_approve(v); execute 'reset role';
  select target_id into t from public.master_change_requests where id = v;
  return t;
end $$;

do $$
declare
  mn uuid; ad uuid; tic uuid; gin uuid; tys uuid[]; n int; v_no text; ok boolean; msg text; trs uuid[]; mic uuid; fl uuid; req uuid; norm uuid; tcol uuid; tyre uuid; r text; dr uuid; drn uuid;
begin
  select id into mn from public.org_units where code = 'MN'; select id into ad from public.org_units where code = 'AD';
  select id into tic from public.employees where employee_code = 'TIC';

  -- 11a. other depot -> our depot: partial receipt, reasons from the master, close the rest
  select array_agg(id) into tys from (select id from public.tyres where owner_org_unit_id = mn and stock_place = 'LIVE_STOCK' order by mtc_no limit 3) s;
  update public.tyres set owner_org_unit_id = ad, stock_place = 'IN_TRANSIT', transit_status = 'IN_TRANSIT' where id = any (tys);
  gin := gen_random_uuid();
  insert into public.indent_gins (id, gin_no, org_unit_id, to_unit_id, status, created_by, in_transit_at) values (gin, 'GIN-AD-TEST-1', ad, mn, 'IN_TRANSIT', tic, now() - interval '1 day');
  insert into public.indent_gin_tyres (gin_id, tyre_id, org_unit_id) select gin, unnest(tys), ad;
  perform public.t_as('tic');
  begin perform public.grn_receive_gin2(gin, jsonb_build_array(jsonb_build_object('tyre_id', tys[1], 'accept', false, 'reason', 'because')), null, null); ok := false; exception when others then ok := true; end;
  assert ok, 'a free-text reject reason is refused';
  begin perform public.grn_receive_gin2(gin, '[]', null, null); ok := false; exception when others then ok := true; end;
  assert ok, 'nothing marked is refused';
  begin perform public.grn_receive_gin2(gin, jsonb_build_array(jsonb_build_object('tyre_id', tys[1], 'accept', true)), now() - interval '5 days', null); ok := false; exception when others then ok := true; end;
  assert ok, 'received before the gate pass is refused';
  v_no := public.grn_receive_gin2(gin, jsonb_build_array(jsonb_build_object('tyre_id', tys[1], 'accept', true), jsonb_build_object('tyre_id', tys[2], 'accept', false, 'reason', 'Casing Damaged — damaged beyond use')), now(), null);
  execute 'reset role';
  assert (select status from public.indent_gins where id = gin) = 'IN_TRANSIT', 'partial receipt: the GIN stays In transit';
  assert (select accepted_qty from public.grns where grn_no = v_no) = 1 and (select rejected_qty from public.grns where grn_no = v_no) = 1, 'GRN counts';
  assert (select owner_org_unit_id from public.tyres where id = tys[1]) = mn and (select stock_place from public.tyres where id = tys[1]) = 'LIVE_STOCK', 'accepted tyre is in our live stock';
  perform public.t_as('tic');
  v_no := public.grn_receive_gin2(gin, '[]', null, 'did not arrive');
  execute 'reset role';
  assert (select status from public.indent_gins where id = gin) = 'RECEIVED', 'closing the rest completes the GIN';
  assert (select result from public.indent_gin_tyres where gin_id = gin and tyre_id = tys[3]) = 'MISSING', 'the tyre that did not arrive is Missing';

  -- 11b. TRS and MIC
  select array_agg(id) into trs from public.tyres where owner_org_unit_id = mn and stock_place = 'AT_TRS' and trs_ready_at is not null;
  assert cardinality(trs) >= 3, 'TRS tyres ready: ' || coalesce(cardinality(trs)::text, '0');
  perform public.t_as('tic');
  v_no := public.grn_receive_unit('TRS', jsonb_build_array(jsonb_build_object('tyre_id', trs[1], 'accept', true), jsonb_build_object('tyre_id', trs[2], 'accept', false, 'reason', 'Grade Variance — retreaded grade does not match expectation')), null, 'rest not sent');
  execute 'reset role';
  assert (select stock_place from public.tyres where id = trs[1]) = 'LIVE_STOCK' and (select stock_place from public.tyres where id = trs[2]) = 'AT_TRS', 'TRS: accepted to live stock, rejected stays';
  assert not exists (select 1 from public.tyres where owner_org_unit_id = mn and stock_place = 'AT_TRS' and trs_ready_at is not null), 'the rest of the TRS row is closed';
  select id into mic from public.tyres where owner_org_unit_id = mn and stock_place = 'AT_MIC' limit 1;
  perform public.t_as('tic');
  begin perform public.grn_receive_unit('MIC', jsonb_build_array(jsonb_build_object('tyre_id', mic, 'accept', true, 'returned_as', 'FITTED')), null, null); ok := false; exception when others then ok := true; end;
  assert ok, 'a tyre fitted on the road needs the removed tyre and fleet';
  v_no := public.grn_receive_unit('MIC', jsonb_build_array(jsonb_build_object('tyre_id', mic, 'accept', true, 'returned_as', 'UNUSED')), null, null);
  execute 'reset role';
  assert (select stock_place from public.tyres where id = mic) = 'LIVE_STOCK', 'MIC tyre back in live stock';
  assert (select note from public.grn_lines where tyre_id = mic) = 'Returned unused', 'MIC note';

  -- 18. PSI norm through the approval engine; air-type request HO then AM
  norm := public.t_do('psi_norm', null, 'CREATE', format('{"size_id":"%s","construction":"RADIAL","front_regular":120,"front_nitrogen":118,"rear_regular":115,"rear_nitrogen":113}', (select id from public.tyre_sizes where size_code = '9.00 X 20')));
  assert exists (select 1 from public.psi_norms where id = norm and front_regular = 120), 'PSI norm created through the engine';
  norm := public.t_do('psi_norm', norm, 'UPDATE', '{"front_regular":125}');
  assert (select front_regular from public.psi_norms where id = norm) = 125, 'PSI norm updated';
  select id into fl from public.fleets where fleet_no = 'J0264';
  perform public.t_as('tic');
  v_no := public.air_type_request_create(fl, case (select air_type from public.fleets where id = fl) when 'REGULAR' then 'NITROGEN' else 'REGULAR' end, 'trial');
  select id into req from public.air_type_requests where req_no = v_no;
  begin perform public.air_type_request_act(req, 'APPROVE'); ok := false; exception when others then ok := true; end;
  assert ok, 'a Tyre IC cannot decide an air-type request';
  perform public.t_as('am');
  begin perform public.air_type_request_act(req, 'APPROVE'); ok := false; exception when others then ok := true; end;
  assert ok, 'AM cannot approve before HO';
  perform public.t_as('ho'); perform public.air_type_request_act(req, 'APPROVE');
  perform public.t_as('ho');
  begin perform public.air_type_request_act(req, 'APPROVE'); ok := false; exception when others then ok := true; end;
  assert ok, 'HO cannot decide twice';
  perform public.t_as('am'); perform public.air_type_request_act(req, 'APPROVE');
  execute 'reset role';
  assert (select status from public.air_type_requests where id = req) = 'APPROVED' and (select air_type from public.fleets where id = fl) = (select to_type from public.air_type_requests where id = req), 'fleet air type converted';

  -- 24. PFR loss, damage request flow, DRN
  select id into tyre from public.tyres where owner_org_unit_id = mn and stock_place = 'FITTED' limit 1;
  perform public.t_as('tic');
  begin perform public.pfr_create(tyre, 'DRIVER', null, null, null, 2, 45000, 60000, 14000, 'x', 'y'); ok := false; exception when others then ok := true; end;
  assert ok, 'a driver fault needs the employee';
  v_no := public.pfr_create(tyre, 'MANUFACTURER', null, null, null, 2, 45000, 60000, 14000, 'Casing separation', 'Below norm');
  execute 'reset role';
  assert (select loss_amount from public.pfr_reports where report_no = v_no) = 3500.00 and (select remaining_km from public.pfr_reports where report_no = v_no) = 15000, 'loss = price x remaining / norm';
  select id into dr from public.damage_requests where req_no = 'DR-2026-001';
  perform public.t_as('tic');
  begin perform public.damage_report_submit(dr, '{"route":"12"}'); ok := false; exception when others then ok := true; end;
  assert ok, 'an incomplete damage report is refused';
  perform public.damage_report_submit(dr, '{"puncture_at":"2026-09-18 10:00","route":"12","place":"Adyar","cause":"Nail"}');
  begin perform public.damage_request_decide((select id from public.damage_requests where req_no = 'DR-2026-002'), true); ok := false; exception when others then ok := true; end;
  assert ok, 'a Tyre IC cannot decide for TRS';
  perform public.t_as('ho');
  begin perform public.damage_request_decide((select id from public.damage_requests where req_no = 'DR-2026-002'), false, null); ok := false; exception when others then ok := true; end;
  assert ok, 'a return needs a reason';
  perform public.damage_request_decide((select id from public.damage_requests where req_no = 'DR-2026-002'), false, 'insufficient detail');
  execute 'reset role';
  assert (select status from public.damage_requests where req_no = 'DR-2026-001') = 'REPORT_RECEIVED' and (select status from public.damage_requests where req_no = 'DR-2026-002') = 'RETURNED', 'damage request statuses';

  update public.tyres set warranty_upto = date '2027-12-31' where id = (select id from public.tyres where owner_org_unit_id = mn and stock_place = 'LIVE_STOCK' order by mtc_no limit 1);
  select id into tyre from public.tyres where owner_org_unit_id = mn and stock_place = 'LIVE_STOCK' and warranty_upto = date '2027-12-31' limit 1;
  perform public.t_as('tic');
  begin perform public.drn_create('TRS Chrompet', null, array[(select id from public.tyres where owner_org_unit_id = mn and stock_place = 'FITTED' limit 1)]); ok := false; exception when others then ok := true; end;
  assert ok, 'a fitted tyre cannot go on a DRN';
  v_no := public.drn_create('TRS Chrompet', 'warranty', array[tyre]);
  execute 'reset role';
  select id into drn from public.drns where drn_no = v_no;
  perform public.t_as('tic');
  begin perform public.drn_act(drn, 'APPROVE'); ok := false; exception when others then ok := true; end;
  assert ok, 'a Tyre IC cannot approve a DRN';
  perform public.t_as('sup');
  begin perform public.drn_act(drn, 'REJECT', null); ok := false; exception when others then ok := true; end;
  assert ok, 'a rejection needs a reason';
  perform public.drn_act(drn, 'APPROVE');
  execute 'reset role';
  assert (select stock_place from public.tyres where id = tyre) = 'AT_TRS', 'an approved DRN sends the tyre to TRS';

  -- 25. tyre correction and the Tyre Detailed Master
  select id into tyre from public.tyres where owner_org_unit_id = mn and stock_place = 'FITTED' limit 1;
  perform public.t_as('tic');
  begin perform public.tyre_correction_create(tyre, '{"mtc_no":"X1"}'); ok := false; exception when others then ok := true; end;
  assert ok, 'only listed fields can be corrected';
  begin perform public.tyre_correction_create(tyre, '{"warranty_upto":"not a date"}'); ok := false; exception when others then ok := true; end;
  assert ok, 'a bad value is refused';
  v_no := public.tyre_correction_create(tyre, '{"makers_no":"CORR-9001","grade":"B"}', null, 'wrong entry');
  select id into req from public.tyre_corrections where req_no = v_no;
  begin perform public.tyre_correction_decide(req, true); ok := false; exception when others then ok := true; end;
  assert ok, 'a Tyre IC cannot approve a correction';
  perform public.t_as('ho'); perform public.tyre_correction_decide(req, true);
  execute 'reset role';
  assert (select makers_no from public.tyres where id = tyre) = 'CORR-9001' and (select grade from public.tyres where id = tyre) = 'B', 'approved correction applied';
  tcol := public.t_do('tyre_detail_column', null, 'CREATE', '{"column_name":"Retread Count","input_field":"Number"}');
  assert exists (select 1 from public.tyre_detail_columns where id = tcol and column_code ~ '^TDM-[0-9]{3}$'), 'a new Tyre Detailed Master column through the engine';
  assert (select count(*) from public.tyre_detail_columns) >= 26, 'columns seeded';

  execute 'reset role';
  raise notice 'PASS: 0100';
end $$;

rollback;
