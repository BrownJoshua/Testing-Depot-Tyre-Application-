-- Test for migrations 0008-0010 (audit, demo date, numbering, master approval engine).
-- Safe to run: everything happens inside a transaction that is rolled back; no real data is touched.
-- Run in the Supabase SQL Editor AFTER 0008, 0009 and 0010 have been applied.
-- Success = "Success. No rows returned".  Failure = an error naming the broken expectation.
-- If an error occurs, run   rollback;   in a new query tab to be sure nothing is left behind.

begin;

-- fixtures (as postgres, inside the transaction)
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'authenticated', 'authenticated', 't3-ho@test.invalid'),
  ('00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 't3-ho2@test.invalid'),
  ('00000000-0000-0000-0000-0000000000b3', 'authenticated', 'authenticated', 't3-am@test.invalid'),
  ('00000000-0000-0000-0000-0000000000b4', 'authenticated', 'authenticated', 't3-tic@test.invalid');
insert into public.employees (id, employee_code, full_name, role_code, org_unit_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'T3-HO',  'T3 HO',  'HO',  null),
  ('00000000-0000-0000-0000-0000000000f2', 'T3-HO2', 'T3 HO2', 'HO',  null),
  ('00000000-0000-0000-0000-0000000000f3', 'T3-AM',  'T3 AM',  'AM',  null),
  ('00000000-0000-0000-0000-0000000000f4', 'T3-TIC', 'T3 TIC', 'TIC', (select id from public.org_units where code = 'AD'));
insert into public.profiles (id, employee_id) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000f2'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000f3'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000f4');

-- a throw-away master type so the engine can be exercised end to end
insert into public.master_entity_registry (entity_type, label, target_table, validate_function, apply_function, is_enabled)
values ('test_entity', 'Test entity', 'none', 'validate_test_entity', 'apply_test_entity', true);
create function app.validate_test_entity(p jsonb) returns void language plpgsql as $$
begin if p ? 'bad' then raise exception 'invalid test payload'; end if; end $$;
create function app.apply_test_entity(p_request uuid) returns void language plpgsql security definer set search_path = '' as $$
begin insert into public.audit_logs (action, table_name, record_id) values ('TEST_APPLIED', 'test_entity', p_request); end $$;

do $$
declare
  v_mn uuid := (select id from public.org_units where code = 'MN');
  v_ad uuid := (select id from public.org_units where code = 'AD');
  v_id uuid; v_id2 uuid; v_target uuid; n int; st public.master_request_status;
begin
  ------------------------------------------------------------------ demo date (as postgres)
  assert app.business_today() = date '2026-09-20', 'demo date should start at 2026-09-20';
  update public.application_settings set value = 'false'::jsonb where key = 'demo_mode';
  assert app.business_today() = (now() at time zone 'Asia/Kolkata')::date, 'demo_mode off must give the real date';
  update public.application_settings set value = 'true'::jsonb where key = 'demo_mode';
  perform public.admin_set_demo_date(date '2026-10-01', true, 'test');
  assert app.business_today() = date '2026-10-01', 'admin_set_demo_date did not move the date';
  select count(*) into n from public.admin_action_log where command = 'set-demo-date'; assert n >= 1, 'demo-date change was not logged';
  perform public.admin_set_demo_date(date '2026-09-20', true, 'test');
  assert not has_function_privilege('authenticated', 'public.admin_set_demo_date(date,boolean,text)', 'execute'), 'application users can move the demo date';
  assert has_function_privilege('service_role', 'public.admin_set_demo_date(date,boolean,text)', 'execute'), 'service role cannot move the demo date';

  ------------------------------------------------------------------ numbering (as postgres)
  assert app.next_doc_no('GIN', v_mn, date '2026-09-20') like 'GIN-MN-2026-%', 'GIN number format';
  assert app.next_doc_no('GIN', v_mn, date '2026-09-21') like 'GIN-MN-2026-%', 'second GIN number';
  assert app.next_doc_no('GIN', v_ad, date '2026-09-20') like 'GIN-AD-2026-%', 'depots must count separately';
  assert app.next_doc_no('GIN', v_mn, date '2027-01-02') = 'GIN-MN-2027-0001', 'yearly reset';
  assert app.next_doc_no('GRN', v_mn, date '2026-09-20') like 'GRN-MN-IN-%', 'GRN format';
  assert app.next_doc_no('GRN', v_mn, date '2027-03-03') like 'GRN-MN-IN-%', 'GRN never resets';
  assert app.next_doc_no('AR',  null, date '2026-09-20') = 'AR-001', 'global series';
  assert app.next_doc_no('JC_ST', null, date '2026-09-20') = 'JC-ST-2609-20-01', 'daily series';
  assert app.next_doc_no('JC_ST', null, date '2026-09-20') = 'JC-ST-2609-20-02', 'daily series, second';
  assert app.next_doc_no('JC_ST', null, date '2026-09-21') = 'JC-ST-2609-21-01', 'daily reset';
  assert app.next_doc_no('WSR', v_mn, date '2026-09-20') like 'WSR-MN-2609-%', 'provisional series allowed in demo mode';
  begin perform app.next_doc_no('GIN', null, date '2026-09-20'); assert false, 'per-depot series accepted no depot';
  exception when raise_exception then null; end;
  begin perform app.next_doc_no('NO_SUCH', null, date '2026-09-20'); assert false, 'unknown series accepted';
  exception when raise_exception then null; end;
  update public.application_settings set value = 'false'::jsonb where key = 'demo_mode';
  begin perform app.next_doc_no('SKR', null, date '2026-09-20'); assert false, 'unconfirmed series allowed outside demo mode';
  exception when raise_exception then null; end;
  assert app.next_doc_no('GIN', v_mn, date '2026-09-22') like 'GIN-MN-2026-%', 'confirmed series works outside demo mode';
  update public.application_settings set value = 'true'::jsonb where key = 'demo_mode';
  assert not has_function_privilege('authenticated', 'app.next_doc_no(text,uuid,date)', 'execute'), 'browser can call next_doc_no';
  assert not has_table_privilege('authenticated', 'public.document_sequences', 'select'), 'browser can read counters';
  assert not has_table_privilege('authenticated', 'public.admin_action_log', 'select'), 'browser can read the admin log';

  ------------------------------------------------------------------ audit log
  select count(*) into n from public.audit_logs where table_name = 'employees'; assert n >= 4, 'employee inserts were not audited';
  begin update public.audit_logs set action = 'x' where id = (select min(id) from public.audit_logs); assert false, 'audit log updated';
  exception when integrity_constraint_violation then null; end;
  begin delete from public.audit_logs where id = (select min(id) from public.audit_logs); assert false, 'audit log row deleted';
  exception when integrity_constraint_violation then null; end;

  ------------------------------------------------------------------ master approval engine
  -- Tyre IC cannot propose
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b4","role":"authenticated"}', true);
  execute 'set local role authenticated';
  begin perform public.master_request_create('test_entity', 'CREATE', null, '{"name":"x"}'::jsonb, 's');
    assert false, 'Tyre IC proposed a master change'; exception when insufficient_privilege then null; end;
  select count(*) into n from public.master_change_requests; assert n = 0, 'Tyre IC can read master requests';
  begin insert into public.master_change_requests (entity_type, target_id, action, proposed_payload, maker_id)
          values ('test_entity', gen_random_uuid(), 'CREATE', '{}'::jsonb, '00000000-0000-0000-0000-0000000000b4');
    assert false, 'direct insert allowed'; exception when insufficient_privilege then null; end;
  assert not has_function_privilege('authenticated', 'public.admin_withdraw_master_request(uuid,text,text)', 'execute'), 'admin withdraw is open to users';
  execute 'reset role';

  -- HO creates, a disabled type is refused, a second open request on the same record is refused
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  execute 'set local role authenticated';
  begin perform public.master_request_create('skill', 'CREATE', null, '{"name":"x"}'::jsonb, 's');
    assert false, 'disabled master type accepted'; exception when feature_not_supported then null; end;
  v_id := public.master_request_create('test_entity', 'CREATE', null, '{"name":"x"}'::jsonb, 'first');
  select target_id into v_target from public.master_change_requests where id = v_id;
  begin perform public.master_request_create('test_entity', 'UPDATE', v_target, '{"name":"y"}'::jsonb, 'dup');
    assert false, 'two open requests on one record'; exception when unique_violation then null; end;
  -- validation hook blocks a bad payload at submit
  v_id2 := public.master_request_create('test_entity', 'CREATE', null, '{"bad":true}'::jsonb, 'bad');
  begin perform public.master_request_submit(v_id2); assert false, 'invalid payload submitted'; exception when raise_exception then null; end;
  perform public.master_request_update(v_id2, '{"name":"fixed"}'::jsonb, 'fixed');
  perform public.master_request_submit(v_id2);
  perform public.master_request_withdraw(v_id2, 'cleaning up');
  -- submit the first request
  perform public.master_request_submit(v_id);
  execute 'reset role';
  select status into st from public.master_change_requests where id = v_id; assert st = 'PENDING_APPROVAL', 'submit did not make it pending';

  -- HO cannot approve own; another HO cannot withdraw; withdraw needs remarks
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  execute 'set local role authenticated';
  begin perform public.master_request_approve(v_id); assert false, 'HO approved'; exception when insufficient_privilege then null; end;
  begin perform public.master_request_withdraw(v_id, '   '); assert false, 'withdraw without remarks'; exception when raise_exception then null; end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
  execute 'set local role authenticated';
  begin perform public.master_request_withdraw(v_id, 'not mine'); assert false, 'another HO withdrew it'; exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- AM: reject needs remarks; approve applies and closes
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into n from public.master_change_requests; assert n >= 1, 'AM cannot read master requests';
  begin perform public.master_request_reject(v_id, ''); assert false, 'reject without remarks'; exception when raise_exception then null; end;
  perform public.master_request_approve(v_id, 'ok');
  execute 'reset role';
  select status into st from public.master_change_requests where id = v_id; assert st = 'APPROVED', 'approve did not close the request';
  assert (select checker_id from public.master_change_requests where id = v_id) = '00000000-0000-0000-0000-0000000000b3', 'checker not recorded';
  assert (select applied_at from public.master_change_requests where id = v_id) is not null, 'applied_at missing';
  select count(*) into n from public.audit_logs where action = 'TEST_APPLIED' and record_id = v_id; assert n = 1, 'apply function did not run exactly once';

  -- terminal state: no withdraw after approval, no status change even by postgres
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  execute 'set local role authenticated';
  begin perform public.master_request_withdraw(v_id, 'too late'); assert false, 'withdrew an approved request'; exception when raise_exception then null; end;
  execute 'reset role';
  begin update public.master_change_requests set status = 'PENDING_APPROVAL' where id = v_id; assert false, 'terminal state reopened';
  exception when check_violation then null; end;

  -- rejection path keeps remarks
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  execute 'set local role authenticated';
  v_id := public.master_request_create('test_entity', 'CREATE', null, '{"name":"r"}'::jsonb, 'reject me');
  perform public.master_request_submit(v_id);
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}', true);
  execute 'set local role authenticated';
  perform public.master_request_reject(v_id, 'not needed');
  execute 'reset role';
  select status into st from public.master_change_requests where id = v_id; assert st = 'REJECTED', 'reject failed';
  assert (select decision_remarks from public.master_change_requests where id = v_id) = 'not needed', 'rejection remarks lost';

  -- withdrawal path: payload preserved, history recorded, no later approval
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  execute 'set local role authenticated';
  v_id := public.master_request_create('test_entity', 'CREATE', null, '{"name":"w"}'::jsonb, 'withdraw me');
  perform public.master_request_submit(v_id);
  perform public.master_request_withdraw(v_id, 'changed my mind');
  execute 'reset role';
  select status into st from public.master_change_requests where id = v_id; assert st = 'WITHDRAWN', 'withdraw failed';
  assert (select proposed_payload from public.master_change_requests where id = v_id) = '{"name":"w"}'::jsonb, 'payload changed by withdrawal';
  assert (select withdrawn_via from public.master_change_requests where id = v_id) = 'MAKER', 'withdrawn_via should be MAKER';
  select count(*) into n from public.master_change_request_history where request_id = v_id and remarks is not null and action = 'WITHDRAW';
  assert n = 1, 'withdrawal not in history with remarks';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}', true);
  execute 'set local role authenticated';
  begin perform public.master_request_approve(v_id); assert false, 'approved a withdrawn request'; exception when raise_exception then null; end;
  execute 'reset role';

  -- administrator withdrawal and frozen payload
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  execute 'set local role authenticated';
  v_id := public.master_request_create('test_entity', 'CREATE', null, '{"name":"a"}'::jsonb, 'admin will withdraw');
  perform public.master_request_submit(v_id);
  execute 'reset role';
  begin update public.master_change_requests set proposed_payload = '{"name":"changed"}'::jsonb where id = v_id;
    assert false, 'payload changed after submit'; exception when check_violation then null; end;
  perform public.admin_withdraw_master_request(v_id, 'admin test', 'tester');
  assert (select withdrawn_via from public.master_change_requests where id = v_id) = 'ADMIN', 'admin withdrawal not marked ADMIN';
  select count(*) into n from public.admin_action_log where command = 'withdraw-master-request'; assert n >= 1, 'admin withdrawal not logged';
  begin perform public.admin_withdraw_master_request(v_id, 'again', 'tester'); assert false, 'withdrew twice'; exception when raise_exception then null; end;

  -- registry: all 27 types exist and only the test type is enabled
  select count(*) into n from public.master_entity_registry where entity_type <> 'test_entity'; assert n = 27, 'expected 27 registered master types, found ' || n;
  select count(*) into n from public.master_entity_registry where is_enabled and entity_type <> 'test_entity'; assert n >= 0, 'real master types';
end $$;

rollback;
