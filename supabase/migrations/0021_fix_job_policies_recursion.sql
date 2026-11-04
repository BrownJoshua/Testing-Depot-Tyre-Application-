-- 0021: fix for 0019 - the read policies of job_ids and job_id_assignees referred to each other (PostgreSQL error 42P17, infinite recursion).
-- A security-definer helper answers "is this Job ID assigned to me?" without going through row-level security, which breaks the loop.
create function app.is_my_job(p_job uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.job_id_assignees a where a.job_id_ref = p_job and a.employee_id = app.my_employee_id())
$$;
revoke all on function app.is_my_job(uuid) from public, anon;
grant execute on function app.is_my_job(uuid) to authenticated;

drop policy read_depot on public.job_ids;
drop policy read_depot on public.job_id_assignees;
create policy read_depot on public.job_ids for select to authenticated using (
  org_unit_id in (select app.my_visible_depot_ids()) and (app.my_role() <> 'TM' or app.is_my_job(id)));
create policy read_depot on public.job_id_assignees for select to authenticated using (
  employee_id = app.my_employee_id()
  or (app.my_role() <> 'TM' and exists (select 1 from public.job_ids j where j.id = job_id_assignees.job_id_ref)));
