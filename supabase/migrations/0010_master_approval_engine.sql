-- 0010: the master-data approval engine (HO proposes -> AM approves), generic part.
-- STATUS: proposed in Stage 3 batch 3, NOT applied. Review and approve before running.
--
-- Rules implemented here (stage2-approval-workflows.md section A, your Stage 2.1 withdraw decision):
--   DRAFT -> PENDING_APPROVAL -> APPROVED | REJECTED | WITHDRAWN. Nothing else.
--   * Only HO proposes/submits/withdraws; only AM approves/rejects; the maker can never decide their own request.
--   * Reject and withdraw need non-blank remarks. Withdrawal only from PENDING_APPROVAL, only by the original
--     submitting HO user, or by the service-role administrator (admin_withdraw_master_request).
--   * A pending request never touches live master data; the submitted payload is frozen.
--   * APPROVED / REJECTED / WITHDRAWN are terminal (trigger-enforced).
--   * An AM cannot decide a change about their own employee record.
-- The per-entity work (validate_<entity>, apply_<entity>) is added entity by entity in Stage 4;
-- all 27 entity types are registered here but DISABLED until their functions exist.
-- request_no is a WORKING reference only (the prototype has no such number; UQ-44).

create type public.master_request_status as enum ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'WITHDRAWN');
create type public.master_action        as enum ('CREATE', 'UPDATE', 'DEACTIVATE', 'REACTIVATE');

create table public.master_entity_registry (
  entity_type       text primary key,
  label             text not null,
  target_table      text not null,
  validate_function text,                       -- app.<name>(jsonb); optional
  apply_function    text not null,              -- app.<name>(uuid request_id); required before enabling
  is_enabled        boolean not null default false,
  constraint registry_fn_names check (apply_function ~ '^[a-z][a-z0-9_]*$'
                                      and (validate_function is null or validate_function ~ '^[a-z][a-z0-9_]*$'))
);

insert into public.master_entity_registry (entity_type, label, target_table, validate_function, apply_function) values
  ('org_unit',              'Depots and organisational units', 'org_units',              'validate_org_unit',              'apply_org_unit'),
  ('employee',              'Employee / Tyre Man Register',    'employees',              'validate_employee',              'apply_employee'),
  ('skill',                 'Skills',                          'skills',                 'validate_skill',                 'apply_skill'),
  ('ref_value',             'Reference lists',                 'ref_values',             'validate_ref_value',             'apply_ref_value'),
  ('tyre_size',             'Tyre sizes',                      'tyre_sizes',             'validate_tyre_size',             'apply_tyre_size'),
  ('tyre_make',             'Tyre makes',                      'tyre_makes',             'validate_tyre_make',             'apply_tyre_make'),
  ('tyre_model',            'Tyre models',                     'tyre_models',            'validate_tyre_model',            'apply_tyre_model'),
  ('tyre_folio',            'Tyre Folio',                      'tyre_folios',            'validate_tyre_folio',            'apply_tyre_folio'),
  ('tyre_detail_column',    'Tyre Detailed Master',            'tyre_detail_columns',    'validate_tyre_detail_column',    'apply_tyre_detail_column'),
  ('fleet',                 'Fleet Register',                  'fleets',                 'validate_fleet',                 'apply_fleet'),
  ('fleet_type',            'Fleet Type Master',               'fleet_types',            'validate_fleet_type',            'apply_fleet_type'),
  ('route',                 'Routes',                          'routes',                 'validate_route',                 'apply_route'),
  ('tyre',                  'Tyre corrections',                'tyres',                  'validate_tyre',                  'apply_tyre'),
  ('folio_stock_param',     'Minimum / maximum stock',         'folio_stock_params',     'validate_folio_stock_param',     'apply_folio_stock_param'),
  ('maintenance_job',       'Maintenance Configuration: jobs', 'maintenance_jobs',       'validate_maintenance_job',       'apply_maintenance_job'),
  ('maintenance_schedule',  'Maintenance Configuration: schedules', 'maintenance_schedules', 'validate_maintenance_schedule', 'apply_maintenance_schedule'),
  ('psi_norm',              'PSI Norms',                       'psi_norms',              'validate_psi_norm',              'apply_psi_norm'),
  ('rotation_discout_norm', 'Rotation and Discout Norms',      'rotation_discout_norms', 'validate_rotation_discout_norm', 'apply_rotation_discout_norm'),
  ('expected_life_km',      'Expected Life KM',                'expected_life_km',       'validate_expected_life_km',      'apply_expected_life_km'),
  ('shift',                 'Shift Master',                    'shifts',                 'validate_shift',                 'apply_shift'),
  ('complaint_type',        'Tyre Complaint Master',           'complaint_types',        'validate_complaint_type',        'apply_complaint_type'),
  ('reason',                'Reason Master',                   'reasons',                'validate_reason',                'apply_reason'),
  ('reject_reason',         'Reject Reason Master',            'reject_reasons',         'validate_reject_reason',         'apply_reject_reason'),
  ('wear_pattern',          'Wear Pattern Master',             'wear_patterns',          'validate_wear_pattern',          'apply_wear_pattern'),
  ('qc_checklist',          'QC Master',                       'qc_checklists',          'validate_qc_checklist',          'apply_qc_checklist'),
  ('vendor',                'Vendor Master',                   'vendors',                'validate_vendor',                'apply_vendor'),
  ('tyre_number_series',    'MTC Tyre No series',              'tyre_number_series',     'validate_tyre_number_series',    'apply_tyre_number_series');

create sequence public.mcr_seq;

create table public.master_change_requests (
  id                    uuid primary key default gen_random_uuid(),
  request_no            text not null unique default ('MCR-' || lpad(nextval('public.mcr_seq')::text, 6, '0')),  -- WORKING reference
  entity_type           text not null references public.master_entity_registry (entity_type),
  target_id             uuid not null,           -- the existing record, or the id reserved for a new one
  action                public.master_action not null,
  status                public.master_request_status not null default 'DRAFT',
  proposed_payload      jsonb not null,
  base_snapshot         jsonb,                   -- the live record when the draft was made (for the before/after view)
  base_row_version      int,
  change_summary        text,
  maker_id              uuid not null references public.profiles (id),
  submitted_at          timestamptz,
  checker_id            uuid references public.profiles (id),
  decided_at            timestamptz,
  decision_remarks      text,
  applied_at            timestamptz,
  supersedes_request_id uuid references public.master_change_requests (id),
  withdrawn_by          uuid references public.profiles (id),
  withdrawn_via         text check (withdrawn_via in ('MAKER', 'ADMIN')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint mcr_payload_is_object check (jsonb_typeof(proposed_payload) = 'object'),
  constraint mcr_maker_not_checker check (checker_id is null or checker_id <> maker_id),
  constraint mcr_remarks_when_closed_negatively check (
    status not in ('REJECTED', 'WITHDRAWN') or length(btrim(coalesce(decision_remarks, ''))) > 0),
  constraint mcr_approved_has_checker check (
    status <> 'APPROVED' or (checker_id is not null and decided_at is not null and applied_at is not null)),
  constraint mcr_rejected_has_checker check (status <> 'REJECTED' or (checker_id is not null and decided_at is not null)),
  constraint mcr_withdrawn_has_origin check (
    status <> 'WITHDRAWN' or (withdrawn_via is not null and decided_at is not null
                              and (withdrawn_via = 'ADMIN' or withdrawn_by is not null)))
);
-- at most ONE open request per record
create unique index mcr_one_open_per_target on public.master_change_requests (entity_type, target_id)
  where status in ('DRAFT', 'PENDING_APPROVAL');
create index mcr_status_submitted_idx on public.master_change_requests (status, submitted_at);
create index mcr_maker_idx            on public.master_change_requests (maker_id);

create trigger mcr_touch before update on public.master_change_requests
  for each row execute function app.set_updated_at();

-- guard: terminal states are final, the payload is frozen once submitted, only the legal transitions exist
create function app.mcr_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status in ('APPROVED', 'REJECTED', 'WITHDRAWN') then
    raise exception 'request % is already %, no further change is allowed', old.request_no, old.status
      using errcode = 'check_violation';
  end if;
  if new.entity_type is distinct from old.entity_type or new.target_id is distinct from old.target_id
     or new.action is distinct from old.action or new.maker_id is distinct from old.maker_id then
    raise exception 'entity, target, action and maker of a request cannot change' using errcode = 'check_violation';
  end if;
  if old.status = 'PENDING_APPROVAL'
     and (new.proposed_payload is distinct from old.proposed_payload or new.base_snapshot is distinct from old.base_snapshot) then
    raise exception 'the proposed payload is frozen once the request is submitted' using errcode = 'check_violation';
  end if;
  if new.status is distinct from old.status
     and not ((old.status = 'DRAFT' and new.status = 'PENDING_APPROVAL')
           or (old.status = 'PENDING_APPROVAL' and new.status in ('APPROVED', 'REJECTED', 'WITHDRAWN'))) then
    raise exception 'illegal status change % -> %', old.status, new.status using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger mcr_guard before update on public.master_change_requests
  for each row execute function app.mcr_guard();

create table public.master_change_request_history (
  id          bigint generated always as identity primary key,
  request_id  uuid not null references public.master_change_requests (id),
  seq         int  not null,
  from_status public.master_request_status,
  to_status   public.master_request_status not null,
  action      text not null,
  actor_id    uuid,                                -- null for the administrator
  actor_role  public.role_code,
  via         text not null default 'APP' check (via in ('APP', 'ADMIN')),
  remarks     text,
  at          timestamptz not null default now(),
  unique (request_id, seq),
  constraint mcrh_remarks_required check (
    action not in ('REJECT', 'WITHDRAW', 'ADMIN_WITHDRAW') or length(btrim(coalesce(remarks, ''))) > 0)
);
create trigger mcr_history_append_only before update or delete on public.master_change_request_history
  for each row execute function app.forbid_change();
create trigger mcr_history_no_truncate before truncate on public.master_change_request_history
  for each statement execute function app.forbid_change();

-- one place that records a step (history + audit)
create function app.log_request_step(p_id uuid, p_from public.master_request_status, p_to public.master_request_status,
                                     p_action text, p_remarks text, p_via text default 'APP')
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.master_change_request_history (request_id, seq, from_status, to_status, action, actor_id, actor_role, via, remarks)
  values (p_id,
          coalesce((select max(h.seq) from public.master_change_request_history h where h.request_id = p_id), 0) + 1,
          p_from, p_to, p_action, auth.uid(), app.my_role(), p_via, p_remarks);
  insert into public.audit_logs (user_id, user_role, org_unit_id, action, table_name, record_id, new_values)
  values (auth.uid(), app.my_role(), app.my_depot_id(), 'MASTER_REQUEST_' || p_action, 'master_change_requests', p_id,
          jsonb_build_object('from', p_from, 'to', p_to, 'remarks', p_remarks, 'via', p_via));
end $$;

-- ---------------------------------------------------------------------------------------------
-- the transitions (only these functions can change a request)
-- ---------------------------------------------------------------------------------------------
create function public.master_request_create(p_entity text, p_action public.master_action, p_target uuid,
                                              p_payload jsonb, p_summary text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_reg public.master_entity_registry; v_target uuid := p_target; v_id uuid;
begin
  if app.my_role() is distinct from 'HO' or not app.has_capability('master.propose') then
    raise exception 'only HO (Tech) may propose master-data changes' using errcode = 'insufficient_privilege';
  end if;
  select * into v_reg from public.master_entity_registry where entity_type = p_entity;
  if not found or not v_reg.is_enabled then
    raise exception 'master type "%" is not enabled yet', p_entity using errcode = 'feature_not_supported';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'payload must be a JSON object'; end if;
  if p_action = 'CREATE' then v_target := coalesce(v_target, gen_random_uuid());
  elsif v_target is null then raise exception 'the record to change is required';
  end if;
  insert into public.master_change_requests (entity_type, target_id, action, proposed_payload, change_summary, maker_id)
  values (p_entity, v_target, p_action, p_payload, p_summary, auth.uid()) returning id into v_id;
  perform app.log_request_step(v_id, null, 'DRAFT', 'CREATE_DRAFT', null);
  return v_id;
end $$;

create function public.master_request_update(p_id uuid, p_payload jsonb, p_summary text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests;
begin
  select * into r from public.master_change_requests where id = p_id for update;
  if not found or r.maker_id <> auth.uid() or app.my_role() is distinct from 'HO' then
    raise exception 'request not found or not yours' using errcode = 'insufficient_privilege'; end if;
  if r.status <> 'DRAFT' then raise exception 'only a DRAFT can be edited (this one is %)', r.status; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'payload must be a JSON object'; end if;
  update public.master_change_requests set proposed_payload = p_payload, change_summary = coalesce(p_summary, change_summary) where id = p_id;
  perform app.log_request_step(p_id, 'DRAFT', 'DRAFT', 'EDIT_DRAFT', null);
end $$;

create function public.master_request_submit(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests; v_reg public.master_entity_registry;
begin
  select * into r from public.master_change_requests where id = p_id for update;
  if not found or r.maker_id <> auth.uid() or app.my_role() is distinct from 'HO' then
    raise exception 'request not found or not yours' using errcode = 'insufficient_privilege'; end if;
  if r.status <> 'DRAFT' then raise exception 'only a DRAFT can be submitted (this one is %)', r.status; end if;
  select * into v_reg from public.master_entity_registry where entity_type = r.entity_type;
  if not v_reg.is_enabled then raise exception 'master type "%" is not enabled', r.entity_type; end if;
  if v_reg.validate_function is not null
     and to_regprocedure(format('app.%I(jsonb)', v_reg.validate_function)) is not null then
    execute format('select app.%I($1)', v_reg.validate_function) using r.proposed_payload;   -- raises on invalid data
  end if;
  update public.master_change_requests set status = 'PENDING_APPROVAL', submitted_at = now() where id = p_id;
  perform app.log_request_step(p_id, 'DRAFT', 'PENDING_APPROVAL', 'SUBMIT', null);
end $$;

create function public.master_request_withdraw(p_id uuid, p_remarks text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests;
begin
  if length(btrim(coalesce(p_remarks, ''))) = 0 then raise exception 'withdrawal remarks are mandatory'; end if;
  select * into r from public.master_change_requests where id = p_id for update;   -- lock first: approve/withdraw cannot race
  if not found or r.maker_id <> auth.uid() or app.my_role() is distinct from 'HO' then
    raise exception 'only the HO user who submitted this request may withdraw it' using errcode = 'insufficient_privilege'; end if;
  if r.status <> 'PENDING_APPROVAL' then raise exception 'only a pending request can be withdrawn (this one is %)', r.status; end if;
  update public.master_change_requests
     set status = 'WITHDRAWN', withdrawn_by = auth.uid(), withdrawn_via = 'MAKER', decided_at = now(), decision_remarks = p_remarks
   where id = p_id;
  perform app.log_request_step(p_id, 'PENDING_APPROVAL', 'WITHDRAWN', 'WITHDRAW', p_remarks);
end $$;

create function public.master_request_reject(p_id uuid, p_remarks text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests;
begin
  if app.my_role() is distinct from 'AM' or not app.has_capability('master.approve') then
    raise exception 'only AM (Tech) may reject master-data changes' using errcode = 'insufficient_privilege'; end if;
  if length(btrim(coalesce(p_remarks, ''))) = 0 then raise exception 'rejection remarks are mandatory'; end if;
  select * into r from public.master_change_requests where id = p_id for update;
  if not found then raise exception 'request not found'; end if;
  if r.maker_id = auth.uid() then raise exception 'you cannot decide your own request' using errcode = 'insufficient_privilege'; end if;
  if r.status <> 'PENDING_APPROVAL' then raise exception 'request is no longer pending (it is %)', r.status; end if;
  update public.master_change_requests
     set status = 'REJECTED', checker_id = auth.uid(), decided_at = now(), decision_remarks = p_remarks where id = p_id;
  perform app.log_request_step(p_id, 'PENDING_APPROVAL', 'REJECTED', 'REJECT', p_remarks);
end $$;

create function public.master_request_approve(p_id uuid, p_remarks text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests; v_reg public.master_entity_registry;
begin
  if app.my_role() is distinct from 'AM' or not app.has_capability('master.approve') then
    raise exception 'only AM (Tech) may approve master-data changes' using errcode = 'insufficient_privilege'; end if;
  select * into r from public.master_change_requests where id = p_id for update;
  if not found then raise exception 'request not found'; end if;
  if r.maker_id = auth.uid() then raise exception 'you cannot decide your own request' using errcode = 'insufficient_privilege'; end if;
  if r.entity_type = 'employee' and r.target_id = app.my_employee_id() then
    raise exception 'you cannot decide a change about your own employee record' using errcode = 'insufficient_privilege'; end if;
  if r.status <> 'PENDING_APPROVAL' then raise exception 'request is no longer pending (it is %)', r.status; end if;
  select * into v_reg from public.master_entity_registry where entity_type = r.entity_type;
  if not v_reg.is_enabled or to_regprocedure(format('app.%I(uuid)', v_reg.apply_function)) is null then
    raise exception 'apply function for "%" is not installed', r.entity_type using errcode = 'feature_not_supported'; end if;
  execute format('select app.%I($1)', v_reg.apply_function) using p_id;   -- one transaction: if this fails nothing is approved
  update public.master_change_requests
     set status = 'APPROVED', checker_id = auth.uid(), decided_at = now(), applied_at = now(), decision_remarks = p_remarks where id = p_id;
  perform app.log_request_step(p_id, 'PENDING_APPROVAL', 'APPROVED', 'APPROVE', p_remarks);
end $$;

-- administrator override (service role / SQL editor only): never approves, rejects or edits
create function public.admin_withdraw_master_request(p_id uuid, p_remarks text, p_operator text default 'admin')
returns void language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests;
begin
  if length(btrim(coalesce(p_remarks, ''))) = 0 then raise exception 'withdrawal remarks are mandatory'; end if;
  select * into r from public.master_change_requests where id = p_id for update;
  if not found then raise exception 'request not found'; end if;
  if r.status <> 'PENDING_APPROVAL' then raise exception 'only a pending request can be withdrawn (this one is %)', r.status; end if;
  update public.master_change_requests
     set status = 'WITHDRAWN', withdrawn_via = 'ADMIN', withdrawn_by = null, decided_at = now(), decision_remarks = p_remarks where id = p_id;
  perform app.log_request_step(p_id, 'PENDING_APPROVAL', 'WITHDRAWN', 'ADMIN_WITHDRAW', p_remarks, 'ADMIN');
  insert into public.admin_action_log (operator, command, target, outcome, detail)
  values (coalesce(p_operator, 'admin'), 'withdraw-master-request', r.request_no, 'OK', p_remarks);
end $$;

revoke all on function app.mcr_guard(), app.log_request_step(uuid, public.master_request_status, public.master_request_status, text, text, text)
  from public, anon, authenticated;
revoke all on function public.master_request_create(text, public.master_action, uuid, jsonb, text),
                       public.master_request_update(uuid, jsonb, text), public.master_request_submit(uuid),
                       public.master_request_withdraw(uuid, text), public.master_request_reject(uuid, text),
                       public.master_request_approve(uuid, text), public.admin_withdraw_master_request(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.master_request_create(text, public.master_action, uuid, jsonb, text),
                          public.master_request_update(uuid, jsonb, text), public.master_request_submit(uuid),
                          public.master_request_withdraw(uuid, text), public.master_request_reject(uuid, text),
                          public.master_request_approve(uuid, text) to authenticated;
grant execute on function public.admin_withdraw_master_request(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------------------------
-- row-level security: HO and AM can read; nobody writes directly
-- ---------------------------------------------------------------------------------------------
alter table public.master_entity_registry        enable row level security; alter table public.master_entity_registry        force row level security;
alter table public.master_change_requests        enable row level security; alter table public.master_change_requests        force row level security;
alter table public.master_change_request_history enable row level security; alter table public.master_change_request_history force row level security;
grant select on public.master_entity_registry, public.master_change_requests, public.master_change_request_history to authenticated;

create policy gate_active_user on public.master_entity_registry        as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.master_change_requests        as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.master_change_request_history as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy read_ho_am on public.master_entity_registry        for select to authenticated using (app.my_role() in ('HO', 'AM'));
create policy read_ho_am on public.master_change_requests        for select to authenticated using (app.my_role() in ('HO', 'AM'));
create policy read_ho_am on public.master_change_request_history for select to authenticated using (app.my_role() in ('HO', 'AM'));

create view public.v_master_approval_queue with (security_invoker = true) as
select id, request_no, entity_type, action, change_summary, maker_id, submitted_at
from public.master_change_requests where status = 'PENDING_APPROVAL';
grant select on public.v_master_approval_queue to authenticated;
