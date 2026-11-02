-- Test for migration 0012 (tyre sizes, makes, models and folios on the approval engine).
-- Safe to run: everything happens inside a transaction that is rolled back.
-- Run in the Supabase SQL Editor AFTER 0012 has been applied. Click "Run without RLS" if asked.
-- Success = "Success. No rows returned".  Failure = an error naming the broken expectation.

begin;

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 't5-ho@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c3', 'authenticated', 'authenticated', 't5-am@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c4', 'authenticated', 'authenticated', 't5-tic@test.invalid');
insert into public.employees (id, employee_code, full_name, role_code, org_unit_id) values
  ('00000000-0000-0000-0000-0000000000e1', 'T5-HO',  'T5 HO',  'HO',  null),
  ('00000000-0000-0000-0000-0000000000e3', 'T5-AM',  'T5 AM',  'AM',  null),
  ('00000000-0000-0000-0000-0000000000e4', 'T5-TIC', 'T5 TIC', 'TIC', (select id from public.org_units where code = 'AD'));
insert into public.profiles (id, employee_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000e4');

-- helpers (rolled back with everything else). Each starts from the postgres role.
create function public.t_as(who text) returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims',
    case who when 'ho'  then '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}'
             when 'am'  then '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}'
             else            '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}' end, true);
  execute 'set local role authenticated';
end $$;

create function public.t_propose(p_entity text, p_action text, p_target uuid, p_payload text) returns uuid language plpgsql as $$
declare v uuid;
begin
  execute 'reset role';
  perform public.t_as('ho');
  v := public.master_request_create(p_entity, p_action::public.master_action, p_target, p_payload::jsonb, 'test');
  perform public.master_request_submit(v);
  execute 'reset role';
  return v;
end $$;

create function public.t_approve(p_request uuid) returns void language plpgsql as $$
begin
  perform public.t_as('am');
  perform public.master_request_approve(p_request);
  execute 'reset role';
end $$;

-- propose + approve; returns the id of the record the request created or changed
create function public.t_do(p_entity text, p_action text, p_target uuid, p_payload text) returns uuid language plpgsql as $$
declare v uuid; t uuid;
begin
  v := public.t_propose(p_entity, p_action, p_target, p_payload);
  perform public.t_approve(v);
  select target_id into t from public.master_change_requests where id = v;
  return t;
end $$;

do $$
declare n int; v uuid; s uuid; mk uuid; md uuid; fo uuid; f record;
begin
  -- seeds and registry
  select count(*) into n from public.ref_values where list_code in ('construction_type','tube_type','product_group','folio_category','uom');
  assert n = 8, 'folio ref values';
  select count(*) into n from public.tyre_sizes;  assert n = 7, 'seven sizes expected';
  select count(*) into n from public.tyre_makes;  assert n = 8, 'eight makes expected';
  select count(*) into n from public.tyre_models; assert n = 0, 'no models should be seeded';
  select count(*) into n from public.tyre_folios; assert n = 0, 'no folios should be seeded';
  select count(*) into n from public.master_entity_registry where is_enabled; assert n = 5, 'five enabled types expected (vendor + 4 tyre)';

  -- nobody writes directly; the apply functions are not callable by users
  perform public.t_as('am');
  begin insert into public.tyre_makes (name) values ('Hack'); assert false, 'direct insert allowed';
  exception when insufficient_privilege then null; end;
  begin update public.tyre_sizes set size_code = 'x'; assert false, 'direct update allowed';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  assert not has_function_privilege('authenticated', 'app.apply_tyre_folio(uuid)', 'execute'), 'apply_tyre_folio callable';
  assert not has_function_privilege('authenticated', 'app.validate_tyre_size(jsonb)', 'execute'), 'validate_tyre_size callable';
  assert not has_function_privilege('authenticated', 'app.check_keys(jsonb, text[])', 'execute'), 'check_keys callable';

  -- every active user reads
  perform public.t_as('tic');
  select count(*) into n from public.tyre_sizes; assert n = 7, 'Tyre IC should read sizes';
  select count(*) into n from public.tyre_makes; assert n = 8, 'Tyre IC should read makes';
  execute 'reset role';

  -- ---------------- tyre sizes ----------------
  begin perform public.t_propose('tyre_size', 'CREATE', null, '{"size_code":"7.50 X 16"}'); assert false, 'duplicate size'; exception when raise_exception then null; end;
  begin perform public.t_propose('tyre_size', 'CREATE', null, '{"size_code":"AB"}'); assert false, 'short size'; exception when raise_exception then null; end;
  begin perform public.t_propose('tyre_size', 'CREATE', null, '{"size_code":"11.00 X 20","rim_inches":5}'); assert false, 'bad rim'; exception when raise_exception then null; end;
  begin perform public.t_propose('tyre_size', 'CREATE', null, '{"size_code":"11.00 X 20","colour":"red"}'); assert false, 'unknown field'; exception when raise_exception then null; end;

  -- pending request does not touch live data
  v := public.t_propose('tyre_size', 'CREATE', null, '{"size_code":"11.00 X 20","rim_inches":20}');
  select count(*) into n from public.tyre_sizes where size_code = '11.00 X 20'; assert n = 0, 'pending request changed live data';
  perform public.t_approve(v);
  select target_id into s from public.master_change_requests where id = v;
  select * into f from public.tyre_sizes where id = s;
  assert f.size_code = '11.00 X 20' and f.rim_inches = 20 and f.display_label = '11.00 X 20' and f.status = 'ACTIVE' and f.row_version = 1, 'size not created correctly';
  select count(*) into n from public.audit_logs where table_name = 'tyre_sizes' and record_id = s and action = 'INSERT'; assert n = 1, 'size insert not audited';

  perform public.t_do('tyre_size', 'UPDATE', s, '{"rim_inches":22}');
  select * into f from public.tyre_sizes where id = s;
  assert f.rim_inches = 22 and f.size_code = '11.00 X 20' and f.row_version = 2, 'size update changed the wrong fields';

  -- a size code can never change: the approval is refused
  v := public.t_propose('tyre_size', 'UPDATE', s, '{"size_code":"12.00 X 20"}');
  begin perform public.t_approve(v); assert false, 'size code change approved'; exception when raise_exception then null; end;
  execute 'reset role';
  assert (select size_code from public.tyre_sizes where id = s) = '11.00 X 20', 'size code changed';
  perform public.t_as('ho'); perform public.master_request_withdraw(v, 'not allowed'); execute 'reset role';

  -- ---------------- tyre makes ----------------
  begin perform public.t_propose('tyre_make', 'CREATE', null, '{"name":"apollo"}'); assert false, 'duplicate make (case)'; exception when raise_exception then null; end;
  begin perform public.t_propose('tyre_make', 'CREATE', null, '{"name":"X"}'); assert false, 'short make'; exception when raise_exception then null; end;
  mk := public.t_do('tyre_make', 'CREATE', null, '{"name":"  Test Make  "}');
  assert (select name from public.tyre_makes where id = mk) = 'Test Make', 'make not created / trimmed';
  perform public.t_do('tyre_make', 'UPDATE', mk, '{"name":"Test Make Two"}');
  assert (select name from public.tyre_makes where id = mk) = 'Test Make Two', 'make not renamed';

  -- ---------------- tyre models ----------------
  -- a create with no make passes submit (the payload alone cannot say it is a create) but approval refuses it
  begin perform public.t_do('tyre_model', 'CREATE', null, '{"model_name":"Road 1"}'); assert false, 'model without make'; exception when raise_exception then null; end;
  execute 'reset role';
  select count(*) into n from public.tyre_models; assert n = 0, 'model created without a make';
  begin perform public.t_propose('tyre_model', 'CREATE', null, '{"make_name":"Nope","model_name":"Road 1"}'); assert false, 'unknown make'; exception when raise_exception then null; end;
  begin perform public.t_propose('tyre_model', 'CREATE', null, '{"make_name":"MRF","model_name":" "}'); assert false, 'blank model'; exception when raise_exception then null; end;
  md := public.t_do('tyre_model', 'CREATE', null, '{"make_name":"MRF","model_name":"Road 1"}');
  assert (select model_name from public.tyre_models where id = md) = 'Road 1', 'model not created';
  assert (select m.name from public.tyre_models t join public.tyre_makes m on m.id = t.make_id where t.id = md) = 'MRF', 'model on wrong make';
  begin perform public.t_propose('tyre_model', 'CREATE', null, '{"make_name":"mrf","model_name":"road 1"}'); assert false, 'duplicate model (case)'; exception when raise_exception then null; end;
  perform public.t_do('tyre_model', 'CREATE', null, '{"make_name":"JK","model_name":"Road 1"}');   -- same name, other make: allowed
  select count(*) into n from public.tyre_models where lower(model_name) = 'road 1'; assert n = 2, 'same model name on two makes should be allowed';
  perform public.t_do('tyre_model', 'UPDATE', md, '{"model_name":"Road 2"}');
  assert (select model_name from public.tyre_models where id = md) = 'Road 2', 'model not renamed';
  -- the make of a model cannot change
  begin perform public.t_do('tyre_model', 'UPDATE', md, '{"make_name":"Apollo","model_name":"Road 1"}'); assert false, 'model make changed'; exception when raise_exception then null; end;
  execute 'reset role';
  assert (select m.name from public.tyre_models t join public.tyre_makes m on m.id = t.make_id where t.id = md) = 'MRF', 'model make changed';
  perform public.t_do('tyre_model', 'UPDATE', md, '{"model_name":"Road 1"}');

  -- ---------------- tyre folios: validation ----------------
  begin perform public.t_propose('tyre_folio', 'CREATE', null, '{"folio_no":"f1","folio_name":"x","product_group_code":"TYRE","uom_code":"NOS"}'); assert false, 'lowercase folio no'; exception when raise_exception then null; end;
  begin perform public.t_propose('tyre_folio', 'CREATE', null, '{"folio_no":"F9001","product_group_code":"TYRE","uom_code":"NOS"}'); assert false, 'missing name'; exception when raise_exception then null; end;
  begin perform public.t_propose('tyre_folio', 'CREATE', null, '{"folio_no":"F9001","folio_name":"x","product_group_code":"NOPE","uom_code":"NOS"}'); assert false, 'bad group'; exception when raise_exception then null; end;
  begin perform public.t_propose('tyre_folio', 'CREATE', null, '{"folio_no":"F9001","folio_name":"x","product_group_code":"TYRE","uom_code":"NOS","make_name":"JK","model_name":"Road 2"}'); assert false, 'model of another make'; exception when raise_exception then null; end;
  begin perform public.t_propose('tyre_folio', 'CREATE', null, '{"folio_no":"F9001","folio_name":"x","product_group_code":"TYRE","uom_code":"NOS","size_code":"0 X 0"}'); assert false, 'unknown size'; exception when raise_exception then null; end;
  begin perform public.t_propose('tyre_folio', 'CREATE', null, '{"folio_no":"F9001","folio_name":"x","product_group_code":"TYRE","uom_code":"NOS","locations":["MOON"]}'); assert false, 'bad location'; exception when raise_exception then null; end;
  begin perform public.t_propose('tyre_folio', 'CREATE', null, '{"folio_no":"F9001","folio_name":"x","product_group_code":"TYRE","uom_code":"NOS","ply":99}'); assert false, 'bad ply'; exception when raise_exception then null; end;
  begin perform public.t_propose('tyre_folio', 'CREATE', null, '{"folio_no":"F9001","folio_name":"x","product_group_code":"TYRE","uom_code":"NOS","colour":"red"}'); assert false, 'unknown field'; exception when raise_exception then null; end;

  -- ---------------- tyre folios: create ----------------
  fo := public.t_do('tyre_folio', 'CREATE', null,
    '{"folio_no":"F9001","folio_name":"  Test Tyre 7.50 X 16  ","make_name":"MRF","model_name":"Road 1","construction_code":"RADIAL","tube_code":"TUBELESS",
      "ply":16,"size_code":"7.50 X 16","product_group_code":"TYRE","category_code":"SPARES","uom_code":"NOS","hsn_code":"4011","has_expiry":false,
      "locations":["DEPOT","TRS","DEPOT"]}');
  select * into f from public.tyre_folios where id = fo;
  assert f.folio_no = 'F9001' and f.folio_name = 'Test Tyre 7.50 X 16' and f.ply = 16 and f.status = 'ACTIVE' and f.row_version = 1, 'folio not created correctly';
  assert f.make_id is not null and f.model_id is not null and f.tyre_size_id is not null, 'folio links missing';
  assert (select code from public.ref_values where id = f.construction_type_ref) = 'RADIAL', 'construction wrong';
  assert (select code from public.ref_values where id = f.tube_type_ref) = 'TUBELESS', 'tube type wrong';
  select count(*) into n from public.tyre_folio_locations where folio_id = fo; assert n = 2, 'locations should be de-duplicated to 2';
  select count(*) into n from public.audit_logs where table_name = 'tyre_folios' and record_id = fo and action = 'INSERT'; assert n = 1, 'folio insert not audited';
  begin perform public.t_propose('tyre_folio', 'CREATE', null, '{"folio_no":"F9001","folio_name":"y","product_group_code":"TYRE","uom_code":"NOS"}'); assert false, 'duplicate folio no'; exception when raise_exception then null; end;

  -- ---------------- tyre folios: update ----------------
  perform public.t_do('tyre_folio', 'UPDATE', fo, '{"folio_name":"Renamed","ply":18}');
  select * into f from public.tyre_folios where id = fo;
  assert f.folio_name = 'Renamed' and f.ply = 18 and f.row_version = 2 and f.model_id is not null and f.make_id is not null, 'folio update changed the wrong fields';
  select count(*) into n from public.tyre_folio_locations where folio_id = fo; assert n = 2, 'untouched locations changed';

  perform public.t_do('tyre_folio', 'UPDATE', fo, '{"locations":["CENTRAL_STORE"]}');
  select count(*) into n from public.tyre_folio_locations where folio_id = fo; assert n = 1, 'locations not replaced';
  perform public.t_do('tyre_folio', 'UPDATE', fo, '{"locations":[]}');
  select count(*) into n from public.tyre_folio_locations where folio_id = fo; assert n = 0, 'empty list should clear locations';

  -- the folio number cannot change: the approval is refused
  begin perform public.t_do('tyre_folio', 'UPDATE', fo, '{"folio_no":"F9002"}'); assert false, 'folio number changed'; exception when raise_exception then null; end;
  execute 'reset role';
  assert (select folio_no from public.tyre_folios where id = fo) = 'F9001', 'folio number changed';

  -- a model alone must belong to the folio's current make (MRF has Road 1; JK also has Road 1)
  begin
    perform public.t_do('tyre_folio', 'UPDATE', fo, '{"model_name":"Does not exist"}');
    assert false, 'unknown model accepted';
  exception when raise_exception then null; end;
  execute 'reset role';

  -- changing the make without restating a model clears the model
  perform public.t_do('tyre_folio', 'UPDATE', fo, '{"make_name":"Apollo"}');
  select * into f from public.tyre_folios where id = fo;
  assert f.make_id = (select id from public.tyre_makes where name = 'Apollo') and f.model_id is null, 'make change should clear the model';
  -- changing the make and restating a model of the NEW make works; of the old make is refused
  begin
    perform public.t_do('tyre_folio', 'UPDATE', fo, '{"make_name":"Apollo","model_name":"Road 1"}');
    assert false, 'model of another make accepted';
  exception when raise_exception then null; end;
  execute 'reset role';
  perform public.t_do('tyre_folio', 'UPDATE', fo, '{"make_name":"MRF","model_name":"Road 1"}');
  assert (select model_id from public.tyre_folios where id = fo) = md, 'model not restored';

  -- an inactive size cannot be chosen
  perform public.t_do('tyre_folio', 'CREATE', null, '{"folio_no":"F9003","folio_name":"y","product_group_code":"TYRE","uom_code":"NOS","size_code":"11.00 X 20"}');
  perform public.t_do('tyre_size', 'DEACTIVATE', s, '{}');
  assert (select status from public.tyre_sizes where id = s) = 'INACTIVE', 'size not deactivated';
  begin perform public.t_propose('tyre_folio', 'CREATE', null, '{"folio_no":"F9004","folio_name":"y","product_group_code":"TYRE","uom_code":"NOS","size_code":"11.00 X 20"}'); assert false, 'inactive size accepted'; exception when raise_exception then null; end;
  perform public.t_do('tyre_size', 'REACTIVATE', s, '{}');
  assert (select status from public.tyre_sizes where id = s) = 'ACTIVE', 'size not reactivated';

  -- deactivate / reactivate a folio; an inactive make cannot take new models
  perform public.t_do('tyre_folio', 'DEACTIVATE', fo, '{}');
  assert (select status from public.tyre_folios where id = fo) = 'INACTIVE', 'folio not deactivated';
  perform public.t_do('tyre_folio', 'REACTIVATE', fo, '{}');
  assert (select status from public.tyre_folios where id = fo) = 'ACTIVE', 'folio not reactivated';
  perform public.t_do('tyre_make', 'DEACTIVATE', mk, '{}');
  begin perform public.t_propose('tyre_model', 'CREATE', null, '{"make_name":"Test Make Two","model_name":"M1"}'); assert false, 'model on inactive make'; exception when raise_exception then null; end;
  execute 'reset role';

  -- every approved change left an audit trail and a request history
  select count(*) into n from public.master_change_requests where entity_type like 'tyre\_%' and status = 'APPROVED'; assert n > 15, 'approved requests missing';
  select count(*) into n from public.audit_logs where table_name = 'tyre_folios' and record_id = fo and action = 'UPDATE'; assert n >= 5, 'folio updates not audited';
end $$;

rollback;
