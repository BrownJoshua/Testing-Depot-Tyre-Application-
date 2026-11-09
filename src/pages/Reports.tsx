import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { all, type Row } from '../lib/ops';
import { daysBetween, JC_STATUS_LABEL, loadJobs, TYPE_LABEL, type JobsCtx } from '../lib/jobs';
import { loadStock, type StockCtx } from '../lib/stock';
import { Banner, btnPlain, cardCls, inputCls, PageHeader } from '../components/ui';

type Key = 'cards' | 'overdue' | 'tyres' | 'pending' | 'compliance' | 'docs';
const REPORTS: { key: Key; label: string; ho?: boolean }[] = [
  { key: 'cards', label: 'Job cards' }, { key: 'overdue', label: 'Overdue job cards' }, { key: 'tyres', label: 'Tyre stock' },
  { key: 'pending', label: 'Maintenance pending by depot', ho: true }, { key: 'compliance', label: 'Schedule compliance' }, { key: 'docs', label: 'Stock documents' },
];
const CLOSED = ['COMPLETED', 'CLOSED'];
const PLACE: Record<string, string> = { FITTED: 'Fitted', LIVE_STOCK: 'Live stock', AT_TRS: 'At TRS', AT_MIC: 'At MIC', AT_OTHER_DEPOT: 'Other depot', CENTRAL_STORE: 'Central store', IN_TRANSIT: 'In transit', SCRAPPED: 'Scrapped' };
interface Table { head: string[]; rows: (string | number)[][] }

const csvCell = (v: string | number) => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function download(name: string, t: Table) {
  const text = '﻿' + [t.head, ...t.rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

/** Reports with CSV download. HO / AM see every depot; Supervisor and Tyre IC see their own (row-level security). */
export function Reports() {
  const { me } = useAuth();
  const isHq = me?.role_code === 'HO' || me?.role_code === 'AM';
  const [jobs, setJobs] = useState<JobsCtx | null>(null);
  const [stock, setStock] = useState<StockCtx | null>(null);
  const [units, setUnits] = useState<Row[]>([]);
  const [chart, setChart] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Key>('cards');
  const [status, setStatus] = useState('');
  const [depot, setDepot] = useState('');

  useEffect(() => {
    Promise.all([loadJobs(), loadStock(), all('org_units', 'code'), all('v_schedule_chart', 'due_date')])
      .then(([j, s, u, c]) => { setJobs(j); setStock(s); setUnits(u); setChart(c); }).catch((e: Error) => setError(e.message));
  }, []);

  const table = useMemo<Table | null>(() => {
    if (!jobs || !stock) return null;
    const dn = (id: string) => units.find((u) => u.id === id)?.name ?? '—';
    const inDepot = (id: string) => !depot || id === depot;
    const fleetNo = (id: string | null) => jobs.fleets.find((f) => f.id === id)?.fleet_no ?? '—';
    const od = (c: Row) => (CLOSED.includes(c.status) ? 0 : Math.max(0, daysBetween(c.expected_date, jobs.today)));
    const techs = (c: Row) => {
      const ids = new Set(jobs.jobIds.filter((j) => j.job_card_id === c.id).map((j) => j.id));
      return [...new Set(jobs.assignees.filter((a) => ids.has(a.job_id_ref)).map((a) => jobs.staff.find((s) => s.id === a.employee_id)?.full_name ?? ''))].filter(Boolean).join('; ');
    };
    const cards = jobs.cards.filter((c) => inDepot(c.org_unit_id) && (!status || c.status === status));
    const cardRow = (c: Row) => [c.job_card_no, dn(c.org_unit_id), fleetNo(c.fleet_id), TYPE_LABEL[c.job_type] ?? c.job_type, JC_STATUS_LABEL[c.status] ?? c.status, c.expected_date, od(c),
      jobs.jobIds.filter((j) => j.job_card_id === c.id).length, techs(c)];
    const cardHead = ['Job card', 'Depot', 'Fleet', 'Type', 'Status', 'Expected date', 'Overdue days', 'Job IDs', 'Technicians'];
    switch (report) {
      case 'cards': return { head: cardHead, rows: cards.map(cardRow) };
      case 'overdue': return { head: cardHead, rows: cards.filter((c) => od(c) > 0).sort((a, b) => od(b) - od(a)).map(cardRow) };
      case 'tyres': {
        const m = new Map<string, number[]>();
        for (const t of stock.tyres.filter((x) => inDepot(x.owner_org_unit_id))) {
          const k = `${t.owner_org_unit_id}|${t.stock_place}`; const v = m.get(k) ?? [0, 0, 0];
          v[0]++; if (t.stock_place === 'LIVE_STOCK') { if (t.stock_category === 'GOOD') v[1]++; else v[2]++; } m.set(k, v);
        }
        return { head: ['Depot', 'Place', 'Tyres', 'Good (live stock)', 'Repair (live stock)'], rows: [...m].sort().map(([k, v]) => { const [d, p] = k.split('|'); return [dn(d), PLACE[p] ?? p, v[0], v[1], v[2]]; }) };
      }
      case 'pending': {
        const by = new Map<string, number[]>();
        for (const c of jobs.cards.filter((x) => inDepot(x.org_unit_id) && !CLOSED.includes(x.status))) { const v = by.get(c.org_unit_id) ?? [0, 0, 0]; v[0]++; if (od(c) > 0) v[1]++; if (['FINAL_INSPECTION', 'FINAL_INSPECTION_FAILED'].includes(c.status)) v[2]++; by.set(c.org_unit_id, v); }
        return { head: ['Depot', 'Open job cards', 'Overdue', 'Waiting for final inspection'], rows: [...by].map(([d, v]) => [dn(d), v[0], v[1], v[2]]).sort((a, b) => Number(b[1]) - Number(a[1])) };
      }
      case 'compliance': {
        const by = new Map<string, Record<string, number>>();
        for (const r of chart.filter((x) => inDepot(x.org_unit_id))) { const k = `${r.schedule_code} · ${r.schedule_name}`; const v = by.get(k) ?? {}; v[r.state] = (v[r.state] ?? 0) + 1; by.set(k, v); }
        return { head: ['Schedule', 'On time', 'Delayed', 'Overdue', 'Pending', 'Assigned', 'Compliance %'], rows: [...by].sort().map(([k, v]) => {
          const done = (v.ON_TIME ?? 0) + (v.DELAYED ?? 0), total = Object.values(v).reduce((a, b) => a + b, 0);
          return [k, v.ON_TIME ?? 0, v.DELAYED ?? 0, v.OVERDUE ?? 0, v.PENDING ?? 0, v.ASSIGNED ?? 0, total ? Math.round((100 * done) / total) : 0];
        }) };
      }
      case 'docs': {
        const cnt = (list: Row[], key: string, doc: string) => [...new Set(list.map((x) => x[key]))].sort().map((s) => [doc, String(s), list.filter((x) => x[key] === s).length]);
        const w = stock.wsrs.filter((x) => inDepot(x.org_unit_id)), m = stock.mrns.filter((x) => inDepot(x.org_unit_id)), s = stock.srns.filter((x) => inDepot(x.org_unit_id));
        return { head: ['Document', 'Status', 'Count'], rows: [...cnt(w, 'status', 'WSR'), ...cnt(m, 'status', 'MRN'), ...cnt(s, 'status', 'SRN')] };
      }
    }
  }, [jobs, stock, units, chart, report, status, depot]);

  const cardReport = report === 'cards' || report === 'overdue';
  const depots = units.filter((u) => (jobs?.cards ?? []).some((c) => c.org_unit_id === u.id) || (stock?.tyres ?? []).some((t) => t.owner_org_unit_id === u.id));
  const csvName = `${report}-report-${jobs?.today ?? 'today'}.csv`;

  return (
    <div>
      <PageHeader title="Reports" subtitle={isHq ? 'All depots. Choose a report and download it as CSV.' : 'Your depot. Choose a report and download it as CSV.'} />
      {error && <Banner kind="error">{error}</Banner>}
      <div className="mb-3 flex flex-wrap gap-2" role="tablist">
        {REPORTS.filter((r) => !r.ho || isHq).map((r) => (
          <button key={r.key} role="tab" aria-selected={report === r.key} onClick={() => setReport(r.key)}
            className={`rounded-full border px-4 py-1.5 text-sm ${report === r.key ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`}>{r.label}</button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {cardReport && report === 'cards' && (
          <select className={`${inputCls} w-52`} aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>{Object.entries(JC_STATUS_LABEL).filter(([k]) => k in { DRAFT: 1, ASSIGNED_FOR_INSPECTION: 1, INSPECTION_DONE: 1, ASSIGNED_FOR_WORK: 1, FINAL_INSPECTION: 1, FINAL_INSPECTION_FAILED: 1, COMPLETED: 1, CLOSED: 1 }).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
        {isHq && <select className={`${inputCls} w-52`} aria-label="Depot" value={depot} onChange={(e) => setDepot(e.target.value)}><option value="">All depots</option>{depots.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}
        <button className={`${btnPlain} ml-auto inline-flex items-center gap-1.5`} disabled={!table || table.rows.length === 0} onClick={() => table && download(csvName, table)}><Download size={16} /> Download CSV</button>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{table?.head.map((h) => <th key={h} className="px-4 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {!table && !error && <tr><td className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {table && table.rows.length === 0 && <tr><td colSpan={table.head.length} className="px-4 py-6 text-center text-slate-500">Nothing to report for this choice.</td></tr>}
            {table?.rows.map((r, i) => <tr key={i} className="border-t border-slate-100">{r.map((c, k) => <td key={k} className="px-4 py-2">{c}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      {table && <p className="mt-2 text-xs text-slate-500">{table.rows.length} row{table.rows.length === 1 ? '' : 's'} · as of {jobs?.today}</p>}
    </div>
  );
}
