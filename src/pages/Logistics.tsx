import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/masters';
import {
  createGatePass, createGin, createIndent, gatePassAct, ginAct, GIN_STATUS_LABEL, GP_STATUS_LABEL, indentAct, IND_STATUS_LABEL, loadLogistics, receiveIndentGin, STATUS_TONE, type LogCtx, type Row,
} from '../lib/logistics';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader, ReasonDialog } from '../components/ui';
import { Modal } from '../components/OpsBits';

const Pill = ({ s, label }: { s: string; label: string }) => <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[s] ?? 'bg-slate-100 text-slate-700'}`}>{label}</span>;
const Th = ({ cols }: { cols: string[] }) => <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{cols.map((c) => <th key={c} className="px-3 py-2">{c}</th>)}</tr></thead>;
const Tile = ({ n, label, on, onClick }: { n: number; label: string; on?: boolean; onClick?: () => void }) => (
  <button onClick={onClick} className={`rounded-xl border px-4 py-2 text-left ${on ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}><div className="text-xl font-bold text-slate-900">{n}</div><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div></button>
);

function useLog() {
  const { me } = useAuth();
  const org = me?.org_unit_id ?? '';
  const [ctx, setCtx] = useState<LogCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dlgError, setDlgError] = useState<string | null>(null);
  const load = useCallback(() => { if (org) loadLogistics(org).then(setCtx).catch((e: Error) => setError(e.message)); }, [org]);
  useEffect(load, [load]);
  async function act(fn: () => Promise<unknown>, ok: string, done: () => void) {
    setBusy(true); setDlgError(null); setError(null);
    try { await fn(); setNotice(ok); done(); load(); } catch (e) { setDlgError((e as Error).message); setError((e as Error).message); } finally { setBusy(false); }
  }
  return { me, org, ctx, error, notice, busy, dlgError, setDlgError, act };
}
const unitName = (c: LogCtx, id: string) => c.units.find((u) => u.id === id)?.name ?? '—';
const sizeCode = (c: LogCtx, id: string | null) => c.sizes.find((s) => s.id === id)?.size_code ?? 'Tyre';
const base = (role?: string) => (role === 'SUP' ? '/sup' : '/tic');

/* ------------------------------------------------------------------ Depot Indent (sender side) */
export function DepotIndentPage() {
  const { org, ctx, error, notice, busy, dlgError, setDlgError, act } = useLog();
  const [status, setStatus] = useState('');
  const [dlg, setDlg] = useState<{ k: 'new' } | { k: 'note'; i: Row; action: string; title: string } | null>(null);
  const [f, setF] = useState({ type: 'INTERNAL_TRANSFER', to: '', size: '', qty: '1', requiredFor: '', remarks: '' });
  const rows = (ctx?.indents ?? []).filter((i) => i.org_unit_id === org && (!status || i.status === status));
  const all = (ctx?.indents ?? []).filter((i) => i.org_unit_id === org);
  const targets = (ctx?.units ?? []).filter((u) => u.status === 'ACTIVE' && u.id !== org && (f.type === 'INDENT' ? u.unit_type === 'CENTRAL_STORE' : u.unit_type !== 'CENTRAL_STORE'));
  const close = () => setDlg(null);
  return (
    <div>
      <PageHeader title="Depot Indent" subtitle="Ask the Central Store for stock (Indent) or another depot, TRS or MIC for tyres (Internal Transfer)."
        action={<button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => { setDlgError(null); setDlg({ k: 'new' }); }}><Plus size={16} /> Create Indent</button>} />
      {error && !dlg && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Tile n={all.length} label="Total indents" /><Tile n={all.filter((i) => i.status === 'AWAITING_APPROVAL').length} label="Awaiting approval" />
        <Tile n={all.filter((i) => ['RECEIVED', 'IN_TRANSIT'].includes(i.status)).length} label="In transit / received" />
        <select className={`${inputCls} ml-auto w-52`} aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(IND_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[900px] text-sm"><Th cols={['S.No', 'Indent No', 'Indent Date', 'From → Request To', 'Indent Type', 'Qty', 'Status', 'Action']} />
          <tbody>
            {!ctx && <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {ctx && rows.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">No indents.</td></tr>}
            {rows.map((i, n) => (
              <tr key={i.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2">{n + 1}</td><td className="px-3 py-2 font-medium">{i.indent_no}</td><td className="px-3 py-2">{fmtDateTime(i.created_at)}</td>
                <td className="px-3 py-2">{unitName(ctx!, i.org_unit_id)} → {unitName(ctx!, i.request_to_id)}</td><td className="px-3 py-2">{i.indent_type === 'INDENT' ? 'Indent' : 'Internal Transfer'}</td>
                <td className="px-3 py-2">{i.qty} × {sizeCode(ctx!, i.size_id)}</td>
                <td className="px-3 py-2"><Pill s={i.status} label={IND_STATUS_LABEL[i.status]} />{i.status_note && <div className="mt-0.5 text-xs text-slate-500">{i.status === 'AWAITING_APPROVAL' ? '' : i.status_note}</div>}</td>
                <td className="px-3 py-2"><div className="flex flex-wrap gap-1">
                  {['DRAFT', 'REVERTED'].includes(i.status) && <button className={btnPlain} disabled={busy} onClick={() => void act(() => indentAct(i.id, 'SEND'), 'Sent for approval.', close)}>Send for Approval</button>}
                  {i.status === 'AWAITING_APPROVAL' && <button className={btnPlain} disabled={busy} onClick={() => void act(() => indentAct(i.id, 'WITHDRAW'), 'Withdrawn.', close)}>Withdraw</button>}
                  {['DRAFT', 'REVERTED', 'SENT'].includes(i.status) && <button className={btnPlain} onClick={() => { setDlgError(null); setDlg({ k: 'note', i, action: 'CANCEL', title: `Cancel ${i.indent_no}?` }); }}>Cancel</button>}
                  {i.status === 'IN_TRANSIT' && <Link className={btnPlain} to={`${base('TIC')}/grn`}>Receive in GRN →</Link>}
                </div></td>
              </tr>
            ))}
          </tbody></table>
      </div>
      {dlg?.k === 'new' && ctx && (
        <Modal title="Create Indent" onClose={close}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <div className="space-y-3">
            <Field label="Indent type"><select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, to: '' })}><option value="INTERNAL_TRANSFER">Internal Transfer (depot, TRS, MIC)</option><option value="INDENT">Indent (Central Store)</option></select></Field>
            <Field label="Request to *"><select className={inputCls} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })}><option value="">Select…</option>{targets.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tyre size"><select className={inputCls} value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })}><option value="">Any</option>{ctx.sizes.filter((s) => s.status === 'ACTIVE').map((s) => <option key={s.id} value={s.id}>{s.size_code}</option>)}</select></Field>
              <Field label="Quantity *"><input className={inputCls} type="number" min="1" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></Field>
            </div>
            <Field label="Required for"><input className={inputCls} value={f.requiredFor} onChange={(e) => setF({ ...f, requiredFor: e.target.value })} /></Field>
            <Field label="Remarks"><input className={inputCls} value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} /></Field>
          </div>
          <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={close} disabled={busy}>Cancel</button>
            <button className={btnPrimary} disabled={busy || !f.to || !(Number(f.qty) > 0)} onClick={() => void act(() => createIndent(f.type, f.to, f.size || null, Number(f.qty), f.requiredFor, f.remarks), 'Indent created (Draft).', close)}>Create (Draft)</button></div>
        </Modal>
      )}
      {dlg?.k === 'note' && <ReasonDialog title={dlg.title} confirmLabel="Cancel indent" danger required busy={busy} error={dlgError} onCancel={close} onConfirm={(t) => void act(() => indentAct(dlg.i.id, dlg.action, t), 'Cancelled.', close)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Internal Transfer Request (receiver side) */
export function TransferRequestPage() {
  const { org, ctx, error, notice, busy, dlgError, setDlgError, act } = useLog();
  const [status, setStatus] = useState('');
  const [dlg, setDlg] = useState<{ k: 'accept'; i: Row } | { k: 'reject'; i: Row } | null>(null);
  const [pick, setPick] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const close = () => setDlg(null);
  const mine = (ctx?.indents ?? []).filter((i) => i.request_to_id === org && !['DRAFT', 'AWAITING_APPROVAL', 'REVERTED'].includes(i.status));
  const rows = mine.filter((i) => !status || i.status === status);
  const gin = (i: Row) => ctx?.gins.find((g) => g.indent_id === i.id && g.status !== 'CANCELLED')?.gin_no;
  const live = () => (ctx?.tyres ?? []).filter((t) => t.owner_org_unit_id === org && t.stock_place === 'LIVE_STOCK' && !(ctx?.ginTyres ?? []).some((x) => x.tyre_id === t.id && ctx?.gins.some((g) => g.id === x.gin_id && ['DRAFT', 'AWAITING_APPROVAL', 'REVERTED', 'APPROVED', 'IN_TRANSIT'].includes(g.status))))
  return (
    <div>
      <PageHeader title="Internal Transfer Request" subtitle="Requests other depots and units sent to you. Accept to make a GIN from your live stock." />
      {error && !dlg && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Tile n={mine.length} label="Total requests" /><Tile n={mine.filter((i) => i.status === 'SENT').length} label="New" /><Tile n={mine.filter((i) => ['IN_TRANSIT', 'RECEIVED'].includes(i.status)).length} label="Issued / received" />
        <select className={`${inputCls} ml-auto w-52`} aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(IND_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{k === 'SENT' ? 'New' : v}</option>)}</select>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[820px] text-sm"><Th cols={['S.No', 'Request ID', 'Request Date', 'From Depot / Unit', 'Material', 'Total Qty', 'Status', 'Action']} />
          <tbody>
            {ctx && rows.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">No requests.</td></tr>}
            {rows.map((i, n) => (
              <tr key={i.id} className="border-t border-slate-100 align-top"><td className="px-3 py-2">{n + 1}</td><td className="px-3 py-2 font-medium">{i.indent_no}</td><td className="px-3 py-2">{fmtDateTime(i.created_at)}</td>
                <td className="px-3 py-2">{unitName(ctx!, i.org_unit_id)}</td><td className="px-3 py-2">Tyre {sizeCode(ctx!, i.size_id) !== 'Tyre' ? sizeCode(ctx!, i.size_id) : ''}</td><td className="px-3 py-2">{i.qty}</td>
                <td className="px-3 py-2"><Pill s={i.status} label={i.status === 'SENT' ? 'New' : IND_STATUS_LABEL[i.status]} />{(gin(i) || (i.status === 'REJECTED' && i.status_note)) && <div className="mt-0.5 text-xs text-slate-500">{gin(i) ?? i.status_note}</div>}</td>
                <td className="px-3 py-2">{i.status === 'SENT' && <div className="flex gap-1"><button className={btnPrimary} onClick={() => { setDlgError(null); setPick([]); setReason(''); setDlg({ k: 'accept', i }); }}>Accept &amp; Create GIN →</button>
                  <button className={btnPlain} onClick={() => { setDlgError(null); setDlg({ k: 'reject', i }); }}>Reject</button></div>}</td></tr>
            ))}
          </tbody></table>
      </div>
      {dlg?.k === 'accept' && ctx && (
        <Modal title={`Accept ${dlg.i.indent_no} and create the GIN`} onClose={close}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <p className="mb-2 text-sm text-slate-600">Requested: {dlg.i.qty} × {sizeCode(ctx, dlg.i.size_id)}. Pick the tyres from your live stock ({pick.length} chosen).</p>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {live().map((t) => <label key={t.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pick.includes(t.id)} onChange={() => setPick(pick.includes(t.id) ? pick.filter((x) => x !== t.id) : [...pick, t.id])} /> {t.mtc_no} · {t.stock_category === 'GOOD' ? 'Good' : 'Repair'} · {t.setting_status === 'SET' ? 'Set' : 'Unset'}</label>)}
            {live().length === 0 && <span className="text-sm text-slate-500">No live stock tyres available.</span>}
          </div>
          <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={close} disabled={busy}>Cancel</button>
            <button className={btnPrimary} disabled={busy || pick.length === 0} onClick={() => void act(() => createGin(dlg.i.org_unit_id, pick, `Request ${dlg.i.indent_no}`, dlg.i.id), 'GIN created (Draft). Send it for approval from the GIN screen.', close)}>Create GIN</button></div>
        </Modal>
      )}
      {dlg?.k === 'reject' && <ReasonDialog title={`Reject ${dlg.i.indent_no}?`} confirmLabel="Reject" danger required busy={busy} error={dlgError} onCancel={close} onConfirm={(t) => { setReason(t); void act(() => indentAct(dlg.i.id, 'DECLINE', t), 'Rejected.', close); }} />}
      <span className="hidden">{reason}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ GIN (Indent GIN, sender) */
export function GinPage() {
  const { org, ctx, error, notice, busy, dlgError, setDlgError, act } = useLog();
  const [status, setStatus] = useState('');
  const [dlg, setDlg] = useState<{ k: 'view' | 'gp' | 'cancel'; g: Row } | null>(null);
  const [gp, setGp] = useState({ kind: 'MTC Vehicle', vehicle: '', driver: '' });
  const close = () => setDlg(null);
  const mine = (ctx?.gins ?? []).filter((g) => g.org_unit_id === org);
  const rows = mine.filter((g) => !status || g.status === status);
  const items = (g: Row) => (ctx?.ginTyres ?? []).filter((x) => x.gin_id === g.id);
  const req = (g: Row) => ctx?.indents.find((i) => i.id === g.indent_id)?.indent_no ?? '—';
  return (
    <div>
      <PageHeader title="GIN" subtitle="Goods Issue Notes for tyres sent to another depot, TRS or MIC. A Supervisor approves before a gate pass is made." />
      {error && !dlg && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className="mb-3 flex items-center gap-3"><select className={`${inputCls} w-52`} aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(GIN_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><span className="text-sm text-slate-500">GIN Type: Internal Transfer</span></div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[960px] text-sm"><Th cols={['S.No', 'GIN No', 'GIN Date & Time', 'GIN Type', 'Request ID', 'From → To', 'Items', 'Status', 'Action']} />
          <tbody>
            {ctx && rows.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-500">No GINs. Accept an Internal Transfer Request to make one.</td></tr>}
            {rows.map((g, n) => (
              <tr key={g.id} className="border-t border-slate-100 align-top"><td className="px-3 py-2">{n + 1}</td>
                <td className="px-3 py-2 font-medium"><button className="text-blue-700 underline" onClick={() => setDlg({ k: 'view', g })}>{g.gin_no}</button></td><td className="px-3 py-2">{fmtDateTime(g.created_at)}</td><td className="px-3 py-2">Internal Transfer</td>
                <td className="px-3 py-2">{req(g)}</td><td className="px-3 py-2">{unitName(ctx!, g.org_unit_id)} → {unitName(ctx!, g.to_unit_id)}</td><td className="px-3 py-2">{items(g).length}</td>
                <td className="px-3 py-2"><Pill s={g.status} label={GIN_STATUS_LABEL[g.status]} />{(g.status_note || g.gp_no) && <div className="mt-0.5 text-xs text-slate-500">{g.status === 'IN_TRANSIT' ? g.gp_no : g.status_note}</div>}</td>
                <td className="px-3 py-2"><div className="flex flex-wrap gap-1">
                  {['DRAFT', 'REVERTED'].includes(g.status) && <button className={btnPlain} disabled={busy} onClick={() => void act(() => ginAct(g.id, 'SEND'), 'Sent for approval.', close)}>Send for Approval</button>}
                  {g.status === 'AWAITING_APPROVAL' && <button className={btnPlain} disabled={busy} onClick={() => void act(() => ginAct(g.id, 'WITHDRAW'), 'Withdrawn.', close)}>Withdraw</button>}
                  {g.status === 'APPROVED' && <button className={btnPrimary} onClick={() => { setDlgError(null); setGp({ kind: 'MTC Vehicle', vehicle: '', driver: '' }); setDlg({ k: 'gp', g }); }}>Create Gate Pass →</button>}
                  {['DRAFT', 'REVERTED', 'APPROVED'].includes(g.status) && <button className={btnPlain} onClick={() => { setDlgError(null); setDlg({ k: 'cancel', g }); }}>Cancel</button>}
                </div></td></tr>
            ))}
          </tbody></table>
      </div>
      {dlg?.k === 'view' && ctx && (
        <Modal title={`Goods Issue Note — ${dlg.g.gin_no}`} onClose={close}>
          <dl className="grid grid-cols-2 gap-2 text-sm"><dt className="text-slate-500">To</dt><dd>{unitName(ctx, dlg.g.to_unit_id)}</dd><dt className="text-slate-500">Status</dt><dd>{GIN_STATUS_LABEL[dlg.g.status]}</dd>
            <dt className="text-slate-500">Total tyres</dt><dd>{items(dlg.g).length}</dd><dt className="text-slate-500">Reason</dt><dd>{dlg.g.reason ?? '—'}</dd><dt className="text-slate-500">Gate pass</dt><dd>{dlg.g.gp_no ?? '—'}</dd></dl>
          <table className="mt-3 w-full text-sm"><Th cols={['S.No', 'Tyre No', 'Result']} /><tbody>{items(dlg.g).map((x, n) => <tr key={x.tyre_id} className="border-t border-slate-100"><td className="px-3 py-1.5">{n + 1}</td><td className="px-3 py-1.5">{ctx.tyres.find((t) => t.id === x.tyre_id)?.mtc_no ?? '—'}</td><td className="px-3 py-1.5">{x.result ? `${x.result === 'ACCEPTED' ? 'Accepted' : 'Rejected'}${x.reason ? ` — ${x.reason}` : ''}` : '—'}</td></tr>)}</tbody></table>
          <div className="mt-3 flex justify-end"><button className={btnPlain} onClick={close}>Close</button></div>
        </Modal>
      )}
      {dlg?.k === 'gp' && (
        <Modal title={`Create Gate Pass · ${dlg.g.gin_no}`} onClose={close}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <div className="space-y-3">
            <Field label="Vehicle"><select className={inputCls} value={gp.kind} onChange={(e) => setGp({ ...gp, kind: e.target.value })}><option>MTC Vehicle</option><option>Contract Vehicle</option></select></Field>
            <Field label="Vehicle number *"><input className={inputCls} value={gp.vehicle} onChange={(e) => setGp({ ...gp, vehicle: e.target.value })} /></Field>
            <Field label="Driver *"><input className={inputCls} value={gp.driver} onChange={(e) => setGp({ ...gp, driver: e.target.value })} /></Field>
          </div>
          <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={close} disabled={busy}>Cancel</button>
            <button className={btnPrimary} disabled={busy || !gp.vehicle.trim() || !gp.driver.trim()} onClick={() => void act(() => createGatePass(dlg.g.id, gp.kind, gp.vehicle, gp.driver), 'Gate pass made. The GIN is In transit and the stock is reduced.', close)}>Create Gate Pass</button></div>
        </Modal>
      )}
      {dlg?.k === 'cancel' && <ReasonDialog title={`Cancel ${dlg.g.gin_no}?`} confirmLabel="Cancel GIN" danger required busy={busy} error={dlgError} onCancel={close} onConfirm={(t) => void act(() => ginAct(dlg.g.id, 'CANCEL', t), 'GIN cancelled.', close)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Gate Pass */
export function GatePassPage() {
  const { org, ctx, error, notice, busy, dlgError, setDlgError, act } = useLog();
  const [dir, setDir] = useState('');
  const [cancel, setCancel] = useState<Row | null>(null);
  const gin = (p: Row) => ctx?.gins.find((g) => g.id === p.gin_id);
  const type = (p: Row) => (p.org_unit_id === org ? 'Outward' : 'Inward');
  const all = ctx?.gatePasses ?? [];
  const rows = all.filter((p) => !dir || type(p) === dir);
  const qty = (p: Row) => (ctx?.ginTyres ?? []).filter((x) => x.gin_id === p.gin_id).length;
  return (
    <div>
      <PageHeader title="Gate Pass" subtitle="Vehicles carrying tyres out of, or into, the depot." />
      {error && !cancel && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className="mb-3 flex gap-2">{[['', `All ${all.length}`], ['Inward', `Inward ${all.filter((p) => type(p) === 'Inward').length}`], ['Outward', `Outward ${all.filter((p) => type(p) === 'Outward').length}`]].map(([k, l]) => (
        <button key={k} onClick={() => setDir(k)} className={`rounded-full border px-4 py-1.5 text-sm ${dir === k ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`}>{l}</button>))}</div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[980px] text-sm"><Th cols={['S.No', 'Gate Pass No', 'Date & Time', 'Type', 'Source Reference', 'From → To', 'Qty', 'Vehicle / Driver', 'Status', 'Action']} />
          <tbody>
            {ctx && rows.length === 0 && <tr><td colSpan={10} className="px-4 py-6 text-center text-slate-500">No gate passes.</td></tr>}
            {rows.map((p, n) => {
              const g = gin(p); const toDepot = ctx!.units.find((u) => u.id === g?.to_unit_id)?.unit_type === 'DEPOT';
              return (
                <tr key={p.id} className="border-t border-slate-100 align-top"><td className="px-3 py-2">{n + 1}</td><td className="px-3 py-2 font-medium">{p.gp_no}</td><td className="px-3 py-2">{fmtDateTime(p.created_at)}</td><td className="px-3 py-2">{type(p)}</td>
                  <td className="px-3 py-2">{g?.gin_no}<div className="text-xs text-slate-500">{ctx!.indents.find((i) => i.id === g?.indent_id)?.indent_no}</div></td>
                  <td className="px-3 py-2">{g ? `${unitName(ctx!, g.org_unit_id)} → ${unitName(ctx!, g.to_unit_id)}` : '—'}</td><td className="px-3 py-2">{qty(p)}</td>
                  <td className="px-3 py-2">{p.vehicle_kind}<div className="text-xs text-slate-500">{p.vehicle_no} · {p.driver}</div></td>
                  <td className="px-3 py-2"><Pill s={p.status} label={GP_STATUS_LABEL[p.status]} />{p.status_note && <div className="mt-0.5 text-xs text-slate-500">{p.status_note}</div>}{p.exit_at && p.status === 'EXITED' && <div className="mt-0.5 text-xs text-slate-500">Out {fmtDateTime(p.exit_at)}</div>}</td>
                  <td className="px-3 py-2">{type(p) === 'Outward' && <div className="flex flex-wrap gap-1">
                    {p.status === 'ISSUED' && <button className={btnPlain} disabled={busy} onClick={() => void act(() => gatePassAct(p.id, 'EXIT'), 'Vehicle marked as exited.', () => undefined)}>Mark Exit</button>}
                    {p.status === 'ISSUED' && <button className={btnPlain} onClick={() => { setDlgError(null); setCancel(p); }}>Cancel</button>}
                    {['ISSUED', 'EXITED'].includes(p.status) && !toDepot && <button className={btnPlain} disabled={busy} onClick={() => void act(() => gatePassAct(p.id, 'RECEIVED'), 'Marked received.', () => undefined)}>Mark Received</button>}
                  </div>}</td></tr>
              );
            })}
          </tbody></table>
      </div>
      {cancel && <ReasonDialog title={`Cancel ${cancel.gp_no}?`} confirmLabel="Cancel gate pass" danger required busy={busy} error={dlgError} onCancel={() => setCancel(null)} onConfirm={(t) => void act(() => gatePassAct(cancel.id, 'CANCEL', t), 'Gate pass cancelled; the tyres are back in live stock.', () => setCancel(null))} />}
    </div>
  );
}

/* ------------------------------------------------------------------ GRN (inward from another depot) */
export function GrnInPage() {
  const { org, ctx, error, notice, busy, dlgError, setDlgError, act } = useLog();
  const [tab, setTab] = useState('');
  const [rcv, setRcv] = useState<Row | null>(null);
  const [res, setRes] = useState<Record<string, { accept: boolean; reason: string }>>({});
  const inbound = (ctx?.gins ?? []).filter((g) => g.to_unit_id === org && ['IN_TRANSIT', 'RECEIVED'].includes(g.status));
  const rows = inbound.filter((g) => !tab || (tab === 'ready' ? g.status === 'IN_TRANSIT' : g.status === 'RECEIVED'));
  const tyres = (g: Row) => (ctx?.ginTyres ?? []).filter((x) => x.gin_id === g.id);
  const grn = (g: Row) => ctx?.grns.find((x) => x.indent_gin_id === g.id);
  return (
    <div>
      <PageHeader title="GRN" subtitle="Tyres arriving from other depots, TRS or MIC. Receive them to add the accepted ones to your live stock." />
      {error && !rcv && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className="mb-3 flex gap-2">{[['', `All ${inbound.length}`], ['ready', `Ready to receive ${inbound.filter((g) => g.status === 'IN_TRANSIT').length}`], ['done', `Received ${inbound.filter((g) => g.status === 'RECEIVED').length}`]].map(([k, l]) => (
        <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-1.5 text-sm ${tab === k ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`}>{l}</button>))}</div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[920px] text-sm"><Th cols={['S.No', 'From Depot / Unit', 'GRN No', 'GRN Date & Time', 'Source', 'Received Qty', 'Accepted Qty', 'Rejected Qty', 'Value', 'Status', 'Action']} />
          <tbody>
            {ctx && rows.length === 0 && <tr><td colSpan={11} className="px-4 py-6 text-center text-slate-500">Nothing to receive.</td></tr>}
            {rows.map((g, n) => { const r = grn(g); return (
              <tr key={g.id} className="border-t border-slate-100 align-top"><td className="px-3 py-2">{n + 1}</td><td className="px-3 py-2">{unitName(ctx!, g.org_unit_id)}</td><td className="px-3 py-2">{r?.grn_no ?? '—'}</td>
                <td className="px-3 py-2">{fmtDateTime(r?.received_at ?? g.in_transit_at)}</td><td className="px-3 py-2">{g.gin_no}<div className="text-xs text-slate-500">{ctx!.indents.find((i) => i.id === g.indent_id)?.indent_no}</div></td>
                <td className="px-3 py-2">{tyres(g).length}</td><td className="px-3 py-2">{r ? r.accepted_qty : '—'}</td><td className="px-3 py-2">{r ? r.rejected_qty : '—'}</td><td className="px-3 py-2 text-slate-400" title="No price master yet">—</td>
                <td className="px-3 py-2"><Pill s={g.status} label={g.status === 'IN_TRANSIT' ? 'Ready to receive' : 'Received'} /></td>
                <td className="px-3 py-2">{g.status === 'IN_TRANSIT' && <button className={btnPrimary} onClick={() => { setDlgError(null); setRes(Object.fromEntries(tyres(g).map((x) => [x.tyre_id, { accept: true, reason: '' }]))); setRcv(g); }}>Receive</button>}</td></tr>); })}
          </tbody></table>
      </div>
      {rcv && ctx && (
        <Modal title={`Receive ${rcv.gin_no}`} onClose={() => setRcv(null)}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <p className="mb-2 text-sm text-slate-600">From {unitName(ctx, rcv.org_unit_id)}. Accept or reject each tyre; a rejected tyre goes back to the sender.</p>
          <div className="space-y-2">{tyres(rcv).map((x) => (
            <div key={x.tyre_id} className="rounded-lg border border-slate-200 p-2 text-sm"><div className="flex items-center justify-between"><span className="font-medium">{ctx.tyres.find((t) => t.id === x.tyre_id)?.mtc_no ?? 'Tyre'}</span>
              <span className="flex gap-3"><label className="flex items-center gap-1"><input type="radio" name={x.tyre_id} checked={res[x.tyre_id]?.accept} onChange={() => setRes({ ...res, [x.tyre_id]: { ...res[x.tyre_id], accept: true } })} /> Accept</label>
                <label className="flex items-center gap-1"><input type="radio" name={x.tyre_id} checked={!res[x.tyre_id]?.accept} onChange={() => setRes({ ...res, [x.tyre_id]: { ...res[x.tyre_id], accept: false } })} /> Reject</label></span></div>
              {!res[x.tyre_id]?.accept && <input className={`${inputCls} mt-2`} placeholder="Reject reason (required)" value={res[x.tyre_id]?.reason ?? ''} onChange={(e) => setRes({ ...res, [x.tyre_id]: { ...res[x.tyre_id], reason: e.target.value } })} />}</div>))}</div>
          <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={() => setRcv(null)} disabled={busy}>Cancel</button>
            <button className={btnPrimary} disabled={busy} onClick={() => void act(() => receiveIndentGin(rcv.id, tyres(rcv).map((x) => ({ tyre_id: x.tyre_id, accept: res[x.tyre_id].accept, reason: res[x.tyre_id].reason }))), 'GRN created. Accepted tyres are in your live stock.', () => setRcv(null))}>Create GRN</button></div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Supervisor: stock approvals */
export function StockApprovalsPage() {
  const { org, ctx, error, notice, busy, dlgError, setDlgError, act } = useLog();
  const [dlg, setDlg] = useState<{ kind: 'I' | 'G'; row: Row; action: 'REVERT' | 'REJECT' } | null>(null);
  const inds = (ctx?.indents ?? []).filter((i) => i.org_unit_id === org && i.status === 'AWAITING_APPROVAL');
  const gins = (ctx?.gins ?? []).filter((g) => g.org_unit_id === org && g.status === 'AWAITING_APPROVAL');
  const done = () => setDlg(null);
  const decide = (kind: 'I' | 'G', row: Row, action: string, note?: string) => act(() => (kind === 'I' ? indentAct(row.id, action, note) : ginAct(row.id, action, note)), action === 'APPROVE' ? 'Approved.' : action === 'REVERT' ? 'Reverted.' : 'Rejected.', done);
  const Buttons = ({ kind, row }: { kind: 'I' | 'G'; row: Row }) => (
    <div className="flex gap-1"><button className={btnPrimary} disabled={busy} onClick={() => void decide(kind, row, 'APPROVE')}>Approve</button>
      <button className={btnPlain} onClick={() => { setDlgError(null); setDlg({ kind, row, action: 'REVERT' }); }}>Revert</button>
      <button className={btnPlain} onClick={() => { setDlgError(null); setDlg({ kind, row, action: 'REJECT' }); }}>Reject</button></div>
  );
  return (
    <div>
      <PageHeader title="Indent and GIN approvals" subtitle="Indents and GINs your Tyre IC sent for approval." />
      {error && !dlg && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className={`${cardCls} mb-4 overflow-x-auto`}><h2 className="px-4 pt-3 font-semibold">Indents ({inds.length})</h2>
        <table className="w-full min-w-[700px] text-sm"><Th cols={['Indent No', 'Date', 'From → To', 'Type', 'Qty', 'Action']} /><tbody>
          {ctx && inds.length === 0 && <tr><td colSpan={6} className="px-4 py-4 text-slate-500">Nothing waiting.</td></tr>}
          {inds.map((i) => <tr key={i.id} className="border-t border-slate-100"><td className="px-3 py-2 font-medium">{i.indent_no}</td><td className="px-3 py-2">{fmtDateTime(i.created_at)}</td><td className="px-3 py-2">{unitName(ctx!, i.org_unit_id)} → {unitName(ctx!, i.request_to_id)}</td>
            <td className="px-3 py-2">{i.indent_type === 'INDENT' ? 'Indent' : 'Internal Transfer'}</td><td className="px-3 py-2">{i.qty} × {sizeCode(ctx!, i.size_id)}</td><td className="px-3 py-2"><Buttons kind="I" row={i} /></td></tr>)}</tbody></table></div>
      <div className={`${cardCls} overflow-x-auto`}><h2 className="px-4 pt-3 font-semibold">GINs ({gins.length})</h2>
        <table className="w-full min-w-[700px] text-sm"><Th cols={['GIN No', 'Date', 'From → To', 'Items', 'Reason', 'Action']} /><tbody>
          {ctx && gins.length === 0 && <tr><td colSpan={6} className="px-4 py-4 text-slate-500">Nothing waiting.</td></tr>}
          {gins.map((g) => <tr key={g.id} className="border-t border-slate-100"><td className="px-3 py-2 font-medium">{g.gin_no}</td><td className="px-3 py-2">{fmtDateTime(g.created_at)}</td><td className="px-3 py-2">{unitName(ctx!, g.org_unit_id)} → {unitName(ctx!, g.to_unit_id)}</td>
            <td className="px-3 py-2">{(ctx!.ginTyres).filter((x) => x.gin_id === g.id).length}</td><td className="px-3 py-2">{g.reason ?? '—'}</td><td className="px-3 py-2"><Buttons kind="G" row={g} /></td></tr>)}</tbody></table></div>
      {dlg && <ReasonDialog title={`${dlg.action === 'REVERT' ? 'Revert' : 'Reject'} ${dlg.row.indent_no ?? dlg.row.gin_no}?`} confirmLabel={dlg.action === 'REVERT' ? 'Revert' : 'Reject'} danger required busy={busy} error={dlgError} onCancel={done} onConfirm={(t) => void decide(dlg.kind, dlg.row, dlg.action, t)} />}
    </div>
  );
}
