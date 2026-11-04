import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { addDaysIso, createScheduleCards, getBusinessToday, loadPlanner, refreshPlanner, type Row } from '../lib/ops';
import { Banner, btnPlain, btnPrimary, cardCls, inputCls, PageHeader } from '../components/ui';

const STATE_STYLE: Record<string, string> = {
  PLANNED: 'bg-slate-100 text-slate-700', JOB_CREATED: 'bg-blue-100 text-blue-800', COMPLETED: 'bg-green-100 text-green-800', OVERDUE: 'bg-red-100 text-red-800',
};
const STATE_LABEL: Record<string, string> = { PLANNED: 'Planned', JOB_CREATED: 'Job card created', COMPLETED: 'Completed', OVERDUE: 'Overdue' };

/** Schedule Planner: what is due from the approved groups, and turning it into job cards. */
export function SchedulePlanner() {
  const { me } = useAuth();
  const isTic = me?.role_code === 'TIC';
  const base = me?.role_code === 'SUP' ? '/sup' : '/tic';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [items, setItems] = useState<Row[] | null>(null);
  const [schedule, setSchedule] = useState('');
  const [state, setState] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { loadPlanner().then((r) => setItems(r.items)).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);
  // the default range is around the business date (the demo date), not the device clock
  useEffect(() => { getBusinessToday().then((t) => { setFrom(addDaysIso(t, -7)); setTo(addDaysIso(t, 14)); }).catch((e: Error) => setError(e.message)); }, []);

  const rows = useMemo(() => (items ?? []).filter((i) => (!from || i.due_date >= from) && (!to || i.due_date <= to) && (!schedule || i.schedule_code === schedule) && (!state || i.state === state)), [items, from, to, schedule, state]);
  const schedules = [...new Set((items ?? []).map((i) => i.schedule_code as string))];
  const raisable = rows.filter((r) => r.state === 'PLANNED' || r.state === 'OVERDUE');
  const perDay = useMemo(() => { const m = new Map<string, number>(); for (const r of rows) m.set(r.due_date, (m.get(r.due_date) ?? 0) + 1); return [...m.entries()]; }, [rows]);

  async function run(fn: () => Promise<unknown>, ok: (r: unknown) => string) {
    setBusy(true); setError(null); setNotice(null);
    try { const r = await fn(); setNotice(ok(r)); setPicked([]); load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Schedule Planner" subtitle="Items come from approved fleet groups. Refresh the range to list what is due, then create job cards for the ones you choose." />
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}
      <div className={`${cardCls} flex flex-wrap items-end gap-3 p-4`}>
        <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">From</span><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">To</span><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Schedule</span>
          <select className={inputCls} value={schedule} onChange={(e) => setSchedule(e.target.value)}><option value="">All</option>{schedules.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">State</span>
          <select className={inputCls} value={state} onChange={(e) => setState(e.target.value)}><option value="">All</option>{Object.entries(STATE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        {isTic && <button className={btnPlain} disabled={busy || !from || !to} onClick={() => void run(() => refreshPlanner(from, to), (n) => `${n} new due item${n === 1 ? '' : 's'} listed.`)}>Refresh due items</button>}
      </div>

      {perDay.length > 0 && <p className="text-sm text-slate-600">{perDay.length} day{perDay.length === 1 ? '' : 's'} with work · {rows.length} item{rows.length === 1 ? '' : 's'} · {rows.filter((r) => r.state === 'OVERDUE').length} overdue</p>}

      {isTic && (
        <div className="flex flex-wrap items-center gap-3">
          <button className={btnPrimary} disabled={busy || picked.length === 0} onClick={() => void run(() => createScheduleCards(picked), (n) => `${n} job card${n === 1 ? '' : 's'} created.`)}>Create job cards ({picked.length})</button>
          <button className={btnPlain} onClick={() => setPicked(picked.length === raisable.length ? [] : raisable.map((r) => r.id))}>{picked.length === raisable.length && picked.length > 0 ? 'Clear selection' : 'Select all without a card'}</button>
        </div>
      )}

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>{isTic && <th className="w-10 px-4 py-2" />}<th className="px-4 py-2">Due</th><th className="px-4 py-2">Schedule</th><th className="px-4 py-2">Group</th><th className="px-4 py-2">Fleet</th><th className="px-4 py-2">Job card</th><th className="px-4 py-2">State</th></tr>
          </thead>
          <tbody>
            {!items && !error && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {items && rows.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Nothing due in this range. {isTic && 'Press “Refresh due items”.'}</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                {isTic && <td className="px-4 py-2">{(r.state === 'PLANNED' || r.state === 'OVERDUE') &&
                  <input type="checkbox" aria-label={`Select ${r.fleet_no} ${r.due_date}`} checked={picked.includes(r.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, r.id] : picked.filter((x) => x !== r.id))} />}</td>}
                <td className="px-4 py-2 font-medium">{r.due_date}</td>
                <td className="px-4 py-2">{r.schedule_code}</td>
                <td className="px-4 py-2">{r.group_name}</td>
                <td className="px-4 py-2">{r.fleet_no}</td>
                <td className="px-4 py-2">{r.job_card_no ? <Link className="text-blue-700 underline" to={`${base}/job-cards/${r.job_card_id}`}>{r.job_card_no}</Link> : '—'}</td>
                <td className="px-4 py-2"><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE_STYLE[r.state]}`}>{STATE_LABEL[r.state]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
