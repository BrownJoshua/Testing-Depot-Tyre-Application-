-- Test for migration 0013 (Fleet Type, Fleet Register and Maintenance Jobs on the approval engine).
-- Safe to run: everything happens inside a transaction that is rolled back.
-- Success = no error.  Failure = an error naming the broken expectation.

begin;

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 't6-ho@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c3', 'authenticated', 'authenticated', 't6-am@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c4', 'authenticated', 'authenticated', 't6-tic@test.invalid');
insert into public.employees (id, employee_code, full_name, role_code, org_unit_id) values
  ('00000000-0000-0000-0000-0000000000e1', 'T6-HO',  'T6 HO',  'HO',  null),
  ('00000000-0000-0000-0000-0000000000e3', 'T6-AM',  'T6 AM',  'AM',  null),
  ('00000000-0000-0000-0000-0000000000e4', 'T6-TIC', 'T6 TIC', 'TIC', (select id from public.org_units where code = 'AD'));
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

grant execute on function public.t_as(text) to authenticated;

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
declare n int; ft uuid; fl uuid; jb uuid; f record; ad uuid; mn uuid;
begin
  select id into ad from public.org_units where code = 'AD';
  select id into mn from public.org_units where code = 'MN';

  -- seeds and registry
  select count(*) into n from public.maintenance_jobs; assert n = 10, 'ten jobs expected';
  select count(*) into n from public.maintenance_jobs where job_code in ('JOB-007', 'JOB-012'); assert n = 0, 'JOB-007 / JOB-012 must not be seeded';
  select count(*) into n from public.fleet_types where is_demo; assert n = 2, 'two demo fleet types';
  select count(*) into n from public.fleets where is_demo; assert n = 34, '34 demo fleets';
  select count(*) into n from public.fleets where org_unit_id = mn; assert n = 20, '20 Mandaveli fleets';
  select count(*) into n from public.fleet_depot_history; assert n = 34, 'depot history for seeded fleets';
  select count(*) into n from public.master_entity_registry where is_enabled; assert n = 8, 'eight enabled types (vendor, 4 tyre, 3 new)';
  select count(*) into n from public.ref_values where list_code in ('bus_model_type', 'vehicle_type'); assert n = 9, 'bus model and vehicle types';

  -- visibility: HO / AM see every depot, depot staff only their own (the test Tyre IC is at Adyar)
  perform public.t_as('ho');  select count(*) into n from public.fleets; assert n = 34, 'HO should see all fleets';
  perform public.t_as('am');  select count(*) into n from public.fleets; assert n = 34, 'AM should see all fleets';
  perform public.t_as('tic'); select count(*) into n from public.fleets; assert n = 8, 'Tyre IC should see only own depot fleets';
  select count(*) into n from public.fleets where org_unit_id = mn; assert n = 0, 'Tyre IC sees another depot';
  select count(*) into n from public.maintenance_jobs; assert n = 10, 'Tyre IC should read jobs';
  begin insert into public.fleets (fleet_no, registration_no, org_unit_id, fleet_type_id)
        values ('HACK1', 'TN-99-HACK', ad, (select id from public.fleet_types limit 1)); assert false, 'direct insert allowed';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  assert not has_function_privilege('authenticated', 'app.apply_fleet(uuid)', 'execute'), 'apply_fleet callable';
  assert not has_function_privilege('authenticated', 'app.validate_maintenance_job(jsonb)', 'execute'), 'validate job callable';

  -- ---------------- fleet types ----------------
  begin perform public.t_propose('fleet_type', 'CREATE', null, '{"fleet_make":"Tata","fleet_model":"demo model ta-1"}'); assert false, 'duplicate fleet type'; exception when raise_exception then null; end;
  begin perform public.t_propose('fleet_type', 'CREATE', null, '{"fleet_make":"Eicher","fleet_model":"E1","tyre_sizes":["0 X 0"]}'); assert false, 'unknown size'; exception when raise_exception then null; end;
  begin perform public.t_propose('fleet_type', 'CREATE', null, '{"fleet_make":"Eicher","fleet_model":"E1","colour":"red"}'); assert false, 'unknown field'; exception when raise_exception then null; end;
  ft := public.t_do('fleet_type', 'CREATE', null, '{"fleet_make":"Eicher","fleet_model":"E1","tyre_sizes":["7.50 X 16","8.25 X 16","7.50 X 16"]}');
  select count(*) into n from public.fleet_type_tyre_sizes where fleet_type_id = ft; assert n = 2, 'sizes should be de-duplicated to 2';
  perform public.t_do('fleet_type', 'UPDATE', ft, '{"tyre_sizes":["9.00 X 20"]}');
  select count(*) into n from public.fleet_type_tyre_sizes where fleet_type_id = ft; assert n = 1, 'sizes not replaced';
  begin perform public.t_do('fleet_type', 'UPDATE', ft, '{"fleet_model":"E2"}'); assert false, 'fleet model changed'; exception when raise_exception then null; end;
  execute 'reset role';
  assert (select fleet_model from public.fleet_types where id = ft) = 'E1', 'fleet model changed';

  -- ---------------- fleets ----------------
  begin perform public.t_propose('fleet', 'CREATE', null, '{"fleet_no":"x1","registration_no":"TN-01-N-9001","depot_code":"AD","fleet_make":"Eicher","fleet_model":"E1"}'); assert false, 'lowercase fleet no'; exception when raise_exception then null; end;
  begin perform public.t_propose('fleet', 'CREATE', null, '{"fleet_no":"J0201","registration_no":"TN-01-N-9001","depot_code":"AD","fleet_make":"Eicher","fleet_model":"E1"}'); assert false, 'duplicate fleet no'; exception when raise_exception then null; end;
  begin perform public.t_propose('fleet', 'CREATE', null, '{"fleet_no":"Z9001","registration_no":"TN-01-N-0201","depot_code":"AD","fleet_make":"Eicher","fleet_model":"E1"}'); assert false, 'duplicate registration'; exception when raise_exception then null; end;
  begin perform public.t_propose('fleet', 'CREATE', null, '{"fleet_no":"Z9001","registration_no":"TN-01-N-9001","depot_code":"NOPE","fleet_make":"Eicher","fleet_model":"E1"}'); assert false, 'unknown depot'; exception when raise_exception then null; end;
  begin perform public.t_propose('fleet', 'CREATE', null, '{"fleet_no":"Z9001","registration_no":"TN-01-N-9001","depot_code":"CS","fleet_make":"Eicher","fleet_model":"E1"}'); assert false, 'non-depot unit accepted'; exception when raise_exception then null; end;
  begin perform public.t_propose('fleet', 'CREATE', null, '{"fleet_no":"Z9001","registration_no":"TN-01-N-9001","depot_code":"AD","fleet_make":"Eicher"}'); assert false, 'make without model'; exception when raise_exception then null; end;
  begin perform public.t_propose('fleet', 'CREATE', null, '{"fleet_no":"Z9001","registration_no":"TN-01-N-9001","depot_code":"AD","fleet_make":"Nobody","fleet_model":"X"}'); assert false, 'unknown fleet type'; exception when raise_exception then null; end;
  begin perform public.t_propose('fleet', 'CREATE', null, '{"fleet_no":"Z9001","registration_no":"TN-01-N-9001","depot_code":"AD","fleet_make":"Eicher","fleet_model":"E1","positions":["fr","FL"]}'); assert false, 'bad position'; exception when raise_exception then null; end;
  begin perform public.t_propose('fleet', 'CREATE', null, '{"fleet_no":"Z9001","registration_no":"TN-01-N-9001","depot_code":"AD","fleet_make":"Eicher","fleet_model":"E1","purchase_date":"01/02/2020"}'); assert false, 'bad date'; exception when raise_exception then null; end;

  fl := public.t_do('fleet', 'CREATE', null,
    '{"fleet_no":"Z9001","registration_no":"TN-01-N-9001","chassis_no":"CH-TEST-1","purchase_date":"2024-05-01","depot_code":"AD","fleet_make":"Eicher","fleet_model":"E1",
      "bus_model_type_code":"AC","vehicle_type_code":"TOWN","oem_size_code":"9.00 X 20","positions":["FR","FL","RRI","RRO"]}');
  select * into f from public.fleets where id = fl;
  assert f.fleet_no = 'Z9001' and f.org_unit_id = ad and f.status = 'ACTIVE' and f.row_version = 1 and f.is_demo = false, 'fleet not created correctly';
  assert f.position_layout = array['FR','FL','RRI','RRO'], 'positions wrong';
  select count(*) into n from public.fleet_depot_history where fleet_id = fl and from_org_unit_id is null and to_org_unit_id = ad; assert n = 1, 'creation not in depot history';
  begin perform public.t_propose('fleet', 'CREATE', null, '{"fleet_no":"Z9002","registration_no":"TN-01-N-9002","chassis_no":"CH-TEST-1","depot_code":"AD","fleet_make":"Eicher","fleet_model":"E1"}'); assert false, 'duplicate chassis'; exception when raise_exception then null; end;

  -- update touches only what was sent; a depot transfer writes history
  perform public.t_do('fleet', 'UPDATE', fl, '{"registration_no":"TN-01-N-9100"}');
  select * into f from public.fleets where id = fl;
  assert f.registration_no = 'TN-01-N-9100' and f.chassis_no = 'CH-TEST-1' and f.org_unit_id = ad and f.row_version = 2, 'fleet update changed the wrong fields';
  perform public.t_do('fleet', 'UPDATE', fl, '{"depot_code":"MN"}');
  assert (select org_unit_id from public.fleets where id = fl) = mn, 'depot not changed';
  select count(*) into n from public.fleet_depot_history where fleet_id = fl and from_org_unit_id = ad and to_org_unit_id = mn; assert n = 1, 'transfer not in depot history';
  perform public.t_as('tic'); select count(*) into n from public.fleets where id = fl; assert n = 0, 'Adyar Tyre IC still sees the transferred fleet';
  execute 'reset role';
  begin perform public.t_do('fleet', 'UPDATE', fl, '{"fleet_no":"Z9999"}'); assert false, 'fleet number changed'; exception when raise_exception then null; end;
  execute 'reset role';
  assert (select fleet_no from public.fleets where id = fl) = 'Z9001', 'fleet number changed';
  begin update public.fleet_depot_history set effective_from = current_date; assert false, 'history updated'; exception when integrity_constraint_violation then null; end;

  perform public.t_do('fleet', 'DEACTIVATE', fl, '{}');
  assert (select status from public.fleets where id = fl) = 'INACTIVE', 'fleet not deactivated';
  perform public.t_do('fleet', 'REACTIVATE', fl, '{}');
  assert (select status from public.fleets where id = fl) = 'ACTIVE', 'fleet not reactivated';
  select count(*) into n from public.audit_logs where table_name = 'fleets' and record_id = fl and action = 'INSERT'; assert n = 1, 'fleet insert not audited';

  -- ---------------- maintenance jobs ----------------
  begin perform public.t_propose('maintenance_job', 'CREATE', null, '{"job_code":"JOB-007","job_name":"x","work_category":"CENSUS"}'); assert false, 'JOB-007 accepted'; exception when raise_exception then null; end;
  begin perform public.t_propose('maintenance_job', 'CREATE', null, '{"job_code":"JOB-001","job_name":"x","work_category":"CENSUS"}'); assert false, 'duplicate job'; exception when raise_exception then null; end;
  begin perform public.t_propose('maintenance_job', 'CREATE', null, '{"job_code":"J13","job_name":"x","work_category":"CENSUS"}'); assert false, 'bad job code'; exception when raise_exception then null; end;
  begin perform public.t_propose('maintenance_job', 'CREATE', null, '{"job_code":"JOB-013","job_name":"x","work_category":"NOPE"}'); assert false, 'bad category'; exception when raise_exception then null; end;
  begin perform public.t_propose('maintenance_job', 'CREATE', null, '{"job_code":"JOB-013","job_name":"x","work_category":"CENSUS","est_minutes_per_fleet":0}'); assert false, 'bad minutes'; exception when raise_exception then null; end;
  begin perform public.t_propose('maintenance_job', 'CREATE', null, '{"job_code":"JOB-013","job_name":"x","work_category":"CENSUS","fleet_make":"Tata"}'); assert false, 'make without model'; exception when raise_exception then null; end;
  jb := public.t_do('maintenance_job', 'CREATE', null, '{"job_code":"JOB-013","job_name":"  Wheel Alignment Check  ","work_category":"INSPECTION","est_minutes_per_fleet":30,"fleet_make":"Eicher","fleet_model":"E1"}');
  select * into f from public.maintenance_jobs where id = jb;
  assert f.job_name = 'Wheel Alignment Check' and f.est_minutes_per_fleet = 30 and f.fleet_type_id = ft and f.status = 'ACTIVE', 'job not created correctly';
  perform public.t_do('maintenance_job', 'UPDATE', jb, '{"est_minutes_per_tyre":5}');
  select * into f from public.maintenance_jobs where id = jb;
  assert f.est_minutes_per_tyre = 5 and f.est_minutes_per_fleet = 30 and f.fleet_type_id = ft and f.row_version = 2, 'job update changed the wrong fields';
  perform public.t_do('maintenance_job', 'UPDATE', jb, '{"fleet_make":null,"fleet_model":null}');
  assert (select fleet_type_id from public.maintenance_jobs where id = jb) is null, 'job fleet type not cleared';
  begin perform public.t_do('maintenance_job', 'UPDATE', jb, '{"job_code":"JOB-014"}'); assert false, 'job code changed'; exception when raise_exception then null; end;
  execute 'reset role';
  perform public.t_do('maintenance_job', 'DEACTIVATE', jb, '{}');
  assert (select status from public.maintenance_jobs where id = jb) = 'INACTIVE', 'job not deactivated';
end $$;

rollback;
