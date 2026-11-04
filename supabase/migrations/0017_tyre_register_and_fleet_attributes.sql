-- 0017: Tyre Register (one row per tyre) and the fleet attributes the D1 prototype shows (D1 realignment, step 1).
-- STATUS: proposed, NOT applied.
--
--  * A Job ID is one Job Code on ONE TYRE (D1 definition), so job cards need a tyre register first.
--  * public.tyres: the register. A tyre is in exactly one place (stock_place); a fitted tyre has a fleet and a position.
--    Rows are written only by database functions (later: Central Store receipt, MRN/GRN, fitment) - no direct write grants.
--    The opening data (0018) comes from the prototype's sample register and is flagged registration_source = OPENING_STOCK.
--  * Fleet attributes added: operating status, axle type, air type, live odometer, schedule km, current route.
--  * The old demonstration fleets of batches 6-8 (J0201.. etc.) are deactivated in 0018, not deleted (their depot history is append-only).
--  * Tube / flap / disc items and their orders come later (Tyre Changing step).

alter table public.fleets
  add column operating_status text not null default 'OPERATING' check (operating_status in ('OPERATING', 'SPARE')),
  add column axle_type        text,
  add column air_type         text not null default 'REGULAR' check (air_type in ('REGULAR', 'NITROGEN')),
  add column live_odometer_km numeric(10,1),
  add column schedule_km      numeric(8,1),
  add column current_route    text;

create table public.tyres (
  id                  uuid primary key default gen_random_uuid(),
  mtc_no              text not null unique check (length(btrim(mtc_no)) between 3 and 20),
  makers_no           text,
  folio_id            uuid references public.tyre_folios (id),      -- the prototype's sample has 12 tyres at TRS with no folio
  make_id             uuid references public.tyre_makes (id),
  model_id            uuid references public.tyre_models (id),
  grade               text check (grade is null or grade in ('NEW', 'A', 'B', 'C')),
  tyre_condition      text,                                   -- New, RT1 .. RT5 (retread level) as the prototype shows it
  recommended_position text,
  owner_org_unit_id   uuid not null references public.org_units (id),
  stock_place         text not null check (stock_place in ('FITTED', 'LIVE_STOCK', 'AT_TRS', 'AT_MIC', 'AT_OTHER_DEPOT', 'CENTRAL_STORE', 'IN_TRANSIT', 'SCRAPPED')),
  stock_category      text check (stock_category is null or stock_category in ('GOOD', 'REPAIR')),   -- for LIVE_STOCK
  setting_status      text check (setting_status is null or setting_status in ('SET', 'UNSET')),
  transit_status      text check (transit_status is null or transit_status in ('READY_FOR_TRANSIT', 'IN_TRANSIT')),
  fleet_id            uuid references public.fleets (id),
  fitted_position     text check (fitted_position is null or fitted_position ~ '^[A-Z]{2,4}[0-9]?$'),
  fitted_date         date,
  received_date       date,
  purchase_date       date,
  manufactured_date   date,
  warranty_upto       date,
  last_rotation_date  date,
  last_discout_date   date,
  nsd_mm              numeric(4,1),
  groove_count        smallint,
  fitment_km          numeric(10,1),
  running_km          numeric(10,1),
  total_km            numeric(10,1),
  expected_life_km    numeric(10,1),
  removal_date        date,
  removal_reason      text,
  registration_source text not null default 'OPENING_STOCK' check (registration_source in ('GRN', 'OPENING_STOCK', 'CORRECTION')),
  status              public.master_status not null default 'ACTIVE',
  row_version         int not null default 1,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint tyres_fitted_needs_fleet check ((stock_place = 'FITTED') = (fleet_id is not null and fitted_position is not null)),
  constraint tyres_live_stock_needs_category check (stock_place <> 'LIVE_STOCK' or stock_category is not null)
);
create unique index tyres_one_per_position on public.tyres (fleet_id, fitted_position) where fleet_id is not null;
create index tyres_owner_place_idx on public.tyres (owner_org_unit_id, stock_place);
create index tyres_folio_idx on public.tyres (folio_id);
create index tyres_fleet_idx on public.tyres (fleet_id) where fleet_id is not null;
create trigger tyres_touch before update on public.tyres for each row execute function app.set_updated_at();
create trigger audit_tyres after insert or update or delete on public.tyres for each row execute function app.audit_row();

alter table public.tyres enable row level security; alter table public.tyres force row level security;
grant select on public.tyres to authenticated;
create policy gate_active_user on public.tyres as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
-- HO / AM read every depot's tyres; depot staff read their own depot's (a Tyre Man reads the depot register too, as in the prototype)
create policy read_depot on public.tyres for select to authenticated using (owner_org_unit_id in (select app.my_visible_depot_ids()));
