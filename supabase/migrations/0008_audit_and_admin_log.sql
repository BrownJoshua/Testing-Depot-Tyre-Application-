-- 0008: append-only audit log, row-audit trigger, and the administrator action log.
-- STATUS: proposed in Stage 3 batch 3, NOT applied. Review and approve before running.
--
-- Design (stage2.1-security-review.md S-07):
--  * audit_logs is APPEND-ONLY: updates, deletes and truncates are refused for everyone (even postgres).
--  * Full before/after JSON is readable only by HO and AM. Supervisor and Tyre IC get v_audit_summary:
--    who, when, what, which table and record, but NO JSON values.
--  * admin_action_log records actions of the project-administrator scripts. It has no policy and no grant for
--    any application role: only the service role (the admin script) can write or read it.

-- ---------------------------------------------------------------------------------------------
-- append-only guard (reused by later history tables)
-- ---------------------------------------------------------------------------------------------
create function app.forbid_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'table % is append-only: % is not allowed', tg_table_name, tg_op
    using errcode = 'integrity_constraint_violation';
end $$;
revoke all on function app.forbid_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------------------------
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),        -- real system time, never the demo date
  user_id     uuid,                                      -- null for administrator / migration actions
  user_role   public.role_code,
  org_unit_id uuid,                                      -- depot of the acting user, if any
  action      text not null,
  table_name  text not null,
  record_id   uuid,
  old_values  jsonb,
  new_values  jsonb
);
create index audit_logs_table_record_idx on public.audit_logs (table_name, record_id);
create index audit_logs_user_at_idx      on public.audit_logs (user_id, at);
create index audit_logs_depot_at_idx     on public.audit_logs (org_unit_id, at);
create index audit_logs_at_brin          on public.audit_logs using brin (at);

create trigger audit_logs_append_only before update or delete on public.audit_logs
  for each row execute function app.forbid_change();
create trigger audit_logs_no_truncate before truncate on public.audit_logs
  for each statement execute function app.forbid_change();

-- generic row-audit trigger function; runs as owner so clients need no insert right on audit_logs
create function app.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_old jsonb; v_new jsonb; v_rec jsonb;
begin
  if tg_op = 'INSERT' then v_new := to_jsonb(new); v_rec := v_new;
  elsif tg_op = 'UPDATE' then v_old := to_jsonb(old); v_new := to_jsonb(new); v_rec := v_new;
  else v_old := to_jsonb(old); v_rec := v_old;
  end if;
  insert into public.audit_logs (user_id, user_role, org_unit_id, action, table_name, record_id, old_values, new_values)
  values (auth.uid(), app.my_role(), app.my_depot_id(), tg_op, tg_table_name,
          nullif(coalesce(v_rec ->> 'id', v_rec ->> 'org_unit_id'), '')::uuid, v_old, v_new);
  return null;
end $$;
revoke all on function app.audit_row() from public, anon, authenticated;

-- audit the identity tables from batch 2
create trigger audit_org_units         after insert or update or delete on public.org_units         for each row execute function app.audit_row();
create trigger audit_depots            after insert or update or delete on public.depots            for each row execute function app.audit_row();
create trigger audit_employees         after insert or update or delete on public.employees         for each row execute function app.audit_row();
create trigger audit_profiles          after insert or update or delete on public.profiles          for each row execute function app.audit_row();
create trigger audit_user_depot_access after insert or update or delete on public.user_depot_access for each row execute function app.audit_row();
create trigger audit_role_capabilities after insert or update or delete on public.role_capabilities for each row execute function app.audit_row();

alter table public.audit_logs enable row level security;
alter table public.audit_logs force  row level security;
grant select on public.audit_logs to authenticated;
create policy gate_active_user on public.audit_logs as restrictive for all to authenticated
  using (app.is_active_user()) with check (app.is_active_user());
create policy read_full_audit on public.audit_logs for select to authenticated
  using (app.my_role() in ('HO', 'AM'));

-- the depot-role view: no before/after JSON (it can contain personal fields)
create view public.v_audit_summary with (security_barrier = true) as
select a.id, a.at, a.user_id, a.user_role, a.org_unit_id, a.action, a.table_name, a.record_id
from public.audit_logs a
where app.is_active_user()
  and (app.my_role() in ('HO', 'AM')
       or (app.my_role() in ('SUP', 'TIC') and a.org_unit_id in (select app.my_visible_depot_ids())));
revoke all on public.v_audit_summary from public, anon, authenticated;
grant select on public.v_audit_summary to authenticated;

-- ---------------------------------------------------------------------------------------------
-- admin_action_log (written only by the administrator scripts through the service role)
-- ---------------------------------------------------------------------------------------------
create table public.admin_action_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  operator   text not null,               -- free text: who ran the script
  command    text not null,               -- e.g. create-user, reset-password, set-demo-date
  target     text,                        -- e.g. an employee code or request number (never a secret)
  outcome    text not null,
  detail     text
);
create trigger admin_action_log_append_only before update or delete on public.admin_action_log
  for each row execute function app.forbid_change();
create trigger admin_action_log_no_truncate before truncate on public.admin_action_log
  for each statement execute function app.forbid_change();
alter table public.admin_action_log enable row level security;
alter table public.admin_action_log force  row level security;
-- no policy, no grant: invisible to every application role; the service role bypasses RLS
