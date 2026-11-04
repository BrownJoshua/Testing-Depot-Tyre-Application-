import { supabase } from './supabase';

export type RequestStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type MasterAction = 'CREATE' | 'UPDATE' | 'DEACTIVATE' | 'REACTIVATE';

export interface RefValue { id: string; code: string; label: string }

export interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  vendor_category_ref: string;
  contact_person: string | null;
  address_text: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone_demo: string | null;
  email_demo: string | null;
  gstin: string | null;
  is_demo: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  row_version: number;
  created_at: string;
}

export interface VendorContact {
  id: string;
  vendor_id: string;
  contact_name: string;
  designation: string | null;
  phone_demo: string | null;
  email_demo: string | null;
  is_primary: boolean;
}

export interface ChangeRequest {
  id: string;
  request_no: string;
  entity_type: string;
  target_id: string;
  action: MasterAction;
  status: RequestStatus;
  proposed_payload: Record<string, unknown>;
  change_summary: string | null;
  maker_id: string;
  submitted_at: string | null;
  decided_at: string | null;
  decision_remarks: string | null;
  created_at: string;
}

export interface HistoryRow {
  id: number;
  seq: number;
  action: string;
  to_status: RequestStatus;
  remarks: string | null;
  at: string;
}

/** Turn a database error into a sentence a person can act on. */
export function friendlyError(message: string): string {
  const m = message.replace(/^.*?ERROR:\s*/, '');
  if (/permission denied|insufficient_privilege/i.test(m)) return 'You are not allowed to do this.';
  if (/mcr_one_open_per_target/i.test(m)) return 'This record already has an open change request. Withdraw or finish it first.';
  if (/duplicate key|already exists/i.test(m)) return m;
  // "waits for the previous step (TYRE_UNSETTING)" -> "(Tyre Unsetting)"
  if (/previous step \(/.test(m)) return m.replace(/\(([A-Z_]+)\)/, (_, c: string) => `(${c.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')})`);
  return m || 'Something went wrong. Please try again.';
}

export async function listCategories(): Promise<RefValue[]> {
  const { data, error } = await supabase.from('ref_values').select('id, code, label')
    .eq('list_code', 'vendor_category').eq('status', 'ACTIVE').order('sort_order');
  if (error) throw new Error(error.message);
  return data as RefValue[];
}

export async function listVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase.from('vendors').select('*').order('vendor_code');
  if (error) throw new Error(error.message);
  return data as Vendor[];
}

export async function listVendorContacts(vendorId: string): Promise<VendorContact[]> {
  const { data, error } = await supabase.from('vendor_contacts').select('*').eq('vendor_id', vendorId).order('created_at');
  if (error) throw new Error(error.message);
  return data as VendorContact[];
}

export async function listRequests(statuses?: RequestStatus[]): Promise<ChangeRequest[]> {
  let q = supabase.from('master_change_requests').select('*').order('created_at', { ascending: false });
  if (statuses) q = q.in('status', statuses);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as ChangeRequest[];
}

export async function listHistory(requestId: string): Promise<HistoryRow[]> {
  const { data, error } = await supabase.from('master_change_request_history')
    .select('id, seq, action, to_status, remarks, at').eq('request_id', requestId).order('seq');
  if (error) throw new Error(error.message);
  return data as HistoryRow[];
}

async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(friendlyError(error.message));
  return data as T;
}

export const createRequest = (entity: string, action: MasterAction, target: string | null,
                              payload: Record<string, unknown>, summary: string) =>
  rpc<string>('master_request_create', { p_entity: entity, p_action: action, p_target: target, p_payload: payload, p_summary: summary });
export const updateRequest = (id: string, payload: Record<string, unknown>, summary: string) =>
  rpc('master_request_update', { p_id: id, p_payload: payload, p_summary: summary });
export const submitRequest = (id: string) => rpc('master_request_submit', { p_id: id });
export const withdrawRequest = (id: string, remarks: string) => rpc('master_request_withdraw', { p_id: id, p_remarks: remarks });
export const approveRequest = (id: string, remarks: string) => rpc('master_request_approve', { p_id: id, p_remarks: remarks || null });
export const rejectRequest = (id: string, remarks: string) => rpc('master_request_reject', { p_id: id, p_remarks: remarks });

export const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
