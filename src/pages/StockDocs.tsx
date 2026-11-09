import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { fmtDateTime } from '../lib/masters';
import {
  createSrn, createWsr, issueWsr, loadStock, MRN_STATUS_LABEL, PART_LABEL, receiveGin, receiveMrn, receiveSrn, SCRAP_DEFAULT_UNIT, SCRAP_MATERIALS, WSR_STATUS_LABEL, type Row, type StockCtx,
} from '../lib/stock';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader, ReasonDialog } from '../components/ui';
import { Modal } from '../components/OpsBits';
import { rejectWsr } from '../lib/logistics';
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

/* ------------------------------------------------------------------ WSR + WSR GIN */
const WSR_TONE: Record<string, 'green' | 'amber' | 'slate' | 'blue'> = { ISSUED: 'green', PARTLY_ISSUED: 'amber', REQUESTED: 'blue', REJECTED: 'slate', CANCELLED: 'slate' };
const wsrLabel = (s: string) => ({ ...WSR_STATUS_LABEL, REJECTED: 'Rejected', CANCELLED: 'Cancelled' } as Record<string, string>)[s] ?? s;
/** only = 'wsr' (WSR Request list) or 'gin' (WSR Issue GIN list); without it both show as tabs */
export function WsrPage({ only }: { only?: 'wsr' | 'gin' }) {
  const { ctx, error, notice, busy, dlgError, setDlgError, act } = useStock();
  const [tab, setTab] = useState<string>(only ?? 'wsr');
  const [status, setStatus] = useState('');
  const [material, setMaterial] = useState('');
  const [dlg, setDlg] = useState<{ k: 'new' } | { k: 'issue'; w: Row } | { k: 'gin'; g: Row } | { k: 'view'; w: Row } | { k: 'viewgin'; g: Row } | { k: 'reject'; w: Row } | null>(null);
  const close = () => setDlg(null);
  const open = (d: NonNullable<typeof dlg>) => { setDlgError(null); setDlg(d); };
  const linesOf = (w: Row) => ctx?.lines.filter((l) => l.wsr_id === w.id) ?? [];
  const wsrRows = (ctx?.wsrs ?? []).filter((w) => (!status || w.status === status) && (!material || linesOf(w).some((l) => l.part === material)));
  const itemsText = (wsrId: string) => ctx!.lines.filter((l) => l.wsr_id === wsrId && l.issued_qty > 0).map((l) => `${PART_LABEL[l.part]} ${sizeCode(ctx!, l.size_id)} x${l.issued_qty}`).join(', ');
  const who = (id: string) => ctx?.staff.find((s) => s.id === id)?.full_name ?? '—';

  return (
    <div>
      <PageHeader title={only === 'gin' ? 'WSR Issue GIN' : only === 'wsr' ? 'WSR Request' : 'WSR and WSR GIN'} subtitle="Material requests from live stock, and the GIN made when you issue them."
        action={tab === 'wsr' ? <button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => open({ k: 'new' })}><Plus size={16} /> Raise WSR</button> : undefined} />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      {!only && <Tabs tabs={[['wsr', 'WSR'], ['gin', 'WSR GIN']]} tab={tab} set={setTab} />}
      {tab === 'wsr' && <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <select className={`${inputCls} w-44`} aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{['REQUESTED', 'PARTLY_ISSUED', 'ISSUED', 'REJECTED', 'CANCELLED'].map((s) => <option key={s} value={s}>{wsrLabel(s)}</option>)}</select>
        <span className="flex gap-1">{[['', 'All'], ['TUBE', 'Tube'], ['FLAP', 'Flap'], ['DISC', 'Disc'], ['TYRE', 'Tyre']].map(([k, l]) => <button key={k} onClick={() => setMaterial(k)} className={`rounded-full border px-3 py-1 ${material === k ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`}>{l}</button>)}</span>
      </div>}
      <div className={`${cardCls} overflow-x-auto`}>
        {tab === 'wsr' ? (
          <table className="w-full min-w-[820px] text-sm"><Th cols={['S.No', 'WSR No', 'WSR Date & Time', 'Job Card No', 'Fleet No', 'Status', 'Action']} />
            <tbody>
              {!ctx && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
              {ctx && wsrRows.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">No WSR here.</td></tr>}
              {wsrRows.map((w, n) => {
                const ls = linesOf(w);
                const cards = [...new Set(ls.map((l) => l.job_card_id).filter(Boolean))];
                const gin = ctx!.gins.find((g) => g.wsr_id === w.id);
                return (
                  <tr key={w.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-2">{n + 1}</td>
                    <td className="px-4 py-2 font-medium"><button className="text-blue-700 underline" onClick={() => open({ k: 'view', w })}>{w.wsr_no}</button></td><td className="px-4 py-2">{fmtDateTime(w.created_at)}</td>
                    <td className="px-4 py-2">{cards.length ? cards.map((c) => <div key={c}><Link className="text-blue-700 underline" to={`/tic/job-cards/${c}`}>{cardNo(ctx!, c)}</Link></div>) : '—'}</td>
                    <td className="px-4 py-2">{[...new Set(ls.map((l) => ctx!.fleets.find((f) => f.id === l.fleet_id)?.fleet_no).filter(Boolean))].map((f) => <div key={f}>{f}</div>)}{ls.every((l) => !l.fleet_id) && '—'}</td>
                    <td className="px-4 py-2">{pill(wsrLabel(w.status), WSR_TONE[w.status])}{gin && <div className="mt-0.5 text-xs text-slate-500">{gin.gin_no}</div>}{w.status_note && <div className="mt-0.5 text-xs text-slate-500">{w.status_note}</div>}</td>
                    <td className="px-4 py-2">{w.status === 'REQUESTED' && <div className="flex gap-1"><button className={btnPrimary} onClick={() => open({ k: 'issue', w })}>Accept &amp; Issue</button><button className={btnPlain} onClick={() => open({ k: 'reject', w })}>Reject</button></div>}</td>
                  </tr>
                );
              })}
            </tbody></table>
        ) : (
          <table className="w-full min-w-[820px] text-sm"><Th cols={['S.No', 'GIN Number', 'GIN Date & Time', 'WSR No', 'Items', 'Requested By', 'Issued By', 'Status', 'Action']} />
            <tbody>
              {ctx && ctx.gins.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-500">No WSR GIN yet. It is made when a WSR is issued.</td></tr>}
              {ctx?.gins.map((g, n) => {
                const pending = ctx.lines.filter((l) => l.wsr_id === g.wsr_id && l.receive_status === 'PENDING').length;
                const w = ctx.wsrs.find((x) => x.id === g.wsr_id);
                return (
                  <tr key={g.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-2">{n + 1}</td><td className="px-4 py-2 font-medium"><button className="text-blue-700 underline" onClick={() => open({ k: 'viewgin', g })}>{g.gin_no}</button></td><td className="px-4 py-2">{fmtDateTime(g.issued_at)}</td><td className="px-4 py-2">{w?.wsr_no}</td>
                    <td className="px-4 py-2">{itemsText(g.wsr_id)}</td><td className="px-4 py-2">{w ? who(w.requested_by) : '—'}</td><td className="px-4 py-2">{who(g.issued_by)}</td>
                    <td className="px-4 py-2">{pill('Approved', 'green')}{pending > 0 && <div className="mt-0.5 text-xs text-slate-500">{pending} to receive</div>}</td>
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
      {dlg?.k === 'reject' && <ReasonDialog title={`Reject ${dlg.w.wsr_no}?`} confirmLabel="Reject" danger required busy={busy} error={dlgError} onCancel={close} onConfirm={(t) => void act(() => rejectWsr(dlg.w.id, t), 'WSR rejected.', close)} />}
      {(dlg?.k === 'view' || dlg?.k === 'viewgin') && ctx && (() => {
        const w = dlg.k === 'view' ? dlg.w : ctx.wsrs.find((x) => x.id === dlg.g.wsr_id)!;
        return (
          <Modal title={dlg.k === 'view' ? `WSR ${w.wsr_no}` : `Goods Issue Note ${dlg.g.gin_no}`} onClose={close}>
            <dl className="mb-3 grid grid-cols-2 gap-1 text-sm"><dt className="text-slate-500">WSR</dt><dd>{w.wsr_no} · {wsrLabel(w.status)}</dd><dt className="text-slate-500">Requested by</dt><dd>{who(w.requested_by)}</dd>
              <dt className="text-slate-500">Date</dt><dd>{fmtDateTime(w.created_at)}</dd>{w.status_note && <><dt className="text-slate-500">Note</dt><dd>{w.status_note}</dd></>}</dl>
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><Th cols={['Item', 'Size', 'Folio', 'MTC / Item No', 'Req. Qty', 'Issued Qty', 'Job Card']} /><tbody>
              {linesOf(w).map((l) => { const t = ctx.tyres.find((x) => x.id === l.issued_tyre_id); const f = ctx.folios.find((x) => x.id === t?.folio_id);
                return <tr key={l.id} className="border-t border-slate-100"><td className="px-3 py-1.5">{PART_LABEL[l.part]}</td><td className="px-3 py-1.5">{sizeCode(ctx, l.size_id)}</td><td className="px-3 py-1.5">{f ? `${f.folio_no} · ${f.folio_name}` : '—'}</td>
                  <td className="px-3 py-1.5">{t?.mtc_no ?? itemNo(ctx, l.issued_item_id) ?? '—'}</td><td className="px-3 py-1.5">{l.requested_qty}</td><td className="px-3 py-1.5">{l.issued_qty}</td><td className="px-3 py-1.5">{cardNo(ctx, l.job_card_id) ?? '—'}</td></tr>; })}
            </tbody></table></div>
            <div className="mt-3 flex justify-end"><button className={btnPlain} onClick={close}>Close</button></div>
          </Modal>
        );
      })()}
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
  const [f, setF] = useState('');
  const [accept, setAccept] = useState(true);
  const [cat, setCat] = useState('');
  const [remarks, setRemarks] = useState('');
  const close = () => setDlg(null);
  const shown = (ctx?.mrns ?? []).filter((m) => !f || (f === 'CREATED' ? m.status === 'CREATED' && m.ready : m.status !== 'CREATED'));
  const what = (c: StockCtx, m: Row) => m.kind === 'TYRE' ? `Tyre ${tyreNo(c, m.tyre_id)}` : `${PART_LABEL[c.items.find((i) => i.id === m.item_id)?.part ?? ''] ?? 'Item'} ${itemNo(c, m.item_id)}`;
  return (
    <div>
      <PageHeader title="Material Return GRN" subtitle="Tyres removed from fleets and material returned by the Tyre Man. Receiving makes a GRN and moves accepted tyres to live stock." />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button onClick={() => setF('')} className={`rounded-xl border px-4 py-2 text-left ${f === '' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}><div className="text-xl font-bold">{ctx?.mrns.length ?? 0}</div><div className="text-xs uppercase tracking-wide text-slate-500">All</div></button>
        <button onClick={() => setF('CREATED')} className={`rounded-xl border px-4 py-2 text-left ${f === 'CREATED' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}><div className="text-xl font-bold">{ctx?.mrns.filter((m) => m.status === 'CREATED' && m.ready).length ?? 0}</div><div className="text-xs uppercase tracking-wide text-slate-500">Ready to receive</div></button>
        <button onClick={() => setF('RECEIVED')} className={`rounded-xl border px-4 py-2 text-left ${f === 'RECEIVED' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}><div className="text-xl font-bold">{ctx?.mrns.filter((m) => m.status !== 'CREATED').length ?? 0}</div><div className="text-xs uppercase tracking-wide text-slate-500">Received</div></button>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[980px] text-sm"><Th cols={['S.No', 'GRN No', 'Source', 'GRN Date & Time', 'Requested By', 'Requested To', 'Issued Qty', 'Accepted Qty', 'Rejected Qty', 'Status', 'Action']} />
          <tbody>
            {!ctx && <tr><td colSpan={11} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {ctx && shown.length === 0 && <tr><td colSpan={11} className="px-4 py-6 text-center text-slate-500">No MRN here.</td></tr>}
            {shown.map((m, n) => {
              const c = ctx!.cards.find((x) => x.id === m.job_card_id);
              const by = ctx!.staff.find((s) => s.id === m.created_by);
              const grn = ctx!.grns.find((g) => g.mrn_id === m.id);
              return (
                <tr key={m.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-2">{n + 1}</td><td className="px-4 py-2">{m.grn_no ?? '—'}</td>
                  <td className="px-4 py-2 font-medium">{m.mrn_no}<div className="text-xs font-normal text-slate-500">{what(ctx!, m)}{c && <> · <Link className="text-blue-700 underline" to={`/tic/job-cards/${c.id}`}>{c.job_card_no}</Link></>}</div></td>
                  <td className="px-4 py-2">{fmtDateTime(grn?.received_at ?? m.created_at)}</td>
                  <td className="px-4 py-2">{by ? `${by.role_code === 'TM' ? 'Tyre Man' : 'Tyre IC'} — ${by.full_name}` : '—'}</td><td className="px-4 py-2">Tyre Incharge</td>
                  <td className="px-4 py-2">1</td><td className="px-4 py-2">{grn ? grn.accepted_qty : '—'}</td><td className="px-4 py-2">{grn ? grn.rejected_qty : '—'}</td>
                  <td className="px-4 py-2">{m.status === 'CREATED' ? pill(m.ready ? 'Ready to receive' : 'Waiting for removal', m.ready ? 'blue' : 'slate') : pill(MRN_STATUS_LABEL[m.status] + (m.stock_category ? ` · ${m.stock_category === 'GOOD' ? 'Good' : 'Repair'}` : ''), m.status === 'RECEIVED' ? 'green' : 'amber')}</td>
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
