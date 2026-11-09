import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Row } from '../lib/ops';
import { cardCls, inputCls } from './ui';

const CODES = ['SCH001', 'SCH002', 'SCH003', 'SCH004', 'SCH005', 'SCH007'];
const dayName = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** D1 "Scheduled Work": one row per due date, a column per schedule with the fleets due, fleets / job cards totals and a day status. */
export function ScheduledWork({ today }: { today: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [sched, setSched] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    supabase.from('v_schedule_chart').select('schedule_code, schedule_name, fleet_id, fleet_no, due_date, done_date, job_card_id, state').range(0, 4999)
      .then(({ data, error: e }) => { if (e) setError(e.message); else setRows((data ?? []) as Row[]); });
  }, []);

  const days = useMemo(() => {
    const by = new Map<string, Row[]>();
    for (const r of rows ?? []) if (r.due_date.startsWith(month) && (!sched || r.schedule_code === sched)) by.set(r.due_date, [...(by.get(r.due_date) ?? []), r]);
    return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, rs]) => {
      const fleets = new Set(rs.map((r) => r.fleet_id)), cards = new Set(rs.map((r) => r.job_card_id).filter(Boolean));
      const st = rs.every((r) => r.done_date) ? 'Completed' : rs.some((r) => r.state === 'OVERDUE') ? 'Overdue' : rs.every((r) => r.job_card_id) ? 'Assigned' : 'Not Assigned';
      return { date, rs, fleets: fleets.size, cards: cards.size, st };
    }).filter((d) => !status || d.st === status);
  }, [rows, month, sched, status]);

  const cell = (rs: Row[], code: string) => { const x = rs.filter((r) => r.schedule_code === code); if (!x.length) return '—'; const f = [...new Set(x.map((r) => r.fleet_no))]; return f.length <= 2 ? f.join(', ') : `${f.length} fleets`; };
  const tone: Record<string, string> = { Completed: 'bg-green-100 text-green-800', Overdue: 'bg-red-100 text-red-800', Assigned: 'bg-blue-100 text-blue-800', 'Not Assigned': 'bg-slate-100 text-slate-700' };
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Scheduled Work</h2>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
        <input type="month" className={`${inputCls} w-44`} aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <select className={`${inputCls} w-44`} aria-label="Schedule" value={sched} onChange={(e) => setSched(e.target.value)}><option value="">All schedules</option>{CODES.map((c) => <option key={c}>{c}</option>)}</select>
        <select className={`${inputCls} w-40`} aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{Object.keys(tone).map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className={`${cardCls} max-h-96 overflow-auto`}>
        <table className="w-full min-w-[900px] text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">S.No</th><th className="px-3 py-2">Date</th>{CODES.map((c) => <th key={c} className="px-3 py-2">{c}</th>)}<th className="px-3 py-2">Fleets</th><th className="px-3 py-2">Job cards</th><th className="px-3 py-2">Status</th></tr></thead>
          <tbody>
            {!rows && !error && <tr><td colSpan={11} className="px-4 py-4 text-center text-slate-500">Loading…</td></tr>}
            {rows && days.length === 0 && <tr><td colSpan={11} className="px-4 py-4 text-center text-slate-500">No scheduled work in this month. Create a Schedule ID below.</td></tr>}
            {days.map((d, i) => (
              <tr key={d.date} className={`border-t border-slate-100 ${d.date === today ? 'bg-blue-50' : ''}`}>
                <td className="px-3 py-2">{i + 1}</td><td className="whitespace-nowrap px-3 py-2">{dayName(d.date)}{d.date === today && <span className="ml-1 rounded bg-blue-600 px-1.5 text-xs text-white">Today</span>}</td>
                {CODES.map((c) => <td key={c} className="px-3 py-2">{cell(d.rs, c)}</td>)}
                <td className="px-3 py-2">{d.fleets}</td><td className="px-3 py-2">{d.cards}</td><td className="px-3 py-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[d.st]}`}>{d.st}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
