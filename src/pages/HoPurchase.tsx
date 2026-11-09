import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/masters';
import { all, rpc, type Row } from '../lib/ops';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader, ReasonDialog } from '../components/ui';
import { Modal } from '../components/OpsBits';

const STATUS_LABEL: Record<string, string> = { PENDING_APPROVAL: 'Pending Approval', ISSUED: 'Issued', REVERTED: 'Reverted' };
const STATUS_STYLE: Record<string, string> = { PENDING_APPROVAL: 'bg-amber-100 text-amber-800', ISSUED: 'bg-green-100 text-green-800', REVERTED: 'bg-red-100 text-red-800' };
const Badge = ({ s }: { s: string }) => <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[s] ?? 'bg-slate-100 text-slate-700'}`}>{STATUS_LABEL[s] ?? s}</span>;

function csv(name: string, head: string[], rows: string[][]) {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const url = URL.createObjectURL(new Blob(['﻿' + [head, ...rows].map((r) => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

/** Purchase Indent (D1): HO raises, AM issues or reverts. */
export function PurchaseIndent() {
  const { me } = useAuth();
  const isHo = me?.role_code === 'HO', isAm = me?.role_code === 'AM';
  const [rows, setRows] = useState<Row[] | null>(null);
  const [folios, setFolios] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dlg, setDlg] = useState<{ k: 'new' } | { k: 'view'; r: Row } | { k: 'revert'; r: Row } | null>(null);
  const [dlgError, setDlgError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { Promise.all([all('purchase_indents', 'indent_no'), all('tyre_folios', 'folio_no')]).then(([r, f]) => { setRows(r); setFolios(f); }).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setDlgError(null);
    try { await fn(); setNotice(ok); setDlg(null); load(); } catch (e) { setDlgError((e as Error).message); } finally { setBusy(false); }
  }
  const n = (s: string) => (rows ?? []).filter((r) => r.status === s).length;
  const requester = (r: Row) => (r.requested_by ? 'HO (Technical)' : '—');
  const exportCsv = () => csv('purchase-indents.csv', ['Indent No', 'Indent Date & Time', 'Indent Type', 'Folio Group', 'Source', 'Requested By', 'Status'],
    (rows ?? []).map((r) => [r.indent_no, fmtDateTime(r.indent_at), r.indent_type, r.folio_group, r.source, requester(r), STATUS_LABEL[r.status]]));

  return (
    <div>
      <PageHeader title="Purchase Indent" subtitle={isHo ? 'Raise an indent. The AM issues it or reverts it with a reason.' : 'Issue or revert the indents HO raises.'}
        action={<div className="flex gap-2"><button className={`${btnPlain} inline-flex items-center gap-1.5`} onClick={exportCsv} disabled={!rows?.length}><Download size={16} /> Export</button>
          {isHo && <button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => { setDlgError(null); setDlg({ k: 'new' }); }}><Plus size={16} /> Raise Indent</button>}</div>} />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className="mb-3 flex flex-wrap gap-3">
        {[['Total', rows?.length ?? 0], ['Pending', n('PENDING_APPROVAL')], ['Issued', n('ISSUED')]].map(([l, v]) => <div key={l as string} className="rounded-xl border border-slate-200 bg-white px-4 py-2"><div className="text-xs uppercase tracking-wide text-slate-500">{l}</div><div className="text-xl font-bold">{v}</div></div>)}
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{['S.No', 'Indent No', 'Indent Date & Time', 'Indent Type', 'Folio Group', 'Source', 'Requested By', 'Status', 'Action'].map((h) => <th key={h} className="px-4 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {!rows && !error && <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {rows?.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-500">No indents yet.</td></tr>}
            {rows?.map((r, i) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{i + 1}</td><td className="px-4 py-2 font-medium">{r.indent_no}</td><td className="px-4 py-2">{fmtDateTime(r.indent_at)}</td><td className="px-4 py-2">{r.indent_type}</td>
                <td className="px-4 py-2">{r.folio_group}</td><td className="px-4 py-2">{r.source}</td><td className="px-4 py-2">{requester(r)}</td><td className="px-4 py-2"><Badge s={r.status} /></td>
                <td className="px-4 py-2"><div className="flex gap-2"><button className={btnPlain} onClick={() => setDlg({ k: 'view', r })}>View</button>
                  {isAm && r.status === 'PENDING_APPROVAL' && <><button className={btnPrimary} disabled={busy} onClick={() => void act(() => rpc('purchase_indent_decide', { p_indent: r.id, p_issue: true, p_remarks: null }), `${r.indent_no} issued.`)}>Issue</button>
                    <button className={btnPlain} onClick={() => { setDlgError(null); setDlg({ k: 'revert', r }); }}>Revert</button></>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dlg?.k === 'new' && <NewIndent folios={folios} busy={busy} error={dlgError} onCancel={() => setDlg(null)}
        onSave={(v) => void act(() => rpc('purchase_indent_create', { p_type: v.type, p_group: v.group, p_source: v.source, p_lines: v.lines, p_remarks: v.remarks || null }), 'Purchase Indent raised. It waits for AM approval.')} />}
      {dlg?.k === 'view' && (
        <Modal title={dlg.r.indent_no} onClose={() => setDlg(null)}>
          <dl className="grid grid-cols-2 gap-2 text-sm"><dt className="text-slate-500">Type</dt><dd>{dlg.r.indent_type}</dd><dt className="text-slate-500">Folio group</dt><dd>{dlg.r.folio_group}</dd><dt className="text-slate-500">Source</dt><dd>{dlg.r.source}</dd>
            <dt className="text-slate-500">Raised</dt><dd>{fmtDateTime(dlg.r.indent_at)}</dd><dt className="text-slate-500">Status</dt><dd><Badge s={dlg.r.status} /></dd></dl>
          {(dlg.r.lines ?? []).length > 0 && <table className="mt-3 w-full text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-1">Folio</th><th>Qty</th></tr></thead>
            <tbody>{(dlg.r.lines as Row[]).map((l, k) => { const f = folios.find((x) => x.id === l.folio_id); return <tr key={k} className="border-t border-slate-100"><td className="py-1">{f ? `${f.folio_no} · ${f.folio_name}` : '—'}</td><td>{l.qty}</td></tr>; })}</tbody></table>}
          {dlg.r.remarks && <p className="mt-2 text-sm text-slate-700">Remarks: {dlg.r.remarks}</p>}
          {dlg.r.decision_remarks && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm">AM remarks: {dlg.r.decision_remarks}</p>}
          <div className="mt-3 flex justify-end"><button className={btnPlain} onClick={() => setDlg(null)}>Close</button></div>
        </Modal>
      )}
      {dlg?.k === 'revert' && <ReasonDialog title={`Revert ${dlg.r.indent_no}?`} label="Reason (required)" confirmLabel="Revert" danger required busy={busy} error={dlgError}
        onConfirm={(t) => void act(() => rpc('purchase_indent_decide', { p_indent: dlg.r.id, p_issue: false, p_remarks: t }), `${dlg.r.indent_no} reverted.`)} onCancel={() => setDlg(null)} />}
    </div>
  );
}

function NewIndent({ folios, busy, error, onCancel, onSave }: { folios: Row[]; busy: boolean; error: string | null; onCancel: () => void;
  onSave: (v: { type: string; group: string; source: string; lines: { folio_id: string; qty: number }[]; remarks: string }) => void }) {
  const [type, setType] = useState(''); const [group, setGroup] = useState('Tyre'); const [source, setSource] = useState('');
  const [lines, setLines] = useState<{ folio_id: string; qty: string }[]>([{ folio_id: '', qty: '' }]); const [remarks, setRemarks] = useState('');
  const upd = (i: number, p: Partial<(typeof lines)[0]>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...p } : l)));
  return (
    <Modal title="Raise Purchase Indent" onClose={onCancel}>
      {error && <Banner kind="error">{error}</Banner>}
      <div className="grid grid-cols-3 gap-2">
        <Field label="Indent type *"><select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}><option value="">Select…</option><option>Supplementary Indent</option><option>(AWR) Indent</option><option>Emergency Indent</option></select></Field>
        <Field label="Folio group *"><select className={inputCls} value={group} onChange={(e) => setGroup(e.target.value)}>{['Tyre', 'Tube', 'Flap', 'Disc'].map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Source *"><select className={inputCls} value={source} onChange={(e) => setSource(e.target.value)}><option value="">Select…</option><option>Central Store</option><option>Depot Store</option><option>All</option></select></Field>
      </div>
      <div className="mt-2 space-y-2">{lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_6rem_auto] gap-2">
          <select className={inputCls} aria-label="Folio" value={l.folio_id} onChange={(e) => upd(i, { folio_id: e.target.value })}><option value="">Folio…</option>{folios.filter((f) => f.status === 'ACTIVE').map((f) => <option key={f.id} value={f.id}>{f.folio_no} · {f.folio_name}</option>)}</select>
          <input className={inputCls} type="number" min="1" placeholder="Qty" aria-label="Quantity" value={l.qty} onChange={(e) => upd(i, { qty: e.target.value })} />
          <button type="button" className={btnPlain} aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, k) => k !== i))}><Trash2 size={16} /></button>
        </div>))}
        <button type="button" className={btnPlain} onClick={() => setLines([...lines, { folio_id: '', qty: '' }])}>+ Add folio</button></div>
      <Field label="Remarks"><textarea className={inputCls} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
      <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={btnPrimary} disabled={busy || !type || !source || lines.some((l) => !l.folio_id || !(Number(l.qty) >= 1))}
          onClick={() => onSave({ type, group, source, lines: lines.map((l) => ({ folio_id: l.folio_id, qty: Number(l.qty) })), remarks })}>Raise Indent</button></div>
    </Modal>
  );
}

/** Allocation Requests (D1): a read-only list of the allocations HO made. */
export function AllocationRequests() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { all('allocation_requests', 'allocated_at', false).then(setRows).catch((e: Error) => setError(e.message)); }, []);
  const head = ['S.No', 'Request No', 'Allocation Date & Time', 'Allocation Type', 'Allocate From', 'Allocated By', 'Allocated to Depot / Unit', 'Items', 'Status'];
  return (
    <div>
      <PageHeader title="Allocation Requests" subtitle="Stock allocated from the Central Store to depots and units." />
      {error && <Banner kind="error">{error}</Banner>}
      <div className={`${cardCls} overflow-x-auto`}><table className="w-full min-w-[820px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{head.map((h) => <th key={h} className="px-4 py-2">{h}</th>)}</tr></thead>
        <tbody>
          {!rows && !error && <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
          {rows?.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-500">No allocation requests yet. Allocations come from the Central Store, which is not part of this build.</td></tr>}
          {rows?.map((r, i) => <tr key={r.id} className="border-t border-slate-100"><td className="px-4 py-2">{i + 1}</td><td className="px-4 py-2 font-medium">{r.request_no}</td><td className="px-4 py-2">{fmtDateTime(r.allocated_at)}</td>
            <td className="px-4 py-2">{r.allocation_type}</td><td className="px-4 py-2">{r.allocate_from}</td><td className="px-4 py-2">{r.allocated_by}</td><td className="px-4 py-2">{r.allocated_to}</td><td className="px-4 py-2">{r.items}</td><td className="px-4 py-2">{r.status}</td></tr>)}
        </tbody></table></div>
    </div>
  );
}

const TYPES = ['Tyre Rotation', 'Tyre Discout', 'Air Inflation', 'Inspection', 'Census'];
/** Maintenance Pending (D1): by depot for a month and a maintenance type, as on the demo date. */
export function MaintenancePending() {
  const [chart, setChart] = useState<Row[] | null>(null);
  const [depots, setDepots] = useState<Row[]>([]);
  const [today, setToday] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState('');
  const [month, setMonth] = useState('');
  useEffect(() => {
    Promise.all([all('v_schedule_chart', 'due_date'), all('org_units', 'sort_order'), rpc<string>('get_business_today', {})])
      .then(([c, o, t]) => { setChart(c); setDepots(o.filter((x) => x.unit_type === 'DEPOT')); setToday(t); setMonth(t.slice(0, 7)); }).catch((e: Error) => setError(e.message));
  }, []);
  const typeOf = (r: Row) => TYPES.find((t) => String(r.schedule_name).toLowerCase().includes(t.split(' ').pop()!.toLowerCase())) ?? 'Other';
  const rows = useMemo(() => {
    const sel = (chart ?? []).filter((r) => r.due_date.startsWith(month) && (!type || typeOf(r) === type));
    return depots.map((d) => {
      const mine = sel.filter((r) => r.org_unit_id === d.id);
      const done = mine.filter((r) => r.done_date).length;
      const overdue = mine.filter((r) => !r.done_date && r.due_date < today).length;
      return { d, planned: mine.length, done, overdue, pending: mine.length - done };
    }).filter((x) => x.planned > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, depots, month, type, today]);
  const months = [...new Set((chart ?? []).map((r) => r.due_date.slice(0, 7)).concat(month ? [month] : []))].sort();
  return (
    <div>
      <PageHeader title="Maintenance Pending" subtitle={today ? `As on ${today}. Depot-wise schedule work that is planned, done and still pending.` : ''} />
      {error && <Banner kind="error">{error}</Banner>}
      <div className="mb-3 flex flex-wrap gap-3">
        <select className={`${inputCls} w-44`} aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>{months.map((m) => <option key={m}>{m}</option>)}</select>
        <select className={`${inputCls} w-52`} aria-label="Maintenance type" value={type} onChange={(e) => setType(e.target.value)}><option value="">All maintenance types</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
      </div>
      <div className={`${cardCls} overflow-x-auto`}><table className="w-full min-w-[560px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{['Depot', 'Planned', 'Done', 'Pending', 'Overdue'].map((h) => <th key={h} className="px-4 py-2">{h}</th>)}</tr></thead>
        <tbody>
          {!chart && !error && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
          {chart && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Nothing is planned for this month and type.</td></tr>}
          {rows.map((x) => <tr key={x.d.id} className="border-t border-slate-100"><td className="px-4 py-2 font-medium">{x.d.name}</td><td className="px-4 py-2">{x.planned}</td><td className="px-4 py-2">{x.done}</td><td className="px-4 py-2">{x.pending}</td>
            <td className={`px-4 py-2 ${x.overdue ? 'font-semibold text-red-700' : ''}`}>{x.overdue}</td></tr>)}
        </tbody></table></div>
    </div>
  );
}
