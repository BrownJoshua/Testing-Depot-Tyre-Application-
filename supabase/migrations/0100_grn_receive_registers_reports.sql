-- 0100: top-25 items 11, 15, 18, 24, 25
--   11  GRN receive: partial receipt, received date & time, reject reasons from the Reject Reason Master, TRS and MIC receipts, GRN lines
--   15  Tyre Register history uses GRN lines (new) beside the existing documents
--   18  PSI Norms through the approval engine; air-type conversion requests (Tyre IC raises, HO then AM approve)
--   24  Premature Failure Report, Tyre Damage Report / requests, DRN (warranty return, Supervisor approves)
--   25  Tyre Correction Request (Tyre IC raises, HO approves) and the Tyre Detailed Master (approval engine)

-- ---------------------------------------------------------------------------------------------
-- capabilities
-- ---------------------------------------------------------------------------------------------
insert into public.role_capabilities (role_code, capability, is_enabled, is_resolved, note) values
  ('TIC', 'air_type.request', true, true, 'Tyre IC raises an air-type conversion request'),
  ('HO',  'air_type.ho',      true, true, 'HO checks the air-type request'),
  ('AM',  'air_type.am',      true, true, 'AM approves the air-type request'),
  ('TIC', 'report.raise',     true, true, 'Premature failure / damage reports'),
  ('HO',  'damage.decide',    true, true, 'stands in for the TRS Incharge, who is not a user of this build'),
  ('AM',  'damage.decide',    true, true, 'stands in for the TRS Incharge, who is not a user of this build'),
  ('TIC', 'stock.drn',        true, true, 'Tyre IC creates a DRN (warranty return)'),
  ('TIC', 'tyre.correct',     true, true, 'Tyre IC raises a tyre correction request'),
  ('HO',  'tyre.correct_decide', true, true, 'HO approves or rejects a tyre correction');

-- ---------------------------------------------------------------------------------------------
-- 11. GRN receive
-- ---------------------------------------------------------------------------------------------
alter table public.grns add column receipt_at timestamptz, add column note text;
alter table public.grns drop constraint grns_source_check;
alter table public.grns add constraint grns_source_check check (source in ('WSR_GIN', 'MRN', 'INDENT_GIN', 'TRS', 'MIC'));
alter table public.indent_gin_tyres drop constraint indent_gin_tyres_result_check;
alter table public.indent_gin_tyres add constraint indent_gin_tyres_result_check check (result is null or result in ('ACCEPTED', 'REJECTED', 'MISSING'));
alter table public.tyres add column trs_ready_at timestamptz;      -- retreaded tyres reported ready at TRS: a Ready to receive row on the GRN screen

create table public.grn_lines (
  grn_id      uuid not null references public.grns (id),
  tyre_id     uuid not null references public.tyres (id),
  org_unit_id uuid not null references public.depots (org_unit_id),
  result      text not null check (result in ('ACCEPTED', 'REJECTED', 'MISSING')),
  reason      text,
  note        text,                                          -- MIC: "Returned unused" / "Fitted on road - removed tyre X from fleet Y"
  primary key (grn_id, tyre_id)
);

-- four tyres of Mandaveli that TRS reports ready (the 12 at TRS are the prototype's sample)
update public.tyres set trs_ready_at = now() - interval '2 days'
 where id in (select t.id from public.tyres t where t.stock_place = 'AT_TRS' and t.owner_org_unit_id = (select id from public.org_units where code = 'MN') order by t.mtc_no limit 4);

-- a reject reason must be one of the approved reasons of the Reject Reason Master
create function app.check_reject_reason(p text) returns text language plpgsql stable security definer set search_path = '' as $$
declare v text := btrim(coalesce(p, ''));
begin
  if v = '' then raise exception 'a rejected tyre needs a reject reason'; end if;
  if not exists (select 1 from public.reject_reasons where status = 'ACTIVE' and (reason_text = v or reason_code = v)) then
    raise exception 'the reject reason must be one of the Reject Reason Master (got "%")', v; end if;
  return (select reason_text from public.reject_reasons where status = 'ACTIVE' and (reason_text = v or reason_code = v) limit 1);
end $$;

-- receive tyres sent by another depot (Indent GIN): partial receipt allowed; the GIN stays In transit until every tyre has a result
-- p_close_reason: closes the tyres that did not arrive (Missing)
create function public.grn_receive_gin2(p_gin uuid, p_results jsonb, p_received_at timestamptz default null, p_close_reason text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.receive_gin'); g public.indent_gins; x jsonb; t uuid; n int := 0; n_acc int := 0; n_left int; v_no text; v_id uuid := gen_random_uuid(); v_reason text; v_when timestamptz;
begin
  select * into g from public.indent_gins where id = p_gin and to_unit_id = e.org_unit_id for update;
  if not found then raise exception 'this GIN is not addressed to your depot'; end if;
  if g.status <> 'IN_TRANSIT' then raise exception 'only a GIN in transit can be received (this one is %)', g.status; end if;
  v_when := coalesce(p_received_at, now());
  if g.in_transit_at is not null and v_when < g.in_transit_at - interval '1 minute' then raise exception 'the received date & time cannot be before the gate pass'; end if;
  insert into public.grns (id, grn_no, org_unit_id, source, indent_gin_id, issued_qty, accepted_qty, rejected_qty, received_by, receipt_at)
  values (v_id, app.next_doc_no('GRN', e.org_unit_id, app.business_today()), e.org_unit_id, 'INDENT_GIN', p_gin, 0, 0, 0, e.id, v_when) returning grn_no into v_no;
  for x in select * from jsonb_array_elements(coalesce(p_results, '[]')) loop
    t := nullif(x ->> 'tyre_id', '')::uuid;
    if not exists (select 1 from public.indent_gin_tyres where gin_id = p_gin and tyre_id = t and result is null) then raise exception 'a result is for a tyre that is not waiting on this GIN'; end if;
    n := n + 1;
    if coalesce((x ->> 'accept')::boolean, false) then
      n_acc := n_acc + 1;
      update public.indent_gin_tyres set result = 'ACCEPTED' where gin_id = p_gin and tyre_id = t;
      update public.tyres set owner_org_unit_id = e.org_unit_id, stock_place = 'LIVE_STOCK', transit_status = null, received_date = app.business_today() where id = t;
      insert into public.grn_lines (grn_id, tyre_id, org_unit_id, result) values (v_id, t, e.org_unit_id, 'ACCEPTED');
    else
      v_reason := app.check_reject_reason(x ->> 'reason');
      update public.indent_gin_tyres set result = 'REJECTED', reason = v_reason where gin_id = p_gin and tyre_id = t;
      update public.tyres set stock_place = 'LIVE_STOCK', transit_status = null where id = t;      -- goes back to the sender
      insert into public.grn_lines (grn_id, tyre_id, org_unit_id, result, reason) values (v_id, t, e.org_unit_id, 'REJECTED', v_reason);
    end if;
  end loop;
  select count(*) into n_left from public.indent_gin_tyres where gin_id = p_gin and result is null;
  if n_left > 0 and length(btrim(coalesce(p_close_reason, ''))) > 0 then      -- the rest did not arrive: close them with the reason
    for t in select tyre_id from public.indent_gin_tyres where gin_id = p_gin and result is null loop
      update public.indent_gin_tyres set result = 'MISSING', reason = btrim(p_close_reason) where gin_id = p_gin and tyre_id = t;
      update public.tyres set stock_place = 'LIVE_STOCK', transit_status = null where id = t;
      insert into public.grn_lines (grn_id, tyre_id, org_unit_id, result, reason) values (v_id, t, e.org_unit_id, 'MISSING', btrim(p_close_reason));
      n := n + 1;
    end loop;
    n_left := 0;
  end if;
  if n = 0 then raise exception 'mark at least one tyre'; end if;
  update public.grns set issued_qty = n, accepted_qty = n_acc, rejected_qty = n - n_acc where id = v_id;
  if n_left = 0 then
    update public.indent_gins set status = 'RECEIVED', received_at = v_when where id = p_gin;
    update public.gate_passes set status = 'RECEIVED', received_at = v_when where gin_id = p_gin and status in ('ISSUED', 'EXITED');
    if g.indent_id is not null then update public.indents set status = 'RECEIVED' where id = g.indent_id; end if;
  end if;
  return v_no;
end $$;

-- receive from TRS (retreaded tyres reported ready) or from a MIC vehicle (tyres issued to it come back)
-- p_results: [{"tyre_id": uuid, "accept": bool, "reason": text, "returned_as": "UNUSED"|"FITTED", "removed_tyre_no": text, "fleet_no": text}]
create function public.grn_receive_unit(p_kind text, p_results jsonb, p_received_at timestamptz default null, p_close_reason text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.receive_gin'); x jsonb; t public.tyres; n int := 0; n_acc int := 0; v_no text; v_id uuid := gen_random_uuid(); v_reason text; v_note text; v_place text; v_when timestamptz;
begin
  if p_kind not in ('TRS', 'MIC') then raise exception 'receive from TRS or MIC'; end if;
  v_place := case p_kind when 'TRS' then 'AT_TRS' else 'AT_MIC' end;
  v_when := coalesce(p_received_at, now());
  insert into public.grns (id, grn_no, org_unit_id, source, issued_qty, accepted_qty, rejected_qty, received_by, receipt_at)
  values (v_id, app.next_doc_no('GRN', e.org_unit_id, app.business_today()), e.org_unit_id, p_kind, 0, 0, 0, e.id, v_when) returning grn_no into v_no;
  for x in select * from jsonb_array_elements(coalesce(p_results, '[]')) loop
    select * into t from public.tyres where id = nullif(x ->> 'tyre_id', '')::uuid and owner_org_unit_id = e.org_unit_id and stock_place = v_place for update;
    if not found then raise exception 'a result is for a tyre that is not at % for your depot', p_kind; end if;
    if p_kind = 'TRS' and t.trs_ready_at is null then raise exception 'tyre % is not reported ready by TRS', t.mtc_no; end if;
    n := n + 1; v_note := null;
    if coalesce((x ->> 'accept')::boolean, false) then
      n_acc := n_acc + 1;
      if p_kind = 'MIC' then
        if coalesce(x ->> 'returned_as', 'UNUSED') = 'FITTED' then
          if length(btrim(coalesce(x ->> 'removed_tyre_no', ''))) = 0 or length(btrim(coalesce(x ->> 'fleet_no', ''))) = 0 then raise exception 'for a tyre fitted on the road give the removed tyre no and the fleet no'; end if;
          v_note := 'Fitted on road - removed tyre ' || btrim(x ->> 'removed_tyre_no') || ' from fleet ' || btrim(x ->> 'fleet_no');
        else v_note := 'Returned unused'; end if;
      end if;
      update public.tyres set stock_place = 'LIVE_STOCK', stock_category = 'GOOD', transit_status = null, trs_ready_at = null, received_date = app.business_today() where id = t.id;
      insert into public.grn_lines (grn_id, tyre_id, org_unit_id, result, note) values (v_id, t.id, e.org_unit_id, 'ACCEPTED', v_note);
    else
      v_reason := app.check_reject_reason(x ->> 'reason');
      update public.tyres set trs_ready_at = null where id = t.id;         -- a rejected tyre stays where it was
      insert into public.grn_lines (grn_id, tyre_id, org_unit_id, result, reason) values (v_id, t.id, e.org_unit_id, 'REJECTED', v_reason);
    end if;
  end loop;
  if length(btrim(coalesce(p_close_reason, ''))) > 0 and p_kind = 'TRS' then      -- the tyres that did not arrive are closed with a reason
    for t in select * from public.tyres where owner_org_unit_id = e.org_unit_id and stock_place = 'AT_TRS' and trs_ready_at is not null loop
      update public.tyres set trs_ready_at = null where id = t.id;
      insert into public.grn_lines (grn_id, tyre_id, org_unit_id, result, reason) values (v_id, t.id, e.org_unit_id, 'MISSING', btrim(p_close_reason));
      n := n + 1;
    end loop;
  end if;
  if n = 0 then raise exception 'mark at least one tyre'; end if;
  update public.grns set issued_qty = n, accepted_qty = n_acc, rejected_qty = n - n_acc where id = v_id;
  return v_no;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 18. PSI Norms (approval engine) and air-type conversion requests
-- ---------------------------------------------------------------------------------------------
alter table public.psi_norms add column row_version int not null default 1, add column updated_at timestamptz not null default now();
create trigger psi_norms_touch before update on public.psi_norms for each row execute function app.set_updated_at();
create trigger audit_psi_norms after insert or update or delete on public.psi_norms for each row execute function app.audit_row();

create function app.validate_psi_norm(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare k text;
begin
  perform app.check_keys(p, array['size_id', 'construction', 'front_regular', 'front_nitrogen', 'rear_regular', 'rear_nitrogen']);
  if p ? 'size_id' and not exists (select 1 from public.tyre_sizes where id = nullif(p ->> 'size_id', '')::uuid) then raise exception 'unknown tyre size'; end if;
  if p ? 'construction' and (p ->> 'construction') not in ('NYLON', 'RADIAL') then raise exception 'construction must be NYLON or RADIAL'; end if;
  foreach k in array array['front_regular', 'front_nitrogen', 'rear_regular', 'rear_nitrogen'] loop
    if p ? k and ((p ->> k) !~ '^[0-9]{2,3}$' or (p ->> k)::int not between 20 and 200) then raise exception '% must be a PSI between 20 and 200', k; end if;
  end loop;
end $$;
create function app.apply_psi_norm(p_request uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'psi_norm'); p jsonb := r.proposed_payload;
begin
  perform app.validate_psi_norm(p);
  if r.action = 'CREATE' then
    if not (p ? 'size_id' and p ? 'construction' and p ? 'front_regular' and p ? 'front_nitrogen' and p ? 'rear_regular' and p ? 'rear_nitrogen') then raise exception 'a norm needs the size, construction and the four PSI values'; end if;
    insert into public.psi_norms (id, size_id, construction, front_regular, front_nitrogen, rear_regular, rear_nitrogen)
    values (r.target_id, (p ->> 'size_id')::uuid, p ->> 'construction', (p ->> 'front_regular')::int, (p ->> 'front_nitrogen')::int, (p ->> 'rear_regular')::int, (p ->> 'rear_nitrogen')::int);
  else
    if not exists (select 1 from public.psi_norms where id = r.target_id) then raise exception 'PSI norm not found'; end if;
    update public.psi_norms set status = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      front_regular = coalesce((p ->> 'front_regular')::int, front_regular), front_nitrogen = coalesce((p ->> 'front_nitrogen')::int, front_nitrogen),
      rear_regular = coalesce((p ->> 'rear_regular')::int, rear_regular), rear_nitrogen = coalesce((p ->> 'rear_nitrogen')::int, rear_nitrogen), row_version = row_version + 1 where id = r.target_id;
  end if;
end $$;
update public.master_entity_registry set is_enabled = true where entity_type = 'psi_norm';

create table public.air_type_requests (
  id          uuid primary key default gen_random_uuid(),
  req_no      text not null unique,
  org_unit_id uuid not null references public.depots (org_unit_id),
  fleet_id    uuid not null references public.fleets (id),
  from_type   text not null check (from_type in ('REGULAR', 'NITROGEN')),
  to_type     text not null check (to_type in ('REGULAR', 'NITROGEN') and to_type <> from_type),
  reason      text not null check (length(btrim(reason)) > 0),
  status      text not null default 'PENDING_HO' check (status in ('PENDING_HO', 'PENDING_AM', 'APPROVED', 'REJECTED')),
  decision_note text,
  requested_by uuid not null references public.employees (id),
  requested_at timestamptz not null default now(),
  ho_by uuid references public.employees (id), ho_at timestamptz,
  am_by uuid references public.employees (id), am_at timestamptz
);
create trigger audit_air_type_requests after insert or update or delete on public.air_type_requests for each row execute function app.audit_row();
insert into public.document_number_series (series_code, label, template, scope, reset_policy, seq_width, start_value, is_confirmed, evidence_note)
values ('ATR', 'Air-type conversion request', 'ATR-{SEQ}', 'GLOBAL', 'NEVER', 3, 1, true, 'new in this build'),
       ('TCR', 'Tyre correction request', 'TCR-{SEQ}', 'GLOBAL', 'NEVER', 3, 1, true, 'new in this build');

create function public.air_type_request_create(p_fleet uuid, p_to text, p_reason text) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('air_type.request'); f public.fleets; v_no text;
begin
  select * into f from public.fleets where id = p_fleet and org_unit_id = e.org_unit_id and status = 'ACTIVE';
  if not found then raise exception 'that fleet is not an active fleet of your depot'; end if;
  if p_to not in ('REGULAR', 'NITROGEN') or p_to = f.air_type then raise exception 'choose the other air type (the fleet now uses %)', f.air_type; end if;
  if exists (select 1 from public.air_type_requests where fleet_id = p_fleet and status in ('PENDING_HO', 'PENDING_AM')) then raise exception 'this fleet already has an open request'; end if;
  v_no := app.next_doc_no('ATR', null, app.business_today());
  insert into public.air_type_requests (req_no, org_unit_id, fleet_id, from_type, to_type, reason, requested_by) values (v_no, e.org_unit_id, p_fleet, f.air_type, p_to, btrim(p_reason), e.id);
  return v_no;
end $$;

-- p_action APPROVE | REJECT. HO moves it to AM; AM applies it. A rejection needs a note.
create function public.air_type_request_act(p_req uuid, p_action text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); r public.air_type_requests;
begin
  select * into r from public.air_type_requests where id = p_req for update;
  if not found then raise exception 'request not found'; end if;
  if p_action not in ('APPROVE', 'REJECT') then raise exception 'action must be APPROVE or REJECT'; end if;
  if p_action = 'REJECT' and length(btrim(coalesce(p_note, ''))) = 0 then raise exception 'a rejection needs a reason'; end if;
  if r.status = 'PENDING_HO' then
    perform app.actor('air_type.ho');
    update public.air_type_requests set status = case p_action when 'APPROVE' then 'PENDING_AM' else 'REJECTED' end, ho_by = e.id, ho_at = now(), decision_note = nullif(btrim(p_note), '') where id = p_req;
  elsif r.status = 'PENDING_AM' then
    perform app.actor('air_type.am');
    update public.air_type_requests set status = case p_action when 'APPROVE' then 'APPROVED' else 'REJECTED' end, am_by = e.id, am_at = now(), decision_note = nullif(btrim(p_note), '') where id = p_req;
    if p_action = 'APPROVE' then update public.fleets set air_type = r.to_type where id = r.fleet_id; end if;
  else raise exception 'this request is already %', r.status; end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 24. Premature Failure Report, Tyre Damage Report, DRN
-- ---------------------------------------------------------------------------------------------
create table public.pfr_reports (
  id            uuid primary key default gen_random_uuid(),
  report_no     text not null unique,
  org_unit_id   uuid not null references public.depots (org_unit_id),
  tyre_id       uuid not null references public.tyres (id),
  fleet_id      uuid references public.fleets (id),
  position      text,
  skid_depth_mm numeric(4,1),
  fault_on      text not null check (fault_on in ('DRIVER', 'TYRE_MAN', 'MANUFACTURER', 'NO_FAULT')),
  employee_code text, employee_name text,
  km_run        numeric(10,1) not null check (km_run >= 0),
  norm_km       numeric(10,1) not null check (norm_km > 0),
  remaining_km  numeric(10,1) generated always as (greatest(norm_km - km_run, 0)) stored,
  tyre_price    numeric(10,2) not null check (tyre_price >= 0),
  loss_amount   numeric(12,2) generated always as (round(tyre_price * greatest(norm_km - km_run, 0) / norm_km, 2)) stored,
  reason_removal text, reason_damage text,
  status        text not null default 'SENT_TO_TRS' check (status in ('SENT_TO_TRS', 'SENT_TO_DEPOT', 'RETURNED')),
  created_by    uuid not null references public.employees (id),
  created_at    timestamptz not null default now(),
  constraint pfr_employee_when_fault check (fault_on not in ('DRIVER', 'TYRE_MAN') or (employee_code is not null and length(btrim(employee_code)) > 0))
);
create table public.damage_requests (
  id            uuid primary key default gen_random_uuid(),
  req_no        text not null unique,
  org_unit_id   uuid not null references public.depots (org_unit_id),
  job_card_id   uuid references public.job_cards (id),
  tyre_id       uuid not null references public.tyres (id),
  fleet_id      uuid references public.fleets (id),
  injury        text,
  reason        text not null,
  status        text not null default 'PENDING_APPROVAL' check (status in ('PENDING_APPROVAL', 'APPROVED', 'RETURNED', 'REPORT_RECEIVED')),
  returned_reason text,
  report        jsonb,
  requested_by  uuid not null references public.employees (id),
  requested_at  timestamptz not null default now(),
  decided_by    uuid references public.employees (id), decided_at timestamptz,
  reported_by   uuid references public.employees (id), reported_at timestamptz
);
create table public.drns (
  id          uuid primary key default gen_random_uuid(),
  drn_no      text not null unique,
  org_unit_id uuid not null references public.depots (org_unit_id),
  to_unit     text not null check (to_unit in ('TRS Chrompet', 'TRS Tondiarpet')),
  remarks     text,
  status      text not null default 'AWAITING_APPROVAL' check (status in ('AWAITING_APPROVAL', 'APPROVED', 'REVERTED', 'REJECTED')),
  status_note text,
  created_by  uuid not null references public.employees (id),
  created_at  timestamptz not null default now(),
  decided_by  uuid references public.employees (id), decided_at timestamptz
);
create table public.drn_tyres (drn_id uuid not null references public.drns (id), tyre_id uuid not null references public.tyres (id), org_unit_id uuid not null references public.depots (org_unit_id), primary key (drn_id, tyre_id));
create trigger audit_pfr_reports after insert or update or delete on public.pfr_reports for each row execute function app.audit_row();
create trigger audit_damage_requests after insert or update or delete on public.damage_requests for each row execute function app.audit_row();
create trigger audit_drns after insert or update or delete on public.drns for each row execute function app.audit_row();
update public.document_number_series set is_confirmed = true where series_code in ('PFR', 'DRN', 'DR');

create function public.pfr_create(p_tyre uuid, p_fault_on text, p_employee_code text, p_employee_name text, p_position text, p_skid numeric,
                                  p_km_run numeric, p_norm_km numeric, p_price numeric, p_reason_removal text, p_reason_damage text) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('report.raise'); t public.tyres; v_no text;
begin
  select * into t from public.tyres where id = p_tyre and owner_org_unit_id = e.org_unit_id;
  if not found then raise exception 'that tyre is not a tyre of your depot'; end if;
  v_no := app.next_doc_no('PFR', e.org_unit_id, app.business_today());
  insert into public.pfr_reports (report_no, org_unit_id, tyre_id, fleet_id, position, skid_depth_mm, fault_on, employee_code, employee_name, km_run, norm_km, tyre_price, reason_removal, reason_damage, created_by)
  values (v_no, e.org_unit_id, p_tyre, t.fleet_id, coalesce(p_position, t.fitted_position), p_skid, p_fault_on, nullif(btrim(p_employee_code), ''), nullif(btrim(p_employee_name), ''),
          p_km_run, p_norm_km, p_price, nullif(btrim(p_reason_removal), ''), nullif(btrim(p_reason_damage), ''), e.id);
  return v_no;
end $$;

-- the TRS Incharge is not a user of this build: HO / AM decide for TRS
create function public.damage_request_decide(p_req uuid, p_approve boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('damage.decide'); r public.damage_requests;
begin
  select * into r from public.damage_requests where id = p_req for update;
  if not found then raise exception 'request not found'; end if;
  if r.status <> 'PENDING_APPROVAL' then raise exception 'this request is already %', r.status; end if;
  if not p_approve and length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'a returned request needs a reason'; end if;
  update public.damage_requests set status = case when p_approve then 'APPROVED' else 'RETURNED' end, returned_reason = case when p_approve then null else btrim(p_reason) end, decided_by = e.id, decided_at = now() where id = p_req;
end $$;

-- p_report: {"puncture_at","route","place","cause","remarks"}  - date, route / service, place and cause are required
create function public.damage_report_submit(p_req uuid, p_report jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('report.raise'); r public.damage_requests; k text;
begin
  select * into r from public.damage_requests where id = p_req and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'request not found in your depot'; end if;
  if r.status <> 'APPROVED' then raise exception 'the report can be filled only when the request is Approved (this one is %)', r.status; end if;
  foreach k in array array['puncture_at', 'route', 'place', 'cause'] loop
    if length(btrim(coalesce(p_report ->> k, ''))) = 0 then raise exception 'please fill %', replace(k, '_', ' '); end if;
  end loop;
  update public.damage_requests set status = 'REPORT_RECEIVED', report = p_report, reported_by = e.id, reported_at = now() where id = p_req;
end $$;

insert into public.damage_requests (req_no, org_unit_id, tyre_id, fleet_id, injury, reason, status, requested_by, decided_by, decided_at)
select 'DR-2026-00' || v.n, f.org_unit_id, t.id, f.id, v.injury, v.reason, v.st, (select id from public.employees where employee_code = 'TIC-1147'),
       case when v.st = 'APPROVED' then (select id from public.employees where employee_code = 'HOT-AE-021') end, case when v.st = 'APPROVED' then now() end
from (values (1, 'No injury', 'Sidewall cut on the road', 'APPROVED', 0), (2, 'Minor injury to the driver', 'Burst at speed', 'PENDING_APPROVAL', 1)) v(n, injury, reason, st, skip)
join lateral (select * from public.fleets where org_unit_id = (select id from public.org_units where code = 'MN') and status = 'ACTIVE' order by fleet_no offset v.skip limit 1) f on true
join lateral (select * from public.tyres where fleet_id = f.id and stock_place = 'FITTED' order by fitted_position limit 1) t on true;

create function public.drn_create(p_to text, p_remarks text, p_tyres uuid[]) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.drn'); v uuid := gen_random_uuid(); v_no text; t uuid;
begin
  if coalesce(cardinality(p_tyres), 0) = 0 then raise exception 'choose at least one tyre in warranty'; end if;
  foreach t in array p_tyres loop
    if not exists (select 1 from public.tyres where id = t and owner_org_unit_id = e.org_unit_id and stock_place = 'LIVE_STOCK' and warranty_upto >= app.business_today()) then
      raise exception 'every tyre must be in your live stock with its warranty not over'; end if;
    if exists (select 1 from public.drn_tyres d join public.drns n on n.id = d.drn_id where d.tyre_id = t and n.status in ('AWAITING_APPROVAL', 'APPROVED')) then raise exception 'a tyre is already on a DRN'; end if;
  end loop;
  v_no := app.next_doc_no('DRN', e.org_unit_id, app.business_today());
  insert into public.drns (id, drn_no, org_unit_id, to_unit, remarks, created_by) values (v, v_no, e.org_unit_id, p_to, nullif(btrim(p_remarks), ''), e.id);
  foreach t in array p_tyres loop insert into public.drn_tyres (drn_id, tyre_id, org_unit_id) values (v, t, e.org_unit_id); end loop;
  return v_no;
end $$;

create function public.drn_act(p_drn uuid, p_action text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.approve'); d public.drns;
begin
  select * into d from public.drns where id = p_drn and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'DRN not found in your depot'; end if;
  if d.status <> 'AWAITING_APPROVAL' then raise exception 'this DRN is already %', d.status; end if;
  if p_action not in ('APPROVE', 'REVERT', 'REJECT') then raise exception 'action must be APPROVE, REVERT or REJECT'; end if;
  if p_action <> 'APPROVE' and length(btrim(coalesce(p_note, ''))) = 0 then raise exception 'a reason is required'; end if;
  update public.drns set status = case p_action when 'APPROVE' then 'APPROVED' when 'REVERT' then 'REVERTED' else 'REJECTED' end, status_note = nullif(btrim(p_note), ''), decided_by = e.id, decided_at = now() where id = p_drn;
  if p_action = 'APPROVE' then update public.tyres set stock_place = 'AT_TRS' where id in (select tyre_id from public.drn_tyres where drn_id = p_drn); end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 25. Tyre Correction Request and Tyre Detailed Master
-- ---------------------------------------------------------------------------------------------
create table public.tyre_corrections (
  id          uuid primary key default gen_random_uuid(),
  req_no      text not null unique,
  org_unit_id uuid not null references public.depots (org_unit_id),
  tyre_id     uuid not null references public.tyres (id),
  status      text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  photo_data  text check (photo_data is null or length(photo_data) <= 600000),
  remarks     text,
  requested_by uuid not null references public.employees (id),
  requested_at timestamptz not null default now(),
  decided_by  uuid references public.employees (id), decided_at timestamptz, decision_remarks text
);
create table public.tyre_correction_fields (
  correction_id uuid not null references public.tyre_corrections (id),
  field         text not null,
  current_value text,
  correct_value text not null,
  primary key (correction_id, field)
);
create trigger audit_tyre_corrections after insert or update or delete on public.tyre_corrections for each row execute function app.audit_row();

-- the fields a correction may change, and their types
create function app.correctable_field_type(p text) returns text language sql immutable as $$
  select case p when 'makers_no' then 'text' when 'grade' then 'text' when 'tyre_condition' then 'text' when 'manufactured_date' then 'date' when 'purchase_date' then 'date'
                when 'warranty_upto' then 'date' when 'nsd_mm' then 'numeric' when 'groove_count' then 'smallint' end
$$;

-- p_fields: {"makers_no": "NEWVALUE", "warranty_upto": "2028-03-31"}
create function public.tyre_correction_create(p_tyre uuid, p_fields jsonb, p_photo text default null, p_remarks text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('tyre.correct'); t public.tyres; k text; v text; v_id uuid := gen_random_uuid(); v_no text; j jsonb;
begin
  select * into t from public.tyres where id = p_tyre and owner_org_unit_id = e.org_unit_id;
  if not found then raise exception 'that tyre is not a tyre of your depot'; end if;
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' or p_fields = '{}'::jsonb then raise exception 'give at least one corrected value'; end if;
  if exists (select 1 from public.tyre_corrections where tyre_id = p_tyre and status = 'PENDING') then raise exception 'this tyre already has a pending correction'; end if;
  v_no := app.next_doc_no('TCR', null, app.business_today());
  insert into public.tyre_corrections (id, req_no, org_unit_id, tyre_id, photo_data, remarks, requested_by) values (v_id, v_no, e.org_unit_id, p_tyre, nullif(p_photo, ''), nullif(btrim(p_remarks), ''), e.id);
  j := to_jsonb(t);
  for k, v in select key, value #>> '{}' from jsonb_each(p_fields) loop
    if app.correctable_field_type(k) is null then raise exception 'the field "%" cannot be corrected', k; end if;
    if length(btrim(coalesce(v, ''))) = 0 then raise exception 'give the correct value of %', k; end if;
    if k = 'grade' and v not in ('NEW', 'A', 'B', 'C') then raise exception 'grade must be NEW, A, B or C'; end if;
    begin execute format('select %L::%s', v, app.correctable_field_type(k)); exception when others then raise exception 'the value of % is not valid', k; end;
    insert into public.tyre_correction_fields (correction_id, field, current_value, correct_value) values (v_id, k, j ->> k, btrim(v));
  end loop;
  return v_no;
end $$;

create function public.tyre_correction_decide(p_req uuid, p_approve boolean, p_remarks text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('tyre.correct_decide'); c public.tyre_corrections; f record;
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

-- Tyre Detailed Master: the columns a tyre can have (HO master, AM approves)
create table public.tyre_detail_columns (
  id            uuid primary key default gen_random_uuid(),
  column_code   text not null unique check (column_code ~ '^TDM-[0-9]{3}$'),
  column_name   text not null check (length(btrim(column_name)) between 2 and 80),
  description   text,
  integration   boolean not null default false,
  input_field   text not null default 'Text' check (input_field in ('Text', 'Number', 'Date', 'Select')),
  module        text, module_master text,
  required_field boolean not null default false,
  status        public.master_status not null default 'ACTIVE', row_version int not null default 1,
  created_at    timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger audit_tyre_detail_columns after insert or update or delete on public.tyre_detail_columns for each row execute function app.audit_row();
create trigger tyre_detail_columns_touch before update on public.tyre_detail_columns for each row execute function app.set_updated_at();
insert into public.tyre_detail_columns (column_code, column_name, description, integration, input_field, module, module_master, required_field)
select 'TDM-' || lpad(row_number() over ()::text, 3, '0'), v.n, v.d, v.i, v.f, v.m, v.mm, v.r from (values
  ('MTC No', 'Tyre number given by MTC', false, 'Text', null, null, true), ('Manufacturer No', 'Number moulded by the maker', false, 'Text', null, null, false),
  ('Folio ID', 'Item code of the tyre', true, 'Select', 'Stores', 'Folio Master', true), ('Folio Name', 'Item name', true, 'Text', 'Stores', 'Folio Master', false),
  ('Specification', 'Item specification', true, 'Text', 'Stores', 'Folio Master', false), ('Make', 'Tyre make', true, 'Select', 'Stores', 'Product Master', true),
  ('Makers Model', 'Pattern or model', true, 'Select', 'Stores', 'Product Master', false), ('Size', 'Tyre size', true, 'Select', 'Stores', 'Folio Master', true),
  ('Construction Type', 'Nylon or Radial', true, 'Select', 'Stores', 'Folio Master', false), ('Tube Type', 'Tube or Tubeless', true, 'Select', 'Stores', 'Folio Master', false),
  ('Grade', 'New, A, B or C', false, 'Select', null, null, true), ('Tyre Condition', 'New or retread level RT1 to RT5', false, 'Select', null, null, false),
  ('Purchase Date', 'Date of purchase', true, 'Date', 'Purchase', 'Purchase Order', false), ('Manufactured Date', 'Date of manufacture', false, 'Date', null, null, false),
  ('Warranty Upto', 'Warranty end date', false, 'Date', null, null, false), ('NSD', 'Non-skid depth in mm', false, 'Number', null, null, false),
  ('Groove Count', 'Number of grooves', false, 'Number', null, null, false), ('Fleet No', 'Fleet the tyre is fitted on', true, 'Select', 'Operations', 'Fleet Register', false),
  ('Fitted Position', 'Position on the fleet', false, 'Select', null, null, false), ('Fitted Date', 'Date fitted', false, 'Date', null, null, false),
  ('Total KM', 'Total km run', true, 'Number', 'Operations', 'Trip Sheet', false), ('Last Rotation Date', 'Last rotation', false, 'Date', null, null, false),
  ('Last Discout Date', 'Last discout', false, 'Date', null, null, false), ('Expected Life KM', 'Norm km for the size and condition', true, 'Number', 'Technical', 'Expected Life KM', false),
  ('Stock Value', 'Value of the tyre in stock', true, 'Number', 'Accounts', 'Stock Ledger', false)) v(n, d, i, f, m, mm, r);

create function app.validate_tyre_detail_column(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app.check_keys(p, array['column_name', 'description', 'integration', 'input_field', 'module', 'module_master', 'required_field']);
  if p ? 'column_name' and length(btrim(coalesce(p ->> 'column_name', ''))) < 2 then raise exception 'the column name is required'; end if;
  if p ? 'input_field' and (p ->> 'input_field') not in ('Text', 'Number', 'Date', 'Select') then raise exception 'input field must be Text, Number, Date or Select'; end if;
  if coalesce((p ->> 'integration')::boolean, false) and (length(btrim(coalesce(p ->> 'module', ''))) = 0 or length(btrim(coalesce(p ->> 'module_master', ''))) = 0) then
    raise exception 'an integrated column needs the module and the module master'; end if;
end $$;
create function app.apply_tyre_detail_column(p_request uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'tyre_detail_column'); p jsonb := r.proposed_payload; v_code text;
begin
  perform app.validate_tyre_detail_column(p);
  if r.action = 'CREATE' then
    if not (p ? 'column_name') then raise exception 'a new column needs a name'; end if;
    select 'TDM-' || lpad((coalesce(max(substr(column_code, 5)::int), 0) + 1)::text, 3, '0') into v_code from public.tyre_detail_columns;
    insert into public.tyre_detail_columns (id, column_code, column_name, description, integration, input_field, module, module_master, required_field)
    values (r.target_id, v_code, btrim(p ->> 'column_name'), nullif(btrim(p ->> 'description'), ''), coalesce((p ->> 'integration')::boolean, false), coalesce(p ->> 'input_field', 'Text'),
            nullif(btrim(p ->> 'module'), ''), nullif(btrim(p ->> 'module_master'), ''), coalesce((p ->> 'required_field')::boolean, false));
  else
    if not exists (select 1 from public.tyre_detail_columns where id = r.target_id) then raise exception 'column not found'; end if;
    update public.tyre_detail_columns set status = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      column_name = coalesce(nullif(btrim(p ->> 'column_name'), ''), column_name), description = coalesce(p ->> 'description', description),
      integration = coalesce((p ->> 'integration')::boolean, integration), input_field = coalesce(p ->> 'input_field', input_field),
      module = coalesce(p ->> 'module', module), module_master = coalesce(p ->> 'module_master', module_master),
      required_field = coalesce((p ->> 'required_field')::boolean, required_field), row_version = row_version + 1 where id = r.target_id;
  end if;
end $$;
update public.master_entity_registry set is_enabled = true where entity_type = 'tyre_detail_column';

-- ---------------------------------------------------------------------------------------------
-- grants and row-level security
-- ---------------------------------------------------------------------------------------------
revoke all on function app.check_reject_reason(text), app.correctable_field_type(text), app.validate_psi_norm(jsonb), app.apply_psi_norm(uuid),
  app.validate_tyre_detail_column(jsonb), app.apply_tyre_detail_column(uuid) from public, anon, authenticated;
revoke all on function public.grn_receive_gin2(uuid, jsonb, timestamptz, text), public.grn_receive_unit(text, jsonb, timestamptz, text), public.air_type_request_create(uuid, text, text),
  public.air_type_request_act(uuid, text, text), public.pfr_create(uuid, text, text, text, text, numeric, numeric, numeric, numeric, text, text), public.damage_request_decide(uuid, boolean, text),
  public.damage_report_submit(uuid, jsonb), public.drn_create(text, text, uuid[]), public.drn_act(uuid, text, text), public.tyre_correction_create(uuid, jsonb, text, text),
  public.tyre_correction_decide(uuid, boolean, text) from public, anon;
grant execute on function public.grn_receive_gin2(uuid, jsonb, timestamptz, text), public.grn_receive_unit(text, jsonb, timestamptz, text), public.air_type_request_create(uuid, text, text),
  public.air_type_request_act(uuid, text, text), public.pfr_create(uuid, text, text, text, text, numeric, numeric, numeric, numeric, text, text), public.damage_request_decide(uuid, boolean, text),
  public.damage_report_submit(uuid, jsonb), public.drn_create(text, text, uuid[]), public.drn_act(uuid, text, text), public.tyre_correction_create(uuid, jsonb, text, text),
  public.tyre_correction_decide(uuid, boolean, text) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['grn_lines', 'air_type_requests', 'pfr_reports', 'damage_requests', 'drns', 'drn_tyres', 'tyre_corrections', 'tyre_correction_fields', 'tyre_detail_columns'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy gate_active_user on public.%I as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user())', t);
  end loop;
end $$;
create policy read_depot on public.grn_lines for select to authenticated using (app.my_role() <> 'TM' and org_unit_id in (select app.my_visible_depot_ids()));
create policy read_depot on public.air_type_requests for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()));
create policy read_depot on public.pfr_reports for select to authenticated using (app.my_role() <> 'TM' and org_unit_id in (select app.my_visible_depot_ids()));
create policy read_depot on public.damage_requests for select to authenticated using (app.my_role() <> 'TM' and org_unit_id in (select app.my_visible_depot_ids()));
create policy read_depot on public.drns for select to authenticated using (app.my_role() <> 'TM' and org_unit_id in (select app.my_visible_depot_ids()));
create policy read_depot on public.drn_tyres for select to authenticated using (app.my_role() <> 'TM' and org_unit_id in (select app.my_visible_depot_ids()));
create policy read_depot on public.tyre_corrections for select to authenticated using (app.my_role() <> 'TM' and org_unit_id in (select app.my_visible_depot_ids()));
create policy read_depot on public.tyre_correction_fields for select to authenticated using (exists (select 1 from public.tyre_corrections c where c.id = correction_id));
create policy read_all on public.tyre_detail_columns for select to authenticated using (true);
