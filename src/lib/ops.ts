/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';
import { friendlyError } from './masters';

export type Row = Record<string, any>;

export async function all(table: string, order: string, ascending = true): Promise<Row[]> {
  const { data, error } = await supabase.from(table).select('*').order(order, { ascending });
  if (error) throw new Error(friendlyError(error.message));
  return data as Row[];
}

export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
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
export const saveRoster = (weekStart: string, entries: { employee_id: string; duty_date: string; shift_code: string | null }[]) =>
  rpc<string>('roster_save', { p_week_start: weekStart, p_entries: entries });
export const submitRoster = (id: string) => rpc('roster_submit', { p_roster: id });
export const decideRoster = (id: string, approve: boolean, remarks: string) => rpc('roster_decide', { p_roster: id, p_approve: approve, p_remarks: remarks || null });
