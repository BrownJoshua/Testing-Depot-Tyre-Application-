/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';
import { all, rpc, type Row } from './ops';

export type { Row };

export const receiveGin2 = (gin: string, results: Row[], at: string | null, closeReason: string) =>
  rpc<string>('grn_receive_gin2', { p_gin: gin, p_results: results, p_received_at: at, p_close_reason: closeReason || null });
export const receiveUnit = (kind: 'TRS' | 'MIC', results: Row[], at: string | null, closeReason: string) =>
  rpc<string>('grn_receive_unit', { p_kind: kind, p_results: results, p_received_at: at, p_close_reason: closeReason || null });
export const createAirTypeRequest = (fleet: string, to: string, reason: string) => rpc<string>('air_type_request_create', { p_fleet: fleet, p_to: to, p_reason: reason });
export const actAirTypeRequest = (id: string, action: 'APPROVE' | 'REJECT', note: string) => rpc('air_type_request_act', { p_req: id, p_action: action, p_note: note || null });
export const createPfr = (a: Record<string, unknown>) => rpc<string>('pfr_create', {
  p_tyre: a.tyre, p_fault_on: a.fault, p_employee_code: a.empCode || null, p_employee_name: a.empName || null, p_position: a.position || null, p_skid: a.skid === '' ? null : Number(a.skid),
  p_km_run: Number(a.kmRun), p_norm_km: Number(a.normKm), p_price: Number(a.price), p_reason_removal: a.removal || null, p_reason_damage: a.damage || null,
});
export const decideDamage = (id: string, approve: boolean, reason: string) => rpc('damage_request_decide', { p_req: id, p_approve: approve, p_reason: reason || null });
export const submitDamage = (id: string, report: Row) => rpc('damage_report_submit', { p_req: id, p_report: report });
export const createDrn = (to: string, remarks: string, tyres: string[]) => rpc<string>('drn_create', { p_to: to, p_remarks: remarks || null, p_tyres: tyres });
export const actDrn = (id: string, action: 'APPROVE' | 'REVERT' | 'REJECT', note: string) => rpc('drn_act', { p_drn: id, p_action: action, p_note: note || null });
export const createCorrection = (tyre: string, fields: Row, remarks: string) => rpc<string>('tyre_correction_create', { p_tyre: tyre, p_fields: fields, p_photo: null, p_remarks: remarks || null });
export const decideCorrection = (id: string, approve: boolean, remarks: string) => rpc('tyre_correction_decide', { p_req: id, p_approve: approve, p_remarks: remarks || null });

/** correctable tyre fields (same list as the database) */
export const CORRECTABLE: { key: string; label: string; kind: 'text' | 'date' | 'number' | 'grade' }[] = [
  { key: 'makers_no', label: 'Manufacturer No', kind: 'text' }, { key: 'grade', label: 'Grade', kind: 'grade' }, { key: 'tyre_condition', label: 'Tyre condition', kind: 'text' },
  { key: 'manufactured_date', label: 'Manufactured date', kind: 'date' }, { key: 'purchase_date', label: 'Purchase date', kind: 'date' }, { key: 'warranty_upto', label: 'Warranty upto', kind: 'date' },
  { key: 'nsd_mm', label: 'NSD (mm)', kind: 'number' }, { key: 'groove_count', label: 'Groove count', kind: 'number' },
];

export const fmtDT = (v: string | null) => (v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtDate = (v: string | null) => (v ? new Date(v.length === 10 ? `${v}T00:00:00` : v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export interface TyreHistoryData { orders: Row[]; wsr: Row[]; grn: Row[]; mrns: Row[]; gins: Row[]; readings: Row[]; fleets: Row[] }
export async function loadTyreHistory(tyre: string): Promise<TyreHistoryData> {
  const by = async (t: string, col: string) => { const { data } = await supabase.from(t).select('*').eq(col, tyre); return (data ?? []) as Row[]; };
  const [orders, wsrLines, grnLines, mrns, ginTyres, readings, fleets] = await Promise.all([by('fleet_orders', 'tyre_id'), by('wsr_lines', 'issued_tyre_id'), by('grn_lines', 'tyre_id'), by('mrns', 'tyre_id'), by('indent_gin_tyres', 'tyre_id'), by('job_readings', 'tyre_id'), all('fleets', 'fleet_no')]);
  const ids = (rows: Row[], k: string) => [...new Set(rows.map((r) => r[k]).filter(Boolean))];
  const get = async (t: string, list: string[]) => (list.length ? ((await supabase.from(t).select('*').in('id', list)).data ?? []) as Row[] : []);
  const [wsrs, grns, gins] = await Promise.all([get('wsrs', ids(wsrLines, 'wsr_id')), get('grns', ids(grnLines, 'grn_id')), get('indent_gins', ids(ginTyres, 'gin_id'))]);
  return {
    orders, mrns, readings, fleets,
    wsr: wsrLines.map((l) => ({ ...l, wsr: wsrs.find((w) => w.id === l.wsr_id) })),
    grn: grnLines.map((l) => ({ ...l, grn: grns.find((g) => g.id === l.grn_id) })),
    gins: ginTyres.map((l) => ({ ...l, gin: gins.find((g) => g.id === l.gin_id) })),
  };
}
