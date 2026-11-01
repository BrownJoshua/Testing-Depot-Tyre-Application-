-- Test for migration 0011 (Vendor Master on the approval engine).
-- Safe to run: everything happens inside a transaction that is rolled back.
-- Run in the Supabase SQL Editor AFTER 0011 has been applied. Click "Run without RLS" if asked.
-- Success = "Success. No rows returned".  Failure = an error naming the broken expectation.

begin;

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 't4-ho@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c3', 'authenticated', 'authenticated', 't4-am@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c4', 'authenticated', 'authenticated', 't4-tic@test.invalid');
insert into public.employees (id, employee_code, full_name, role_code, org_unit_id) values
  ('00000000-0000-0000-0000-0000000000e1', 'T4-HO',  'T4 HO',  'HO',  null),
  ('00000000-0000-0000-0000-0000000000e3', 'T4-AM',  'T4 AM',  'AM',  null),
  ('00000000-0000-0000-0000-0000000000e4', 'T4-TIC', 'T4 TIC', 'TIC', (select id from public.org_units where code = 'AD'));
insert into public.profiles (id, employee_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000e4');

do $$
declare n int; v_id uuid; v_id2 uuid; v_vendor uuid; r record;
  ho  text := '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
  am  text := '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
  tic text := '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}';
begin
  -- seed + registry
  select count(*) into n from public.ref_values where list_code = 'vendor_category'; assert n = 5, 'five vendor categories expected';
  select count(*) into n from public.vendors where is_demo; assert n = 5, 'five demo vendors expected';
  assert (select is_enabled from public.master_entity_registry where entity_type = 'vendor'), 'vendor type not enabled';
  select count(*) into n from public.master_entity_registry where is_enabled; assert n = 1, 'only vendor should be enabled';

  -- nobody can write vendors directly
  perform set_config('request.jwt.claims', am, true); execute 'set local role authenticated';
  begin insert into public.vendors (vendor_code, vendor_name, vendor_category_ref)
        values ('HACK-001', 'x', (select id from public.ref_values limit 1)); assert false, 'direct insert allowed';
  exception when insufficient_privilege then null; end;
  begin update public.vendors set vendor_name = 'x'; assert false, 'direct update allowed';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- Tyre IC can read vendors but not contacts or requests
  perform set_config('request.jwt.claims', tic, true); execute 'set local role authenticated';
  select count(*) into n from public.vendors; assert n = 5, 'Tyre IC should read vendors';
  select count(*) into n from public.vendor_contacts; assert n = 0, 'Tyre IC should not read contacts';
  execute 'reset role';

  -- validation at submit
  perform set_config('request.jwt.claims', ho, true); execute 'set local role authenticated';
  v_id := public.master_request_create('vendor', 'CREATE', null,
     '{"vendor_code":"DEMO-V001","vendor_name":"Dup","category_code":"RETREADER"}'::jsonb, 'dup code');
  begin perform public.master_request_submit(v_id); assert false, 'duplicate code accepted'; exception when raise_exception then null; end;
  perform public.master_request_update(v_id, '{"vendor_code":"NEW-001","vendor_name":"New","category_code":"NOPE"}'::jsonb);
  begin perform public.master_request_submit(v_id); assert false, 'bad category accepted'; exception when raise_exception then null; end;
  perform public.master_request_update(v_id, '{"vendor_code":"new-001","vendor_name":"New","category_code":"RETREADER"}'::jsonb);
  begin perform public.master_request_submit(v_id); assert false, 'lowercase code accepted'; exception when raise_exception then null; end;
  perform public.master_request_update(v_id, '{"vendor_code":"NEW-001","vendor_name":"New","category_code":"RETREADER","gstin":"BAD"}'::jsonb);
  begin perform public.master_request_submit(v_id); assert false, 'bad GSTIN accepted'; exception when raise_exception then null; end;
  perform public.master_request_update(v_id, '{"vendor_code":"NEW-001","vendor_name":"New","category_code":"RETREADER","colour":"red"}'::jsonb);
  begin perform public.master_request_submit(v_id); assert false, 'unknown field accepted'; exception when raise_exception then null; end;
  perform public.master_request_update(v_id, '{"vendor_code":"NEW-001","vendor_name":"New","category_code":"RETREADER","pincode":"60001"}'::jsonb);
  begin perform public.master_request_submit(v_id); assert false, 'short pincode accepted'; exception when raise_exception then null; end;
  perform public.master_request_update(v_id,
     '{"vendor_code":"NEW-001","vendor_name":"New","category_code":"RETREADER","contacts":[{"contact_name":"A","is_primary":true},{"contact_name":"B","is_primary":true}]}'::jsonb);
  begin perform public.master_request_submit(v_id); assert false, 'two primary contacts accepted'; exception when raise_exception then null; end;

  -- good create: pending request does NOT touch live data
  perform public.master_request_update(v_id,
     '{"vendor_code":"NEW-001","vendor_name":"  New Vendor  ","category_code":"RETREADER","gstin":"33ABCDE1234F1Z5","city":"Chennai",
       "contacts":[{"contact_name":"A","is_primary":true},{"contact_name":"B"}]}'::jsonb, 'add vendor');
  perform public.master_request_submit(v_id);
  execute 'reset role';
  select count(*) into n from public.vendors where vendor_code = 'NEW-001'; assert n = 0, 'pending request changed live data';

  -- approve creates the vendor under the reserved id, with contacts
  perform set_config('request.jwt.claims', am, true); execute 'set local role authenticated';
  perform public.master_request_approve(v_id);
  execute 'reset role';
  select target_id into v_vendor from public.master_change_requests where id = v_id;
  select * into r from public.vendors where id = v_vendor;
  assert r.vendor_code = 'NEW-001' and r.vendor_name = 'New Vendor' and r.status = 'ACTIVE' and r.row_version = 1, 'vendor not created correctly';
  select count(*) into n from public.vendor_contacts where vendor_id = v_vendor; assert n = 2, 'contacts not created';
  select count(*) into n from public.audit_logs where table_name = 'vendors' and record_id = v_vendor and action = 'INSERT'; assert n = 1, 'vendor insert not audited';

  -- update: only supplied fields change; code cannot change
  perform set_config('request.jwt.claims', ho, true); execute 'set local role authenticated';
  v_id2 := public.master_request_create('vendor', 'UPDATE', v_vendor, '{"vendor_code":"OTHER-1"}'::jsonb);
  begin perform public.master_request_submit(v_id2); assert false, 'vendor code change accepted'; exception when raise_exception then null; end;
  perform public.master_request_update(v_id2, '{"city":"Madurai","contacts":[]}'::jsonb);
  perform public.master_request_submit(v_id2);
  perform public.master_request_withdraw(v_id2, 'redo');
  v_id2 := public.master_request_create('vendor', 'UPDATE', v_vendor, '{"city":"Madurai","contacts":[]}'::jsonb);
  perform public.master_request_submit(v_id2);
  execute 'reset role';
  perform set_config('request.jwt.claims', am, true); execute 'set local role authenticated';
  perform public.master_request_approve(v_id2);
  execute 'reset role';
  select * into r from public.vendors where id = v_vendor;
  assert r.city = 'Madurai' and r.vendor_name = 'New Vendor' and r.gstin = '33ABCDE1234F1Z5' and r.row_version = 2, 'update changed the wrong fields';
  select count(*) into n from public.vendor_contacts where vendor_id = v_vendor; assert n = 0, 'empty contact list should clear contacts';

  -- deactivate / reactivate
  perform set_config('request.jwt.claims', ho, true); execute 'set local role authenticated';
  v_id2 := public.master_request_create('vendor', 'DEACTIVATE', v_vendor, '{}'::jsonb); perform public.master_request_submit(v_id2);
  execute 'reset role';
  perform set_config('request.jwt.claims', am, true); execute 'set local role authenticated';
  perform public.master_request_approve(v_id2);
  execute 'reset role';
  assert (select status from public.vendors where id = v_vendor) = 'INACTIVE', 'vendor not deactivated';
  perform set_config('request.jwt.claims', ho, true); execute 'set local role authenticated';
  v_id2 := public.master_request_create('vendor', 'REACTIVATE', v_vendor, '{}'::jsonb); perform public.master_request_submit(v_id2);
  execute 'reset role';
  perform set_config('request.jwt.claims', am, true); execute 'set local role authenticated';
  perform public.master_request_approve(v_id2);
  execute 'reset role';
  assert (select status from public.vendors where id = v_vendor) = 'ACTIVE', 'vendor not reactivated';
  assert (select row_version from public.vendors where id = v_vendor) = 4, 'row_version should be 4';

  -- the apply functions are not callable by users
  assert not has_function_privilege('authenticated', 'app.apply_vendor(uuid)', 'execute'), 'apply_vendor is callable by users';
  assert not has_function_privilege('authenticated', 'app.validate_vendor(jsonb)', 'execute'), 'validate_vendor is callable by users';
end $$;

rollback;
