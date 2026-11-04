-- 0015: Shifts, Maintenance Schedules, Fleet Grouping, Schedule Planner and weekly Duty Roster (Stage 5a, batch 8).
-- STATUS: proposed, NOT applied. Review and approve before running.
--
--  * Shifts: the 4 from the prototype (Morning 06:00-14:00, General 09:00-17:30, Evening 14:00-22:00, Night 22:00-06:00).
--    Shift Master editing is not enabled yet (the 'shift' master type stays disabled).
--  * Maintenance Schedules go through the HO -> AM engine (keys: schedule_code, schedule_name, work_category, job_code,
--    every_n_days, uses_working_days, due_days_after_assignment, effective_from; a code in the payload means CREATE).
--    ONLY DATE-BASED schedules ("every n days / n working days") exist in this batch. KM-based and "particular days of the month"
--    schedules need odometer data and are left for later. A working day is any day except Sunday (placeholder rule, to confirm).
--    Seeded: SCH001 (Air Inflation, every 2 working days), SCH004 (Tyre Rotation, every 30 days), SCH005 (Tyre Discout, every 30 days),
--    the three whose frequency the prototype states. SCH002, SCH003 and SCH007 are NOT seeded (their frequency is not shown).
--  * Fleet Grouping: the Tyre IC proposes a group of fleets per schedule with a reason; the Supervisor approves or returns it;
--    the Tyre IC may withdraw a pending proposal. Approval makes the revision current and supersedes the previous one.
--    A fleet may be in only one current group per schedule.
--  * Schedule Planner: planner_refresh() creates due rows from approved groups; schedule_create_cards() turns selected due rows
--    into job cards (source SCHEDULED). Rotation's "two job IDs (due tyre and partner)" and Census's "one job ID per tyre" need
--    tyre-on-fleet data and are not built yet: every scheduled card here is one fleet = one task.
--  * Duty Roster: the Tyre IC saves a weekly roster (week starts Monday), submits it, the Supervisor posts or returns it.
--    The prototype's "September-December 2026 only" limit is NOT enforced.

alter table public.job_cards add column schedule_instance_id uuid;

-- ---------------------------------------------------------------------------------------------
-- shifts
-- ---------------------------------------------------------------------------------------------
create table public.shifts (
  id          uuid primary key default gen_random_uuid(),
  shift_code  text not null unique check (shift_code ~ '^[A-Z]{2,12}$'),
  shift_name  text not null,
  start_time  time not null,
  end_time    time not null,
  status      public.master_status not null default 'ACTIVE',
  created_at  timestamptz not null default now()
);
insert into public.shifts (shift_code, shift_name, start_time, end_time) values
  ('MORNING', 'Morning', '06:00', '14:00'), ('GENERAL', 'General', '09:00', '17:30'),
  ('EVENING', 'Evening', '14:00', '22:00'), ('NIGHT',   'Night',   '22:00', '06:00');
create trigger audit_shifts after insert or update or delete on public.shifts for each row execute function app.audit_row();

-- ---------------------------------------------------------------------------------------------
-- maintenance schedules (master)
-- ---------------------------------------------------------------------------------------------
create table public.maintenance_schedules (
  id                        uuid primary key default gen_random_uuid(),
  schedule_code             text not null unique check (schedule_code ~ '^SCH[0-9]{3}$'),
  schedule_name             text not null check (length(btrim(schedule_name)) > 0),
  work_category             public.work_category not null
                            check (work_category in ('AIR_INFLATION', 'AIR_INFLATION_NITROGEN', 'INSPECTION', 'TYRE_ROTATION', 'TYRE_DISCOUT', 'CENSUS')),
  job_id                    uuid references public.maintenance_jobs (id),
  every_n_days              int not null check (every_n_days between 1 and 365),
  uses_working_days         boolean not null default false,
  due_days_after_assignment int check (due_days_after_assignment is null or due_days_after_assignment between 0 and 60),
  effective_from            date not null,
  status                    public.master_status not null default 'ACTIVE',
  row_version               int not null default 1,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create trigger maintenance_schedules_touch before update on public.maintenance_schedules for each row execute function app.set_updated_at();
create trigger audit_maintenance_schedules after insert or update or delete on public.maintenance_schedules for each row execute function app.audit_row();
insert into public.maintenance_schedules (schedule_code, schedule_name, work_category, job_id, every_n_days, uses_working_days, effective_from) values
  ('SCH001', 'Air Inflation (Regular Air)', 'AIR_INFLATION', (select id from public.maintenance_jobs where job_code = 'JOB-001'), 2, true,  date '2026-09-01'),
  ('SCH004', 'Tyre Rotation',               'TYRE_ROTATION', (select id from public.maintenance_jobs where job_code = 'JOB-004'), 30, false, date '2026-09-01'),
  ('SCH005', 'Tyre Discout',                'TYRE_DISCOUT',  (select id from public.maintenance_jobs where job_code = 'JOB-005'), 30, false, date '2026-09-01');

create function app.validate_maintenance_schedule(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform app.check_keys(p, array['schedule_code','schedule_name','work_category','job_code','every_n_days','uses_working_days','due_days_after_assignment','effective_from']);
  if p ? 'schedule_code' then   -- a code in the payload means a new schedule
    if coalesce(p ->> 'schedule_code', '') !~ '^SCH[0-9]{3}$' then raise exception 'schedule code must look like SCH008'; end if;
    if exists (select 1 from public.maintenance_schedules where schedule_code = p ->> 'schedule_code') then raise exception 'schedule % already exists', p ->> 'schedule_code'; end if;
    if length(btrim(coalesce(p ->> 'schedule_name', ''))) = 0 or coalesce(p ->> 'work_category', '') = '' or coalesce(p ->> 'every_n_days', '') = '' or coalesce(p ->> 'effective_from', '') = '' then
      raise exception 'a new schedule needs schedule_name, work_category, every_n_days and effective_from'; end if;
  end if;
  if p ? 'schedule_name' and length(btrim(coalesce(p ->> 'schedule_name', ''))) = 0 then raise exception 'schedule name cannot be blank'; end if;
  if p ? 'work_category' and p ->> 'work_category' not in ('AIR_INFLATION', 'AIR_INFLATION_NITROGEN', 'INSPECTION', 'TYRE_ROTATION', 'TYRE_DISCOUT', 'CENSUS') then
    raise exception 'a schedule cannot use work category "%"', p ->> 'work_category'; end if;
  if p ? 'every_n_days' and not ((p ->> 'every_n_days')::int between 1 and 365) then raise exception 'every_n_days must be 1-365'; end if;
  if p ? 'due_days_after_assignment' and p ->> 'due_days_after_assignment' is not null and not ((p ->> 'due_days_after_assignment')::int between 0 and 60) then
    raise exception 'due days after assignment must be 0-60'; end if;
  if p ? 'effective_from' and coalesce(p ->> 'effective_from', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'effective_from must be YYYY-MM-DD'; end if;
  if p ? 'job_code' and p ->> 'job_code' is not null and not exists (select 1 from public.maintenance_jobs where job_code = p ->> 'job_code' and status = 'ACTIVE') then
    raise exception 'unknown or inactive job "%"', p ->> 'job_code'; end if;
end $$;

create function app.apply_maintenance_schedule(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'maintenance_schedule'); p jsonb := r.proposed_payload; s public.maintenance_schedules; v_job uuid; v_cat public.work_category;
begin
  perform app.validate_maintenance_schedule(p);
  if p ? 'job_code' and p ->> 'job_code' is not null then select id into v_job from public.maintenance_jobs where job_code = p ->> 'job_code'; end if;
  if r.action = 'CREATE' then
    if not (p ? 'schedule_code') then raise exception 'a new schedule needs schedule_code'; end if;
    v_cat := (p ->> 'work_category')::public.work_category;
    if v_job is not null and (select work_category from public.maintenance_jobs where id = v_job) <> v_cat then raise exception 'the job belongs to a different work category'; end if;
    insert into public.maintenance_schedules (id, schedule_code, schedule_name, work_category, job_id, every_n_days, uses_working_days, due_days_after_assignment, effective_from)
    values (r.target_id, p ->> 'schedule_code', btrim(p ->> 'schedule_name'), v_cat, v_job, (p ->> 'every_n_days')::int,
            coalesce((p ->> 'uses_working_days')::boolean, false), (p ->> 'due_days_after_assignment')::int, (p ->> 'effective_from')::date);
  else
    select * into s from public.maintenance_schedules where id = r.target_id;
    if not found then raise exception 'schedule not found'; end if;
    if p ? 'schedule_code' then raise exception 'a schedule code cannot be changed'; end if;
    v_cat := coalesce((p ->> 'work_category')::public.work_category, s.work_category);
    if coalesce(v_job, s.job_id) is not null and (select work_category from public.maintenance_jobs where id = coalesce(v_job, s.job_id)) <> v_cat then
      raise exception 'the job belongs to a different work category'; end if;
    update public.maintenance_schedules set
      status                    = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      schedule_name             = case when p ? 'schedule_name' then btrim(p ->> 'schedule_name') else schedule_name end,
      work_category             = v_cat,
      job_id                    = case when p ? 'job_code' then v_job else job_id end,
      every_n_days              = case when p ? 'every_n_days' then (p ->> 'every_n_days')::int else every_n_days end,
      uses_working_days         = case when p ? 'uses_working_days' then (p ->> 'uses_working_days')::boolean else uses_working_days end,
      due_days_after_assignment = case when p ? 'due_days_after_assignment' then (p ->> 'due_days_after_assignment')::int else due_days_after_assignment end,
      effective_from            = case when p ? 'effective_from' then (p ->> 'effective_from')::date else effective_from end,
      row_version               = row_version + 1
    where id = r.target_id;
  end if;
end $$;
revoke all on function app.validate_maintenance_schedule(jsonb), app.apply_maintenance_schedule(uuid) from public, anon, authenticated;
update public.master_entity_registry set is_enabled = true where entity_type = 'maintenance_schedule';

-- ---------------------------------------------------------------------------------------------
-- fleet grouping
-- ---------------------------------------------------------------------------------------------
create table public.fleet_groups (
  id                  uuid primary key default gen_random_uuid(),
  org_unit_id         uuid not null references public.depots (org_unit_id),
  schedule_id         uuid not null references public.maintenance_schedules (id),
  group_name          text not null check (length(btrim(group_name)) between 1 and 40),
  current_revision_id uuid,
  status              public.master_status not null default 'ACTIVE',
  created_at          timestamptz not null default now()
);
create unique index fleet_groups_uk on public.fleet_groups (org_unit_id, schedule_id, lower(group_name));
create table public.fleet_group_revisions (
  id                  uuid primary key default gen_random_uuid(),
  group_id            uuid not null references public.fleet_groups (id),
  org_unit_id         uuid not null references public.depots (org_unit_id),
  revision_no         int not null,
  status              text not null check (status in ('PENDING_APPROVAL', 'APPROVED', 'RETURNED', 'WITHDRAWN', 'SUPERSEDED')),
  reason_for_change   text not null check (length(btrim(reason_for_change)) > 0),
  first_schedule_date date not null,
  proposed_by         uuid not null references public.employees (id),
  submitted_at        timestamptz not null default now(),
  decided_by          uuid references public.employees (id),
  decided_at          timestamptz,
  decision_remarks    text,
  unique (group_id, revision_no),
  constraint fgr_decision_needs_remarks check (status not in ('RETURNED', 'WITHDRAWN') or length(btrim(coalesce(decision_remarks, ''))) > 0)
);
create unique index fleet_group_one_pending on public.fleet_group_revisions (group_id) where status = 'PENDING_APPROVAL';
alter table public.fleet_groups add constraint fleet_groups_current_fk foreign key (current_revision_id) references public.fleet_group_revisions (id);
create table public.fleet_group_revision_members (
  revision_id uuid not null references public.fleet_group_revisions (id),
  fleet_id    uuid not null references public.fleets (id),
  primary key (revision_id, fleet_id)
);
create trigger audit_fleet_groups after insert or update or delete on public.fleet_groups for each row execute function app.audit_row();
create trigger audit_fleet_group_revisions after insert or update or delete on public.fleet_group_revisions for each row execute function app.audit_row();

create function public.group_propose(p_schedule uuid, p_group_name text, p_fleets uuid[], p_first_date date, p_reason text, p_group uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('grouping.propose'); g public.fleet_groups; v_rev uuid := gen_random_uuid(); v_n int; v_fleets uuid[];
begin
  if not exists (select 1 from public.maintenance_schedules where id = p_schedule and status = 'ACTIVE') then raise exception 'unknown or inactive schedule'; end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'please give a reason for the change'; end if;
  if p_first_date is null then raise exception 'please give the first schedule date'; end if;
  select array_agg(distinct x) into v_fleets from unnest(coalesce(p_fleets, '{}')) as x;
  if v_fleets is null or cardinality(v_fleets) = 0 then raise exception 'choose at least one fleet'; end if;
  select count(*) into v_n from public.fleets where id = any (v_fleets) and org_unit_id = e.org_unit_id and status = 'ACTIVE';
  if v_n <> cardinality(v_fleets) then raise exception 'every fleet must be an active fleet of your depot'; end if;
  if p_group is null then
    if length(btrim(coalesce(p_group_name, ''))) = 0 then raise exception 'please name the group'; end if;
    begin
      insert into public.fleet_groups (org_unit_id, schedule_id, group_name) values (e.org_unit_id, p_schedule, btrim(p_group_name)) returning * into g;
    exception when unique_violation then raise exception 'a group named "%" already exists for this schedule', p_group_name; end;
  else
    select * into g from public.fleet_groups where id = p_group and org_unit_id = e.org_unit_id for update;
    if not found then raise exception 'group not found in your depot'; end if;
    if g.schedule_id <> p_schedule then raise exception 'the group belongs to a different schedule'; end if;
    if exists (select 1 from public.fleet_group_revisions where group_id = g.id and status = 'PENDING_APPROVAL') then raise exception 'this group already has a change waiting for approval'; end if;
  end if;
  insert into public.fleet_group_revisions (id, group_id, org_unit_id, revision_no, status, reason_for_change, first_schedule_date, proposed_by)
  values (v_rev, g.id, e.org_unit_id, coalesce((select max(revision_no) from public.fleet_group_revisions where group_id = g.id), 0) + 1,
          'PENDING_APPROVAL', btrim(p_reason), p_first_date, e.id);
  insert into public.fleet_group_revision_members (revision_id, fleet_id) select v_rev, unnest(v_fleets);
  return v_rev;
end $$;

create function public.group_withdraw(p_revision uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('grouping.propose'); r public.fleet_group_revisions;
begin
  select * into r from public.fleet_group_revisions where id = p_revision and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'proposal not found in your depot'; end if;
  if r.status <> 'PENDING_APPROVAL' then raise exception 'only a pending proposal can be withdrawn (this one is %)', r.status; end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'please give a reason for withdrawing'; end if;
  update public.fleet_group_revisions set status = 'WITHDRAWN', decided_by = e.id, decided_at = now(), decision_remarks = btrim(p_reason) where id = p_revision;
end $$;

create function public.group_decide(p_revision uuid, p_approve boolean, p_remarks text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('grouping.approve'); r public.fleet_group_revisions; g public.fleet_groups; clash text;
begin
  select * into r from public.fleet_group_revisions where id = p_revision and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'proposal not found in your depot'; end if;
  if r.status <> 'PENDING_APPROVAL' then raise exception 'this proposal is already %', r.status; end if;
  select * into g from public.fleet_groups where id = r.group_id for update;
  if not p_approve then
    if length(btrim(coalesce(p_remarks, ''))) = 0 then raise exception 'please give a reason for returning the proposal'; end if;
    update public.fleet_group_revisions set status = 'RETURNED', decided_by = e.id, decided_at = now(), decision_remarks = btrim(p_remarks) where id = p_revision;
    return;
  end if;
  -- a fleet may be in only one current group per schedule
  select f.fleet_no into clash
  from public.fleet_group_revision_members m
  join public.fleets f on f.id = m.fleet_id
  join public.fleet_groups og on og.org_unit_id = g.org_unit_id and og.schedule_id = g.schedule_id and og.id <> g.id and og.status = 'ACTIVE'
  join public.fleet_group_revision_members om on om.revision_id = og.current_revision_id and om.fleet_id = m.fleet_id
  where m.revision_id = p_revision limit 1;
  if clash is not null then raise exception 'fleet % is already in another group for this schedule', clash; end if;
  if g.current_revision_id is not null then update public.fleet_group_revisions set status = 'SUPERSEDED' where id = g.current_revision_id; end if;
  update public.fleet_group_revisions set status = 'APPROVED', decided_by = e.id, decided_at = now(), decision_remarks = nullif(btrim(p_remarks), '') where id = p_revision;
  update public.fleet_groups set current_revision_id = p_revision where id = g.id;
end $$;

-- ---------------------------------------------------------------------------------------------
-- schedule planner
-- ---------------------------------------------------------------------------------------------
create table public.schedule_instances (
  id          uuid primary key default gen_random_uuid(),
  org_unit_id uuid not null references public.depots (org_unit_id),
  schedule_id uuid not null references public.maintenance_schedules (id),
  group_id    uuid not null references public.fleet_groups (id),
  fleet_id    uuid not null references public.fleets (id),
  due_date    date not null,
  job_card_id uuid references public.job_cards (id),
  created_at  timestamptz not null default now(),
  unique (schedule_id, fleet_id, due_date)
);
create index schedule_instances_depot_due_idx on public.schedule_instances (org_unit_id, due_date);
alter table public.job_cards add constraint job_cards_schedule_instance_fk foreign key (schedule_instance_id) references public.schedule_instances (id);

-- creates the due rows of every approved group of the caller's depot between two dates (idempotent)
create function public.planner_refresh(p_from date, p_to date) returns int
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.create'); n int;
begin
  if p_from is null or p_to is null or p_to < p_from then raise exception 'choose a valid date range'; end if;
  if p_to - p_from > 62 then raise exception 'choose a range of at most 62 days'; end if;
  with grp as (
    select g.id as group_id, g.schedule_id, r.id as rev, r.first_schedule_date as first, s.every_n_days as n, s.uses_working_days as wd, s.effective_from
    from public.fleet_groups g
    join public.fleet_group_revisions r on r.id = g.current_revision_id
    join public.maintenance_schedules s on s.id = g.schedule_id and s.status = 'ACTIVE'
    where g.org_unit_id = e.org_unit_id and g.status = 'ACTIVE'),
  days as (
    select grp.*, d::date as d,
           case when grp.wd then (row_number() over (partition by grp.group_id order by d) - 1)
                else (d::date - grp.first) end as k
    from grp, generate_series(grp.first::timestamp, p_to::timestamp, interval '1 day') d
    where not grp.wd or extract(dow from d) <> 0),
  due as (select * from days where d >= p_from and d >= effective_from and k % n = 0)
  insert into public.schedule_instances (org_unit_id, schedule_id, group_id, fleet_id, due_date)
  select e.org_unit_id, due.schedule_id, due.group_id, m.fleet_id, due.d
  from due
  join public.fleet_group_revision_members m on m.revision_id = due.rev
  join public.fleets f on f.id = m.fleet_id and f.status = 'ACTIVE'
  on conflict (schedule_id, fleet_id, due_date) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create function public.schedule_create_cards(p_instances uuid[]) returns int
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.create'); i public.schedule_instances; s public.maintenance_schedules; g public.fleet_groups; v_card uuid; n int := 0; x uuid;
begin
  if p_instances is null or cardinality(p_instances) = 0 then raise exception 'select at least one due item'; end if;
  foreach x in array p_instances loop
    select * into i from public.schedule_instances where id = x and org_unit_id = e.org_unit_id for update;
    if not found then raise exception 'due item not found in your depot'; end if;
    if i.job_card_id is not null and exists (select 1 from public.job_cards where id = i.job_card_id and status <> 'CANCELLED') then continue; end if;
    select * into s from public.maintenance_schedules where id = i.schedule_id;
    select * into g from public.fleet_groups where id = i.group_id;
    v_card := public.job_card_create(i.fleet_id, s.work_category, null, null, i.due_date, s.schedule_code || ' ' || s.schedule_name || ' - group ' || g.group_name);
    update public.job_cards set source = 'SCHEDULED', schedule_instance_id = i.id where id = v_card;
    update public.schedule_instances set job_card_id = v_card where id = i.id;
    n := n + 1;
  end loop;
  return n;
end $$;

create view public.v_schedule_planner with (security_invoker = true) as
select i.id, i.org_unit_id, i.due_date, s.schedule_code, s.schedule_name, g.group_name, f.fleet_no,
       c.id as job_card_id, c.job_card_no, c.status as card_status,
       case when c.status = 'CLOSED' then 'COMPLETED'
            when c.id is not null and c.status <> 'CANCELLED' then 'JOB_CREATED'
            when i.due_date < app.business_today() then 'OVERDUE'
            else 'PLANNED' end as state
from public.schedule_instances i
join public.maintenance_schedules s on s.id = i.schedule_id
join public.fleet_groups g on g.id = i.group_id
join public.fleets f on f.id = i.fleet_id
left join public.job_cards c on c.id = i.job_card_id;

-- ---------------------------------------------------------------------------------------------
-- weekly duty roster
-- ---------------------------------------------------------------------------------------------
create table public.duty_rosters (
  id               uuid primary key default gen_random_uuid(),
  org_unit_id      uuid not null references public.depots (org_unit_id),
  week_start       date not null check (extract(dow from week_start) = 1),
  status           text not null default 'DRAFT' check (status in ('DRAFT', 'PENDING_APPROVAL', 'POSTED', 'RETURNED')),
  proposed_by      uuid not null references public.employees (id),
  submitted_at     timestamptz,
  decided_by       uuid references public.employees (id),
  decided_at       timestamptz,
  decision_remarks text,
  created_at       timestamptz not null default now(),
  unique (org_unit_id, week_start),
  constraint duty_rosters_return_needs_remarks check (status <> 'RETURNED' or length(btrim(coalesce(decision_remarks, ''))) > 0)
);
create table public.duty_roster_entries (
  roster_id   uuid not null references public.duty_rosters (id),
  employee_id uuid not null references public.employees (id),
  duty_date   date not null,
  shift_id    uuid references public.shifts (id),     -- null = off
  primary key (roster_id, employee_id, duty_date)
);
create trigger audit_duty_rosters after insert or update or delete on public.duty_rosters for each row execute function app.audit_row();

-- p_entries: [{"employee_id": uuid, "duty_date": "YYYY-MM-DD", "shift_code": "MORNING" | null}]
create function public.roster_save(p_week_start date, p_entries jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('roster.propose'); r public.duty_rosters; x jsonb; v_emp uuid; v_date date; v_shift uuid;
begin
  if p_week_start is null or extract(dow from p_week_start) <> 1 then raise exception 'a roster week starts on a Monday'; end if;
  if jsonb_typeof(p_entries) <> 'array' then raise exception 'entries must be a list'; end if;
  select * into r from public.duty_rosters where org_unit_id = e.org_unit_id and week_start = p_week_start for update;
  if found then
    if r.status in ('PENDING_APPROVAL', 'POSTED') then raise exception 'this week''s roster is already % and cannot be edited', r.status; end if;
    update public.duty_rosters set status = 'DRAFT', proposed_by = e.id where id = r.id;
    delete from public.duty_roster_entries where roster_id = r.id;
  else
    insert into public.duty_rosters (org_unit_id, week_start, proposed_by) values (e.org_unit_id, p_week_start, e.id) returning * into r;
  end if;
  for x in select * from jsonb_array_elements(p_entries) loop
    v_emp := (x ->> 'employee_id')::uuid; v_date := (x ->> 'duty_date')::date;
    if not exists (select 1 from public.employees where id = v_emp and org_unit_id = e.org_unit_id and status = 'ACTIVE' and role_code in ('TM', 'TIC')) then
      raise exception 'every person must be an active Tyre Man or Tyre IC of your depot'; end if;
    if v_date < p_week_start or v_date > p_week_start + 6 then raise exception 'duty date % is outside the week', v_date; end if;
    v_shift := null;
    if x ->> 'shift_code' is not null then
      select id into v_shift from public.shifts where shift_code = x ->> 'shift_code' and status = 'ACTIVE';
      if v_shift is null then raise exception 'unknown shift "%"', x ->> 'shift_code'; end if;
    end if;
    insert into public.duty_roster_entries (roster_id, employee_id, duty_date, shift_id) values (r.id, v_emp, v_date, v_shift)
    on conflict (roster_id, employee_id, duty_date) do update set shift_id = excluded.shift_id;
  end loop;
  return r.id;
end $$;

create function public.roster_submit(p_roster uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('roster.propose'); r public.duty_rosters;
begin
  select * into r from public.duty_rosters where id = p_roster and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'roster not found in your depot'; end if;
  if r.status not in ('DRAFT', 'RETURNED') then raise exception 'a roster that is % cannot be submitted', r.status; end if;
  if not exists (select 1 from public.duty_roster_entries where roster_id = p_roster) then raise exception 'the roster is empty'; end if;
  update public.duty_rosters set status = 'PENDING_APPROVAL', submitted_at = now(), proposed_by = e.id where id = p_roster;
end $$;

create function public.roster_decide(p_roster uuid, p_approve boolean, p_remarks text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('roster.approve'); r public.duty_rosters;
begin
  select * into r from public.duty_rosters where id = p_roster and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'roster not found in your depot'; end if;
  if r.status <> 'PENDING_APPROVAL' then raise exception 'this roster is %, not waiting for approval', r.status; end if;
  if not p_approve and length(btrim(coalesce(p_remarks, ''))) = 0 then raise exception 'please give a reason for returning the roster'; end if;
  update public.duty_rosters set status = case when p_approve then 'POSTED' else 'RETURNED' end, decided_by = e.id, decided_at = now(),
         decision_remarks = nullif(btrim(p_remarks), '') where id = p_roster;
end $$;

revoke all on function public.group_propose(uuid, text, uuid[], date, text, uuid), public.group_withdraw(uuid, text), public.group_decide(uuid, boolean, text),
  public.planner_refresh(date, date), public.schedule_create_cards(uuid[]), public.roster_save(date, jsonb), public.roster_submit(uuid),
  public.roster_decide(uuid, boolean, text) from public, anon;
grant execute on function public.group_propose(uuid, text, uuid[], date, text, uuid), public.group_withdraw(uuid, text), public.group_decide(uuid, boolean, text),
  public.planner_refresh(date, date), public.schedule_create_cards(uuid[]), public.roster_save(date, jsonb), public.roster_submit(uuid),
  public.roster_decide(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- row-level security. Depot staff read their own depot; HO / AM read all; a Tyre Man reads only a POSTED roster and his own entries.
-- ---------------------------------------------------------------------------------------------
alter table public.shifts                      enable row level security; alter table public.shifts                      force row level security;
alter table public.maintenance_schedules       enable row level security; alter table public.maintenance_schedules       force row level security;
alter table public.fleet_groups                enable row level security; alter table public.fleet_groups                force row level security;
alter table public.fleet_group_revisions       enable row level security; alter table public.fleet_group_revisions       force row level security;
alter table public.fleet_group_revision_members enable row level security; alter table public.fleet_group_revision_members force row level security;
alter table public.schedule_instances          enable row level security; alter table public.schedule_instances          force row level security;
alter table public.duty_rosters                enable row level security; alter table public.duty_rosters                force row level security;
alter table public.duty_roster_entries         enable row level security; alter table public.duty_roster_entries         force row level security;
grant select on public.shifts, public.maintenance_schedules, public.fleet_groups, public.fleet_group_revisions, public.fleet_group_revision_members,
  public.schedule_instances, public.duty_rosters, public.duty_roster_entries, public.v_schedule_planner to authenticated;

create policy gate_active_user on public.shifts                       as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.maintenance_schedules        as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.fleet_groups                 as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.fleet_group_revisions        as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.fleet_group_revision_members as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.schedule_instances           as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.duty_rosters                 as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.duty_roster_entries          as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());

create policy read_all_active on public.shifts for select to authenticated using (true);
create policy read_all_active on public.maintenance_schedules for select to authenticated using (true);
create policy read_depot on public.fleet_groups for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()) and app.my_role() <> 'TM');
create policy read_depot on public.fleet_group_revisions for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()) and app.my_role() <> 'TM');
create policy read_depot on public.fleet_group_revision_members for select to authenticated using (
  exists (select 1 from public.fleet_group_revisions r where r.id = fleet_group_revision_members.revision_id));
create policy read_depot on public.schedule_instances for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()) and app.my_role() <> 'TM');
create policy read_depot on public.duty_rosters for select to authenticated using (
  org_unit_id in (select app.my_visible_depot_ids()) and (app.my_role() <> 'TM' or status = 'POSTED'));
create policy read_depot on public.duty_roster_entries for select to authenticated using (
  exists (select 1 from public.duty_rosters r where r.id = duty_roster_entries.roster_id)
  and (app.my_role() <> 'TM' or employee_id = app.my_employee_id()));
