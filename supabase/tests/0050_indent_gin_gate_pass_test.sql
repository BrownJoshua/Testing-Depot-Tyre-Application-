-- Test for migration 0050 (WSR reject / cancel, Indent, Internal Transfer Request, Indent GIN, Gate Pass, GRN of a GIN). Rolled back.
begin;

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'authenticated', 'authenticated', 't50-tic@test.invalid'),
  ('00000000-0000-0000-0000-0000000000d2', 'authenticated', 'authenticated', 't50-sup@test.invalid');
insert into public.employees (id, employee_code, full_name, role_code, org_unit_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'T50-TIC', 'T50 TIC', 'TIC', (select id from public.org_units where code = 'AD')),
  ('00000000-0000-0000-0000-0000000000f2', 'T50-SUP', 'T50 SUP', 'SUP', (select id from public.org_units where code = 'AD'));
insert into public.profiles (id, employee_id) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1'), ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000f2');

create function public.t_as(who text) returns void language plpgsql as $$
declare v_sub text;
begin
  execute 'reset role';
  select p.id::text into v_sub from public.profiles p join public.employees e on e.id = p.employee_id
   where e.employee_code = case who when 'sup' then 'SUP-2231' when 'tic' then 'TIC-1147' when 'tm' then 'TM-3092' when 'adtic' then 'T50-TIC' else 'T50-SUP' end;
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_sub), true);
  execute 'set local role authenticated';
end $$;
grant execute on function public.t_as(text) to authenticated;

do $$
declare ad uuid; mn uuid; trs uuid; ind uuid; ind2 uuid; g uuid; g2 uuid; t1 uuid; t2 uuid; t3 uuid; gp text; gpid uuid; w uuid; ok boolean; v_no text; n int;
begin
  select id into ad from public.org_units where code = 'AD'; select id into mn from public.org_units where code = 'MN'; select id into trs from public.org_units where code = 'TRS-CH';
  -- three live-stock tyres: two now belong to Adyar (it will send them), one stays at Mandaveli
  select (array_agg(id order by mtc_no))[1], (array_agg(id order by mtc_no))[2], (array_agg(id order by mtc_no))[3] into t1, t2, t3
    from public.tyres where owner_org_unit_id = mn and stock_place = 'LIVE_STOCK' and stock_category = 'GOOD';
  update public.tyres set owner_org_unit_id = ad where id in (t1, t2);

  -- WSR reject / cancel
  perform public.t_as('tm'); w := public.wsr_create(jsonb_build_array(jsonb_build_object('part', 'TUBE', 'size_id', (select id from public.tyre_sizes limit 1))));
  perform public.t_as('tic');
  begin perform public.wsr_cancel(w, ''); ok := false; exception when others then ok := true; end; assert ok, 'cancel needs a reason';
  perform public.wsr_reject(w, 'Set tyre already has a tube');
  assert (select status from public.wsrs where id = w) = 'REJECTED' and (select status_note from public.wsrs where id = w) like 'Set tyre%', 'WSR rejected with a note';
  perform public.t_as('tm'); w := public.wsr_create(jsonb_build_array(jsonb_build_object('part', 'FLAP', 'size_id', (select id from public.tyre_sizes limit 1))));
  begin perform public.wsr_reject(w, 'no'); ok := false; exception when others then ok := true; end; assert ok, 'a Tyre Man cannot reject';
  perform public.wsr_cancel(w, 'raised by mistake'); assert (select status from public.wsrs where id = w) = 'CANCELLED', 'raiser cancels';

  -- Mandaveli indents tyres from Adyar (Internal Transfer): create, send, Supervisor approves
  perform public.t_as('tic');
  begin perform public.indent_create('INDENT', ad, null, 2); ok := false; exception when others then ok := true; end; assert ok, 'an Indent must go to the Central Store';
  ind := public.indent_create('INTERNAL_TRANSFER', ad, (select id from public.tyre_sizes limit 1), 2, 'Fleet J0264', 'urgent');
  perform public.indent_act(ind, 'SEND');
  perform public.t_as('tm'); begin perform public.indent_act(ind, 'APPROVE'); ok := false; exception when others then ok := true; end; assert ok, 'a Tyre Man cannot approve';
  perform public.t_as('tic'); begin perform public.indent_act(ind, 'APPROVE'); ok := false; exception when others then ok := true; end; assert ok, 'a Tyre IC cannot approve';
  perform public.t_as('sup'); begin perform public.indent_act(ind, 'REVERT'); ok := false; exception when others then ok := true; end; assert ok, 'revert needs a reason';
  perform public.indent_act(ind, 'REVERT', 'recheck'); assert (select status from public.indents where id = ind) = 'REVERTED', 'reverted';
  perform public.t_as('tic'); perform public.indent_act(ind, 'SEND'); perform public.t_as('sup'); perform public.indent_act(ind, 'APPROVE');
  assert (select status from public.indents where id = ind) = 'SENT', 'approved = sent';

  -- Adyar sees the request, accepts it by making a GIN from its live stock; Adyar Supervisor approves; gate pass; Mandaveli receives
  perform public.t_as('adtic'); assert (select count(*) from public.indents where id = ind) = 1, 'the receiver sees the request';
  begin perform public.gin_create(mn, array[t3], 'x', ind); ok := false; exception when others then ok := true; end; assert ok, 'only tyres of the sender depot';
  g := public.gin_create(mn, array[t1, t2], 'Request IND', ind);
  assert (select status from public.indents where id = ind) = 'ACCEPTED', 'indent accepted';
  begin perform public.gate_pass_create(g, 'MTC Vehicle', 'TN 01 N 4417', 'A. Prakash'); ok := false; exception when others then ok := true; end; assert ok, 'a gate pass needs an Approved GIN';
  perform public.gin_act(g, 'SEND');
  perform public.t_as('adsup'); perform public.gin_act(g, 'APPROVE');
  perform public.t_as('adtic'); gp := public.gate_pass_create(g, 'MTC Vehicle', 'TN 01 N 4417', 'A. Prakash');
  execute 'reset role';
  assert (select count(*) from public.tyres where id in (t1, t2) and stock_place = 'IN_TRANSIT') = 2, 'sender stock reduces at In transit';
  assert (select status from public.indent_gins where id = g) = 'IN_TRANSIT' and (select gp_no from public.indent_gins where id = g) = gp, 'GIN in transit with the gate pass number';
  select id into gpid from public.gate_passes where gp_no = gp;
  perform public.t_as('adtic'); perform public.gate_pass_act(gpid, 'EXIT');
  begin perform public.gate_pass_act(gpid, 'RECEIVED'); ok := false; exception when others then ok := true; end; assert ok, 'a depot receives in its own GRN';
  perform public.t_as('tic');
  assert (select count(*) from public.tyres where id in (t1, t2)) = 2, 'the receiver reads the incoming tyres';
  begin perform public.grn_receive_gin(g, '[]'::jsonb); ok := false; exception when others then ok := true; end; assert ok, 'every tyre needs a result';
  v_no := public.grn_receive_gin(g, jsonb_build_array(jsonb_build_object('tyre_id', t1, 'accept', true), jsonb_build_object('tyre_id', t2, 'accept', false, 'reason', 'damaged')));
  execute 'reset role';
  assert (select owner_org_unit_id from public.tyres where id = t1) = mn and (select stock_place from public.tyres where id = t1) = 'LIVE_STOCK', 'accepted tyre is Mandaveli live stock';
  assert (select owner_org_unit_id from public.tyres where id = t2) = ad and (select stock_place from public.tyres where id = t2) = 'LIVE_STOCK', 'rejected tyre goes back';
  assert (select accepted_qty from public.grns where grn_no = v_no) = 1 and (select rejected_qty from public.grns where grn_no = v_no) = 1, 'GRN quantities';
  assert (select status from public.indents where id = ind) = 'RECEIVED' and (select status from public.gate_passes where id = gpid) = 'RECEIVED', 'documents closed';

  -- Mandaveli sends a tyre to TRS: approve, gate pass, cancel (returns stock), new gate pass, mark received
  perform public.t_as('tic'); g2 := public.gin_create(trs, array[t3], 'retread batch');
  perform public.gin_act(g2, 'SEND'); perform public.t_as('sup'); perform public.gin_act(g2, 'APPROVE');
  perform public.t_as('tic'); gp := public.gate_pass_create(g2, 'Contract Vehicle', 'TN 04 AQ 5520', 'K. Mani');
  select id into gpid from public.gate_passes where gp_no = gp;
  perform public.gate_pass_act(gpid, 'CANCEL', 'TRS vehicle did not come');
  execute 'reset role'; assert (select stock_place from public.tyres where id = t3) = 'LIVE_STOCK' and (select status from public.indent_gins where id = g2) = 'APPROVED', 'cancel returns the stock';
  perform public.t_as('tic'); gp := public.gate_pass_create(g2, 'Contract Vehicle', 'TN 04 AQ 5520', 'K. Mani'); select id into gpid from public.gate_passes where gp_no = gp;
  perform public.gate_pass_act(gpid, 'RECEIVED');
  execute 'reset role'; assert (select stock_place from public.tyres where id = t3) = 'AT_TRS' and (select status from public.indent_gins where id = g2) = 'RECEIVED', 'received at TRS';

  -- isolation: Adyar cannot see the Mandaveli-TRS GIN
  perform public.t_as('adtic'); assert (select count(*) from public.indent_gins where id = g2) = 0 and (select count(*) from public.gate_passes where gin_id = g2) = 0, 'other depots do not see it';
  execute 'reset role';
  raise notice 'PASS: 0050 indent, GIN and gate pass';
end $$;

rollback;
