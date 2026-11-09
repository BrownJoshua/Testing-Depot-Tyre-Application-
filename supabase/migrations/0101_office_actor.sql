-- 0101: HO and AM have no depot, so app.actor() (depot staff only) refuses them. The functions that HO / AM run get their own check. Fix forward of 0100.
create function app.office_actor(p_cap text) returns public.employees
language plpgsql stable security definer set search_path = '' as $$
declare e public.employees;
begin
  select * into e from public.employees where id = app.my_employee_id();
  if e.id is null then raise exception 'not signed in as an active employee' using errcode = 'insufficient_privilege'; end if;
  if not app.has_capability(p_cap) then raise exception 'your role is not allowed to do this' using errcode = 'insufficient_privilege'; end if;
  return e;
end $$;
revoke all on function app.office_actor(text) from public, anon, authenticated;

create or replace function public.air_type_request_act(p_req uuid, p_action text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees; r public.air_type_requests;
begin
  select * into r from public.air_type_requests where id = p_req for update;
  if not found then raise exception 'request not found'; end if;
  if p_action not in ('APPROVE', 'REJECT') then raise exception 'action must be APPROVE or REJECT'; end if;
  if p_action = 'REJECT' and length(btrim(coalesce(p_note, ''))) = 0 then raise exception 'a rejection needs a reason'; end if;
  if r.status = 'PENDING_HO' then
    e := app.office_actor('air_type.ho');
    update public.air_type_requests set status = case p_action when 'APPROVE' then 'PENDING_AM' else 'REJECTED' end, ho_by = e.id, ho_at = now(), decision_note = nullif(btrim(p_note), '') where id = p_req;
  elsif r.status = 'PENDING_AM' then
    e := app.office_actor('air_type.am');
    update public.air_type_requests set status = case p_action when 'APPROVE' then 'APPROVED' else 'REJECTED' end, am_by = e.id, am_at = now(), decision_note = nullif(btrim(p_note), '') where id = p_req;
    if p_action = 'APPROVE' then update public.fleets set air_type = r.to_type where id = r.fleet_id; end if;
  else raise exception 'this request is already %', r.status; end if;
end $$;

create or replace function public.damage_request_decide(p_req uuid, p_approve boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.office_actor('damage.decide'); r public.damage_requests;
begin
  select * into r from public.damage_requests where id = p_req for update;
  if not found then raise exception 'request not found'; end if;
  if r.status <> 'PENDING_APPROVAL' then raise exception 'this request is already %', r.status; end if;
  if not p_approve and length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'a returned request needs a reason'; end if;
  update public.damage_requests set status = case when p_approve then 'APPROVED' else 'RETURNED' end, returned_reason = case when p_approve then null else btrim(p_reason) end, decided_by = e.id, decided_at = now() where id = p_req;
end $$;

create or replace function public.tyre_correction_decide(p_req uuid, p_approve boolean, p_remarks text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.office_actor('tyre.correct_decide'); c public.tyre_corrections; f record;
begin
  select * into c from public.tyre_corrections where id = p_req for update;
  if not found then raise exception 'request not found'; end if;
  if c.status <> 'PENDING' then raise exception 'this request is already %', c.status; end if;
  if not p_approve and length(btrim(coalesce(p_remarks, ''))) = 0 then raise exception 'a rejection needs a reason'; end if;
  if p_approve then
    for f in select * from public.tyre_correction_fields where correction_id = p_req loop
      execute format('update public.tyres set %I = %L::%s where id = %L', f.field, f.correct_value, app.correctable_field_type(f.field), c.tyre_id);
    end loop;
  end if;
  update public.tyre_corrections set status = case when p_approve then 'APPROVED' else 'REJECTED' end, decided_by = e.id, decided_at = now(), decision_remarks = nullif(btrim(p_remarks), '') where id = p_req;
end $$;
