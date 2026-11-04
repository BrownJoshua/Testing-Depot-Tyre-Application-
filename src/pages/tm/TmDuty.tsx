import { useEffect, useState } from 'react';
import { addDaysIso, getBusinessToday, loadRoster, type RosterCtx } from '../../lib/ops';
import { Banner } from '../../components/ui';

const dayLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });
const hhmm = (t: string) => t.slice(0, 5);

/** Tyre Man: Duty & Shift. Shows only your own duties from rosters your Supervisor has posted. */
export function TmDuty() {
  const [ctx, setCtx] = useState<RosterCtx | null>(null);
  const [today, setToday] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { Promise.all([loadRoster(), getBusinessToday()]).then(([c, t]) => { setCtx(c); setToday(t); }).catch((e: Error) => setError(e.message)); }, []);

  const until = today ? addDaysIso(today, 13) : '';
  const mine = (ctx?.entries ?? []).filter((e) => e.duty_date >= today && e.duty_date <= until).sort((a, b) => a.duty_date.localeCompare(b.duty_date));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Duty &amp; Shift</h1>
      <p className="text-sm text-slate-600">Your duties for the next two weeks, from posted rosters.</p>
      {error && <Banner kind="error">{error}</Banner>}
      {!ctx && !error && <p className="text-slate-500">Loading…</p>}
      {ctx && mine.length === 0 && <Banner kind="info">No duty has been posted for you in the next two weeks.</Banner>}
      {mine.map((e) => {
        const shift = ctx?.shifts.find((s) => s.id === e.shift_id);
        return (
          <div key={`${e.roster_id}${e.duty_date}`} className={`flex items-center justify-between rounded-xl border bg-white p-4 ${e.duty_date === today ? 'border-blue-400' : 'border-slate-200'}`}>
            <div>
              <div className="font-semibold text-slate-900">{dayLabel(e.duty_date)}</div>
              {e.duty_date === today && <div className="text-xs font-semibold text-blue-700">Today</div>}
            </div>
            <div className="text-right">
              <div className="font-semibold text-slate-900">{shift ? shift.shift_name : 'Off'}</div>
              {shift && <div className="text-xs text-slate-500">{hhmm(shift.start_time)}–{hhmm(shift.end_time)}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
