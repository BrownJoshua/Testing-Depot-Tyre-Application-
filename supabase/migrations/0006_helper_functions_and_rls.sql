-- 0006: identity helper functions, row-level security, grants, and the my_session() RPC.
-- STATUS: proposed in Stage 3 batch 2, NOT applied. Review and approve before running.
--
-- Naming note: the Stage 2 documents called these current_role() etc. "current_role" is a reserved
-- SQL keyword, so the functions are named my_role(), my_depot_id(), ... instead.
--
-- Security design (stage2.1-security-review.md):
--  S-02  a RESTRICTIVE "active user" policy on every table: a deactivated employee sees nothing even
--        with a still-valid token.
--  S-03  helper functions are SECURITY DEFINER, owned by postgres (which bypasses RLS), with an empty search_path.
--  S-04  functions are not executable by PUBLIC/anon; only the roles that need them.
--  S-01  views use security_invoker, except v_staff_directory, which is deliberately a security-barrier
--        view that exposes only same-depot staff names.
--  Writes: there are NO insert/update/delete policies. The only client write is profiles.preferred_language.

-- ---------------------------------------------------------------------------------------------
-- helper functions (private schema "app")
-- ---------------------------------------------------------------------------------------------
grant usage on schema app to authenticated;     -- policies run as the caller and must be able to call the helpers

create function app.my_employee_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.employee_id
  from public.profiles p
  join public.employees e on e.id = p.employee_id
  where p.id = auth.uid() and p.is_active and e.status = 'ACTIVE'
$$;

create function app.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select app.my_employee_id() is not null
$$;

create function app.my_role() returns public.role_code
language sql stable security definer set search_path = '' as $$
  select e.role_code from public.employees e where e.id = app.my_employee_id()
$$;

create function app.my_depot_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select e.org_unit_id from public.employees e where e.id = app.my_employee_id()
$$;

create function app.my_visible_depot_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select d.org_unit_id from public.depots d where app.my_role() in ('HO', 'AM')
  union
  select e.org_unit_id from public.employees e
   where e.id = app.my_employee_id() and e.org_unit_id is not null
  union
  select a.org_unit_id from public.user_depot_access a
   where a.profile_id = auth.uid() and app.my_employee_id() is not null
$$;

create function app.has_capability(cap text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.role_capabilities c
    where c.role_code = app.my_role() and c.capability = cap and c.is_enabled and c.is_resolved)
$$;

revoke all on function app.my_employee_id(), app.is_active_user(), app.my_role(), app.my_depot_id(),
                       app.my_visible_depot_ids(), app.has_capability(text) from public, anon, authenticated;
grant execute on function app.my_employee_id(), app.is_active_user(), app.my_role(), app.my_depot_id(),
                          app.my_visible_depot_ids(), app.has_capability(text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- row-level security on every identity table
-- ---------------------------------------------------------------------------------------------
alter table public.org_units         enable row level security;  alter table public.org_units         force row level security;
alter table public.depots            enable row level security;  alter table public.depots            force row level security;
alter table public.roles             enable row level security;  alter table public.roles             force row level security;
alter table public.employees         enable row level security;  alter table public.employees         force row level security;
alter table public.profiles          enable row level security;  alter table public.profiles          force row level security;
alter table public.user_depot_access enable row level security;  alter table public.user_depot_access force row level security;
alter table public.role_capabilities enable row level security;  alter table public.role_capabilities force row level security;

-- grants: read-only for signed-in users; the single permitted write is the language preference
grant select on public.org_units, public.depots, public.roles, public.employees,
                public.user_depot_access, public.role_capabilities, public.profiles to authenticated;
grant update (preferred_language) on public.profiles to authenticated;

-- S-02: the active-user gate (restrictive = AND-ed with every permissive policy)
create policy gate_active_user on public.org_units         as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.depots            as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.roles             as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.employees         as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.profiles          as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.user_depot_access as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.role_capabilities as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());

-- reference data: every active user may read depots, units and role names
create policy read_all on public.org_units for select to authenticated using (true);
create policy read_all on public.depots    for select to authenticated using (true);
create policy read_all on public.roles     for select to authenticated using (true);

-- employees: yourself; HO and AM see everyone; Supervisor and Tyre IC see their own depot(s);
-- a Tyre Man sees only their own record (colleague names come from v_staff_directory below)
create policy read_employees on public.employees for select to authenticated using (
     id = app.my_employee_id()
  or app.my_role() in ('HO', 'AM')
  or (app.my_role() in ('SUP', 'TIC') and org_unit_id in (select app.my_visible_depot_ids()))
);

-- profiles: your own row (HO and AM may read all); you may update only your own language preference
create policy read_profiles on public.profiles for select to authenticated using (
  id = auth.uid() or app.my_role() in ('HO', 'AM'));
create policy update_own_language on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy read_own_or_admin on public.user_depot_access for select to authenticated using (
  profile_id = auth.uid() or app.my_role() in ('HO', 'AM'));

create policy read_admin_only on public.role_capabilities for select to authenticated using (
  app.my_role() in ('HO', 'AM'));

-- ---------------------------------------------------------------------------------------------
-- views and the session RPC
-- ---------------------------------------------------------------------------------------------
grant select on public.v_depots to authenticated;

-- Staff names and codes for people in the caller's depot(s) (so a Tyre Man can see colleagues).
-- Runs as its owner on purpose, but the WHERE clause limits rows to the caller's visible depots.
create view public.v_staff_directory with (security_barrier = true) as
select e.id, e.employee_code, e.full_name, e.role_code, e.org_unit_id
from public.employees e
where e.status = 'ACTIVE'
  and app.is_active_user()
  and e.org_unit_id in (select app.my_visible_depot_ids());
revoke all on public.v_staff_directory from public, anon, authenticated;
grant select on public.v_staff_directory to authenticated;

-- What the front end calls right after sign-in to decide where to route the user.
-- The role comes from the database only; nothing here trusts the browser.
create function public.my_session() returns table (
  employee_id uuid, employee_code text, full_name text, role_code public.role_code,
  org_unit_id uuid, org_unit_code text, org_unit_name text,
  preferred_language text, must_change_password boolean)
language sql stable security definer set search_path = '' as $$
  select e.id, e.employee_code, e.full_name, e.role_code,
         e.org_unit_id, o.code, o.name,
         p.preferred_language, p.must_change_password
  from public.profiles p
  join public.employees e on e.id = p.employee_id
  left join public.org_units o on o.id = e.org_unit_id
  where p.id = auth.uid() and p.is_active and e.status = 'ACTIVE'
$$;
revoke all on function public.my_session() from public, anon, authenticated;
grant execute on function public.my_session() to authenticated;
