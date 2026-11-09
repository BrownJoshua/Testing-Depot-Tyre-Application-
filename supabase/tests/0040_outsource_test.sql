-- Test for migration 0040 (Outsource Employee register). Rolled back.
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
declare n int; v text; id1 uuid; ok boolean;
begin
  select count(*) into n from public.outsource_employees where status = 'ACTIVE'; assert n >= 6, 'six D1 samples: ' || n;
  perform public.t_as('tm'); assert (select count(*) from public.outsource_employees) = 0, 'a Tyre Man does not see outsource staff';
  begin perform public.outsource_add('X Y', 'DIRECT', null, '9999999999', '1111 2222 3333', null, null, null); ok := false; exception when others then ok := true; end;
  assert ok, 'a Tyre Man cannot add';
  perform public.t_as('tic');
  begin perform public.outsource_add('X Y', 'CONTRACTOR', null, '9999999999', '1111 2222 3333', null, null, null); ok := false; exception when others then ok := true; end;
  assert ok, 'a contractor must be named';
  begin perform public.outsource_add('X Y', 'DIRECT', null, '99', '1111 2222 3333', null, null, null); ok := false; exception when others then ok := true; end;
  assert ok, 'phone needs 10 digits';
  v := public.outsource_add('Test Person', 'DIRECT', null, '9999999999', '1111 2222 3333', 'Chennai', 'ITI', 'Air Inflation');
  assert v like 'OSE-%', 'number made: ' || v;
  select id into id1 from public.outsource_employees where employee_no = v;
  begin perform public.outsource_remove(id1, ''); ok := false; exception when others then ok := true; end;
  assert ok, 'removal needs a reason';
  perform public.outsource_remove(id1, 'left the contract');
  assert (select status from public.outsource_employees where id = id1) = 'INACTIVE', 'removed';
  execute 'reset role';
  raise notice 'PASS: 0040';
end $$;
rollback;
