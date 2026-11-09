/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';
import { friendlyError } from './masters';
import { all, rpc, type Row } from './ops';

export type { Row };

export const JC_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', ASSIGNED_FOR_INSPECTION: 'Assigned for inspection', INSPECTION_DONE: 'Inspection done', ASSIGNED_FOR_WORK: 'Assigned for work',
  FINAL_INSPECTION: 'Final inspection', FINAL_INSPECTION_FAILED: 'Final inspection failed', COMPLETED: 'Completed', CLOSED: 'Closed',
  // Job ID and complaint states share the badge
  PENDING: 'Not assigned', LOCKED: 'Locked', WAITING_FOR_TYRE: 'Waiting for tyre', ASSIGNED: 'Assigned', STARTED: 'Started', DONE: 'Done',
  NEW: 'New', PENDING_INSPECTION: 'Pending inspection', APPROVED: 'Approved', REJECTED: 'Rejected',
};
export const JC_STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700', ASSIGNED_FOR_INSPECTION: 'bg-sky-100 text-sky-800', INSPECTION_DONE: 'bg-teal-100 text-teal-800',
  ASSIGNED_FOR_WORK: 'bg-blue-100 text-blue-800', FINAL_INSPECTION: 'bg-purple-100 text-purple-800', FINAL_INSPECTION_FAILED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800', CLOSED: 'bg-slate-200 text-slate-600',
  PENDING: 'bg-slate-100 text-slate-700', LOCKED: 'bg-slate-200 text-slate-600', WAITING_FOR_TYRE: 'bg-orange-100 text-orange-800', ASSIGNED: 'bg-blue-100 text-blue-800',
  STARTED: 'bg-amber-100 text-amber-800', DONE: 'bg-green-100 text-green-800',
  NEW: 'bg-blue-100 text-blue-800', PENDING_INSPECTION: 'bg-sky-100 text-sky-800', APPROVED: 'bg-green-100 text-green-800', REJECTED: 'bg-red-100 text-red-800',
};
export const SOURCE_LABEL: Record<string, string> = { TYRE_MAN: 'Tyre Man', LOG_SHEET: 'Driver log sheet', TYRE_IC: 'Tyre Incharge', INSPECTION: 'Inspection' };
export const TYPE_LABEL: Record<string, string> = { COMPLAINT: 'Complaint', JOB_CODE: 'Job Code', SCHEDULE: 'Schedule' };
export const ONGOING = ['ASSIGNED_FOR_INSPECTION', 'INSPECTION_DONE', 'ASSIGNED_FOR_WORK', 'FINAL_INSPECTION', 'FINAL_INSPECTION_FAILED'];

/** Everything the depot job screens need. Row-level security already limits it to what the caller may see. */
export interface JobsCtx {
  fleets: Row[]; tyres: Row[]; complaintTypes: Row[]; typeJobs: Record<string, string[]>; complaints: Row[]; cards: Row[]; jobIds: Row[];
  assignees: Row[]; inspections: Row[]; staff: Row[]; shifts: Row[]; jobs: Row[]; today: string;
}
export async function loadJobs(): Promise<JobsCtx> {
  const [fleets, tyres, complaintTypes, links, complaints, cards, jobIds, assignees, inspections, shifts, jobs, staff, today] = await Promise.all([
    all('fleets', 'fleet_no'), all('tyres', 'mtc_no'), all('complaint_types', 'complaint_code'), all('complaint_type_jobs', 'job_id'),
    all('complaints', 'raised_at', false), all('job_cards', 'created_at', false), all('job_ids', 'job_id_no'), all('job_id_assignees', 'employee_id'),
    all('inspections', 'created_at', false), all('shifts', 'start_time'), all('maintenance_jobs', 'job_code'),
    supabase.from('employees').select('id, employee_code, full_name, role_code, org_unit_id, status').in('role_code', ['TM', 'TIC']).eq('status', 'ACTIVE')
      .order('employee_code').then(({ data }) => (data ?? []) as Row[]),
    rpc<string>('get_business_today', {}),
  ]);
  const typeJobs: Record<string, string[]> = {};
  for (const l of links) (typeJobs[l.complaint_type_id] ??= []).push(jobs.find((j) => j.id === l.job_id)?.job_code ?? '');
  return { fleets, tyres, complaintTypes, typeJobs, complaints, cards, jobIds, assignees, inspections, staff, shifts, jobs, today };
}

export async function loadCardDetail(id: string): Promise<{ events: Row[]; finals: Row[]; workAssignments: Row[] }> {
  const get = (t: string, col: string) => supabase.from(t).select('*').eq('job_card_id', id).order(col).then((r) => (r.data ?? []) as Row[]);
  const [events, finals, workAssignments] = await Promise.all([get('job_card_events', 'created_at'), get('final_inspections', 'inspected_at'), get('work_assignments', 'created_at')]);
  return { events, finals, workAssignments };
}

/** whole days between two ISO dates (b - a) */
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
export const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `${m} min`);

export const raiseComplaint = (fleet: string, tyre: string | null, type: string, remarks: string, photo?: string | null, logSheet?: Row) =>
  rpc<string>('raise_complaint', { p_fleet: fleet, p_tyre: tyre, p_type: type, p_remarks: remarks || null, p_photo: photo ?? null, p_log_sheet: logSheet ?? null });
export interface NewCard {
  type: 'COMPLAINT' | 'JOB_CODE'; fleet: string | null; tyres: string[]; jobCodes: string[]; complaints: string[];
  newComplaints: { tyre_id: string | null; complaint_type_id: string; remarks: string }[]; expected: string | null; shift: string | null; instruction: string;
}
export const createCard = (c: NewCard) => rpc<string>('job_card_create', {
  p_type: c.type, p_fleet: c.fleet, p_tyres: c.tyres, p_job_codes: c.jobCodes, p_complaints: c.complaints, p_new_complaints: c.newComplaints,
  p_expected: c.expected, p_shift: c.shift, p_instruction: c.instruction || null,
});
export const assignInspection = (card: string, inspector: string, due: string | null, shift: string | null, remarks: string) =>
  rpc<string>('job_card_assign_inspection', { p_card: card, p_inspector: inspector, p_due: due, p_shift: shift, p_remarks: remarks || null });
export interface Decision { complaint_id: string; approve: boolean; reason?: string; job_codes?: string[] }
export interface FoundComplaint { tyre_id: string | null; complaint_type_id: string; remarks: string; job_codes?: string[] }
export const decideInspection = (inspection: string, decisions: Decision[], found: FoundComplaint[], remarks: string) =>
  rpc('inspection_decide', { p_inspection: inspection, p_decisions: decisions, p_new: found, p_remarks: remarks || null });
export const reinspectComplaint = (id: string) => rpc('complaint_reinspect', { p_complaint: id });
export const closeComplaint = (id: string, remarks: string) => rpc('complaint_close', { p_complaint: id, p_remarks: remarks || null });
export const assignWork = (card: string, employees: string[], per: Record<string, string[]> | null, due: string | null, shift: string | null, remarks: string) =>
  rpc('job_card_assign_work', { p_card: card, p_employees: employees, p_per: per, p_due: due, p_shift: shift, p_source: 'MTC', p_remarks: remarks || null });
export const startJobId = (id: string) => rpc('job_id_start', { p_job: id });
export const completeJobId = (id: string, onBehalfReason: string | null) => rpc('job_id_complete', { p_job: id, p_on_behalf_reason: onBehalfReason });
export type ChecklistAnswer = { item: string; pass: boolean };
export const finalInspect = (card: string, result: 'PASS' | 'FAIL' | 'REWORK', remarks: string, reworkJobs: string[], checklist: ChecklistAnswer[] | null = null) =>
  rpc('final_inspection', { p_card: card, p_result: result, p_remarks: remarks || null, p_rework_jobs: reworkJobs, p_checklist: checklist });
export const finalInspectSelected = (cards: string[], result: 'PASS' | 'FAIL', remarks: string, checklist: ChecklistAnswer[] | null) =>
  rpc<number>('final_inspection_selected', { p_cards: cards, p_result: result, p_remarks: remarks || null, p_checklist: checklist });

/** the Final Inspection Master checklist that applies to a card (by its Schedule Code, or by the Job Codes of its Job IDs) */
export async function loadFimForCard(cardId: string): Promise<Row | null> {
  const [fims, chart, jobs] = await Promise.all([
    all('fim_checklists', 'fim_code'),
    supabase.from('v_schedule_chart').select('schedule_code').eq('job_card_id', cardId).limit(1).then((r) => (r.data ?? []) as Row[]),
    supabase.from('job_ids').select('job_code_id').eq('job_card_id', cardId).then((r) => (r.data ?? []) as Row[]),
  ]);
  const codes: string[] = chart.map((c) => c.schedule_code);
  if (jobs.length) {
    const { data } = await supabase.from('maintenance_jobs').select('job_code').in('id', jobs.map((x) => x.job_code_id));
    codes.push(...(data ?? []).map((d: Row) => d.job_code));
  }
  return fims.find((f) => f.status === 'ACTIVE' && f.applies_codes.some((c: string) => codes.includes(c))) ?? null;
}

export { friendlyError };
