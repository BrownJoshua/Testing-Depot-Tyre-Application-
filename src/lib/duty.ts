import { supabase } from './supabase';
import { all, rpc, type Row } from './ops';

export type { Row };

export interface DutyCtx { roster: Row[]; postings: Row[]; shifts: Row[]; schedules: Row[]; jobs: Row[]; staff: Row[]; today: string }
export async function loadDuty(): Promise<DutyCtx> {
  const page = async (t: string, order: string) => {            // the roster has thousands of rows: read it in pages of 1000
    const out: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(t).select('*').order(order).range(from, from + 999);
      if (error) throw new Error(error.message);
      out.push(...(data as Row[]));
      if ((data?.length ?? 0) < 1000) break;
    }
    return out;
  };
  const [roster, postings, shifts, schedules, jobs, staff, today] = await Promise.all([
    page('hrms_roster', 'duty_date'), page('duty_postings', 'duty_date'), all('shifts', 'start_time'), all('maintenance_schedules', 'schedule_code'), all('maintenance_jobs', 'job_code'),
    supabase.from('employees').select('id, employee_code, full_name, role_code').in('role_code', ['TM', 'TIC']).eq('status', 'ACTIVE').order('employee_code').then(({ data }) => (data ?? []) as Row[]),
    rpc<string>('get_business_today', {}),
  ]);
  return { roster, postings, shifts, schedules, jobs, staff, today };
}
export const SHIFT_SHORT: Record<string, string> = { MORNING: 'AM', GENERAL: 'GEN', EVENING: 'PM', NIGHT: 'NT' };
export const postDuty = (employees: string[], schedule: string | null, job: string | null, days: string[], shift: string | null) =>
  rpc<number>('duty_post', { p_employees: employees, p_schedule: schedule, p_job: job, p_days: days, p_shift: shift });
export const unpostDuty = (employees: string[], schedule: string | null, job: string | null, days: string[]) =>
  rpc<number>('duty_unpost', { p_employees: employees, p_schedule: schedule, p_job: job, p_days: days });
