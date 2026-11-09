-- Test 0025: depot isolation and role limits for the D1 job, stock and duty tables and functions. Rolled back.
begin;

insert into auth.users (id, aud, role, email) values ('00000000-0000-0000-0000-0000000000c9', 'authenticated', 'authenticated', 't25-tic@test.invalid');
insert into public.employees (id, employee_code, full_name, role_code, org_unit_id)
values ('00000000-0000-0000-0000-0000000000e9', 'T25-TIC', 'T25 TIC', 'TIC', (select id from public.org_units where code = 'AD'));
insert into public.profiles (id, employee_id) values ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000e9');

create function public.t_as(who text) returns void language plpgsql as $$
declare v_sub text;
begin
  execute 'reset role';
  select p.id::text into v_sub from public.profiles p join public.employees e on e.id = p.employee_id
   where e.employee_code = case who when 'ho' then 'HOT-0114' when 'am' then 'HOT-AE-021' when 'sup' then 'SUP-2231' when 'tic' then 'TIC-1147' when 'tm' then 'TM-3092' else 'T25-TIC' end;
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_sub), true);
  execute 'set local role authenticated';
end $$;
grant execute on function public.t_as(text) to authenticated;

do $$
declare
  mn uuid; tm uuid; n int; n_all int; t text; ok boolean; wsr uuid; mrn uuid; srn uuid; job uuid; gin uuid; f1 uuid; tyre uuid; sch uuid;
  tables text[] := array['job_cards', 'job_ids', 'complaints', 'wsrs', 'wsr_lines', 'wsr_gins', 'mrns', 'grns', 'srns', 'srn_lines', 'fleet_orders', 'stock_items', 'hrms_roster', 'duty_postings', 'tyres'];
  col text;
begin
  select id into mn from public.org_units where code = 'MN';
  select id into tm from public.employees where employee_code = 'TM-3092';
  select id into wsr from public.wsrs where org_unit_id = mn limit 1;
  select id into mrn from public.mrns where org_unit_id = mn limit 1;
  select id into srn from public.srns where org_unit_id = mn limit 1;
  select id into job from public.job_ids where org_unit_id = mn limit 1;
  select id into gin from public.wsr_gins where org_unit_id = mn limit 1;
  select id into f1 from public.fleets where org_unit_id = mn and status = 'ACTIVE' limit 1;
  select id into tyre from public.tyres where owner_org_unit_id = mn and stock_place = 'LIVE_STOCK' limit 1;
  select id into sch from public.maintenance_schedules limit 1;
  assert wsr is not null and mrn is not null and srn is not null and job is not null and gin is not null, 'the Mandaveli test data exists';

  -- 1. a Tyre IC of another depot sees nothing of Mandaveli
  perform public.t_as('ad');
  foreach t in array tables loop
    col := case when t = 'tyres' or t = 'stock_items' then 'owner_org_unit_id' else 'org_unit_id' end;
    execute format('select count(*) from public.%I where %I = %L', t, col, mn) into n;
    assert n = 0, 'another depot reads Mandaveli rows of ' || t || ': ' || n;
  end loop;

  -- 2. ... and cannot act on them
  foreach t in array array['wsr_issue', 'mrn_receive', 'srn_receive', 'job_id_start', 'fitment_provide_tyre', 'duty_post', 'tyre_change_create', 'grn_receive_wsr_gin', 'job_id_complete'] loop
    ok := false;
    begin
      case t
        when 'wsr_issue' then perform public.wsr_issue(wsr, '[]');
        when 'mrn_receive' then perform public.mrn_receive(mrn, true, 'GOOD', null);
        when 'srn_receive' then perform public.srn_receive(srn);
        when 'job_id_start' then perform public.job_id_start(job);
        when 'job_id_complete' then perform public.job_id_complete(job, 'x');
        when 'fitment_provide_tyre' then perform public.fitment_provide_tyre(job, tyre);
        when 'duty_post' then perform public.duty_post(array[tm], sch, null, array[date '2026-09-21']);
        when 'tyre_change_create' then perform public.tyre_change_create(f1, '[]');
        when 'grn_receive_wsr_gin' then perform public.grn_receive_wsr_gin(gin, '[]');
      end case;
    exception when others then ok := true; end;
    assert ok, 'another depot could call ' || t || ' on Mandaveli data';
  end loop;
  -- direct writes are not possible for anyone
  foreach t in array tables loop
    ok := false;
    begin execute format('delete from public.%I', t); get diagnostics n = row_count; ok := (n = 0); exception when others then ok := true; end;
    assert ok, 'a signed-in user can delete from ' || t;
  end loop;

  -- 3. a Tyre Man sees only his own Job IDs, roster and postings
  perform public.t_as('tm');
  execute 'select count(*) from public.job_ids' into n;
  execute 'reset role'; execute 'select count(*) from public.job_ids j where exists (select 1 from public.job_id_assignees a where a.job_id_ref = j.id and a.employee_id = $1)' into n_all using tm;
  perform public.t_as('tm');
  execute 'select count(*) from public.job_ids' into n;
  assert n = n_all, 'the Tyre Man sees exactly the Job IDs assigned to him: ' || n || ' vs ' || n_all;
  assert not exists (select 1 from public.hrms_roster where employee_id <> tm), 'the Tyre Man sees only his roster';
  assert not exists (select 1 from public.duty_postings where employee_id <> tm), 'the Tyre Man sees only his postings';

  execute 'reset role';
  foreach t in array array['app.on_change_job_done(uuid)', 'app.wsr_issue_line(uuid,uuid,uuid)', 'app.wsr_auto_issue(uuid,uuid)', 'app.new_order(text,uuid,uuid,uuid,text,text,uuid,uuid,text,text,uuid,uuid)'] loop
    assert not has_function_privilege('authenticated', t, 'execute') and not has_function_privilege('anon', t, 'execute'), 'internal function is open: ' || t;
  end loop;
  -- 4. anonymous users: no table, no function
  execute 'set local role anon';
  foreach t in array tables loop
    ok := false; begin execute format('select 1 from public.%I limit 1', t); exception when insufficient_privilege then ok := true; end;
    assert ok, 'anon can read ' || t;
  end loop;
  foreach t in array array['public.tyre_change_create(uuid,jsonb,uuid,date,uuid,text)', 'public.wsr_create(jsonb)', 'public.wsr_issue(uuid,jsonb)', 'public.grn_receive_wsr_gin(uuid,jsonb)',
      'public.mrn_create(uuid,uuid,text)', 'public.mrn_receive(uuid,boolean,text,text)', 'public.srn_create(uuid,jsonb,text)', 'public.srn_receive(uuid)', 'public.duty_post(uuid[],uuid,uuid,date[],uuid)',
      'public.duty_unpost(uuid[],uuid,uuid,date[])', 'public.fitment_provide_tyre(uuid,uuid)', 'public.job_id_start(uuid)', 'public.job_id_complete(uuid,text)', 'public.final_inspection(uuid,text,text,uuid[],jsonb)'] loop
    assert not has_function_privilege('anon', t, 'execute'), 'anon can execute ' || t;
  end loop;

  -- 5. HO and AM read every depot but cannot use the Tyre IC / Tyre Man functions
  execute 'reset role'; execute 'select count(*) from public.job_cards' into n_all;
  foreach t in array array['ho', 'am'] loop
    perform public.t_as(t);
    execute 'select count(*) from public.job_cards' into n; assert n = n_all, t || ' reads every depot''s job cards: ' || n || ' vs ' || n_all;
    execute 'select count(*) from public.hrms_roster' into n; assert n > 0, t || ' reads the HRMS roster';
    foreach col in array array['tyre_change_create', 'wsr_issue', 'mrn_receive', 'srn_receive', 'duty_post', 'job_id_start', 'wsr_create', 'srn_create'] loop
      ok := false;
      begin
        case col
          when 'tyre_change_create' then perform public.tyre_change_create(f1, '[]');
          when 'wsr_issue' then perform public.wsr_issue(wsr, '[]');
          when 'mrn_receive' then perform public.mrn_receive(mrn, true, 'GOOD', null);
          when 'srn_receive' then perform public.srn_receive(srn);
          when 'duty_post' then perform public.duty_post(array[tm], sch, null, array[date '2026-09-21']);
          when 'job_id_start' then perform public.job_id_start(job);
          when 'wsr_create' then perform public.wsr_create('[{"part":"TUBE"}]');
          when 'srn_create' then perform public.srn_create(null, '[]');
        end case;
      exception when others then ok := true; end;
      assert ok, t || ' could call ' || col;
    end loop;
  end loop;

  execute 'reset role';
  raise notice 'PASS: 0025 isolation';
end $$;

rollback;
