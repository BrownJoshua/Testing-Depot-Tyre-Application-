/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';
import { fmtDateTime, type ChangeRequest, type RefValue, type Vendor } from './masters';

export type Row = Record<string, any>;

/** Everything the master screens need to turn ids into names. Loaded once per screen. */
export interface Ctx {
  vendors: Vendor[];
  refs: (RefValue & { list_code: string })[];
  sizes: Row[]; makes: Row[]; models: Row[]; folios: Row[];
  folioLocs: Record<string, string[]>;
  fleetTypes: Row[]; fleetTypeSizes: Record<string, string[]>; fleets: Row[]; depots: Row[]; jobs: Row[];
  complaintTypes: Row[]; complaintJobs: Record<string, string[]>; schedules: Row[];
  shifts: Row[]; rejectReasons: Row[]; wearPatterns: Row[]; qcChecklists: Row[]; expectedLife: Row[];
}

async function all(table: string, order: string): Promise<Row[]> {
  const { data, error } = await supabase.from(table).select('*').order(order);
  if (error) throw new Error(error.message);
  return data as Row[];
}

export async function loadCtx(): Promise<Ctx> {
  const [vendors, refs, sizes, makes, models, folios, locs, fleetTypes, ftSizes, fleets, orgs, jobs, complaintTypes, ctJobs, schedules, shifts, rejectReasons, wearPatterns, qcChecklists, expectedLife] = await Promise.all([
    all('vendors', 'vendor_code'), all('ref_values', 'sort_order'), all('tyre_sizes', 'size_code'), all('tyre_makes', 'name'),
    all('tyre_models', 'model_name'), all('tyre_folios', 'folio_no'), all('tyre_folio_locations', 'location_type'),
    all('fleet_types', 'fleet_make'), all('fleet_type_tyre_sizes', 'tyre_size_id'), all('fleets', 'fleet_no'),
    all('org_units', 'sort_order'), all('maintenance_jobs', 'job_code'), all('complaint_types', 'complaint_code'), all('complaint_type_jobs', 'job_id'),
    all('maintenance_schedules', 'schedule_code'), all('shifts', 'start_time'), all('reject_reasons', 'reason_code'), all('wear_patterns', 'pattern_code'),
    all('qc_checklists', 'qc_code'), all('expected_life_km', 'created_at'),
  ]);
  const complaintJobs: Record<string, string[]> = {};
  for (const l of ctJobs) (complaintJobs[l.complaint_type_id] ??= []).push(jobs.find((j) => j.id === l.job_id)?.job_code ?? '');
  const folioLocs: Record<string, string[]> = {};
  for (const l of locs) (folioLocs[l.folio_id] ??= []).push(l.location_type);
  const fleetTypeSizes: Record<string, string[]> = {};
  for (const l of ftSizes) (fleetTypeSizes[l.fleet_type_id] ??= []).push(sizes.find((x) => x.id === l.tyre_size_id)?.size_code ?? '');
  const depots = orgs.filter((o) => o.unit_type === 'DEPOT');
  return { vendors: vendors as Vendor[], refs: refs as Ctx['refs'], sizes, makes, models, folios, folioLocs, fleetTypes, fleetTypeSizes, fleets, depots, jobs, complaintTypes, complaintJobs, schedules, shifts, rejectReasons, wearPatterns, qcChecklists, expectedLife };
}

export interface Option { value: string; label: string }
export interface FieldDef {
  key: string; label: string; kind: 'text' | 'number' | 'date' | 'bool' | 'select' | 'multi';
  /** only chosen when the record is created */
  createOnly?: boolean; required?: boolean; hint?: string; wide?: boolean; multiline?: boolean;
  options?: (ctx: Ctx, form: Row) => Option[];
}
export interface EntityDef {
  type: string; slug: string; title: string; singular: string; hint?: string;
  fields: FieldDef[];
  rows: (ctx: Ctx) => Row[];
  /** a row expressed as the same keys the request payload uses (codes and names, not ids) */
  toForm: (row: Row, ctx: Ctx) => Row;
  columns: { label: string; value: (row: Row, ctx: Ctx) => string }[];
  nameOf: (form: Row) => string;
  /** when the key changes, also send these keys (the database needs them together) */
  companions?: Record<string, string[]>;
}

const refOpts = (list: string) => (c: Ctx): Option[] => c.refs.filter((r) => r.list_code === list).map((r) => ({ value: r.code, label: r.label }));
const refCode = (c: Ctx, id: string | null) => (id ? c.refs.find((r) => r.id === id)?.code ?? null : null);
const refLabel = (c: Ctx, id: string | null) => (id ? c.refs.find((r) => r.id === id)?.label ?? '—' : '—');
const LOCATIONS: Option[] = [
  { value: 'CENTRAL_STORE', label: 'Central Store' }, { value: 'MIC_VEHICLE_UNIT', label: 'MIC Vehicle Unit' },
  { value: 'DEPOT', label: 'Depot' }, { value: 'TRS', label: 'TRS' },
];

const POSITIONS: Option[] = ['FR', 'FL', 'RRI', 'RRO', 'RLI', 'RLO'].map((p) => ({ value: p, label: p }));
const DEFAULT_POSITIONS = 'FR,FL,RRI,RRO,RLI,RLO';
const WORK_CATEGORIES: Option[] = [
  ['AIR_INFLATION', 'Air Inflation'], ['AIR_INFLATION_NITROGEN', 'Air Inflation - Nitrogen'], ['INSPECTION', 'Inspection'],
  ['TYRE_ROTATION', 'Tyre Rotation'], ['TYRE_DISCOUT', 'Tyre Discout'], ['CENSUS', 'Census'], ['TYRE_CHANGING', 'Tyre Changing'],
  ['TYRE_REMOVAL', 'Tyre Removal'], ['TYRE_FITMENT', 'Tyre Fitment'], ['TYRE_SETTING', 'Tyre Setting'], ['TYRE_UNSETTING', 'Tyre Unsetting'],
].map(([value, label]) => ({ value, label }));
const SCHEDULE_CATEGORIES: Option[] = WORK_CATEGORIES.filter((w) => w.value !== 'TYRE_CHANGING' && !['TYRE_REMOVAL', 'TYRE_FITMENT', 'TYRE_SETTING', 'TYRE_UNSETTING'].includes(w.value));
const sizeOpts =(c: Ctx): Option[] => c.sizes.filter((s) => s.status === 'ACTIVE').map((s) => ({ value: s.size_code, label: s.size_code }));
const depotOpts = (c: Ctx): Option[] => c.depots.filter((d) => d.status === 'ACTIVE').map((d) => ({ value: d.code, label: d.name }));
const fleetMakeOpts = (c: Ctx): Option[] => [...new Set(c.fleetTypes.filter((t) => t.status === 'ACTIVE').map((t) => t.fleet_make as string))].map((m) => ({ value: m, label: m }));
const fleetModelOpts = (c: Ctx, f: Row): Option[] => c.fleetTypes.filter((t) => t.status === 'ACTIVE' && t.fleet_make === f.fleet_make).map((t) => ({ value: t.fleet_model, label: t.fleet_model }));
const typeName = (c: Ctx, id: string | null) => { const t = c.fleetTypes.find((x) => x.id === id); return t ? `${t.fleet_make} ${t.fleet_model}` : null; };

export const ENTITIES: EntityDef[] = [
  {
    type: 'tyre_size', slug: 'tyre-sizes', title: 'Tyre sizes', singular: 'tyre size',
    fields: [
      { key: 'size_code', label: 'Size', kind: 'text', createOnly: true, required: true, hint: 'e.g. 7.50 X 16' },
      { key: 'rim_inches', label: 'Rim (inches)', kind: 'number' },
      { key: 'display_label', label: 'Display label', kind: 'text' },
    ],
    rows: (c) => c.sizes,
    toForm: (r) => ({ size_code: r.size_code, rim_inches: r.rim_inches, display_label: r.display_label }),
    columns: [{ label: 'Size', value: (r) => r.size_code }, { label: 'Rim (in)', value: (r) => String(r.rim_inches ?? '—') }],
    nameOf: (f) => String(f.size_code ?? 'tyre size'),
  },
  {
    type: 'tyre_make', slug: 'tyre-makes', title: 'Tyre makes', singular: 'tyre make',
    fields: [{ key: 'name', label: 'Make', kind: 'text', required: true }],
    rows: (c) => c.makes,
    toForm: (r) => ({ name: r.name }),
    columns: [{ label: 'Make', value: (r) => r.name }],
    nameOf: (f) => String(f.name ?? 'make'),
  },
  {
    type: 'tyre_model', slug: 'tyre-models', title: 'Tyre models', singular: 'tyre model',
    hint: 'The prototype does not say which model belongs to which make, so models are added here by HO.',
    fields: [
      { key: 'make_name', label: 'Make', kind: 'select', createOnly: true, required: true, options: (c) => c.makes.filter((m) => m.status === 'ACTIVE').map((m) => ({ value: m.name, label: m.name })) },
      { key: 'model_name', label: 'Model', kind: 'text', required: true },
    ],
    rows: (c) => c.models,
    toForm: (r, c) => ({ make_name: c.makes.find((m) => m.id === r.make_id)?.name ?? '', model_name: r.model_name }),
    columns: [
      { label: 'Make', value: (r, c) => c.makes.find((m) => m.id === r.make_id)?.name ?? '—' },
      { label: 'Model', value: (r) => r.model_name },
    ],
    nameOf: (f) => `${f.make_name ?? ''} ${f.model_name ?? ''}`.trim() || 'tyre model',
  },
  {
    type: 'tyre_folio', slug: 'tyre-folio', title: 'Tyre Folio', singular: 'folio',
    hint: 'A folio is never deleted. “Deactivate” hides it from new use and keeps its history.',
    fields: [
      { key: 'folio_no', label: 'Folio No.', kind: 'text', createOnly: true, required: true, hint: '3–20 characters: A–Z, 0–9, hyphen (placeholder rule)' },
      { key: 'folio_name', label: 'Folio name', kind: 'text', required: true },
      { key: 'specification', label: 'Specification', kind: 'text', wide: true },
      { key: 'make_name', label: 'Make', kind: 'select', options: (c) => c.makes.filter((m) => m.status === 'ACTIVE').map((m) => ({ value: m.name, label: m.name })) },
      { key: 'model_name', label: 'Makers model', kind: 'select',
        options: (c, f) => c.models.filter((m) => m.status === 'ACTIVE' && c.makes.find((k) => k.id === m.make_id)?.name === f.make_name).map((m) => ({ value: m.model_name, label: m.model_name })) },
      { key: 'construction_code', label: 'Construction type', kind: 'select', options: refOpts('construction_type') },
      { key: 'tube_code', label: 'Tube type', kind: 'select', options: refOpts('tube_type') },
      { key: 'ply', label: 'Ply', kind: 'number' },
      { key: 'size_code', label: 'Tyre size', kind: 'select', options: (c) => c.sizes.filter((s) => s.status === 'ACTIVE').map((s) => ({ value: s.size_code, label: s.size_code })) },
      { key: 'product_group_code', label: 'Group', kind: 'select', required: true, options: refOpts('product_group') },
      { key: 'category_code', label: 'Category', kind: 'select', options: refOpts('folio_category') },
      { key: 'uom_code', label: 'UOM', kind: 'select', required: true, options: refOpts('uom') },
      { key: 'hsn_code', label: 'HSN code', kind: 'text' },
      { key: 'has_expiry', label: 'Has expiry', kind: 'bool' },
      { key: 'is_recondition', label: 'Recondition', kind: 'bool' },
      { key: 'locations', label: 'Locations', kind: 'multi', wide: true, options: () => LOCATIONS },
    ],
    companions: { make_name: ['model_name'] },
    rows: (c) => c.folios,
    toForm: (r, c) => ({
      folio_no: r.folio_no, folio_name: r.folio_name, specification: r.specification,
      make_name: c.makes.find((m) => m.id === r.make_id)?.name ?? null, model_name: c.models.find((m) => m.id === r.model_id)?.model_name ?? null,
      construction_code: refCode(c, r.construction_type_ref), tube_code: refCode(c, r.tube_type_ref), ply: r.ply,
      size_code: c.sizes.find((s) => s.id === r.tyre_size_id)?.size_code ?? null, product_group_code: refCode(c, r.product_group_ref),
      category_code: refCode(c, r.category_ref), uom_code: refCode(c, r.uom_ref), hsn_code: r.hsn_code,
      has_expiry: r.has_expiry, is_recondition: r.is_recondition, locations: [...(c.folioLocs[r.id] ?? [])].sort(),
    }),
    columns: [
      { label: 'Folio', value: (r) => r.folio_no }, { label: 'Name', value: (r) => r.folio_name },
      { label: 'Make', value: (r, c) => c.makes.find((m) => m.id === r.make_id)?.name ?? '—' },
      { label: 'Size', value: (r, c) => c.sizes.find((s) => s.id === r.tyre_size_id)?.size_code ?? '—' },
      { label: 'Group', value: (r, c) => refLabel(c, r.product_group_ref) },
    ],
    nameOf: (f) => `${f.folio_no ?? ''} ${f.folio_name ?? ''}`.trim() || 'folio',
  },
  {
    type: 'fleet_type', slug: 'fleet-types', title: 'Fleet Type Master', singular: 'fleet type',
    hint: 'Make and model cannot be changed after creation. The tyre sizes chosen here are the sizes that fit this type.',
    fields: [
      { key: 'fleet_make', label: 'Fleet make', kind: 'text', createOnly: true, required: true },
      { key: 'fleet_model', label: 'Fleet model', kind: 'text', createOnly: true, required: true },
      { key: 'tyre_sizes', label: 'Tyre sizes that fit', kind: 'multi', wide: true, options: sizeOpts },
    ],
    rows: (c) => c.fleetTypes,
    toForm: (r, c) => ({ fleet_make: r.fleet_make, fleet_model: r.fleet_model, tyre_sizes: [...(c.fleetTypeSizes[r.id] ?? [])].sort() }),
    columns: [
      { label: 'Make', value: (r) => r.fleet_make }, { label: 'Model', value: (r) => r.fleet_model },
      { label: 'Tyre sizes', value: (r, c) => (c.fleetTypeSizes[r.id] ?? []).join(', ') || '—' },
    ],
    nameOf: (f) => `${f.fleet_make ?? ''} ${f.fleet_model ?? ''}`.trim() || 'fleet type',
  },
  {
    type: 'fleet', slug: 'fleets', title: 'Fleet Register', singular: 'fleet',
    hint: 'You see the fleets of your own depot. Moving a fleet to another depot is recorded in its depot history.',
    fields: [
      { key: 'fleet_no', label: 'Fleet No.', kind: 'text', createOnly: true, required: true, hint: '3–12 characters: A–Z, 0–9, hyphen (placeholder rule)' },
      { key: 'registration_no', label: 'Registration No.', kind: 'text', required: true },
      { key: 'chassis_no', label: 'Chassis No.', kind: 'text' },
      { key: 'purchase_date', label: 'Purchase date', kind: 'date' },
      { key: 'depot_code', label: 'Home depot', kind: 'select', required: true, options: depotOpts },
      { key: 'fleet_make', label: 'Fleet make', kind: 'select', required: true, options: fleetMakeOpts },
      { key: 'fleet_model', label: 'Fleet model', kind: 'select', required: true, options: fleetModelOpts },
      { key: 'bus_model_type_code', label: 'Bus model type', kind: 'select', options: refOpts('bus_model_type') },
      { key: 'vehicle_type_code', label: 'Vehicle type', kind: 'select', options: refOpts('vehicle_type') },
      { key: 'oem_size_code', label: 'OEM tyre size', kind: 'select', options: sizeOpts },
      { key: 'positions', label: 'Tyre positions (leave empty for FR FL RRI RRO RLI RLO)', kind: 'multi', wide: true, options: () => POSITIONS },
    ],
    companions: { fleet_make: ['fleet_model'], fleet_model: ['fleet_make'] },
    rows: (c) => c.fleets,
    toForm: (r, c) => ({
      fleet_no: r.fleet_no, registration_no: r.registration_no, chassis_no: r.chassis_no, purchase_date: r.purchase_date,
      depot_code: c.depots.find((d) => d.id === r.org_unit_id)?.code ?? null,
      fleet_make: c.fleetTypes.find((t) => t.id === r.fleet_type_id)?.fleet_make ?? null,
      fleet_model: c.fleetTypes.find((t) => t.id === r.fleet_type_id)?.fleet_model ?? null,
      bus_model_type_code: refCode(c, r.bus_model_type_ref), vehicle_type_code: refCode(c, r.vehicle_type_ref),
      oem_size_code: c.sizes.find((s) => s.id === r.oem_tyre_size_id)?.size_code ?? null,
      positions: (r.position_layout ?? []).join(',') === DEFAULT_POSITIONS ? [] : [...(r.position_layout ?? [])],
    }),
    columns: [
      { label: 'Fleet', value: (r) => r.fleet_no }, { label: 'Registration', value: (r) => r.registration_no },
      { label: 'Depot', value: (r, c) => c.depots.find((d) => d.id === r.org_unit_id)?.name ?? '—' },
      { label: 'Type', value: (r, c) => typeName(c, r.fleet_type_id) ?? '—' },
      { label: 'Vehicle', value: (r, c) => refLabel(c, r.vehicle_type_ref) },
    ],
    nameOf: (f) => `${f.fleet_no ?? ''} ${f.registration_no ?? ''}`.trim() || 'fleet',
  },
  {
    type: 'maintenance_job', slug: 'maintenance-jobs', title: 'Maintenance Configuration: jobs', singular: 'job',
    hint: 'JOB-007 is reserved and cannot be used. Leave the fleet type empty for a job that applies to every fleet type.',
    fields: [
      { key: 'job_code', label: 'Job code', kind: 'text', createOnly: true, required: true, hint: 'e.g. JOB-013' },
      { key: 'job_name', label: 'Job name', kind: 'text', required: true },
      { key: 'work_category', label: 'Work category', kind: 'select', required: true, options: () => WORK_CATEGORIES },
      { key: 'est_minutes_per_fleet', label: 'Minutes per fleet', kind: 'number' },
      { key: 'est_minutes_per_tyre', label: 'Minutes per tyre', kind: 'number' },
      { key: 'fleet_make', label: 'Only for fleet make', kind: 'select', options: fleetMakeOpts },
      { key: 'fleet_model', label: 'Only for fleet model', kind: 'select', options: fleetModelOpts },
    ],
    companions: { fleet_make: ['fleet_model'], fleet_model: ['fleet_make'] },
    rows: (c) => c.jobs,
    toForm: (r, c) => ({
      job_code: r.job_code, job_name: r.job_name, work_category: r.work_category,
      est_minutes_per_fleet: r.est_minutes_per_fleet, est_minutes_per_tyre: r.est_minutes_per_tyre,
      fleet_make: c.fleetTypes.find((t) => t.id === r.fleet_type_id)?.fleet_make ?? null,
      fleet_model: c.fleetTypes.find((t) => t.id === r.fleet_type_id)?.fleet_model ?? null,
    }),
    columns: [
      { label: 'Code', value: (r) => r.job_code }, { label: 'Job', value: (r) => r.job_name },
      { label: 'Category', value: (r) => WORK_CATEGORIES.find((w) => w.value === r.work_category)?.label ?? r.work_category },
      { label: 'Fleet type', value: (r, c) => typeName(c, r.fleet_type_id) ?? 'All' },
    ],
    nameOf: (f) => `${f.job_code ?? ''} ${f.job_name ?? ''}`.trim() || 'job',
  },
  {
    type: 'complaint_type', slug: 'complaint-types', title: 'Complaint Master', singular: 'complaint type',
    hint: 'The twelve types come from the prototype log-sheet form; their codes are placeholders. “Required jobs” are the jobs a complaint of this type needs.',
    fields: [
      { key: 'complaint_code', label: 'Complaint code', kind: 'text', createOnly: true, required: true, hint: 'e.g. CT-013' },
      { key: 'complaint_name', label: 'Complaint name', kind: 'text', required: true, wide: true },
      { key: 'required_jobs', label: 'Required jobs', kind: 'multi', wide: true, options: (c) => c.jobs.filter((j) => j.status === 'ACTIVE').map((j) => ({ value: j.job_code, label: `${j.job_code} — ${j.job_name}` })) },
    ],
    rows: (c) => c.complaintTypes,
    toForm: (r, c) => ({ complaint_code: r.complaint_code, complaint_name: r.complaint_name, required_jobs: [...(c.complaintJobs[r.id] ?? [])].sort() }),
    columns: [
      { label: 'Code', value: (r) => r.complaint_code }, { label: 'Complaint', value: (r) => r.complaint_name },
      { label: 'Required jobs', value: (r, c) => (c.complaintJobs[r.id] ?? []).join(', ') || '—' },
    ],
    nameOf: (f) => `${f.complaint_code ?? ''} ${f.complaint_name ?? ''}`.trim() || 'complaint type',
  },
  {
    type: 'maintenance_schedule', slug: 'schedules', title: 'Maintenance Configuration: schedules', singular: 'schedule',
    hint: 'Frequency: every n days, particular days of the month, a KM interval, or days and KM (whichever comes first). Due dates use days only for now (no odometer progression yet).',
    fields: [
      { key: 'schedule_code', label: 'Schedule code', kind: 'text', createOnly: true, required: true, hint: 'e.g. SCH008' },
      { key: 'schedule_name', label: 'Schedule name', kind: 'text', required: true },
      { key: 'work_category', label: 'Work category', kind: 'select', required: true, options: () => SCHEDULE_CATEGORIES },
      { key: 'job_code', label: 'Linked job', kind: 'select', hint: 'must belong to the same work category',
        options: (c, f) => c.jobs.filter((j) => j.status === 'ACTIVE' && (!f.work_category || j.work_category === f.work_category)).map((j) => ({ value: j.job_code, label: `${j.job_code} — ${j.job_name}` })) },
      { key: 'frequency_kind', label: 'Frequency', kind: 'select', options: () => [{ value: 'DATE', label: 'Date based' }, { value: 'KM', label: 'KM based' }, { value: 'DATE_KM', label: 'Date and KM based' }] },
      { key: 'every_n_days', label: 'Every (days)', kind: 'number' },
      { key: 'particular_days', label: 'Particular days of the month', kind: 'multi', wide: true, options: () => Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })) },
      { key: 'every_km', label: 'Every (km)', kind: 'number' },
      { key: 'km_basis', label: 'KM type', kind: 'select', options: () => [['SCHEDULED', 'Scheduled KM'], ['DEAD', 'Dead KM'], ['OPERATED', 'Operated KM'], ['GROSS', 'Gross KM'], ['LIVE_ODO', 'Live Odo KM']].map(([value, label]) => ({ value, label })) },
      { key: 'uses_working_days', label: 'Count working days only', kind: 'bool' },
      { key: 'due_days_after_assignment', label: 'Due days after assignment', kind: 'number' },
      { key: 'effective_from', label: 'Effective from', kind: 'date', required: true },
    ],
    rows: (c) => c.schedules,
    toForm: (r, c) => ({
      schedule_code: r.schedule_code, schedule_name: r.schedule_name, work_category: r.work_category,
      job_code: c.jobs.find((j) => j.id === r.job_id)?.job_code ?? null, frequency_kind: r.frequency_kind, every_n_days: r.every_n_days,
      particular_days: (r.particular_days ?? []).map(String), every_km: r.every_km, km_basis: r.km_basis, uses_working_days: r.uses_working_days,
      due_days_after_assignment: r.due_days_after_assignment, effective_from: r.effective_from,
    }),
    columns: [
      { label: 'Code', value: (r) => r.schedule_code }, { label: 'Schedule', value: (r) => r.schedule_name },
      { label: 'Frequency', value: (r) => [r.particular_days?.length ? 'days ' + r.particular_days.join(', ') : r.every_n_days ? 'every ' + r.every_n_days + ' days' : '', r.every_km ? 'every ' + Number(r.every_km).toLocaleString('en-IN') + ' km' : ''].filter(Boolean).join(' or ') },
      { label: 'Effective from', value: (r) => r.effective_from },
    ],
    nameOf: (f) => `${f.schedule_code ?? ''} ${f.schedule_name ?? ''}`.trim() || 'schedule',
  },
  {
    type: 'reject_reason', slug: 'reject-reasons', title: 'Reject Reason Master', singular: 'reject reason',
    fields: [
      { key: 'reason_code', label: 'Reason ID', kind: 'text', createOnly: true, required: true, hint: 'e.g. DRR-007' },
      { key: 'reason_text', label: 'Reject reason', kind: 'text', required: true, wide: true },
    ],
    rows: (c) => c.rejectReasons,
    toForm: (r) => ({ reason_code: r.reason_code, reason_text: r.reason_text }),
    columns: [{ label: 'Reason ID', value: (r) => r.reason_code }, { label: 'Reject reason', value: (r) => r.reason_text }],
    nameOf: (f) => `${f.reason_code ?? ''} ${f.reason_text ?? ''}`.trim() || 'reject reason',
  },
  {
    type: 'wear_pattern', slug: 'wear-patterns', title: 'Wear Pattern Master', singular: 'wear pattern',
    fields: [
      { key: 'pattern_code', label: 'Pattern ID', kind: 'text', createOnly: true, required: true, hint: 'e.g. WP-011' },
      { key: 'pattern_name', label: 'Wear pattern', kind: 'text', required: true },
    ],
    rows: (c) => c.wearPatterns,
    toForm: (r) => ({ pattern_code: r.pattern_code, pattern_name: r.pattern_name }),
    columns: [{ label: 'Pattern ID', value: (r) => r.pattern_code }, { label: 'Wear pattern', value: (r) => r.pattern_name }],
    nameOf: (f) => `${f.pattern_code ?? ''} ${f.pattern_name ?? ''}`.trim() || 'wear pattern',
  },
  {
    type: 'qc_checklist', slug: 'qc-master', title: 'QC Master', singular: 'QC checklist',
    fields: [
      { key: 'qc_code', label: 'QC ID', kind: 'text', createOnly: true, required: true, hint: 'e.g. QCM-012' },
      { key: 'job_type', label: 'Job type', kind: 'text', required: true },
      { key: 'checklist_items', label: 'Checklist items', kind: 'text', required: true, wide: true, multiline: true, hint: 'one item on each line' },
    ],
    rows: (c) => c.qcChecklists,
    toForm: (r) => ({ qc_code: r.qc_code, job_type: r.job_type, checklist_items: (r.checklist_items ?? []).join('\n') }),
    columns: [{ label: 'QC ID', value: (r) => r.qc_code }, { label: 'Job type', value: (r) => r.job_type }, { label: 'Checklist items', value: (r) => String((r.checklist_items ?? []).length) }],
    nameOf: (f) => `${f.qc_code ?? ''} ${f.job_type ?? ''}`.trim() || 'QC checklist',
  },
  {
    type: 'expected_life_km', slug: 'expected-life-km', title: 'Expected Life KM', singular: 'expected life row',
    fields: [
      { key: 'size_code', label: 'Tyre size', kind: 'select', createOnly: true, required: true, options: sizeOpts },
      { key: 'km_new', label: 'New', kind: 'number', required: true },
      { key: 'km_rt1', label: 'RT1', kind: 'number', required: true },
      { key: 'km_rt2', label: 'RT2', kind: 'number', required: true },
      { key: 'km_rt3', label: 'RT3', kind: 'number', required: true },
      { key: 'km_rt4', label: 'RT4', kind: 'number', required: true },
      { key: 'km_rt5', label: 'RT5', kind: 'number', required: true },
    ],
    rows: (c) => c.expectedLife,
    toForm: (r, c) => ({ size_code: c.sizes.find((s) => s.id === r.tyre_size_id)?.size_code ?? '', km_new: r.km_new, km_rt1: r.km_rt1, km_rt2: r.km_rt2, km_rt3: r.km_rt3, km_rt4: r.km_rt4, km_rt5: r.km_rt5 }),
    columns: [
      { label: 'Tyre size', value: (r, c) => c.sizes.find((s) => s.id === r.tyre_size_id)?.size_code ?? '—' },
      ...(['km_new', 'km_rt1', 'km_rt2', 'km_rt3', 'km_rt4', 'km_rt5'] as const).map((k) => ({ label: k === 'km_new' ? 'New' : k.slice(3).toUpperCase(), value: (r: Row) => Number(r[k]).toLocaleString('en-IN') })),
    ],
    nameOf: (f) => String(f.size_code ?? 'tyre size'),
  },
  {
    type: 'shift', slug: 'shifts', title: 'Shift Master', singular: 'shift',
    fields: [
      { key: 'shift_code', label: 'Shift code', kind: 'text', createOnly: true, required: true, hint: 'capital letters, e.g. SPLIT' },
      { key: 'shift_name', label: 'Shift', kind: 'text', required: true },
      { key: 'start_time', label: 'Start (HH:MM)', kind: 'text', required: true },
      { key: 'end_time', label: 'End (HH:MM)', kind: 'text', required: true },
    ],
    rows: (c) => c.shifts,
    toForm: (r) => ({ shift_code: r.shift_code, shift_name: r.shift_name, start_time: String(r.start_time).slice(0, 5), end_time: String(r.end_time).slice(0, 5) }),
    columns: [{ label: 'Shift', value: (r) => r.shift_name }, { label: 'Start', value: (r) => String(r.start_time).slice(0, 5) }, { label: 'End', value: (r) => String(r.end_time).slice(0, 5) }],
    nameOf: (f) => String(f.shift_name ?? 'shift'),
  },
];

export const entityBySlug = (slug: string | undefined) => ENTITIES.find((e) => e.slug === slug);
export const entityByType = (type: string) => ENTITIES.find((e) => e.type === type);

/** Readable value for a field (for request tables and the register). */
export function showValue(def: FieldDef | undefined, v: unknown, ctx: Ctx): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) {
    if (v.length === 0) return 'none';
    const opts = def?.kind === 'multi' && def.options ? def.options(ctx, {}) : LOCATIONS;
    return v.map((x) => (typeof x === 'object' ? `${(x as Row).contact_name}${(x as Row).is_primary ? ' (primary)' : ''}` : opts.find((l) => l.value === x)?.label ?? String(x))).join(', ');
  }
  if (def?.kind === 'select' && def.options) return def.options(ctx, {}).find((o) => o.value === v)?.label ?? String(v);
  return String(v);
}

/** Title, labelled before/after rows for a request, for any master type. */
export function describeRequest(r: ChangeRequest, ctx: Ctx) {
  const verb = { CREATE: 'New', UPDATE: 'Change', DEACTIVATE: 'Deactivate', REACTIVATE: 'Reactivate' }[r.action];
  const def = entityByType(r.entity_type);
  if (!def) { // vendor keeps its own describer in RequestCard
    return null;
  }
  const row = def.rows(ctx).find((x) => x.id === r.target_id);
  const current = row ? def.toForm(row, ctx) : {};
  const merged = { ...current, ...r.proposed_payload };
  const rows = Object.keys(r.proposed_payload).map((k) => {
    const f = def.fields.find((x) => x.key === k);
    return { label: f?.label ?? k, now: showValue(f, current[k], ctx), proposed: showValue(f, r.proposed_payload[k], ctx) };
  });
  return { title: `${verb} ${def.singular}: ${def.nameOf(merged)}`, rows, created: fmtDateTime(r.created_at) };
}
