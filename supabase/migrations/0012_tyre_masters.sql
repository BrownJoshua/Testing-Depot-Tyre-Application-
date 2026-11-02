-- 0012: Tyre masters on the HO -> AM approval engine: sizes, makes, models and folios.
-- STATUS: proposed in Stage 4 batch 2, NOT applied. Review and approve before running.
--
--  * Seeded from the prototype (existing-prototype-audit.md): 7 tyre sizes, 8 makes, and the reference lists the
--    folio form offers (construction, tube type, product group, category, unit of measure).
--  * NOT seeded: tyre models and folios. The prototype does not say which model belongs to which make, and the
--    folio list was not extracted. HO proposes them through the approval flow (nothing is invented here).
--  * Rows are written only by app.apply_* functions, which run when an AM approves a request.
--  * Folio number format is only known from one example (F7001). The placeholder rule is "3-20 characters:
--    A-Z, 0-9, hyphen". A folio is never deleted; "Delete" in the prototype becomes Inactive (BR-MC-08).
--  * Payload conventions (same as vendors): a code in the payload (size_code / name / folio_no) means CREATE;
--    UPDATE sends only changed fields; DEACTIVATE / REACTIVATE send {}.

-- ---------------------------------------------------------------------------------------------
-- reference lists used by folios
-- ---------------------------------------------------------------------------------------------
insert into public.ref_values (list_code, code, label, sort_order) values
  ('construction_type', 'RADIAL',    'Radial',    1),
  ('construction_type', 'NYLON',     'Nylon',     2),
  ('tube_type',         'TUBE',      'Tube',      1),
  ('tube_type',         'TUBELESS',  'Tubeless',  2),
  ('product_group',     'TYRE',      'Tyre',      1),
  ('folio_category',    'SPARES',    'Spares',    1),
  ('folio_category',    'ACCESSORY', 'Accessory', 2),
  ('uom',               'NOS',       'Nos',       1);

-- ---------------------------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------------------------
create table public.tyre_sizes (
  id            uuid primary key default gen_random_uuid(),
  size_code     text not null unique check (length(btrim(size_code)) between 3 and 30),
  rim_inches    numeric(4,1) check (rim_inches is null or rim_inches between 10 and 30),
  display_label text,
  status        public.master_status not null default 'ACTIVE',
  row_version   int not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create table public.tyre_makes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 2 and 60),
  status      public.master_status not null default 'ACTIVE',
  row_version int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index tyre_makes_name_uk on public.tyre_makes (lower(name));
create table public.tyre_models (
  id          uuid primary key default gen_random_uuid(),
  make_id     uuid not null references public.tyre_makes (id),
  model_name  text not null check (length(btrim(model_name)) between 1 and 80),
  status      public.master_status not null default 'ACTIVE',
  row_version int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index tyre_models_uk on public.tyre_models (make_id, lower(model_name));
create table public.tyre_folios (
  id                    uuid primary key default gen_random_uuid(),
  folio_no              text not null unique check (folio_no ~ '^[A-Z0-9-]{3,20}$'),
  folio_name            text not null check (length(btrim(folio_name)) > 0),
  specification         text,
  make_id               uuid references public.tyre_makes (id),
  model_id              uuid references public.tyre_models (id),
  construction_type_ref uuid references public.ref_values (id),
  tube_type_ref         uuid references public.ref_values (id),
  ply                   smallint check (ply is null or ply between 1 and 40),
  tyre_size_id          uuid references public.tyre_sizes (id),
  product_group_ref     uuid not null references public.ref_values (id),
  category_ref          uuid references public.ref_values (id),
  uom_ref               uuid not null references public.ref_values (id),
  hsn_code              text,
  has_expiry            boolean not null default false,
  is_recondition        boolean not null default false,
  status                public.master_status not null default 'ACTIVE',
  row_version           int not null default 1,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint folio_model_needs_make check (model_id is null or make_id is not null)
);
create index tyre_folios_group_size_idx on public.tyre_folios (product_group_ref, tyre_size_id);
create index tyre_folios_name_trgm_idx on public.tyre_folios using gin (folio_name extensions.gin_trgm_ops);
create table public.tyre_folio_locations (
  folio_id      uuid not null references public.tyre_folios (id),
  location_type public.org_unit_type not null,
  primary key (folio_id, location_type)
);

create trigger tyre_sizes_touch  before update on public.tyre_sizes  for each row execute function app.set_updated_at();
create trigger tyre_makes_touch  before update on public.tyre_makes  for each row execute function app.set_updated_at();
create trigger tyre_models_touch before update on public.tyre_models for each row execute function app.set_updated_at();
create trigger tyre_folios_touch before update on public.tyre_folios for each row execute function app.set_updated_at();
create trigger audit_tyre_sizes  after insert or update or delete on public.tyre_sizes  for each row execute function app.audit_row();
create trigger audit_tyre_makes  after insert or update or delete on public.tyre_makes  for each row execute function app.audit_row();
create trigger audit_tyre_models after insert or update or delete on public.tyre_models for each row execute function app.audit_row();
create trigger audit_tyre_folios after insert or update or delete on public.tyre_folios for each row execute function app.audit_row();

-- seed from the prototype
insert into public.tyre_sizes (size_code, rim_inches, display_label) values
  ('7.50 X 16', 16, '7.50 X 16'), ('10.00 X 20', 20, '10.00 X 20'), ('9.00 X 20', 20, '9.00 X 20'), ('8.25 X 16', 16, '8.25 X 16'),
  ('295/80R22.5', 22.5, '295/80R22.5'), ('235/75R17.5', 17.5, '235/75R17.5'), ('295/90R20', 20, '295/90R20');
insert into public.tyre_makes (name) values
  ('Apollo'), ('Birla'), ('Bridgestone'), ('CEAT'), ('JK'), ('Michelin'), ('MRF'), ('TOLINS');

-- ---------------------------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------------------------
create function app.check_keys(p jsonb, allowed text[]) returns void
language plpgsql immutable set search_path = '' as $$
declare k text;
begin
  for k in select jsonb_object_keys(p) loop
    if not (k = any (allowed)) then raise exception 'unknown field "%"', k; end if;
  end loop;
end $$;

create function app.ref_id(p_list text, p_code text, p_label text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid;
begin
  select id into v from public.ref_values where list_code = p_list and code = p_code and status = 'ACTIVE';
  if v is null then raise exception 'unknown % "%"', p_label, p_code; end if;
  return v;
end $$;

create function app.request_row(p_request uuid, p_entity text) returns public.master_change_requests
language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests;
begin
  select * into r from public.master_change_requests where id = p_request;
  if not found or r.entity_type <> p_entity then raise exception 'not a % request', p_entity; end if;
  return r;
end $$;

-- ---------------------------------------------------------------------------------------------
-- tyre size: size_code, rim_inches, display_label
-- ---------------------------------------------------------------------------------------------
create function app.validate_tyre_size(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform app.check_keys(p, array['size_code','rim_inches','display_label']);
  if p ? 'size_code' then
    if length(btrim(coalesce(p ->> 'size_code', ''))) < 3 then raise exception 'size code is required (e.g. 7.50 X 16)'; end if;
    if exists (select 1 from public.tyre_sizes where size_code = btrim(p ->> 'size_code')) then
      raise exception 'tyre size % already exists', p ->> 'size_code'; end if;
  end if;
  if p ? 'rim_inches' and p ->> 'rim_inches' is not null and not ((p ->> 'rim_inches')::numeric between 10 and 30) then
    raise exception 'rim size must be between 10 and 30 inches'; end if;
end $$;

create function app.apply_tyre_size(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'tyre_size'); p jsonb := r.proposed_payload;
begin
  perform app.validate_tyre_size(p);
  if r.action = 'CREATE' then
    if not (p ? 'size_code') then raise exception 'a new tyre size needs size_code'; end if;
    insert into public.tyre_sizes (id, size_code, rim_inches, display_label)
    values (r.target_id, btrim(p ->> 'size_code'), (p ->> 'rim_inches')::numeric, coalesce(p ->> 'display_label', btrim(p ->> 'size_code')));
  else
    if not exists (select 1 from public.tyre_sizes where id = r.target_id) then raise exception 'tyre size not found'; end if;
    if p ? 'size_code' then raise exception 'a size code cannot be changed'; end if;
    update public.tyre_sizes set
      status        = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      rim_inches    = case when p ? 'rim_inches'    then (p ->> 'rim_inches')::numeric else rim_inches end,
      display_label = case when p ? 'display_label' then p ->> 'display_label' else display_label end,
      row_version   = row_version + 1
    where id = r.target_id;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- tyre make: name
-- ---------------------------------------------------------------------------------------------
create function app.validate_tyre_make(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform app.check_keys(p, array['name']);
  if p ? 'name' then
    if length(btrim(coalesce(p ->> 'name', ''))) < 2 then raise exception 'make name is required'; end if;
    if exists (select 1 from public.tyre_makes where lower(name) = lower(btrim(p ->> 'name'))) then
      raise exception 'make % already exists', p ->> 'name'; end if;
  end if;
end $$;

create function app.apply_tyre_make(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'tyre_make'); p jsonb := r.proposed_payload;
begin
  perform app.validate_tyre_make(p);
  if r.action = 'CREATE' then
    if not (p ? 'name') then raise exception 'a new make needs a name'; end if;
    insert into public.tyre_makes (id, name) values (r.target_id, btrim(p ->> 'name'));
  else
    if not exists (select 1 from public.tyre_makes where id = r.target_id) then raise exception 'make not found'; end if;
    update public.tyre_makes set
      status      = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      name        = case when p ? 'name' then btrim(p ->> 'name') else name end,
      row_version = row_version + 1
    where id = r.target_id;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- tyre model: make_name + model_name (create), model_name (rename)
-- ---------------------------------------------------------------------------------------------
create function app.validate_tyre_model(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_make uuid;
begin
  perform app.check_keys(p, array['make_name','model_name']);
  if p ? 'make_name' then   -- a make in the payload means a new model
    select id into v_make from public.tyre_makes where lower(name) = lower(btrim(coalesce(p ->> 'make_name', ''))) and status = 'ACTIVE';
    if v_make is null then raise exception 'unknown or inactive make "%"', p ->> 'make_name'; end if;
    if length(btrim(coalesce(p ->> 'model_name', ''))) = 0 then raise exception 'model name is required'; end if;
    if exists (select 1 from public.tyre_models where make_id = v_make and lower(model_name) = lower(btrim(p ->> 'model_name'))) then
      raise exception 'model % already exists for this make', p ->> 'model_name'; end if;
  elsif p ? 'model_name' and length(btrim(coalesce(p ->> 'model_name', ''))) = 0 then
    raise exception 'model name cannot be blank';
  end if;
end $$;

create function app.apply_tyre_model(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'tyre_model'); p jsonb := r.proposed_payload; v_make uuid;
begin
  perform app.validate_tyre_model(p);
  if r.action = 'CREATE' then
    select id into v_make from public.tyre_makes where lower(name) = lower(btrim(p ->> 'make_name'));
    if v_make is null or not (p ? 'model_name') then raise exception 'a new model needs make_name and model_name'; end if;
    insert into public.tyre_models (id, make_id, model_name) values (r.target_id, v_make, btrim(p ->> 'model_name'));
  else
    if not exists (select 1 from public.tyre_models where id = r.target_id) then raise exception 'model not found'; end if;
    if p ? 'make_name' then raise exception 'the make of a model cannot be changed'; end if;
    update public.tyre_models set
      status      = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      model_name  = case when p ? 'model_name' then btrim(p ->> 'model_name') else model_name end,
      row_version = row_version + 1
    where id = r.target_id;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- tyre folio
-- ---------------------------------------------------------------------------------------------
create function app.validate_tyre_folio(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_make uuid; l text;
begin
  perform app.check_keys(p, array['folio_no','folio_name','specification','make_name','model_name','construction_code','tube_code',
    'ply','size_code','product_group_code','category_code','uom_code','hsn_code','has_expiry','is_recondition','locations']);
  if p ? 'folio_no' then   -- a folio number in the payload means a new folio
    if coalesce(p ->> 'folio_no', '') !~ '^[A-Z0-9-]{3,20}$' then raise exception 'folio number must be 3-20 characters: A-Z, 0-9, hyphen'; end if;
    if exists (select 1 from public.tyre_folios where folio_no = p ->> 'folio_no') then raise exception 'folio % already exists', p ->> 'folio_no'; end if;
    if length(btrim(coalesce(p ->> 'folio_name', ''))) = 0 or coalesce(p ->> 'product_group_code', '') = '' or coalesce(p ->> 'uom_code', '') = '' then
      raise exception 'a new folio needs folio_name, product_group_code and uom_code'; end if;
  end if;
  if p ? 'folio_name' and length(btrim(coalesce(p ->> 'folio_name', ''))) = 0 then raise exception 'folio name cannot be blank'; end if;
  if p ? 'construction_code' and p ->> 'construction_code' is not null then perform app.ref_id('construction_type', p ->> 'construction_code', 'construction type'); end if;
  if p ? 'tube_code'         and p ->> 'tube_code' is not null         then perform app.ref_id('tube_type', p ->> 'tube_code', 'tube type'); end if;
  if p ? 'product_group_code' then perform app.ref_id('product_group', p ->> 'product_group_code', 'product group'); end if;
  if p ? 'category_code'     and p ->> 'category_code' is not null     then perform app.ref_id('folio_category', p ->> 'category_code', 'category'); end if;
  if p ? 'uom_code'          then perform app.ref_id('uom', p ->> 'uom_code', 'unit of measure'); end if;
  if p ? 'size_code' and p ->> 'size_code' is not null
     and not exists (select 1 from public.tyre_sizes where size_code = p ->> 'size_code' and status = 'ACTIVE') then
    raise exception 'unknown or inactive tyre size "%"', p ->> 'size_code'; end if;
  if p ? 'ply' and p ->> 'ply' is not null and not ((p ->> 'ply')::int between 1 and 40) then raise exception 'ply must be between 1 and 40'; end if;
  if p ? 'make_name' and p ->> 'make_name' is not null then
    select id into v_make from public.tyre_makes where lower(name) = lower(p ->> 'make_name') and status = 'ACTIVE';
    if v_make is null then raise exception 'unknown or inactive make "%"', p ->> 'make_name'; end if;
    if p ? 'model_name' and p ->> 'model_name' is not null
       and not exists (select 1 from public.tyre_models where make_id = v_make and lower(model_name) = lower(p ->> 'model_name') and status = 'ACTIVE') then
      raise exception 'model "%" does not exist for make "%"', p ->> 'model_name', p ->> 'make_name'; end if;
  elsif p ? 'model_name' and p ->> 'model_name' is not null and not (p ? 'make_name') then
    null;   -- on UPDATE the model is checked against the folio's existing make when applied
  end if;
  if p ? 'locations' then
    if jsonb_typeof(p -> 'locations') <> 'array' then raise exception 'locations must be a list'; end if;
    for l in select jsonb_array_elements_text(p -> 'locations') loop
      if l not in ('DEPOT', 'TRS', 'CENTRAL_STORE', 'MIC_VEHICLE_UNIT') then raise exception 'unknown location type "%"', l; end if;
    end loop;
  end if;
end $$;

create function app.apply_tyre_folio(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.master_change_requests := app.request_row(p_request, 'tyre_folio'); p jsonb := r.proposed_payload;
  f public.tyre_folios; v_make uuid; v_model uuid; v_size uuid; l text;
begin
  perform app.validate_tyre_folio(p);
  if p ? 'make_name' and p ->> 'make_name' is not null then
    select id into v_make from public.tyre_makes where lower(name) = lower(p ->> 'make_name'); end if;
  if p ? 'size_code' and p ->> 'size_code' is not null then
    select id into v_size from public.tyre_sizes where size_code = p ->> 'size_code'; end if;

  if r.action = 'CREATE' then
    if not (p ? 'folio_no') then raise exception 'a new folio needs folio_no'; end if;
    if p ->> 'model_name' is not null then
      select id into v_model from public.tyre_models where make_id = v_make and lower(model_name) = lower(p ->> 'model_name');
      if v_model is null then raise exception 'a model needs its make'; end if;
    end if;
    insert into public.tyre_folios (id, folio_no, folio_name, specification, make_id, model_id, construction_type_ref, tube_type_ref, ply,
        tyre_size_id, product_group_ref, category_ref, uom_ref, hsn_code, has_expiry, is_recondition)
    values (r.target_id, p ->> 'folio_no', btrim(p ->> 'folio_name'), p ->> 'specification', v_make, v_model,
        case when p ->> 'construction_code' is not null then app.ref_id('construction_type', p ->> 'construction_code', 'construction type') end,
        case when p ->> 'tube_code' is not null then app.ref_id('tube_type', p ->> 'tube_code', 'tube type') end,
        (p ->> 'ply')::smallint, v_size,
        app.ref_id('product_group', p ->> 'product_group_code', 'product group'),
        case when p ->> 'category_code' is not null then app.ref_id('folio_category', p ->> 'category_code', 'category') end,
        app.ref_id('uom', p ->> 'uom_code', 'unit of measure'),
        p ->> 'hsn_code', coalesce((p ->> 'has_expiry')::boolean, false), coalesce((p ->> 'is_recondition')::boolean, false));
  else
    select * into f from public.tyre_folios where id = r.target_id;
    if not found then raise exception 'folio not found'; end if;
    if p ? 'folio_no' then raise exception 'a folio number cannot be changed'; end if;
    if p ? 'make_name' then   -- make changes: the model must be restated and must belong to the new make
      if p ->> 'make_name' is null then v_model := null;
      else
        select id into v_model from public.tyre_models where make_id = v_make and lower(model_name) = lower(p ->> 'model_name');
        if p ->> 'model_name' is not null and v_model is null then raise exception 'model does not belong to the chosen make'; end if;
      end if;
    elsif p ? 'model_name' then
      select id into v_model from public.tyre_models where make_id = f.make_id and lower(model_name) = lower(p ->> 'model_name');
      if p ->> 'model_name' is not null and v_model is null then raise exception 'model does not belong to the folio''s make'; end if;
    end if;
    update public.tyre_folios set
      status                = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      folio_name            = case when p ? 'folio_name' then btrim(p ->> 'folio_name') else folio_name end,
      specification         = case when p ? 'specification' then p ->> 'specification' else specification end,
      make_id               = case when p ? 'make_name' then v_make else make_id end,
      model_id              = case when p ? 'make_name' or p ? 'model_name' then v_model else model_id end,
      construction_type_ref = case when p ? 'construction_code' then case when p ->> 'construction_code' is null then null else app.ref_id('construction_type', p ->> 'construction_code', 'construction type') end else construction_type_ref end,
      tube_type_ref         = case when p ? 'tube_code' then case when p ->> 'tube_code' is null then null else app.ref_id('tube_type', p ->> 'tube_code', 'tube type') end else tube_type_ref end,
      ply                   = case when p ? 'ply' then (p ->> 'ply')::smallint else ply end,
      tyre_size_id          = case when p ? 'size_code' then v_size else tyre_size_id end,
      product_group_ref     = case when p ? 'product_group_code' then app.ref_id('product_group', p ->> 'product_group_code', 'product group') else product_group_ref end,
      category_ref          = case when p ? 'category_code' then case when p ->> 'category_code' is null then null else app.ref_id('folio_category', p ->> 'category_code', 'category') end else category_ref end,
      uom_ref               = case when p ? 'uom_code' then app.ref_id('uom', p ->> 'uom_code', 'unit of measure') else uom_ref end,
      hsn_code              = case when p ? 'hsn_code' then p ->> 'hsn_code' else hsn_code end,
      has_expiry            = case when p ? 'has_expiry' then (p ->> 'has_expiry')::boolean else has_expiry end,
      is_recondition        = case when p ? 'is_recondition' then (p ->> 'is_recondition')::boolean else is_recondition end,
      row_version           = row_version + 1
    where id = r.target_id;
  end if;

  if p ? 'locations' then
    delete from public.tyre_folio_locations where folio_id = r.target_id;
    for l in select distinct jsonb_array_elements_text(p -> 'locations') loop
      insert into public.tyre_folio_locations (folio_id, location_type) values (r.target_id, l::public.org_unit_type);
    end loop;
  end if;
end $$;

revoke all on function app.check_keys(jsonb, text[]), app.ref_id(text, text, text), app.request_row(uuid, text),
  app.validate_tyre_size(jsonb), app.apply_tyre_size(uuid), app.validate_tyre_make(jsonb), app.apply_tyre_make(uuid),
  app.validate_tyre_model(jsonb), app.apply_tyre_model(uuid), app.validate_tyre_folio(jsonb), app.apply_tyre_folio(uuid)
  from public, anon, authenticated;

update public.master_entity_registry set is_enabled = true where entity_type in ('tyre_size', 'tyre_make', 'tyre_model', 'tyre_folio');

-- ---------------------------------------------------------------------------------------------
-- row-level security: every active user reads; nobody writes directly
-- ---------------------------------------------------------------------------------------------
alter table public.tyre_sizes           enable row level security; alter table public.tyre_sizes           force row level security;
alter table public.tyre_makes           enable row level security; alter table public.tyre_makes           force row level security;
alter table public.tyre_models          enable row level security; alter table public.tyre_models          force row level security;
alter table public.tyre_folios          enable row level security; alter table public.tyre_folios          force row level security;
alter table public.tyre_folio_locations enable row level security; alter table public.tyre_folio_locations force row level security;
grant select on public.tyre_sizes, public.tyre_makes, public.tyre_models, public.tyre_folios, public.tyre_folio_locations to authenticated;
create policy gate_active_user on public.tyre_sizes           as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.tyre_makes           as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.tyre_models          as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.tyre_folios          as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.tyre_folio_locations as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy read_all_active on public.tyre_sizes           for select to authenticated using (true);
create policy read_all_active on public.tyre_makes           for select to authenticated using (true);
create policy read_all_active on public.tyre_models          for select to authenticated using (true);
create policy read_all_active on public.tyre_folios          for select to authenticated using (true);
create policy read_all_active on public.tyre_folio_locations for select to authenticated using (true);
