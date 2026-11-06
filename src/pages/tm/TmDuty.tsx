import { useEffect, useState } from 'react';
import { loadDuty, SHIFT_SHORT, type DutyCtx } from '../../lib/duty';
import { addDaysIso } from '../../lib/ops';
import { Banner } from '../../components/ui';

const dayLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });
const hhmm = (t: string) => t.slice(0, 5);

/** Tyre Man: Duty & Shift. Your own HRMS roster for the next two weeks and what the Tyre IC has posted you to. */
export function TmDuty() {
  const [ctx, setCtx] = useState<DutyCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { loadDuty().then(setCtx).catch((e: Error) => setError(e.message)); }, []);

  const today = ctx?.today ?? '';
  const days = today ? Array.from({ length: 14 }, (_, i) => addDaysIso(today, i)) : [];
  const postedFor = (d: string) => (ctx?.postings ?? []).filter((p) => p.duty_date === d)
    .map((p) => p.schedule_id ? ctx?.schedules.find((s) => s.id === p.schedule_id)?.schedule_name : ctx?.jobs.find((j) => j.id === p.job_code_id)?.job_name).filter(Boolean);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-slate-900">Duty &amp; Shift</h1>
      <p className="text-sm text-slate-600">Your duty roster for the next two weeks, and the work the Tyre IC has posted you to.</p>
      {error && <Banner kind="error">{error}</Banner>}
      {!ctx && !error && <p className="text-slate-500">Loading…</p>}
      {ctx && days.map((d) => {
        const r = ctx.roster.find((x) => x.duty_date === d);
        const shift = ctx.shifts.find((s) => s.id === r?.shift_id);
        const posted = postedFor(d);
        return (
          <div key={d} className={`rounded-xl border bg-white p-4 ${d === today ? 'border-blue-400' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div><div className="font-semibold text-slate-900">{dayLabel(d)}</div>{d === today && <div className="text-xs font-semibold text-blue-700">Today</div>}</div>
              <div className="text-right"><div className="font-semibold text-slate-900">{!r ? '—' : r.kind === 'WO' ? 'Weekly off' : r.kind === 'L' ? 'Leave' : shift?.shift_name}</div>
                {shift && <div className="text-xs text-slate-500">{SHIFT_SHORT[shift.shift_code]} · {hhmm(shift.start_time)}–{hhmm(shift.end_time)}</div>}</div>
            </div>
            {posted.length > 0 && <div className="mt-2 text-sm text-slate-700">Posted: {posted.join(', ')}</div>}
          </div>
        );
      })}
    </div>
  );
}
