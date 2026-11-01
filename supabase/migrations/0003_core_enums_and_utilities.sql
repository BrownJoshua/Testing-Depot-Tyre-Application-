-- 0003: core enumerated types and one utility trigger function.
-- STATUS: proposed in Stage 3 batch 2, NOT applied. Review and approve before running.
-- Must be run as the "postgres" role (the SQL Editor does this).

create type public.role_code     as enum ('HO', 'AM', 'SUP', 'TIC', 'TM');
create type public.org_unit_type as enum ('DEPOT', 'TRS', 'CENTRAL_STORE', 'MIC_VEHICLE_UNIT');
create type public.master_status as enum ('ACTIVE', 'INACTIVE');

-- keeps updated_at honest (the application cannot forge it)
create function app.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- identity codes never change once created (an employee code is also the login name)
create function app.forbid_code_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.employee_code is distinct from old.employee_code then
    raise exception 'employee_code is immutable (% -> %)', old.employee_code, new.employee_code
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

-- internal helpers are not callable by API roles
revoke all on function app.set_updated_at()    from public, anon, authenticated;
revoke all on function app.forbid_code_change() from public, anon, authenticated;
