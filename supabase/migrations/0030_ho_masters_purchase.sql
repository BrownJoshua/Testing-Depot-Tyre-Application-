-- 0030: D1 screen match for HO / AM - the remaining master screens and the Purchase / Allocation lists
--   New masters through the approval engine (HO proposes, AM approves): Reject Reason Master, Wear Pattern Master, QC Master,
--   Expected Life KM, Shift Master. New lists: Purchase Indent (HO raises, AM approves or reverts), Allocation Requests (read only).

-- ---------------------------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------------------------
create table public.reject_reasons (
  id uuid primary key default gen_random_uuid(),
  reason_code text not null unique check (reason_code ~ '^DRR-[0-9]{3}$'),
  reason_text text not null check (length(btrim(reason_text)) between 3 and 200),
  status public.master_status not null default 'ACTIVE', row_version int not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.wear_patterns (
  id uuid primary key default gen_random_uuid(),
  pattern_code text not null unique check (pattern_code ~ '^WP-[0-9]{3}$'),
  pattern_name text not null check (length(btrim(pattern_name)) between 3 and 80),
  status public.master_status not null default 'ACTIVE', row_version int not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.qc_checklists (
  id uuid primary key default gen_random_uuid(),
  qc_code text not null unique check (qc_code ~ '^QCM-[0-9]{3}$'),
  job_type text not null check (length(btrim(job_type)) between 3 and 60),
  checklist_items text[] not null check (cardinality(checklist_items) between 1 and 20),
  status public.master_status not null default 'ACTIVE', row_version int not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.expected_life_km (
  id uuid primary key default gen_random_uuid(),
  tyre_size_id uuid not null unique references public.tyre_sizes (id),
  km_new int not null check (km_new > 0), km_rt1 int not null check (km_rt1 > 0), km_rt2 int not null check (km_rt2 > 0),
  km_rt3 int not null check (km_rt3 > 0), km_rt4 int not null check (km_rt4 > 0), km_rt5 int not null check (km_rt5 > 0),
  status public.master_status not null default 'ACTIVE', row_version int not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.shifts add column row_version int not null default 1, add column updated_at timestamptz not null default now();

create table public.purchase_indents (
  id uuid primary key default gen_random_uuid(),
  indent_no text not null unique,
  indent_at timestamptz not null default now(),
  indent_type text not null check (indent_type in ('Supplementary Indent', '(AWR) Indent', 'Emergency Indent')),
  folio_group text not null check (folio_group in ('Tyre', 'Tube', 'Flap', 'Disc')),
  source text not null check (source in ('Central Store', 'Depot Store', 'All')),
  lines jsonb not null default '[]',
  remarks text,
  requested_by uuid references public.employees (id),
  status text not null default 'PENDING_APPROVAL' check (status in ('PENDING_APPROVAL', 'ISSUED', 'REVERTED')),
  decided_by uuid references public.employees (id), decided_at timestamptz, decision_remarks text,
  constraint pi_revert_needs_remarks check (status <> 'REVERTED' or length(btrim(coalesce(decision_remarks, ''))) > 0));
create table public.allocation_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text not null unique,
  allocated_at timestamptz not null,
  allocation_type text not null, allocate_from text not null, allocated_by text not null, allocated_to text not null,
  items int not null default 0, status text not null);

create trigger audit_reject_reasons after insert or update or delete on public.reject_reasons for each row execute function app.audit_row();
create trigger audit_wear_patterns after insert or update or delete on public.wear_patterns for each row execute function app.audit_row();
create trigger audit_qc_checklists after insert or update or delete on public.qc_checklists for each row execute function app.audit_row();
create trigger audit_expected_life after insert or update or delete on public.expected_life_km for each row execute function app.audit_row();
create trigger audit_purchase_indents after insert or update or delete on public.purchase_indents for each row execute function app.audit_row();
create trigger reject_reasons_touch before update on public.reject_reasons for each row execute function app.set_updated_at();
create trigger wear_patterns_touch before update on public.wear_patterns for each row execute function app.set_updated_at();
create trigger qc_checklists_touch before update on public.qc_checklists for each row execute function app.set_updated_at();
create trigger expected_life_touch before update on public.expected_life_km for each row execute function app.set_updated_at();
create trigger shifts_touch before update on public.shifts for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- seed (D1 prototype values)
-- ---------------------------------------------------------------------------------------------
insert into public.reject_reasons (reason_code, reason_text) values
  ('DRR-001', 'Tyre missing from shipment'), ('DRR-002', 'Wrong Tyre Sent — different tyre number received'),
  ('DRR-003', 'Casing Damaged — damaged beyond use'), ('DRR-004', 'Grade Variance — retreaded grade does not match expectation');
insert into public.wear_patterns (pattern_code, pattern_name) values
  ('WP-001', 'Even wear'), ('WP-002', 'Centre wear'), ('WP-003', 'Both-shoulder wear'), ('WP-004', 'One-side shoulder wear'),
  ('WP-005', 'Cupping / scalloping'), ('WP-006', 'Feathering'), ('WP-007', 'Heel and toe wear'), ('WP-008', 'Flat spot');
insert into public.qc_checklists (qc_code, job_type, checklist_items) values
  ('QCM-001', 'Air Inflation', array['Valve and cap checked', 'Inflated to the PSI norm', 'Reading recorded']),
  ('QCM-002', 'Air Inflation — Nitrogen', array['Nitrogen purity checked', 'Inflated to the PSI norm', 'Reading recorded']),
  ('QCM-003', 'Inspection', array['Tread and sidewall checked', 'NSD measured', 'Defects reported']),
  ('QCM-004', 'Tyre Rotation', array['Wheel nuts torqued', 'Positions swapped as planned', 'PSI re-checked']),
  ('QCM-005', 'Tyre Discout', array['Wheel nuts torqued', 'Tyres swapped as planned', 'Tube, flap and disc checked', 'PSI re-checked']),
  ('QCM-007', 'Tyre Changing', array['Old tyre details recorded', 'New tyre fitted at the position', 'Wheel nuts torqued', 'PSI set']),
  ('QCM-008', 'Tyre Removal', array['Fleet secured', 'Tyre removed and tagged']),
  ('QCM-009', 'Tyre Fitment', array['Tyre matches the position and size', 'Wheel nuts torqued', 'PSI set']),
  ('QCM-010', 'Tyre Setting', array['Tube and flap fitted', 'Disc checked', 'Bead seated']),
  ('QCM-011', 'Tyre Unsetting', array['Tube, flap and disc removed', 'Items marked usable or not usable']);
insert into public.expected_life_km (tyre_size_id, km_new, km_rt1, km_rt2, km_rt3, km_rt4, km_rt5)
select s.id, v.a, v.b, v.c, v.d, v.e, v.f from (values
  ('7.50 X 16', 45000, 60000, 75000, 90000, 105000, 120000), ('10.00 X 20', 60000, 75000, 90000, 105000, 120000, 135000),
  ('295/80R22.5', 90000, 105000, 120000, 135000, 150000, 165000), ('8.25 X 16', 50000, 65000, 80000, 95000, 110000, 125000),
  ('9.00 X 20', 55000, 70000, 85000, 100000, 115000, 130000)) v(code, a, b, c, d, e, f)
join public.tyre_sizes s on s.size_code = v.code;
insert into public.purchase_indents (indent_no, indent_at, indent_type, folio_group, source, status, requested_by)
select v.no, v.at::timestamptz, v.t, 'Tyre', v.s, v.st, (select id from public.employees where employee_code = 'HOT-0114') from (values
  ('PI-HO-2026-001', '2026-09-14 10:20+05:30', 'Supplementary Indent', 'Central Store', 'ISSUED'),
  ('PI-HO-2026-002', '2026-09-19 15:05+05:30', '(AWR) Indent', 'All', 'PENDING_APPROVAL')) v(no, at, t, s, st);
insert into public.purchase_indents (indent_no, indent_at, indent_type, folio_group, source, status, requested_by, decision_remarks, decided_at, decided_by)
select 'PI-HO-2026-003', '2026-09-17 11:40+05:30', 'Emergency Indent', 'Tyre', 'Depot Store', 'REVERTED', (select id from public.employees where employee_code = 'HOT-0114'),
       'Quantity not justified; resubmit with the stock position', '2026-09-18 09:00+05:30', (select id from public.employees where employee_code = 'HOT-AE-021');
update public.document_number_series set is_confirmed = true where series_code = 'PI';

-- ---------------------------------------------------------------------------------------------
-- engine: validate / apply
-- ---------------------------------------------------------------------------------------------
create function app.validate_reject_reason(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app.check_keys(p, array['reason_code', 'reason_text']);
  if p ? 'reason_code' and (p ->> 'reason_code') !~ '^DRR-[0-9]{3}$' then raise exception 'reason ID must look like DRR-007'; end if;
  if p ? 'reason_code' and exists (select 1 from public.reject_reasons where reason_code = p ->> 'reason_code') then raise exception 'reason ID % already exists', p ->> 'reason_code'; end if;
  if p ? 'reason_text' and length(btrim(coalesce(p ->> 'reason_text', ''))) < 3 then raise exception 'the reject reason is required'; end if;
end $$;
create function app.apply_reject_reason(p_request uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'reject_reason'); p jsonb := r.proposed_payload;
begin
  perform app.validate_reject_reason(p);
  if r.action = 'CREATE' then
    if not (p ? 'reason_code' and p ? 'reason_text') then raise exception 'a new reason needs an ID and the reason text'; end if;
    insert into public.reject_reasons (id, reason_code, reason_text) values (r.target_id, p ->> 'reason_code', btrim(p ->> 'reason_text'));
  else
    if not exists (select 1 from public.reject_reasons where id = r.target_id) then raise exception 'reason not found'; end if;
    update public.reject_reasons set status = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      reason_text = case when p ? 'reason_text' then btrim(p ->> 'reason_text') else reason_text end, row_version = row_version + 1 where id = r.target_id;
  end if;
end $$;

create function app.validate_wear_pattern(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app.check_keys(p, array['pattern_code', 'pattern_name']);
  if p ? 'pattern_code' and (p ->> 'pattern_code') !~ '^WP-[0-9]{3}$' then raise exception 'pattern ID must look like WP-011'; end if;
  if p ? 'pattern_code' and exists (select 1 from public.wear_patterns where pattern_code = p ->> 'pattern_code') then raise exception 'pattern ID % already exists', p ->> 'pattern_code'; end if;
  if p ? 'pattern_name' and length(btrim(coalesce(p ->> 'pattern_name', ''))) < 3 then raise exception 'the wear pattern name is required'; end if;
end $$;
create function app.apply_wear_pattern(p_request uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'wear_pattern'); p jsonb := r.proposed_payload;
begin
  perform app.validate_wear_pattern(p);
  if r.action = 'CREATE' then
    if not (p ? 'pattern_code' and p ? 'pattern_name') then raise exception 'a new pattern needs an ID and a name'; end if;
    insert into public.wear_patterns (id, pattern_code, pattern_name) values (r.target_id, p ->> 'pattern_code', btrim(p ->> 'pattern_name'));
  else
    if not exists (select 1 from public.wear_patterns where id = r.target_id) then raise exception 'pattern not found'; end if;
    update public.wear_patterns set status = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      pattern_name = case when p ? 'pattern_name' then btrim(p ->> 'pattern_name') else pattern_name end, row_version = row_version + 1 where id = r.target_id;
  end if;
end $$;

-- checklist items are sent as one text, one item per line
create function app.validate_qc_checklist(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app.check_keys(p, array['qc_code', 'job_type', 'checklist_items']);
  if p ? 'qc_code' and (p ->> 'qc_code') !~ '^QCM-[0-9]{3}$' then raise exception 'QC ID must look like QCM-012'; end if;
  if p ? 'qc_code' and exists (select 1 from public.qc_checklists where qc_code = p ->> 'qc_code') then raise exception 'QC ID % already exists', p ->> 'qc_code'; end if;
  if p ? 'job_type' and length(btrim(coalesce(p ->> 'job_type', ''))) < 3 then raise exception 'the job type is required'; end if;
  if p ? 'checklist_items' and cardinality(array_remove(regexp_split_to_array(btrim(coalesce(p ->> 'checklist_items', '')), E'\\s*\\n\\s*'), '')) = 0 then raise exception 'add at least one checklist item'; end if;
end $$;
create function app.apply_qc_checklist(p_request uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'qc_checklist'); p jsonb := r.proposed_payload; v_items text[];
begin
  perform app.validate_qc_checklist(p);
  if p ? 'checklist_items' then v_items := array_remove(regexp_split_to_array(btrim(p ->> 'checklist_items'), E'\\s*\\n\\s*'), ''); end if;
  if r.action = 'CREATE' then
    if not (p ? 'qc_code' and p ? 'job_type' and p ? 'checklist_items') then raise exception 'a new checklist needs an ID, the job type and its items'; end if;
    insert into public.qc_checklists (id, qc_code, job_type, checklist_items) values (r.target_id, p ->> 'qc_code', btrim(p ->> 'job_type'), v_items);
  else
    if not exists (select 1 from public.qc_checklists where id = r.target_id) then raise exception 'checklist not found'; end if;
    update public.qc_checklists set status = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      job_type = case when p ? 'job_type' then btrim(p ->> 'job_type') else job_type end, checklist_items = coalesce(v_items, checklist_items), row_version = row_version + 1 where id = r.target_id;
  end if;
end $$;

create function app.validate_expected_life_km(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare k text;
begin
  perform app.check_keys(p, array['size_code', 'km_new', 'km_rt1', 'km_rt2', 'km_rt3', 'km_rt4', 'km_rt5']);
  foreach k in array array['km_new', 'km_rt1', 'km_rt2', 'km_rt3', 'km_rt4', 'km_rt5'] loop
    if p ? k and (coalesce((p ->> k) ~ '^[0-9]+$', false) = false or (p ->> k)::numeric < 1000 or (p ->> k)::numeric > 1000000) then raise exception '% must be a whole number of km between 1,000 and 1,000,000', k; end if;
  end loop;
  if p ? 'size_code' and not exists (select 1 from public.tyre_sizes where size_code = p ->> 'size_code' and status = 'ACTIVE') then raise exception 'unknown or inactive tyre size'; end if;
  if p ? 'size_code' and exists (select 1 from public.expected_life_km e join public.tyre_sizes s on s.id = e.tyre_size_id where s.size_code = p ->> 'size_code') then raise exception 'this tyre size already has expected life values'; end if;
end $$;
create function app.apply_expected_life_km(p_request uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'expected_life_km'); p jsonb := r.proposed_payload; v_size uuid;
begin
  perform app.validate_expected_life_km(p);
  if r.action = 'CREATE' then
    select id into v_size from public.tyre_sizes where size_code = p ->> 'size_code';
    if v_size is null or not (p ? 'km_new' and p ? 'km_rt1' and p ? 'km_rt2' and p ? 'km_rt3' and p ? 'km_rt4' and p ? 'km_rt5') then raise exception 'a new row needs the tyre size and all six km values'; end if;
    insert into public.expected_life_km (id, tyre_size_id, km_new, km_rt1, km_rt2, km_rt3, km_rt4, km_rt5)
    values (r.target_id, v_size, (p ->> 'km_new')::int, (p ->> 'km_rt1')::int, (p ->> 'km_rt2')::int, (p ->> 'km_rt3')::int, (p ->> 'km_rt4')::int, (p ->> 'km_rt5')::int);
  else
    if not exists (select 1 from public.expected_life_km where id = r.target_id) then raise exception 'row not found'; end if;
    update public.expected_life_km set status = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      km_new = coalesce((p ->> 'km_new')::int, km_new), km_rt1 = coalesce((p ->> 'km_rt1')::int, km_rt1), km_rt2 = coalesce((p ->> 'km_rt2')::int, km_rt2),
      km_rt3 = coalesce((p ->> 'km_rt3')::int, km_rt3), km_rt4 = coalesce((p ->> 'km_rt4')::int, km_rt4), km_rt5 = coalesce((p ->> 'km_rt5')::int, km_rt5),
      row_version = row_version + 1 where id = r.target_id;
  end if;
end $$;

create function app.validate_shift(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app.check_keys(p, array['shift_code', 'shift_name', 'start_time', 'end_time']);
  if p ? 'shift_code' and (p ->> 'shift_code') !~ '^[A-Z]{2,12}$' then raise exception 'shift code is 2 to 12 capital letters'; end if;
  if p ? 'shift_code' and exists (select 1 from public.shifts where shift_code = p ->> 'shift_code') then raise exception 'shift code % already exists', p ->> 'shift_code'; end if;
  if p ? 'shift_name' and length(btrim(coalesce(p ->> 'shift_name', ''))) < 3 then raise exception 'the shift name is required'; end if;
  if p ? 'start_time' and (p ->> 'start_time') !~ '^[0-2][0-9]:[0-5][0-9]$' then raise exception 'start time must be HH:MM'; end if;
  if p ? 'end_time' and (p ->> 'end_time') !~ '^[0-2][0-9]:[0-5][0-9]$' then raise exception 'end time must be HH:MM'; end if;
end $$;
create function app.apply_shift(p_request uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'shift'); p jsonb := r.proposed_payload;
begin
  perform app.validate_shift(p);
  if r.action = 'CREATE' then
    if not (p ? 'shift_code' and p ? 'shift_name' and p ? 'start_time' and p ? 'end_time') then raise exception 'a new shift needs a code, a name and both times'; end if;
    insert into public.shifts (id, shift_code, shift_name, start_time, end_time) values (r.target_id, p ->> 'shift_code', btrim(p ->> 'shift_name'), (p ->> 'start_time')::time, (p ->> 'end_time')::time);
  else
    if not exists (select 1 from public.shifts where id = r.target_id) then raise exception 'shift not found'; end if;
    update public.shifts set status = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      shift_name = case when p ? 'shift_name' then btrim(p ->> 'shift_name') else shift_name end,
      start_time = case when p ? 'start_time' then (p ->> 'start_time')::time else start_time end,
      end_time = case when p ? 'end_time' then (p ->> 'end_time')::time else end_time end, row_version = row_version + 1 where id = r.target_id;
  end if;
end $$;

revoke all on function app.validate_reject_reason(jsonb), app.apply_reject_reason(uuid), app.validate_wear_pattern(jsonb), app.apply_wear_pattern(uuid),
  app.validate_qc_checklist(jsonb), app.apply_qc_checklist(uuid), app.validate_expected_life_km(jsonb), app.apply_expected_life_km(uuid),
  app.validate_shift(jsonb), app.apply_shift(uuid) from public, anon, authenticated;
update public.master_entity_registry set is_enabled = true where entity_type in ('reject_reason', 'wear_pattern', 'qc_checklist', 'expected_life_km', 'shift');

-- ---------------------------------------------------------------------------------------------
-- Purchase Indent: HO raises (Pending Approval), AM issues or reverts with a reason
-- ---------------------------------------------------------------------------------------------
insert into public.role_capabilities (role_code, capability, is_enabled, is_resolved, note) values
  ('HO', 'purchase.raise', true, true, 'HO raises a Purchase Indent'), ('AM', 'purchase.decide', true, true, 'AM issues or reverts a Purchase Indent');

-- p_lines: [{"folio_id": uuid, "qty": int}]
create function public.purchase_indent_create(p_type text, p_group text, p_source text, p_lines jsonb, p_remarks text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('purchase.raise'); v_no text; x jsonb;
begin
  if p_type not in ('Supplementary Indent', '(AWR) Indent', 'Emergency Indent') then raise exception 'choose the indent type'; end if;
  if p_group not in ('Tyre', 'Tube', 'Flap', 'Disc') then raise exception 'choose the folio group'; end if;
  if p_source not in ('Central Store', 'Depot Store', 'All') then raise exception 'choose the source'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'add at least one folio with a quantity'; end if;
  for x in select * from jsonb_array_elements(p_lines) loop
    if not exists (select 1 from public.tyre_folios where id = nullif(x ->> 'folio_id', '')::uuid and status = 'ACTIVE') then raise exception 'choose an active folio on every line'; end if;
    if coalesce((x ->> 'qty')::int, 0) < 1 then raise exception 'every quantity must be at least 1'; end if;
  end loop;
  v_no := app.next_doc_no('PI', null, app.business_today());
  insert into public.purchase_indents (indent_no, indent_type, folio_group, source, lines, remarks, requested_by) values (v_no, p_type, p_group, p_source, p_lines, nullif(btrim(p_remarks), ''), e.id);
  return v_no;
end $$;

create function public.purchase_indent_decide(p_indent uuid, p_issue boolean, p_remarks text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('purchase.decide'); i public.purchase_indents;
begin
  select * into i from public.purchase_indents where id = p_indent for update;
  if not found then raise exception 'indent not found'; end if;
  if i.status <> 'PENDING_APPROVAL' then raise exception 'this indent is already %', i.status; end if;
  if not p_issue and length(btrim(coalesce(p_remarks, ''))) = 0 then raise exception 'say why the indent is reverted'; end if;
  update public.purchase_indents set status = case when p_issue then 'ISSUED' else 'REVERTED' end, decided_by = e.id, decided_at = now(), decision_remarks = nullif(btrim(p_remarks), '') where id = p_indent;
end $$;
revoke all on function public.purchase_indent_create(text, text, text, jsonb, text), public.purchase_indent_decide(uuid, boolean, text) from public, anon;
grant execute on function public.purchase_indent_create(text, text, text, jsonb, text), public.purchase_indent_decide(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------------------------
alter table public.reject_reasons enable row level security; alter table public.reject_reasons force row level security;
alter table public.wear_patterns enable row level security; alter table public.wear_patterns force row level security;
alter table public.qc_checklists enable row level security; alter table public.qc_checklists force row level security;
alter table public.expected_life_km enable row level security; alter table public.expected_life_km force row level security;
alter table public.purchase_indents enable row level security; alter table public.purchase_indents force row level security;
alter table public.allocation_requests enable row level security; alter table public.allocation_requests force row level security;
grant select on public.reject_reasons, public.wear_patterns, public.qc_checklists, public.expected_life_km, public.purchase_indents, public.allocation_requests to authenticated;
create policy gate_active_user on public.reject_reasons as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.wear_patterns as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.qc_checklists as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.expected_life_km as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.purchase_indents as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.allocation_requests as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy read_all_active on public.reject_reasons for select to authenticated using (true);
create policy read_all_active on public.wear_patterns for select to authenticated using (true);
create policy read_all_active on public.qc_checklists for select to authenticated using (true);
create policy read_all_active on public.expected_life_km for select to authenticated using (true);
create policy read_ho_am on public.purchase_indents for select to authenticated using (app.my_role() in ('HO', 'AM'));
create policy read_ho_am on public.allocation_requests for select to authenticated using (app.my_role() in ('HO', 'AM'));
