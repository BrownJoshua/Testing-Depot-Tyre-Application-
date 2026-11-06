import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { fmtDateTime } from '../lib/masters';
import {
  createSrn, createWsr, issueWsr, loadStock, MRN_STATUS_LABEL, PART_LABEL, receiveGin, receiveMrn, receiveSrn, SCRAP_DEFAULT_UNIT, SCRAP_MATERIALS, WSR_STATUS_LABEL, type Row, type StockCtx,
} from '../lib/stock';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader } from '../components/ui';
import { Modal } from '../components/OpsBits';
import { ReceiveGinDlg } from '../components/CardDocs';

const pill = (txt: string, tone: 'green' | 'amber' | 'slate' | 'blue' = 'slate') =>
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${{ green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800', slate: 'bg-slate-100 text-slate-700', blue: 'bg-blue-100 text-blue-800' }[tone]}`}>{txt}</span>;

function useStock() {
  const [ctx, setCtx] = useState<StockCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dlgError, setDlgError] = useState<string | null>(null);
  const load = useCallback(() => { loadStock().then(setCtx).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);
  /** run an action; on success close the dialog (via done) and reload */
  async function act(fn: () => Promise<unknown>, ok: string, done: () => void) {
    setBusy(true); setDlgError(null); setError(null);
    try { await fn(); setNotice(ok); done(); load(); } catch (e) { setDlgError((e as Error).message); } finally { setBusy(false); }
  }
  return { ctx, error, notice, busy, dlgError, setDlgError, act };
}

const Tabs = ({ tabs, tab, set }: { tabs: [string, string][]; tab: string; set: (k: string) => void }) => (
  <div className="mb-3 flex gap-2" role="tablist">{tabs.map(([k, l]) => (
    <button key={k} role="tab" aria-selected={tab === k} onClick={() => set(k)} className={`rounded-full border px-4 py-1.5 text-sm ${tab === k ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`}>{l}</button>
  ))}</div>
);
const Th = ({ cols }: { cols: string[] }) => <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{cols.map((c) => <th key={c} className="px-4 py-2">{c}</th>)}</tr></thead>;

const sizeCode = (c: StockCtx, id: string | null) => c.sizes.find((s) => s.id === id)?.size_code ?? '—';
const tyreNo = (c: StockCtx, id: string | null) => c.tyres.find((t) => t.id === id)?.mtc_no;
const itemNo = (c: StockCtx, id: string | null) => c.items.find((i) => i.id === id)?.item_no;
const cardNo = (c: StockCtx, id: string | null) => c.cards.find((x) => x.id === id)?.job_card_no;
const lineText = (c: StockCtx, l: Row) => `${PART_LABEL[l.part]} ${sizeCode(c, l.size_id)}${l.line_status === 'ISSUED' ? ` → ${tyreNo(c, l.issued_tyre_id) ?? itemNo(c, l.issued_item_id)}` : l.line_status === 'CLOSED' ? ' (closed)' : ''}`;

/* ------------------------------------------------------------------ WSR + WSR GIN */
export function WsrPage() {
  const { ctx, error, notice, busy, dlgError, setDlgError, act } = useStock();
  const [tab, setTab] = useState('wsr');
  const [dlg, setDlg] = useState<{ k: 'new' } | { k: 'issue'; w: Row } | { k: 'gin'; g: Row } | null>(null);
  const close = () => setDlg(null);
  const open = (d: NonNullable<typeof dlg>) => { setDlgError(null); setDlg(d); };

  return (
    <div>
      <PageHeader title="WSR and WSR GIN" subtitle="Material requests from live stock, and the GIN made when you issue them."
        action={<button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => open({ k: 'new' })}><Plus size={16} /> New WSR</button>} />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <Tabs tabs={[['wsr', 'WSR'], ['gin', 'WSR GIN']]} tab={tab} set={setTab} />
      <div className={`${cardCls} overflow-x-auto`}>
        {tab === 'wsr' ? (
          <table className="w-full min-w-[820px] text-sm"><Th cols={['WSR No', 'Date & Time', 'Job Card', 'Items', 'Raised By', 'Status', 'Action']} />
            <tbody>
              {!ctx && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
              {ctx && ctx.wsrs.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">No WSR yet.</td></tr>}
              {ctx?.wsrs.map((w) => {
                const ls = ctx.lines.filter((l) => l.wsr_id === w.id);
                return (
                  <tr key={w.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-2 font-medium">{w.wsr_no}</td><td className="px-4 py-2">{fmtDateTime(w.created_at)}</td>
                    <td className="px-4 py-2">{[...new Set(ls.map((l) => cardNo(ctx, l.job_card_id)).filter(Boolean))].map((n) => {
                      const c = ctx.cards.find((x) => x.job_card_no === n);
                      return <Link key={n} className="mr-1 text-blue-700 underline" to={`/tic/job-cards/${c?.id}`}>{n}</Link>; }) }{ls.every((l) => !l.job_card_id) && '—'}</td>
                    <td className="px-4 py-2">{ls.map((l) => <div key={l.id}>{lineText(ctx, l)}</div>)}</td>
                    <td className="px-4 py-2">{ctx.staff.find((s) => s.id === w.requested_by)?.full_name ?? '—'}</td>
                    <td className="px-4 py-2">{pill(WSR_STATUS_LABEL[w.status], w.status === 'ISSUED' ? 'green' : 'amber')}</td>
                    <td className="px-4 py-2">{ls.some((l) => l.line_status === 'REQUESTED') && <button className={btnPlain} onClick={() => open({ k: 'issue', w })}>Issue</button>}</td>
                  </tr>
                );
              })}
            </tbody></table>
        ) : (
          <table className="w-full min-w-[820px] text-sm"><Th cols={['GIN Number', 'GIN Date & Time', 'WSR No', 'Items', 'Issued By', 'Status', 'Receipt', 'Action']} />
            <tbody>
              {ctx && ctx.gins.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">No WSR GIN yet. It is made when a WSR is issued.</td></tr>}
              {ctx?.gins.map((g) => {
                const ls = ctx.lines.filter((l) => l.wsr_id === g.wsr_id && l.issued_qty > 0);
                const pending = ls.filter((l) => l.receive_status === 'PENDING').length;
                const grn = ctx.grns.find((x) => x.wsr_gin_id === g.id);
                return (
                  <tr key={g.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-2 font-medium">{g.gin_no}</td><td className="px-4 py-2">{fmtDateTime(g.issued_at)}</td><td className="px-4 py-2">{ctx.wsrs.find((w) => w.id === g.wsr_id)?.wsr_no}</td>
                    <td className="px-4 py-2">{ls.map((l) => <div key={l.id}>{lineText(ctx, l)}</div>)}</td>
                    <td className="px-4 py-2">{ctx.staff.find((s) => s.id === g.issued_by)?.full_name}</td><td className="px-4 py-2">{pill('Approved', 'green')}</td>
                    <td className="px-4 py-2">{pending ? pill(`${pending} to receive`, 'amber') : grn ? <>{pill('Received', 'green')}<div className="text-xs text-slate-500">{grn.grn_no} · {grn.accepted_qty} accepted, {grn.rejected_qty} rejected</div></> : pill('Received', 'green')}</td>
                    <td className="px-4 py-2">{pending > 0 && <button className={btnPlain} onClick={() => open({ k: 'gin', g })}>Receive</button>}</td>
                  </tr>
                );
              })}
            </tbody></table>
        )}
      </div>

      {dlg?.k === 'new' && ctx && <NewWsrDlg ctx={ctx} busy={busy} error={dlgError} onCancel={close} onSave={(lines) => void act(() => createWsr(lines), 'WSR raised.', close)} />}
      {dlg?.k === 'issue' && ctx && <IssueDlg ctx={ctx} w={dlg.w} busy={busy} error={dlgError} onCancel={close} onSave={(picks) => void act(() => issueWsr(dlg.w.id, picks), 'Issued. The WSR GIN is made.', close)} />}
      {dlg?.k === 'gin' && ctx && <ReceiveGinDlg ctx={ctx} docs={ctx} gin={dlg.g} busy={busy} error={dlgError} onCancel={close} onSave={(r) => void act(() => receiveGin(dlg.g.id, r), 'GRN created.', close)} />}
    </div>
  );
}

export function NewWsrDlg({ ctx, busy, error, onCancel, onSave }: { ctx: StockCtx; busy: boolean; error: string | null; onCancel: () => void; onSave: (l: { part: string; size_id: string; job_card_id: string | null }[]) => void }) {
  const [lines, setLines] = useState<{ part: string; size_id: string; job_card_id: string }[]>([{ part: 'TYRE', size_id: '', job_card_id: '' }]);
  const upd = (i: number, p: Partial<(typeof lines)[0]>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...p } : l)));
  return (
    <Modal title="New WSR" onClose={onCancel}>
      {error && <Banner kind="error">{error}</Banner>}
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_1.4fr_1.4fr_auto] gap-2">
            <select className={inputCls} aria-label="Item" value={l.part} onChange={(e) => upd(i, { part: e.target.value })}>{Object.entries(PART_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <select className={inputCls} aria-label="Size" value={l.size_id} onChange={(e) => upd(i, { size_id: e.target.value })}><option value="">Size…</option>{ctx.sizes.filter((s) => s.status === 'ACTIVE').map((s) => <option key={s.id} value={s.id}>{s.size_code}</option>)}</select>
            <select className={inputCls} aria-label="Job card" value={l.job_card_id} onChange={(e) => upd(i, { job_card_id: e.target.value })}><option value="">No job card</option>{ctx.cards.filter((c) => !['COMPLETED', 'CLOSED'].includes(c.status)).map((c) => <option key={c.id} value={c.id}>{c.job_card_no}</option>)}</select>
            <button type="button" className={btnPlain} aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, k) => k !== i))}><Trash2 size={16} /></button>
          </div>
        ))}
        <button type="button" className={btnPlain} onClick={() => setLines([...lines, { part: 'TYRE', size_id: '', job_card_id: '' }])}>+ Add item</button>
      </div>
      <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={btnPrimary} disabled={busy || lines.some((l) => !l.size_id)} onClick={() => onSave(lines.map((l) => ({ part: l.part, size_id: l.size_id, job_card_id: l.job_card_id || null })))}>Raise WSR</button></div>
    </Modal>
  );
}

function IssueDlg({ ctx, w, busy, error, onCancel, onSave }: { ctx: StockCtx; w: Row; busy: boolean; error: string | null; onCancel: () => void; onSave: (p: { line_id: string; tyre_id?: string | null; item_id?: string | null }[]) => void }) {
  const open = ctx.lines.filter((l) => l.wsr_id === w.id && l.line_status === 'REQUESTED');
  const [pick, setPick] = useState<Record<string, string>>({});
  const chosen = new Set(Object.values(pick).filter(Boolean));
  const options = (l: Row) => l.part === 'TYRE'
    ? ctx.tyres.filter((t) => t.stock_place === 'LIVE_STOCK' && ctx.folios.find((f) => f.id === t.folio_id)?.tyre_size_id === l.size_id && (!chosen.has(t.id) || pick[l.id] === t.id)).map((t) => ({ id: t.id, text: `${t.mtc_no} · ${t.stock_category === 'GOOD' ? 'Good' : 'Repair'} · ${t.setting_status === 'SET' ? 'Set' : 'Unset'}` }))
    : ctx.items.filter((i) => i.stock_place === 'LIVE_STOCK' && i.part === l.part && i.size_id === l.size_id && (!chosen.has(i.id) || pick[l.id] === i.id)).map((i) => ({ id: i.id, text: i.item_no }));
  return (
    <Modal title={`Issue ${w.wsr_no}`} onClose={onCancel}>
      {error && <Banner kind="error">{error}</Banner>}
      <p className="mb-2 text-xs text-slate-500">Pick what you issue. A line left empty closes (the balance closes).</p>
      <div className="space-y-2">{open.map((l) => (
        <div key={l.id} className="grid grid-cols-[8rem_1fr] items-center gap-2 text-sm"><span>{PART_LABEL[l.part]} {sizeCode(ctx, l.size_id)}</span>
          <select className={inputCls} aria-label={`${PART_LABEL[l.part]} ${sizeCode(ctx, l.size_id)}`} value={pick[l.id] ?? ''} onChange={(e) => setPick({ ...pick, [l.id]: e.target.value })}>
            <option value="">Not issued</option>{options(l).map((o) => <option key={o.id} value={o.id}>{o.text}</option>)}</select></div>
      ))}</div>
      <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={btnPrimary} disabled={busy} onClick={() => onSave(open.filter((l) => pick[l.id]).map((l) => ({ line_id: l.id, tyre_id: l.part === 'TYRE' ? pick[l.id] : null, item_id: l.part === 'TYRE' ? null : pick[l.id] })))}>Issue (make GIN)</button></div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ Material Return GRN */
export function ReturnGrnPage() {
  const { ctx, error, notice, busy, dlgError, setDlgError, act } = useStock();
  const [dlg, setDlg] = useState<Row | null>(null);
  const [accept, setAccept] = useState(true);
  const [cat, setCat] = useState('');
  const [remarks, setRemarks] = useState('');
  const close = () => setDlg(null);
  const what = (c: StockCtx, m: Row) => m.kind === 'TYRE' ? `Tyre ${tyreNo(c, m.tyre_id)}` : `${PART_LABEL[c.items.find((i) => i.id === m.item_id)?.part ?? ''] ?? 'Item'} ${itemNo(c, m.item_id)}`;
  return (
    <div>
      <PageHeader title="Material Return GRN" subtitle="Tyres removed from fleets and material returned by the Tyre Man. Receiving makes a GRN and moves accepted tyres to live stock." />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[820px] text-sm"><Th cols={['MRN No', 'Date & Time', 'Tyre / Item', 'Job Card', 'Remarks', 'Status', 'GRN No', 'Action']} />
          <tbody>
            {!ctx && <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {ctx && ctx.mrns.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">No MRN yet.</td></tr>}
            {ctx?.mrns.map((m) => {
              const c = ctx.cards.find((x) => x.id === m.job_card_id);
              return (
                <tr key={m.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-2 font-medium">{m.mrn_no}</td><td className="px-4 py-2">{fmtDateTime(m.created_at)}</td><td className="px-4 py-2">{what(ctx, m)}</td>
                  <td className="px-4 py-2">{c ? <Link className="text-blue-700 underline" to={`/tic/job-cards/${c.id}`}>{c.job_card_no}</Link> : '—'}</td><td className="px-4 py-2">{m.remarks ?? '—'}</td>
                  <td className="px-4 py-2">{m.status === 'CREATED' ? pill(m.ready ? 'Ready to receive' : 'Waiting for removal', m.ready ? 'blue' : 'slate') : pill(MRN_STATUS_LABEL[m.status] + (m.stock_category ? ` · ${m.stock_category === 'GOOD' ? 'Good' : 'Repair'}` : ''), m.status === 'RECEIVED' ? 'green' : 'amber')}</td>
                  <td className="px-4 py-2">{m.grn_no ?? '—'}</td>
                  <td className="px-4 py-2">{m.status === 'CREATED' && m.ready && <button className={btnPlain} onClick={() => { setDlgError(null); setAccept(true); setCat(''); setRemarks(''); setDlg(m); }}>Receive</button>}</td>
                </tr>
              );
            })}
          </tbody></table>
      </div>
      {dlg && ctx && (
        <Modal title={`Receive ${dlg.mrn_no}`} onClose={close}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <p className="mb-2 text-sm">{what(ctx, dlg)}</p>
          <div className="mb-2 flex gap-4 text-sm">
            <label className="flex items-center gap-1"><input type="radio" checked={accept} onChange={() => setAccept(true)} /> Accept</label>
            <label className="flex items-center gap-1"><input type="radio" checked={!accept} onChange={() => setAccept(false)} /> Reject</label>
          </div>
          {accept && dlg.kind === 'TYRE' && <Field label="Goes to live stock as *"><select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Select…</option><option value="GOOD">Good</option><option value="REPAIR">Repair</option></select></Field>}
          <Field label="Remarks"><input className={inputCls} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
          <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={close} disabled={busy}>Cancel</button>
            <button className={btnPrimary} disabled={busy} onClick={() => void act(() => receiveMrn(dlg.id, accept, accept && dlg.kind === 'TYRE' ? cat : null, remarks), 'Received. GRN made.', close)}>Receive (make GRN)</button></div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Scrap Return Note + scrap stock */
export function SrnPage() {
  const { ctx, error, notice, busy, dlgError, setDlgError, act } = useStock();
  const [tab, setTab] = useState('srn');
  const [creating, setCreating] = useState(false);
  const [card, setCard] = useState('');
  const [rows, setRows] = useState<{ material: string; qty: string; unit: string }[]>([{ material: 'Rubber', qty: '', unit: 'kg' }]);
  const close = () => setCreating(false);
  return (
    <div>
      <PageHeader title="Scrap Return Note" subtitle="Scrap returned against a job card. Receiving makes a GRN and adds to the scrap stock."
        action={<button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => { setDlgError(null); setCard(''); setRows([{ material: 'Rubber', qty: '', unit: 'kg' }]); setCreating(true); }}><Plus size={16} /> New SRN</button>} />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <Tabs tabs={[['srn', 'SRN'], ['stock', 'Scrap Stock']]} tab={tab} set={setTab} />
      <div className={`${cardCls} overflow-x-auto`}>
        {tab === 'srn' ? (
          <table className="w-full min-w-[760px] text-sm"><Th cols={['SRN No', 'Date & Time', 'Job Card', 'Material', 'Status', 'GRN No', 'Action']} />
            <tbody>
              {ctx && ctx.srns.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">No SRN yet.</td></tr>}
              {ctx?.srns.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-2 font-medium">{s.srn_no}</td><td className="px-4 py-2">{fmtDateTime(s.created_at)}</td>
                  <td className="px-4 py-2">{s.job_card_id ? <Link className="text-blue-700 underline" to={`/tic/job-cards/${s.job_card_id}`}>{cardNo(ctx, s.job_card_id)}</Link> : '—'}</td>
                  <td className="px-4 py-2">{ctx.srnLines.filter((l) => l.srn_id === s.id).map((l) => <div key={l.id}>{l.material} · {Number(l.qty)} {l.unit}</div>)}</td>
                  <td className="px-4 py-2">{pill(s.status === 'RECEIVED' ? 'Received' : 'Created', s.status === 'RECEIVED' ? 'green' : 'blue')}</td><td className="px-4 py-2">{s.grn_no ?? '—'}</td>
                  <td className="px-4 py-2">{s.status === 'CREATED' && <button className={btnPlain} disabled={busy} onClick={() => void act(() => receiveSrn(s.id), 'Received. GRN made.', () => undefined)}>Receive</button>}</td>
                </tr>
              ))}
            </tbody></table>
        ) : (
          <table className="w-full min-w-[520px] text-sm"><Th cols={['Material Type', 'Unit', 'Stock', 'SRNs']} />
            <tbody>
              {ctx && ctx.scrap.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No scrap received yet.</td></tr>}
              {ctx?.scrap.map((r) => <tr key={`${r.material}-${r.unit}`} className="border-t border-slate-100"><td className="px-4 py-2 font-medium">{r.material}</td><td className="px-4 py-2">{r.unit}</td><td className="px-4 py-2">{Number(r.stock_qty)}</td><td className="px-4 py-2">{r.srn_count}</td></tr>)}
            </tbody></table>
        )}
      </div>
      {creating && ctx && (
        <Modal title="New Scrap Return Note" onClose={close}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <Field label="Job card *"><select className={inputCls} value={card} onChange={(e) => setCard(e.target.value)}><option value="">Select…</option>{ctx.cards.map((c) => <option key={c.id} value={c.id}>{c.job_card_no}</option>)}</select></Field>
          <div className="mt-2 space-y-2">{rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1.6fr_1fr_1fr_auto] gap-2">
              <select className={inputCls} aria-label="Material type" value={r.material} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, material: e.target.value, unit: SCRAP_DEFAULT_UNIT[e.target.value] } : x)))}>{SCRAP_MATERIALS.map((m) => <option key={m}>{m}</option>)}</select>
              <input className={inputCls} type="number" min="0" step="0.01" placeholder="Quantity" aria-label="Quantity" value={r.qty} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, qty: e.target.value } : x)))} />
              <select className={inputCls} aria-label="Unit" value={r.unit} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, unit: e.target.value } : x)))}><option>kg</option><option>nos</option></select>
              <button type="button" className={btnPlain} aria-label="Remove line" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, k) => k !== i))}><Trash2 size={16} /></button>
            </div>))}
            <button type="button" className={btnPlain} onClick={() => setRows([...rows, { material: 'Rubber', qty: '', unit: 'kg' }])}>+ Add line</button></div>
          <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={close} disabled={busy}>Cancel</button>
            <button className={btnPrimary} disabled={busy || !card || rows.some((r) => !(Number(r.qty) > 0))} onClick={() => void act(() => createSrn(card, rows.map((r) => ({ material: r.material, qty: Number(r.qty), unit: r.unit })), ''), 'SRN created.', close)}>Create SRN</button></div>
        </Modal>
      )}
    </div>
  );
}
