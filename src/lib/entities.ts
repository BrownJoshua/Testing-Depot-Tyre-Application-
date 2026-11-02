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
}

async function all(table: string, order: string): Promise<Row[]> {
  const { data, error } = await supabase.from(table).select('*').order(order);
  if (error) throw new Error(error.message);
  return data as Row[];
}

export async function loadCtx(): Promise<Ctx> {
  const [vendors, refs, sizes, makes, models, folios, locs] = await Promise.all([
    all('vendors', 'vendor_code'), all('ref_values', 'sort_order'), all('tyre_sizes', 'size_code'), all('tyre_makes', 'name'),
    all('tyre_models', 'model_name'), all('tyre_folios', 'folio_no'), all('tyre_folio_locations', 'location_type'),
  ]);
  const folioLocs: Record<string, string[]> = {};
  for (const l of locs) (folioLocs[l.folio_id] ??= []).push(l.location_type);
  return { vendors: vendors as Vendor[], refs: refs as Ctx['refs'], sizes, makes, models, folios, folioLocs };
}

export interface Option { value: string; label: string }
export interface FieldDef {
  key: string; label: string; kind: 'text' | 'number' | 'bool' | 'select' | 'multi';
  /** only chosen when the record is created */
  createOnly?: boolean; required?: boolean; hint?: string; wide?: boolean;
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
];

export const entityBySlug = (slug: string | undefined) => ENTITIES.find((e) => e.slug === slug);
export const entityByType = (type: string) => ENTITIES.find((e) => e.type === type);

/** Readable value for a field (for request tables and the register). */
export function showValue(def: FieldDef | undefined, v: unknown, ctx: Ctx): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) {
    if (v.length === 0) return 'none';
    return v.map((x) => (typeof x === 'object' ? `${(x as Row).contact_name}${(x as Row).is_primary ? ' (primary)' : ''}` : LOCATIONS.find((l) => l.value === x)?.label ?? String(x))).join(', ');
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
