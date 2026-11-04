-- 0019: Job model v2 - the D1 prototype's job card, Job ID, complaint inspection and Final Inspection (D1 realignment, step 2).
-- STATUS: proposed, NOT applied.
--
--  Replaces the batch 7 tables (job_cards, job_tasks, job_assignments, final_inspections, job_card_events, complaints) and the
--  batch 8 planner pieces that depended on them (v_schedule_planner, schedule_create_cards): the planner returns in step 3.
--  Demonstration data created while testing batch 7 is dropped with them.
--
--  D1 rules built here (JOB_AND_SCHEDULE_DEFINITION.md, DATA_MODEL.md):
--   * One job card = one fleet (or no fleet for live-stock work). A Job ID = ONE Job Code on ONE tyre. Running numbers without date.
--   * Job card types: COMPLAINT, JOB_CODE (SCHEDULE cards come from a Schedule ID in step 3).
--   * Statuses: Draft, Assigned for Inspection, Inspection Done, Assigned for Work, Final Inspection, Final Inspection Failed, Completed, Closed.
--     There is NO cancel.
--   * A complaint never becomes a job directly: the Tyre IC assigns an inspection (Tyre IC or Tyre Man); the inspector approves or rejects
--     every complaint (a rejection needs a reason) and may add new complaints (approved at once). Approved complaints become Job IDs
--     (suggested Job Codes come from the complaint master; the inspector may change them). A rejected complaint can be re-inspected or closed.
--   * Work: inspection and work are separate people; a Job ID goes to 1-3 Tyre Men; Start Work; the Tyre IC may enter the work on behalf
--     (reason); when every Job ID is done the card goes to Final Inspection: Pass (Completed), Fail, or Rework (a new Job ID per picked Job ID).
--   * Estimated time of a Job ID = minutes per fleet + minutes per tyre x tyres of the card; the card total is the sum.
--   * Assumptions flagged: Fail leaves the card at "Final Inspection Failed" and it can be inspected again (the meaning of Fail is open in D1);
--     remarks are required for Fail and Rework; a Job Code card needs no inspection.
--   NOT built yet (later steps): Schedule cards, Tyre Changing swap, WSR / MRN / GRN / orders, scrap return, Hold.

-- ---------------------------------------------------------------------------------------------
-- remove the batch 7 / 8 pieces that this replaces
-- ---------------------------------------------------------------------------------------------
drop view if exists public.v_schedule_planner;
drop function if exists public.schedule_create_cards(uuid[]);
alter table public.schedule_instances drop column if exists job_card_id;
drop function if exists public.raise_complaint(uuid, text, uuid, text, jsonb);
drop function if exists public.complaint_reject(uuid, text);
drop function if exists public.job_card_create(uuid, public.work_category, uuid, text, date, text);
drop function if exists public.job_task_assign(uuid, uuid, date, text);
drop function if exists public.job_card_cancel(uuid, text);
drop function if exists public.job_task_start(uuid);
drop function if exists public.job_task_submit(uuid, text);
drop function if exists public.final_inspection(uuid, text, text);
drop function if exists app.refresh_card(uuid);
drop function if exists app.log_event(uuid, uuid, text, uuid, text);
drop table public.job_card_events;
drop table public.final_inspections;
drop table public.job_assignments;
drop table public.job_tasks cascade;   -- a read policy on job_cards depended on it
alter table public.complaints drop constraint complaints_job_card_fk;
drop table public.job_cards;
drop table public.complaints;
drop type public.job_source;
drop type public.job_card_status;
drop type public.task_status;
drop type public.complaint_status;

-- ---------------------------------------------------------------------------------------------
-- job master as in D1: JOB-007 and JOB-012 exist but are inactive; minutes per fleet and per tyre
-- ---------------------------------------------------------------------------------------------
alter table public.maintenance_jobs drop constraint maintenance_jobs_job_code_check;
alter table public.maintenance_jobs add constraint maintenance_jobs_job_code_check check (job_code ~ '^JOB-[0-9]{3}$');
delete from public.maintenance_jobs where job_code = 'JOB-013';   -- created by the batch 7 browser test, not a D1 job
insert into public.maintenance_jobs (job_code, job_name, work_category, status) values
  ('JOB-007', 'Tyre Changing', 'TYRE_CHANGING', 'INACTIVE'),
  ('JOB-012', 'Air Inflation', 'AIR_INFLATION', 'INACTIVE')
on conflict (job_code) do nothing;
update public.maintenance_jobs m set est_minutes_per_fleet = v.f, est_minutes_per_tyre = v.t
from (values ('JOB-001', 30, 5), ('JOB-002', 36, 6), ('JOB-003', 30, 5), ('JOB-004', 20, 10), ('JOB-005', 20, 10), ('JOB-006', 30, 5),
             ('JOB-007', 25, 25), ('JOB-008', 20, 20), ('JOB-009', 20, 20), ('JOB-010', 30, 30), ('JOB-011', 25, 25), ('JOB-012', 60, 10)) as v(code, f, t)
where m.job_code = v.code;

-- the validate function no longer reserves JOB-007
create or replace function app.validate_maintenance_job(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform app.check_keys(p, array['job_code','job_name','work_category','est_minutes_per_fleet','est_minutes_per_tyre','fleet_make','fleet_model']);
  if p ? 'job_code' then   -- a job code in the payload means a new job
    if coalesce(p ->> 'job_code', '') !~ '^JOB-[0-9]{3}$' then raise exception 'job code must look like JOB-013'; end if;
    if exists (select 1 from public.maintenance_jobs where job_code = p ->> 'job_code') then raise exception 'job % already exists', p ->> 'job_code'; end if;
    if length(btrim(coalesce(p ->> 'job_name', ''))) = 0 or coalesce(p ->> 'work_category', '') = '' then
      raise exception 'a new job needs job_name and work_category'; end if;
  end if;
  if p ? 'job_name' and length(btrim(coalesce(p ->> 'job_name', ''))) = 0 then raise exception 'job name cannot be blank'; end if;
  if p ? 'work_category' and p ->> 'work_category' not in (select unnest(enum_range(null::public.work_category))::text) then
    raise exception 'unknown work category "%"', p ->> 'work_category'; end if;
  if p ? 'est_minutes_per_fleet' and p ->> 'est_minutes_per_fleet' is not null and not ((p ->> 'est_minutes_per_fleet')::int between 1 and 1440) then
    raise exception 'minutes per fleet must be 1-1440'; end if;
  if p ? 'est_minutes_per_tyre' and p ->> 'est_minutes_per_tyre' is not null and not ((p ->> 'est_minutes_per_tyre')::int between 1 and 1440) then
    raise exception 'minutes per tyre must be 1-1440'; end if;
  if (p ? 'fleet_make') <> (p ? 'fleet_model') then raise exception 'send fleet_make and fleet_model together'; end if;
  if p ? 'fleet_make' and p ->> 'fleet_make' is not null
     and not exists (select 1 from public.fleet_types where lower(fleet_make) = lower(p ->> 'fleet_make') and lower(fleet_model) = lower(p ->> 'fleet_model') and status = 'ACTIVE') then
    raise exception 'unknown or inactive fleet type "% %"', p ->> 'fleet_make', p ->> 'fleet_model'; end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- running numbers (no date), continuing after the prototype's sample numbers; the formats were seen in the prototype
-- ---------------------------------------------------------------------------------------------
update public.document_number_series set is_confirmed = true, start_value = 6201, evidence_note = 'JC-6063 (D1 prototype)' where series_code = 'JC';
update public.document_number_series set is_confirmed = true, start_value = 4201, evidence_note = 'JID-4021 (D1 prototype)' where series_code = 'JID';
update public.document_number_series set is_confirmed = true, start_value = 601,  evidence_note = 'CMPID-0505 (D1 prototype)' where series_code = 'CMPID';
insert into public.document_number_series (series_code, label, template, scope, reset_policy, seq_width, start_value, is_confirmed, evidence_note)
values ('INSID', 'Inspection', 'INSID-{SEQ}', 'GLOBAL', 'NEVER', 4, 1, true, 'INSID-0001 (D1 prototype)')
on conflict (series_code) do nothing;
delete from public.document_sequences where series_code in ('JC', 'JID', 'CMPID', 'INSID');

-- ---------------------------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------------------------
create type public.jc_status as enum ('DRAFT', 'ASSIGNED_FOR_INSPECTION', 'INSPECTION_DONE', 'ASSIGNED_FOR_WORK', 'FINAL_INSPECTION',
                                      'FINAL_INSPECTION_FAILED', 'COMPLETED', 'CLOSED');

create table public.complaints (
  id                uuid primary key default gen_random_uuid(),
  complaint_no      text not null unique,                       -- CMPID-0601 (running)
  org_unit_id       uuid not null references public.depots (org_unit_id),
  source            text not null check (source in ('TYRE_MAN', 'LOG_SHEET', 'TYRE_IC', 'INSPECTION')),
  fleet_id          uuid not null references public.fleets (id),
  tyre_id           uuid references public.tyres (id),
  complaint_type_id uuid not null references public.complaint_types (id),
  remarks           text,
  photo_data        text check (photo_data is null or length(photo_data) <= 600000),   -- a shrunk JPEG data URL
  log_sheet         jsonb,                                       -- driver_name, driver_ref, run_km (Supervisor entry)
  raised_by         uuid not null references public.employees (id),
  raised_at         timestamptz not null default now(),
  state             text not null default 'NEW' check (state in ('NEW', 'PENDING_INSPECTION', 'APPROVED', 'REJECTED', 'CLOSED')),
  job_card_id       uuid,
  inspection_id     uuid,
  decided_by        uuid references public.employees (id),
  decided_at        timestamptz,
  decision_reason   text,
  constraint complaints_reject_needs_reason check (state <> 'REJECTED' or length(btrim(coalesce(decision_reason, ''))) > 0),
  constraint complaints_log_sheet_needs_driver check (source <> 'LOG_SHEET' or length(btrim(coalesce(log_sheet ->> 'driver_name', ''))) > 0)
);
create index complaints_depot_state_idx on public.complaints (org_unit_id, state);
create index complaints_fleet_idx on public.complaints (fleet_id);

create table public.job_cards (
  id               uuid primary key default gen_random_uuid(),
  job_card_no      text not null unique,                        -- JC-6201 (running)
  org_unit_id      uuid not null references public.depots (org_unit_id),
  job_type         text not null check (job_type in ('COMPLAINT', 'JOB_CODE', 'SCHEDULE')),
  fleet_id         uuid references public.fleets (id),          -- null = "No fleet" (live stock work)
  fleet2_id        uuid references public.fleets (id),          -- only a Tyre Changing swap has two fleets (later step)
  vehicle_source   text not null default 'MTC',
  status           public.jc_status not null default 'DRAFT',
  expected_date    date not null,
  expected_shift_id uuid references public.shifts (id),
  estimated_minutes int not null default 0,
  instruction      text,
  created_by       uuid not null references public.employees (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  completed_at     timestamptz
);
create index job_cards_depot_status_idx on public.job_cards (org_unit_id, status, expected_date);
create index job_cards_fleet_idx on public.job_cards (fleet_id);
alter table public.complaints add constraint complaints_job_card_fk foreign key (job_card_id) references public.job_cards (id);

create table public.inspections (
  id             uuid primary key default gen_random_uuid(),
  inspection_no  text not null unique,                          -- INSID-0001
  job_card_id    uuid not null references public.job_cards (id),
  org_unit_id    uuid not null references public.depots (org_unit_id),
  inspector_id   uuid not null references public.employees (id),
  assigned_by    uuid not null references public.employees (id),
  due_date       date not null,
  shift_id       uuid references public.shifts (id),
  remarks        text,
  status         text not null default 'ASSIGNED' check (status in ('ASSIGNED', 'DONE')),
  result_remarks text,
  created_at     timestamptz not null default now(),
  done_at        timestamptz
);
create index inspections_card_idx on public.inspections (job_card_id);
create index inspections_inspector_idx on public.inspections (inspector_id, status);
alter table public.complaints add constraint complaints_inspection_fk foreign key (inspection_id) references public.inspections (id);

create table public.job_ids (
  id                uuid primary key default gen_random_uuid(),
  job_id_no         text not null unique,                       -- JID-4201 (running)
  job_card_id       uuid not null references public.job_cards (id),
  org_unit_id       uuid not null references public.depots (org_unit_id),
  job_code_id       uuid not null references public.maintenance_jobs (id),
  tyre_id           uuid references public.tyres (id),
  fleet_id          uuid references public.fleets (id),
  complaint_id      uuid references public.complaints (id),
  status            text not null default 'PENDING' check (status in ('PENDING', 'LOCKED', 'WAITING_FOR_TYRE', 'ASSIGNED', 'STARTED', 'DONE', 'CLOSED')),
  due_date          date,
  due_shift_id      uuid references public.shifts (id),
  estimated_minutes int not null default 0,
  started_at        timestamptz,
  done_at           timestamptz,
  done_by           uuid references public.employees (id),
  on_behalf_by      uuid references public.employees (id),
  on_behalf_reason  text,
  rework_of         uuid references public.job_ids (id),
  created_at        timestamptz not null default now(),
  constraint job_ids_on_behalf_needs_reason check (on_behalf_by is null or length(btrim(coalesce(on_behalf_reason, ''))) > 0)
);
create index job_ids_card_idx on public.job_ids (job_card_id);
create index job_ids_tyre_idx on public.job_ids (tyre_id) where tyre_id is not null;
create table public.job_id_assignees (
  job_id_ref  uuid not null references public.job_ids (id),
  employee_id uuid not null references public.employees (id),
  primary key (job_id_ref, employee_id)
);
create index job_id_assignees_emp_idx on public.job_id_assignees (employee_id);

create table public.work_assignments (
  id              uuid primary key default gen_random_uuid(),
  job_card_id     uuid not null references public.job_cards (id),
  org_unit_id     uuid not null references public.depots (org_unit_id),
  due_date        date not null,
  shift_id        uuid references public.shifts (id),
  employee_source text not null default 'MTC' check (employee_source in ('MTC', 'OUTSOURCE')),
  employees       uuid[] not null,
  remarks         text,
  assigned_by     uuid not null references public.employees (id),
  created_at      timestamptz not null default now()
);

create table public.final_inspections (
  id           uuid primary key default gen_random_uuid(),
  job_card_id  uuid not null references public.job_cards (id),
  inspector_id uuid not null references public.employees (id),
  result       text not null check (result in ('PASS', 'FAIL', 'REWORK')),
  remarks      text,
  inspected_at timestamptz not null default now(),
  constraint final_inspections_needs_remarks check (result = 'PASS' or length(btrim(coalesce(remarks, ''))) > 0)
);
create index final_inspections_card_idx on public.final_inspections (job_card_id);

create table public.job_card_events (
  id          uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards (id),
  job_id_ref  uuid references public.job_ids (id),
  event       text not null,
  actor_id    uuid references public.employees (id),
  remarks     text,
  created_at  timestamptz not null default now()
);
create index job_card_events_card_idx on public.job_card_events (job_card_id, created_at);
create trigger job_card_events_append_only before update or delete on public.job_card_events for each row execute function app.forbid_change();
create trigger job_card_events_no_truncate before truncate on public.job_card_events for each statement execute function app.forbid_change();

create trigger job_cards_touch before update on public.job_cards for each row execute function app.set_updated_at();
create trigger audit_complaints        after insert or update or delete on public.complaints        for each row execute function app.audit_row();
create trigger audit_job_cards         after insert or update or delete on public.job_cards         for each row execute function app.audit_row();
create trigger audit_inspections       after insert or update or delete on public.inspections       for each row execute function app.audit_row();
create trigger audit_job_ids           after insert or update or delete on public.job_ids           for each row execute function app.audit_row();
create trigger audit_final_inspections after insert or update or delete on public.final_inspections for each row execute function app.audit_row();

-- ---------------------------------------------------------------------------------------------
-- helpers (internal)
-- ---------------------------------------------------------------------------------------------
create function app.log_event(p_card uuid, p_job uuid, p_event text, p_actor uuid, p_remarks text default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.job_card_events (job_card_id, job_id_ref, event, actor_id, remarks) values (p_card, p_job, p_event, p_actor, nullif(btrim(p_remarks), ''));
$$;

-- estimated minutes of one Job ID: per fleet + per tyre x tyres of the card
create function app.job_minutes(p_job_code uuid, p_card_tyres int) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(est_minutes_per_fleet, 0) + coalesce(est_minutes_per_tyre, 0) * greatest(p_card_tyres, 0) from public.maintenance_jobs where id = p_job_code;
$$;

create function app.card_tyres(p_card uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(distinct tyre_id)::int from public.job_ids where job_card_id = p_card and tyre_id is not null and rework_of is null;
$$;

-- re-estimate every Job ID and the total of a card
create function app.recompute_card_minutes(p_card uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare n int := app.card_tyres(p_card);
begin
  update public.job_ids set estimated_minutes = app.job_minutes(job_code_id, n) where job_card_id = p_card;
  update public.job_cards set estimated_minutes = coalesce((select sum(estimated_minutes) from public.job_ids where job_card_id = p_card), 0) where id = p_card;
end $$;

-- create one Job ID (Job Code x tyre) on a card
create function app.new_job_id(p_card uuid, p_job_code uuid, p_tyre uuid, p_fleet uuid, p_complaint uuid, p_org uuid, p_rework_of uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid := gen_random_uuid();
begin
  if not exists (select 1 from public.maintenance_jobs where id = p_job_code and status = 'ACTIVE') then
    raise exception 'the job code is not active'; end if;
  insert into public.job_ids (id, job_id_no, job_card_id, org_unit_id, job_code_id, tyre_id, fleet_id, complaint_id, rework_of)
  values (v, app.next_doc_no('JID', null, app.business_today()), p_card, p_org, p_job_code, p_tyre, p_fleet, p_complaint, p_rework_of);
  return v;
end $$;

-- ---------------------------------------------------------------------------------------------
-- complaints
-- ---------------------------------------------------------------------------------------------
create function public.raise_complaint(p_fleet uuid, p_tyre uuid, p_type uuid, p_remarks text default null, p_photo text default null, p_log_sheet jsonb default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('complaint.raise'); v_id uuid := gen_random_uuid(); v_source text;
begin
  if not exists (select 1 from public.fleets where id = p_fleet and org_unit_id = e.org_unit_id and status = 'ACTIVE') then raise exception 'that fleet is not an active fleet of your depot'; end if;
  if p_tyre is not null and not exists (select 1 from public.tyres where id = p_tyre and fleet_id = p_fleet and stock_place = 'FITTED') then raise exception 'that tyre is not fitted on this fleet'; end if;
  if not exists (select 1 from public.complaint_types where id = p_type and status = 'ACTIVE') then raise exception 'unknown or inactive complaint type'; end if;
  v_source := case e.role_code when 'SUP' then 'LOG_SHEET' when 'TIC' then 'TYRE_IC' else 'TYRE_MAN' end;
  if v_source = 'LOG_SHEET' and length(btrim(coalesce(p_log_sheet ->> 'driver_name', ''))) = 0 then raise exception 'a log-sheet complaint needs the driver name'; end if;
  insert into public.complaints (id, complaint_no, org_unit_id, source, fleet_id, tyre_id, complaint_type_id, remarks, photo_data, log_sheet, raised_by)
  values (v_id, app.next_doc_no('CMPID', null, app.business_today()), e.org_unit_id, v_source, p_fleet, p_tyre, p_type, nullif(btrim(p_remarks), ''), nullif(p_photo, ''),
          case when v_source = 'LOG_SHEET' then p_log_sheet end, e.id);
  return v_id;
end $$;

-- ---------------------------------------------------------------------------------------------
-- job cards
-- ---------------------------------------------------------------------------------------------
-- p_new_complaints: [{"tyre_id": uuid|null, "complaint_type_id": uuid, "remarks": text}]  (complaint cards)
-- p_job_codes + p_tyres: one Job ID for every Job Code on every tyre (job code cards)
create function public.job_card_create(p_type text, p_fleet uuid, p_tyres uuid[] default '{}', p_job_codes text[] default '{}', p_complaints uuid[] default '{}',
                                       p_new_complaints jsonb default '[]', p_expected date default null, p_shift uuid default null, p_instruction text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  e public.employees := app.actor('job_card.create'); v_card uuid := gen_random_uuid(); v_exp date := coalesce(p_expected, app.business_today());
  x jsonb; c uuid; code text; ty uuid; v_n int; v_job uuid; v_tyres uuid[];
begin
  if p_type not in ('COMPLAINT', 'JOB_CODE') then raise exception 'job card type must be COMPLAINT or JOB_CODE (schedule cards come from a Schedule ID)'; end if;
  if p_fleet is not null and not exists (select 1 from public.fleets where id = p_fleet and org_unit_id = e.org_unit_id and status = 'ACTIVE') then
    raise exception 'that fleet is not an active fleet of your depot'; end if;
  if p_shift is not null and not exists (select 1 from public.shifts where id = p_shift and status = 'ACTIVE') then raise exception 'unknown shift'; end if;
  if v_exp < app.business_today() - 30 then raise exception 'expected date is too far in the past'; end if;
  select array_agg(distinct t) into v_tyres from unnest(coalesce(p_tyres, '{}')) as t;

  if p_type = 'COMPLAINT' then
    if p_fleet is null then raise exception 'a complaint job card needs a fleet'; end if;
    if coalesce(cardinality(p_complaints), 0) = 0 and jsonb_array_length(coalesce(p_new_complaints, '[]')) = 0 then raise exception 'choose or add at least one complaint'; end if;
  else
    if coalesce(cardinality(p_job_codes), 0) = 0 then raise exception 'choose at least one job code'; end if;
    if v_tyres is null then raise exception 'choose at least one tyre'; end if;
    select count(*) into v_n from public.tyres where id = any (v_tyres) and owner_org_unit_id = e.org_unit_id
       and ((p_fleet is not null and fleet_id = p_fleet and stock_place = 'FITTED') or (p_fleet is null and stock_place = 'LIVE_STOCK'));
    if v_n <> cardinality(v_tyres) then raise exception 'every tyre must be fitted on the chosen fleet (or in live stock when no fleet is chosen)'; end if;
  end if;

  insert into public.job_cards (id, job_card_no, org_unit_id, job_type, fleet_id, expected_date, expected_shift_id, instruction, created_by)
  values (v_card, app.next_doc_no('JC', null, app.business_today()), e.org_unit_id, p_type, p_fleet, v_exp, p_shift, nullif(btrim(p_instruction), ''), e.id);

  if p_type = 'COMPLAINT' then
    foreach c in array coalesce(p_complaints, '{}') loop
      update public.complaints set state = 'PENDING_INSPECTION', job_card_id = v_card
      where id = c and org_unit_id = e.org_unit_id and fleet_id = p_fleet and state = 'NEW';
      if not found then raise exception 'complaint is not a new complaint of this fleet in your depot'; end if;
    end loop;
    for x in select * from jsonb_array_elements(coalesce(p_new_complaints, '[]')) loop
      ty := nullif(x ->> 'tyre_id', '')::uuid;
      if ty is not null and not exists (select 1 from public.tyres where id = ty and fleet_id = p_fleet and stock_place = 'FITTED') then raise exception 'a complaint tyre is not fitted on this fleet'; end if;
      if not exists (select 1 from public.complaint_types where id = (x ->> 'complaint_type_id')::uuid and status = 'ACTIVE') then raise exception 'unknown or inactive complaint type'; end if;
      insert into public.complaints (complaint_no, org_unit_id, source, fleet_id, tyre_id, complaint_type_id, remarks, raised_by, state, job_card_id)
      values (app.next_doc_no('CMPID', null, app.business_today()), e.org_unit_id, 'TYRE_IC', p_fleet, ty, (x ->> 'complaint_type_id')::uuid, nullif(btrim(x ->> 'remarks'), ''), e.id, 'PENDING_INSPECTION', v_card);
    end loop;
  else
    foreach code in array p_job_codes loop
      select id into v_job from public.maintenance_jobs where job_code = code;
      if v_job is null then raise exception 'unknown job code %', code; end if;
      foreach ty in array v_tyres loop perform app.new_job_id(v_card, v_job, ty, p_fleet, null, e.org_unit_id); end loop;
    end loop;
    perform app.recompute_card_minutes(v_card);
  end if;
  perform app.log_event(v_card, null, 'CREATED', e.id, p_instruction);
  return v_card;
end $$;

create function public.job_card_assign_inspection(p_card uuid, p_inspector uuid, p_due date default null, p_shift uuid default null, p_remarks text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.assign'); c public.job_cards; w public.employees; v_ins uuid := gen_random_uuid(); n int;
begin
  select * into c from public.job_cards where id = p_card and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'job card not found in your depot'; end if;
  if c.job_type <> 'COMPLAINT' then raise exception 'only a complaint job card has an inspection'; end if;
  if c.status not in ('DRAFT', 'INSPECTION_DONE') then raise exception 'a job card that is % cannot be assigned for inspection', c.status; end if;
  select * into w from public.employees where id = p_inspector and org_unit_id = e.org_unit_id and status = 'ACTIVE' and role_code in ('TM', 'TIC');
  if not found then raise exception 'the inspector must be an active Tyre Man or Tyre IC of your depot'; end if;
  select count(*) into n from public.complaints where job_card_id = p_card and state = 'PENDING_INSPECTION';
  if n = 0 then raise exception 'there is no complaint waiting for inspection'; end if;
  insert into public.inspections (id, inspection_no, job_card_id, org_unit_id, inspector_id, assigned_by, due_date, shift_id, remarks)
  values (v_ins, app.next_doc_no('INSID', null, app.business_today()), p_card, e.org_unit_id, p_inspector, e.id, coalesce(p_due, c.expected_date), p_shift, nullif(btrim(p_remarks), ''));
  update public.complaints set inspection_id = v_ins where job_card_id = p_card and state = 'PENDING_INSPECTION';
  update public.job_cards set status = 'ASSIGNED_FOR_INSPECTION' where id = p_card;
  perform app.log_event(p_card, null, 'ASSIGNED_FOR_INSPECTION ' || w.employee_code, e.id, p_remarks);
  return v_ins;
end $$;

-- p_decisions: [{"complaint_id": uuid, "approve": bool, "reason": text, "job_codes": ["JOB-001", ...]}]  every pending complaint must be decided
-- p_new: [{"tyre_id": uuid|null, "complaint_type_id": uuid, "remarks": text, "job_codes": [...]}]  complaints found by the inspector, approved at once
create function public.inspection_decide(p_inspection uuid, p_decisions jsonb, p_new jsonb default '[]', p_remarks text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  e public.employees := app.actor('job.execute'); i public.inspections; c public.job_cards; cp public.complaints; d jsonb; x jsonb; code text; v_job uuid; v_codes text[];
  v_cid uuid; ty uuid; n_pending int; n_decided int := 0;
begin
  select * into i from public.inspections where id = p_inspection and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'inspection not found in your depot'; end if;
  if i.inspector_id <> e.id then raise exception 'this inspection is assigned to someone else' using errcode = 'insufficient_privilege'; end if;
  if i.status <> 'ASSIGNED' then raise exception 'this inspection is already done'; end if;
  select * into c from public.job_cards where id = i.job_card_id for update;
  select count(*) into n_pending from public.complaints where inspection_id = p_inspection and state = 'PENDING_INSPECTION';

  for d in select * from jsonb_array_elements(coalesce(p_decisions, '[]')) loop
    select * into cp from public.complaints where id = (d ->> 'complaint_id')::uuid and inspection_id = p_inspection and state = 'PENDING_INSPECTION' for update;
    if not found then raise exception 'a decision is for a complaint that is not waiting on this inspection'; end if;
    n_decided := n_decided + 1;
    if coalesce((d ->> 'approve')::boolean, false) then
      select coalesce(array_agg(j.job_code order by j.job_code), '{}') into v_codes from public.complaint_type_jobs l join public.maintenance_jobs j on j.id = l.job_id
        where l.complaint_type_id = cp.complaint_type_id and j.status = 'ACTIVE';
      if d ? 'job_codes' and jsonb_array_length(d -> 'job_codes') > 0 then select array_agg(distinct v) into v_codes from jsonb_array_elements_text(d -> 'job_codes') v; end if;
      if coalesce(cardinality(v_codes), 0) = 0 then raise exception 'complaint % has no job code; add a job code to approve it', cp.complaint_no; end if;
      update public.complaints set state = 'APPROVED', decided_by = e.id, decided_at = now(), decision_reason = null where id = cp.id;
      foreach code in array v_codes loop
        select id into v_job from public.maintenance_jobs where job_code = code;
        if v_job is null then raise exception 'unknown job code %', code; end if;
        perform app.new_job_id(c.id, v_job, cp.tyre_id, c.fleet_id, cp.id, c.org_unit_id);
      end loop;
    else
      if length(btrim(coalesce(d ->> 'reason', ''))) = 0 then raise exception 'a rejection needs a reason (complaint %)', cp.complaint_no; end if;
      update public.complaints set state = 'REJECTED', decided_by = e.id, decided_at = now(), decision_reason = btrim(d ->> 'reason') where id = cp.id;
    end if;
  end loop;
  if n_decided <> n_pending then raise exception 'every complaint must be approved or rejected (% of % decided)', n_decided, n_pending; end if;

  for x in select * from jsonb_array_elements(coalesce(p_new, '[]')) loop
    ty := nullif(x ->> 'tyre_id', '')::uuid;
    if ty is not null and not exists (select 1 from public.tyres where id = ty and fleet_id = c.fleet_id and stock_place = 'FITTED') then raise exception 'a new complaint tyre is not fitted on this fleet'; end if;
    v_cid := gen_random_uuid();
    insert into public.complaints (id, complaint_no, org_unit_id, source, fleet_id, tyre_id, complaint_type_id, remarks, raised_by, state, job_card_id, inspection_id, decided_by, decided_at)
    values (v_cid, app.next_doc_no('CMPID', null, app.business_today()), c.org_unit_id, 'INSPECTION', c.fleet_id, ty, (x ->> 'complaint_type_id')::uuid, nullif(btrim(x ->> 'remarks'), ''), e.id, 'APPROVED', c.id, p_inspection, e.id, now());
    select coalesce(array_agg(j.job_code order by j.job_code), '{}') into v_codes from public.complaint_type_jobs l join public.maintenance_jobs j on j.id = l.job_id
      where l.complaint_type_id = (x ->> 'complaint_type_id')::uuid and j.status = 'ACTIVE';
    if x ? 'job_codes' and jsonb_array_length(x -> 'job_codes') > 0 then select array_agg(distinct v) into v_codes from jsonb_array_elements_text(x -> 'job_codes') v; end if;
    if coalesce(cardinality(v_codes), 0) = 0 then raise exception 'a new complaint needs a job code'; end if;
    foreach code in array v_codes loop
      select id into v_job from public.maintenance_jobs where job_code = code;
      if v_job is null then raise exception 'unknown job code %', code; end if;
      perform app.new_job_id(c.id, v_job, ty, c.fleet_id, v_cid, c.org_unit_id);
    end loop;
  end loop;

  update public.inspections set status = 'DONE', done_at = now(), result_remarks = nullif(btrim(p_remarks), '') where id = p_inspection;
  update public.job_cards set status = 'INSPECTION_DONE' where id = c.id;
  perform app.recompute_card_minutes(c.id);
  perform app.log_event(c.id, null, 'INSPECTION_DONE ' || i.inspection_no, e.id, p_remarks);
end $$;

create function public.complaint_reinspect(p_complaint uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.assign'); cp public.complaints;
begin
  select * into cp from public.complaints where id = p_complaint and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'complaint not found in your depot'; end if;
  if cp.state <> 'REJECTED' then raise exception 'only a rejected complaint can be inspected again (this one is %)', cp.state; end if;
  update public.complaints set state = 'PENDING_INSPECTION', inspection_id = null, decided_by = null, decided_at = null, decision_reason = null where id = p_complaint;
  perform app.log_event(cp.job_card_id, null, 'REINSPECT ' || cp.complaint_no, e.id);
end $$;

create function public.complaint_close(p_complaint uuid, p_remarks text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.assign'); cp public.complaints;
begin
  select * into cp from public.complaints where id = p_complaint and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'complaint not found in your depot'; end if;
  if cp.state <> 'REJECTED' then raise exception 'only a rejected complaint can be closed (this one is %)', cp.state; end if;
  update public.complaints set state = 'CLOSED' where id = p_complaint;
  perform app.log_event(cp.job_card_id, null, 'CLOSE_COMPLAINT ' || cp.complaint_no, e.id, p_remarks);
  -- when every complaint of the card is closed, the card is Closed
  if not exists (select 1 from public.complaints where job_card_id = cp.job_card_id and state <> 'CLOSED') then
    update public.job_cards set status = 'CLOSED', completed_at = now() where id = cp.job_card_id;
    perform app.log_event(cp.job_card_id, null, 'CLOSED', e.id);
  end if;
end $$;

-- p_employees: 1..n Tyre Men / Tyre IC; p_per: {"<job id>": ["<employee>", ...]} to give a Job ID different people (max 3 each)
create function public.job_card_assign_work(p_card uuid, p_employees uuid[], p_per jsonb default null, p_due date default null, p_shift uuid default null,
                                            p_source text default 'MTC', p_remarks text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.assign'); c public.job_cards; j record; v_emps uuid[]; w uuid; v_due date; n int;
begin
  select * into c from public.job_cards where id = p_card and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'job card not found in your depot'; end if;
  if c.status not in ('DRAFT', 'INSPECTION_DONE', 'ASSIGNED_FOR_WORK') then raise exception 'a job card that is % cannot be assigned for work', c.status; end if;
  if c.status = 'DRAFT' and c.job_type = 'COMPLAINT' then raise exception 'a complaint job card needs its inspection first'; end if;
  if p_source not in ('MTC', 'OUTSOURCE') then raise exception 'employee source must be MTC or OUTSOURCE'; end if;
  select array_agg(distinct x) into v_emps from unnest(coalesce(p_employees, '{}')) as x;
  if v_emps is null then raise exception 'choose at least one Tyre Man'; end if;
  select count(*) into n from public.employees where id = any (v_emps) and org_unit_id = e.org_unit_id and status = 'ACTIVE' and role_code in ('TM', 'TIC');
  if n <> cardinality(v_emps) then raise exception 'every person must be an active Tyre Man or Tyre IC of your depot'; end if;
  v_due := coalesce(p_due, c.expected_date);
  select count(*) into n from public.job_ids where job_card_id = p_card and status in ('PENDING', 'ASSIGNED');
  if n = 0 then raise exception 'there is no Job ID to assign (approve at least one complaint first)'; end if;

  for j in select * from public.job_ids where job_card_id = p_card and status in ('PENDING', 'ASSIGNED') loop
    delete from public.job_id_assignees where job_id_ref = j.id;
    if p_per is not null and p_per ? j.id::text then
      select array_agg(distinct (v)::uuid) into v_emps from jsonb_array_elements_text(p_per -> j.id::text) v;
      if cardinality(v_emps) > 3 then raise exception 'a Job ID can go to at most 3 Tyre Men'; end if;
      if exists (select 1 from unnest(v_emps) u where u <> all (coalesce(p_employees, '{}'))) then raise exception 'a Job ID can only go to the Tyre Men chosen for the card'; end if;
    else
      select array_agg(distinct x) into v_emps from unnest(p_employees) as x;
      if cardinality(v_emps) > 3 then raise exception 'choose at most 3 Tyre Men, or give each Job ID its own people'; end if;
    end if;
    foreach w in array v_emps loop insert into public.job_id_assignees (job_id_ref, employee_id) values (j.id, w); end loop;
    update public.job_ids set status = 'ASSIGNED', due_date = v_due, due_shift_id = p_shift where id = j.id;
  end loop;
  insert into public.work_assignments (job_card_id, org_unit_id, due_date, shift_id, employee_source, employees, remarks, assigned_by)
  values (p_card, e.org_unit_id, v_due, p_shift, p_source, p_employees, nullif(btrim(p_remarks), ''), e.id);
  update public.job_cards set status = 'ASSIGNED_FOR_WORK', expected_date = v_due, expected_shift_id = coalesce(p_shift, expected_shift_id) where id = p_card;
  perform app.log_event(p_card, null, 'ASSIGNED_FOR_WORK', e.id, p_remarks);
end $$;

-- ---------------------------------------------------------------------------------------------
-- work
-- ---------------------------------------------------------------------------------------------
create function public.job_id_start(p_job uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job.execute'); j public.job_ids;
begin
  select * into j from public.job_ids where id = p_job and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'Job ID not found in your depot'; end if;
  if not exists (select 1 from public.job_id_assignees where job_id_ref = p_job and employee_id = e.id) then raise exception 'this Job ID is not assigned to you'; end if;
  if j.status <> 'ASSIGNED' then raise exception 'a Job ID that is % cannot be started', j.status; end if;
  update public.job_ids set status = 'STARTED', started_at = now() where id = p_job;
  perform app.log_event(j.job_card_id, p_job, 'START_WORK', e.id);
end $$;

create function public.job_id_complete(p_job uuid, p_on_behalf_reason text default null) returns void
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
  if not exists (select 1 from public.job_ids where job_card_id = j.job_card_id and status not in ('DONE', 'CLOSED')) then
    update public.job_cards set status = 'FINAL_INSPECTION' where id = j.job_card_id and status in ('ASSIGNED_FOR_WORK');
    perform app.log_event(j.job_card_id, null, 'FINAL_INSPECTION_DUE', e.id);
  end if;
end $$;

-- p_result PASS | FAIL | REWORK; REWORK needs the Job IDs to redo (a new Job ID is made for each)
create function public.final_inspection(p_card uuid, p_result text, p_remarks text default null, p_rework_jobs uuid[] default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job.final_inspect'); c public.job_cards; j public.job_ids; v_new uuid; w uuid; x uuid;
begin
  select * into c from public.job_cards where id = p_card and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'job card not found in your depot'; end if;
  if c.status not in ('FINAL_INSPECTION', 'FINAL_INSPECTION_FAILED') then raise exception 'the job card is %, not at final inspection', c.status; end if;
  if p_result not in ('PASS', 'FAIL', 'REWORK') then raise exception 'result must be PASS, FAIL or REWORK'; end if;
  if p_result <> 'PASS' and length(btrim(coalesce(p_remarks, ''))) = 0 then raise exception 'please say what is wrong (remarks are required for Fail and Rework)'; end if;
  insert into public.final_inspections (job_card_id, inspector_id, result, remarks) values (p_card, e.id, p_result, nullif(btrim(p_remarks), ''));
  if p_result = 'PASS' then
    update public.job_cards set status = 'COMPLETED', completed_at = now() where id = p_card;
    update public.complaints set state = 'CLOSED' where job_card_id = p_card and state = 'APPROVED';
  elsif p_result = 'FAIL' then
    update public.job_cards set status = 'FINAL_INSPECTION_FAILED' where id = p_card;
  else
    if coalesce(cardinality(p_rework_jobs), 0) = 0 then raise exception 'choose the Job IDs to redo'; end if;
    foreach x in array p_rework_jobs loop
      select * into j from public.job_ids where id = x and job_card_id = p_card and status = 'DONE';
      if not found then raise exception 'a rework Job ID must be a done Job ID of this card'; end if;
      v_new := app.new_job_id(p_card, j.job_code_id, j.tyre_id, j.fleet_id, j.complaint_id, j.org_unit_id, j.id);
      update public.job_ids set status = 'ASSIGNED', due_date = c.expected_date, due_shift_id = c.expected_shift_id where id = v_new;
      for w in select employee_id from public.job_id_assignees where job_id_ref = j.id loop
        insert into public.job_id_assignees (job_id_ref, employee_id) values (v_new, w);
      end loop;
    end loop;
    update public.job_cards set status = 'ASSIGNED_FOR_WORK' where id = p_card;
    perform app.recompute_card_minutes(p_card);
  end if;
  perform app.log_event(p_card, null, 'FINAL_INSPECTION_' || p_result, e.id, p_remarks);
end $$;

revoke all on function app.log_event(uuid, uuid, text, uuid, text), app.job_minutes(uuid, int), app.card_tyres(uuid), app.recompute_card_minutes(uuid),
  app.new_job_id(uuid, uuid, uuid, uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.raise_complaint(uuid, uuid, uuid, text, text, jsonb), public.job_card_create(text, uuid, uuid[], text[], uuid[], jsonb, date, uuid, text),
  public.job_card_assign_inspection(uuid, uuid, date, uuid, text), public.inspection_decide(uuid, jsonb, jsonb, text), public.complaint_reinspect(uuid),
  public.complaint_close(uuid, text), public.job_card_assign_work(uuid, uuid[], jsonb, date, uuid, text, text), public.job_id_start(uuid),
  public.job_id_complete(uuid, text), public.final_inspection(uuid, text, text, uuid[]) from public, anon;
grant execute on function public.raise_complaint(uuid, uuid, uuid, text, text, jsonb), public.job_card_create(text, uuid, uuid[], text[], uuid[], jsonb, date, uuid, text),
  public.job_card_assign_inspection(uuid, uuid, date, uuid, text), public.inspection_decide(uuid, jsonb, jsonb, text), public.complaint_reinspect(uuid),
  public.complaint_close(uuid, text), public.job_card_assign_work(uuid, uuid[], jsonb, date, uuid, text, text), public.job_id_start(uuid),
  public.job_id_complete(uuid, text), public.final_inspection(uuid, text, text, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- row-level security: HO / AM read all depots; depot staff their own; a Tyre Man only what is theirs
-- ---------------------------------------------------------------------------------------------
alter table public.complaints          enable row level security; alter table public.complaints          force row level security;
alter table public.job_cards           enable row level security; alter table public.job_cards           force row level security;
alter table public.inspections         enable row level security; alter table public.inspections         force row level security;
alter table public.job_ids             enable row level security; alter table public.job_ids             force row level security;
alter table public.job_id_assignees    enable row level security; alter table public.job_id_assignees    force row level security;
alter table public.work_assignments    enable row level security; alter table public.work_assignments    force row level security;
alter table public.final_inspections   enable row level security; alter table public.final_inspections   force row level security;
alter table public.job_card_events     enable row level security; alter table public.job_card_events     force row level security;
grant select on public.complaints, public.job_cards, public.inspections, public.job_ids, public.job_id_assignees, public.work_assignments,
  public.final_inspections, public.job_card_events to authenticated;
create policy gate_active_user on public.complaints        as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.job_cards         as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.inspections       as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.job_ids           as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.job_id_assignees  as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.work_assignments  as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.final_inspections as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.job_card_events   as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());

create policy read_depot on public.inspections for select to authenticated using (
  org_unit_id in (select app.my_visible_depot_ids()) and (app.my_role() <> 'TM' or inspector_id = app.my_employee_id()));
create policy read_depot on public.job_ids for select to authenticated using (
  org_unit_id in (select app.my_visible_depot_ids())
  and (app.my_role() <> 'TM' or exists (select 1 from public.job_id_assignees a where a.job_id_ref = job_ids.id and a.employee_id = app.my_employee_id())));
create policy read_depot on public.job_id_assignees for select to authenticated using (
  exists (select 1 from public.job_ids j where j.id = job_id_assignees.job_id_ref) and (app.my_role() <> 'TM' or employee_id = app.my_employee_id()));
create policy read_depot on public.job_cards for select to authenticated using (
  org_unit_id in (select app.my_visible_depot_ids())
  and (app.my_role() <> 'TM' or exists (select 1 from public.job_ids j where j.job_card_id = job_cards.id)
       or exists (select 1 from public.inspections i where i.job_card_id = job_cards.id)));
create policy read_depot on public.complaints for select to authenticated using (
  org_unit_id in (select app.my_visible_depot_ids())
  and (app.my_role() <> 'TM' or raised_by = app.my_employee_id() or exists (select 1 from public.inspections i where i.id = complaints.inspection_id)));
create policy read_depot on public.work_assignments for select to authenticated using (exists (select 1 from public.job_cards c where c.id = work_assignments.job_card_id));
create policy read_depot on public.final_inspections for select to authenticated using (exists (select 1 from public.job_cards c where c.id = final_inspections.job_card_id));
create policy read_depot on public.job_card_events for select to authenticated using (exists (select 1 from public.job_cards c where c.id = job_card_events.job_card_id));
