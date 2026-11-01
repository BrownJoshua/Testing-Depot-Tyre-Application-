-- 0011: Vendor Master (first entity on the HO -> AM approval engine) and the reference-value list it needs.
-- STATUS: proposed in Stage 4 batch 1, NOT applied. Review and approve before running.
--
--  * ref_values: small controlled lists. Only the vendor_category list is seeded here.
--    The 'ref_value' master type stays DISABLED (its apply function comes later).
--  * vendors / vendor_contacts: written ONLY by app.apply_vendor, which runs when an AM approves a request.
--    Nobody has insert/update/delete rights; a pending request never touches live data.
--  * Payload keys (all optional on UPDATE; vendor_code, vendor_name, category_code required on CREATE):
--      vendor_code, vendor_name, category_code, contact_person, address_text, city, state, pincode,
--      phone_demo, email_demo, gstin, contacts[ {contact_name, designation, phone_demo, email_demo, is_primary} ]
--    DEACTIVATE / REACTIVATE need no payload keys (send {}).
--  * The vendor code FORMAT is not defined in the prototype. Here it is only "3-20 characters: A-Z, 0-9, hyphen".
--    This is a placeholder rule, not a business rule (to be confirmed).
--  * All seeded vendors are FICTIONAL demonstration records (is_demo = true).

-- ---------------------------------------------------------------------------------------------
-- reference values
-- ---------------------------------------------------------------------------------------------
create table public.ref_values (
  id         uuid primary key default gen_random_uuid(),
  list_code  text not null check (list_code ~ '^[a-z][a-z0-9_]*$'),
  code       text not null check (code ~ '^[A-Z][A-Z0-9_]*$'),
  label      text not null check (length(btrim(label)) > 0),
  sort_order int  not null default 0,
  status     public.master_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (list_code, code)
);
create trigger ref_values_touch before update on public.ref_values for each row execute function app.set_updated_at();
create trigger audit_ref_values after insert or update or delete on public.ref_values for each row execute function app.audit_row();

insert into public.ref_values (list_code, code, label, sort_order) values
  ('vendor_category', 'TYRE_SUPPLIER',           'Tyre supplier',                 1),
  ('vendor_category', 'TUBE_FLAP_DISC_SUPPLIER', 'Tube / flap / disc supplier',   2),
  ('vendor_category', 'RETREADER',               'Retreader',                     3),
  ('vendor_category', 'MANPOWER_CONTRACTOR',     'Manpower contractor',           4),
  ('vendor_category', 'SERVICE_PROVIDER',        'Service provider',              5);

-- ---------------------------------------------------------------------------------------------
-- vendors
-- ---------------------------------------------------------------------------------------------
create table public.vendors (
  id                  uuid primary key default gen_random_uuid(),
  vendor_code         text not null unique check (vendor_code ~ '^[A-Z0-9-]{3,20}$'),
  vendor_name         text not null check (length(btrim(vendor_name)) > 0),
  vendor_category_ref uuid not null references public.ref_values (id),
  contact_person      text,
  address_text        text,
  city                text,
  state               text,
  pincode             text check (pincode is null or pincode ~ '^[0-9]{6}$'),
  phone_demo          text,
  email_demo          text,
  gstin               text check (gstin is null or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  is_demo             boolean not null default true,
  status              public.master_status not null default 'ACTIVE',
  row_version         int not null default 1,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index vendors_category_status_idx on public.vendors (vendor_category_ref, status);
create index vendors_name_trgm_idx on public.vendors using gin (vendor_name extensions.gin_trgm_ops);
create trigger vendors_touch before update on public.vendors for each row execute function app.set_updated_at();
create trigger audit_vendors after insert or update or delete on public.vendors for each row execute function app.audit_row();

create table public.vendor_contacts (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references public.vendors (id),
  contact_name text not null check (length(btrim(contact_name)) > 0),
  designation  text,
  phone_demo   text,
  email_demo   text,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index vendor_contacts_vendor_idx on public.vendor_contacts (vendor_id);
create unique index vendor_contacts_one_primary on public.vendor_contacts (vendor_id) where is_primary;
create trigger audit_vendor_contacts after insert or update or delete on public.vendor_contacts for each row execute function app.audit_row();

-- ---------------------------------------------------------------------------------------------
-- validation (runs when HO submits) and apply (runs when AM approves)
-- ---------------------------------------------------------------------------------------------
create function app.validate_vendor(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare k text; c jsonb; v_primaries int := 0;
begin
  for k in select jsonb_object_keys(p) loop
    if k not in ('vendor_code','vendor_name','category_code','contact_person','address_text','city','state','pincode',
                 'phone_demo','email_demo','gstin','contacts') then
      raise exception 'unknown vendor field "%"', k;
    end if;
  end loop;
  if p ? 'vendor_code' then   -- a code in the payload means a new vendor
    if coalesce(p ->> 'vendor_code', '') !~ '^[A-Z0-9-]{3,20}$' then
      raise exception 'vendor code must be 3-20 characters: A-Z, 0-9, hyphen'; end if;
    if exists (select 1 from public.vendors where vendor_code = p ->> 'vendor_code') then
      raise exception 'vendor code % already exists', p ->> 'vendor_code'; end if;
    if length(btrim(coalesce(p ->> 'vendor_name', ''))) = 0 or coalesce(p ->> 'category_code', '') = '' then
      raise exception 'a new vendor needs vendor_name and category_code'; end if;
  end if;
  if p ? 'vendor_name' and length(btrim(coalesce(p ->> 'vendor_name', ''))) = 0 then
    raise exception 'vendor name cannot be blank'; end if;
  if p ? 'category_code' and not exists (
       select 1 from public.ref_values where list_code = 'vendor_category' and code = p ->> 'category_code' and status = 'ACTIVE') then
    raise exception 'unknown vendor category "%"', p ->> 'category_code'; end if;
  if p ? 'pincode' and p ->> 'pincode' is not null and p ->> 'pincode' !~ '^[0-9]{6}$' then
    raise exception 'pincode must be 6 digits'; end if;
  if p ? 'gstin' and p ->> 'gstin' is not null
     and p ->> 'gstin' !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' then
    raise exception 'GSTIN must be 15 characters in the standard shape'; end if;
  if p ? 'contacts' then
    if jsonb_typeof(p -> 'contacts') <> 'array' then raise exception 'contacts must be a list'; end if;
    for c in select * from jsonb_array_elements(p -> 'contacts') loop
      if length(btrim(coalesce(c ->> 'contact_name', ''))) = 0 then raise exception 'every contact needs a name'; end if;
      if coalesce((c ->> 'is_primary')::boolean, false) then v_primaries := v_primaries + 1; end if;
    end loop;
    if v_primaries > 1 then raise exception 'only one contact can be primary'; end if;
  end if;
end $$;

create function app.apply_vendor(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests; p jsonb; v_cat uuid; c jsonb;
begin
  select * into r from public.master_change_requests where id = p_request;
  if not found or r.entity_type <> 'vendor' then raise exception 'not a vendor request'; end if;
  p := r.proposed_payload;
  perform app.validate_vendor(p);   -- re-check at approval time (the data may have changed since submit)
  if p ? 'category_code' then
    select id into v_cat from public.ref_values where list_code = 'vendor_category' and code = p ->> 'category_code'; end if;

  if r.action = 'CREATE' then
    if coalesce(p ->> 'vendor_code', '') = '' or coalesce(p ->> 'vendor_name', '') = '' or v_cat is null then
      raise exception 'a new vendor needs vendor_code, vendor_name and category_code'; end if;
    insert into public.vendors (id, vendor_code, vendor_name, vendor_category_ref, contact_person, address_text, city, state,
                                pincode, phone_demo, email_demo, gstin)
    values (r.target_id, p ->> 'vendor_code', btrim(p ->> 'vendor_name'), v_cat, p ->> 'contact_person', p ->> 'address_text',
            p ->> 'city', p ->> 'state', p ->> 'pincode', p ->> 'phone_demo', p ->> 'email_demo', p ->> 'gstin');
  else
    if not exists (select 1 from public.vendors where id = r.target_id) then raise exception 'vendor not found'; end if;
    if p ? 'vendor_code' then raise exception 'a vendor code cannot be changed'; end if;
    if r.action = 'DEACTIVATE' then
      update public.vendors set status = 'INACTIVE', row_version = row_version + 1 where id = r.target_id;
    elsif r.action = 'REACTIVATE' then
      update public.vendors set status = 'ACTIVE', row_version = row_version + 1 where id = r.target_id;
    else
      update public.vendors set
        vendor_name         = case when p ? 'vendor_name'    then btrim(p ->> 'vendor_name') else vendor_name end,
        vendor_category_ref = coalesce(v_cat, vendor_category_ref),
        contact_person      = case when p ? 'contact_person' then p ->> 'contact_person' else contact_person end,
        address_text        = case when p ? 'address_text'   then p ->> 'address_text'   else address_text end,
        city                = case when p ? 'city'           then p ->> 'city'           else city end,
        state               = case when p ? 'state'          then p ->> 'state'          else state end,
        pincode             = case when p ? 'pincode'        then p ->> 'pincode'        else pincode end,
        phone_demo          = case when p ? 'phone_demo'     then p ->> 'phone_demo'     else phone_demo end,
        email_demo          = case when p ? 'email_demo'     then p ->> 'email_demo'     else email_demo end,
        gstin               = case when p ? 'gstin'          then p ->> 'gstin'          else gstin end,
        row_version         = row_version + 1
      where id = r.target_id;
    end if;
  end if;

  if p ? 'contacts' then   -- the submitted list replaces the contact list
    delete from public.vendor_contacts where vendor_id = r.target_id;
    for c in select * from jsonb_array_elements(p -> 'contacts') loop
      insert into public.vendor_contacts (vendor_id, contact_name, designation, phone_demo, email_demo, is_primary)
      values (r.target_id, btrim(c ->> 'contact_name'), c ->> 'designation', c ->> 'phone_demo', c ->> 'email_demo',
              coalesce((c ->> 'is_primary')::boolean, false));
    end loop;
  end if;
end $$;
revoke all on function app.validate_vendor(jsonb), app.apply_vendor(uuid) from public, anon, authenticated;

update public.master_entity_registry set is_enabled = true where entity_type = 'vendor';

-- ---------------------------------------------------------------------------------------------
-- row-level security: every active user can read; nobody writes directly
-- ---------------------------------------------------------------------------------------------
alter table public.ref_values       enable row level security; alter table public.ref_values       force row level security;
alter table public.vendors          enable row level security; alter table public.vendors          force row level security;
alter table public.vendor_contacts  enable row level security; alter table public.vendor_contacts  force row level security;
grant select on public.ref_values, public.vendors, public.vendor_contacts to authenticated;
create policy gate_active_user on public.ref_values      as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.vendors         as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy gate_active_user on public.vendor_contacts as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy read_all_active on public.ref_values      for select to authenticated using (true);
create policy read_all_active on public.vendors         for select to authenticated using (true);
create policy read_ho_am      on public.vendor_contacts for select to authenticated using (app.my_role() in ('HO', 'AM'));

-- ---------------------------------------------------------------------------------------------
-- fictional demonstration vendors (seed data, is_demo = true; not real companies)
-- ---------------------------------------------------------------------------------------------
insert into public.vendors (vendor_code, vendor_name, vendor_category_ref, contact_person, city, state, pincode, gstin)
select v.code, v.name, r.id, v.person, v.city, 'Tamil Nadu', v.pin, v.gstin
from (values
  ('DEMO-V001', 'Kaveri Tyre Distributors (Demo)',   'TYRE_SUPPLIER',           'Demo Contact A', 'Chennai',    '600001', '33ABCDE1234F1Z5'),
  ('DEMO-V002', 'Marina Tube and Flap Works (Demo)', 'TUBE_FLAP_DISC_SUPPLIER', 'Demo Contact B', 'Chennai',    '600002', '33FGHIJ5678K1Z2'),
  ('DEMO-V003', 'Velan Retread Services (Demo)',     'RETREADER',               'Demo Contact C', 'Coimbatore', '641001', '33KLMNO9012P1Z8'),
  ('DEMO-V004', 'Anbu Manpower Contractors (Demo)',  'MANPOWER_CONTRACTOR',     'Demo Contact D', 'Madurai',    '625001', '33QRSTU3456V1Z4'),
  ('DEMO-V005', 'Thenral Fleet Services (Demo)',     'SERVICE_PROVIDER',        'Demo Contact E', 'Salem',      '636001', '33WXYZA7890B1Z1')
) as v(code, name, cat, person, city, pin, gstin)
join public.ref_values r on r.list_code = 'vendor_category' and r.code = v.cat;
