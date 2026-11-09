import { all, rpc, type Row } from './ops';
import { loadJobs, type JobsCtx } from './jobs';

export type { Row };

/** job codes that are worked as a per-fleet round with readings */
export const ROUND_CODES = ['JOB-001', 'JOB-002', 'JOB-003', 'JOB-004', 'JOB-005', 'JOB-006'] as const;
export const ROUND_LABEL: Record<string, string> = {
  'JOB-001': 'Air Inflation', 'JOB-002': 'Air Inflation · Nitrogen', 'JOB-003': 'Inspection', 'JOB-004': 'Tyre Rotation', 'JOB-005': 'Tyre Discout', 'JOB-006': 'Census',
};
export const CHANGE_CODES = ['JOB-008', 'JOB-009', 'JOB-010', 'JOB-011'];
export const STEP_LABEL: Record<string, string> = { 'JOB-008': 'Removal', 'JOB-011': 'Unsetting', 'JOB-010': 'Setting', 'JOB-009': 'Fitment' };
export const WEAR_PATTERNS = ['Even wear', 'Centre wear', 'Both-shoulder wear', 'One-side shoulder wear', 'Cupping / scalloping', 'Feathering', 'Heel and toe wear', 'Flat spot'];
export const POSITIONS = ['FR', 'FL', 'RRI', 'RRO', 'RLI', 'RLO'];
/** found pressure below target - 15 or above target + 10 is flagged */
export const PSI_LOW = 15;
export const PSI_HIGH = 10;

export interface RoundCtx extends JobsCtx { readings: Row[]; targets: Row[]; checklists: Row[]; norms: Row[]; sizes: Row[] }
export async function loadRound(): Promise<RoundCtx> {
  const [base, readings, targets, checklists, norms, sizes] = await Promise.all([
    loadJobs(), all('job_readings', 'recorded_at'), all('v_tyre_psi_target', 'tyre_id'), all('card_checklists', 'updated_at'), all('psi_norms', 'created_at'), all('tyre_sizes', 'size_code'),
  ]);
  return { ...base, readings, targets, checklists, norms, sizes };
}

export const jobCode = (c: JobsCtx, j: Row) => c.jobs.find((x) => x.id === j.job_code_id)?.job_code as string | undefined;

/** status text of a fleet card for a Tyre Man's list: Done, n/6, Not started, Rework, On hold */
export function fleetStatus(c: RoundCtx, cardId: string, mine?: string): { label: string; tone: 'green' | 'amber' | 'slate' | 'red' | 'blue' } {
  const jobs = c.jobIds.filter((j) => j.job_card_id === cardId && (!mine || c.assignees.some((a) => a.job_id_ref === j.id && a.employee_id === mine)));
  if (jobs.length === 0) return { label: '—', tone: 'slate' };
  const open = jobs.filter((j) => !['DONE', 'CLOSED'].includes(j.status));
  if (open.length === 0) return { label: 'Done', tone: 'green' };
  if (jobs.some((j) => j.rework_of && open.includes(j))) return { label: 'Rework', tone: 'red' };
  if (open.some((j) => j.on_hold)) return { label: 'On hold', tone: 'amber' };
  const code = jobCode(c, jobs[0]);
  const done = jobs.filter((j) => {
    const r = c.readings.find((x) => x.job_id_ref === j.id);
    if (!r) return false;
    if (code === 'JOB-001' || code === 'JOB-002') return r.inflated_psi != null;
    if (code === 'JOB-003') return r.checked;
    if (code === 'JOB-006') return r.nsd_mm != null;
    return r.odometer_km != null;
  }).length;
  if (done === 0 && open.every((j) => j.status === 'ASSIGNED')) return { label: 'Not started', tone: 'slate' };
  return { label: `${done}/${jobs.length}`, tone: 'blue' };
}

export const saveReading = (job: string, data: Record<string, unknown>) => rpc('reading_save', { p_job: job, p_data: data });
export const completeFleet = (card: string, checklist: Record<string, string> | null, remarks: string) => rpc<number>('fleet_round_complete', { p_card: card, p_checklist: checklist, p_remarks: remarks || null });
export const holdJob = (job: string, remarks: string) => rpc('job_hold', { p_job: job, p_remarks: remarks });
export const resumeJob = (job: string) => rpc('job_resume', { p_job: job });

export function psiFlag(present: number | null, target: number | null): 'LOW' | 'HIGH' | null {
  if (present == null || target == null || Number.isNaN(present)) return null;
  return present < target - PSI_LOW ? 'LOW' : present > target + PSI_HIGH ? 'HIGH' : null;
}
