-- 0004: organisational units, the depot subtype, and the 33 depots + 4 other units.
-- STATUS: proposed in Stage 3 batch 2, NOT applied. Review and approve before running.
--
-- ALL DEPOT CODES BELOW ARE MOCK CODES (stage2-depot-master.md). They are demonstration values,
-- configurable later through the master workflow, and are NOT official MTC codes.
-- TRS Chrompet, TRS Tondiarpet, Central Store and MIC Vehicle Unit are separate organisational
-- units, NOT depots.

create table public.org_units (
  id              uuid primary key default gen_random_uuid(),
  code            text not null,
  name            text not null,
  unit_type       public.org_unit_type not null,
  short_name      text,
  address_text    text,
  sort_order      int  not null default 0,
  status          public.master_status not null default 'ACTIVE',
  row_version     int  not null default 1,
  deactivated_at  timestamptz,
  deactivated_by  uuid,                       -- foreign key added in 0005 once profiles exist
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid,                       -- foreign key added in 0005
  updated_by      uuid,                       -- foreign key added in 0005
  constraint org_units_code_format check (code ~ '^[A-Z0-9-]{2,8}$'),
  constraint org_units_code_uk unique (code),
  constraint org_units_name_uk unique (name),
  constraint org_units_id_type_uk unique (id, unit_type)
);
create trigger org_units_touch before update on public.org_units
  for each row execute function app.set_updated_at();

-- Depot subtype: a depot row can exist only for an org unit whose type is DEPOT (composite FK).
-- Every depot-owned table later references depots(org_unit_id), so a TRS unit, Central Store
-- or MIC unit can never be used as a depot.
create table public.depots (
  org_unit_id      uuid primary key,
  unit_type        public.org_unit_type not null default 'DEPOT',
  is_mock_code     boolean not null default true,
  hub_org_unit_id  uuid references public.depots (org_unit_id),   -- optional depot hub (UQ-46)
  constraint depots_type_is_depot check (unit_type = 'DEPOT'),
  constraint depots_org_unit_fk foreign key (org_unit_id, unit_type)
    references public.org_units (id, unit_type)
);

-- the 33 depots (names exactly as supplied; codes are MOCK)
insert into public.org_units (code, name, unit_type, sort_order) values
  ('AD',  'Adyar',            'DEPOT',  1),
  ('TV',  'Thiruvanmiyur',    'DEPOT',  2),
  ('MN',  'Mandaveli',        'DEPOT',  3),
  ('KN',  'Kannagi Nagar',    'DEPOT',  4),
  ('PB',  'Perumbakkam',      'DEPOT',  5),
  ('SM',  'Semmencheri',      'DEPOT',  6),
  ('TNR', 'T. Nagar',         'DEPOT',  7),
  ('SD',  'Saidapet',         'DEPOT',  8),
  ('KK',  'K.K. Nagar',       'DEPOT',  9),
  ('ADK', 'Adambakkam',       'DEPOT', 10),
  ('CH',  'Chrompet',         'DEPOT', 11),
  ('TB',  'Tambaram',         'DEPOT', 12),
  ('CH2', 'Chrompet-II',      'DEPOT', 13),
  ('KB',  'Kilambakkam',      'DEPOT', 14),
  ('KD',  'Kundrathur',       'DEPOT', 15),
  ('IY',  'Iyyappanthangal',  'DEPOT', 16),
  ('VP',  'Vadapalani',       'DEPOT', 17),
  ('PM',  'Poonamallee',      'DEPOT', 18),
  ('KY',  'Koyambedu',        'DEPOT', 19),
  ('CD',  'Central Depot',    'DEPOT', 20),
  ('AY',  'Ayanavaram',       'DEPOT', 21),
  ('PR',  'Perambur',         'DEPOT', 22),
  ('BB',  'Basin Bridge',     'DEPOT', 23),
  ('ANE', 'Anna Nagar East',  'DEPOT', 24),
  ('AN',  'Anna Nagar',       'DEPOT', 25),
  ('AT',  'Ambattur',         'DEPOT', 26),
  ('AV',  'Avadi',            'DEPOT', 27),
  ('VY',  'Vyasarpadi',       'DEPOT', 28),
  ('TD1', 'Tondiarpet-1',     'DEPOT', 29),
  ('TD2', 'Tondiarpet-II',    'DEPOT', 30),
  ('EN',  'Ennore',           'DEPOT', 31),
  ('MD',  'Madhavaram',       'DEPOT', 32),
  ('PD',  'Padiyanallur',     'DEPOT', 33);

-- separate organisational units (not depots)
insert into public.org_units (code, name, unit_type, sort_order) values
  ('TRS-CH', 'TRS Chrompet',     'TRS',              101),
  ('TRS-TD', 'TRS Tondiarpet',   'TRS',              102),
  ('CS',     'Central Store',    'CENTRAL_STORE',    103),
  ('MIC',    'MIC Vehicle Unit', 'MIC_VEHICLE_UNIT', 104);

insert into public.depots (org_unit_id)
select id from public.org_units where unit_type = 'DEPOT';

-- convenience view; created with security_invoker so the caller's RLS applies (finding S-01)
create view public.v_depots with (security_invoker = true) as
select o.id, o.code, o.name, d.is_mock_code, d.hub_org_unit_id, o.status, o.sort_order
from public.org_units o
join public.depots d on d.org_unit_id = o.id;
