-- Test for migration 0024 (Duty Posting). Rolled back.
begin;

create function public.t_as(who text) returns void language plpgsql as $$
declare v_sub text;
begin
  execute 'reset role';
  select p.id::text into v_sub from public.profiles p join public.employees e on e.id = p.employee_id
   where e.employee_code = case who when 'sup' then 'SUPE' when 'tic' then 'TIC' else 'TMAN' end;
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_sub), true);
  execute 'set local role authenticated';
end $$;
grant execute on function public.t_as(text) to authenticated;

do $$
declare n int; tm uuid; sch uuid; job uuid; d date; wo date; ok boolean; days date[];
begin
  select id into tm from public.employees where employee_code = 'TMAN';
  select id into sch from public.maintenance_schedules where schedule_code = 'SCH001';
  select id into job from public.maintenance_jobs where job_code = 'JOB-001';
  select count(*) into n from public.hrms_roster where employee_id = tm; assert n = 122, 'roster Sep-Dec for the Tyre Man: ' || n;
  select duty_date into wo from public.hrms_roster where employee_id = tm and kind = 'WO' and duty_date > date '2026-09-20' order by duty_date limit 1;
  select duty_date into d from public.hrms_roster where employee_id = tm and kind = 'SHIFT' and duty_date > wo order by duty_date limit 1;
  assert not exists (select 1 from public.role_capabilities where capability = 'roster.approve' and is_enabled), 'roster approval is off';

  perform public.t_as('sup');
  begin perform public.duty_post(array[tm], sch, null, array[d]); ok := false; exception when others then ok := true; end;
  assert ok, 'a Supervisor cannot post';
  perform public.t_as('tm');
  begin perform public.duty_post(array[tm], sch, null, array[d]); ok := false; exception when others then ok := true; end;
  assert ok, 'a Tyre Man cannot post';
  assert (select count(*) from public.hrms_roster) = (select count(*) from public.hrms_roster where employee_id = tm), 'a Tyre Man sees only his roster';

  perform public.t_as('tic');
  begin perform public.duty_post(array[tm], sch, job, array[d]); ok := false; exception when others then ok := true; end;
  assert ok, 'one target only';
  begin perform public.duty_post(array[tm], sch, null, array[wo]); ok := false; exception when others then ok := true; end;
  assert ok, 'a weekly-off day is not postable';
  n := public.duty_post(array[tm], sch, null, array[d, d + 1, wo]); assert n >= 1 and n <= 2, 'posted on duty days only: ' || n;
  begin perform public.duty_post(array[tm], sch, null, array[d]); ok := false; exception when others then ok := true; end;
  assert ok, 'already posted';
  n := public.duty_post(array[tm], null, job, array[d]); assert n = 1, 'job-code posting';
  n := public.duty_unpost(array[tm], sch, null, array[d]); assert n = 1, 'removed';
  perform public.t_as('tm');
  assert (select count(*) from public.duty_postings) >= 1, 'the Tyre Man sees his postings';
  execute 'reset role';
  raise notice 'PASS: 0024 duty posting';
end $$;

rollback;
