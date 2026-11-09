-- 0071: the Tyre Man asks to prepone / postpone the work of a job card (with a reason); the Tyre IC approves or rejects.
-- On approval the due date of the open Job IDs and of the card moves; a schedule card also moves its chart row (like Prepone / Postpone on the chart).

create table public.reschedule_requests (
  id           uuid primary key default gen_random_uuid(),
  org_unit_id  uuid not null references public.depots (org_unit_id),
  job_card_id  uuid not null references public.job_cards (id),
  requested_by uuid not null references public.employees (id),
  kind         text not null check (kind in ('PREPONE', 'POSTPONE')),
  from_date    date not null,
  to_date      date not null,
  reason       text not null check (length(btrim(reason)) > 0),
  status       text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  decided_by   uuid references public.employees (id),
  decided_at   timestamptz,
  remarks      text,
  created_at   timestamptz not null default now(),
  constraint reschedule_dates_differ check (from_date <> to_date),
  constraint reschedule_reject_needs_remarks check (status <> 'REJECTED' or length(btrim(coalesce(remarks, ''))) > 0)
);
create unique index reschedule_one_pending on public.reschedule_requests (job_card_id) where status = 'PENDING';
create trigger audit_reschedule_requests after insert or update or delete on public.reschedule_requests for each row execute function app.audit_row();

create function public.reschedule_request(p_card uuid, p_new_date date, p_reason text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('reschedule.request'); c public.job_cards; v uuid := gen_random_uuid(); v_from date;
begin
  select * into c from public.job_cards where id = p_card and org_unit_id = e.org_unit_id;
  if not found then raise exception 'job card not found in your depot'; end if;
  if c.status in ('COMPLETED', 'CLOSED') then raise exception 'this job card is already %', lower(c.status); end if;
  if not exists (select 1 from public.job_ids j join public.job_id_assignees a on a.job_id_ref = j.id
                  where j.job_card_id = p_card and a.employee_id = e.id and j.status in ('ASSIGNED', 'STARTED')) then
    raise exception 'you have no open Job ID on this job card'; end if;
  v_from := coalesce((select min(due_date) from public.job_ids where job_card_id = p_card and status in ('ASSIGNED', 'STARTED')), c.expected_date);
  if p_new_date is null or p_new_date = v_from then raise exception 'choose a different date'; end if;
  if p_new_date < app.business_today() then raise exception 'the new date cannot be in the past'; end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'please give a reason'; end if;
  insert into public.reschedule_requests (id, org_unit_id, job_card_id, requested_by, kind, from_date, to_date, reason)
  values (v, e.org_unit_id, p_card, e.id, case when p_new_date < v_from then 'PREPONE' else 'POSTPONE' end, v_from, p_new_date, btrim(p_reason));
  perform app.log_event(p_card, null, 'RESCHEDULE_REQUESTED ' || p_new_date, e.id, p_reason);
  perform app.notify_role(e.org_unit_id, 'TIC', 'RESCHEDULE', initcap(case when p_new_date < v_from then 'prepone' else 'postpone' end) || ' request: ' || c.job_card_no, e.full_name || ' · to ' || p_new_date || ' · ' || btrim(p_reason), '/tic/requests', p_card);
  return v;
end $$;

create function public.reschedule_decide(p_request uuid, p_approve boolean, p_remarks text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.assign'); r public.reschedule_requests; c public.job_cards; i record;
begin
  select * into r from public.reschedule_requests where id = p_request and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'request not found in your depot'; end if;
  if r.status <> 'PENDING' then raise exception 'this request is already %', lower(r.status); end if;
  if not p_approve and length(btrim(coalesce(p_remarks, ''))) = 0 then raise exception 'please give a reason for rejecting'; end if;
  select * into c from public.job_cards where id = r.job_card_id;
  if p_approve then
    update public.job_ids set due_date = r.to_date where job_card_id = r.job_card_id and status in ('ASSIGNED', 'STARTED', 'PENDING');
    update public.job_cards set expected_date = r.to_date where id = r.job_card_id and status not in ('COMPLETED', 'CLOSED');
    for i in select id from public.schedule_items where job_card_id = r.job_card_id and done_date is null and due_date <> r.to_date loop
      update public.schedule_items set due_date = r.to_date, moved_reason = 'Tyre Man request: ' || r.reason where id = i.id;
    end loop;
  end if;
  update public.reschedule_requests set status = case when p_approve then 'APPROVED' else 'REJECTED' end, decided_by = e.id, decided_at = now(), remarks = nullif(btrim(p_remarks), '') where id = p_request;
  perform app.log_event(r.job_card_id, null, case when p_approve then 'RESCHEDULE_APPROVED ' else 'RESCHEDULE_REJECTED ' end || r.to_date, e.id, p_remarks);
  perform app.notify(r.requested_by, r.org_unit_id, 'RESCHEDULE', case when p_approve then 'Request approved: ' else 'Request rejected: ' end || c.job_card_no,
                     case when p_approve then 'New date ' || r.to_date else coalesce(btrim(p_remarks), '') end, '/tm', r.job_card_id);
end $$;

revoke all on function public.reschedule_request(uuid, date, text), public.reschedule_decide(uuid, boolean, text) from public, anon;
grant execute on function public.reschedule_request(uuid, date, text), public.reschedule_decide(uuid, boolean, text) to authenticated;

alter table public.reschedule_requests enable row level security; alter table public.reschedule_requests force row level security;
grant select on public.reschedule_requests to authenticated;
create policy gate_active_user on public.reschedule_requests as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy read_depot on public.reschedule_requests for select to authenticated using (
  org_unit_id in (select app.my_visible_depot_ids()) and (app.my_role() <> 'TM' or requested_by = app.my_employee_id()));
