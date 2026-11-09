import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { all } from '../lib/ops';
import { fmtDT, receiveGin2, receiveUnit, type Row } from '../lib/reg';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader } from '../components/ui';
import { Modal } from '../components/OpsBits';

type Kind = 'GIN' | 'TRS' | 'MIC';
interface Item { id: string; label: string; sub?: string }
interface Mark { result: '' | 'ACCEPT' | 'REJECT'; reason: string; as: 'UNUSED' | 'FITTED'; removed: string; fleet: string }
const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const Pill = ({ tone, children }: { tone: 'green' | 'amber' | 'blue' | 'red'; children: React.ReactNode }) =>
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${{ green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800', blue: 'bg-blue-100 text-blue-800', red: 'bg-red-100 text-red-800' }[tone]}`}>{children}</span>;

/** GRN (D1): tyres coming in from another depot (Indent GIN), from TRS (retreaded, reported ready) and from a MIC vehicle. Partial receipt allowed. */
export function GrnInPage() {
  const { me } = useAuth();
  const org = me?.org_unit_id ?? '';
  const [d, setD] = useState<{ gins: Row[]; ginTyres: Row[]; tyres: Row[]; grns: Row[]; lines: Row[]; reasons: Row[]; units: Row[]; indents: Row[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState('');
  const [from, setFrom] = useState('');
  const [q, setQ] = useState('');
  const [dlg, setDlg] = useState<{ kind: Kind; gin?: Row } | null>(null);
  const [dlgError, setDlgError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all([all('indent_gins', 'created_at', false), all('indent_gin_tyres', 'tyre_id'), all('tyres', 'mtc_no'), all('grns', 'received_at', false), all('grn_lines', 'tyre_id'),
      all('reject_reasons', 'reason_code'), all('org_units', 'sort_order'), all('indents', 'created_at', false)])
      .then(([gins, ginTyres, tyres, grns, lines, reasons, units, indents]) => setD({ gins, ginTyres, tyres, grns, lines, reasons, units, indents })).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const unit = (id: string) => d?.units.find((u) => u.id === id)?.name ?? '—';
  const tyreNo = (id: string) => d?.tyres.find((t) => t.id === id)?.mtc_no ?? 'Tyre';
  const inbound = (d?.gins ?? []).filter((g) => g.to_unit_id === org && ['IN_TRANSIT', 'RECEIVED'].includes(g.status));
  const waitingGin = (g: Row) => (d?.ginTyres ?? []).filter((x) => x.gin_id === g.id && !x.result);
  const trsReady = (d?.tyres ?? []).filter((t) => t.owner_org_unit_id === org && t.stock_place === 'AT_TRS' && t.trs_ready_at);
  const micOut = (d?.tyres ?? []).filter((t) => t.owner_org_unit_id === org && t.stock_place === 'AT_MIC');
  const grnOf = (g: Row) => (d?.grns ?? []).filter((x) => x.indent_gin_id === g.id);

  type R = { key: string; from: string; grn: string; at: string | null; source: string; src: 'Other depot' | 'TRS - Retreading Unit' | 'MIC Vehicle'; issued: number; acc: number | null; rej: number | null; ready: boolean; act?: () => void; hay: string };
  const rows: R[] = [];
  for (const g of inbound) {
    const gr = grnOf(g); const left = waitingGin(g).length;
    rows.push({ key: g.id, from: unit(g.org_unit_id), grn: gr.map((x) => x.grn_no).join(', ') || '—', at: gr[0]?.receipt_at ?? gr[0]?.received_at ?? g.in_transit_at, source: `${g.gin_no} ${d!.indents.find((i) => i.id === g.indent_id)?.indent_no ?? ''}`.trim(),
      src: 'Other depot', issued: (d?.ginTyres ?? []).filter((x) => x.gin_id === g.id).length, acc: gr.length ? gr.reduce((n, x) => n + x.accepted_qty, 0) : null, rej: gr.length ? gr.reduce((n, x) => n + x.rejected_qty, 0) : null,
      ready: g.status === 'IN_TRANSIT', act: g.status === 'IN_TRANSIT' ? () => open({ kind: 'GIN', gin: g }) : undefined,
      hay: [g.gin_no, ...gr.map((x) => x.grn_no), d!.indents.find((i) => i.id === g.indent_id)?.indent_no, ...(d?.ginTyres ?? []).filter((x) => x.gin_id === g.id).map((x) => tyreNo(x.tyre_id))].join(' ').toLowerCase() + (left ? '' : '') });
  }
  if (trsReady.length) rows.push({ key: 'trs', from: 'TRS - Retreading Unit', grn: '—', at: trsReady[0].trs_ready_at, source: `Retreaded tyres ready (${trsReady.length})`, src: 'TRS - Retreading Unit', issued: trsReady.length, acc: null, rej: null, ready: true, act: () => open({ kind: 'TRS' }), hay: trsReady.map((t) => t.mtc_no).join(' ').toLowerCase() });
  for (const g of (d?.grns ?? []).filter((x) => x.org_unit_id === org && ['TRS', 'MIC'].includes(x.source)))
    rows.push({ key: g.id, from: g.source === 'TRS' ? 'TRS - Retreading Unit' : 'MIC Vehicle', grn: g.grn_no, at: g.receipt_at ?? g.received_at, source: g.source === 'TRS' ? 'TRS dispatch' : 'MIC return', src: g.source === 'TRS' ? 'TRS - Retreading Unit' : 'MIC Vehicle',
      issued: g.issued_qty, acc: g.accepted_qty, rej: g.rejected_qty, ready: false, hay: [g.grn_no, ...(d?.lines ?? []).filter((l) => l.grn_id === g.id).map((l) => tyreNo(l.tyre_id))].join(' ').toLowerCase() });

  const shown = rows.filter((r) => (!tab || (tab === 'ready' ? r.ready : !r.ready)) && (!from || r.src === from) && (!q || r.hay.includes(q.trim().toLowerCase())));
  const thisMonth = (d?.grns ?? []).filter((g) => g.org_unit_id === org && (g.receipt_at ?? g.received_at).slice(0, 7) === new Date().toISOString().slice(0, 7)).length;

  function open(x: { kind: Kind; gin?: Row }) { setDlgError(null); setDlg(x); }
  async function save(kind: Kind, gin: Row | undefined, results: Row[], at: string, close: string) {
    setBusy(true); setDlgError(null);
    try {
      const when = at ? new Date(at).toISOString() : null;
      const no = kind === 'GIN' ? await receiveGin2(gin!.id, results, when, close) : await receiveUnit(kind, results, when, close);
      setNotice(`${no} created. Accepted tyres are in your live stock.`); setDlg(null); load();
    } catch (e) { setDlgError((e as Error).message); } finally { setBusy(false); }
  }
  const items: Item[] = !dlg ? [] : dlg.kind === 'GIN' ? waitingGin(dlg.gin!).map((x) => ({ id: x.tyre_id, label: tyreNo(x.tyre_id) })) : (dlg.kind === 'TRS' ? trsReady : micOut).map((t) => ({ id: t.id, label: t.mtc_no, sub: t.tyre_condition ?? undefined }));

  return (
    <div>
      <PageHeader title="GRN" subtitle="Tyres arriving from other depots, TRS or a MIC vehicle. Receive them to add the accepted ones to your live stock."
        action={<button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => open({ kind: 'MIC' })}><Plus size={16} /> Receive from MIC</button>} />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className="mb-3 flex flex-wrap gap-3">
        {[['Ready to receive', rows.filter((r) => r.ready).length], ['GRNs received (this month)', thisMonth], ['Still at TRS', (d?.tyres ?? []).filter((t) => t.owner_org_unit_id === org && t.stock_place === 'AT_TRS').length]].map(([l, n]) => (
          <div key={l as string} className="rounded-xl border border-slate-200 bg-white px-4 py-2"><div className="text-xl font-bold text-slate-900">{n}</div><div className="text-xs uppercase tracking-wide text-slate-500">{l}</div></div>))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {[['', `All ${rows.length}`], ['ready', `Ready to receive ${rows.filter((r) => r.ready).length}`], ['done', `Received ${rows.filter((r) => !r.ready).length}`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-1.5 text-sm ${tab === k ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`}>{l}</button>))}
        <input className={`${inputCls} ml-auto w-56`} placeholder="GRN No, Indent No or Tyre No" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputCls} w-52`} aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)}><option value="">From: all</option><option>Other depot</option><option>TRS - Retreading Unit</option><option>MIC Vehicle</option></select>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{['S.No', 'From Depot / Unit', 'GRN No', 'GRN Date & Time', 'Source', 'Issued Qty', 'Accepted Qty', 'Rejected Qty', 'Status', 'Action'].map((c) => <th key={c} className="px-3 py-2">{c}</th>)}</tr></thead>
          <tbody>
            {!d && !error && <tr><td colSpan={10} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {d && shown.length === 0 && <tr><td colSpan={10} className="px-4 py-6 text-center text-slate-500">Nothing to receive.</td></tr>}
            {shown.map((r, n) => (
              <tr key={r.key} className="border-t border-slate-100 align-top"><td className="px-3 py-2">{n + 1}</td><td className="px-3 py-2">{r.from}</td><td className="px-3 py-2">{r.grn}</td><td className="px-3 py-2">{fmtDT(r.at)}</td><td className="px-3 py-2">{r.source}</td>
                <td className="px-3 py-2">{r.issued}</td><td className="px-3 py-2">{r.acc ?? '—'}</td><td className="px-3 py-2">{r.rej ?? '—'}</td>
                <td className="px-3 py-2">{r.ready ? <Pill tone="blue">Ready to receive</Pill> : (r.rej ?? 0) > 0 ? <Pill tone="amber">With discrepancy</Pill> : <Pill tone="green">Received</Pill>}</td>
                <td className="px-3 py-2">{r.act && <button className={btnPrimary} onClick={r.act}>Receive</button>}</td></tr>))}
          </tbody></table>
      </div>
      {dlg && d && <ReceiveDlg kind={dlg.kind} title={dlg.kind === 'GIN' ? `Receive ${dlg.gin!.gin_no}` : dlg.kind === 'TRS' ? 'Receive from TRS' : 'Receive from MIC Vehicle'} items={items}
        reasons={d.reasons.filter((r) => r.status === 'ACTIVE').map((r) => r.reason_text)} busy={busy} error={dlgError} onCancel={() => setDlg(null)} onSave={(res, at, close) => void save(dlg.kind, dlg.gin, res, at, close)} />}
    </div>
  );
}

function ReceiveDlg({ kind, title, items, reasons, busy, error, onCancel, onSave }: { kind: Kind; title: string; items: Item[]; reasons: string[]; busy: boolean; error: string | null; onCancel: () => void; onSave: (r: Row[], at: string, close: string) => void }) {
  const [at, setAt] = useState(nowLocal());
  const [close, setClose] = useState('');
  const [m, setM] = useState<Record<string, Mark>>(() => Object.fromEntries(items.map((i) => [i.id, { result: '', reason: '', as: 'UNUSED', removed: '', fleet: '' } as Mark])));
  const set = (id: string, p: Partial<Mark>) => setM({ ...m, [id]: { ...m[id], ...p } });
  const marked = items.filter((i) => m[i.id]?.result);
  const bad = marked.some((i) => (m[i.id].result === 'REJECT' && !m[i.id].reason) || (kind === 'MIC' && m[i.id].result === 'ACCEPT' && m[i.id].as === 'FITTED' && (!m[i.id].removed || !m[i.id].fleet)));
  return (
    <Modal title={title} onClose={onCancel}>
      {error && <Banner kind="error">{error}</Banner>}
      <Field label="Received date & time *"><input className={inputCls} type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></Field>
      <p className="my-2 text-xs text-slate-500">Mark the tyres that arrived. Tyres you leave unmarked stay on the Ready to receive row until they come{kind === 'MIC' ? '' : ' or you close them below'}.</p>
      {items.length === 0 && <p className="text-sm text-slate-500">No tyres to receive.</p>}
      <div className="space-y-2">{items.map((i) => (
        <div key={i.id} className="rounded-lg border border-slate-200 p-2 text-sm">
          <div className="flex items-center justify-between"><span className="font-medium">{i.label}{i.sub && <span className="ml-1 text-xs text-slate-500">{i.sub}</span>}</span>
            <span className="flex gap-3">{(['ACCEPT', 'REJECT'] as const).map((r) => <label key={r} className="flex items-center gap-1"><input type="radio" name={i.id} checked={m[i.id].result === r} onChange={() => set(i.id, { result: r })} /> {r === 'ACCEPT' ? 'Accept' : 'Reject'}</label>)}
              {m[i.id].result && <button className="text-xs text-slate-500 underline" onClick={() => set(i.id, { result: '' })}>clear</button>}</span></div>
          {m[i.id].result === 'REJECT' && <select className={`${inputCls} mt-2`} aria-label="Reject reason" value={m[i.id].reason} onChange={(e) => set(i.id, { reason: e.target.value })}><option value="">Reject reason (required)…</option>{reasons.map((r) => <option key={r}>{r}</option>)}</select>}
          {kind === 'MIC' && m[i.id].result === 'ACCEPT' && (
            <div className="mt-2 space-y-2"><select className={inputCls} aria-label="Returned as" value={m[i.id].as} onChange={(e) => set(i.id, { as: e.target.value as Mark['as'] })}><option value="UNUSED">Returned unused</option><option value="FITTED">Fitted on road - removed tyre returned</option></select>
              {m[i.id].as === 'FITTED' && <div className="grid grid-cols-2 gap-2"><input className={inputCls} placeholder="Removed tyre No" value={m[i.id].removed} onChange={(e) => set(i.id, { removed: e.target.value })} /><input className={inputCls} placeholder="Fleet No" value={m[i.id].fleet} onChange={(e) => set(i.id, { fleet: e.target.value })} /></div>}</div>)}
        </div>))}</div>
      {kind !== 'MIC' && <Field label="Tyres that did not arrive: close the rest with a reason (optional)"><input className={inputCls} value={close} onChange={(e) => setClose(e.target.value)} placeholder="e.g. not dispatched by the sender" /></Field>}
      <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={btnPrimary} disabled={busy || bad || (marked.length === 0 && !close.trim())}
          onClick={() => onSave(marked.map((i) => ({ tyre_id: i.id, accept: m[i.id].result === 'ACCEPT', reason: m[i.id].reason, returned_as: m[i.id].as, removed_tyre_no: m[i.id].removed, fleet_no: m[i.id].fleet })), at, close)}>{busy ? 'Working…' : 'Create GRN'}</button></div>
    </Modal>
  );
}
