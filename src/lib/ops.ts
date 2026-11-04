/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';
import { friendlyError } from './masters';

export type Row = Record<string, any>;

export const WORK_CATEGORY_LABEL: Record<string, string> = {
  AIR_INFLATION: 'Air Inflation', AIR_INFLATION_NITROGEN: 'Air Inflation - Nitrogen', INSPECTION: 'Inspection',
  TYRE_ROTATION: 'Tyre Rotation', TYRE_DISCOUT: 'Tyre Discout', CENSUS: 'Census', TYRE_CHANGING: 'Tyre Changing',
  TYRE_REMOVAL: 'Tyre Removal', TYRE_FITMENT: 'Tyre Fitment', TYRE_SETTING: 'Tyre Setting', TYRE_UNSETTING: 'Tyre Unsetting',
};
/** categories a job card can be raised for (the four chain steps are created inside Tyre Changing) */
export const CARD_CATEGORIES = ['AIR_INFLATION', 'AIR_INFLATION_NITROGEN', 'INSPECTION', 'TYRE_ROTATION', 'TYRE_DISCOUT', 'CENSUS', 'TYRE_CHANGING'];

export const CARD_STATUS_LABEL: Record<string, string> = {
  NOT_ASSIGNED: 'Not assigned', ASSIGNED: 'Assigned', IN_PROGRESS: 'In progress', ON_HOLD: 'On hold', AWAITING_WSR: 'Awaiting WSR',
  AWAITING_FINAL_INSPECTION: 'Awaiting final inspection', REWORK: 'Rework', CLOSED: 'Closed', CANCELLED: 'Cancelled',
  SUBMITTED: 'Submitted', COMPLETED: 'Completed',
  NEW: 'New', REJECTED: 'Rejected',
};
export const CARD_STATUS_STYLE: Record<string, string> = {
  NOT_ASSIGNED: 'bg-slate-100 text-slate-700', ASSIGNED: 'bg-blue-100 text-blue-800', IN_PROGRESS: 'bg-amber-100 text-amber-800',
  ON_HOLD: 'bg-orange-100 text-orange-800', AWAITING_WSR: 'bg-orange-100 text-orange-800',
  AWAITING_FINAL_INSPECTION: 'bg-purple-100 text-purple-800', REWORK: 'bg-red-100 text-red-800',
  CLOSED: 'bg-green-100 text-green-800', CANCELLED: 'bg-slate-200 text-slate-600',
  SUBMITTED: 'bg-purple-100 text-purple-800', COMPLETED: 'bg-green-100 text-green-800',
  NEW: 'bg-blue-100 text-blue-800', REJECTED: 'bg-red-100 text-red-800',
};

async function all(table: string, order: string, ascending = true): Promise<Row[]> {
  const { data, error } = await supabase.from(table).select('*').order(order, { ascending });
  if (error) throw new Error(friendlyError(error.message));
  return data as Row[];
}

/** Everything the depot screens need. Row-level security already limits it to the caller's depot. */
export interface OpsCtx {
  fleets: Row[]; complaintTypes: Row[]; complaints: Row[]; cards: Row[]; tasks: Row[]; staff: Row[];
}
export async function loadOps(): Promise<OpsCtx> {
  const [fleets, complaintTypes, complaints, cards, tasks, staff] = await Promise.all([
    all('fleets', 'fleet_no'), all('complaint_types', 'complaint_code'), all('complaints', 'raised_at', false),
    all('job_cards', 'created_at', false), all('job_tasks', 'seq'), supabase.from('employees').select('id, employee_code, full_name, role_code, org_unit_id, status')
      .in('role_code', ['TM', 'TIC']).eq('status', 'ACTIVE').order('employee_code').then(({ data }) => (data ?? []) as Row[]),
  ]);
  return { fleets, complaintTypes, complaints, cards, tasks, staff };
}

export async function loadCardDetail(id: string): Promise<{ events: Row[]; inspections: Row[]; assignments: Row[] }> {
  const [events, inspections, assignments] = await Promise.all([
    supabase.from('job_card_events').select('*').eq('job_card_id', id).order('created_at').then((r) => (r.data ?? []) as Row[]),
    supabase.from('final_inspections').select('*').eq('job_card_id', id).order('inspected_at').then((r) => (r.data ?? []) as Row[]),
    supabase.from('job_assignments').select('*').order('created_at').then((r) => (r.data ?? []) as Row[]),
  ]);
  return { events, inspections, assignments };
}

async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(friendlyError(error.message));
  return data as T;
}

/** Grouping: groups, their revisions (proposals) and the fleets in each revision. */
export interface GroupingCtx { schedules: Row[]; groups: Row[]; revisions: Row[]; members: Row[]; fleets: Row[]; staff: Row[] }
export async function loadGrouping(): Promise<GroupingCtx> {
  const [schedules, groups, revisions, members, fleets, staff] = await Promise.all([
    all('maintenance_schedules', 'schedule_code'), all('fleet_groups', 'created_at'), all('fleet_group_revisions', 'submitted_at', false),
    all('fleet_group_revision_members', 'fleet_id'), all('fleets', 'fleet_no'),
    supabase.from('employees').select('id, employee_code, full_name').then(({ data }) => (data ?? []) as Row[]),
  ]);
  return { schedules, groups, revisions, members, fleets, staff };
}
export async function loadPlanner(): Promise<{ items: Row[]; schedules: Row[] }> {
  const [items, schedules] = await Promise.all([all('v_schedule_planner', 'due_date'), all('maintenance_schedules', 'schedule_code')]);
  return { items, schedules };
}
export interface RosterCtx { rosters: Row[]; entries: Row[]; shifts: Row[]; staff: Row[] }
export async function loadRoster(): Promise<RosterCtx> {
  const [rosters, entries, shifts, staff] = await Promise.all([
    all('duty_rosters', 'week_start', false), all('duty_roster_entries', 'duty_date'), all('shifts', 'start_time'),
    supabase.from('employees').select('id, employee_code, full_name, role_code, org_unit_id, status').in('role_code', ['TM', 'TIC']).eq('status', 'ACTIVE')
      .order('employee_code').then(({ data }) => (data ?? []) as Row[]),
  ]);
  return { rosters, entries, shifts, staff };
}

/** The business date (demo date in demonstration mode). Never use the device clock for business logic. */
export const getBusinessToday = () => rpc<string>('get_business_today', {});
export const addDaysIso = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const mondayOfIso = (iso: string) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };

export const proposeGroup =(schedule: string, name: string, fleets: string[], firstDate: string, reason: string, group: string | null) =>
  rpc<string>('group_propose', { p_schedule: schedule, p_group_name: name, p_fleets: fleets, p_first_date: firstDate || null, p_reason: reason, p_group: group });
export const withdrawGroup = (revision: string, reason: string) => rpc('group_withdraw', { p_revision: revision, p_reason: reason });
export const decideGroup = (revision: string, approve: boolean, remarks: string) => rpc('group_decide', { p_revision: revision, p_approve: approve, p_remarks: remarks || null });
export const refreshPlanner = (from: string, to: string) => rpc<number>('planner_refresh', { p_from: from, p_to: to });
export const createScheduleCards = (ids: string[]) => rpc<number>('schedule_create_cards', { p_instances: ids });
export const saveRoster = (weekStart: string, entries: { employee_id: string; duty_date: string; shift_code: string | null }[]) =>
  rpc<string>('roster_save', { p_week_start: weekStart, p_entries: entries });
export const submitRoster = (id: string) => rpc('roster_submit', { p_roster: id });
export const decideRoster = (id: string, approve: boolean, remarks: string) => rpc('roster_decide', { p_roster: id, p_approve: approve, p_remarks: remarks || null });

export const raiseComplaint =(fleet: string, position: string | null, type: string, remarks: string, logSheet?: Row) =>
  rpc<string>('raise_complaint', { p_fleet: fleet, p_position: position, p_type: type, p_remarks: remarks, p_log_sheet: logSheet ?? null });
export const rejectComplaint = (id: string, remarks: string) => rpc('complaint_reject', { p_id: id, p_remarks: remarks });
export const createJobCard = (fleet: string, category: string, complaint: string | null, position: string | null, due: string | null, instruction: string) =>
  rpc<string>('job_card_create', { p_fleet: fleet, p_category: category, p_complaint: complaint, p_position: position, p_due: due, p_instruction: instruction || null });
export const assignTask = (task: string, employee: string, due: string | null, reason: string) =>
  rpc('job_task_assign', { p_task: task, p_employee: employee, p_due: due, p_reason: reason || null });
export const cancelCard = (card: string, reason: string) => rpc('job_card_cancel', { p_card: card, p_reason: reason });
export const startTask = (task: string) => rpc('job_task_start', { p_task: task });
export const submitTask = (task: string, onBehalfReason: string | null) => rpc('job_task_submit', { p_task: task, p_on_behalf_reason: onBehalfReason });
export const inspectCard = (card: string, result: 'PASS' | 'FAIL', remarks: string) => rpc('final_inspection', { p_card: card, p_result: result, p_remarks: remarks || null });
