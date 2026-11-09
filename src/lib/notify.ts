import { all, rpc, type Row } from './ops';

export type { Row };

export const loadFeed = () => rpc<Row[]>('notification_feed', {});
export const markRead = (ids: string[] | null) => rpc<number>('notification_mark_read', { p_ids: ids });

export const requestReschedule = (card: string, date: string, reason: string) => rpc<string>('reschedule_request', { p_card: card, p_new_date: date, p_reason: reason });
export const decideReschedule = (id: string, approve: boolean, remarks: string) => rpc('reschedule_decide', { p_request: id, p_approve: approve, p_remarks: remarks || null });
export const loadReschedules = () => all('reschedule_requests', 'created_at', false);

/** employee ids posted to a Schedule Code or a Job Code on a day and really on duty then */
export async function postedFor(schedule: string | null, jobCode: string | null, date: string, shift: string | null): Promise<string[]> {
  const rows = await rpc<Row[]>('duty_posted_for', { p_schedule: schedule, p_job_code: jobCode, p_date: date, p_shift: shift });
  return (rows ?? []).map((r) => r.employee_id);
}
export const assignFromDuty = (run: string, items: string[], due: string | null, shift: string | null, remarks: string) =>
  rpc<number>('schedule_assign_auto', { p_run: run, p_items: items, p_due: due, p_shift: shift, p_remarks: remarks || null });
export const moveFromAbsent = (date: string) => rpc<{ moved: number; unresolved: number }>('duty_move_absent', { p_date: date });
