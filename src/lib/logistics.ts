import { all, rpc, type Row } from './ops';

export type { Row };

export const IND_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', AWAITING_APPROVAL: 'Awaiting approval', REVERTED: 'Reverted', SENT: 'Sent', ACCEPTED: 'Accepted', REJECTED: 'Rejected', CANCELLED: 'Cancelled', IN_TRANSIT: 'In transit', RECEIVED: 'Received',
};
export const GIN_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', AWAITING_APPROVAL: 'Awaiting approval', REVERTED: 'Reverted', APPROVED: 'Approved', REJECTED: 'Rejected', IN_TRANSIT: 'In transit', RECEIVED: 'Received', CANCELLED: 'Cancelled',
};
export const GP_STATUS_LABEL: Record<string, string> = { ISSUED: 'Issued', EXITED: 'Exited', RECEIVED: 'Received', CANCELLED: 'Cancelled' };
export const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700', AWAITING_APPROVAL: 'bg-amber-100 text-amber-800', REVERTED: 'bg-orange-100 text-orange-800', SENT: 'bg-blue-100 text-blue-800', ACCEPTED: 'bg-teal-100 text-teal-800',
  APPROVED: 'bg-green-100 text-green-800', REJECTED: 'bg-red-100 text-red-800', CANCELLED: 'bg-slate-200 text-slate-600', IN_TRANSIT: 'bg-purple-100 text-purple-800', RECEIVED: 'bg-green-100 text-green-800',
  ISSUED: 'bg-blue-100 text-blue-800', EXITED: 'bg-purple-100 text-purple-800',
};

export interface LogCtx { indents: Row[]; gins: Row[]; ginTyres: Row[]; gatePasses: Row[]; grns: Row[]; units: Row[]; tyres: Row[]; sizes: Row[]; staff: Row[]; myOrg: string }
export async function loadLogistics(myOrg: string): Promise<LogCtx> {
  const [indents, gins, ginTyres, gatePasses, grns, units, tyres, sizes, staff] = await Promise.all([
    all('indents', 'created_at', false), all('indent_gins', 'created_at', false), all('indent_gin_tyres', 'tyre_id'), all('gate_passes', 'created_at', false), all('grns', 'received_at', false),
    all('org_units', 'sort_order'), all('tyres', 'mtc_no'), all('tyre_sizes', 'size_code'), all('employees', 'employee_code'),
  ]);
  return { indents, gins, ginTyres, gatePasses, grns, units, tyres, sizes, staff, myOrg };
}

export const createIndent = (type: string, to: string, size: string | null, qty: number, requiredFor: string, remarks: string) =>
  rpc<string>('indent_create', { p_type: type, p_to: to, p_size: size, p_qty: qty, p_required_for: requiredFor || null, p_remarks: remarks || null });
export const indentAct = (id: string, action: string, note?: string) => rpc('indent_act', { p_indent: id, p_action: action, p_note: note ?? null });
export const createGin = (to: string, tyres: string[], reason: string, indent: string | null) => rpc<string>('gin_create', { p_to: to, p_tyres: tyres, p_reason: reason || null, p_indent: indent });
export const ginAct = (id: string, action: string, note?: string) => rpc('gin_act', { p_gin: id, p_action: action, p_note: note ?? null });
export const createGatePass = (gin: string, kind: string, vehicle: string, driver: string) => rpc<string>('gate_pass_create', { p_gin: gin, p_vehicle_kind: kind, p_vehicle_no: vehicle, p_driver: driver });
export const gatePassAct = (id: string, action: string, note?: string) => rpc('gate_pass_act', { p_gp: id, p_action: action, p_note: note ?? null });
export const receiveIndentGin = (gin: string, results: { tyre_id: string; accept: boolean; reason?: string }[]) => rpc<string>('grn_receive_gin', { p_gin: gin, p_results: results });
export const rejectWsr = (id: string, reason: string) => rpc('wsr_reject', { p_wsr: id, p_reason: reason });
export const cancelWsr = (id: string, reason: string) => rpc('wsr_cancel', { p_wsr: id, p_reason: reason });
