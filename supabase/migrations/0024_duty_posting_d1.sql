-- 0024: D1 realignment step 5 - Duty Posting
--   D1 removed the weekly roster approval. The duty roster of each employee comes from HRMS (simulated here by a generated
--   roster that nobody edits); the Tyre IC POSTS employees to a Schedule Code or a Job Code for days. No groups, no approval.
--   The batch 8 tables duty_rosters / duty_roster_entries stay in the database (history) but are no longer used.

-- the roster capabilities of the old design are switched off; posting has its own capability
update public.role_capabilities set is_enabled = false, note = 'D1: weekly roster approval removed' where capability in ('roster.propose', 'roster.approve');
insert into public.role_capabilities (role_code, capability, is_enabled, is_resolved, note) values ('TIC', 'duty.post', true, true, 'Tyre IC posts employees to a Schedule Code / Job Code');

create table public.hrms_roster (                         -- the HRMS duty roster, read only
  employee_id uuid not null references public.employees (id),
  org_unit_id uuid not null references public.depots (org_unit_id),
  duty_date   date not null,
  kind        text not null check (kind in ('SHIFT', 'WO', 'L')),     -- shift, weekly off, leave
  shift_id    uuid references public.shifts (id),
  primary key (employee_id, duty_date),
  constraint hrms_shift_needs_shift check ((kind = 'SHIFT') = (shift_id is not null))
);
create index hrms_roster_depot_idx on public.hrms_roster (org_unit_id, duty_date);

create table public.duty_postings (                       -- one row per employee, target and day
  id               uuid primary key default gen_random_uuid(),
  org_unit_id      uuid not null references public.depots (org_unit_id),
  employee_id      uuid not null references public.employees (id),
  schedule_id      uuid references public.maintenance_schedules (id),
  job_code_id      uuid references public.maintenance_jobs (id),
  duty_date        date not null,
  shift_id         uuid references public.shifts (id),     -- null = any shift (the employee's own roster)
  posted_by        uuid not null references public.employees (id),
  created_at       timestamptz not null default now(),
  constraint postings_one_target check ((schedule_id is null) <> (job_code_id is null))
);
create unique index duty_postings_uk on public.duty_postings (employee_id, coalesce(schedule_id, job_code_id), duty_date);
create index duty_postings_target_idx on public.duty_postings (org_unit_id, duty_date);
create trigger audit_duty_postings after insert or update or delete on public.duty_postings for each row execute function app.audit_row();

-- generated roster, 1 Sep - 31 Dec 2026: Tyre IC on General shift; Tyre Men rotate Morning / Evening / Night weekly; each has one weekly off; a few leave days
insert into public.hrms_roster (employee_id, org_unit_id, duty_date, kind, shift_id)
select e.id, e.org_unit_id, d::date,
       case when extract(isodow from d)::int - 1 = e.i % 7 then 'WO' when e.i % 4 = 1 and d::date between date '2026-09-24' and date '2026-09-25' then 'L' else 'SHIFT' end,
       case when extract(isodow from d)::int - 1 = e.i % 7 or (e.i % 4 = 1 and d::date between date '2026-09-24' and date '2026-09-25') then null
            else (select id from public.shifts where shift_code = case when e.role_code = 'TIC' then 'GENERAL'
                    else (array['MORNING', 'EVENING', 'NIGHT'])[1 + ((e.i + ((d::date - date '2026-08-31') / 7)) % 3)] end) end
from (select id, org_unit_id, role_code, (row_number() over (partition by org_unit_id order by employee_code) - 1)::int as i
        from public.employees where role_code in ('TM', 'TIC') and status = 'ACTIVE' and org_unit_id is not null) e
cross join generate_series(date '2026-09-01', date '2026-12-31', interval '1 day') d;

-- p_days: dates; only days on which the employee is on duty (on the chosen shift, when one is chosen) are posted
create function public.duty_post(p_employees uuid[], p_schedule uuid, p_job uuid, p_days date[], p_shift uuid default null) returns int
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('duty.post'); w uuid; d date; n int := 0; r public.hrms_roster;
begin
  if (p_schedule is null) = (p_job is null) then raise exception 'choose one Schedule Code or one Job Code'; end if;
  if p_schedule is not null and not exists (select 1 from public.maintenance_schedules where id = p_schedule and status = 'ACTIVE') then raise exception 'the schedule is not active'; end if;
  if p_job is not null and not exists (select 1 from public.maintenance_jobs where id = p_job and status = 'ACTIVE') then raise exception 'the job code is not active'; end if;
  if coalesce(cardinality(p_employees), 0) = 0 then raise exception 'choose at least one employee'; end if;
  if coalesce(cardinality(p_days), 0) = 0 then raise exception 'choose at least one day'; end if;
  if p_shift is not null and not exists (select 1 from public.shifts where id = p_shift and status = 'ACTIVE') then raise exception 'unknown shift'; end if;
  foreach w in array p_employees loop
    if not exists (select 1 from public.employees where id = w and org_unit_id = e.org_unit_id and status = 'ACTIVE' and role_code in ('TM', 'TIC')) then
      raise exception 'every employee must be an active Tyre Man or Tyre IC of your depot'; end if;
    foreach d in array p_days loop
      select * into r from public.hrms_roster where employee_id = w and duty_date = d;
      continue when not found or r.kind <> 'SHIFT' or (p_shift is not null and r.shift_id <> p_shift);
      insert into public.duty_postings (org_unit_id, employee_id, schedule_id, job_code_id, duty_date, shift_id, posted_by)
      values (e.org_unit_id, w, p_schedule, p_job, d, p_shift, e.id) on conflict do nothing;
      if found then n := n + 1; end if;
    end loop;
  end loop;
  if n = 0 then raise exception 'nobody was posted: the chosen people are not on duty on those days (or already posted)'; end if;
  return n;
end $$;

create function public.duty_unpost(p_employees uuid[], p_schedule uuid, p_job uuid, p_days date[]) returns int
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('duty.post'); n int;
begin
  if (p_schedule is null) = (p_job is null) then raise exception 'choose one Schedule Code or one Job Code'; end if;
  delete from public.duty_postings where org_unit_id = e.org_unit_id and employee_id = any (p_employees) and duty_date = any (p_days)
     and schedule_id is not distinct from p_schedule and job_code_id is not distinct from p_job;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.duty_post(uuid[], uuid, uuid, date[], uuid), public.duty_unpost(uuid[], uuid, uuid, date[]) from public, anon;
grant execute on function public.duty_post(uuid[], uuid, uuid, date[], uuid), public.duty_unpost(uuid[], uuid, uuid, date[]) to authenticated;

alter table public.hrms_roster   enable row level security; alter table public.hrms_roster   force row level security;
alter table public.duty_postings enable row level security; alter table public.duty_postings force row level security;
grant select on public.hrms_roster, public.duty_postings to authenticated;
create policy gate_active_user on public.hrms_roster   as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.duty_postings as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
-- a Tyre Man sees only his own roster and postings
create policy read_depot on public.hrms_roster for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()) and (app.my_role() <> 'TM' or employee_id = app.my_employee_id()));
create policy read_depot on public.duty_postings for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()) and (app.my_role() <> 'TM' or employee_id = app.my_employee_id()));
