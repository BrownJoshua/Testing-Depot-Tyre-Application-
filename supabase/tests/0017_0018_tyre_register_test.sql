-- Test for migrations 0017 / 0018 (Tyre Register, fleet attributes, D1 opening data).
-- Safe to run: everything happens inside a transaction that is rolled back.
-- Success = no error.  Failure = an error naming the broken expectation.

begin;

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 't9-ho@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c4', 'authenticated', 'authenticated', 't9-tic-tnr@test.invalid');
insert into public.employees (id, employee_code, full_name, role_code, org_unit_id) values
  ('00000000-0000-0000-0000-0000000000e1', 'T9-HO',  'T9 HO',  'HO',  null),
  ('00000000-0000-0000-0000-0000000000e4', 'T9-TIC', 'T9 TIC', 'TIC', (select id from public.org_units where code = 'TNR'));
insert into public.profiles (id, employee_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000e4');

do $$
declare n int; mn uuid; r record;
begin
  select id into mn from public.org_units where code = 'MN';

  -- folios, fleets, tyres
  select count(*) into n from public.tyre_folios where folio_no ~ '^F7[0-9]{3}$'; assert n >= 19, 'D1 folios missing';
  select count(*) into n from public.fleets where status = 'ACTIVE'; assert n = 300, 'expected the 300 fleets of the HO register';
  select count(*) into n from public.fleets where status = 'ACTIVE' and org_unit_id = mn; assert n = 70, 'expected 70 Mandaveli fleets';
  select count(*) into n from public.fleets where status = 'INACTIVE'; assert n = 34, 'the 34 old demonstration fleets should be inactive';
  select count(*) into n from public.tyres; assert n = 528, 'expected 528 tyres';
  select count(*) into n from public.tyres where owner_org_unit_id <> mn; assert n = 0, 'all opening tyres belong to Mandaveli';
  select count(*) into n from public.tyres where stock_place = 'FITTED'; assert n = 420, '420 fitted tyres';
  select count(*) into n from public.tyres where stock_place = 'LIVE_STOCK' and stock_category = 'GOOD'; assert n between 50 and 64, 'good live-stock tyres';
  select count(*) into n from public.tyres where stock_place = 'LIVE_STOCK' and stock_category = 'REPAIR'; assert n >= 26, 'repair tyres';
  select count(*) into n from public.tyres where stock_place = 'AT_TRS'; assert n = 12, '12 tyres at TRS';
  select count(*) into n from public.tyres where stock_place = 'AT_MIC'; assert n = 6, '6 tyres at MIC';

  -- every fitted tyre sits on a Mandaveli fleet, in a position of that fleet's layout, one tyre per position
  select count(*) into n from public.tyres t join public.fleets f on f.id = t.fleet_id where t.stock_place = 'FITTED' and f.org_unit_id <> mn; assert n = 0, 'a fitted tyre is on a fleet of another depot';
  select count(*) into n from public.tyres t join public.fleets f on f.id = t.fleet_id where not (t.fitted_position = any (f.position_layout)); assert n = 0, 'a tyre is fitted on a position the fleet does not have';
  select count(*) into n from public.fleets f where f.status = 'ACTIVE' and f.org_unit_id = mn and exists (select 1 from public.tyres t where t.fleet_id = f.id); assert n = 70, 'every Mandaveli fleet should carry tyres';
  begin insert into public.tyres (mtc_no, owner_org_unit_id, stock_place, fleet_id, fitted_position)
        select 'DUP-POS', mn, 'FITTED', fleet_id, fitted_position from public.tyres where stock_place = 'FITTED' limit 1; assert false, 'two tyres on one position';
  exception when unique_violation then null; end;
  begin insert into public.tyres (mtc_no, owner_org_unit_id, stock_place) values ('NO-FLEET', mn, 'FITTED'); assert false, 'fitted tyre without a fleet';
  exception when check_violation then null; end;

  -- dates the prototype shows for the rotation rules
  select count(*) into n from public.tyres where last_rotation_date is not null; assert n > 0, 'last rotation dates missing';
  select count(*) into n from public.fleets where air_type = 'NITROGEN'; assert n > 0, 'nitrogen fleets missing';
  select count(*) into n from public.fleets where status = 'ACTIVE' and fleet_type_id is null; assert n = 0, 'every fleet needs a fleet type';
  select count(*) into n from public.fleet_depot_history h join public.fleets f on f.id = h.fleet_id where f.status = 'ACTIVE'; assert n = 300, 'depot history for the new fleets';

  -- visibility: HO sees every tyre; a Tyre IC of another depot sees none of Mandaveli's
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true); execute 'set local role authenticated';
  select count(*) into n from public.tyres; assert n = 528, 'HO should see every tyre';
  begin update public.tyres set nsd_mm = 1; assert false, 'direct update allowed'; exception when insufficient_privilege then null; end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}', true); execute 'set local role authenticated';
  select count(*) into n from public.tyres; assert n = 0, 'a Tyre IC of T. Nagar sees tyres of Mandaveli';
  execute 'reset role';
end $$;

rollback;
