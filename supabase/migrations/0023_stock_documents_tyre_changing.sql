-- 0023: D1 realignment step 4 - stock documents and Tyre Changing
--   WSR (request) -> WSR GIN (issue) -> GRN (Tyre Man receives); MRN (return) -> Material Return GRN (Tyre IC receives);
--   Scrap Return Note (SRN) + scrap stock; Removal / Fitment Orders; tube / flap / disc items; Tyre Changing job cards
--   (Removal -> Unsetting -> Setting -> Fitment, swap of two fleets in one card, Want of Tyre).
-- Written only by database functions (no direct write grants), like every other transaction table.

-- ---------------------------------------------------------------------------------------------
-- series and capabilities
-- ---------------------------------------------------------------------------------------------
update public.document_number_series set is_confirmed = true, evidence_note = 'WSR-2609-008 (D1 prototype)' where series_code = 'WSR';
insert into public.document_number_series (series_code, label, template, scope, reset_policy, seq_width, start_value, is_confirmed, evidence_note)
values ('SRN', 'Scrap Return Note', 'SRN{SEQ}', 'GLOBAL', 'NEVER', 3, 3, true, 'SRN001 / SRN002 are D1 samples; new ones start at SRN003');

insert into public.role_capabilities (role_code, capability, is_enabled, is_resolved, note) values
  ('TIC', 'stock.wsr_raise', true, true, null),       ('TM',  'stock.wsr_raise', true, true, null),
  ('TIC', 'stock.issue', true, true, 'Tyre IC issues a WSR (WSR GIN)'),
  ('TIC', 'stock.receive_gin', true, true, null),     ('TM',  'stock.receive_gin', true, true, 'Tyre Man receives a WSR GIN as a GRN'),
  ('TIC', 'stock.mrn_create', true, true, null),      ('TM',  'stock.mrn_create', true, true, null),
  ('TIC', 'stock.return_receive', true, true, 'Tyre IC receives MRN / SRN in the Material Return GRN'),
  ('TIC', 'stock.srn_create', true, true, null),      ('TM',  'stock.srn_create', true, true, null);

-- ---------------------------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------------------------
alter table public.job_ids add column wait_for uuid[] not null default '{}';   -- earlier steps that must be Done first (order lock)

create table public.stock_items (                      -- tube / flap / disc, tracked one by one
  id                uuid primary key default gen_random_uuid(),
  item_no           text not null unique,
  part              text not null check (part in ('TUBE', 'FLAP', 'DISC')),
  size_id           uuid references public.tyre_sizes (id),
  owner_org_unit_id uuid not null references public.org_units (id),
  stock_place       text not null default 'LIVE_STOCK' check (stock_place in ('LIVE_STOCK', 'ISSUED', 'FITTED', 'SCRAPPED')),
  tyre_id           uuid references public.tyres (id),        -- when fitted
  created_at        timestamptz not null default now()
);
create index stock_items_pick_idx on public.stock_items (owner_org_unit_id, part, size_id) where stock_place = 'LIVE_STOCK';

create table public.wsrs (
  id           uuid primary key default gen_random_uuid(),
  wsr_no       text not null unique,
  org_unit_id  uuid not null references public.depots (org_unit_id),
  source       text not null check (source in ('JOB_CARD', 'TYRE_MAN', 'TYRE_IC')),
  status       text not null default 'REQUESTED' check (status in ('REQUESTED', 'PARTLY_ISSUED', 'ISSUED')),
  requested_by uuid not null references public.employees (id),
  created_at   timestamptz not null default now()
);
create table public.wsr_lines (                          -- one unit per line; "always by Size"
  id               uuid primary key default gen_random_uuid(),
  wsr_id           uuid not null references public.wsrs (id),
  org_unit_id      uuid not null references public.depots (org_unit_id),
  part             text not null check (part in ('TYRE', 'TUBE', 'FLAP', 'DISC')),
  size_id          uuid references public.tyre_sizes (id),
  job_card_id      uuid references public.job_cards (id),
  job_id_ref       uuid references public.job_ids (id),
  fleet_id         uuid references public.fleets (id),
  planned_tyre_id  uuid references public.tyres (id),      -- the live-stock tyre the Tyre IC chose when making the job card
  requested_qty    smallint not null default 1,
  issued_qty       smallint not null default 0,
  issued_tyre_id   uuid references public.tyres (id),
  issued_item_id   uuid references public.stock_items (id),
  line_status      text not null default 'REQUESTED' check (line_status in ('REQUESTED', 'ISSUED', 'CLOSED')),
  receive_status   text check (receive_status is null or receive_status in ('PENDING', 'ACCEPTED', 'REJECTED')),
  receive_reason   text,
  remarks          text
);
create index wsr_lines_wsr_idx on public.wsr_lines (wsr_id);
create index wsr_lines_job_idx on public.wsr_lines (job_id_ref) where job_id_ref is not null;
create index wsr_lines_card_idx on public.wsr_lines (job_card_id) where job_card_id is not null;

create table public.wsr_gins (                           -- one GIN for one WSR, made when the Tyre IC issues
  id          uuid primary key default gen_random_uuid(),
  gin_no      text not null unique,
  wsr_id      uuid not null unique references public.wsrs (id),
  org_unit_id uuid not null references public.depots (org_unit_id),
  issued_by   uuid not null references public.employees (id),
  status      text not null default 'APPROVED',
  issued_at   timestamptz not null default now()
);

create table public.mrns (
  id            uuid primary key default gen_random_uuid(),
  mrn_no        text not null unique,
  org_unit_id   uuid not null references public.depots (org_unit_id),
  kind          text not null check (kind in ('TYRE', 'ITEM')),
  tyre_id       uuid references public.tyres (id),
  item_id       uuid references public.stock_items (id),
  job_card_id   uuid references public.job_cards (id),
  job_id_ref    uuid references public.job_ids (id),
  created_by    uuid not null references public.employees (id),
  remarks       text,
  auto          boolean not null default false,            -- made with a Tyre Changing job card
  ready         boolean not null default true,             -- an automatic MRN is ready once its Removal Job ID is done
  status        text not null default 'CREATED' check (status in ('CREATED', 'RECEIVED', 'REJECTED')),
  grn_no        text,
  received_by   uuid references public.employees (id),
  received_at   timestamptz,
  stock_category text check (stock_category is null or stock_category in ('GOOD', 'REPAIR')),
  created_at    timestamptz not null default now(),
  constraint mrns_one_thing check ((kind = 'TYRE' and tyre_id is not null and item_id is null) or (kind = 'ITEM' and item_id is not null and tyre_id is null))
);
create index mrns_depot_idx on public.mrns (org_unit_id, status);

create table public.grns (                               -- inward documents made inside the depot (the bulk GRN of the Central Store comes later)
  id            uuid primary key default gen_random_uuid(),
  grn_no        text not null unique,
  org_unit_id   uuid not null references public.depots (org_unit_id),
  source        text not null check (source in ('WSR_GIN', 'MRN')),
  wsr_gin_id    uuid references public.wsr_gins (id),
  mrn_id        uuid references public.mrns (id),
  issued_qty    smallint not null default 0,
  accepted_qty  smallint not null default 0,
  rejected_qty  smallint not null default 0,
  received_by   uuid not null references public.employees (id),
  received_at   timestamptz not null default now()
);

create table public.srns (
  id          uuid primary key default gen_random_uuid(),
  srn_no      text not null unique,
  org_unit_id uuid not null references public.depots (org_unit_id),
  job_card_id uuid references public.job_cards (id),
  created_by  uuid not null references public.employees (id),
  status      text not null default 'CREATED' check (status in ('CREATED', 'RECEIVED')),
  grn_no      text,
  received_by uuid references public.employees (id),
  received_at timestamptz,
  remarks     text,
  created_at  timestamptz not null default now()
);
create table public.srn_lines (
  id          uuid primary key default gen_random_uuid(),
  srn_id      uuid not null references public.srns (id),
  org_unit_id uuid not null references public.depots (org_unit_id),
  material    text not null check (material in ('Rubber', 'Steel', 'Wood', 'Scrap tyre', 'Scrap tube', 'Scrap flap', 'Scrap disc', 'Valve', 'Other')),
  qty         numeric(10,2) not null check (qty > 0),
  unit        text not null check (unit in ('kg', 'nos')),
  remarks     text
);

create table public.fleet_orders (                       -- Removal Order / Fitment Order
  id          uuid primary key default gen_random_uuid(),
  order_no    text not null unique,
  org_unit_id uuid not null references public.depots (org_unit_id),
  order_type  text not null check (order_type in ('REMOVAL', 'FITMENT')),
  job_card_id uuid not null references public.job_cards (id),
  job_id_ref  uuid not null references public.job_ids (id),
  fleet_id    uuid not null references public.fleets (id),
  part        text not null check (part in ('TYRE', 'TUBE', 'FLAP', 'DISC')),
  position    text,
  tyre_id     uuid references public.tyres (id),
  item_id     uuid references public.stock_items (id),
  wsr_line_id uuid references public.wsr_lines (id),
  note        text,
  reason      text,
  status      text not null default 'CREATED' check (status in ('CREATED', 'DONE')),
  done_at     timestamptz,
  done_by     uuid references public.employees (id),
  created_at  timestamptz not null default now()
);
create index fleet_orders_card_idx on public.fleet_orders (job_card_id);
create index fleet_orders_fleet_idx on public.fleet_orders (fleet_id);
create index fleet_orders_job_idx on public.fleet_orders (job_id_ref);

create trigger audit_wsrs         after insert or update or delete on public.wsrs         for each row execute function app.audit_row();
create trigger audit_wsr_gins     after insert or update or delete on public.wsr_gins     for each row execute function app.audit_row();
create trigger audit_mrns         after insert or update or delete on public.mrns         for each row execute function app.audit_row();
create trigger audit_grns         after insert or update or delete on public.grns         for each row execute function app.audit_row();
create trigger audit_srns         after insert or update or delete on public.srns         for each row execute function app.audit_row();
create trigger audit_fleet_orders after insert or update or delete on public.fleet_orders for each row execute function app.audit_row();

-- opening live stock of tube / flap / disc for Mandaveli: 6 of each part for every tyre size
insert into public.stock_items (item_no, part, size_id, owner_org_unit_id)
select (case p.part when 'TUBE' then 'TUB' when 'FLAP' then 'FLP' else 'DSC' end) || '-MN-' || lpad(row_number() over (order by s.size_code, p.part, g)::text, 4, '0'),
       p.part, s.id, (select id from public.org_units where code = 'MN')
from public.tyre_sizes s cross join (values ('TUBE'), ('FLAP'), ('DISC')) p(part) cross join generate_series(1, 6) g
where s.status = 'ACTIVE' and exists (select 1 from public.org_units where code = 'MN');

-- ---------------------------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------------------------
create function app.tyre_size(p_tyre uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select f.tyre_size_id from public.tyres t join public.tyre_folios f on f.id = t.folio_id where t.id = p_tyre
$$;

create function app.new_order(p_type text, p_card uuid, p_job uuid, p_fleet uuid, p_part text, p_position text, p_tyre uuid, p_item uuid,
                              p_note text, p_reason text, p_org uuid, p_line uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v uuid := gen_random_uuid();
begin
  insert into public.fleet_orders (id, order_no, org_unit_id, order_type, job_card_id, job_id_ref, fleet_id, part, position, tyre_id, item_id, wsr_line_id, note, reason)
  values (v, app.next_doc_no(case p_type when 'REMOVAL' then 'RO' else 'FO' end, p_org, app.business_today()), p_org, p_type, p_card, p_job, p_fleet, p_part, p_position,
          p_tyre, p_item, p_line, p_note, p_reason);
  return v;
end $$;

-- why a Job ID cannot start / complete yet (null = it can)
create function app.job_blockers(p_job uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare j public.job_ids;
begin
  select * into j from public.job_ids where id = p_job;
  if exists (select 1 from public.job_ids w where w.id = any (j.wait_for) and w.status not in ('DONE', 'CLOSED')) then
    return 'an earlier step of this job card is not done yet (Removal, then Unsetting, Setting, Fitment)'; end if;
  if exists (select 1 from public.wsr_lines l where l.job_id_ref = p_job and l.line_status <> 'ISSUED') then
    return 'the material for this step has not been issued yet (WSR)'; end if;
  if exists (select 1 from public.wsr_lines l where l.job_id_ref = p_job and l.receive_status is distinct from 'ACCEPTED') then
    return 'receive the issued material first (GRN)'; end if;
  return null;
end $$;

-- issue one WSR line: a live-stock tyre, or a tube / flap / disc item
create function app.wsr_issue_line(p_line uuid, p_tyre uuid, p_item uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare l public.wsr_lines; t public.tyres; it public.stock_items;
begin
  select * into l from public.wsr_lines where id = p_line for update;
  if l.line_status <> 'REQUESTED' then raise exception 'this line is already %', l.line_status; end if;
  if l.part = 'TYRE' then
    if p_tyre is null then return false; end if;
    select * into t from public.tyres where id = p_tyre and owner_org_unit_id = l.org_unit_id and stock_place = 'LIVE_STOCK' for update;
    if not found then raise exception 'that tyre is not in the live stock of this depot'; end if;
    if l.size_id is not null and app.tyre_size(p_tyre) is distinct from l.size_id then raise exception 'the tyre is not of the requested size'; end if;
    update public.tyres set stock_place = 'IN_TRANSIT', transit_status = 'IN_TRANSIT' where id = p_tyre;
    update public.wsr_lines set issued_tyre_id = p_tyre, issued_qty = 1, line_status = 'ISSUED', receive_status = 'PENDING' where id = p_line;
  else
    if p_item is null then return false; end if;
    select * into it from public.stock_items where id = p_item and owner_org_unit_id = l.org_unit_id and stock_place = 'LIVE_STOCK' and part = l.part for update;
    if not found then raise exception 'that item is not in the live stock of this depot'; end if;
    if l.size_id is not null and it.size_id is distinct from l.size_id then raise exception 'the item is not of the requested size'; end if;
    update public.stock_items set stock_place = 'ISSUED' where id = p_item;
    update public.wsr_lines set issued_item_id = p_item, issued_qty = 1, line_status = 'ISSUED', receive_status = 'PENDING' where id = p_line;
  end if;
  update public.fleet_orders set item_id = p_item, tyre_id = coalesce(p_tyre, tyre_id) where wsr_line_id = p_line and part <> 'TYRE';
  return true;
end $$;

-- WSR status from its lines, and the GIN once something is issued
create function app.wsr_finish(p_wsr uuid, p_actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare w public.wsrs; n_all int; n_iss int;
begin
  select * into w from public.wsrs where id = p_wsr for update;
  select count(*), count(*) filter (where line_status = 'ISSUED') into n_all, n_iss from public.wsr_lines where wsr_id = p_wsr;
  if n_iss > 0 and not exists (select 1 from public.wsr_gins where wsr_id = p_wsr) then
    insert into public.wsr_gins (gin_no, wsr_id, org_unit_id, issued_by) values (app.next_doc_no('GIN', w.org_unit_id, app.business_today()), p_wsr, w.org_unit_id, p_actor);
  end if;
  update public.wsrs set status = case when n_iss = n_all then 'ISSUED' when n_iss > 0 then 'PARTLY_ISSUED' else 'REQUESTED' end where id = p_wsr;
end $$;

-- a job card WSR is issued at once from live stock (the Tyre IC chose the tyre; items are taken first-in-first-out)
create function app.wsr_auto_issue(p_wsr uuid, p_actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare l public.wsr_lines; v_item uuid;
begin
  for l in select * from public.wsr_lines where wsr_id = p_wsr and line_status = 'REQUESTED' order by part loop
    if l.part = 'TYRE' then
      perform app.wsr_issue_line(l.id, l.planned_tyre_id, null);
    else
      select id into v_item from public.stock_items where owner_org_unit_id = l.org_unit_id and stock_place = 'LIVE_STOCK' and part = l.part
        and size_id is not distinct from l.size_id order by item_no limit 1 for update skip locked;
      if v_item is not null then perform app.wsr_issue_line(l.id, null, v_item); end if;
    end if;
  end loop;
  perform app.wsr_finish(p_wsr, p_actor);
end $$;

-- when a Tyre Changing Job ID is done: tyre moves, orders become Done
create function app.on_change_job_done(p_job uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare j public.job_ids; v_code text; today date := app.business_today(); o public.fleet_orders;
begin
  select * into j from public.job_ids where id = p_job;
  select job_code into v_code from public.maintenance_jobs where id = j.job_code_id;
  if v_code not in ('JOB-008', 'JOB-009', 'JOB-010', 'JOB-011') then return; end if;
  if v_code = 'JOB-008' then
    select * into o from public.fleet_orders where job_id_ref = p_job and part = 'TYRE';
    update public.tyres set stock_place = 'IN_TRANSIT', transit_status = 'IN_TRANSIT', fleet_id = null, fitted_position = null, removal_date = today, removal_reason = o.reason where id = j.tyre_id;
    update public.mrns set ready = true where job_id_ref = p_job;
  elsif v_code = 'JOB-011' then
    update public.tyres set setting_status = 'UNSET' where id = j.tyre_id;
  elsif v_code = 'JOB-010' then
    update public.tyres set setting_status = 'SET' where id = j.tyre_id;
    update public.stock_items set stock_place = 'FITTED', tyre_id = j.tyre_id where id in (select item_id from public.fleet_orders where job_id_ref = p_job and order_type = 'FITMENT' and item_id is not null);
  elsif v_code = 'JOB-009' then
    select * into o from public.fleet_orders where job_id_ref = p_job and part = 'TYRE' and order_type = 'FITMENT';
    update public.tyres set stock_place = 'FITTED', fleet_id = o.fleet_id, fitted_position = o.position, fitted_date = today, transit_status = null, stock_category = null where id = j.tyre_id;
  end if;
  update public.fleet_orders set status = 'DONE', done_at = now(), done_by = j.done_by where job_id_ref = p_job;
end $$;

-- ---------------------------------------------------------------------------------------------
-- work: the order lock and the material checks apply to start and complete; completing runs the tyre movement
-- ---------------------------------------------------------------------------------------------
create or replace function public.job_id_start(p_job uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job.execute'); j public.job_ids; v_block text;
begin
  select * into j from public.job_ids where id = p_job and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'Job ID not found in your depot'; end if;
  if not exists (select 1 from public.job_id_assignees where job_id_ref = p_job and employee_id = e.id) then raise exception 'this Job ID is not assigned to you'; end if;
  if j.status <> 'ASSIGNED' then raise exception 'a Job ID that is % cannot be started', j.status; end if;
  v_block := app.job_blockers(p_job);
  if v_block is not null then raise exception '%', v_block; end if;
  update public.job_ids set status = 'STARTED', started_at = now() where id = p_job;
  perform app.log_event(j.job_card_id, p_job, 'START_WORK', e.id);
end $$;

create or replace function public.job_id_complete(p_job uuid, p_on_behalf_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); j public.job_ids; v_mine boolean; v_behalf boolean; v_block text;
begin
  select * into j from public.job_ids where id = p_job and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'Job ID not found in your depot'; end if;
  v_mine := exists (select 1 from public.job_id_assignees where job_id_ref = p_job and employee_id = e.id);
  v_behalf := not v_mine;
  if v_behalf then
    if not app.has_capability('job.onbehalf') then raise exception 'this Job ID is not assigned to you' using errcode = 'insufficient_privilege'; end if;
    if length(btrim(coalesce(p_on_behalf_reason, ''))) = 0 then raise exception 'please give a reason for entering the work on behalf of the Tyre Man'; end if;
  elsif not app.has_capability('job.execute') then
    raise exception 'your role is not allowed to do this' using errcode = 'insufficient_privilege';
  end if;
  if j.status = 'ASSIGNED' and not v_behalf then raise exception 'press Start Work first'; end if;
  if j.status not in ('ASSIGNED', 'STARTED') then raise exception 'a Job ID that is % cannot be completed', j.status; end if;
  v_block := app.job_blockers(p_job);
  if v_block is not null then raise exception '%', v_block; end if;
  update public.job_ids set status = 'DONE', started_at = coalesce(started_at, now()), done_at = now(), done_by = e.id,
         on_behalf_by = case when v_behalf then e.id end, on_behalf_reason = case when v_behalf then btrim(p_on_behalf_reason) end where id = p_job;
  perform app.log_event(j.job_card_id, p_job, case when v_behalf then 'DONE_ON_BEHALF' else 'DONE' end, e.id, p_on_behalf_reason);
  perform app.on_job_done(p_job);
  perform app.on_change_job_done(p_job);
  if not exists (select 1 from public.job_ids where job_card_id = j.job_card_id and status not in ('DONE', 'CLOSED')) then
    update public.job_cards set status = 'FINAL_INSPECTION' where id = j.job_card_id and status in ('ASSIGNED_FOR_WORK');
    perform app.log_event(j.job_card_id, null, 'FINAL_INSPECTION_DUE', e.id);
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Tyre Changing job card
--   p_lines: [{"tyre_id": <tyre to remove>, "reason": text, "fit": "LIVE_SET"|"LIVE_UNSET"|"SWAP"|"WANT",
--              "fit_tyre_id": <good live-stock tyre> (LIVE_*), "swap_tyre_id": <tyre of the second fleet> (SWAP),
--              "tube"|"flap"|"disc": "REUSE"|"OTHER" (LIVE_UNSET)}]
-- ---------------------------------------------------------------------------------------------
create function public.tyre_change_create(p_fleet uuid, p_lines jsonb, p_fleet2 uuid default null, p_expected date default null, p_shift uuid default null, p_instruction text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  e public.employees := app.actor('job_card.create'); v_card uuid := gen_random_uuid(); v_exp date := coalesce(p_expected, app.business_today());
  x jsonb; rm public.tyres; ft public.tyres; sw public.tyres; v_fit text; v_reason text; v_size uuid; v_part text; v_src text; v_wsr uuid; v_line uuid;
  c_rm uuid; c_un uuid; c_st uuid; c_fi uuid; j_rm uuid; j_rm2 uuid; j_un uuid; j_st uuid; j_fi uuid; j_fi2 uuid; v_used uuid[] := '{}'; v_has_reuse boolean; v_n int := 0;
begin
  if not exists (select 1 from public.fleets where id = p_fleet and org_unit_id = e.org_unit_id and status = 'ACTIVE') then raise exception 'that fleet is not an active fleet of your depot'; end if;
  if p_fleet2 is not null and (p_fleet2 = p_fleet or not exists (select 1 from public.fleets where id = p_fleet2 and org_unit_id = e.org_unit_id and status = 'ACTIVE')) then
    raise exception 'the second fleet must be another active fleet of your depot'; end if;
  if p_shift is not null and not exists (select 1 from public.shifts where id = p_shift and status = 'ACTIVE') then raise exception 'unknown shift'; end if;
  if v_exp < app.business_today() - 30 then raise exception 'expected date is too far in the past'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'choose at least one tyre to change'; end if;
  select id into c_rm from public.maintenance_jobs where job_code = 'JOB-008' and status = 'ACTIVE';
  select id into c_un from public.maintenance_jobs where job_code = 'JOB-011' and status = 'ACTIVE';
  select id into c_st from public.maintenance_jobs where job_code = 'JOB-010' and status = 'ACTIVE';
  select id into c_fi from public.maintenance_jobs where job_code = 'JOB-009' and status = 'ACTIVE';
  if c_rm is null or c_un is null or c_st is null or c_fi is null then raise exception 'the Removal / Unsetting / Setting / Fitment job codes must be active'; end if;

  insert into public.job_cards (id, job_card_no, org_unit_id, job_type, fleet_id, fleet2_id, expected_date, expected_shift_id, instruction, created_by)
  values (v_card, app.next_doc_no('JC', null, app.business_today()), e.org_unit_id, 'JOB_CODE', p_fleet, p_fleet2, v_exp, p_shift, nullif(btrim(p_instruction), ''), e.id);

  for x in select * from jsonb_array_elements(p_lines) loop
    v_n := v_n + 1;
    select * into rm from public.tyres where id = nullif(x ->> 'tyre_id', '')::uuid and fleet_id = p_fleet and stock_place = 'FITTED' and owner_org_unit_id = e.org_unit_id;
    if not found then raise exception 'line %: the tyre to remove must be fitted on the fleet', v_n; end if;
    if rm.id = any (v_used) then raise exception 'line %: that tyre is already in this job card', v_n; end if;
    v_used := v_used || rm.id;
    v_reason := btrim(coalesce(x ->> 'reason', ''));
    if v_reason = '' then raise exception 'line %: give the removal reason', v_n; end if;
    v_fit := x ->> 'fit';
    if v_fit is null or v_fit not in ('LIVE_SET', 'LIVE_UNSET', 'SWAP', 'WANT') then raise exception 'line %: choose how the tyre is replaced', v_n; end if;

    j_rm := app.new_job_id(v_card, c_rm, rm.id, p_fleet, null, e.org_unit_id);
    perform app.new_order('REMOVAL', v_card, j_rm, p_fleet, 'TYRE', rm.fitted_position, rm.id, null, null, v_reason, e.org_unit_id);

    if v_fit = 'SWAP' then
      if p_fleet2 is null then raise exception 'line %: a swap needs a second fleet', v_n; end if;
      select * into sw from public.tyres where id = nullif(x ->> 'swap_tyre_id', '')::uuid and fleet_id = p_fleet2 and stock_place = 'FITTED' and owner_org_unit_id = e.org_unit_id;
      if not found then raise exception 'line %: choose the tyre of the second fleet to swap', v_n; end if;
      if sw.id = any (v_used) then raise exception 'line %: that tyre is already in this job card', v_n; end if;
      v_used := v_used || sw.id;
      j_rm2 := app.new_job_id(v_card, c_rm, sw.id, p_fleet2, null, e.org_unit_id);
      perform app.new_order('REMOVAL', v_card, j_rm2, p_fleet2, 'TYRE', sw.fitted_position, sw.id, null, null, v_reason, e.org_unit_id);
      j_fi := app.new_job_id(v_card, c_fi, sw.id, p_fleet, null, e.org_unit_id);
      update public.job_ids set wait_for = array[j_rm, j_rm2] where id = j_fi;
      perform app.new_order('FITMENT', v_card, j_fi, p_fleet, 'TYRE', rm.fitted_position, sw.id, null, null, v_reason, e.org_unit_id);
      j_fi2 := app.new_job_id(v_card, c_fi, rm.id, p_fleet2, null, e.org_unit_id);
      update public.job_ids set wait_for = array[j_rm, j_rm2] where id = j_fi2;
      perform app.new_order('FITMENT', v_card, j_fi2, p_fleet2, 'TYRE', sw.fitted_position, rm.id, null, null, v_reason, e.org_unit_id);
      continue;       -- a swap needs no MRN: both tyres go straight to the other fleet
    end if;

    -- the removed tyre goes to live stock by an MRN (received later by the Tyre IC)
    insert into public.mrns (mrn_no, org_unit_id, kind, tyre_id, job_card_id, job_id_ref, created_by, auto, ready, remarks)
    values (app.next_doc_no('MRN', e.org_unit_id, app.business_today()), e.org_unit_id, 'TYRE', rm.id, v_card, j_rm, e.id, true, false, 'Removed from ' || rm.fitted_position);

    if v_fit = 'WANT' then
      j_fi := app.new_job_id(v_card, c_fi, null, p_fleet, null, e.org_unit_id);
      update public.job_ids set wait_for = array[j_rm], status = 'WAITING_FOR_TYRE' where id = j_fi;
      perform app.new_order('FITMENT', v_card, j_fi, p_fleet, 'TYRE', rm.fitted_position, null, null, 'Want of tyre', v_reason, e.org_unit_id);
      continue;
    end if;

    select * into ft from public.tyres where id = nullif(x ->> 'fit_tyre_id', '')::uuid and owner_org_unit_id = e.org_unit_id and stock_place = 'LIVE_STOCK' and stock_category = 'GOOD';
    if not found then raise exception 'line %: choose a Good tyre from the live stock', v_n; end if;
    if ft.id = any (v_used) then raise exception 'line %: that live-stock tyre is used twice', v_n; end if;
    v_used := v_used || ft.id;
    v_size := app.tyre_size(ft.id);
    if v_wsr is null then
      insert into public.wsrs (wsr_no, org_unit_id, source, requested_by) values (app.next_doc_no('WSR', e.org_unit_id, app.business_today()), e.org_unit_id, 'JOB_CARD', e.id) returning id into v_wsr;
    end if;

    if v_fit = 'LIVE_SET' then
      j_fi := app.new_job_id(v_card, c_fi, ft.id, p_fleet, null, e.org_unit_id);
      update public.job_ids set wait_for = array[j_rm] where id = j_fi;
      insert into public.wsr_lines (wsr_id, org_unit_id, part, size_id, job_card_id, job_id_ref, fleet_id, planned_tyre_id)
      values (v_wsr, e.org_unit_id, 'TYRE', v_size, v_card, j_fi, p_fleet, ft.id);
      perform app.new_order('FITMENT', v_card, j_fi, p_fleet, 'TYRE', rm.fitted_position, ft.id, null, null, v_reason, e.org_unit_id);
    else     -- LIVE_UNSET: tube / flap / disc are reused from the removed tyre or taken from live stock
      v_has_reuse := false;
      foreach v_part in array array['TUBE', 'FLAP', 'DISC'] loop
        v_src := upper(coalesce(x ->> lower(v_part), ''));
        if v_src not in ('REUSE', 'OTHER') then raise exception 'line %: choose Reuse or Other item for the %', v_n, lower(v_part); end if;
        if v_src = 'REUSE' then v_has_reuse := true; end if;
      end loop;
      if v_has_reuse then
        j_un := app.new_job_id(v_card, c_un, rm.id, p_fleet, null, e.org_unit_id);
        update public.job_ids set wait_for = array[j_rm] where id = j_un;
      else j_un := null; end if;
      j_st := app.new_job_id(v_card, c_st, ft.id, p_fleet, null, e.org_unit_id);
      update public.job_ids set wait_for = array[coalesce(j_un, j_rm)] where id = j_st;
      j_fi := app.new_job_id(v_card, c_fi, ft.id, p_fleet, null, e.org_unit_id);
      update public.job_ids set wait_for = array[j_st] where id = j_fi;
      insert into public.wsr_lines (wsr_id, org_unit_id, part, size_id, job_card_id, job_id_ref, fleet_id, planned_tyre_id)
      values (v_wsr, e.org_unit_id, 'TYRE', v_size, v_card, j_st, p_fleet, ft.id);
      foreach v_part in array array['TUBE', 'FLAP', 'DISC'] loop
        v_src := upper(x ->> lower(v_part));
        if v_src = 'REUSE' then
          perform app.new_order('REMOVAL', v_card, j_un, p_fleet, v_part, rm.fitted_position, rm.id, null, 'Reuse on the new tyre', v_reason, e.org_unit_id);
          perform app.new_order('FITMENT', v_card, j_st, p_fleet, v_part, rm.fitted_position, ft.id, null, 'Reused from ' || rm.mtc_no, v_reason, e.org_unit_id);
        else
          insert into public.wsr_lines (wsr_id, org_unit_id, part, size_id, job_card_id, job_id_ref, fleet_id)
          values (v_wsr, e.org_unit_id, v_part, v_size, v_card, j_st, p_fleet) returning id into v_line;
          perform app.new_order('FITMENT', v_card, j_st, p_fleet, v_part, rm.fitted_position, ft.id, null, 'Other item (WSR)', v_reason, e.org_unit_id, v_line);
        end if;
      end loop;
      perform app.new_order('FITMENT', v_card, j_fi, p_fleet, 'TYRE', rm.fitted_position, ft.id, null, null, v_reason, e.org_unit_id);
    end if;
  end loop;

  if v_wsr is not null then perform app.wsr_auto_issue(v_wsr, e.id); end if;
  perform app.recompute_card_minutes(v_card);
  perform app.log_event(v_card, null, 'CREATED', e.id, p_instruction);
  return v_card;
end $$;

-- Want of Tyre: the Tyre IC provides a live-stock tyre for a waiting Fitment
create function public.fitment_provide_tyre(p_job uuid, p_tyre uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.create'); j public.job_ids; c public.job_cards; ft public.tyres; v_wsr uuid; v_line uuid; sib uuid; w uuid;
begin
  select * into j from public.job_ids where id = p_job and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'Job ID not found in your depot'; end if;
  if j.status <> 'WAITING_FOR_TYRE' then raise exception 'this Job ID is not waiting for a tyre'; end if;
  select * into ft from public.tyres where id = p_tyre and owner_org_unit_id = e.org_unit_id and stock_place = 'LIVE_STOCK' and stock_category = 'GOOD';
  if not found then raise exception 'choose a Good tyre from the live stock'; end if;
  select * into c from public.job_cards where id = j.job_card_id;
  insert into public.wsrs (wsr_no, org_unit_id, source, requested_by) values (app.next_doc_no('WSR', e.org_unit_id, app.business_today()), e.org_unit_id, 'JOB_CARD', e.id) returning id into v_wsr;
  insert into public.wsr_lines (wsr_id, org_unit_id, part, size_id, job_card_id, job_id_ref, fleet_id, planned_tyre_id)
  values (v_wsr, e.org_unit_id, 'TYRE', app.tyre_size(p_tyre), c.id, p_job, j.fleet_id, p_tyre) returning id into v_line;
  update public.fleet_orders set tyre_id = p_tyre, note = null where job_id_ref = p_job and order_type = 'FITMENT' and part = 'TYRE';
  update public.job_ids set tyre_id = p_tyre, status = 'PENDING' where id = p_job;
  perform app.wsr_auto_issue(v_wsr, e.id);
  -- a card that is already assigned: the new Fitment goes to the same Tyre Men
  if c.status = 'ASSIGNED_FOR_WORK' then
    select id into sib from public.job_ids where job_card_id = c.id and id <> p_job and status in ('ASSIGNED', 'STARTED', 'DONE') limit 1;
    if sib is not null then
      for w in select employee_id from public.job_id_assignees where job_id_ref = sib loop insert into public.job_id_assignees (job_id_ref, employee_id) values (p_job, w); end loop;
      update public.job_ids set status = 'ASSIGNED', due_date = c.expected_date, due_shift_id = c.expected_shift_id where id = p_job;
    end if;
  end if;
  perform app.recompute_card_minutes(c.id);
  perform app.log_event(c.id, p_job, 'TYRE_PROVIDED ' || ft.mtc_no, e.id);
end $$;

-- ---------------------------------------------------------------------------------------------
-- WSR / WSR GIN / GRN
-- ---------------------------------------------------------------------------------------------
-- p_lines: [{"part": "TYRE|TUBE|FLAP|DISC", "size_id": uuid, "job_card_id": uuid|null, "job_id": uuid|null}]  (a request is by size only)
create function public.wsr_create(p_lines jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.wsr_raise'); v uuid := gen_random_uuid(); x jsonb; v_card uuid; v_job uuid; v_fleet uuid;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'add at least one item'; end if;
  insert into public.wsrs (id, wsr_no, org_unit_id, source, requested_by)
  values (v, app.next_doc_no('WSR', e.org_unit_id, app.business_today()), e.org_unit_id, case e.role_code when 'TIC' then 'TYRE_IC' else 'TYRE_MAN' end, e.id);
  for x in select * from jsonb_array_elements(p_lines) loop
    if coalesce(x ->> 'part', '') not in ('TYRE', 'TUBE', 'FLAP', 'DISC') then raise exception 'choose Tyre, Tube, Flap or Disc'; end if;
    if not exists (select 1 from public.tyre_sizes where id = nullif(x ->> 'size_id', '')::uuid and status = 'ACTIVE') then raise exception 'choose a tyre size'; end if;
    v_card := nullif(x ->> 'job_card_id', '')::uuid; v_job := nullif(x ->> 'job_id', '')::uuid; v_fleet := null;
    if v_card is not null then
      select fleet_id into v_fleet from public.job_cards where id = v_card and org_unit_id = e.org_unit_id;
      if not found then raise exception 'job card not found in your depot'; end if;
    end if;
    if v_job is not null and not exists (select 1 from public.job_ids where id = v_job and job_card_id = v_card) then raise exception 'that Job ID is not on the job card'; end if;
    insert into public.wsr_lines (wsr_id, org_unit_id, part, size_id, job_card_id, job_id_ref, fleet_id)
    values (v, e.org_unit_id, x ->> 'part', (x ->> 'size_id')::uuid, v_card, v_job, v_fleet);
  end loop;
  return v;
end $$;

-- p_picks: [{"line_id": uuid, "tyre_id": uuid|null, "item_id": uuid|null}]; a line that is not picked closes (the balance closes)
create function public.wsr_issue(p_wsr uuid, p_picks jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.issue'); w public.wsrs; x jsonb; l public.wsr_lines; n_ok int := 0;
begin
  select * into w from public.wsrs where id = p_wsr and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'WSR not found in your depot'; end if;
  if w.status = 'ISSUED' then raise exception 'this WSR is already fully issued'; end if;
  for x in select * from jsonb_array_elements(coalesce(p_picks, '[]')) loop
    select * into l from public.wsr_lines where id = nullif(x ->> 'line_id', '')::uuid and wsr_id = p_wsr;
    if not found then raise exception 'a pick is not a line of this WSR'; end if;
    if app.wsr_issue_line(l.id, nullif(x ->> 'tyre_id', '')::uuid, nullif(x ->> 'item_id', '')::uuid) then n_ok := n_ok + 1; end if;
  end loop;
  if n_ok = 0 and not exists (select 1 from public.wsr_gins where wsr_id = p_wsr) then raise exception 'pick at least one tyre or item to issue'; end if;
  update public.wsr_lines set line_status = 'CLOSED' where wsr_id = p_wsr and line_status = 'REQUESTED';   -- the balance closes
  perform app.wsr_finish(p_wsr, e.id);
  return (select id from public.wsr_gins where wsr_id = p_wsr);
end $$;

-- p_results: [{"line_id": uuid, "accept": bool, "reason": text}]; every line still pending must have a result
create function public.grn_receive_wsr_gin(p_gin uuid, p_results jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.receive_gin'); g public.wsr_gins; x jsonb; l public.wsr_lines; n_pend int; n_done int := 0; n_acc int := 0; n_rej int := 0; v_no text;
begin
  select * into g from public.wsr_gins where id = p_gin and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'WSR GIN not found in your depot'; end if;
  select count(*) into n_pend from public.wsr_lines where wsr_id = g.wsr_id and receive_status = 'PENDING';
  if n_pend = 0 then raise exception 'there is nothing left to receive on this GIN'; end if;
  for x in select * from jsonb_array_elements(coalesce(p_results, '[]')) loop
    select * into l from public.wsr_lines where id = nullif(x ->> 'line_id', '')::uuid and wsr_id = g.wsr_id and receive_status = 'PENDING' for update;
    if not found then raise exception 'a result is for a line that is not waiting to be received'; end if;
    n_done := n_done + 1;
    if coalesce((x ->> 'accept')::boolean, false) then
      n_acc := n_acc + 1;
      update public.wsr_lines set receive_status = 'ACCEPTED' where id = l.id;
    else
      if length(btrim(coalesce(x ->> 'reason', ''))) = 0 then raise exception 'a rejected item needs a reason'; end if;
      n_rej := n_rej + 1;
      update public.wsr_lines set receive_status = 'REJECTED', receive_reason = btrim(x ->> 'reason'), line_status = 'CLOSED' where id = l.id;
      if l.issued_tyre_id is not null then update public.tyres set stock_place = 'LIVE_STOCK', transit_status = null where id = l.issued_tyre_id; end if;
      if l.issued_item_id is not null then update public.stock_items set stock_place = 'LIVE_STOCK' where id = l.issued_item_id; end if;
    end if;
  end loop;
  if n_done <> n_pend then raise exception 'every item needs a result (% of % marked)', n_done, n_pend; end if;
  v_no := app.next_doc_no('GRN', e.org_unit_id, app.business_today());
  insert into public.grns (grn_no, org_unit_id, source, wsr_gin_id, issued_qty, accepted_qty, rejected_qty, received_by) values (v_no, e.org_unit_id, 'WSR_GIN', p_gin, n_done, n_acc, n_rej, e.id);
  return v_no;
end $$;

-- ---------------------------------------------------------------------------------------------
-- MRN and the Material Return GRN
-- ---------------------------------------------------------------------------------------------
create function public.mrn_create(p_tyre uuid, p_item uuid, p_remarks text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.mrn_create'); v uuid := gen_random_uuid();
begin
  if (p_tyre is null) = (p_item is null) then raise exception 'choose one tyre or one item to return'; end if;
  if p_tyre is not null then
    if not exists (select 1 from public.tyres where id = p_tyre and owner_org_unit_id = e.org_unit_id and stock_place = 'IN_TRANSIT' and fleet_id is null) then
      raise exception 'only a tyre that you hold (issued or removed, not yet returned) can be returned'; end if;
    if exists (select 1 from public.mrns where tyre_id = p_tyre and status = 'CREATED') then raise exception 'this tyre is already on an open MRN'; end if;
    insert into public.mrns (id, mrn_no, org_unit_id, kind, tyre_id, created_by, remarks) values (v, app.next_doc_no('MRN', e.org_unit_id, app.business_today()), e.org_unit_id, 'TYRE', p_tyre, e.id, nullif(btrim(p_remarks), ''));
  else
    if not exists (select 1 from public.stock_items where id = p_item and owner_org_unit_id = e.org_unit_id and stock_place = 'ISSUED') then
      raise exception 'only an issued item that you hold can be returned'; end if;
    if exists (select 1 from public.mrns where item_id = p_item and status = 'CREATED') then raise exception 'this item is already on an open MRN'; end if;
    insert into public.mrns (id, mrn_no, org_unit_id, kind, item_id, created_by, remarks) values (v, app.next_doc_no('MRN', e.org_unit_id, app.business_today()), e.org_unit_id, 'ITEM', p_item, e.id, nullif(btrim(p_remarks), ''));
  end if;
  return v;
end $$;

-- p_accept false = rejected (the Tyre Man keeps it); accepted: a tyre needs its live-stock category
create function public.mrn_receive(p_mrn uuid, p_accept boolean, p_category text default null, p_remarks text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.return_receive'); m public.mrns; v_no text;
begin
  select * into m from public.mrns where id = p_mrn and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'MRN not found in your depot'; end if;
  if m.status <> 'CREATED' then raise exception 'this MRN is already %', m.status; end if;
  if not m.ready then raise exception 'the Removal Job ID of this MRN is not done yet'; end if;
  v_no := app.next_doc_no('GRN', e.org_unit_id, app.business_today());
  if p_accept then
    if m.kind = 'TYRE' then
      if p_category not in ('GOOD', 'REPAIR') then raise exception 'say whether the tyre goes to Good or Repair stock'; end if;
      update public.tyres set stock_place = 'LIVE_STOCK', stock_category = p_category, transit_status = null where id = m.tyre_id;
    else
      update public.stock_items set stock_place = 'LIVE_STOCK', tyre_id = null where id = m.item_id;
    end if;
    update public.mrns set status = 'RECEIVED', grn_no = v_no, received_by = e.id, received_at = now(), stock_category = case when m.kind = 'TYRE' then p_category end, remarks = coalesce(nullif(btrim(p_remarks), ''), remarks) where id = p_mrn;
  else
    update public.mrns set status = 'REJECTED', grn_no = v_no, received_by = e.id, received_at = now(), remarks = coalesce(nullif(btrim(p_remarks), ''), remarks) where id = p_mrn;
  end if;
  insert into public.grns (grn_no, org_unit_id, source, mrn_id, issued_qty, accepted_qty, rejected_qty, received_by)
  values (v_no, e.org_unit_id, 'MRN', p_mrn, 1, case when p_accept then 1 else 0 end, case when p_accept then 0 else 1 end, e.id);
  return v_no;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Scrap Return Note
--   p_lines: [{"material": text, "qty": number, "unit": "kg"|"nos", "remarks": text}]
-- ---------------------------------------------------------------------------------------------
create function public.srn_create(p_card uuid, p_lines jsonb, p_remarks text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.srn_create'); v uuid := gen_random_uuid(); v_no text; x jsonb;
begin
  if not exists (select 1 from public.job_cards where id = p_card and org_unit_id = e.org_unit_id) then raise exception 'job card not found in your depot'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'add at least one scrap line'; end if;
  v_no := app.next_doc_no('SRN', null, app.business_today());
  insert into public.srns (id, srn_no, org_unit_id, job_card_id, created_by, remarks) values (v, v_no, e.org_unit_id, p_card, e.id, nullif(btrim(p_remarks), ''));
  for x in select * from jsonb_array_elements(p_lines) loop
    insert into public.srn_lines (srn_id, org_unit_id, material, qty, unit, remarks)
    values (v, e.org_unit_id, x ->> 'material', (x ->> 'qty')::numeric, x ->> 'unit', nullif(btrim(x ->> 'remarks'), ''));
  end loop;
  perform app.log_event(p_card, null, 'SRN ' || v_no, e.id);
  return v_no;
end $$;

create function public.srn_receive(p_srn uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.return_receive'); s public.srns; v_no text;
begin
  select * into s from public.srns where id = p_srn and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'SRN not found in your depot'; end if;
  if s.status <> 'CREATED' then raise exception 'this SRN is already received'; end if;
  v_no := app.next_doc_no('GRN', e.org_unit_id, app.business_today());
  update public.srns set status = 'RECEIVED', grn_no = v_no, received_by = e.id, received_at = now() where id = p_srn;
  return v_no;
end $$;

create view public.v_scrap_stock with (security_invoker = true) as
select l.org_unit_id, l.material, l.unit, sum(l.qty) as stock_qty, count(distinct s.id) as srn_count
from public.srn_lines l join public.srns s on s.id = l.srn_id where s.status = 'RECEIVED' group by l.org_unit_id, l.material, l.unit;
grant select on public.v_scrap_stock to authenticated;

-- ---------------------------------------------------------------------------------------------
-- grants and row-level security
-- ---------------------------------------------------------------------------------------------
revoke all on function app.tyre_size(uuid), app.new_order(text, uuid, uuid, uuid, text, text, uuid, uuid, text, text, uuid, uuid), app.job_blockers(uuid),
  app.wsr_issue_line(uuid, uuid, uuid), app.wsr_finish(uuid, uuid), app.wsr_auto_issue(uuid, uuid), app.on_change_job_done(uuid) from public, anon, authenticated;
revoke all on function public.job_id_start(uuid), public.job_id_complete(uuid, text), public.tyre_change_create(uuid, jsonb, uuid, date, uuid, text), public.fitment_provide_tyre(uuid, uuid),
  public.wsr_create(jsonb), public.wsr_issue(uuid, jsonb), public.grn_receive_wsr_gin(uuid, jsonb), public.mrn_create(uuid, uuid, text), public.mrn_receive(uuid, boolean, text, text),
  public.srn_create(uuid, jsonb, text), public.srn_receive(uuid) from public, anon;
grant execute on function public.job_id_start(uuid), public.job_id_complete(uuid, text), public.tyre_change_create(uuid, jsonb, uuid, date, uuid, text), public.fitment_provide_tyre(uuid, uuid),
  public.wsr_create(jsonb), public.wsr_issue(uuid, jsonb), public.grn_receive_wsr_gin(uuid, jsonb), public.mrn_create(uuid, uuid, text), public.mrn_receive(uuid, boolean, text, text),
  public.srn_create(uuid, jsonb, text), public.srn_receive(uuid) to authenticated;

alter table public.stock_items enable row level security; alter table public.stock_items force row level security;
alter table public.wsrs        enable row level security; alter table public.wsrs        force row level security;
alter table public.wsr_lines   enable row level security; alter table public.wsr_lines   force row level security;
alter table public.wsr_gins    enable row level security; alter table public.wsr_gins    force row level security;
alter table public.mrns        enable row level security; alter table public.mrns        force row level security;
alter table public.grns        enable row level security; alter table public.grns        force row level security;
alter table public.srns        enable row level security; alter table public.srns        force row level security;
alter table public.srn_lines   enable row level security; alter table public.srn_lines   force row level security;
alter table public.fleet_orders enable row level security; alter table public.fleet_orders force row level security;
grant select on public.stock_items, public.wsrs, public.wsr_lines, public.wsr_gins, public.mrns, public.grns, public.srns, public.srn_lines, public.fleet_orders to authenticated;

create policy gate_active_user on public.stock_items  as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.wsrs         as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.wsr_lines    as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.wsr_gins     as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.mrns         as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.grns         as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.srns         as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.srn_lines    as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.fleet_orders as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());

create policy read_depot on public.stock_items  for select to authenticated using (owner_org_unit_id in (select app.my_visible_depot_ids()));
create policy read_depot on public.wsrs         for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()));
create policy read_depot on public.wsr_lines    for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()));
create policy read_depot on public.wsr_gins     for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()));
create policy read_depot on public.mrns         for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()));
create policy read_depot on public.grns         for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()));
create policy read_depot on public.srns         for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()));
create policy read_depot on public.srn_lines    for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()));
create policy read_depot on public.fleet_orders for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()));
