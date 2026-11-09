-- 0081: rotation_complete loops over the Job IDs with a plain variable
create or replace function public.rotation_complete(p_card uuid, p_swapped boolean, p_odometer numeric, p_powder boolean default null, p_reason text default null, p_photo text default null)
returns int language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); c public.job_cards; j public.job_ids; v_code text; v_due uuid; n int := 0; v_mine boolean; v_ids uuid[]; x uuid;
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
  foreach x in array v_ids loop
    select * into j from public.job_ids where id = x;
    insert into public.job_work_forms (job_id_ref, job_card_id, org_unit_id, tyre_id, odometer_km, powder_applied, swapped, not_swapped_reason, photo_data, recorded_by)
    values (j.id, p_card, c.org_unit_id, j.tyre_id, p_odometer, p_powder, p_swapped, case when not p_swapped then btrim(p_reason) end, case when not p_swapped then p_photo end, e.id)
    on conflict (job_id_ref) do update set odometer_km = excluded.odometer_km, powder_applied = excluded.powder_applied, swapped = excluded.swapped,
      not_swapped_reason = excluded.not_swapped_reason, photo_data = excluded.photo_data, recorded_by = excluded.recorded_by, recorded_at = now();
  end loop;
  foreach x in array v_ids loop
    select * into j from public.job_ids where id = x;
    if not p_swapped and j.id <> v_due then   -- the partner is Closed, not done
      update public.job_ids set status = 'CLOSED', started_at = coalesce(started_at, now()), done_at = now(), done_by = e.id, on_hold = false, hold_remarks = null where id = j.id;
      perform app.log_event(p_card, j.id, 'CLOSED_NOT_SWAPPED', e.id, p_reason);
    end if;
  end loop;
  foreach x in array v_ids loop
    select * into j from public.job_ids where id = x;
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

