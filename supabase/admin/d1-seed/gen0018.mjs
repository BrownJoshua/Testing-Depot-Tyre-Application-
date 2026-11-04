// Generates supabase/migrations/0018_d1_opening_data.sql from the D1 prototype's sample data (folios, 300 fleets, Mandaveli tyres).
import { writeFileSync } from 'node:fs';
import { tables, dash, num, date } from './d1data.mjs';

const OUT = 'C:/Users/USER/Desktop/Test DTyre App/supabase/migrations/0018_d1_opening_data.sql';
const q = (v) => (v === null || v === undefined ? "''" : `'${String(v).replace(/'/g, "''")}'`);
const warn = [];

// ---------------- folios (Live Tyre Stock summary: F7001..F7026) ----------------
const folioRows = tables('tic/tyre.html')[0].rows.filter((r) => /^F\d{4}$/.test(r['Folio ID']));
const folios = folioRows.map((r) => {
  const p = r['Specification'].split(' · ');
  return { no: r['Folio ID'], name: r['Folio Name'], spec: r['Specification'], size: p[0], tube: p[1]?.toUpperCase() === 'TUBELESS' ? 'TUBELESS' : 'TUBE',
    cons: /radial/i.test(p[2] ?? '') ? 'RADIAL' : 'NYLON', ply: Number((p[3] ?? '').replace(/\D/g, '')) || null };
});

// ---------------- fleets (HO Fleet Register, all 300) ----------------
const ho = tables('ho/fleet-master.html')[0].rows;
const MT = { BSIV: 'BSIV', 'BS-III': 'BSIII', 'Low Floor': 'LOW_FLOOR', AC: 'AC', Deluxe: 'DELUXE' };
const fleets = ho.map((r) => ({
  no: r['Fleet No'], reg: r['Registration Number'], chassis: dash(r['Chassis No.']), purchase: date(r['Date of Purchase']),
  depot: r['Depot'].toLowerCase().replace(/[^a-z0-9]/g, ''), make: r['Model'], mtype: MT[r['Model Type']] ?? null, ftype: r['Fleet Type'],
  op: /spare/i.test(r['Status']) ? 'SPARE' : 'OPERATING', axle: dash(r['Axle Type']), air: /nitro/i.test(r['Air Type']) ? 'NITROGEN' : 'REGULAR',
  oem: dash(r['OEM Recommended Tyre Size']), odo: num(r['Live Odometer']), route: dash(r['Current Route']), skm: num(r['Schedule KM']),
}));
const ftypes = [...new Map(fleets.map((f) => [`${f.make}|${f.ftype}`, { make: f.make, model: f.ftype }])).values()];
const ftSizes = [...new Set(fleets.filter((f) => f.oem).map((f) => `${f.make}|${f.ftype}|${f.oem}`))].map((k) => k.split('|'));

// ---------------- tyres (register + live stock good + repair) ----------------
const reg = tables('tic/tyre-register.html')[1].rows;
const live = tables('tic/tyre.html');
const good = live[1].rows;
const rep = live[6].rows;
const GR = { New: 'NEW', A: 'A', B: 'B', C: 'C' };
const seen = new Set();
const tyres = [];
function add(r, place, extra) {
  const mtc = r['MTC No'];
  if (!mtc || seen.has(mtc)) { warn.push(`skipped duplicate/blank MTC ${mtc}`); return; }
  seen.add(mtc);
  tyres.push({
    mtc, makers: dash(r['Makers No']), folio: dash(r['Folio ID']), make: dash(r['Make']), model: dash(r['Makers model']), grade: GR[r['Grade']] ?? null,
    cond: dash(r['Tyre Condition']), rec: dash(r['Recommended Position']), place, ...extra,
    fleet: dash(r['Current fleet']), fpos: dash(r['Fitted Position']), fitted: date(r['Fitted date']), received: date(r['Received date']),
    purchase: date(r['Purchase date']), manuf: date(r['Manufactured Date']), warranty: date(r['Warranty Upto']), lastRot: date(r['Last Rotation date']),
    lastDo: date(r['Last Discout date']), nsd: num(r['NSD']), grooves: num(r['No of Groove']), fitKm: num(r['Fitment KM']), runKm: num(r['Running KM']),
    totKm: num(r['Total KM']), life: num(r['Expected Life KM']), remDate: date(r['Removal date']), remReason: dash(r['Removal reason']),
  });
}
for (const r of reg) {
  const st = r['Status'];
  if (st === 'Fitted') add(r, 'FITTED', {});
  else if (st === 'At MIC') add(r, 'AT_MIC', { fleet: null, fpos: null });
  else if (st === 'At TRS') add(r, 'AT_TRS', { fleet: null, fpos: null });
  else warn.push(`register status ${st}`);
}
for (const r of good) add(r, 'LIVE_STOCK', { cat: 'GOOD', setting: /unset/i.test(r['Setting Status']) ? 'UNSET' : 'SET' });
for (const r of rep) add(r, 'LIVE_STOCK', { cat: 'REPAIR', setting: /unset/i.test(r['Setting Status']) ? 'UNSET' : 'SET', transit: /in transit/i.test(r['Status']) ? 'IN_TRANSIT' : 'READY_FOR_TRANSIT' });
// a tyre is fitted only with a fleet AND a position; drop the fleet columns of everything else
for (const t of tyres) {
  if (t.place !== 'FITTED') { t.fleet = null; t.fpos = null; t.fitted = null; }
  else if (!t.fleet || !t.fpos) { warn.push(`fitted tyre ${t.mtc} without fleet/position -> live stock good`); t.place = 'LIVE_STOCK'; t.cat = 'GOOD'; t.setting = 'SET'; t.fleet = null; t.fpos = null; }
}
const folioSet = new Set(folios.map((f) => f.no));
const missing = [...new Set(tyres.map((t) => t.folio).filter((f) => f && !folioSet.has(f)))];
if (missing.length) warn.push(`folios used by tyres but not in the folio list: ${missing.join(', ')}`);
const fleetSet = new Set(fleets.map((f) => f.no));
const noFleet = tyres.filter((t) => t.fleet && !fleetSet.has(t.fleet)).map((t) => t.fleet);
if (noFleet.length) warn.push(`fleets of tyres not in the HO register: ${[...new Set(noFleet)].join(', ')}`);
const pairs = [...new Map(tyres.filter((t) => t.make && t.model).map((t) => [`${t.make.toLowerCase()}|${t.model.toLowerCase()}`, { make: t.make, model: t.model }])).values()];
const makes = [...new Map(tyres.filter((t) => t.make).map((t) => [t.make.toLowerCase(), t.make])).values()];

// ---------------- SQL ----------------
let s = `-- 0018: D1 opening data - folios, 300 fleets and the Mandaveli tyre register, taken from the prototype's sample data.
-- GENERATED from "MTC-Depot-Tyre D1.html" (Live Tyre Stock, Tyre Register, HO Fleet Register). All values are the prototype's SAMPLE data.
--  * ${folios.length} tyre folios (F7001..), ${fleets.length} fleets, ${tyres.length} tyres owned by Mandaveli (fitted / live stock good / repair / at TRS / at MIC).
--  * Fleet Type = the prototype's Small / Standard / Low Floor; stored as the fleet type model, with the HO register "Model" (Ashok Leyland / Tata) as make.
--    Allowed tyre sizes per fleet type are derived from the OEM sizes of its fleets (sample).
--  * The demonstration fleets of batches 6-8 are deactivated (not deleted).
${warn.length ? '-- Notes while generating:\n' + warn.slice(0, 15).map((w) => `--   ${w}`).join('\n') + '\n' : ''}
update public.fleets set status = 'INACTIVE' where is_demo;

-- tyre folios
insert into public.tyre_folios (folio_no, folio_name, specification, construction_type_ref, tube_type_ref, ply, tyre_size_id, product_group_ref, uom_ref)
select v.no, v.name, v.spec, app.ref_id('construction_type', v.cons, 'construction'), app.ref_id('tube_type', v.tube, 'tube'),
       nullif(v.ply, '')::smallint, (select id from public.tyre_sizes where size_code = v.size), app.ref_id('product_group', 'TYRE', 'group'), app.ref_id('uom', 'NOS', 'uom')
from (values
${folios.map((f) => `  (${q(f.no)}, ${q(f.name)}, ${q(f.spec)}, ${q(f.cons)}, ${q(f.tube)}, ${q(f.ply)}, ${q(f.size)})`).join(',\n')}
) as v(no, name, spec, cons, tube, ply, size)
where not exists (select 1 from public.tyre_folios x where x.folio_no = v.no);

-- makes and models used by the tyres
insert into public.tyre_makes (name)
select m from (values ${makes.map((m) => `(${q(m)})`).join(', ')}) as v(m) where not exists (select 1 from public.tyre_makes x where lower(x.name) = lower(v.m));
insert into public.tyre_models (make_id, model_name)
select (select id from public.tyre_makes where lower(name) = lower(v.make)), v.model
from (values
${pairs.map((p) => `  (${q(p.make)}, ${q(p.model)})`).join(',\n')}
) as v(make, model)
where not exists (select 1 from public.tyre_models x where x.make_id = (select id from public.tyre_makes where lower(name) = lower(v.make)) and lower(x.model_name) = lower(v.model));

-- fleet types (Small / Standard / Low Floor x make) and their allowed sizes
insert into public.fleet_types (fleet_make, fleet_model)
select v.make, v.model from (values ${ftypes.map((t) => `(${q(t.make)}, ${q(t.model)})`).join(', ')}) as v(make, model)
where not exists (select 1 from public.fleet_types x where lower(x.fleet_make) = lower(v.make) and lower(x.fleet_model) = lower(v.model));
insert into public.fleet_type_tyre_sizes (fleet_type_id, tyre_size_id)
select t.id, s.id from (values ${ftSizes.map((x) => `(${q(x[0])}, ${q(x[1])}, ${q(x[2])})`).join(', ')}) as v(make, model, size)
join public.fleet_types t on lower(t.fleet_make) = lower(v.make) and lower(t.fleet_model) = lower(v.model)
join public.tyre_sizes s on s.size_code = v.size
on conflict do nothing;

-- fleets
insert into public.fleets (fleet_no, registration_no, chassis_no, purchase_date, org_unit_id, fleet_type_id, bus_model_type_ref, oem_tyre_size_id,
                           operating_status, axle_type, air_type, live_odometer_km, schedule_km, current_route, is_demo)
select v.no, v.reg, nullif(v.chassis, ''), nullif(v.purchase, '')::date,
       (select o.id from public.org_units o where o.unit_type = 'DEPOT' and lower(regexp_replace(o.name, '[^A-Za-z0-9]', '', 'g')) = v.depot),
       (select t.id from public.fleet_types t where lower(t.fleet_make) = lower(v.make) and lower(t.fleet_model) = lower(v.ftype)),
       (select r.id from public.ref_values r where r.list_code = 'bus_model_type' and r.code = nullif(v.mtype, '')),
       (select s.id from public.tyre_sizes s where s.size_code = nullif(v.oem, '')),
       v.op, nullif(v.axle, ''), v.air, nullif(v.odo, '')::numeric, nullif(v.skm, '')::numeric, nullif(v.route, ''), true
from (values
${fleets.map((f) => `  (${q(f.no)}, ${q(f.reg)}, ${q(f.chassis)}, ${q(f.purchase)}, ${q(f.depot)}, ${q(f.make)}, ${q(f.ftype)}, ${q(f.mtype)}, ${q(f.oem)}, ${q(f.op)}, ${q(f.axle)}, ${q(f.air)}, ${q(f.odo)}, ${q(f.skm)}, ${q(f.route)})`).join(',\n')}
) as v(no, reg, chassis, purchase, depot, make, ftype, mtype, oem, op, axle, air, odo, skm, route)
where not exists (select 1 from public.fleets x where x.fleet_no = v.no);
insert into public.fleet_depot_history (fleet_id, to_org_unit_id, effective_from)
select f.id, f.org_unit_id, coalesce(f.purchase_date, date '2020-01-01') from public.fleets f
where f.is_demo and f.status = 'ACTIVE' and not exists (select 1 from public.fleet_depot_history h where h.fleet_id = f.id);

-- tyres (owned by Mandaveli)
insert into public.tyres (mtc_no, makers_no, folio_id, make_id, model_id, grade, tyre_condition, recommended_position, owner_org_unit_id, stock_place, stock_category,
    setting_status, transit_status, fleet_id, fitted_position, fitted_date, received_date, purchase_date, manufactured_date, warranty_upto, last_rotation_date,
    last_discout_date, nsd_mm, groove_count, fitment_km, running_km, total_km, expected_life_km, removal_date, removal_reason)
select v.mtc, nullif(v.makers, ''), f.id, mk.id, md.id, nullif(v.grade, ''), nullif(v.cond, ''), nullif(v.rec, ''),
       (select id from public.org_units where code = 'MN'), v.place, nullif(v.cat, ''), nullif(v.setting, ''), nullif(v.transit, ''), fl.id, nullif(v.fpos, ''),
       nullif(v.fitted, '')::date, nullif(v.received, '')::date, nullif(v.purchase, '')::date, nullif(v.manuf, '')::date, nullif(v.warranty, '')::date,
       nullif(v.lastrot, '')::date, nullif(v.lastdo, '')::date, nullif(v.nsd, '')::numeric, nullif(v.grooves, '')::smallint, nullif(v.fitkm, '')::numeric,
       nullif(v.runkm, '')::numeric, nullif(v.totkm, '')::numeric, nullif(v.life, '')::numeric, nullif(v.remdate, '')::date, nullif(v.remreason, '')
from (values
${tyres.map((t) => `  (${[t.mtc, t.makers, t.folio, t.make, t.model, t.grade, t.cond, t.rec, t.place, t.cat, t.setting, t.transit, t.fleet, t.fpos, t.fitted, t.received, t.purchase, t.manuf, t.warranty, t.lastRot, t.lastDo, t.nsd, t.grooves, t.fitKm, t.runKm, t.totKm, t.life, t.remDate, t.remReason].map(q).join(', ')})`).join(',\n')}
) as v(mtc, makers, folio, make, model, grade, cond, rec, place, cat, setting, transit, fleet, fpos, fitted, received, purchase, manuf, warranty, lastrot, lastdo, nsd, grooves, fitkm, runkm, totkm, life, remdate, remreason)
left join public.tyre_folios f on f.folio_no = nullif(v.folio, '')
left join public.tyre_makes mk on lower(mk.name) = lower(nullif(v.make, ''))
left join public.tyre_models md on md.make_id = mk.id and lower(md.model_name) = lower(nullif(v.model, ''))
left join public.fleets fl on fl.fleet_no = nullif(v.fleet, '')
where not exists (select 1 from public.tyres x where x.mtc_no = v.mtc);
`;
writeFileSync(OUT, s);
console.log({ folios: folios.length, fleets: fleets.length, ftypes: ftypes.length, tyres: tyres.length, makes: makes.length, pairs: pairs.length, bytes: s.length });
console.log(warn.slice(0, 20));
console.log('by place', Object.entries(tyres.reduce((a, t) => { const k = t.place + (t.cat ? ':' + t.cat : ''); a[k] = (a[k] ?? 0) + 1; return a; }, {})));
