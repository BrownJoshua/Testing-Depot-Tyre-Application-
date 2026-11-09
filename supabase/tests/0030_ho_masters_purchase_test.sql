-- Test for migration 0030 (HO masters: reject reason, wear pattern, QC, expected life KM, shift; Purchase Indent). Rolled back.
begin;

create function public.t_as(who text) returns void language plpgsql as $$
declare v_sub text;
begin
  execute 'reset role';
  select p.id::text into v_sub from public.profiles p join public.employees e on e.id = p.employee_id
   where e.employee_code = case who when 'ho' then 'HOT' when 'am' then 'HOTAE' when 'tic' then 'TIC' else 'TMAN' end;
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_sub), true);
  execute 'set local role authenticated';
end $$;
grant execute on function public.t_as(text) to authenticated;
create function public.t_do(p_entity text, p_action text, p_target uuid, p_payload text) returns uuid language plpgsql as $$
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
declare n int; t uuid; i uuid; ok boolean; v_no text; v_folio uuid;
begin
  assert (select count(*) from public.reject_reasons) >= 4 and (select count(*) from public.wear_patterns) >= 8 and (select count(*) from public.qc_checklists) >= 10, 'seeds';
  assert (select count(*) from public.expected_life_km) >= 3, 'expected life seeds';

  t := public.t_do('reject_reason', 'CREATE', null, '{"reason_code":"DRR-077","reason_text":"Tube missing with the tyre"}');
  assert (select reason_text from public.reject_reasons where id = t) = 'Tube missing with the tyre', 'reject reason created';
  t := public.t_do('wear_pattern', 'CREATE', null, '{"pattern_code":"WP-077","pattern_name":"Rib punching"}');
  t := public.t_do('wear_pattern', 'DEACTIVATE', t, '{}');
  assert (select status from public.wear_patterns where pattern_code = 'WP-077') = 'INACTIVE', 'wear pattern deactivated';
  t := public.t_do('qc_checklist', 'CREATE', null, '{"qc_code":"QCM-077","job_type":"Census","checklist_items":"Count tyres\nRecord NSD"}');
  assert (select cardinality(checklist_items) from public.qc_checklists where id = t) = 2, 'QC items split by line';
  t := public.t_do('shift', 'CREATE', null, '{"shift_code":"SPLIT","shift_name":"Split","start_time":"07:00","end_time":"19:00"}');
  assert exists (select 1 from public.shifts where shift_code = 'SPLIT'), 'shift created';
  select id into t from public.expected_life_km limit 1;
  perform public.t_do('expected_life_km', 'UPDATE', t, '{"km_new":50000}');
  assert (select km_new from public.expected_life_km where id = t) = 50000, 'expected life updated';
  begin perform public.t_do('reject_reason', 'CREATE', null, '{"reason_code":"DRR-001","reason_text":"duplicate id"}'); ok := false; exception when others then ok := true; end;
  assert ok, 'duplicate reason id refused';

  -- Purchase Indent
  select id into v_folio from public.tyre_folios where status = 'ACTIVE' limit 1;
  perform public.t_as('tic');
  begin perform public.purchase_indent_create('Emergency Indent', 'Tyre', 'All', jsonb_build_array(jsonb_build_object('folio_id', v_folio, 'qty', 2))); ok := false; exception when others then ok := true; end;
  assert ok, 'a Tyre IC cannot raise a Purchase Indent';
  perform public.t_as('ho');
  begin perform public.purchase_indent_create('Emergency Indent', 'Tyre', 'All', '[]'); ok := false; exception when others then ok := true; end;
  assert ok, 'lines are required';
  v_no := public.purchase_indent_create('Emergency Indent', 'Tyre', 'All', jsonb_build_array(jsonb_build_object('folio_id', v_folio, 'qty', 2)), 'urgent');
  assert v_no like 'PI-HO-%', 'indent number ' || v_no;
  perform public.t_as('am');
  select id into i from public.purchase_indents where indent_no = v_no;
  begin perform public.purchase_indent_decide(i, false, ''); ok := false; exception when others then ok := true; end;
  assert ok, 'revert needs a reason';
  perform public.purchase_indent_decide(i, true);
  assert (select status from public.purchase_indents where id = i) = 'ISSUED', 'issued';
  begin perform public.purchase_indent_decide(i, true); ok := false; exception when others then ok := true; end;
  assert ok, 'decided once';
  perform public.t_as('ho');
  begin perform public.purchase_indent_decide(i, true); ok := false; exception when others then ok := true; end;
  assert ok, 'HO cannot decide';
  perform public.t_as('tic');
  assert (select count(*) from public.purchase_indents) = 0, 'a Tyre IC cannot read purchase indents';
  execute 'reset role';
  raise notice 'PASS: 0030 HO masters and purchase indent';
end $$;

rollback;
