-- 0013: Fleet Type, Fleet Register and Maintenance Jobs on the HO -> AM approval engine (Stage 5a, batch 6).
-- STATUS: proposed, NOT applied. Review and approve before running.
--
--  * Rows are written only by app.apply_* functions, which run when an AM approves a request.
--  * Payload conventions (same as vendors and tyre masters): a key code in the payload (fleet_make / fleet_no / job_code)
--    means CREATE; UPDATE sends only changed fields; DEACTIVATE / REACTIVATE send {}.
--  * Fleet Type: fleet_make + fleet_model (immutable), tyre_sizes (list of size codes; replaces the list when present).
--  * Fleet: fleet_no (immutable), registration_no, chassis_no, purchase_date, depot_code (home depot; a change writes
--    fleet_depot_history), fleet_make + fleet_model (must be sent together), bus_model_type_code, vehicle_type_code,
--    oem_size_code, positions (list, default FR FL RRI RRO RLI RLO).
--  * Maintenance Job: job_code (immutable; JOB-007 is RESERVED and refused, UQ-27), job_name, work_category, est minutes,
--    optional fleet_make + fleet_model (empty = all fleet types).
--  * Seed from the prototype: 10 jobs (JOB-001..006, 008..011), bus model types and vehicle types.
--  * NOT seeded, NOT invented: JOB-012 (its name is not in the audit), fleet class and axle type lists (their values are
--    unknown, so those two attributes are left out of this batch), and per-job minute estimates.
--  * DEMO DATA: 2 fictional fleet types and 34 fictional fleets (20 Mandaveli, 8 Adyar, 6 T. Nagar). Fleet numbers and
--    registrations follow the prototype's style (J0264 / TN-01-N-0264) but are all fake and flagged is_demo.
--  * The fleet number / registration formats are placeholders: "3-12 characters: A-Z, 0-9, hyphen" and
--    "6-20 characters: A-Z, 0-9, space, hyphen" (to be confirmed).

-- ---------------------------------------------------------------------------------------------
-- enum and reference lists
-- ---------------------------------------------------------------------------------------------
create type public.work_category as enum (
  'AIR_INFLATION', 'AIR_INFLATION_NITROGEN', 'INSPECTION', 'TYRE_ROTATION', 'TYRE_DISCOUT', 'CENSUS',
  'TYRE_CHANGING', 'TYRE_REMOVAL', 'TYRE_FITMENT', 'TYRE_SETTING', 'TYRE_UNSETTING');

insert into public.ref_values (list_code, code, label, sort_order) values
  ('bus_model_type', 'BSIV',      'BSIV',      1),
  ('bus_model_type', 'BSIII',     'BS-III',    2),
  ('bus_model_type', 'LOW_FLOOR', 'Low Floor', 3),
  ('bus_model_type', 'AC',        'AC',        4),
  ('bus_model_type', 'DELUXE',    'Deluxe',    5),
  ('vehicle_type',   'MOFUSSIL',  'Mofussil',  1),
  ('vehicle_type',   'TOWN',      'Town',      2),
  ('vehicle_type',   'GHAT',      'Ghat',      3),
  ('vehicle_type',   'SUBURBAN',  'Suburban',  4);

-- ---------------------------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------------------------
create table public.fleet_types (
  id          uuid primary key default gen_random_uuid(),
  fleet_make  text not null check (length(btrim(fleet_make)) between 2 and 60),
  fleet_model text not null check (length(btrim(fleet_model)) between 1 and 80),
  is_demo     boolean not null default false,
  status      public.master_status not null default 'ACTIVE',
  row_version int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index fleet_types_uk on public.fleet_types (lower(fleet_make), lower(fleet_model));
create table public.fleet_type_tyre_sizes (
  fleet_type_id uuid not null references public.fleet_types (id),
  tyre_size_id  uuid not null references public.tyre_sizes (id),
  primary key (fleet_type_id, tyre_size_id)
);
create table public.fleets (
  id                  uuid primary key default gen_random_uuid(),
  fleet_no            text not null unique check (fleet_no ~ '^[A-Z0-9-]{3,12}$'),
  registration_no     text not null unique check (registration_no ~ '^[A-Z0-9 -]{6,20}$'),
  chassis_no          text unique,
  purchase_date       date,
  org_unit_id         uuid not null references public.depots (org_unit_id),
  fleet_type_id       uuid not null references public.fleet_types (id),
  bus_model_type_ref  uuid references public.ref_values (id),
  vehicle_type_ref    uuid references public.ref_values (id),
  oem_tyre_size_id    uuid references public.tyre_sizes (id),
  position_layout     text[] not null default '{FR,FL,RRI,RRO,RLI,RLO}'
                      check (cardinality(position_layout) between 2 and 20),
  is_demo             boolean not null default false,
  status              public.master_status not null default 'ACTIVE',
  row_version         int not null default 1,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index fleets_depot_status_idx on public.fleets (org_unit_id, status);
create index fleets_type_idx on public.fleets (fleet_type_id);
create index fleets_no_trgm_idx on public.fleets using gin (fleet_no extensions.gin_trgm_ops);
create table public.fleet_depot_history (
  id                uuid primary key default gen_random_uuid(),
  fleet_id          uuid not null references public.fleets (id),
  from_org_unit_id  uuid references public.depots (org_unit_id),
  to_org_unit_id    uuid not null references public.depots (org_unit_id),
  effective_from    date not null,
  change_request_id uuid references public.master_change_requests (id),
  created_at        timestamptz not null default now()
);
create index fleet_depot_history_fleet_idx on public.fleet_depot_history (fleet_id, effective_from);
create trigger fleet_depot_history_append_only before update or delete on public.fleet_depot_history
  for each row execute function app.forbid_change();
create trigger fleet_depot_history_no_truncate before truncate on public.fleet_depot_history
  for each statement execute function app.forbid_change();
create table public.maintenance_jobs (
  id                    uuid primary key default gen_random_uuid(),
  job_code              text not null unique check (job_code ~ '^JOB-[0-9]{3}$' and job_code <> 'JOB-007'),
  job_name              text not null check (length(btrim(job_name)) > 0),
  work_category         public.work_category not null,
  fleet_type_id         uuid references public.fleet_types (id),   -- null = all fleet types
  est_minutes_per_fleet int check (est_minutes_per_fleet is null or est_minutes_per_fleet between 1 and 1440),
  est_minutes_per_tyre  int check (est_minutes_per_tyre is null or est_minutes_per_tyre between 1 and 1440),
  status                public.master_status not null default 'ACTIVE',
  row_version           int not null default 1,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index maintenance_jobs_category_idx on public.maintenance_jobs (work_category);

create trigger fleet_types_touch     before update on public.fleet_types     for each row execute function app.set_updated_at();
create trigger fleets_touch          before update on public.fleets          for each row execute function app.set_updated_at();
create trigger maintenance_jobs_touch before update on public.maintenance_jobs for each row execute function app.set_updated_at();
create trigger audit_fleet_types     after insert or update or delete on public.fleet_types     for each row execute function app.audit_row();
create trigger audit_fleets          after insert or update or delete on public.fleets          for each row execute function app.audit_row();
create trigger audit_maintenance_jobs after insert or update or delete on public.maintenance_jobs for each row execute function app.audit_row();

-- ---------------------------------------------------------------------------------------------
-- seed: jobs from the prototype (JOB-007 reserved, JOB-012 name unknown: both left out)
-- ---------------------------------------------------------------------------------------------
insert into public.maintenance_jobs (job_code, job_name, work_category) values
  ('JOB-001', 'Air Inflation Regular Air',  'AIR_INFLATION'),
  ('JOB-002', 'Air Inflation Nitrogen Air', 'AIR_INFLATION_NITROGEN'),
  ('JOB-003', 'Inspection',                 'INSPECTION'),
  ('JOB-004', 'Tyre Rotation',              'TYRE_ROTATION'),
  ('JOB-005', 'Tyre Disc Out',              'TYRE_DISCOUT'),
  ('JOB-006', 'Census',                     'CENSUS'),
  ('JOB-008', 'Tyre Removal',               'TYRE_REMOVAL'),
  ('JOB-009', 'Tyre Fitment',               'TYRE_FITMENT'),
  ('JOB-010', 'Tyre Setting',               'TYRE_SETTING'),
  ('JOB-011', 'Tyre Unsetting',             'TYRE_UNSETTING');

-- ---------------------------------------------------------------------------------------------
-- seed: FICTIONAL demonstration fleet types and fleets
-- ---------------------------------------------------------------------------------------------
insert into public.fleet_types (fleet_make, fleet_model, is_demo) values
  ('Ashok Leyland', 'Demo Model AL-1', true),
  ('Tata',          'Demo Model TA-1', true);
insert into public.fleet_type_tyre_sizes (fleet_type_id, tyre_size_id)
select t.id, s.id from public.fleet_types t join public.tyre_sizes s on
  (t.fleet_make = 'Ashok Leyland' and s.size_code in ('10.00 X 20', '295/80R22.5'))
  or (t.fleet_make = 'Tata' and s.size_code in ('10.00 X 20', '9.00 X 20'));

insert into public.fleets (fleet_no, registration_no, purchase_date, org_unit_id, fleet_type_id,
                           bus_model_type_ref, vehicle_type_ref, oem_tyre_size_id, is_demo)
select d.prefix || lpad((d.base + g)::text, 4, '0'),
       'TN-01-N-' || lpad((d.base + g)::text, 4, '0'),
       date '2019-04-01' + (g * 37),
       (select id from public.org_units where code = d.depot),
       (select id from public.fleet_types where fleet_make = case when g % 2 = 0 then 'Ashok Leyland' else 'Tata' end),
       (select id from public.ref_values where list_code = 'bus_model_type' and code = (array['BSIV','BSIII','LOW_FLOOR','AC','DELUXE'])[1 + g % 5]),
       (select id from public.ref_values where list_code = 'vehicle_type' and code = (array['TOWN','MOFUSSIL','SUBURBAN','GHAT'])[1 + g % 4]),
       (select id from public.tyre_sizes where size_code = '10.00 X 20'),
       true
from (values ('MN', 'J', 200, 20), ('AD', 'A', 300, 8), ('TNR', 'T', 400, 6)) as d(depot, prefix, base, n)
cross join lateral generate_series(1, d.n) as g;

insert into public.fleet_depot_history (fleet_id, to_org_unit_id, effective_from)
select id, org_unit_id, purchase_date from public.fleets where is_demo;

-- ---------------------------------------------------------------------------------------------
-- fleet type: fleet_make, fleet_model, tyre_sizes[]
-- ---------------------------------------------------------------------------------------------
create function app.validate_fleet_type(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare s text;
begin
  perform app.check_keys(p, array['fleet_make','fleet_model','tyre_sizes']);
  if p ? 'fleet_make' then
    if length(btrim(coalesce(p ->> 'fleet_make', ''))) < 2 or length(btrim(coalesce(p ->> 'fleet_model', ''))) = 0 then
      raise exception 'fleet make and model are required'; end if;
    if exists (select 1 from public.fleet_types where lower(fleet_make) = lower(btrim(p ->> 'fleet_make')) and lower(fleet_model) = lower(btrim(p ->> 'fleet_model'))) then
      raise exception 'fleet type % % already exists', p ->> 'fleet_make', p ->> 'fleet_model'; end if;
  end if;
  if p ? 'tyre_sizes' then
    if jsonb_typeof(p -> 'tyre_sizes') <> 'array' then raise exception 'tyre_sizes must be a list'; end if;
    for s in select jsonb_array_elements_text(p -> 'tyre_sizes') loop
      if not exists (select 1 from public.tyre_sizes where size_code = s and status = 'ACTIVE') then
        raise exception 'unknown or inactive tyre size "%"', s; end if;
    end loop;
  end if;
end $$;

create function app.apply_fleet_type(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'fleet_type'); p jsonb := r.proposed_payload; s text;
begin
  perform app.validate_fleet_type(p);
  if r.action = 'CREATE' then
    if not (p ? 'fleet_make') then raise exception 'a new fleet type needs fleet_make and fleet_model'; end if;
    insert into public.fleet_types (id, fleet_make, fleet_model) values (r.target_id, btrim(p ->> 'fleet_make'), btrim(p ->> 'fleet_model'));
  else
    if not exists (select 1 from public.fleet_types where id = r.target_id) then raise exception 'fleet type not found'; end if;
    if p ? 'fleet_make' or p ? 'fleet_model' then raise exception 'the make and model of a fleet type cannot be changed'; end if;
    update public.fleet_types set
      status = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      row_version = row_version + 1
    where id = r.target_id;
  end if;
  if p ? 'tyre_sizes' then
    delete from public.fleet_type_tyre_sizes where fleet_type_id = r.target_id;
    for s in select distinct jsonb_array_elements_text(p -> 'tyre_sizes') loop
      insert into public.fleet_type_tyre_sizes (fleet_type_id, tyre_size_id) select r.target_id, id from public.tyre_sizes where size_code = s;
    end loop;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- fleet
-- ---------------------------------------------------------------------------------------------
create function app.validate_fleet(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare x text;
begin
  perform app.check_keys(p, array['fleet_no','registration_no','chassis_no','purchase_date','depot_code','fleet_make','fleet_model',
    'bus_model_type_code','vehicle_type_code','oem_size_code','positions']);
  if p ? 'fleet_no' then   -- a fleet number in the payload means a new fleet
    if coalesce(p ->> 'fleet_no', '') !~ '^[A-Z0-9-]{3,12}$' then raise exception 'fleet number must be 3-12 characters: A-Z, 0-9, hyphen'; end if;
    if exists (select 1 from public.fleets where fleet_no = p ->> 'fleet_no') then raise exception 'fleet % already exists', p ->> 'fleet_no'; end if;
    if coalesce(p ->> 'registration_no', '') = '' or coalesce(p ->> 'depot_code', '') = '' or coalesce(p ->> 'fleet_make', '') = '' or coalesce(p ->> 'fleet_model', '') = '' then
      raise exception 'a new fleet needs registration_no, depot_code, fleet_make and fleet_model'; end if;
  end if;
  if p ? 'registration_no' then
    if coalesce(p ->> 'registration_no', '') !~ '^[A-Z0-9 -]{6,20}$' then raise exception 'registration number must be 6-20 characters: A-Z, 0-9, space, hyphen'; end if;
    if exists (select 1 from public.fleets where registration_no = p ->> 'registration_no') and p ? 'fleet_no' then
      raise exception 'registration % already exists', p ->> 'registration_no'; end if;
  end if;
  if p ? 'chassis_no' and p ->> 'chassis_no' is not null and exists (select 1 from public.fleets where chassis_no = p ->> 'chassis_no') and p ? 'fleet_no' then
    raise exception 'chassis number % already exists', p ->> 'chassis_no'; end if;
  if p ? 'purchase_date' and p ->> 'purchase_date' is not null and (p ->> 'purchase_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'purchase date must be YYYY-MM-DD'; end if;
  if p ? 'depot_code' and not exists (select 1 from public.org_units o join public.depots d on d.org_unit_id = o.id where o.code = p ->> 'depot_code' and o.status = 'ACTIVE') then
    raise exception 'unknown or inactive depot "%"', p ->> 'depot_code'; end if;
  if (p ? 'fleet_make') <> (p ? 'fleet_model') then raise exception 'send fleet_make and fleet_model together'; end if;
  if p ? 'fleet_make' and not exists (select 1 from public.fleet_types where lower(fleet_make) = lower(p ->> 'fleet_make') and lower(fleet_model) = lower(p ->> 'fleet_model') and status = 'ACTIVE') then
    raise exception 'unknown or inactive fleet type "% %"', p ->> 'fleet_make', p ->> 'fleet_model'; end if;
  if p ? 'bus_model_type_code' and p ->> 'bus_model_type_code' is not null then perform app.ref_id('bus_model_type', p ->> 'bus_model_type_code', 'bus model type'); end if;
  if p ? 'vehicle_type_code'   and p ->> 'vehicle_type_code' is not null   then perform app.ref_id('vehicle_type', p ->> 'vehicle_type_code', 'vehicle type'); end if;
  if p ? 'oem_size_code' and p ->> 'oem_size_code' is not null
     and not exists (select 1 from public.tyre_sizes where size_code = p ->> 'oem_size_code' and status = 'ACTIVE') then
    raise exception 'unknown or inactive tyre size "%"', p ->> 'oem_size_code'; end if;
  if p ? 'positions' then
    if jsonb_typeof(p -> 'positions') <> 'array' or jsonb_array_length(p -> 'positions') < 2 then raise exception 'positions must be a list of at least 2'; end if;
    for x in select jsonb_array_elements_text(p -> 'positions') loop
      if x !~ '^[A-Z]{2,4}[0-9]?$' then raise exception 'bad tyre position "%"', x; end if;
    end loop;
  end if;
end $$;

create function app.apply_fleet(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.master_change_requests := app.request_row(p_request, 'fleet'); p jsonb := r.proposed_payload;
  f public.fleets; v_depot uuid; v_type uuid; v_size uuid; v_pos text[];
begin
  perform app.validate_fleet(p);
  if p ? 'depot_code' then select o.id into v_depot from public.org_units o where o.code = p ->> 'depot_code'; end if;
  if p ? 'fleet_make' then
    select id into v_type from public.fleet_types where lower(fleet_make) = lower(p ->> 'fleet_make') and lower(fleet_model) = lower(p ->> 'fleet_model'); end if;
  if p ? 'oem_size_code' and p ->> 'oem_size_code' is not null then select id into v_size from public.tyre_sizes where size_code = p ->> 'oem_size_code'; end if;
  if p ? 'positions' then select array_agg(x order by ord) into v_pos from jsonb_array_elements_text(p -> 'positions') with ordinality as t(x, ord); end if;

  if r.action = 'CREATE' then
    if not (p ? 'fleet_no') then raise exception 'a new fleet needs fleet_no'; end if;
    insert into public.fleets (id, fleet_no, registration_no, chassis_no, purchase_date, org_unit_id, fleet_type_id,
        bus_model_type_ref, vehicle_type_ref, oem_tyre_size_id, position_layout)
    values (r.target_id, p ->> 'fleet_no', p ->> 'registration_no', nullif(btrim(p ->> 'chassis_no'), ''), (p ->> 'purchase_date')::date, v_depot, v_type,
        case when p ->> 'bus_model_type_code' is not null then app.ref_id('bus_model_type', p ->> 'bus_model_type_code', 'bus model type') end,
        case when p ->> 'vehicle_type_code' is not null then app.ref_id('vehicle_type', p ->> 'vehicle_type_code', 'vehicle type') end,
        v_size, coalesce(v_pos, '{FR,FL,RRI,RRO,RLI,RLO}'));
    insert into public.fleet_depot_history (fleet_id, to_org_unit_id, effective_from, change_request_id)
    values (r.target_id, v_depot, app.business_today(), r.id);
  else
    select * into f from public.fleets where id = r.target_id;
    if not found then raise exception 'fleet not found'; end if;
    if p ? 'fleet_no' then raise exception 'a fleet number cannot be changed'; end if;
    if p ? 'registration_no' and exists (select 1 from public.fleets where registration_no = p ->> 'registration_no' and id <> r.target_id) then
      raise exception 'registration % already exists', p ->> 'registration_no'; end if;
    if p ? 'chassis_no' and p ->> 'chassis_no' is not null and exists (select 1 from public.fleets where chassis_no = p ->> 'chassis_no' and id <> r.target_id) then
      raise exception 'chassis number % already exists', p ->> 'chassis_no'; end if;
    update public.fleets set
      status             = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      registration_no    = case when p ? 'registration_no' then p ->> 'registration_no' else registration_no end,
      chassis_no         = case when p ? 'chassis_no' then nullif(btrim(p ->> 'chassis_no'), '') else chassis_no end,
      purchase_date      = case when p ? 'purchase_date' then (p ->> 'purchase_date')::date else purchase_date end,
      org_unit_id        = case when p ? 'depot_code' then v_depot else org_unit_id end,
      fleet_type_id      = case when p ? 'fleet_make' then v_type else fleet_type_id end,
      bus_model_type_ref = case when p ? 'bus_model_type_code' then case when p ->> 'bus_model_type_code' is null then null else app.ref_id('bus_model_type', p ->> 'bus_model_type_code', 'bus model type') end else bus_model_type_ref end,
      vehicle_type_ref   = case when p ? 'vehicle_type_code' then case when p ->> 'vehicle_type_code' is null then null else app.ref_id('vehicle_type', p ->> 'vehicle_type_code', 'vehicle type') end else vehicle_type_ref end,
      oem_tyre_size_id   = case when p ? 'oem_size_code' then v_size else oem_tyre_size_id end,
      position_layout    = case when p ? 'positions' then v_pos else position_layout end,
      row_version        = row_version + 1
    where id = r.target_id;
    if p ? 'depot_code' and v_depot <> f.org_unit_id then
      insert into public.fleet_depot_history (fleet_id, from_org_unit_id, to_org_unit_id, effective_from, change_request_id)
      values (r.target_id, f.org_unit_id, v_depot, app.business_today(), r.id);
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- maintenance job
-- ---------------------------------------------------------------------------------------------
create function app.validate_maintenance_job(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform app.check_keys(p, array['job_code','job_name','work_category','est_minutes_per_fleet','est_minutes_per_tyre','fleet_make','fleet_model']);
  if p ? 'job_code' then   -- a job code in the payload means a new job
    if coalesce(p ->> 'job_code', '') !~ '^JOB-[0-9]{3}$' then raise exception 'job code must look like JOB-013'; end if;
    if p ->> 'job_code' = 'JOB-007' then raise exception 'JOB-007 is reserved and cannot be used'; end if;
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

create function app.apply_maintenance_job(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'maintenance_job'); p jsonb := r.proposed_payload; v_type uuid;
begin
  perform app.validate_maintenance_job(p);
  if p ? 'fleet_make' and p ->> 'fleet_make' is not null then
    select id into v_type from public.fleet_types where lower(fleet_make) = lower(p ->> 'fleet_make') and lower(fleet_model) = lower(p ->> 'fleet_model'); end if;
  if r.action = 'CREATE' then
    if not (p ? 'job_code') then raise exception 'a new job needs job_code'; end if;
    insert into public.maintenance_jobs (id, job_code, job_name, work_category, fleet_type_id, est_minutes_per_fleet, est_minutes_per_tyre)
    values (r.target_id, p ->> 'job_code', btrim(p ->> 'job_name'), (p ->> 'work_category')::public.work_category, v_type,
            (p ->> 'est_minutes_per_fleet')::int, (p ->> 'est_minutes_per_tyre')::int);
  else
    if not exists (select 1 from public.maintenance_jobs where id = r.target_id) then raise exception 'job not found'; end if;
    if p ? 'job_code' then raise exception 'a job code cannot be changed'; end if;
    update public.maintenance_jobs set
      status                = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      job_name              = case when p ? 'job_name' then btrim(p ->> 'job_name') else job_name end,
      work_category         = case when p ? 'work_category' then (p ->> 'work_category')::public.work_category else work_category end,
      fleet_type_id         = case when p ? 'fleet_make' then v_type else fleet_type_id end,
      est_minutes_per_fleet = case when p ? 'est_minutes_per_fleet' then (p ->> 'est_minutes_per_fleet')::int else est_minutes_per_fleet end,
      est_minutes_per_tyre  = case when p ? 'est_minutes_per_tyre' then (p ->> 'est_minutes_per_tyre')::int else est_minutes_per_tyre end,
      row_version           = row_version + 1
    where id = r.target_id;
  end if;
end $$;

revoke all on function app.validate_fleet_type(jsonb), app.apply_fleet_type(uuid), app.validate_fleet(jsonb), app.apply_fleet(uuid),
  app.validate_maintenance_job(jsonb), app.apply_maintenance_job(uuid) from public, anon, authenticated;

update public.master_entity_registry set is_enabled = true where entity_type in ('fleet_type', 'fleet', 'maintenance_job');

-- ---------------------------------------------------------------------------------------------
-- row-level security
--   fleet types and jobs: every active user reads. Fleets and depot history: HO/AM read all depots;
--   other roles read only the depots they belong to (app.my_visible_depot_ids()).
-- ---------------------------------------------------------------------------------------------
alter table public.fleet_types           enable row level security; alter table public.fleet_types           force row level security;
alter table public.fleet_type_tyre_sizes enable row level security; alter table public.fleet_type_tyre_sizes force row level security;
alter table public.fleets                enable row level security; alter table public.fleets                force row level security;
alter table public.fleet_depot_history   enable row level security; alter table public.fleet_depot_history   force row level security;
alter table public.maintenance_jobs      enable row level security; alter table public.maintenance_jobs      force row level security;
grant select on public.fleet_types, public.fleet_type_tyre_sizes, public.fleets, public.fleet_depot_history, public.maintenance_jobs to authenticated;
create policy gate_active_user on public.fleet_types           as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.fleet_type_tyre_sizes as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.fleets                as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.fleet_depot_history   as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.maintenance_jobs      as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy read_all_active on public.fleet_types           for select to authenticated using (true);
create policy read_all_active on public.fleet_type_tyre_sizes for select to authenticated using (true);
create policy read_all_active on public.maintenance_jobs      for select to authenticated using (true);
create policy read_own_depots on public.fleets for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()));
create policy read_own_depots on public.fleet_depot_history for select to authenticated using (
  to_org_unit_id in (select app.my_visible_depot_ids()) or from_org_unit_id in (select app.my_visible_depot_ids()));
