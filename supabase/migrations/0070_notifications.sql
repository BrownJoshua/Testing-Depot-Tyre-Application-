-- 0070: notifications (D1 bell). Created by triggers on the tables the workflow already writes, so no existing function is rewritten.
--   complaint raised -> Tyre IC; inspection assigned -> inspector; work assigned -> Tyre Man; inspection done / final inspection due -> Tyre IC;
--   WSR GIN issued -> Tyre Men of the job card; MRN ready -> Tyre IC; WSR raised by a Tyre Man / SRN created -> Tyre IC.
--   The HO / AM bell lists job cards overdue since the day after their due date; it is worked out when the bell is read.

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  org_unit_id  uuid references public.org_units (id),
  recipient_id uuid not null references public.employees (id),
  kind         text not null,
  title        text not null,
  body         text,
  link         text,
  job_card_id  uuid references public.job_cards (id),
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);
create index notifications_recipient_idx on public.notifications (recipient_id, read_at, created_at desc);

create function app.notify(p_recipient uuid, p_org uuid, p_kind text, p_title text, p_body text, p_link text, p_card uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- the same unread notice for the same person and card is not repeated
  if exists (select 1 from public.notifications where recipient_id = p_recipient and kind = p_kind and read_at is null and job_card_id is not distinct from p_card and title = p_title) then return; end if;
  insert into public.notifications (org_unit_id, recipient_id, kind, title, body, link, job_card_id) values (p_org, p_recipient, p_kind, p_title, p_body, p_link, p_card);
end $$;

create function app.notify_role(p_org uuid, p_role public.role_code, p_kind text, p_title text, p_body text, p_link text, p_card uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare r uuid;
begin
  for r in select id from public.employees where org_unit_id = p_org and role_code = p_role and status = 'ACTIVE' loop
    perform app.notify(r, p_org, p_kind, p_title, p_body, p_link, p_card);
  end loop;
end $$;

-- ---- triggers
create function app.trg_notify_complaint() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.state = 'NEW' then
    perform app.notify_role(new.org_unit_id, 'TIC', 'COMPLAINT', 'Complaint ' || new.complaint_no || ' raised', 'Waiting for a job card', '/tic/complaints');
  end if;
  return new;
end $$;
create trigger notify_complaint after insert on public.complaints for each row execute function app.trg_notify_complaint();

create function app.trg_notify_inspection() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform app.notify(new.inspector_id, new.org_unit_id, 'INSPECTION', 'Inspection ' || new.inspection_no || ' assigned', 'Due ' || new.due_date, '/tm', new.job_card_id);
  return new;
end $$;
create trigger notify_inspection after insert on public.inspections for each row execute function app.trg_notify_inspection();

create function app.trg_notify_assignee() returns trigger language plpgsql security definer set search_path = '' as $$
declare j public.job_ids; c public.job_cards;
begin
  select * into j from public.job_ids where id = new.job_id_ref;
  select * into c from public.job_cards where id = j.job_card_id;
  perform app.notify(new.employee_id, j.org_unit_id, 'WORK', 'Work assigned: ' || c.job_card_no, 'Due ' || coalesce(j.due_date::text, c.expected_date::text), '/tm', c.id);
  return new;
end $$;
create trigger notify_assignee after insert on public.job_id_assignees for each row execute function app.trg_notify_assignee();

create function app.trg_notify_card() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'FINAL_INSPECTION' and old.status is distinct from new.status then
    perform app.notify_role(new.org_unit_id, 'TIC', 'FINAL_INSPECTION', 'Final inspection due: ' || new.job_card_no, 'All Job IDs are done', '/tic/job-cards/' || new.id, new.id);
  elsif new.status = 'INSPECTION_DONE' and old.status is distinct from new.status then
    perform app.notify_role(new.org_unit_id, 'TIC', 'INSPECTION_DONE', 'Inspection done: ' || new.job_card_no, 'Assign the work', '/tic/job-cards/' || new.id, new.id);
  end if;
  return new;
end $$;
create trigger notify_card after update of status on public.job_cards for each row execute function app.trg_notify_card();

create function app.trg_notify_gin() returns trigger language plpgsql security definer set search_path = '' as $$
declare w record; c public.job_cards;
begin
  for w in select distinct a.employee_id, l.job_card_id from public.wsr_lines l join public.job_ids j on j.job_card_id = l.job_card_id
             join public.job_id_assignees a on a.job_id_ref = j.id where l.wsr_id = new.wsr_id and l.job_card_id is not null loop
    select * into c from public.job_cards where id = w.job_card_id;
    perform app.notify(w.employee_id, new.org_unit_id, 'GIN', 'Material issued: ' || new.gin_no, 'Receive it as a GRN for ' || c.job_card_no, '/tm/grn', c.id);
  end loop;
  return new;
end $$;
create trigger notify_gin after insert on public.wsr_gins for each row execute function app.trg_notify_gin();

create function app.trg_notify_mrn() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'CREATED' and new.ready and (tg_op = 'INSERT' or not old.ready) then
    perform app.notify_role(new.org_unit_id, 'TIC', 'MRN', 'MRN ' || new.mrn_no || ' ready to receive', null, '/tic/material-return');
  end if;
  return new;
end $$;
create trigger notify_mrn after insert or update on public.mrns for each row execute function app.trg_notify_mrn();

create function app.trg_notify_wsr() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.source = 'TYRE_MAN' then
    perform app.notify_role(new.org_unit_id, 'TIC', 'WSR', 'WSR ' || new.wsr_no || ' raised', 'Issue the material', '/tic/wsr');
  end if;
  return new;
end $$;
create trigger notify_wsr after insert on public.wsrs for each row execute function app.trg_notify_wsr();

create function app.trg_notify_srn() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform app.notify_role(new.org_unit_id, 'TIC', 'SRN', 'SRN ' || new.srn_no || ' created', 'Receive the scrap', '/tic/srn');
  return new;
end $$;
create trigger notify_srn after insert on public.srns for each row execute function app.trg_notify_srn();

-- ---- reading
-- stored notices of the caller, plus (HO / AM) the overdue job cards of every depot since the day after the due date
create function public.notification_feed() returns table (id uuid, kind text, title text, body text, link text, job_card_id uuid, created_at timestamptz, read_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select n.id, n.kind, n.title, n.body, n.link, n.job_card_id, n.created_at, n.read_at
    from public.notifications n where n.recipient_id = app.my_employee_id()
  union all
  select null::uuid, 'OVERDUE', 'Overdue: ' || c.job_card_no, coalesce(o.name, '') || ' · due ' || c.expected_date || ' · ' || (app.business_today() - c.expected_date) || ' day(s)',
         case when app.my_role() = 'HO' then '/ho/reports' else '/am/reports' end, c.id, c.expected_date::timestamptz + interval '1 day', null::timestamptz
    from public.job_cards c left join public.org_units o on o.id = c.org_unit_id
   where app.my_role() in ('HO', 'AM') and c.expected_date < app.business_today() and c.status not in ('COMPLETED', 'CLOSED')
  order by 7 desc limit 300
$$;

create function public.notification_mark_read(p_ids uuid[] default null) returns int
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); n int;
begin
  update public.notifications set read_at = now() where recipient_id = e.id and read_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function app.notify(uuid, uuid, text, text, text, text, uuid), app.notify_role(uuid, public.role_code, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.notification_feed(), public.notification_mark_read(uuid[]) from public, anon;
grant execute on function public.notification_feed(), public.notification_mark_read(uuid[]) to authenticated;

alter table public.notifications enable row level security; alter table public.notifications force row level security;
grant select on public.notifications to authenticated;
create policy gate_active_user on public.notifications as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy read_own on public.notifications for select to authenticated using (recipient_id = app.my_employee_id());
