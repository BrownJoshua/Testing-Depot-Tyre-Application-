-- 0022: D1 schedules - Schedule Master with the prototype's frequencies, Schedule IDs (runs), Schedule Chart, Assign Technician,
-- front-tyre Rotation and Discout (D1 realignment, step 3).
-- STATUS: proposed, NOT applied.
--
--  D1 rules built here (JOB_AND_SCHEDULE_DEFINITION.md sections 4, 5, 6.3, 10):
--   * Schedule Master SCH001..007 as the prototype lists them: Air Inflation every 2 days, Nitrogen every 3, Inspection every 2, Rotation every 30,
--     Discout every 120 days or 10,000 km (whichever first), Rotation (second) inactive, Census on the 15th and 30th.
--   * A Schedule ID is ONE RUN of a Schedule Code for a period (From - To), common to all fleets of the run. The chart has one row per fleet
--     (Air Inflation, Inspection, Census) or one row per FRONT TYRE (Rotation, Discout).
--   * Rotation is due 30 days after the tyre's last rotation date, Discout 120 days after its last discout date; front tyres only (FR / FL).
--     A done Rotation / Discout sets the tyre's last dates and swaps FR <-> FL. The prototype counts calendar days and ignores the 10,000 km: so does this.
--   * Assign Technician creates one SCHEDULE job card per fleet (a Job ID for the Job Code on every tyre; Rotation / Discout: the due tyre and its FR / FL
--     partner) and assigns it; the fleets are shared among the chosen Tyre Men in turn. No inspection.
--   * Status of a chart row: On Time, Delayed (done late), Overdue (not done, any number of days), Pending, Assigned.
--  Not built: KM-based due dates (needs odometer progression), "not swapped" with reason and photo, several Job Codes in one schedule,
--  the 70-fleet Air / Inspection group alternation (use a fleet group when creating the run), the HO overdue bell.

-- ---------------------------------------------------------------------------------------------
-- schedule master as in D1
-- ---------------------------------------------------------------------------------------------
alter table public.maintenance_schedules
  add column frequency_kind text not null default 'DATE' check (frequency_kind in ('DATE', 'KM', 'DATE_KM')),
  add column particular_days int[],
  add column km_basis text check (km_basis is null or km_basis in ('SCHEDULED', 'DEAD', 'OPERATED', 'GROSS', 'LIVE_ODO')),
  add column every_km int check (every_km is null or every_km between 100 and 1000000),
  add column work_order_based boolean not null default false,
  add column outsource_employee_based boolean not null default false;
alter table public.maintenance_schedules alter column every_n_days drop not null;
alter table public.maintenance_schedules add constraint maintenance_schedules_frequency_ck check (
  (frequency_kind = 'DATE'    and (every_n_days is not null or particular_days is not null) and every_km is null) or
  (frequency_kind = 'KM'      and every_km is not null and km_basis is not null and every_n_days is null and particular_days is null) or
  (frequency_kind = 'DATE_KM' and (every_n_days is not null or particular_days is not null) and every_km is not null and km_basis is not null));

delete from public.maintenance_schedules where schedule_code not in ('SCH001', 'SCH004', 'SCH005');   -- only the batch 8 seeds can exist
insert into public.maintenance_schedules (schedule_code, schedule_name, work_category, job_id, every_n_days, effective_from, status) values
  ('SCH002', 'Air Inflation - Nitrogen Air', 'AIR_INFLATION_NITROGEN', (select id from public.maintenance_jobs where job_code = 'JOB-002'), 3, date '2026-09-01', 'ACTIVE'),
  ('SCH003', 'Inspection',                   'INSPECTION',             (select id from public.maintenance_jobs where job_code = 'JOB-003'), 2, date '2026-09-01', 'ACTIVE'),
  ('SCH006', 'Rotation (second)',            'TYRE_ROTATION',          (select id from public.maintenance_jobs where job_code = 'JOB-004'), 30, date '2026-09-01', 'INACTIVE');
insert into public.maintenance_schedules (schedule_code, schedule_name, work_category, job_id, particular_days, effective_from)
values ('SCH007', 'Census', 'CENSUS', (select id from public.maintenance_jobs where job_code = 'JOB-006'), array[15, 30], date '2026-09-01');
update public.maintenance_schedules set schedule_name = 'Air Inflation - Regular Air', uses_working_days = false where schedule_code = 'SCH001';
update public.maintenance_schedules set schedule_name = 'Rotation', uses_working_days = false where schedule_code = 'SCH004';
update public.maintenance_schedules set schedule_name = 'Discout', frequency_kind = 'DATE_KM', every_n_days = 120, km_basis = 'OPERATED', every_km = 10000, uses_working_days = false
 where schedule_code = 'SCH005';

-- the HO master functions understand the new fields
create or replace function app.validate_maintenance_schedule(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare k text; d text;
begin
  perform app.check_keys(p, array['schedule_code','schedule_name','work_category','job_code','frequency_kind','every_n_days','particular_days','km_basis','every_km',
    'uses_working_days','due_days_after_assignment','effective_from']);
  if p ? 'schedule_code' then   -- a code in the payload means a new schedule
    if coalesce(p ->> 'schedule_code', '') !~ '^SCH[0-9]{3}$' then raise exception 'schedule code must look like SCH008'; end if;
    if exists (select 1 from public.maintenance_schedules where schedule_code = p ->> 'schedule_code') then raise exception 'schedule % already exists', p ->> 'schedule_code'; end if;
    if length(btrim(coalesce(p ->> 'schedule_name', ''))) = 0 or coalesce(p ->> 'work_category', '') = '' or coalesce(p ->> 'effective_from', '') = '' then
      raise exception 'a new schedule needs schedule_name, work_category and effective_from'; end if;
    if coalesce(p ->> 'every_n_days', '') = '' and not (p ? 'particular_days') and coalesce(p ->> 'every_km', '') = '' then raise exception 'a new schedule needs a frequency'; end if;
  end if;
  if p ? 'schedule_name' and length(btrim(coalesce(p ->> 'schedule_name', ''))) = 0 then raise exception 'schedule name cannot be blank'; end if;
  if p ? 'work_category' and p ->> 'work_category' not in ('AIR_INFLATION', 'AIR_INFLATION_NITROGEN', 'INSPECTION', 'TYRE_ROTATION', 'TYRE_DISCOUT', 'CENSUS') then
    raise exception 'a schedule cannot use work category "%"', p ->> 'work_category'; end if;
  if p ? 'frequency_kind' and p ->> 'frequency_kind' not in ('DATE', 'KM', 'DATE_KM') then raise exception 'frequency must be DATE, KM or DATE_KM'; end if;
  if p ? 'every_n_days' and p ->> 'every_n_days' is not null and not ((p ->> 'every_n_days')::int between 1 and 365) then raise exception 'every_n_days must be 1-365'; end if;
  if p ? 'every_km' and p ->> 'every_km' is not null and not ((p ->> 'every_km')::int between 100 and 1000000) then raise exception 'every_km must be 100-1000000'; end if;
  if p ? 'km_basis' and p ->> 'km_basis' is not null and p ->> 'km_basis' not in ('SCHEDULED', 'DEAD', 'OPERATED', 'GROSS', 'LIVE_ODO') then raise exception 'unknown KM type "%"', p ->> 'km_basis'; end if;
  if p ? 'particular_days' and p ->> 'particular_days' is not null then
    if jsonb_typeof(p -> 'particular_days') <> 'array' or jsonb_array_length(p -> 'particular_days') = 0 then raise exception 'particular_days must be a list of days of the month'; end if;
    for d in select jsonb_array_elements_text(p -> 'particular_days') loop
      if d !~ '^[0-9]{1,2}$' or d::int not between 1 and 31 then raise exception 'a day of the month must be 1-31 (got %)', d; end if;
    end loop;
  end if;
  if p ? 'due_days_after_assignment' and p ->> 'due_days_after_assignment' is not null and not ((p ->> 'due_days_after_assignment')::int between 0 and 60) then
    raise exception 'due days after assignment must be 0-60'; end if;
  if p ? 'effective_from' and coalesce(p ->> 'effective_from', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'effective_from must be YYYY-MM-DD'; end if;
  if p ? 'job_code' and p ->> 'job_code' is not null and not exists (select 1 from public.maintenance_jobs where job_code = p ->> 'job_code' and status = 'ACTIVE') then
    raise exception 'unknown or inactive job "%"', p ->> 'job_code'; end if;
end $$;

create or replace function app.apply_maintenance_schedule(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'maintenance_schedule'); p jsonb := r.proposed_payload; s public.maintenance_schedules; v_job uuid; v_cat public.work_category;
        v_days int[]; v_kind text; v_n int; v_km int;
begin
  perform app.validate_maintenance_schedule(p);
  if p ? 'job_code' and p ->> 'job_code' is not null then select id into v_job from public.maintenance_jobs where job_code = p ->> 'job_code'; end if;
  if p ? 'particular_days' and p ->> 'particular_days' is not null then select array_agg(distinct (x)::int order by (x)::int) into v_days from jsonb_array_elements_text(p -> 'particular_days') x; end if;
  if r.action = 'CREATE' then
    if not (p ? 'schedule_code') then raise exception 'a new schedule needs schedule_code'; end if;
    v_cat := (p ->> 'work_category')::public.work_category;
    if v_job is not null and (select work_category from public.maintenance_jobs where id = v_job) <> v_cat then raise exception 'the job belongs to a different work category'; end if;
    v_n := (p ->> 'every_n_days')::int; v_km := (p ->> 'every_km')::int;
    v_kind := coalesce(p ->> 'frequency_kind', case when v_km is not null and (v_n is not null or v_days is not null) then 'DATE_KM' when v_km is not null then 'KM' else 'DATE' end);
    insert into public.maintenance_schedules (id, schedule_code, schedule_name, work_category, job_id, frequency_kind, every_n_days, particular_days, km_basis, every_km,
        uses_working_days, due_days_after_assignment, effective_from)
    values (r.target_id, p ->> 'schedule_code', btrim(p ->> 'schedule_name'), v_cat, v_job, v_kind, v_n, v_days, p ->> 'km_basis', v_km,
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
      frequency_kind            = case when p ? 'frequency_kind' then p ->> 'frequency_kind' else frequency_kind end,
      every_n_days              = case when p ? 'every_n_days' then (p ->> 'every_n_days')::int else every_n_days end,
      particular_days           = case when p ? 'particular_days' then v_days else particular_days end,
      km_basis                  = case when p ? 'km_basis' then p ->> 'km_basis' else km_basis end,
      every_km                  = case when p ? 'every_km' then (p ->> 'every_km')::int else every_km end,
      uses_working_days         = case when p ? 'uses_working_days' then (p ->> 'uses_working_days')::boolean else uses_working_days end,
      due_days_after_assignment = case when p ? 'due_days_after_assignment' then (p ->> 'due_days_after_assignment')::int else due_days_after_assignment end,
      effective_from            = case when p ? 'effective_from' then (p ->> 'effective_from')::date else effective_from end,
      row_version               = row_version + 1
    where id = r.target_id;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Schedule IDs (runs) and chart rows
-- ---------------------------------------------------------------------------------------------
drop function if exists public.planner_refresh(date, date);
drop table if exists public.schedule_instances;

update public.document_number_series set is_confirmed = true, start_value = 4101, evidence_note = 'SCHID-4001 (D1 prototype)' where series_code = 'SCHID';
delete from public.document_sequences where series_code = 'SCHID';

create table public.schedule_runs (
  id            uuid primary key default gen_random_uuid(),
  schedule_no   text not null unique,                       -- SCHID-4101
  org_unit_id   uuid not null references public.depots (org_unit_id),
  schedule_id   uuid not null references public.maintenance_schedules (id),
  from_date     date not null,
  to_date       date not null check (to_date >= from_date),
  created_by    uuid not null references public.employees (id),
  created_at    timestamptz not null default now()
);
create index schedule_runs_depot_idx on public.schedule_runs (org_unit_id, from_date);
create table public.schedule_items (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.schedule_runs (id),
  org_unit_id  uuid not null references public.depots (org_unit_id),
  fleet_id     uuid not null references public.fleets (id),
  tyre_id      uuid references public.tyres (id),            -- Rotation / Discout rows are per front tyre
  due_date     date not null,
  done_date    date,
  job_card_id  uuid references public.job_cards (id),
  moved_reason text,
  unique nulls not distinct (run_id, fleet_id, tyre_id, due_date)
);
create index schedule_items_run_idx on public.schedule_items (run_id, due_date);
create index schedule_items_card_idx on public.schedule_items (job_card_id) where job_card_id is not null;
alter table public.job_cards add column schedule_run_id uuid references public.schedule_runs (id);
create trigger audit_schedule_runs after insert or update or delete on public.schedule_runs for each row execute function app.audit_row();
create trigger audit_schedule_items after insert or update or delete on public.schedule_items for each row execute function app.audit_row();

create view public.v_schedule_chart with (security_invoker = true) as
select i.id, i.run_id, r.schedule_no, s.schedule_code, s.schedule_name, i.org_unit_id, i.fleet_id, f.fleet_no, f.registration_no,
       i.tyre_id, t.mtc_no as tyre_no, t.fitted_position as position, i.due_date, i.done_date, i.job_card_id, c.job_card_no, c.status as card_status,
       t.last_rotation_date, t.last_discout_date,
       case when i.done_date is not null then case when i.done_date <= i.due_date then 'ON_TIME' else 'DELAYED' end
            when i.due_date < app.business_today() then 'OVERDUE'
            when i.job_card_id is not null then 'ASSIGNED'
            else 'PENDING' end as state
from public.schedule_items i
join public.schedule_runs r on r.id = i.run_id
join public.maintenance_schedules s on s.id = r.schedule_id
join public.fleets f on f.id = i.fleet_id
left join public.tyres t on t.id = i.tyre_id
left join public.job_cards c on c.id = i.job_card_id;

-- Create Schedule ID: one run of a schedule for a period; p_fleets null = every active fleet of the depot
create function public.schedule_run_create(p_schedule uuid, p_from date, p_to date, p_fleets uuid[] default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.create'); s public.maintenance_schedules; v_run uuid := gen_random_uuid(); v_job text; v_fleets uuid[]; n int; d date;
begin
  select * into s from public.maintenance_schedules where id = p_schedule and status = 'ACTIVE';
  if not found then raise exception 'unknown or inactive schedule'; end if;
  if p_from is null or p_to is null or p_to < p_from then raise exception 'choose a valid period (From to To)'; end if;
  if p_to - p_from > 366 then raise exception 'a Schedule ID covers at most 366 days'; end if;
  if s.job_id is null then raise exception 'schedule % has no job code', s.schedule_code; end if;
  select job_code into v_job from public.maintenance_jobs where id = s.job_id;
  select array_agg(f.id) into v_fleets from public.fleets f where f.org_unit_id = e.org_unit_id and f.status = 'ACTIVE' and (p_fleets is null or f.id = any (p_fleets));
  if v_fleets is null or (p_fleets is not null and cardinality(v_fleets) <> cardinality(p_fleets)) then raise exception 'every fleet must be an active fleet of your depot'; end if;

  insert into public.schedule_runs (id, schedule_no, org_unit_id, schedule_id, from_date, to_date, created_by)
  values (v_run, app.next_doc_no('SCHID', null, app.business_today()), e.org_unit_id, p_schedule, p_from, p_to, e.id);

  if v_job in ('JOB-004', 'JOB-005') then
    -- per FRONT tyre: due = last rotation (or discout) date + the interval; a tyre never done counts from the date it was fitted
    insert into public.schedule_items (run_id, org_unit_id, fleet_id, tyre_id, due_date)
    select v_run, e.org_unit_id, t.fleet_id, t.id,
           coalesce(case when v_job = 'JOB-005' then t.last_discout_date else t.last_rotation_date end, t.last_rotation_date, t.fitted_date) + s.every_n_days
    from public.tyres t
    where t.fleet_id = any (v_fleets) and t.stock_place = 'FITTED' and t.fitted_position in ('FR', 'FL')
      and coalesce(case when v_job = 'JOB-005' then t.last_discout_date else t.last_rotation_date end, t.last_rotation_date, t.fitted_date) is not null
      and coalesce(case when v_job = 'JOB-005' then t.last_discout_date else t.last_rotation_date end, t.last_rotation_date, t.fitted_date) + s.every_n_days <= p_to;
  else
    for d in select g::date from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') g loop
      if (s.particular_days is not null and extract(day from d)::int = any (s.particular_days))
         or (s.particular_days is null and s.every_n_days is not null and (d - p_from) % s.every_n_days = 0) then
        insert into public.schedule_items (run_id, org_unit_id, fleet_id, due_date) select v_run, e.org_unit_id, f, d from unnest(v_fleets) f;
      end if;
    end loop;
  end if;
  select count(*) into n from public.schedule_items where run_id = v_run;
  if n = 0 then raise exception 'nothing falls due in this period'; end if;
  return v_run;
end $$;

-- Prepone / Postpone one chart row
create function public.schedule_item_move(p_item uuid, p_new_date date, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.create'); i public.schedule_items;
begin
  select * into i from public.schedule_items where id = p_item and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'chart row not found in your depot'; end if;
  if i.done_date is not null then raise exception 'this work is already done'; end if;
  if p_new_date is null or p_new_date = i.due_date then raise exception 'choose a different date'; end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'please give a reason'; end if;
  update public.schedule_items set due_date = p_new_date, moved_reason = btrim(p_reason) where id = p_item;
  if i.job_card_id is not null then update public.job_cards set expected_date = p_new_date where id = i.job_card_id and status not in ('COMPLETED', 'CLOSED'); end if;
end $$;

-- Assign Technician: one schedule job card per fleet, assigned at once; fleets are shared among the chosen Tyre Men in turn
create function public.schedule_assign(p_run uuid, p_items uuid[], p_employees uuid[], p_due date default null, p_shift uuid default null, p_remarks text default null)
returns int language plpgsql security definer set search_path = '' as $$
declare
  e public.employees := app.actor('job_card.assign'); r public.schedule_runs; s public.maintenance_schedules; v_job uuid; v_code text; fl uuid; k int := 0; v_cards int := 0;
  v_card uuid; v_emps uuid[]; v_emp uuid; t record; v_tyres uuid[]; v_min date; v_exp date; n int; v_id uuid;
begin
  select * into r from public.schedule_runs where id = p_run and org_unit_id = e.org_unit_id;
  if not found then raise exception 'Schedule ID not found in your depot'; end if;
  select * into s from public.maintenance_schedules where id = r.schedule_id;
  select id, job_code into v_job, v_code from public.maintenance_jobs where id = s.job_id;
  if p_items is null or cardinality(p_items) = 0 then raise exception 'select at least one chart row'; end if;
  select array_agg(distinct x) into v_emps from unnest(coalesce(p_employees, '{}')) as x;
  if v_emps is null then raise exception 'choose at least one Tyre Man'; end if;
  select count(*) into n from public.employees where id = any (v_emps) and org_unit_id = e.org_unit_id and status = 'ACTIVE' and role_code in ('TM', 'TIC');
  if n <> cardinality(v_emps) then raise exception 'every person must be an active Tyre Man or Tyre IC of your depot'; end if;
  select count(*) into n from public.schedule_items where id = any (p_items) and run_id = p_run and job_card_id is null and done_date is null;
  if n <> cardinality(p_items) then raise exception 'every selected row must belong to this Schedule ID and still be without a job card'; end if;

  for fl in select distinct fleet_id from public.schedule_items where id = any (p_items) order by 1 loop
    select min(due_date) into v_min from public.schedule_items where id = any (p_items) and fleet_id = fl;
    v_exp := coalesce(p_due, greatest(v_min, app.business_today()));
    if v_code in ('JOB-004', 'JOB-005') then
      -- the due front tyres and their FR <-> FL partners
      select array_agg(distinct x) into v_tyres from (
        select i.tyre_id as x from public.schedule_items i where i.id = any (p_items) and i.fleet_id = fl
        union
        select p.id from public.schedule_items i join public.tyres d on d.id = i.tyre_id
          join public.tyres p on p.fleet_id = d.fleet_id and p.stock_place = 'FITTED' and p.fitted_position = case d.fitted_position when 'FR' then 'FL' else 'FR' end
        where i.id = any (p_items) and i.fleet_id = fl) q;
    else
      select array_agg(id) into v_tyres from public.tyres where fleet_id = fl and stock_place = 'FITTED';
    end if;
    if v_tyres is null then continue; end if;   -- a fleet with no tyre fitted has nothing to do
    v_card := gen_random_uuid();
    insert into public.job_cards (id, job_card_no, org_unit_id, job_type, fleet_id, status, expected_date, expected_shift_id, instruction, created_by, schedule_run_id)
    values (v_card, app.next_doc_no('JC', null, app.business_today()), e.org_unit_id, 'SCHEDULE', fl, 'ASSIGNED_FOR_WORK', v_exp, p_shift,
            r.schedule_no || ' ' || s.schedule_name, e.id, p_run);
    v_emp := v_emps[1 + (k % cardinality(v_emps))];
    for t in select unnest(v_tyres) as tyre loop
      v_id := app.new_job_id(v_card, v_job, t.tyre, fl, null, e.org_unit_id);
      update public.job_ids set status = 'ASSIGNED', due_date = v_exp, due_shift_id = p_shift where id = v_id;
      insert into public.job_id_assignees (job_id_ref, employee_id) values (v_id, v_emp);
    end loop;
    perform app.recompute_card_minutes(v_card);
    insert into public.work_assignments (job_card_id, org_unit_id, due_date, shift_id, employees, remarks, assigned_by)
    values (v_card, e.org_unit_id, v_exp, p_shift, array[v_emp], nullif(btrim(p_remarks), ''), e.id);
    update public.schedule_items set job_card_id = v_card where id = any (p_items) and fleet_id = fl;
    perform app.log_event(v_card, null, 'CREATED FROM ' || r.schedule_no, e.id, p_remarks);
    perform app.log_event(v_card, null, 'ASSIGNED_FOR_WORK', e.id);
    k := k + 1; v_cards := v_cards + 1;
  end loop;
  return v_cards;
end $$;

-- when a Job ID of a schedule card is done: chart rows get their done date; Rotation / Discout set the tyre dates and swap FR <-> FL
create function app.on_job_done(p_job uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare j public.job_ids; c public.job_cards; v_code text; today date := app.business_today(); t1 uuid; t2 uuid;
begin
  select * into j from public.job_ids where id = p_job;
  select * into c from public.job_cards where id = j.job_card_id;
  if c.job_type <> 'SCHEDULE' then return; end if;
  select job_code into v_code from public.maintenance_jobs where id = j.job_code_id;
  update public.schedule_items set done_date = today where job_card_id = c.id and tyre_id = j.tyre_id and done_date is null;
  if not exists (select 1 from public.job_ids where job_card_id = c.id and status not in ('DONE', 'CLOSED') and id <> p_job) then
    update public.schedule_items set done_date = today where job_card_id = c.id and tyre_id is null and done_date is null;
  end if;
  if v_code in ('JOB-004', 'JOB-005') and j.tyre_id is not null then
    update public.tyres set last_rotation_date = today, last_discout_date = case when v_code = 'JOB-005' then today else last_discout_date end where id = j.tyre_id;
    if not exists (select 1 from public.job_ids x where x.job_card_id = c.id and x.job_code_id = j.job_code_id and x.status not in ('DONE', 'CLOSED') and x.id <> p_job) then
      select max(case when t.fitted_position = 'FR' then t.id::text end)::uuid, max(case when t.fitted_position = 'FL' then t.id::text end)::uuid into t1, t2
      from public.job_ids x join public.tyres t on t.id = x.tyre_id where x.job_card_id = c.id and x.job_code_id = j.job_code_id and t.stock_place = 'FITTED' and t.fleet_id = c.fleet_id;
      if t1 is not null and t2 is not null then   -- swap through a placeholder position: one tyre per position at all times
        update public.tyres set fitted_position = 'XX' where id = t1;
        update public.tyres set fitted_position = 'FR' where id = t2;
        update public.tyres set fitted_position = 'FL' where id = t1;
      end if;
    end if;
  end if;
end $$;

create or replace function public.job_id_complete(p_job uuid, p_on_behalf_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); j public.job_ids; v_mine boolean; v_behalf boolean;
begin
  select * into j from public.job_ids where id = p_job and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'Job ID not found in your depot'; end if;
  v_mine := exists (select 1 from public.job_id_assignees where job_id_ref = p_job and employee_id = e.id);
  v_behalf := not v_mine;
  if v_behalf then
    if not app.has_capability('job.onbehalf') then raise exception 'this Job ID is not assigned to you' using errcode = 'insufficient_privilege'; end if;
    if length(btrim(coalesce(p_on_behalf_reason, ''))) = 0 then raise exception 'please give a reason for entering the work on behalf of the Tyre Man'; end if;
  elsif not app.has_capability('job.execute') then
    raise exception 'your role is not allowed to do this' using errcode = 'insufficient_privilege';
  end if;
  if j.status = 'ASSIGNED' and not v_behalf then raise exception 'press Start Work first'; end if;
  if j.status not in ('ASSIGNED', 'STARTED') then raise exception 'a Job ID that is % cannot be completed', j.status; end if;
  update public.job_ids set status = 'DONE', started_at = coalesce(started_at, now()), done_at = now(), done_by = e.id,
         on_behalf_by = case when v_behalf then e.id end, on_behalf_reason = case when v_behalf then btrim(p_on_behalf_reason) end where id = p_job;
  perform app.log_event(j.job_card_id, p_job, case when v_behalf then 'DONE_ON_BEHALF' else 'DONE' end, e.id, p_on_behalf_reason);
  perform app.on_job_done(p_job);
  if not exists (select 1 from public.job_ids where job_card_id = j.job_card_id and status not in ('DONE', 'CLOSED')) then
    update public.job_cards set status = 'FINAL_INSPECTION' where id = j.job_card_id and status in ('ASSIGNED_FOR_WORK');
    perform app.log_event(j.job_card_id, null, 'FINAL_INSPECTION_DUE', e.id);
  end if;
end $$;

revoke all on function app.on_job_done(uuid) from public, anon, authenticated;
revoke all on function public.schedule_run_create(uuid, date, date, uuid[]), public.schedule_item_move(uuid, date, text),
  public.schedule_assign(uuid, uuid[], uuid[], date, uuid, text) from public, anon;
grant execute on function public.schedule_run_create(uuid, date, date, uuid[]), public.schedule_item_move(uuid, date, text),
  public.schedule_assign(uuid, uuid[], uuid[], date, uuid, text) to authenticated;

alter table public.schedule_runs  enable row level security; alter table public.schedule_runs  force row level security;
alter table public.schedule_items enable row level security; alter table public.schedule_items force row level security;
grant select on public.schedule_runs, public.schedule_items, public.v_schedule_chart to authenticated;
create policy gate_active_user on public.schedule_runs  as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.schedule_items as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy read_depot on public.schedule_runs  for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()) and app.my_role() <> 'TM');
create policy read_depot on public.schedule_items for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()) and app.my_role() <> 'TM');
