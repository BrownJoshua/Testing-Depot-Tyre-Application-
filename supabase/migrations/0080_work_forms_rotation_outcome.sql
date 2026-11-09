-- 0080: top-25 items 3, 13, 21
--   3  Rotation / Discout work form: Swapped (both moves) or Not swapped (reason and photo mandatory; due tyre Done, partner Closed)
--   13 Tyre Man Removal / Unsetting / Setting / Fitment forms (tyre check by MTC No, odometer, parts and condition, readings) and "Set tyre not available"
--   21 Setting and Unsetting job cards for live-stock tyres (no fleet)

create table public.job_work_forms (                       -- one row per Job ID worked through a form
  id              uuid primary key default gen_random_uuid(),
  job_id_ref      uuid not null unique references public.job_ids (id),
  job_card_id     uuid not null references public.job_cards (id),
  org_unit_id     uuid not null references public.depots (org_unit_id),
  tyre_id         uuid references public.tyres (id),
  scanned_no      text,                                      -- the MTC No the Tyre Man typed / scanned
  odometer_km     numeric(10,1) check (odometer_km is null or odometer_km >= 0),
  wear_pattern    text,
  nsd_mm          numeric(4,1) check (nsd_mm is null or nsd_mm between 0 and 40),
  psi_after       numeric(5,1) check (psi_after is null or psi_after between 0 and 300),
  powder_applied  boolean,
  parts           jsonb,                                     -- {"tube": {"no": "...", "condition": "USABLE"|"NOT_USABLE"}, "flap": ..., "disc": ...}
  swapped         boolean,                                   -- Rotation / Discout outcome
  not_swapped_reason text,
  photo_data      text check (photo_data is null or length(photo_data) <= 600000),
  remarks         text,
  recorded_by     uuid not null references public.employees (id),
  recorded_at     timestamptz not null default now(),
  constraint forms_not_swapped_needs_reason check (swapped is distinct from false or (length(btrim(coalesce(not_swapped_reason, ''))) > 0 and photo_data is not null))
);
create index job_work_forms_card_idx on public.job_work_forms (job_card_id);
create trigger audit_job_work_forms after insert or update or delete on public.job_work_forms for each row execute function app.audit_row();
alter table public.job_work_forms enable row level security; alter table public.job_work_forms force row level security;
grant select on public.job_work_forms to authenticated;
create policy gate_active_user on public.job_work_forms as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy read_depot on public.job_work_forms for select to authenticated using (
  org_unit_id in (select app.my_visible_depot_ids()) and (app.my_role() <> 'TM' or app.is_my_job(job_id_ref)));

-- the FR <-> FL swap and the tyre dates run only when the work was Swapped
create or replace function app.on_job_done(p_job uuid) returns void
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
  if v_code in ('JOB-004', 'JOB-005') and j.tyre_id is not null
     and not exists (select 1 from public.job_work_forms f where f.job_card_id = c.id and f.swapped is false) then
    update public.tyres set last_rotation_date = today, last_discout_date = case when v_code = 'JOB-005' then today else last_discout_date end where id = j.tyre_id;
    if not exists (select 1 from public.job_ids x where x.job_card_id = c.id and x.job_code_id = j.job_code_id and x.status not in ('DONE', 'CLOSED') and x.id <> p_job) then
      select max(case when t.fitted_position = 'FR' then t.id::text end)::uuid, max(case when t.fitted_position = 'FL' then t.id::text end)::uuid into t1, t2
      from public.job_ids x join public.tyres t on t.id = x.tyre_id where x.job_card_id = c.id and x.job_code_id = j.job_code_id and t.stock_place = 'FITTED' and t.fleet_id = c.fleet_id;
      if t1 is not null and t2 is not null then
        update public.tyres set fitted_position = 'XX' where id = t1;
        update public.tyres set fitted_position = 'FR' where id = t2;
        update public.tyres set fitted_position = 'FL' where id = t1;
      end if;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 3. Rotation / Discout: complete the fleet card with Swapped or Not swapped
-- ---------------------------------------------------------------------------------------------
create function public.rotation_complete(p_card uuid, p_swapped boolean, p_odometer numeric, p_powder boolean default null, p_reason text default null, p_photo text default null)
returns int language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); c public.job_cards; j public.job_ids; v_code text; v_due uuid; n int := 0; v_mine boolean; v_ids uuid[];
begin
  select * into c from public.job_cards where id = p_card and org_unit_id = e.org_unit_id;
  if not found then raise exception 'job card not found in your depot'; end if;
  if p_swapped is null then raise exception 'choose Swapped or Not swapped'; end if;
  if p_odometer is null or p_odometer < 0 then raise exception 'enter the odometer reading (km)'; end if;
  if not p_swapped and (length(btrim(coalesce(p_reason, ''))) = 0 or coalesce(p_photo, '') = '') then raise exception 'Not swapped needs a reason and a photo'; end if;
  select array_agg(ji.id order by ji.job_id_no) into v_ids from public.job_ids ji join public.maintenance_jobs m on m.id = ji.job_code_id
   where ji.job_card_id = p_card and ji.status in ('ASSIGNED', 'STARTED') and m.job_code in ('JOB-004', 'JOB-005')
     and (exists (select 1 from public.job_id_assignees a where a.job_id_ref = ji.id and a.employee_id = e.id) or app.has_capability('job.onbehalf'));
  if v_ids is null then raise exception 'there is nothing to complete on this fleet card for you'; end if;
  select ji.id into v_due from public.job_ids ji where ji.id = any (v_ids) and exists (select 1 from public.schedule_items si where si.job_card_id = p_card and si.tyre_id = ji.tyre_id) order by ji.job_id_no limit 1;
  v_due := coalesce(v_due, v_ids[1]);
  foreach j.id in array v_ids loop
    select * into j from public.job_ids where id = j.id;
    insert into public.job_work_forms (job_id_ref, job_card_id, org_unit_id, tyre_id, odometer_km, powder_applied, swapped, not_swapped_reason, photo_data, recorded_by)
    values (j.id, p_card, c.org_unit_id, j.tyre_id, p_odometer, p_powder, p_swapped, case when not p_swapped then btrim(p_reason) end, case when not p_swapped then p_photo end, e.id)
    on conflict (job_id_ref) do update set odometer_km = excluded.odometer_km, powder_applied = excluded.powder_applied, swapped = excluded.swapped,
      not_swapped_reason = excluded.not_swapped_reason, photo_data = excluded.photo_data, recorded_by = excluded.recorded_by, recorded_at = now();
  end loop;
  foreach j.id in array v_ids loop
    select * into j from public.job_ids where id = j.id;
    if not p_swapped and j.id <> v_due then   -- the partner is Closed, not done
      update public.job_ids set status = 'CLOSED', started_at = coalesce(started_at, now()), done_at = now(), done_by = e.id, on_hold = false, hold_remarks = null where id = j.id;
      perform app.log_event(p_card, j.id, 'CLOSED_NOT_SWAPPED', e.id, p_reason);
    end if;
  end loop;
  foreach j.id in array v_ids loop
    select * into j from public.job_ids where id = j.id;
    continue when j.status in ('CLOSED', 'DONE');
    v_mine := exists (select 1 from public.job_id_assignees a where a.job_id_ref = j.id and a.employee_id = e.id);
    if j.status = 'ASSIGNED' then update public.job_ids set status = 'STARTED', started_at = coalesce(started_at, now()) where id = j.id; end if;
    update public.job_ids set on_hold = false, hold_remarks = null, held_at = null where id = j.id;
    perform public.job_id_complete(j.id, case when v_mine then null else 'Entered by ' || e.full_name end);
    n := n + 1;
  end loop;
  if c.fleet_id is not null then update public.fleets set live_odometer_km = p_odometer where id = c.fleet_id; end if;
  return n;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 13. Tyre Changing steps: complete through the work form
--   p_data: {"scanned_no": "MTC No", "odometer_km", "wear_pattern", "nsd_mm", "psi_after", "powder_applied", "remarks",
--            "parts": {"tube": {"no": "...", "condition": "USABLE"|"NOT_USABLE"}, "flap": {...}, "disc": {...}}}
-- ---------------------------------------------------------------------------------------------
create function public.work_form_complete(p_job uuid, p_data jsonb, p_on_behalf_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); j public.job_ids; v_code text; t public.tyres; v_scan text; v_mine boolean; k text; v_odo numeric; v_parts jsonb;
begin
  select * into j from public.job_ids where id = p_job and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'Job ID not found in your depot'; end if;
  v_mine := exists (select 1 from public.job_id_assignees where job_id_ref = p_job and employee_id = e.id);
  if not v_mine and not app.has_capability('job.onbehalf') then raise exception 'this Job ID is not assigned to you' using errcode = 'insufficient_privilege'; end if;
  if j.status not in ('ASSIGNED', 'STARTED') then raise exception 'a Job ID that is % cannot be completed', j.status; end if;
  select job_code into v_code from public.maintenance_jobs where id = j.job_code_id;
  if v_code not in ('JOB-008', 'JOB-009', 'JOB-010', 'JOB-011') then raise exception 'this Job ID has no work form'; end if;
  if j.tyre_id is null then raise exception 'this step is waiting for a tyre'; end if;
  select * into t from public.tyres where id = j.tyre_id;
  v_scan := upper(btrim(coalesce(p_data ->> 'scanned_no', '')));
  if v_scan = '' then raise exception 'scan or type the tyre number first'; end if;
  if v_scan <> upper(t.mtc_no) then raise exception 'the tyre number % is not the tyre of this Job ID (%)', v_scan, t.mtc_no; end if;
  v_odo := nullif(p_data ->> 'odometer_km', '')::numeric;
  if v_code in ('JOB-008', 'JOB-009') and (v_odo is null or v_odo < 0) then raise exception 'enter the odometer reading (km)'; end if;
  v_parts := p_data -> 'parts';
  if v_code = 'JOB-011' then
    foreach k in array array['tube', 'flap', 'disc'] loop
      if length(btrim(coalesce(v_parts -> k ->> 'no', ''))) = 0 then raise exception 'enter the % number', k; end if;
      if coalesce(v_parts -> k ->> 'condition', '') not in ('USABLE', 'NOT_USABLE') then raise exception 'choose Usable or Not usable for the %', k; end if;
    end loop;
  end if;
  insert into public.job_work_forms (job_id_ref, job_card_id, org_unit_id, tyre_id, scanned_no, odometer_km, wear_pattern, nsd_mm, psi_after, powder_applied, parts, photo_data, remarks, recorded_by)
  values (p_job, j.job_card_id, j.org_unit_id, j.tyre_id, v_scan, v_odo, nullif(btrim(coalesce(p_data ->> 'wear_pattern', '')), ''), nullif(p_data ->> 'nsd_mm', '')::numeric,
          nullif(p_data ->> 'psi_after', '')::numeric, (p_data ->> 'powder_applied')::boolean, v_parts, nullif(p_data ->> 'photo', ''), nullif(btrim(coalesce(p_data ->> 'remarks', '')), ''), e.id)
  on conflict (job_id_ref) do update set scanned_no = excluded.scanned_no, odometer_km = excluded.odometer_km, wear_pattern = excluded.wear_pattern, nsd_mm = excluded.nsd_mm,
    psi_after = excluded.psi_after, powder_applied = excluded.powder_applied, parts = excluded.parts, photo_data = excluded.photo_data, remarks = excluded.remarks,
    recorded_by = excluded.recorded_by, recorded_at = now();
  if j.status = 'ASSIGNED' and v_mine then perform public.job_id_start(p_job); end if;
  perform public.job_id_complete(p_job, case when v_mine then null else coalesce(nullif(btrim(p_on_behalf_reason), ''), 'Entered by ' || e.full_name) end);
  if v_odo is not null and j.fleet_id is not null then update public.fleets set live_odometer_km = v_odo where id = j.fleet_id; end if;
  if v_code = 'JOB-008' and nullif(p_data ->> 'nsd_mm', '') is not null then update public.tyres set nsd_mm = (p_data ->> 'nsd_mm')::numeric where id = j.tyre_id; end if;
  if v_code = 'JOB-009' and nullif(p_data ->> 'nsd_mm', '') is not null then update public.tyres set nsd_mm = (p_data ->> 'nsd_mm')::numeric where id = j.tyre_id; end if;
end $$;

-- "Set tyre not available": raises the complaint, the Fitment goes back to Waiting for tyre, the planned tyre is returned by an MRN
create function public.fitment_set_tyre_unavailable(p_job uuid, p_remarks text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); j public.job_ids; c public.job_cards; v_code text; v_type uuid; v_cmp uuid := gen_random_uuid(); v_size text; v_old uuid;
begin
  select * into j from public.job_ids where id = p_job and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'Job ID not found in your depot'; end if;
  if not (exists (select 1 from public.job_id_assignees where job_id_ref = p_job and employee_id = e.id) or app.has_capability('job.onbehalf')) then
    raise exception 'this Job ID is not assigned to you' using errcode = 'insufficient_privilege'; end if;
  select job_code into v_code from public.maintenance_jobs where id = j.job_code_id;
  if v_code <> 'JOB-009' then raise exception 'Set tyre not available is raised on a Fitment step'; end if;
  if j.status not in ('ASSIGNED', 'STARTED') then raise exception 'a Job ID that is % cannot be changed', j.status; end if;
  if j.fleet_id is null then raise exception 'this Fitment has no fleet'; end if;
  select * into c from public.job_cards where id = j.job_card_id;
  select id into v_type from public.complaint_types where complaint_code = 'CMP067' and status = 'ACTIVE';
  if v_type is null then raise exception 'the complaint type "Set tyre not available" is not active'; end if;
  v_old := j.tyre_id;
  select s.size_code into v_size from public.tyre_sizes s where s.id = app.tyre_size(v_old);
  insert into public.complaints (id, complaint_no, org_unit_id, source, fleet_id, complaint_type_id, remarks, raised_by)
  values (v_cmp, app.next_doc_no('CMPID', null, app.business_today()), e.org_unit_id, case e.role_code when 'TIC' then 'TYRE_IC' else 'TYRE_MAN' end, j.fleet_id, v_type,
          'Set tyre not available - ' || coalesce(v_size, '?') || ' · ' || c.job_card_no || ' · ' || j.job_id_no || coalesce(' · ' || nullif(btrim(p_remarks), ''), ''), e.id);
  if v_old is not null then
    update public.wsr_lines set job_id_ref = null where job_id_ref = p_job and part = 'TYRE';      -- the old material no longer belongs to this step
    if exists (select 1 from public.tyres where id = v_old and stock_place = 'IN_TRANSIT' and fleet_id is null)
       and not exists (select 1 from public.mrns where tyre_id = v_old and status = 'CREATED') then
      insert into public.mrns (mrn_no, org_unit_id, kind, tyre_id, job_card_id, job_id_ref, created_by, auto, ready, remarks)
      values (app.next_doc_no('MRN', e.org_unit_id, app.business_today()), e.org_unit_id, 'TYRE', v_old, j.job_card_id, p_job, e.id, true, true, 'Returned: set tyre not available');
    end if;
  end if;
  delete from public.job_id_assignees where job_id_ref = p_job;
  update public.job_ids set tyre_id = null, status = 'WAITING_FOR_TYRE', on_hold = false, hold_remarks = null, held_at = null where id = p_job;
  update public.fleet_orders set tyre_id = null, note = 'Want of tyre' where job_id_ref = p_job and order_type = 'FITMENT' and part = 'TYRE';
  perform app.log_event(j.job_card_id, p_job, 'SET_TYRE_NOT_AVAILABLE ' || v_size, e.id, p_remarks);
  return v_cmp;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 21. Setting / Unsetting job card for a live-stock tyre (no fleet)
-- ---------------------------------------------------------------------------------------------
create function public.tyre_service_create(p_job_code text, p_tyre uuid, p_expected date default null, p_shift uuid default null, p_instruction text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.create'); t public.tyres; v_card uuid := gen_random_uuid(); v_job uuid; v_exp date := coalesce(p_expected, app.business_today());
begin
  if p_job_code not in ('JOB-010', 'JOB-011') then raise exception 'choose Tyre Setting or Tyre Unsetting'; end if;
  select id into v_job from public.maintenance_jobs where job_code = p_job_code and status = 'ACTIVE';
  if v_job is null then raise exception 'the job code is not active'; end if;
  select * into t from public.tyres where id = p_tyre and owner_org_unit_id = e.org_unit_id and stock_place = 'LIVE_STOCK' for update;
  if not found then raise exception 'choose a tyre from the live stock of your depot'; end if;
  if p_job_code = 'JOB-010' and (t.stock_category <> 'GOOD' or t.setting_status = 'SET') then raise exception 'Tyre Setting needs a Good tyre that is not yet set'; end if;
  if p_job_code = 'JOB-011' and (t.stock_category <> 'REPAIR' or t.setting_status is distinct from 'SET') then raise exception 'Tyre Unsetting needs a set tyre of the Repair stock'; end if;
  if p_shift is not null and not exists (select 1 from public.shifts where id = p_shift and status = 'ACTIVE') then raise exception 'unknown shift'; end if;
  if v_exp < app.business_today() - 30 then raise exception 'expected date is too far in the past'; end if;
  if exists (select 1 from public.job_ids ji join public.job_cards jc on jc.id = ji.job_card_id where ji.tyre_id = p_tyre and jc.status not in ('COMPLETED', 'CLOSED')) then
    raise exception 'this tyre is already on an open job card'; end if;
  insert into public.job_cards (id, job_card_no, org_unit_id, job_type, fleet_id, expected_date, expected_shift_id, instruction, created_by)
  values (v_card, app.next_doc_no('JC', null, app.business_today()), e.org_unit_id, 'JOB_CODE', null, v_exp, p_shift, nullif(btrim(p_instruction), ''), e.id);
  perform app.new_job_id(v_card, v_job, p_tyre, null, null, e.org_unit_id);
  perform app.recompute_card_minutes(v_card);
  perform app.log_event(v_card, null, 'CREATED', e.id, p_instruction);
  return v_card;
end $$;

revoke all on function public.rotation_complete(uuid, boolean, numeric, boolean, text, text), public.work_form_complete(uuid, jsonb, text), public.fitment_set_tyre_unavailable(uuid, text),
  public.tyre_service_create(text, uuid, date, uuid, text) from public, anon;
grant execute on function public.rotation_complete(uuid, boolean, numeric, boolean, text, text), public.work_form_complete(uuid, jsonb, text), public.fitment_set_tyre_unavailable(uuid, text),
  public.tyre_service_create(text, uuid, date, uuid, text) to authenticated;
