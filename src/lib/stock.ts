/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';
import { all, rpc, type Row } from './ops';

export type { Row };

export const PART_LABEL: Record<string, string> = { TYRE: 'Tyre', TUBE: 'Tube', FLAP: 'Flap', DISC: 'Disc' };
export const WSR_STATUS_LABEL: Record<string, string> = { REQUESTED: 'Requested', PARTLY_ISSUED: 'Partly Issued', ISSUED: 'Issued' };
export const ORDER_STATUS_LABEL: Record<string, string> = { CREATED: 'Created', DONE: 'Done' };
export const MRN_STATUS_LABEL: Record<string, string> = { CREATED: 'Created', RECEIVED: 'Received', REJECTED: 'Rejected' };
export const SCRAP_MATERIALS = ['Rubber', 'Steel', 'Wood', 'Scrap tyre', 'Scrap tube', 'Scrap flap', 'Scrap disc', 'Valve', 'Other'];
export const SCRAP_DEFAULT_UNIT: Record<string, 'kg' | 'nos'> = { Rubber: 'kg', Steel: 'kg', Wood: 'kg', 'Scrap tyre': 'nos', 'Scrap tube': 'nos', 'Scrap flap': 'nos', 'Scrap disc': 'nos', Valve: 'nos', Other: 'kg' };
export const REMOVAL_REASONS = ['Worn out', 'Cut', 'Burst', 'Puncture', 'Bulge', 'Bead damage', 'Sidewall damage', 'Retread due', 'Other'];

/** every stock document the depot can see; row-level security already limits it */
export interface StockCtx {
  wsrs: Row[]; lines: Row[]; gins: Row[]; grns: Row[]; mrns: Row[]; srns: Row[]; srnLines: Row[]; scrap: Row[]; items: Row[]; orders: Row[];
  tyres: Row[]; sizes: Row[]; folios: Row[]; cards: Row[]; jobIds: Row[]; fleets: Row[]; staff: Row[];
}
export async function loadStock(): Promise<StockCtx> {
  const [wsrs, lines, gins, grns, mrns, srns, srnLines, scrap, items, orders, tyres, sizes, folios, cards, jobIds, fleets, staff] = await Promise.all([
    all('wsrs', 'created_at', false), all('wsr_lines', 'id'), all('wsr_gins', 'issued_at', false), all('grns', 'received_at', false), all('mrns', 'created_at', false),
    all('srns', 'created_at', false), all('srn_lines', 'id'), all('v_scrap_stock', 'material'), all('stock_items', 'item_no'), all('fleet_orders', 'order_no'),
    all('tyres', 'mtc_no'), all('tyre_sizes', 'size_code'), all('tyre_folios', 'folio_no'), all('job_cards', 'created_at', false), all('job_ids', 'job_id_no'), all('fleets', 'fleet_no'),
    supabase.from('employees').select('id, employee_code, full_name, role_code').in('role_code', ['TM', 'TIC']).then(({ data }) => (data ?? []) as Row[]),
  ]);
  return { wsrs, lines, gins, grns, mrns, srns, srnLines, scrap, items, orders, tyres, sizes, folios, cards, jobIds, fleets, staff };
}

/** the documents of one job card */
export interface CardDocs { wsrs: Row[]; lines: Row[]; gins: Row[]; grns: Row[]; mrns: Row[]; srns: Row[]; srnLines: Row[]; orders: Row[]; items: Row[] }
export async function loadCardDocs(card: string): Promise<CardDocs> {
  const by = (t: string, col = 'job_card_id') => supabase.from(t).select('*').eq(col, card).then((r) => (r.data ?? []) as Row[]);
  const [lines, mrns, srns, orders] = await Promise.all([by('wsr_lines'), by('mrns'), by('srns'), by('fleet_orders')]);
  const wsrIds = [...new Set(lines.map((l) => l.wsr_id))];
  const srnIds = srns.map((s) => s.id);
  const [wsrs, gins, srnLines, items] = await Promise.all([
    wsrIds.length ? supabase.from('wsrs').select('*').in('id', wsrIds).then((r) => (r.data ?? []) as Row[]) : Promise.resolve([] as Row[]),
    wsrIds.length ? supabase.from('wsr_gins').select('*').in('wsr_id', wsrIds).then((r) => (r.data ?? []) as Row[]) : Promise.resolve([] as Row[]),
    srnIds.length ? supabase.from('srn_lines').select('*').in('srn_id', srnIds).then((r) => (r.data ?? []) as Row[]) : Promise.resolve([] as Row[]),
    lines.some((l) => l.issued_item_id) ? supabase.from('stock_items').select('*').in('id', lines.map((l) => l.issued_item_id).filter(Boolean)).then((r) => (r.data ?? []) as Row[]) : Promise.resolve([] as Row[]),
  ]);
  const ginIds = gins.map((g) => g.id), mrnIds = mrns.map((m) => m.id);
  const filters = [ginIds.length ? `wsr_gin_id.in.(${ginIds.join(',')})` : '', mrnIds.length ? `mrn_id.in.(${mrnIds.join(',')})` : ''].filter(Boolean);
  const grns = filters.length ? await supabase.from('grns').select('*').or(filters.join(',')).then((r) => (r.data ?? []) as Row[]) : [];
  return { wsrs, lines, gins, grns, mrns, srns, srnLines, orders, items };
}

export interface ChangeLine {
  tyre_id: string; reason: string; fit: 'LIVE_SET' | 'LIVE_UNSET' | 'SWAP' | 'WANT' | ''; fit_tyre_id?: string; swap_tyre_id?: string;
  tube?: 'REUSE' | 'OTHER'; flap?: 'REUSE' | 'OTHER'; disc?: 'REUSE' | 'OTHER';
}
export const createTyreChange = (fleet: string, lines: ChangeLine[], fleet2: string | null, expected: string | null, shift: string | null, instruction: string) =>
  rpc<string>('tyre_change_create', { p_fleet: fleet, p_lines: lines, p_fleet2: fleet2, p_expected: expected, p_shift: shift, p_instruction: instruction || null });
export const provideTyre = (job: string, tyre: string) => rpc('fitment_provide_tyre', { p_job: job, p_tyre: tyre });
export const createWsr = (lines: { part: string; size_id: string; job_card_id?: string | null; job_id?: string | null }[]) => rpc<string>('wsr_create', { p_lines: lines });
export const issueWsr = (wsr: string, picks: { line_id: string; tyre_id?: string | null; item_id?: string | null }[]) => rpc<string>('wsr_issue', { p_wsr: wsr, p_picks: picks });
export const receiveGin = (gin: string, results: { line_id: string; accept: boolean; reason?: string }[]) => rpc<string>('grn_receive_wsr_gin', { p_gin: gin, p_results: results });
export const createMrn = (tyre: string | null, item: string | null, remarks: string) => rpc<string>('mrn_create', { p_tyre: tyre, p_item: item, p_remarks: remarks || null });
export const receiveMrn = (mrn: string, accept: boolean, category: string | null, remarks: string) => rpc<string>('mrn_receive', { p_mrn: mrn, p_accept: accept, p_category: category, p_remarks: remarks || null });
export const createSrn = (card: string, lines: { material: string; qty: number; unit: string; remarks?: string }[], remarks: string) => rpc<string>('srn_create', { p_card: card, p_lines: lines, p_remarks: remarks || null });
export const receiveSrn = (srn: string) => rpc<string>('srn_receive', { p_srn: srn });
