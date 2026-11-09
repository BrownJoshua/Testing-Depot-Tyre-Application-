import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { frequencyText, loadChart, type Row } from '../lib/schedules';
import { Banner, btnPlain, btnPrimary, cardCls } from './ui';
import { Modal } from './OpsBits';

const csv = (name: string, head: string[], rows: (string | number | null)[][]) => {
  const q = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const url = URL.createObjectURL(new Blob(['﻿' + [head, ...rows].map((r) => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
};
const dayShort = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });

interface Stat { total: number; done: number; assigned: number; pending: number; overdue: number; next: Map<string, { tyres: number; fleets: Set<string> }>; todayFleets: Set<string> }
const BAR: [keyof Pick<Stat, 'done' | 'assigned' | 'overdue' | 'pending'>, string][] = [['done', 'bg-green-500'], ['assigned', 'bg-blue-500'], ['overdue', 'bg-red-500'], ['pending', 'bg-slate-300']];

/**
 * D1 Schedule Chart as cards: Today (the daily charts, with "n of N fleets covered today"), This month (Rotation, Discout, Census with their next due dates)
 * and Earlier days (one compact row each). Each card shows a status bar and Total / Completed / Assigned / Pending / Overdue.
 */
export function ScheduleCards({ runs, schedules, today, fleetCount, isTic, openId, onOpen }: { runs: Row[]; schedules: Row[]; today: string; fleetCount: number; isTic: boolean; openId: string | null; onOpen: (id: string) => void }) {
  const [items, setItems] = useState<Row[] | null>(null);
  const [pendingOnly, setPendingOnly] = useState(false);
  useEffect(() => {
    supabase.from('v_schedule_chart').select('run_id, fleet_id, tyre_id, due_date, done_date, state').range(0, 4999).then((r) => setItems((r.data ?? []) as Row[]));
  }, [runs.length]);

  const sched = (id: string) => schedules.find((s) => s.id === id);
  const stat = useMemo(() => {
    const m = new Map<string, Stat>();
    for (const i of items ?? []) {
      const s = m.get(i.run_id) ?? { total: 0, done: 0, assigned: 0, pending: 0, overdue: 0, next: new Map(), todayFleets: new Set<string>() };
      s.total++;
      if (i.state === 'ON_TIME' || i.state === 'DELAYED') s.done++; else if (i.state === 'ASSIGNED') s.assigned++; else if (i.state === 'OVERDUE') s.overdue++; else s.pending++;
      if (!i.done_date && i.due_date >= today) {
        const n = s.next.get(i.due_date) ?? { tyres: 0, fleets: new Set<string>() };
        if (i.tyre_id) n.tyres++;
        n.fleets.add(i.fleet_id); s.next.set(i.due_date, n);
      }
      if (i.due_date === today) s.todayFleets.add(i.fleet_id);
      m.set(i.run_id, s);
    }
    return m;
  }, [items, today]);

  const isDaily = (r: Row) => { const s = sched(r.schedule_id); return !!s?.every_n_days && s.every_n_days <= 3 && !s.particular_days?.length; };
  const monthStart = `${today.slice(0, 7)}-01`;
  const kind = (r: Row): 'today' | 'month' | 'earlier' => (isDaily(r) ? (r.from_date <= today && r.to_date >= today ? 'today' : 'earlier') : r.to_date >= monthStart ? 'month' : 'earlier');
  const visible = runs.filter((r) => !pendingOnly || (stat.get(r.id)?.pending ?? 0) + (stat.get(r.id)?.overdue ?? 0) > 0);

  async function excel(r: Row) {
    const rows = await loadChart(r.id);
    csv(`${r.schedule_no}.csv`, ['Fleet Number', 'Position', 'Tyre No', 'Due Date', 'Done Date', 'Status'], rows.map((x) => [x.fleet_no, x.position, x.tyre_no, x.due_date, x.done_date, x.state]));
  }

  const card = (r: Row, compact: boolean) => {
    const s = stat.get(r.id); const sc = sched(r.schedule_id);
    if (!s) return <div key={r.id} className={`${cardCls} p-3 text-sm text-slate-500`}>{r.schedule_no} · loading…</div>;
    const next = [...s.next.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(0, 3);
    return (
      <div key={r.id} className={`${cardCls} ${compact ? 'p-3' : 'p-4'} ${openId === r.id ? 'ring-2 ring-blue-300' : ''}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-slate-900">{sc?.schedule_name} <span className="font-normal text-slate-500">· {r.schedule_no} · {sc?.schedule_code}</span></div>
            <div className="text-xs text-slate-500">{r.from_date === r.to_date ? dayShort(r.from_date) : `${dayShort(r.from_date)} to ${dayShort(r.to_date)}`} · {sc ? frequencyText(sc) : ''}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btnPlain} onClick={() => void excel(r)}>Excel</button>
            <button className={btnPlain} onClick={() => onOpen(r.id)}>See Full List</button>
            {isTic && s.pending + s.overdue > 0 && <button className={btnPrimary} onClick={() => onOpen(r.id)}>Assign Technician</button>}
          </div>
        </div>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          {BAR.map(([k, c]) => <div key={k} className={c} style={{ width: `${s.total ? (s[k] / s.total) * 100 : 0}%` }} />)}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>Total <strong>{s.total}</strong></span><span className="text-green-700">Completed <strong>{s.done}</strong></span><span className="text-blue-700">Assigned <strong>{s.assigned}</strong></span>
          <span className="text-slate-600">Pending <strong>{s.pending}</strong></span><span className="text-red-700">Overdue <strong>{s.overdue}</strong></span>
        </div>
        {!compact && kind(r) === 'today' && <div className="mt-1 text-xs text-slate-600">{s.todayFleets.size} of {fleetCount} fleets covered today</div>}
        {!compact && kind(r) === 'month' && next.length > 0 && <div className="mt-1 text-xs text-slate-600">Next due: {next.map(([d, n]) => `${dayShort(d)} · ${n.tyres ? `${n.tyres} tyres, ` : ''}${n.fleets.size} fleets`).join(' | ')}</div>}
      </div>
    );
  };
  const section = (title: string, k: 'today' | 'month' | 'earlier', empty: string) => {
    const list = visible.filter((r) => kind(r) === k);
    return (
      <div key={k}>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        {list.length === 0 ? <p className="text-sm text-slate-500">{empty}</p> : <div className={k === 'earlier' ? 'space-y-2' : 'grid gap-3 lg:grid-cols-2'}>{list.map((r) => card(r, k === 'earlier'))}</div>}
      </div>
    );
  };
  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="tablist">
        {([[false, 'All'], [true, 'Pending']] as const).map(([v, l]) => (
          <button key={l} role="tab" aria-selected={pendingOnly === v} onClick={() => setPendingOnly(v)}
            className={`rounded-full border px-4 py-1.5 text-sm ${pendingOnly === v ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`}>{l}</button>
        ))}
      </div>
      {section('Today', 'today', 'No daily chart covers today.')}
      {section('This month', 'month', 'No Rotation, Discout or Census chart for this month.')}
      {section('Earlier days', 'earlier', 'Nothing earlier.')}
    </div>
  );
}

/** Replace selected: give the not-yet-started work of assigned rows to other Tyre Men. */
export function ReplaceDlg({ staff, count, onCancel, onDone }: { staff: Row[]; count: number; onCancel: () => void; onDone: (emps: string[]) => Promise<void> }) {
  const [emps, setEmps] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal title={`Replace Technician (${count} row${count === 1 ? '' : 's'})`} onClose={onCancel}>
      {error && <Banner kind="error">{error}</Banner>}
      <p className="mb-2 text-sm text-slate-600">The work that has not started on the selected rows goes to the people you choose (1 to 3).</p>
      <div className="grid grid-cols-1 gap-1 rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
        {staff.map((s) => <label key={s.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={emps.includes(s.id)} onChange={() => setEmps(emps.includes(s.id) ? emps.filter((x) => x !== s.id) : [...emps, s.id])} /> {s.full_name} ({s.employee_code})</label>)}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button className={btnPlain} onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={btnPrimary} disabled={busy || emps.length === 0 || emps.length > 3} onClick={() => { setBusy(true); setError(null); onDone(emps).catch((e: Error) => { setError(e.message); setBusy(false); }); }}>{busy ? 'Working…' : 'Replace'}</button>
      </div>
    </Modal>
  );
}
