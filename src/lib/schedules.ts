/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';
import { all, rpc, type Row } from './ops';

export type { Row };

export const STATE_LABEL: Record<string, string> = { ON_TIME: 'On time', DELAYED: 'Delayed', OVERDUE: 'Overdue', PENDING: 'Pending', ASSIGNED: 'Assigned' };
export const STATE_STYLE: Record<string, string> = {
  ON_TIME: 'bg-green-100 text-green-800', DELAYED: 'bg-amber-100 text-amber-800', OVERDUE: 'bg-red-100 text-red-800',
  PENDING: 'bg-slate-100 text-slate-700', ASSIGNED: 'bg-blue-100 text-blue-800',
};
const DAYS = (d: number[]) => d.map((n) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`).join(' and ');

/** "every 2 days", "15th and 30th of the month", "every 120 days or 10,000 km (Operated KM), whichever is first" */
export function frequencyText(s: Row): string {
  const date = s.particular_days?.length ? `${DAYS(s.particular_days)} of the month` : s.every_n_days ? `every ${s.every_n_days} day${s.every_n_days === 1 ? '' : 's'}` : '';
  const km = s.every_km ? `every ${Number(s.every_km).toLocaleString('en-IN')} km${s.km_basis ? ` (${s.km_basis.toLowerCase().replace('_', ' ')} KM)` : ''}` : '';
  return s.frequency_kind === 'DATE_KM' ? `${date} or ${km}, whichever is first` : s.frequency_kind === 'KM' ? km : date;
}

export interface PlannerCtx { schedules: Row[]; runs: Row[]; fleets: Row[]; shifts: Row[]; staff: Row[]; groups: Row[]; revisions: Row[]; members: Row[]; jobs: Row[]; today: string }
export async function loadPlanner(): Promise<PlannerCtx> {
  const [schedules, runs, fleets, shifts, groups, revisions, members, jobs, staff, today] = await Promise.all([
    all('maintenance_schedules', 'schedule_code'), all('schedule_runs', 'created_at', false), all('fleets', 'fleet_no'), all('shifts', 'start_time'),
    all('fleet_groups', 'created_at'), all('fleet_group_revisions', 'submitted_at', false), all('fleet_group_revision_members', 'fleet_id'), all('maintenance_jobs', 'job_code'),
    supabase.from('employees').select('id, employee_code, full_name, role_code').in('role_code', ['TM', 'TIC']).eq('status', 'ACTIVE').order('employee_code').then(({ data }) => (data ?? []) as Row[]),
    rpc<string>('get_business_today', {}),
  ]);
  return { schedules, runs, fleets, shifts, staff, groups, revisions, members, jobs, today };
}
export async function loadChart(runId: string): Promise<Row[]> {
  const { data, error } = await supabase.from('v_schedule_chart').select('*').eq('run_id', runId).order('due_date').order('fleet_no').range(0, 999);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

export const createRun = (schedule: string, from: string, to: string, fleets: string[] | null) => rpc<string>('schedule_run_create', { p_schedule: schedule, p_from: from, p_to: to, p_fleets: fleets });
export const assignTechnician = (run: string, items: string[], employees: string[], due: string | null, shift: string | null, remarks: string) =>
  rpc<number>('schedule_assign', { p_run: run, p_items: items, p_employees: employees, p_due: due, p_shift: shift, p_remarks: remarks || null });
export const moveItem = (item: string, date: string, reason: string) => rpc('schedule_item_move', { p_item: item, p_new_date: date, p_reason: reason });
