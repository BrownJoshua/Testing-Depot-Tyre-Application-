-- 0060: D1 Tyre Man rounds - readings per tyre (PSI, NSD, wear pattern, inspection tick, odometer), fleet checklist, hold, PSI norms.
--   Air Inflation / Nitrogen / Inspection / Census / Rotation / Discout: the Tyre Man (or the Tyre IC) saves the readings of each tyre
--   and then completes the fleet round, which completes the Job IDs of that fleet card through public.job_id_complete.
-- Written only by database functions; no direct write grants.

-- PSI norms (HO master in D1: Front / Rear x Regular / Nitrogen, per tyre size and construction)
create table if not exists public.psi_norms (
  id              uuid primary key default gen_random_uuid(),
  size_id         uuid not null references public.tyre_sizes (id),
  construction    text not null check (construction in ('NYLON', 'RADIAL')),
  front_regular   int not null check (front_regular between 20 and 200),
  front_nitrogen  int not null check (front_nitrogen between 20 and 200),
  rear_regular    int not null check (rear_regular between 20 and 200),
  rear_nitrogen   int not null check (rear_nitrogen between 20 and 200),
  status          public.master_status not null default 'ACTIVE',
  created_at      timestamptz not null default now(),
  unique (size_id, construction)
);
alter table public.psi_norms enable row level security; alter table public.psi_norms force row level security;
grant select on public.psi_norms to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'psi_norms' and policyname = 'gate_active_user') then
    create policy gate_active_user on public.psi_norms as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
    create policy read_all on public.psi_norms for select to authenticated using (true);
  end if;
end $$;
insert into public.psi_norms (size_id, construction, front_regular, front_nitrogen, rear_regular, rear_nitrogen)
select s.id, v.c, v.fr, v.fn, v.rr, v.rn from (values
  ('7.50 X 16', 'NYLON', 85, 90, 80, 85), ('7.50 X 16', 'RADIAL', 85, 90, 90, 95),
  ('10.00 X 20', 'RADIAL', 125, 130, 120, 125), ('295/80R22.5', 'RADIAL', 145, 150, 140, 145)) v(sz, c, fr, fn, rr, rn)
join public.tyre_sizes s on s.size_code = v.sz
on conflict (size_id, construction) do nothing;

-- target PSI of every fitted tyre for its fleet's air type
create view public.v_tyre_psi_target with (security_invoker = true) as
select t.id as tyre_id, t.fleet_id, t.fitted_position, f.air_type,
       case when t.fitted_position in ('FR', 'FL') then case f.air_type when 'NITROGEN' then n.front_nitrogen else n.front_regular end
            else case f.air_type when 'NITROGEN' then n.rear_nitrogen else n.rear_regular end end as target_psi
from public.tyres t
join public.fleets f on f.id = t.fleet_id
left join public.tyre_folios fo on fo.id = t.folio_id
left join public.ref_values c on c.id = fo.construction_type_ref
left join public.psi_norms n on n.size_id = fo.tyre_size_id and n.construction = coalesce(upper(c.code), 'RADIAL') and n.status = 'ACTIVE'
where t.stock_place = 'FITTED';
grant select on public.v_tyre_psi_target to authenticated;

-- one reading row per Job ID
create table public.job_readings (
  id             uuid primary key default gen_random_uuid(),
  job_id_ref     uuid not null unique references public.job_ids (id),
  job_card_id    uuid not null references public.job_cards (id),
  org_unit_id    uuid not null references public.depots (org_unit_id),
  tyre_id        uuid references public.tyres (id),
  present_psi    numeric(5,1) check (present_psi is null or present_psi between 0 and 300),
  inflated_psi   numeric(5,1) check (inflated_psi is null or inflated_psi between 0 and 300),
  target_psi     int,
  psi_flag       text check (psi_flag is null or psi_flag in ('LOW', 'HIGH')),
  groove_readings text,                                     -- "12-13-10-10"
  grooves        smallint check (grooves is null or grooves between 1 and 8),
  nsd_mm         numeric(4,1) check (nsd_mm is null or nsd_mm between 0 and 40),
  wear_pattern   text,
  checked        boolean not null default false,            -- inspection tick
  odometer_km    numeric(10,1) check (odometer_km is null or odometer_km >= 0),
  powder_applied boolean,
  remarks        text,
  recorded_by    uuid not null references public.employees (id),
  recorded_at    timestamptz not null default now()
);
create index job_readings_card_idx on public.job_readings (job_card_id);
create trigger audit_job_readings after insert or update or delete on public.job_readings for each row execute function app.audit_row();

create table public.card_checklists (                       -- Air Inflation checklist + fleet remarks
  job_card_id uuid primary key references public.job_cards (id),
  org_unit_id uuid not null references public.depots (org_unit_id),
  answers     jsonb not null default '{}',
  remarks     text,
  updated_by  uuid not null references public.employees (id),
  updated_at  timestamptz not null default now()
);

alter table public.job_ids add column on_hold boolean not null default false, add column hold_remarks text, add column held_at timestamptz;

-- ---------------------------------------------------------------------------------------------
-- functions
-- ---------------------------------------------------------------------------------------------
create function app.can_work_job(p_job uuid) returns public.job_ids
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); j public.job_ids;
begin
  select * into j from public.job_ids where id = p_job and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'Job ID not found in your depot'; end if;
  if not (exists (select 1 from public.job_id_assignees where job_id_ref = p_job and employee_id = e.id) or app.has_capability('job.onbehalf')) then
    raise exception 'this Job ID is not assigned to you' using errcode = 'insufficient_privilege'; end if;
  if not app.has_capability('job.execute') and not app.has_capability('job.onbehalf') then raise exception 'your role is not allowed to do this' using errcode = 'insufficient_privilege'; end if;
  if j.status not in ('ASSIGNED', 'STARTED') then raise exception 'a Job ID that is % cannot be worked on', j.status; end if;
  return j;
end $$;

-- p_data keys: present_psi, inflated_psi, groove_readings ("12-13-10"), grooves, wear_pattern, checked, odometer_km, powder_applied, remarks
create function public.reading_save(p_job uuid, p_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); j public.job_ids := app.can_work_job(p_job); v_code text; v_target int; v_pres numeric; v_inf numeric; v_flag text;
        v_nsd numeric; v_grooves smallint; v_readings text; v_n int; v_rd numeric[];
begin
  select job_code into v_code from public.maintenance_jobs where id = j.job_code_id;
  if v_code not in ('JOB-001', 'JOB-002', 'JOB-003', 'JOB-004', 'JOB-005', 'JOB-006') then raise exception 'this Job ID has no readings'; end if;
  v_pres := nullif(p_data ->> 'present_psi', '')::numeric; v_inf := nullif(p_data ->> 'inflated_psi', '')::numeric;
  if v_code in ('JOB-001', 'JOB-002') then
    select target_psi into v_target from public.v_tyre_psi_target where tyre_id = j.tyre_id;
    if v_pres is not null and v_target is not null then
      v_flag := case when v_pres < v_target - 15 then 'LOW' when v_pres > v_target + 10 then 'HIGH' end; end if;
  end if;
  v_readings := nullif(btrim(coalesce(p_data ->> 'groove_readings', '')), '');
  v_grooves := nullif(p_data ->> 'grooves', '')::smallint;
  if v_code = 'JOB-006' and v_readings is not null then
    select array_agg(x::numeric) into v_rd from unnest(string_to_array(v_readings, '-')) x;
    v_n := cardinality(v_rd);
    if v_grooves is null then select groove_count into v_grooves from public.tyres where id = j.tyre_id; end if;
    if v_grooves is null or v_grooves < 1 then raise exception 'enter the number of grooves of the tyre first'; end if;
    if v_n <> v_grooves then raise exception 'enter % NSD readings for this tyre (you entered %)', v_grooves, v_n; end if;
    select min(x) into v_nsd from unnest(v_rd) x;
  end if;
  insert into public.job_readings (job_id_ref, job_card_id, org_unit_id, tyre_id, present_psi, inflated_psi, target_psi, psi_flag, groove_readings, grooves, nsd_mm, wear_pattern,
                                   checked, odometer_km, powder_applied, remarks, recorded_by)
  values (p_job, j.job_card_id, j.org_unit_id, j.tyre_id, v_pres, v_inf, v_target, v_flag, v_readings, v_grooves, v_nsd, nullif(btrim(coalesce(p_data ->> 'wear_pattern', '')), ''),
          coalesce((p_data ->> 'checked')::boolean, false), nullif(p_data ->> 'odometer_km', '')::numeric, (p_data ->> 'powder_applied')::boolean, nullif(btrim(coalesce(p_data ->> 'remarks', '')), ''), e.id)
  on conflict (job_id_ref) do update set present_psi = excluded.present_psi, inflated_psi = excluded.inflated_psi, target_psi = excluded.target_psi, psi_flag = excluded.psi_flag,
    groove_readings = excluded.groove_readings, grooves = excluded.grooves, nsd_mm = excluded.nsd_mm, wear_pattern = excluded.wear_pattern, checked = excluded.checked,
    odometer_km = excluded.odometer_km, powder_applied = excluded.powder_applied, remarks = excluded.remarks, recorded_by = excluded.recorded_by, recorded_at = now();
  if j.status = 'ASSIGNED' then
    update public.job_ids set status = 'STARTED', started_at = coalesce(started_at, now()) where id = p_job;
    perform app.log_event(j.job_card_id, p_job, 'START_WORK', e.id);
  end if;
end $$;

-- p_checklist: {"level_surface": "Y"|"N", "tyre_damage": "Y"|"N", "gauge": "Y"|"N"} (Air Inflation only), p_remarks: fleet remarks
create function public.fleet_round_complete(p_card uuid, p_checklist jsonb default null, p_remarks text default null) returns int
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); c public.job_cards; j public.job_ids; r public.job_readings; v_code text; n int := 0; v_air boolean := false; v_odo numeric;
begin
  select * into c from public.job_cards where id = p_card and org_unit_id = e.org_unit_id;
  if not found then raise exception 'job card not found in your depot'; end if;
  for j in select ji.* from public.job_ids ji where ji.job_card_id = p_card and ji.status in ('ASSIGNED', 'STARTED')
            and (exists (select 1 from public.job_id_assignees a where a.job_id_ref = ji.id and a.employee_id = e.id) or app.has_capability('job.onbehalf')) order by ji.job_id_no loop
    select job_code into v_code from public.maintenance_jobs where id = j.job_code_id;
    select * into r from public.job_readings where job_id_ref = j.id;
    if v_code in ('JOB-001', 'JOB-002') then
      v_air := true;
      if r.present_psi is null or r.inflated_psi is null then raise exception 'enter the Present and the Inflated PSI of every tyre'; end if;
    elsif v_code = 'JOB-003' then
      if r.id is null or not r.checked then raise exception 'mark every tyre as checked (or raise a complaint) first'; end if;
    elsif v_code = 'JOB-006' then
      if r.nsd_mm is null or r.wear_pattern is null then raise exception 'enter the NSD readings and the wear pattern of every tyre'; end if;
    elsif v_code in ('JOB-004', 'JOB-005') then
      if r.odometer_km is null then raise exception 'enter the odometer reading (km)'; end if;
      v_odo := r.odometer_km;
    else
      continue;
    end if;
    n := n + 1;
  end loop;
  if n = 0 then raise exception 'there is nothing to complete on this fleet card for you'; end if;
  if v_air then
    if p_checklist is null or coalesce(p_checklist ->> 'level_surface', '') not in ('Y', 'N') or coalesce(p_checklist ->> 'tyre_damage', '') not in ('Y', 'N') or coalesce(p_checklist ->> 'gauge', '') not in ('Y', 'N') then
      raise exception 'answer every checklist item'; end if;
    if p_checklist ->> 'level_surface' = 'N' or p_checklist ->> 'gauge' = 'N' then raise exception 'the job cannot proceed: the vehicle must be on a level surface and the pressure checked with a calibrated gauge'; end if;
    insert into public.card_checklists (job_card_id, org_unit_id, answers, remarks, updated_by) values (p_card, c.org_unit_id, p_checklist, nullif(btrim(coalesce(p_remarks, '')), ''), e.id)
    on conflict (job_card_id) do update set answers = excluded.answers, remarks = excluded.remarks, updated_by = excluded.updated_by, updated_at = now();
  end if;
  for j in select ji.* from public.job_ids ji where ji.job_card_id = p_card and ji.status in ('ASSIGNED', 'STARTED')
            and (exists (select 1 from public.job_id_assignees a where a.job_id_ref = ji.id and a.employee_id = e.id) or app.has_capability('job.onbehalf')) order by ji.job_id_no loop
    select job_code into v_code from public.maintenance_jobs where id = j.job_code_id;
    continue when v_code not in ('JOB-001', 'JOB-002', 'JOB-003', 'JOB-004', 'JOB-005', 'JOB-006');
    if j.status = 'ASSIGNED' then
      update public.job_ids set status = 'STARTED', started_at = coalesce(started_at, now()) where id = j.id;
    end if;
    select * into r from public.job_readings where job_id_ref = j.id;
    if v_code = 'JOB-006' then
      update public.tyres set nsd_mm = r.nsd_mm, groove_count = coalesce(r.grooves, groove_count) where id = j.tyre_id;
    end if;
    update public.job_ids set on_hold = false, hold_remarks = null, held_at = null where id = j.id;
    perform public.job_id_complete(j.id, case when exists (select 1 from public.job_id_assignees a where a.job_id_ref = j.id and a.employee_id = e.id) then null else 'Entered by ' || e.full_name end);
  end loop;
  if v_odo is not null and c.fleet_id is not null then update public.fleets set live_odometer_km = v_odo where id = c.fleet_id; end if;
  return n;
end $$;

create function public.job_hold(p_job uuid, p_remarks text) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); j public.job_ids := app.can_work_job(p_job);
begin
  if length(btrim(coalesce(p_remarks, ''))) = 0 then raise exception 'please give the reason for holding the job'; end if;
  update public.job_ids set on_hold = true, hold_remarks = btrim(p_remarks), held_at = now() where id = p_job;
  perform app.log_event(j.job_card_id, p_job, 'HOLD', e.id, p_remarks);
end $$;

create function public.job_resume(p_job uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); j public.job_ids := app.can_work_job(p_job);
begin
  update public.job_ids set on_hold = false, hold_remarks = null, held_at = null where id = p_job;
  perform app.log_event(j.job_card_id, p_job, 'RESUME', e.id);
end $$;

revoke all on function app.can_work_job(uuid) from public, anon, authenticated;
revoke all on function public.reading_save(uuid, jsonb), public.fleet_round_complete(uuid, jsonb, text), public.job_hold(uuid, text), public.job_resume(uuid) from public, anon;
grant execute on function public.reading_save(uuid, jsonb), public.fleet_round_complete(uuid, jsonb, text), public.job_hold(uuid, text), public.job_resume(uuid) to authenticated;

alter table public.job_readings    enable row level security; alter table public.job_readings    force row level security;
alter table public.card_checklists enable row level security; alter table public.card_checklists force row level security;
grant select on public.job_readings, public.card_checklists to authenticated;
create policy gate_active_user on public.job_readings    as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.card_checklists as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy read_depot on public.job_readings    for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()) and (app.my_role() <> 'TM' or app.is_my_job(job_id_ref)));
create policy read_depot on public.card_checklists for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()));
