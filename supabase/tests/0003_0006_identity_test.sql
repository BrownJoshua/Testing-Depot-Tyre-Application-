-- Test for migrations 0003-0006 (identity foundation).
-- Safe to run: everything happens inside a transaction that is rolled back; no real data is touched.
-- Run in the Supabase SQL Editor AFTER 0003, 0004, 0005 and 0006 have been applied.
-- Success = "Success. No rows returned".  Failure = an error naming the broken expectation.
-- If an error occurs, run   rollback;   in a new query tab to be sure nothing is left behind.

begin;

-- fixtures (created as the postgres role, inside the transaction)
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'test-ho@test.invalid'),
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'test-tic@test.invalid'),
  ('00000000-0000-0000-0000-0000000000a3', 'authenticated', 'authenticated', 'test-tm1@test.invalid'),
  ('00000000-0000-0000-0000-0000000000a4', 'authenticated', 'authenticated', 'test-tm2@test.invalid');

insert into public.employees (id, employee_code, full_name, role_code, org_unit_id) values
  ('00000000-0000-0000-0000-0000000000e1', 'TEST-HO',  'Test HO',  'HO',  null),
  ('00000000-0000-0000-0000-0000000000e2', 'TEST-TIC', 'Test TIC', 'TIC', (select id from public.org_units where code = 'AD')),
  ('00000000-0000-0000-0000-0000000000e3', 'TEST-TM1', 'Test TM1', 'TM',  (select id from public.org_units where code = 'MN')),
  ('00000000-0000-0000-0000-0000000000e4', 'TEST-TM2', 'Test TM2', 'TM',  (select id from public.org_units where code = 'AD'));

insert into public.profiles (id, employee_id) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e2'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e4');

do $$
declare n int;
begin
  ----------------------------------------------------------------- seed data (as postgres)
  select count(*) into n from public.org_units where unit_type = 'DEPOT';          assert n = 33, 'expected 33 depots, found ' || n;
  select count(*) into n from public.org_units where unit_type <> 'DEPOT';          assert n = 4,  'expected 4 non-depot units, found ' || n;
  select count(*) into n from public.depots;                                        assert n = 33, 'depots subtype rows should be 33';
  select count(*) into n from public.roles;                                         assert n = 5,  'expected 5 roles';

  ----------------------------------------------------------------- constraints (as postgres)
  begin  -- TIC without depot
    insert into public.employees (employee_code, full_name, role_code, org_unit_id) values ('BAD-1', 'x', 'TIC', null);
    assert false, 'TIC without a depot was accepted';
  exception when check_violation then null; end;
  begin  -- HO with a depot
    insert into public.employees (employee_code, full_name, role_code, org_unit_id)
      values ('BAD-2', 'x', 'HO', (select id from public.org_units where code = 'MN'));
    assert false, 'HO with a depot was accepted';
  exception when check_violation then null; end;
  begin  -- TM assigned to Central Store (not a depot)
    insert into public.employees (employee_code, full_name, role_code, org_unit_id)
      values ('BAD-3', 'x', 'TM', (select id from public.org_units where code = 'CS'));
    assert false, 'employee assigned to Central Store was accepted';
  exception when foreign_key_violation then null; end;
  begin  -- duplicate employee code (the format rule already forces upper case, so an exact repeat is the case to test)
    insert into public.employees (employee_code, full_name, role_code, org_unit_id)
      values ('TEST-TIC', 'x', 'TM', (select id from public.org_units where code = 'MN'));
    assert false, 'duplicate employee code was accepted';
  exception when unique_violation then null; end;
  begin  -- lower-case codes are refused by the format rule
    insert into public.employees (employee_code, full_name, role_code, org_unit_id)
      values ('test-tm9', 'x', 'TM', (select id from public.org_units where code = 'MN'));
    assert false, 'lower-case employee code was accepted';
  exception when check_violation then null; end;
  begin  -- a second active Tyre IC in the same depot
    insert into public.employees (employee_code, full_name, role_code, org_unit_id)
      values ('TEST-TIC2', 'x', 'TIC', (select id from public.org_units where code = 'AD'));
    assert false, 'second active Tyre IC in one depot was accepted';
  exception when unique_violation then null; end;
  begin  -- employee code is immutable
    update public.employees set employee_code = 'TEST-HO-NEW' where employee_code = 'TEST-HO';
    assert false, 'employee_code was changed';
  exception when check_violation then null; end;

  ----------------------------------------------------------------- anon has nothing
  execute 'set local role anon';
  begin
    perform 1 from public.org_units limit 1;
    assert false, 'anon could read org_units';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  ----------------------------------------------------------------- HO
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  execute 'set local role authenticated';
  assert app.my_role() = 'HO', 'HO role not resolved';
  select count(*) into n from public.org_units;   assert n = 37, 'HO should read 37 org units, saw ' || n;
  select count(*) into n from public.employees;   assert n >= 4,  'HO should read all 4 test employees, saw ' || n;
  select count(*) into n from public.role_capabilities; assert n > 0, 'HO should read role capabilities';
  assert app.has_capability('master.propose'), 'HO lacks master.propose';
  assert not app.has_capability('master.approve'), 'HO must not have master.approve';
  assert not app.has_capability('central_receipt.post'), 'unresolved capability must be off';
  execute 'reset role';

  ----------------------------------------------------------------- Tyre IC (Mandaveli)
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
  execute 'set local role authenticated';
  assert app.my_role() = 'TIC', 'TIC role not resolved';
  select count(*) into n from public.employees;   assert n >= 2, 'TIC should see own depot staff, saw ' || n;
  select count(*) into n from public.v_staff_directory; assert n >= 2, 'directory should list 2 staff, saw ' || n;
  select count(*) into n from public.role_capabilities; assert n = 0, 'TIC must not read role_capabilities';
  assert app.has_capability('job.final_inspect'), 'TIC should verify work';
  assert not app.has_capability('gin.approve'), 'TIC must not approve GIN';
  assert app.has_capability('job_card.create'), 'TIC should create job cards';
  execute 'reset role';

  ----------------------------------------------------------------- Tyre Man (Mandaveli)
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
  execute 'set local role authenticated';
  assert app.my_role() = 'TM', 'TM role not resolved';
  select count(*) into n from public.employees;   assert n = 1, 'TM should see only own employee row, saw ' || n;
  select count(*) into n from public.v_staff_directory; assert n >= 2, 'TM directory should list depot colleagues (2), saw ' || n;
  select count(*) into n from public.profiles;    assert n = 1, 'TM should see only own profile, saw ' || n;
  select count(*) into n from public.my_session(); assert n = 1, 'my_session should return one row';
  -- a user cannot change their own role, depot, or activation
  begin update public.employees set role_code = 'HO' where id = '00000000-0000-0000-0000-0000000000e3';
    assert false, 'TM updated own employee row'; exception when insufficient_privilege then null; end;
  begin update public.profiles set is_active = false where id = '00000000-0000-0000-0000-0000000000a3';
    assert false, 'TM updated profiles.is_active'; exception when insufficient_privilege then null; end;
  begin update public.profiles set employee_id = '00000000-0000-0000-0000-0000000000e1' where id = '00000000-0000-0000-0000-0000000000a3';
    assert false, 'TM re-pointed own profile at another employee'; exception when insufficient_privilege then null; end;
  begin insert into public.employees (employee_code, full_name, role_code) values ('HACK-1', 'x', 'HO');
    assert false, 'TM inserted an employee'; exception when insufficient_privilege then null; end;
  begin delete from public.org_units where code = 'MN';
    assert false, 'TM deleted a depot'; exception when insufficient_privilege then null; end;
  -- the one permitted write
  update public.profiles set preferred_language = 'ta' where id = '00000000-0000-0000-0000-0000000000a3';
  get diagnostics n = row_count; assert n = 1, 'TM could not update own language';
  update public.profiles set preferred_language = 'ta' where id = '00000000-0000-0000-0000-0000000000a4';
  get diagnostics n = row_count; assert n = 0, 'TM updated someone else''s language';
  execute 'reset role';

  ----------------------------------------------------------------- deactivation locks the user out (S-02)
  update public.profiles set is_active = false where id = '00000000-0000-0000-0000-0000000000a4';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into n from public.org_units;   assert n = 0, 'deactivated user still reads org_units (' || n || ')';
  select count(*) into n from public.profiles;    assert n = 0, 'deactivated user still reads own profile';
  select count(*) into n from public.my_session(); assert n = 0, 'my_session returned a row for a deactivated user';
  assert not app.is_active_user(), 'deactivated user reported active';
  execute 'reset role';

  ----------------------------------------------------------------- no stray privileges on identity tables
  assert not has_table_privilege('anon', 'public.employees', 'select'), 'anon can read employees';
  assert not has_table_privilege('authenticated', 'public.employees', 'update'), 'authenticated can update employees';
  assert not has_table_privilege('authenticated', 'public.org_units', 'insert'), 'authenticated can insert org_units';
  assert not has_function_privilege('anon', 'public.my_session()', 'execute'), 'anon can execute my_session';
  assert not has_function_privilege('anon', 'app.my_role()', 'execute'), 'anon can execute app.my_role';
end $$;

rollback;
