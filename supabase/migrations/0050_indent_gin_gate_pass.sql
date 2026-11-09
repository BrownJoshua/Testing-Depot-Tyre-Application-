-- 0050: D1 screen match, Tyre IC stock side
--   WSR: Rejected / Cancelled with a note.  Depot Indent (Indent / Internal Transfer), Internal Transfer Request (receiver accepts and
--   makes a GIN), Indent GIN with Supervisor approval, Gate Pass (In transit reduces the sender's live stock), GRN of a GIN at the receiving depot.
--   Receivers that are not depots (TRS, MIC, Central Store) have no users here: the sender marks the gate pass Received.

-- ------------------------------------------------------------------ WSR reject / cancel
alter table public.wsrs drop constraint wsrs_status_check;
alter table public.wsrs add constraint wsrs_status_check check (status in ('REQUESTED', 'PARTLY_ISSUED', 'ISSUED', 'REJECTED', 'CANCELLED'));
alter table public.wsrs add column status_note text;

create function public.wsr_reject(p_wsr uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.issue'); w public.wsrs;
begin
  select * into w from public.wsrs where id = p_wsr and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'WSR not found in your depot'; end if;
  if w.status <> 'REQUESTED' then raise exception 'only a Requested WSR can be rejected (this one is %)', w.status; end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'a rejection needs a reason'; end if;
  update public.wsr_lines set line_status = 'CLOSED' where wsr_id = p_wsr;
  update public.wsrs set status = 'REJECTED', status_note = btrim(p_reason) where id = p_wsr;
end $$;

create function public.wsr_cancel(p_wsr uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.wsr_raise'); w public.wsrs;
begin
  select * into w from public.wsrs where id = p_wsr and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'WSR not found in your depot'; end if;
  if w.requested_by <> e.id and e.role_code <> 'TIC' then raise exception 'only the person who raised the WSR (or the Tyre IC) can cancel it'; end if;
  if w.status <> 'REQUESTED' then raise exception 'only a Requested WSR can be cancelled (this one is %)', w.status; end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'a cancellation needs a reason'; end if;
  update public.wsr_lines set line_status = 'CLOSED' where wsr_id = p_wsr;
  update public.wsrs set status = 'CANCELLED', status_note = btrim(p_reason) where id = p_wsr;
end $$;

-- ------------------------------------------------------------------ capabilities
insert into public.role_capabilities (role_code, capability, is_enabled, is_resolved, note) values
  ('TIC', 'stock.indent', true, true, 'Tyre IC raises Indents and Internal Transfer GINs'),
  ('SUP', 'stock.approve', true, true, 'Supervisor approves Indents and GINs');

-- ------------------------------------------------------------------ Indent
create table public.indents (
  id            uuid primary key default gen_random_uuid(),
  indent_no     text not null unique,
  org_unit_id   uuid not null references public.depots (org_unit_id),          -- the requesting depot
  indent_type   text not null check (indent_type in ('INDENT', 'INTERNAL_TRANSFER')),   -- Indent = Central Store, Internal Transfer = depot / TRS / MIC
  request_to_id uuid not null references public.org_units (id),
  size_id       uuid references public.tyre_sizes (id),
  material      text not null default 'Tyre',
  qty           int not null check (qty > 0),
  required_for  text,
  remarks       text,
  status        text not null default 'DRAFT' check (status in ('DRAFT', 'AWAITING_APPROVAL', 'REVERTED', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'IN_TRANSIT', 'RECEIVED')),
  status_note   text,
  created_by    uuid not null references public.employees (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index indents_to_idx on public.indents (request_to_id, status);

create table public.indent_gins (
  id           uuid primary key default gen_random_uuid(),
  gin_no       text not null unique,
  org_unit_id  uuid not null references public.depots (org_unit_id),             -- the sender
  to_unit_id   uuid not null references public.org_units (id),
  indent_id    uuid references public.indents (id),
  reason       text,
  status       text not null default 'DRAFT' check (status in ('DRAFT', 'AWAITING_APPROVAL', 'REVERTED', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED')),
  status_note  text,
  gp_no        text,
  created_by   uuid not null references public.employees (id),
  created_at   timestamptz not null default now(),
  in_transit_at timestamptz,
  received_at  timestamptz
);
create table public.indent_gin_tyres (
  gin_id    uuid not null references public.indent_gins (id),
  tyre_id   uuid not null references public.tyres (id),
  org_unit_id uuid not null references public.depots (org_unit_id),
  result    text check (result is null or result in ('ACCEPTED', 'REJECTED')),
  reason    text,
  primary key (gin_id, tyre_id)
);
create table public.gate_passes (
  id           uuid primary key default gen_random_uuid(),
  gp_no        text not null unique,
  org_unit_id  uuid not null references public.depots (org_unit_id),             -- the sending depot
  gin_id       uuid not null references public.indent_gins (id),
  vehicle_kind text not null check (vehicle_kind in ('MTC Vehicle', 'Contract Vehicle')),
  vehicle_no   text not null check (length(btrim(vehicle_no)) > 0),
  driver       text not null check (length(btrim(driver)) > 0),
  status       text not null default 'ISSUED' check (status in ('ISSUED', 'EXITED', 'RECEIVED', 'CANCELLED')),
  status_note  text,
  exit_at      timestamptz,
  received_at  timestamptz,
  created_by   uuid not null references public.employees (id),
  created_at   timestamptz not null default now()
);
alter table public.grns add column indent_gin_id uuid references public.indent_gins (id);
alter table public.grns drop constraint grns_source_check;
alter table public.grns add constraint grns_source_check check (source in ('WSR_GIN', 'MRN', 'INDENT_GIN'));

create trigger audit_indents    after insert or update or delete on public.indents    for each row execute function app.audit_row();
create trigger audit_indent_gins after insert or update or delete on public.indent_gins for each row execute function app.audit_row();
create trigger audit_gate_passes after insert or update or delete on public.gate_passes for each row execute function app.audit_row();

-- a tyre on its way to my depot may be read by the receiver (to receive it in the GRN)
create function app.is_incoming_tyre(p_tyre uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.indent_gin_tyres t join public.indent_gins g on g.id = t.gin_id
                  where t.tyre_id = p_tyre and g.status = 'IN_TRANSIT' and g.to_unit_id in (select app.my_visible_depot_ids()))
$$;
revoke all on function app.is_incoming_tyre(uuid) from public, anon;
grant execute on function app.is_incoming_tyre(uuid) to authenticated;
create policy read_incoming on public.tyres for select to authenticated using (app.is_incoming_tyre(id));

-- ------------------------------------------------------------------ Indent functions
create function public.indent_create(p_type text, p_to uuid, p_size uuid, p_qty int, p_required_for text default null, p_remarks text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.indent'); v uuid := gen_random_uuid(); u public.org_units;
begin
  if p_type not in ('INDENT', 'INTERNAL_TRANSFER') then raise exception 'type must be INDENT or INTERNAL_TRANSFER'; end if;
  select * into u from public.org_units where id = p_to and status = 'ACTIVE';
  if not found or p_to = e.org_unit_id then raise exception 'choose another depot or unit to request from'; end if;
  if (p_type = 'INDENT') <> (u.unit_type = 'CENTRAL_STORE') then raise exception 'an Indent goes to the Central Store; an Internal Transfer goes to a depot, TRS or MIC'; end if;
  insert into public.indents (id, indent_no, org_unit_id, indent_type, request_to_id, size_id, qty, required_for, remarks, created_by)
  values (v, app.next_doc_no('IND', e.org_unit_id, app.business_today()), e.org_unit_id, p_type, p_to, p_size, p_qty, nullif(btrim(p_required_for), ''), nullif(btrim(p_remarks), ''), e.id);
  return v;
end $$;

-- one function moves an indent through its steps:  SEND (requester), WITHDRAW, CANCEL (requester), APPROVE / REVERT / REJECT (Supervisor of the requester),
-- ACCEPT / DECLINE (receiving depot's Tyre IC; accept is done by gin_create with the indent)
create function public.indent_act(p_indent uuid, p_action text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); i public.indents; v_cap text;
begin
  select * into i from public.indents where id = p_indent for update;
  if not found then raise exception 'indent not found'; end if;
  if p_action in ('SEND', 'WITHDRAW', 'CANCEL') then
    perform app.actor('stock.indent');
    if i.org_unit_id <> e.org_unit_id then raise exception 'indent not found in your depot'; end if;
    if p_action = 'SEND' and i.status in ('DRAFT', 'REVERTED') then update public.indents set status = 'AWAITING_APPROVAL', status_note = null where id = p_indent;
    elsif p_action = 'WITHDRAW' and i.status = 'AWAITING_APPROVAL' then update public.indents set status = 'DRAFT', status_note = null where id = p_indent;
    elsif p_action = 'CANCEL' and i.status in ('DRAFT', 'SENT', 'REVERTED') then
      if length(btrim(coalesce(p_note, ''))) = 0 then raise exception 'a cancellation needs a reason'; end if;
      update public.indents set status = 'CANCELLED', status_note = btrim(p_note) where id = p_indent;
    else raise exception 'a % indent cannot be %', i.status, lower(p_action); end if;
  elsif p_action in ('APPROVE', 'REVERT', 'REJECT') then
    perform app.actor('stock.approve');
    if i.org_unit_id <> e.org_unit_id then raise exception 'indent not found in your depot'; end if;
    if i.status <> 'AWAITING_APPROVAL' then raise exception 'only an indent awaiting approval can be decided'; end if;
    if p_action <> 'APPROVE' and length(btrim(coalesce(p_note, ''))) = 0 then raise exception 'please give the reason'; end if;
    update public.indents set status = case p_action when 'APPROVE' then 'SENT' when 'REVERT' then 'REVERTED' else 'REJECTED' end, status_note = nullif(btrim(p_note), '') where id = p_indent;
  elsif p_action = 'DECLINE' then
    perform app.actor('stock.indent');
    if i.request_to_id <> e.org_unit_id then raise exception 'this request was not sent to your depot'; end if;
    if i.status <> 'SENT' then raise exception 'only a new request can be rejected'; end if;
    if length(btrim(coalesce(p_note, ''))) = 0 then raise exception 'a rejection needs a reason'; end if;
    update public.indents set status = 'REJECTED', status_note = btrim(p_note) where id = p_indent;
  else raise exception 'unknown action %', p_action; end if;
end $$;

-- ------------------------------------------------------------------ Indent GIN
create function public.gin_create(p_to uuid, p_tyres uuid[], p_reason text default null, p_indent uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.indent'); v uuid := gen_random_uuid(); t uuid; u public.org_units; i public.indents;
begin
  select * into u from public.org_units where id = p_to and status = 'ACTIVE';
  if not found or p_to = e.org_unit_id then raise exception 'choose the receiving depot or unit'; end if;
  if coalesce(cardinality(p_tyres), 0) = 0 then raise exception 'choose at least one tyre from live stock'; end if;
  if p_indent is not null then
    select * into i from public.indents where id = p_indent for update;
    if not found or i.request_to_id <> e.org_unit_id or i.org_unit_id <> p_to then raise exception 'that request was not made to your depot by the receiver'; end if;
    if i.status <> 'SENT' then raise exception 'only a new request can be accepted'; end if;
  end if;
  foreach t in array p_tyres loop
    if not exists (select 1 from public.tyres where id = t and owner_org_unit_id = e.org_unit_id and stock_place = 'LIVE_STOCK') then raise exception 'every tyre must be in the live stock of your depot'; end if;
    if exists (select 1 from public.indent_gin_tyres x join public.indent_gins g on g.id = x.gin_id where x.tyre_id = t and g.status in ('DRAFT', 'AWAITING_APPROVAL', 'REVERTED', 'APPROVED', 'IN_TRANSIT')) then
      raise exception 'a tyre is already on another open GIN'; end if;
  end loop;
  insert into public.indent_gins (id, gin_no, org_unit_id, to_unit_id, indent_id, reason, created_by)
  values (v, app.next_doc_no('GIN', e.org_unit_id, app.business_today()), e.org_unit_id, p_to, p_indent, nullif(btrim(p_reason), ''), e.id);
  insert into public.indent_gin_tyres (gin_id, tyre_id, org_unit_id) select v, x, e.org_unit_id from unnest(p_tyres) x;
  if p_indent is not null then update public.indents set status = 'ACCEPTED', status_note = (select gin_no from public.indent_gins where id = v) where id = p_indent; end if;
  return v;
end $$;

-- SEND, WITHDRAW, CANCEL (Tyre IC); APPROVE, REVERT, REJECT (Supervisor)
create function public.gin_act(p_gin uuid, p_action text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor(null); g public.indent_gins;
begin
  select * into g from public.indent_gins where id = p_gin and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'GIN not found in your depot'; end if;
  if p_action in ('SEND', 'WITHDRAW', 'CANCEL') then
    perform app.actor('stock.indent');
    if p_action = 'SEND' and g.status in ('DRAFT', 'REVERTED') then update public.indent_gins set status = 'AWAITING_APPROVAL', status_note = null where id = p_gin;
    elsif p_action = 'WITHDRAW' and g.status = 'AWAITING_APPROVAL' then update public.indent_gins set status = 'DRAFT', status_note = null where id = p_gin;
    elsif p_action = 'CANCEL' and g.status in ('DRAFT', 'REVERTED', 'APPROVED') then
      if length(btrim(coalesce(p_note, ''))) = 0 then raise exception 'a cancellation needs a reason'; end if;
      update public.indent_gins set status = 'CANCELLED', status_note = btrim(p_note) where id = p_gin;
      if g.indent_id is not null then update public.indents set status = 'SENT', status_note = null where id = g.indent_id and status = 'ACCEPTED'; end if;
    else raise exception 'a % GIN cannot be %', g.status, lower(p_action); end if;
  elsif p_action in ('APPROVE', 'REVERT', 'REJECT') then
    perform app.actor('stock.approve');
    if g.status <> 'AWAITING_APPROVAL' then raise exception 'only a GIN awaiting approval can be decided'; end if;
    if p_action <> 'APPROVE' and length(btrim(coalesce(p_note, ''))) = 0 then raise exception 'please give the reason'; end if;
    update public.indent_gins set status = case p_action when 'APPROVE' then 'APPROVED' when 'REVERT' then 'REVERTED' else 'REJECTED' end, status_note = nullif(btrim(p_note), '') where id = p_gin;
  else raise exception 'unknown action %', p_action; end if;
end $$;

-- ------------------------------------------------------------------ Gate Pass
create function public.gate_pass_create(p_gin uuid, p_vehicle_kind text, p_vehicle_no text, p_driver text) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.issue'); g public.indent_gins; v_no text;
begin
  select * into g from public.indent_gins where id = p_gin and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'GIN not found in your depot'; end if;
  if g.status <> 'APPROVED' then raise exception 'a gate pass is made for an Approved GIN (this one is %)', g.status; end if;
  v_no := app.next_doc_no('GP', e.org_unit_id, app.business_today());
  insert into public.gate_passes (gp_no, org_unit_id, gin_id, vehicle_kind, vehicle_no, driver, created_by) values (v_no, e.org_unit_id, p_gin, p_vehicle_kind, btrim(p_vehicle_no), btrim(p_driver), e.id);
  update public.indent_gins set status = 'IN_TRANSIT', gp_no = v_no, in_transit_at = now() where id = p_gin;
  update public.tyres set stock_place = 'IN_TRANSIT', transit_status = 'IN_TRANSIT' where id in (select tyre_id from public.indent_gin_tyres where gin_id = p_gin);   -- the sender's live stock reduces
  if g.indent_id is not null then update public.indents set status = 'IN_TRANSIT' where id = g.indent_id; end if;
  return v_no;
end $$;

-- EXIT (vehicle leaves), CANCEL (before it leaves; the tyres return to live stock), RECEIVED (only when the receiver is not a depot)
create function public.gate_pass_act(p_gp uuid, p_action text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.issue'); p public.gate_passes; g public.indent_gins; u public.org_units;
begin
  select * into p from public.gate_passes where id = p_gp and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'gate pass not found in your depot'; end if;
  select * into g from public.indent_gins where id = p.gin_id for update;
  select * into u from public.org_units where id = g.to_unit_id;
  if p_action = 'EXIT' and p.status = 'ISSUED' then update public.gate_passes set status = 'EXITED', exit_at = now() where id = p_gp;
  elsif p_action = 'CANCEL' and p.status = 'ISSUED' then
    if length(btrim(coalesce(p_note, ''))) = 0 then raise exception 'a cancellation needs a reason'; end if;
    update public.gate_passes set status = 'CANCELLED', status_note = btrim(p_note) where id = p_gp;
    update public.indent_gins set status = 'APPROVED', gp_no = null, in_transit_at = null where id = g.id;
    update public.tyres set stock_place = 'LIVE_STOCK', transit_status = null where id in (select tyre_id from public.indent_gin_tyres where gin_id = g.id);
    if g.indent_id is not null then update public.indents set status = 'ACCEPTED' where id = g.indent_id; end if;
  elsif p_action = 'RECEIVED' and p.status in ('ISSUED', 'EXITED') then
    if u.unit_type = 'DEPOT' then raise exception 'the receiving depot receives this in its own GRN screen'; end if;
    update public.gate_passes set status = 'RECEIVED', received_at = now() where id = p_gp;
    update public.indent_gins set status = 'RECEIVED', received_at = now() where id = g.id;
    update public.tyres set stock_place = case u.unit_type when 'TRS' then 'AT_TRS' when 'MIC_VEHICLE_UNIT' then 'AT_MIC' else 'CENTRAL_STORE' end, transit_status = null
     where id in (select tyre_id from public.indent_gin_tyres where gin_id = g.id);
    if g.indent_id is not null then update public.indents set status = 'RECEIVED' where id = g.indent_id; end if;
  else raise exception 'a % gate pass cannot be %', p.status, lower(p_action); end if;
end $$;

-- the receiving depot's Tyre IC receives the GIN (GRN): p_results [{"tyre_id": uuid, "accept": bool, "reason": text}]
create function public.grn_receive_gin(p_gin uuid, p_results jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('stock.receive_gin'); g public.indent_gins; x jsonb; n int := 0; n_acc int := 0; n_tot int; v_no text; t uuid;
begin
  select * into g from public.indent_gins where id = p_gin and to_unit_id = e.org_unit_id for update;
  if not found then raise exception 'this GIN is not addressed to your depot'; end if;
  if g.status <> 'IN_TRANSIT' then raise exception 'only a GIN in transit can be received (this one is %)', g.status; end if;
  select count(*) into n_tot from public.indent_gin_tyres where gin_id = p_gin;
  for x in select * from jsonb_array_elements(coalesce(p_results, '[]')) loop
    t := nullif(x ->> 'tyre_id', '')::uuid;
    if not exists (select 1 from public.indent_gin_tyres where gin_id = p_gin and tyre_id = t and result is null) then raise exception 'a result is for a tyre that is not waiting on this GIN'; end if;
    n := n + 1;
    if coalesce((x ->> 'accept')::boolean, false) then
      n_acc := n_acc + 1;
      update public.indent_gin_tyres set result = 'ACCEPTED' where gin_id = p_gin and tyre_id = t;
      update public.tyres set owner_org_unit_id = e.org_unit_id, stock_place = 'LIVE_STOCK', transit_status = null, received_date = app.business_today() where id = t;
    else
      if length(btrim(coalesce(x ->> 'reason', ''))) = 0 then raise exception 'a rejected tyre needs a reason'; end if;
      update public.indent_gin_tyres set result = 'REJECTED', reason = btrim(x ->> 'reason') where gin_id = p_gin and tyre_id = t;
      update public.tyres set stock_place = 'LIVE_STOCK', transit_status = null where id = t;      -- goes back to the sender
    end if;
  end loop;
  if n <> n_tot then raise exception 'every tyre needs a result (% of % marked)', n, n_tot; end if;
  v_no := app.next_doc_no('GRN', e.org_unit_id, app.business_today());
  insert into public.grns (grn_no, org_unit_id, source, indent_gin_id, issued_qty, accepted_qty, rejected_qty, received_by) values (v_no, e.org_unit_id, 'INDENT_GIN', p_gin, n_tot, n_acc, n_tot - n_acc, e.id);
  update public.indent_gins set status = 'RECEIVED', received_at = now() where id = p_gin;
  update public.gate_passes set status = 'RECEIVED', received_at = now() where gin_id = p_gin and status in ('ISSUED', 'EXITED');
  if g.indent_id is not null then update public.indents set status = 'RECEIVED' where id = g.indent_id; end if;
  return v_no;
end $$;

-- ------------------------------------------------------------------ grants and row-level security
revoke all on function public.wsr_reject(uuid, text), public.wsr_cancel(uuid, text), public.indent_create(text, uuid, uuid, int, text, text), public.indent_act(uuid, text, text),
  public.gin_create(uuid, uuid[], text, uuid), public.gin_act(uuid, text, text), public.gate_pass_create(uuid, text, text, text), public.gate_pass_act(uuid, text, text),
  public.grn_receive_gin(uuid, jsonb) from public, anon;
grant execute on function public.wsr_reject(uuid, text), public.wsr_cancel(uuid, text), public.indent_create(text, uuid, uuid, int, text, text), public.indent_act(uuid, text, text),
  public.gin_create(uuid, uuid[], text, uuid), public.gin_act(uuid, text, text), public.gate_pass_create(uuid, text, text, text), public.gate_pass_act(uuid, text, text),
  public.grn_receive_gin(uuid, jsonb) to authenticated;

alter table public.indents         enable row level security; alter table public.indents         force row level security;
alter table public.indent_gins     enable row level security; alter table public.indent_gins     force row level security;
alter table public.indent_gin_tyres enable row level security; alter table public.indent_gin_tyres force row level security;
alter table public.gate_passes     enable row level security; alter table public.gate_passes     force row level security;
grant select on public.indents, public.indent_gins, public.indent_gin_tyres, public.gate_passes to authenticated;
create policy gate_active_user on public.indents          as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.indent_gins      as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.indent_gin_tyres as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.gate_passes      as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
-- the sender and the receiver both see an indent / GIN / gate pass; a Tyre Man sees none of them
create policy read_depot on public.indents for select to authenticated using (app.my_role() <> 'TM' and (org_unit_id in (select app.my_visible_depot_ids()) or request_to_id in (select app.my_visible_depot_ids())));
create policy read_depot on public.indent_gins for select to authenticated using (app.my_role() <> 'TM' and (org_unit_id in (select app.my_visible_depot_ids()) or to_unit_id in (select app.my_visible_depot_ids())));
create policy read_depot on public.indent_gin_tyres for select to authenticated using (app.my_role() <> 'TM' and exists (select 1 from public.indent_gins g where g.id = gin_id));
create policy read_depot on public.gate_passes for select to authenticated using (app.my_role() <> 'TM' and exists (select 1 from public.indent_gins g where g.id = gin_id));
-- org_units is readable by every signed-in user (names of senders / receivers)
