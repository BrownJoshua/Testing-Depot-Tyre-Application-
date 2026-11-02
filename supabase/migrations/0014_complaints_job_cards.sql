-- 0014: Complaint Master, complaints, job cards, job tasks, assignment and final inspection (Stage 5a, batch 7).
-- STATUS: proposed, NOT applied. Review and approve before running.
--
--  * Complaint Master goes through the HO -> AM approval engine (payload keys: complaint_code, complaint_name,
--    required_jobs[list of job codes]; a code in the payload means CREATE; the code is immutable).
--    The 12 complaint types are the ones in the prototype's log-sheet form. Their codes (CT-001..CT-012) and the
--    "required jobs" links are NOT in the prototype, so codes are placeholders and no required jobs are seeded.
--  * Operational documents are written only by the SECURITY DEFINER functions below (no direct write grants):
--      raise_complaint, complaint_reject, job_card_create, job_task_assign, job_card_cancel,
--      job_task_start, job_task_submit, final_inspection.
--    Every function checks the caller's capability AND that the record belongs to the caller's own depot.
--  * Defaults used for open questions (flagged, switchable later in role_capabilities):
--      UQ-06  Supervisor only monitors job cards (the SUP job-card capabilities stay disabled); the Tyre IC verifies.
--      UQ-04  reschedule approval is not built in this batch.
--      UQ-41  JC / JID / CMPID number formats are provisional (usable in demonstration mode only).
--  * A "Tyre Changing" job card is a chain of four tasks: Removal -> Unsetting -> Setting -> Fitment. A task cannot
--    start until the task it depends on is submitted. Task assignments of one card may differ.
--  * Execution detail (readings, WSR, holds, photos) belongs to Stage 6; here a task is started and submitted, by its
--    Tyre Man or, with a reason, by the Tyre IC on their behalf.

-- ---------------------------------------------------------------------------------------------
-- enums
-- ---------------------------------------------------------------------------------------------
create type public.job_source      as enum ('SCHEDULED', 'COMPLAINT', 'REACTIVE');
create type public.job_card_status as enum ('NOT_ASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'AWAITING_WSR',
                                            'AWAITING_FINAL_INSPECTION', 'REWORK', 'CLOSED', 'CANCELLED');
create type public.task_status     as enum ('NOT_ASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'AWAITING_WSR',
                                            'SUBMITTED', 'COMPLETED', 'REWORK', 'CANCELLED');
create type public.complaint_status as enum ('NEW', 'ASSIGNED', 'CLOSED', 'REJECTED');

-- ---------------------------------------------------------------------------------------------
-- complaint master
-- ---------------------------------------------------------------------------------------------
create table public.complaint_types (
  id             uuid primary key default gen_random_uuid(),
  complaint_code text not null unique check (complaint_code ~ '^[A-Z0-9-]{3,12}$'),
  complaint_name text not null check (length(btrim(complaint_name)) > 0),
  status         public.master_status not null default 'ACTIVE',
  row_version    int not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index complaint_types_name_uk on public.complaint_types (lower(complaint_name));
create table public.complaint_type_jobs (
  complaint_type_id uuid not null references public.complaint_types (id),
  job_id            uuid not null references public.maintenance_jobs (id),
  primary key (complaint_type_id, job_id)
);
create trigger complaint_types_touch before update on public.complaint_types for each row execute function app.set_updated_at();
create trigger audit_complaint_types after insert or update or delete on public.complaint_types for each row execute function app.audit_row();

insert into public.complaint_types (complaint_code, complaint_name)
select 'CT-' || lpad(n::text, 3, '0'), name from (values
  (1, 'Weak / faulty valve'), (2, 'Continuous leakage (slow puncture)'), (3, 'Puncture — nail / foreign object'),
  (4, 'Tyre burst / blowout'), (5, 'Wrong tyre fitted — number does not match this position'), (6, 'Sidewall damage / bulge'),
  (7, 'Tread worn below limit'), (8, 'Uneven / irregular wear'), (9, 'Cracks on tread / sidewall'),
  (10, 'Rim / flap / tube fault'), (11, 'Air valve cap missing'), (12, 'Other (see remarks)')) as t(n, name);

create function app.validate_complaint_type(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare j text;
begin
  perform app.check_keys(p, array['complaint_code','complaint_name','required_jobs']);
  if p ? 'complaint_code' then
    if coalesce(p ->> 'complaint_code', '') !~ '^[A-Z0-9-]{3,12}$' then raise exception 'complaint code must be 3-12 characters: A-Z, 0-9, hyphen'; end if;
    if exists (select 1 from public.complaint_types where complaint_code = p ->> 'complaint_code') then raise exception 'complaint code % already exists', p ->> 'complaint_code'; end if;
    if length(btrim(coalesce(p ->> 'complaint_name', ''))) = 0 then raise exception 'a new complaint type needs complaint_name'; end if;
  end if;
  if p ? 'complaint_name' then
    if length(btrim(coalesce(p ->> 'complaint_name', ''))) = 0 then raise exception 'complaint name cannot be blank'; end if;
    if p ? 'complaint_code' and exists (select 1 from public.complaint_types where lower(complaint_name) = lower(btrim(p ->> 'complaint_name'))) then
      raise exception 'complaint type "%" already exists', p ->> 'complaint_name'; end if;
  end if;
  if p ? 'required_jobs' then
    if jsonb_typeof(p -> 'required_jobs') <> 'array' then raise exception 'required_jobs must be a list'; end if;
    for j in select jsonb_array_elements_text(p -> 'required_jobs') loop
      if not exists (select 1 from public.maintenance_jobs where job_code = j and status = 'ACTIVE') then raise exception 'unknown or inactive job "%"', j; end if;
    end loop;
  end if;
end $$;

create function app.apply_complaint_type(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'complaint_type'); p jsonb := r.proposed_payload; j text;
begin
  perform app.validate_complaint_type(p);
  if r.action = 'CREATE' then
    if not (p ? 'complaint_code') then raise exception 'a new complaint type needs complaint_code'; end if;
    insert into public.complaint_types (id, complaint_code, complaint_name) values (r.target_id, p ->> 'complaint_code', btrim(p ->> 'complaint_name'));
  else
    if not exists (select 1 from public.complaint_types where id = r.target_id) then raise exception 'complaint type not found'; end if;
    if p ? 'complaint_code' then raise exception 'a complaint code cannot be changed'; end if;
    if p ? 'complaint_name' and exists (select 1 from public.complaint_types where lower(complaint_name) = lower(btrim(p ->> 'complaint_name')) and id <> r.target_id) then
      raise exception 'complaint type "%" already exists', p ->> 'complaint_name'; end if;
    update public.complaint_types set
      status         = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      complaint_name = case when p ? 'complaint_name' then btrim(p ->> 'complaint_name') else complaint_name end,
      row_version    = row_version + 1
    where id = r.target_id;
  end if;
  if p ? 'required_jobs' then
    delete from public.complaint_type_jobs where complaint_type_id = r.target_id;
    for j in select distinct jsonb_array_elements_text(p -> 'required_jobs') loop
      insert into public.complaint_type_jobs (complaint_type_id, job_id) select r.target_id, id from public.maintenance_jobs where job_code = j;
    end loop;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- operational tables
-- ---------------------------------------------------------------------------------------------
create table public.complaints (
  id               uuid primary key default gen_random_uuid(),
  complaint_no     text not null unique,
  org_unit_id      uuid not null references public.depots (org_unit_id),
  source           text not null check (source in ('LOG_SHEET', 'TYRE_IC', 'TYRE_MAN')),
  fleet_id         uuid not null references public.fleets (id),
  position         text,
  complaint_type_id uuid not null references public.complaint_types (id),
  remarks          text,
  log_sheet        jsonb,                                  -- driver_name, driver_ref, shift, route, run_km, shed_in_time (Supervisor entry)
  raised_by        uuid not null references public.employees (id),
  raised_at        timestamptz not null default now(),
  status           public.complaint_status not null default 'NEW',
  decided_by       uuid references public.employees (id),
  decided_at       timestamptz,
  decision_remarks text,
  job_card_id      uuid,
  constraint complaints_reject_needs_remarks check (status <> 'REJECTED' or length(btrim(coalesce(decision_remarks, ''))) > 0),
  constraint complaints_log_sheet_needs_driver check (source <> 'LOG_SHEET' or length(btrim(coalesce(log_sheet ->> 'driver_name', ''))) > 0)
);
create index complaints_depot_status_idx on public.complaints (org_unit_id, status);
create index complaints_fleet_idx on public.complaints (fleet_id);

create table public.job_cards (
  id               uuid primary key default gen_random_uuid(),
  job_card_no      text not null unique,
  org_unit_id      uuid not null references public.depots (org_unit_id),
  work_category    public.work_category not null,
  source           public.job_source not null,
  fleet_id         uuid not null references public.fleets (id),
  complaint_id     uuid references public.complaints (id),
  status           public.job_card_status not null default 'NOT_ASSIGNED',
  due_date         date not null,
  instruction      text,
  cancel_reason    text,
  cancelled_by     uuid references public.employees (id),
  closed_at        timestamptz,
  created_by       uuid not null references public.employees (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint job_cards_cancel_needs_reason check (status <> 'CANCELLED' or length(btrim(coalesce(cancel_reason, ''))) > 0)
);
alter table public.complaints add constraint complaints_job_card_fk foreign key (job_card_id) references public.job_cards (id);
create index job_cards_depot_status_idx on public.job_cards (org_unit_id, status, due_date);
create index job_cards_fleet_idx on public.job_cards (fleet_id);
create index job_cards_category_idx on public.job_cards (work_category);

create table public.job_tasks (
  id                   uuid primary key default gen_random_uuid(),
  job_task_no          text not null unique,
  job_card_id          uuid not null references public.job_cards (id),
  org_unit_id          uuid not null references public.depots (org_unit_id),
  seq                  smallint not null,
  job_id               uuid references public.maintenance_jobs (id),
  work_category        public.work_category not null,
  position             text,
  depends_on_task_id   uuid references public.job_tasks (id),
  assigned_employee_id uuid references public.employees (id),
  status               public.task_status not null default 'NOT_ASSIGNED',
  due_date             date,
  started_at           timestamptz,
  submitted_at         timestamptz,
  completed_at         timestamptz,
  submitted_on_behalf_by uuid references public.employees (id),
  on_behalf_reason     text,
  updated_at           timestamptz not null default now(),
  unique (job_card_id, seq),
  constraint job_tasks_on_behalf_needs_reason check (submitted_on_behalf_by is null or length(btrim(coalesce(on_behalf_reason, ''))) > 0)
);
create index job_tasks_assignee_idx on public.job_tasks (assigned_employee_id, status, due_date);
create index job_tasks_card_idx on public.job_tasks (job_card_id);

create table public.job_assignments (
  id                 uuid primary key default gen_random_uuid(),
  task_id            uuid not null references public.job_tasks (id),
  assignee_id        uuid not null references public.employees (id),
  due_date           date,
  assignment_type    text not null check (assignment_type in ('ASSIGN', 'REPLACE')),
  replaced_assignee_id uuid references public.employees (id),
  remarks            text,
  is_current         boolean not null default true,
  assigned_by        uuid not null references public.employees (id),
  created_at         timestamptz not null default now(),
  constraint job_assignments_replace_needs_reason check (assignment_type <> 'REPLACE' or length(btrim(coalesce(remarks, ''))) > 0)
);
create index job_assignments_task_idx on public.job_assignments (task_id);

create table public.final_inspections (
  id                 uuid primary key default gen_random_uuid(),
  job_card_id        uuid not null references public.job_cards (id),
  inspector_id       uuid not null references public.employees (id),
  result             text not null check (result in ('PASS', 'FAIL')),
  remarks            text,
  inspected_at       timestamptz not null default now(),
  constraint final_inspections_fail_needs_remarks check (result <> 'FAIL' or length(btrim(coalesce(remarks, ''))) > 0)
);
create index final_inspections_card_idx on public.final_inspections (job_card_id);

-- append-only timeline of everything that happens to a card or task
create table public.job_card_events (
  id          uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards (id),
  task_id     uuid references public.job_tasks (id),
  event       text not null,
  actor_id    uuid references public.employees (id),
  remarks     text,
  created_at  timestamptz not null default now()
);
create index job_card_events_card_idx on public.job_card_events (job_card_id, created_at);
create trigger job_card_events_append_only before update or delete on public.job_card_events for each row execute function app.forbid_change();
create trigger job_card_events_no_truncate before truncate on public.job_card_events for each statement execute function app.forbid_change();

create trigger job_cards_touch before update on public.job_cards for each row execute function app.set_updated_at();
create trigger job_tasks_touch before update on public.job_tasks for each row execute function app.set_updated_at();
create trigger audit_complaints        after insert or update or delete on public.complaints        for each row execute function app.audit_row();
create trigger audit_job_cards         after insert or update or delete on public.job_cards         for each row execute function app.audit_row();
create trigger audit_job_tasks         after insert or update or delete on public.job_tasks         for each row execute function app.audit_row();
create trigger audit_final_inspections after insert or update or delete on public.final_inspections for each row execute function app.audit_row();

-- ---------------------------------------------------------------------------------------------
-- internal helpers
-- ---------------------------------------------------------------------------------------------
-- the signed-in employee, after checking capability and that they belong to a depot
create function app.actor(p_cap text) returns public.employees
language plpgsql stable security definer set search_path = '' as $$
declare e public.employees;
begin
  select * into e from public.employees where id = app.my_employee_id();
  if e.id is null then raise exception 'not signed in as an active employee' using errcode = 'insufficient_privilege'; end if;
  if p_cap is not null and not app.has_capability(p_cap) then raise exception 'your role is not allowed to do this' using errcode = 'insufficient_privilege'; end if;
  if e.org_unit_id is null then raise exception 'only depot staff can do this' using errcode = 'insufficient_privilege'; end if;
  return e;
end $$;

create function app.log_event(p_card uuid, p_task uuid, p_event text, p_actor uuid, p_remarks text default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.job_card_events (job_card_id, task_id, event, actor_id, remarks) values (p_card, p_task, p_event, p_actor, nullif(btrim(p_remarks), ''));
$$;

-- recompute the card status from its tasks (never touches CLOSED / CANCELLED)
create function app.refresh_card(p_card uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.job_cards; n_live int; n_sub int; n_prog int; n_rework int; n_assigned int; v public.job_card_status;
begin
  select * into c from public.job_cards where id = p_card;
  if c.status in ('CLOSED', 'CANCELLED') then return; end if;
  select count(*) filter (where status <> 'CANCELLED'),
         count(*) filter (where status = 'SUBMITTED'),
         count(*) filter (where status = 'IN_PROGRESS'),
         count(*) filter (where status = 'REWORK'),
         count(*) filter (where status in ('ASSIGNED', 'REWORK', 'IN_PROGRESS', 'SUBMITTED'))
    into n_live, n_sub, n_prog, n_rework, n_assigned
  from public.job_tasks where job_card_id = p_card;
  v := case
         when n_live = 0 then c.status
         when n_sub = n_live then 'AWAITING_FINAL_INSPECTION'
         when n_prog > 0 or (n_sub > 0 and n_sub < n_live) then 'IN_PROGRESS'
         when n_rework > 0 then 'REWORK'
         when n_assigned = n_live then 'ASSIGNED'
         else 'NOT_ASSIGNED' end;
  if v is distinct from c.status then update public.job_cards set status = v where id = p_card; end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- complaints
-- ---------------------------------------------------------------------------------------------
create function public.raise_complaint(p_fleet uuid, p_position text, p_type uuid, p_remarks text, p_log_sheet jsonb default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('complaint.raise'); f public.fleets; v_id uuid := gen_random_uuid(); v_source text;
begin
  select * into f from public.fleets where id = p_fleet and org_unit_id = e.org_unit_id and status = 'ACTIVE';
  if not found then raise exception 'that fleet is not an active fleet of your depot'; end if;
  if not exists (select 1 from public.complaint_types where id = p_type and status = 'ACTIVE') then raise exception 'unknown or inactive complaint type'; end if;
  if p_position is not null and p_position <> '' and not (p_position = any (f.position_layout)) then raise exception 'position % does not exist on fleet %', p_position, f.fleet_no; end if;
  v_source := case e.role_code when 'SUP' then 'LOG_SHEET' when 'TIC' then 'TYRE_IC' else 'TYRE_MAN' end;
  if v_source = 'LOG_SHEET' and length(btrim(coalesce(p_log_sheet ->> 'driver_name', ''))) = 0 then raise exception 'a log-sheet complaint needs the driver name'; end if;
  insert into public.complaints (id, complaint_no, org_unit_id, source, fleet_id, position, complaint_type_id, remarks, log_sheet, raised_by)
  values (v_id, app.next_doc_no('CMPID', null, app.business_today()), e.org_unit_id, v_source, p_fleet, nullif(p_position, ''), p_type,
          nullif(btrim(p_remarks), ''), case when v_source = 'LOG_SHEET' then p_log_sheet end, e.id);
  return v_id;
end $$;

create function public.complaint_reject(p_id uuid, p_remarks text) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('complaint.triage'); c public.complaints;
begin
  select * into c from public.complaints where id = p_id and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'complaint not found in your depot'; end if;
  if c.status <> 'NEW' then raise exception 'only a new complaint can be rejected (this one is %)', c.status; end if;
  if length(btrim(coalesce(p_remarks, ''))) = 0 then raise exception 'please give a reason for rejecting the complaint'; end if;
  update public.complaints set status = 'REJECTED', decided_by = e.id, decided_at = now(), decision_remarks = btrim(p_remarks) where id = p_id;
end $$;

-- ---------------------------------------------------------------------------------------------
-- job cards
-- ---------------------------------------------------------------------------------------------
create function public.job_card_create(p_fleet uuid, p_category public.work_category, p_complaint uuid default null,
                                       p_position text default null, p_due date default null, p_instruction text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  e public.employees := app.actor('job_card.create'); f public.fleets; c public.complaints;
  v_card uuid := gen_random_uuid(); v_due date := coalesce(p_due, app.business_today()); v_prev uuid; v_task uuid; v_seq int := 0; cat public.work_category; cats public.work_category[];
begin
  select * into f from public.fleets where id = p_fleet and org_unit_id = e.org_unit_id and status = 'ACTIVE';
  if not found then raise exception 'that fleet is not an active fleet of your depot'; end if;
  if v_due < app.business_today() - 30 then raise exception 'due date is too far in the past'; end if;
  if p_position is not null and p_position <> '' and not (p_position = any (f.position_layout)) then raise exception 'position % does not exist on fleet %', p_position, f.fleet_no; end if;
  if p_complaint is not null then
    select * into c from public.complaints where id = p_complaint and org_unit_id = e.org_unit_id for update;
    if not found then raise exception 'complaint not found in your depot'; end if;
    if c.status <> 'NEW' then raise exception 'complaint % is already %', c.complaint_no, c.status; end if;
    if c.fleet_id <> p_fleet then raise exception 'the complaint is for a different fleet'; end if;
  end if;

  insert into public.job_cards (id, job_card_no, org_unit_id, work_category, source, fleet_id, complaint_id, due_date, instruction, created_by)
  values (v_card, app.next_doc_no('JC', null, app.business_today()), e.org_unit_id, p_category,
          case when p_complaint is null then 'REACTIVE'::public.job_source else 'COMPLAINT'::public.job_source end,
          p_fleet, p_complaint, v_due, nullif(btrim(p_instruction), ''), e.id);

  cats := case p_category when 'TYRE_CHANGING' then array['TYRE_REMOVAL', 'TYRE_UNSETTING', 'TYRE_SETTING', 'TYRE_FITMENT']::public.work_category[]
                          else array[p_category] end;
  foreach cat in array cats loop
    v_seq := v_seq + 1;
    insert into public.job_tasks (job_task_no, job_card_id, org_unit_id, seq, job_id, work_category, position, depends_on_task_id, due_date)
    values (app.next_doc_no('JID', null, app.business_today()), v_card, e.org_unit_id, v_seq,
            (select j.id from public.maintenance_jobs j where j.work_category = cat and j.status = 'ACTIVE'
               and (j.fleet_type_id is null or j.fleet_type_id = f.fleet_type_id) order by (j.fleet_type_id is null) limit 1),
            cat, nullif(p_position, ''), v_prev, v_due)
    returning id into v_task;
    v_prev := v_task;
  end loop;

  if p_complaint is not null then
    update public.complaints set status = 'ASSIGNED', decided_by = e.id, decided_at = now(), job_card_id = v_card where id = p_complaint;
  end if;
  perform app.log_event(v_card, null, 'CREATED', e.id, p_instruction);
  return v_card;
end $$;

create function public.job_task_assign(p_task uuid, p_employee uuid, p_due date default null, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.assign'); t public.job_tasks; w public.employees; v_type text;
begin
  select * into t from public.job_tasks where id = p_task and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'job not found in your depot'; end if;
  if t.status not in ('NOT_ASSIGNED', 'ASSIGNED', 'REWORK') then raise exception 'a job that is % cannot be assigned', t.status; end if;
  select * into w from public.employees where id = p_employee and org_unit_id = e.org_unit_id and status = 'ACTIVE' and role_code in ('TM', 'TIC');
  if not found then raise exception 'the person must be an active Tyre Man or Tyre IC of your depot'; end if;
  if t.assigned_employee_id = p_employee then raise exception 'this job is already assigned to that person'; end if;
  v_type := case when t.assigned_employee_id is null then 'ASSIGN' else 'REPLACE' end;
  if v_type = 'REPLACE' and length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'please give a reason for replacing the assignee'; end if;
  update public.job_assignments set is_current = false where task_id = p_task and is_current;
  insert into public.job_assignments (task_id, assignee_id, due_date, assignment_type, replaced_assignee_id, remarks, assigned_by)
  values (p_task, p_employee, coalesce(p_due, t.due_date), v_type, t.assigned_employee_id, nullif(btrim(p_reason), ''), e.id);
  update public.job_tasks set assigned_employee_id = p_employee, due_date = coalesce(p_due, due_date),
         status = case when status = 'NOT_ASSIGNED' then 'ASSIGNED'::public.task_status else status end where id = p_task;
  perform app.log_event(t.job_card_id, p_task, v_type || ' ' || w.employee_code, e.id, p_reason);
  perform app.refresh_card(t.job_card_id);
end $$;

create function public.job_card_cancel(p_card uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.create'); c public.job_cards;
begin
  select * into c from public.job_cards where id = p_card and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'job card not found in your depot'; end if;
  if c.status in ('CLOSED', 'CANCELLED') then raise exception 'a % job card cannot be cancelled', c.status; end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'please give a reason for cancelling'; end if;
  update public.job_tasks set status = 'CANCELLED' where job_card_id = p_card and status <> 'COMPLETED';
  update public.job_cards set status = 'CANCELLED', cancel_reason = btrim(p_reason), cancelled_by = e.id where id = p_card;
  if c.complaint_id is not null then   -- the complaint goes back to the queue so it can be handled again
    update public.complaints set status = 'NEW', job_card_id = null where id = c.complaint_id and status = 'ASSIGNED';
  end if;
  perform app.log_event(p_card, null, 'CANCELLED', e.id, p_reason);
end $$;

-- ---------------------------------------------------------------------------------------------
-- execution (detail comes in Stage 6)
-- ---------------------------------------------------------------------------------------------
create function public.job_task_start(p_task uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job.execute'); t public.job_tasks; d public.job_tasks;
begin
  select * into t from public.job_tasks where id = p_task and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'job not found in your depot'; end if;
  if t.assigned_employee_id is distinct from e.id then raise exception 'this job is not assigned to you'; end if;
  if t.status not in ('ASSIGNED', 'REWORK') then raise exception 'a job that is % cannot be started', t.status; end if;
  if t.depends_on_task_id is not null then
    select * into d from public.job_tasks where id = t.depends_on_task_id;
    if d.status not in ('SUBMITTED', 'COMPLETED') then raise exception 'this job waits for the previous step (%) to be submitted', d.work_category; end if;
  end if;
  update public.job_tasks set status = 'IN_PROGRESS', started_at = coalesce(started_at, now()) where id = p_task;
  perform app.log_event(t.job_card_id, p_task, 'STARTED', e.id);
  perform app.refresh_card(t.job_card_id);
end $$;

create function public.job_task_submit(p_task uuid, p_on_behalf_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); t public.job_tasks; v_behalf boolean; d public.job_tasks;
begin
  select * into t from public.job_tasks where id = p_task and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'job not found in your depot'; end if;
  v_behalf := t.assigned_employee_id is distinct from e.id;
  if v_behalf then
    if not app.has_capability('job.onbehalf') then raise exception 'this job is not assigned to you' using errcode = 'insufficient_privilege'; end if;
    if length(btrim(coalesce(p_on_behalf_reason, ''))) = 0 then raise exception 'please give a reason for submitting on behalf of the assignee'; end if;
  elsif not app.has_capability('job.execute') then
    raise exception 'your role is not allowed to do this' using errcode = 'insufficient_privilege';
  end if;
  if t.status not in ('ASSIGNED', 'IN_PROGRESS', 'REWORK') then raise exception 'a job that is % cannot be submitted', t.status; end if;
  if t.depends_on_task_id is not null then
    select * into d from public.job_tasks where id = t.depends_on_task_id;
    if d.status not in ('SUBMITTED', 'COMPLETED') then raise exception 'this job waits for the previous step (%) to be submitted', d.work_category; end if;
  end if;
  update public.job_tasks set status = 'SUBMITTED', submitted_at = now(), started_at = coalesce(started_at, now()),
         submitted_on_behalf_by = case when v_behalf then e.id end, on_behalf_reason = case when v_behalf then btrim(p_on_behalf_reason) end
  where id = p_task;
  perform app.log_event(t.job_card_id, p_task, case when v_behalf then 'SUBMITTED_ON_BEHALF' else 'SUBMITTED' end, e.id, p_on_behalf_reason);
  perform app.refresh_card(t.job_card_id);
end $$;

create function public.final_inspection(p_card uuid, p_result text, p_remarks text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job.final_inspect'); c public.job_cards;
begin
  select * into c from public.job_cards where id = p_card and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'job card not found in your depot'; end if;
  if c.status <> 'AWAITING_FINAL_INSPECTION' then raise exception 'the job card is %, not awaiting final inspection', c.status; end if;
  if p_result not in ('PASS', 'FAIL') then raise exception 'result must be PASS or FAIL'; end if;
  if p_result = 'FAIL' and length(btrim(coalesce(p_remarks, ''))) = 0 then raise exception 'please say what must be redone'; end if;
  insert into public.final_inspections (job_card_id, inspector_id, result, remarks) values (p_card, e.id, p_result, nullif(btrim(p_remarks), ''));
  if p_result = 'PASS' then
    update public.job_tasks set status = 'COMPLETED', completed_at = now() where job_card_id = p_card and status = 'SUBMITTED';
    update public.job_cards set status = 'CLOSED', closed_at = now() where id = p_card;
    if c.complaint_id is not null then update public.complaints set status = 'CLOSED' where id = c.complaint_id; end if;
  else
    update public.job_tasks set status = 'REWORK' where job_card_id = p_card and status = 'SUBMITTED';
    update public.job_cards set status = 'REWORK' where id = p_card;
  end if;
  perform app.log_event(p_card, null, 'FINAL_INSPECTION_' || p_result, e.id, p_remarks);
end $$;

revoke all on function app.validate_complaint_type(jsonb), app.apply_complaint_type(uuid), app.actor(text),
  app.log_event(uuid, uuid, text, uuid, text), app.refresh_card(uuid) from public, anon, authenticated;
revoke all on function public.raise_complaint(uuid, text, uuid, text, jsonb), public.complaint_reject(uuid, text),
  public.job_card_create(uuid, public.work_category, uuid, text, date, text), public.job_task_assign(uuid, uuid, date, text),
  public.job_card_cancel(uuid, text), public.job_task_start(uuid), public.job_task_submit(uuid, text),
  public.final_inspection(uuid, text, text) from public, anon;
grant execute on function public.raise_complaint(uuid, text, uuid, text, jsonb), public.complaint_reject(uuid, text),
  public.job_card_create(uuid, public.work_category, uuid, text, date, text), public.job_task_assign(uuid, uuid, date, text),
  public.job_card_cancel(uuid, text), public.job_task_start(uuid), public.job_task_submit(uuid, text),
  public.final_inspection(uuid, text, text) to authenticated;

update public.master_entity_registry set is_enabled = true where entity_type = 'complaint_type';

-- ---------------------------------------------------------------------------------------------
-- row-level security: HO / AM read every depot; depot staff read their own depot; a Tyre Man reads only
-- the jobs assigned to them (and the cards those jobs belong to). Nobody writes directly.
-- ---------------------------------------------------------------------------------------------
alter table public.complaint_types     enable row level security; alter table public.complaint_types     force row level security;
alter table public.complaint_type_jobs enable row level security; alter table public.complaint_type_jobs force row level security;
alter table public.complaints          enable row level security; alter table public.complaints          force row level security;
alter table public.job_cards           enable row level security; alter table public.job_cards           force row level security;
alter table public.job_tasks           enable row level security; alter table public.job_tasks           force row level security;
alter table public.job_assignments     enable row level security; alter table public.job_assignments     force row level security;
alter table public.final_inspections   enable row level security; alter table public.final_inspections   force row level security;
alter table public.job_card_events     enable row level security; alter table public.job_card_events     force row level security;
grant select on public.complaint_types, public.complaint_type_jobs, public.complaints, public.job_cards, public.job_tasks,
  public.job_assignments, public.final_inspections, public.job_card_events to authenticated;

create policy gate_active_user on public.complaint_types     as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.complaint_type_jobs as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.complaints          as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.job_cards           as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.job_tasks           as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.job_assignments     as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.final_inspections   as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.job_card_events     as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());

create policy read_all_active on public.complaint_types     for select to authenticated using (true);
create policy read_all_active on public.complaint_type_jobs for select to authenticated using (true);

create policy read_depot on public.complaints for select to authenticated using (
  org_unit_id in (select app.my_visible_depot_ids()) and (app.my_role() <> 'TM' or raised_by = app.my_employee_id()));
create policy read_depot on public.job_tasks for select to authenticated using (
  org_unit_id in (select app.my_visible_depot_ids()) and (app.my_role() <> 'TM' or assigned_employee_id = app.my_employee_id()));
create policy read_depot on public.job_cards for select to authenticated using (
  org_unit_id in (select app.my_visible_depot_ids())
  and (app.my_role() <> 'TM' or exists (select 1 from public.job_tasks t where t.job_card_id = job_cards.id)));
create policy read_depot on public.job_assignments for select to authenticated using (
  exists (select 1 from public.job_tasks t where t.id = job_assignments.task_id));
create policy read_depot on public.final_inspections for select to authenticated using (
  exists (select 1 from public.job_cards c where c.id = final_inspections.job_card_id));
create policy read_depot on public.job_card_events for select to authenticated using (
  exists (select 1 from public.job_cards c where c.id = job_card_events.job_card_id));
