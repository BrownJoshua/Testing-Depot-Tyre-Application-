import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { fmtDateTime } from '../../lib/masters';
import { createMrn, createSrn, createWsr, loadStock, MRN_STATUS_LABEL, PART_LABEL, receiveGin, SCRAP_DEFAULT_UNIT, SCRAP_MATERIALS, WSR_STATUS_LABEL, type Row, type StockCtx } from '../../lib/stock';
import { Banner, btnPlain, btnPrimary, inputCls } from '../../components/ui';
import { ReceiveGinDlg } from '../../components/CardDocs';
import { NewWsrDlg } from '../StockDocs';

function useStock() {
  const [ctx, setCtx] = useState<StockCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dlgError, setDlgError] = useState<string | null>(null);
  const load = useCallback(() => { loadStock().then(setCtx).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);
  async function act(fn: () => Promise<unknown>, ok: string, done: () => void) {
    setBusy(true); setDlgError(null); setError(null);
    try { await fn(); setNotice(ok); done(); load(); } catch (e) { setDlgError((e as Error).message); } finally { setBusy(false); }
  }
  return { ctx, error, notice, busy, dlgError, setDlgError, act };
}
const Card = ({ children }: { children: React.ReactNode }) => <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>;
const H = ({ children }: { children: React.ReactNode }) => <h2 className="pt-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h2>;
const tyreNo = (c: StockCtx, id: string | null) => c.tyres.find((t) => t.id === id)?.mtc_no;
const itemNo = (c: StockCtx, id: string | null) => c.items.find((i) => i.id === id)?.item_no;
const sizeCode = (c: StockCtx, id: string | null) => c.sizes.find((s) => s.id === id)?.size_code ?? '';

/* ------------------------------------------------------------------ GRN: receive a WSR GIN */
export function TmGrn() {
  const { ctx, error, notice, busy, dlgError, setDlgError, act } = useStock();
  const [gin, setGin] = useState<Row | null>(null);
  const pending = (ctx?.gins ?? []).filter((g) => ctx!.lines.some((l) => l.wsr_id === g.wsr_id && l.receive_status === 'PENDING'));
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-slate-900">GRN</h1>
      <p className="text-sm text-slate-600">Receive the tyres and items issued against your WSR. Accept or reject each one.</p>
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      {!ctx && !error && <p className="text-slate-500">Loading…</p>}
      {ctx && pending.length === 0 && <Banner kind="info">Nothing is waiting to be received.</Banner>}
      {pending.map((g) => (
        <Card key={g.id}>
          <div className="font-semibold">{g.gin_no} <span className="font-normal text-slate-500">· {ctx!.wsrs.find((w) => w.id === g.wsr_id)?.wsr_no}</span></div>
          <ul className="mt-1 text-sm text-slate-700">{ctx!.lines.filter((l) => l.wsr_id === g.wsr_id && l.receive_status === 'PENDING').map((l) => <li key={l.id}>{PART_LABEL[l.part]} · {tyreNo(ctx!, l.issued_tyre_id) ?? itemNo(ctx!, l.issued_item_id)}</li>)}</ul>
          <button className={`${btnPrimary} mt-3 min-h-12 w-full text-base`} onClick={() => { setDlgError(null); setGin(g); }}>Receive</button>
        </Card>
      ))}
      {ctx && ctx.grns.filter((g) => g.source === 'WSR_GIN').length > 0 && <H>Received</H>}
      {ctx?.grns.filter((g) => g.source === 'WSR_GIN').slice(0, 10).map((g) => <div key={g.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm"><strong>{g.grn_no}</strong> · {g.accepted_qty} accepted, {g.rejected_qty} rejected<div className="text-xs text-slate-500">{fmtDateTime(g.received_at)}</div></div>)}
      {gin && ctx && <ReceiveGinDlg ctx={ctx} docs={ctx} gin={gin} busy={busy} error={dlgError} onCancel={() => setGin(null)} onSave={(r) => void act(() => receiveGin(gin.id, r), 'GRN created.', () => setGin(null))} />}
    </div>
  );
}

/* ------------------------------------------------------------------ MRN: return material */
export function TmMrn() {
  const { ctx, error, notice, busy, dlgError, act } = useStock();
  const [pick, setPick] = useState('');
  const [remarks, setRemarks] = useState('');
  const open = new Set((ctx?.mrns ?? []).filter((m) => m.status === 'CREATED').flatMap((m) => [m.tyre_id, m.item_id].filter(Boolean)));
  const held = [
    ...(ctx?.tyres ?? []).filter((t) => t.stock_place === 'IN_TRANSIT' && !t.fleet_id && !open.has(t.id)).map((t) => ({ id: `T${t.id}`, text: `Tyre ${t.mtc_no}` })),
    ...(ctx?.items ?? []).filter((i) => i.stock_place === 'ISSUED' && !open.has(i.id)).map((i) => ({ id: `I${i.id}`, text: `${PART_LABEL[i.part]} ${i.item_no}` })),
  ];
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-slate-900">MRN</h1>
      <p className="text-sm text-slate-600">Return a tyre or an item you hold. The Tyre IC receives it. A tyre removed on a job card gets its MRN automatically.</p>
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}{dlgError && <Banner kind="error">{dlgError}</Banner>}
      <Card>
        <select className={inputCls} aria-label="Tyre or item" value={pick} onChange={(e) => setPick(e.target.value)}><option value="">Select the tyre or item…</option>{held.map((h) => <option key={h.id} value={h.id}>{h.text}</option>)}</select>
        <input className={`${inputCls} mt-2`} placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        <button className={`${btnPrimary} mt-3 min-h-12 w-full text-base`} disabled={busy || !pick}
          onClick={() => void act(() => createMrn(pick[0] === 'T' ? pick.slice(1) : null, pick[0] === 'I' ? pick.slice(1) : null, remarks), 'MRN created.', () => { setPick(''); setRemarks(''); })}>Create MRN</button>
      </Card>
      {ctx && ctx.mrns.length > 0 && <H>My MRNs</H>}
      {ctx?.mrns.map((m) => (
        <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><div className="flex justify-between"><strong>{m.mrn_no}</strong>
          <span>{m.status === 'CREATED' ? (m.ready ? 'Ready to receive' : 'Waiting for removal') : MRN_STATUS_LABEL[m.status]}</span></div>
          <div className="text-slate-600">{m.kind === 'TYRE' ? `Tyre ${tyreNo(ctx, m.tyre_id)}` : `Item ${itemNo(ctx, m.item_id)}`}{m.grn_no && ` · ${m.grn_no}`}</div></div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ scrap lines (also used by the review step) */
export type ScrapRow = { material: string; qty: string; unit: string };
export function ScrapLines({ rows, setRows }: { rows: ScrapRow[]; setRows: (r: ScrapRow[]) => void }) {
  return (
    <div className="space-y-2">{rows.map((r, i) => (
      <div key={i} className="grid grid-cols-[1.5fr_1fr_0.8fr_auto] gap-2">
        <select className={inputCls} aria-label="Material type" value={r.material} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, material: e.target.value, unit: SCRAP_DEFAULT_UNIT[e.target.value] } : x)))}>{SCRAP_MATERIALS.map((m) => <option key={m}>{m}</option>)}</select>
        <input className={inputCls} type="number" min="0" step="0.01" placeholder="Qty" aria-label="Quantity" value={r.qty} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, qty: e.target.value } : x)))} />
        <select className={inputCls} aria-label="Unit" value={r.unit} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, unit: e.target.value } : x)))}><option>kg</option><option>nos</option></select>
        <button type="button" className={btnPlain} aria-label="Remove line" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, k) => k !== i))}><Trash2 size={16} /></button>
      </div>))}
      <button type="button" className={btnPlain} onClick={() => setRows([...rows, { material: 'Rubber', qty: '', unit: 'kg' }])}>+ Add line</button></div>
  );
}
export const blankScrap = (): ScrapRow[] => [{ material: 'Rubber', qty: '', unit: 'kg' }];

export function TmSrn() {
  const { ctx, error, notice, busy, dlgError, act } = useStock();
  const [card, setCard] = useState('');
  const [rows, setRows] = useState<ScrapRow[]>(blankScrap());
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-slate-900">SRN</h1>
      <p className="text-sm text-slate-600">Scrap you return against a job card. The Tyre IC receives it.</p>
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}{dlgError && <Banner kind="error">{dlgError}</Banner>}
      <Card>
        <select className={inputCls} aria-label="Job card" value={card} onChange={(e) => setCard(e.target.value)}><option value="">Select the job card…</option>{ctx?.cards.map((c) => <option key={c.id} value={c.id}>{c.job_card_no}</option>)}</select>
        <div className="mt-2"><ScrapLines rows={rows} setRows={setRows} /></div>
        <button className={`${btnPrimary} mt-3 min-h-12 w-full text-base`} disabled={busy || !card || rows.some((r) => !(Number(r.qty) > 0))}
          onClick={() => void act(() => createSrn(card, rows.map((r) => ({ material: r.material, qty: Number(r.qty), unit: r.unit })), ''), 'SRN created.', () => { setCard(''); setRows(blankScrap()); })}>Create SRN</button>
      </Card>
      {ctx && ctx.srns.length > 0 && <H>My SRNs</H>}
      {ctx?.srns.map((s) => <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><div className="flex justify-between"><strong>{s.srn_no}</strong><span>{s.status === 'RECEIVED' ? `Received · ${s.grn_no}` : 'Created'}</span></div>
        <div className="text-slate-600">{ctx.srnLines.filter((l) => l.srn_id === s.id).map((l) => `${l.material} ${Number(l.qty)} ${l.unit}`).join(', ')}</div></div>)}
    </div>
  );
}

/* ------------------------------------------------------------------ My WSR */
export function TmWsr() {
  const { ctx, error, notice, busy, dlgError, setDlgError, act } = useStock();
  const [creating, setCreating] = useState(false);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-slate-900">My WSR</h1>
      <p className="text-sm text-slate-600">Ask for a tyre, tube, flap or disc by size. The Tyre IC picks the item and issues it.</p>
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <button className={`${btnPrimary} min-h-12 w-full text-base`} onClick={() => { setDlgError(null); setCreating(true); }}>Raise a WSR</button>
      {ctx?.wsrs.map((w) => (
        <div key={w.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><div className="flex justify-between"><strong>{w.wsr_no}</strong><span>{WSR_STATUS_LABEL[w.status]}</span></div>
          {ctx.lines.filter((l) => l.wsr_id === w.id).map((l) => <div key={l.id} className="text-slate-600">{PART_LABEL[l.part]} {sizeCode(ctx, l.size_id)}{l.line_status === 'ISSUED' && ` → ${tyreNo(ctx, l.issued_tyre_id) ?? itemNo(ctx, l.issued_item_id)}`}{l.line_status === 'CLOSED' && ' (closed)'}</div>)}</div>
      ))}
      {creating && ctx && <NewWsrDlg ctx={ctx} busy={busy} error={dlgError} onCancel={() => setCreating(false)} onSave={(lines) => void act(() => createWsr(lines), 'WSR raised.', () => setCreating(false))} />}
    </div>
  );
}
