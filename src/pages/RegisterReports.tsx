import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { all } from '../lib/ops';
import {
  actAirTypeRequest, actDrn, CORRECTABLE, createAirTypeRequest, createCorrection, createDrn, createPfr, decideCorrection, decideDamage, fmtDate, fmtDT, submitDamage, type Row,
} from '../lib/reg';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader, ReasonDialog } from '../components/ui';
import { Modal } from '../components/OpsBits';

function useRows(tables: [string, string, boolean?][]) {
  const [d, setD] = useState<Row[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dlgError, setDlgError] = useState<string | null>(null);
  const load = useCallback(() => { Promise.all(tables.map(([t, o, asc]) => all(t, o, asc ?? true))).then(setD).catch((e: Error) => setError(e.message)); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(load, [load]);
  async function act(fn: () => Promise<unknown>, ok: string, done: () => void) {
    setBusy(true); setDlgError(null); setError(null);
    try { await fn(); setNotice(ok); done(); load(); } catch (e) { setDlgError((e as Error).message); } finally { setBusy(false); }
  }
  return { d, error, notice, busy, dlgError, setDlgError, act };
}
const Pill = ({ tone, children }: { tone: 'green' | 'amber' | 'blue' | 'red' | 'slate'; children: React.ReactNode }) =>
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${{ green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800', blue: 'bg-blue-100 text-blue-800', red: 'bg-red-100 text-red-800', slate: 'bg-slate-100 text-slate-700' }[tone]}`}>{children}</span>;
const Th = ({ cols }: { cols: string[] }) => <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{cols.map((c) => <th key={c} className="px-3 py-2">{c}</th>)}</tr></thead>;
const Empty = ({ n, msg }: { n: number; msg: string }) => <tr><td colSpan={n} className="px-4 py-6 text-center text-slate-500">{msg}</td></tr>;
const Tile = ({ n, l }: { n: number; l: string }) => <div className="rounded-xl border border-slate-200 bg-white px-4 py-2"><div className="text-xl font-bold text-slate-900">{n}</div><div className="text-xs uppercase tracking-wide text-slate-500">{l}</div></div>;
const Foot = ({ busy, onCancel, label, disabled }: { busy: boolean; onCancel: () => void; label: string; disabled?: boolean }) =>
  <div className="mt-3 flex justify-end gap-2"><button type="button" className={btnPlain} onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy || disabled}>{busy ? 'Working…' : label}</button></div>;

/* ------------------------------------------------------------------ Premature Failure Reports */
const FAULT: Record<string, string> = { DRIVER: 'Driver', TYRE_MAN: 'Tyre Man', MANUFACTURER: 'Manufacturer', NO_FAULT: 'No fault' };
export function PfrPage() {
  const { d, error, notice, busy, dlgError, setDlgError, act } = useRows([['pfr_reports', 'created_at', false], ['tyres', 'mtc_no'], ['fleets', 'fleet_no']]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ tyre: '', fault: 'MANUFACTURER', empCode: '', empName: '', position: '', skid: '', kmRun: '', normKm: '', price: '', removal: '', damage: '' });
  const [reports, tyres, fleets] = d ?? [[], [], []];
  const fno = (id: string) => fleets.find((x) => x.id === id)?.fleet_no ?? '—';
  const pick = (id: string) => { const t = tyres.find((x) => x.id === id); setF({ ...f, tyre: id, position: t?.fitted_position ?? '', kmRun: t?.total_km ?? '', normKm: t?.expected_life_km ?? f.normKm }); };
  const loss = Number(f.price) > 0 && Number(f.normKm) > 0 ? Math.round((Number(f.price) * Math.max(Number(f.normKm) - Number(f.kmRun || 0), 0)) / Number(f.normKm) * 100) / 100 : null;
  return (
    <div>
      <PageHeader title="Premature Failure Reports" subtitle="A tyre that failed below its norm km. The loss is the price share of the km still remaining."
        action={<button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => { setDlgError(null); setOpen(true); }}><Plus size={16} /> New Report</button>} />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className={`${cardCls} overflow-x-auto`}><table className="w-full min-w-[900px] text-sm"><Th cols={['S.No', 'Report No', 'Date', 'MTC No', 'Fleet', 'Position', 'Fault on', 'Km Run', 'Norm Km', 'Remaining Km', 'Loss ₹', 'Status']} />
        <tbody>{d && reports.length === 0 && <Empty n={12} msg="No report yet." />}
          {reports.map((r, i) => <tr key={r.id} className="border-t border-slate-100"><td className="px-3 py-2">{i + 1}</td><td className="px-3 py-2 font-medium">{r.report_no}</td><td className="px-3 py-2">{fmtDate(r.created_at)}</td><td className="px-3 py-2">{tyres.find((t) => t.id === r.tyre_id)?.mtc_no}</td>
            <td className="px-3 py-2">{fno(r.fleet_id)}</td><td className="px-3 py-2">{r.position ?? '—'}</td><td className="px-3 py-2">{FAULT[r.fault_on]}{r.employee_code && ` · ${r.employee_code}`}</td>
            <td className="px-3 py-2">{Number(r.km_run).toLocaleString('en-IN')}</td><td className="px-3 py-2">{Number(r.norm_km).toLocaleString('en-IN')}</td><td className="px-3 py-2">{Number(r.remaining_km).toLocaleString('en-IN')}</td>
            <td className="px-3 py-2 font-semibold">{Number(r.loss_amount).toLocaleString('en-IN')}</td><td className="px-3 py-2"><Pill tone="blue">{r.status === 'SENT_TO_TRS' ? 'Sent to TRS' : r.status === 'SENT_TO_DEPOT' ? 'Sent to Depot' : 'Returned'}</Pill></td></tr>)}</tbody></table></div>
      <p className="mt-2 text-xs text-slate-500">The TRS steps after Send to TRS (Supervisor opinion, TRS Incharge, return to the depot) are not part of this build.</p>
      {open && d && (
        <Modal title="New Premature Failure Report" onClose={() => setOpen(false)}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void act(() => createPfr(f), 'Report sent to TRS.', () => setOpen(false)); }}>
            <Field label="MTC Tyre No *"><select className={inputCls} value={f.tyre} onChange={(e) => pick(e.target.value)} required><option value="">Select…</option>{tyres.filter((t) => t.status === 'ACTIVE').map((t) => <option key={t.id} value={t.id}>{t.mtc_no}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fault on *"><select className={inputCls} value={f.fault} onChange={(e) => setF({ ...f, fault: e.target.value })}>{Object.entries(FAULT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="Skid depth (mm)"><input className={inputCls} type="number" step="0.1" value={f.skid} onChange={(e) => setF({ ...f, skid: e.target.value })} /></Field>
              {['DRIVER', 'TYRE_MAN'].includes(f.fault) && <><Field label="Employee ID *"><input className={inputCls} value={f.empCode} onChange={(e) => setF({ ...f, empCode: e.target.value })} /></Field><Field label="Name · Designation"><input className={inputCls} value={f.empName} onChange={(e) => setF({ ...f, empName: e.target.value })} /></Field></>}
              <Field label="Km run *"><input className={inputCls} type="number" min="0" value={f.kmRun} onChange={(e) => setF({ ...f, kmRun: e.target.value })} required /></Field>
              <Field label="Norm km *"><input className={inputCls} type="number" min="1" value={f.normKm} onChange={(e) => setF({ ...f, normKm: e.target.value })} required /></Field>
              <Field label="Tyre price ₹ *"><input className={inputCls} type="number" min="0" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} required /></Field>
              <Field label="Loss ₹ (calculated)"><input className={inputCls} value={loss === null ? '' : loss.toLocaleString('en-IN')} readOnly /></Field>
            </div>
            <Field label="Reason for removal"><input className={inputCls} value={f.removal} onChange={(e) => setF({ ...f, removal: e.target.value })} /></Field>
            <Field label="Reason for tyre damage"><input className={inputCls} value={f.damage} onChange={(e) => setF({ ...f, damage: e.target.value })} /></Field>
            <Foot busy={busy} onCancel={() => setOpen(false)} label="Send to TRS" />
          </form>
        </Modal>)}
    </div>
  );
}

/* ------------------------------------------------------------------ Tyre Damage Reports (TIC fills; HO / AM stand in for the TRS Incharge) */
const DMG_LABEL: Record<string, string> = { PENDING_APPROVAL: 'Pending approval', APPROVED: 'Approved', RETURNED: 'Returned', REPORT_RECEIVED: 'Report Received' };
export function DamagePage() {
  const { me } = useAuth();
  const { d, error, notice, busy, dlgError, setDlgError, act } = useRows([['damage_requests', 'requested_at', false], ['tyres', 'mtc_no'], ['fleets', 'fleet_no']]);
  const [fill, setFill] = useState<Row | null>(null);
  const [view, setView] = useState<Row | null>(null);
  const [ret, setRet] = useState<Row | null>(null);
  const [rep, setRep] = useState({ puncture_at: '', route: '', place: '', cause: '', remarks: '' });
  const [reqs, tyres, fleets] = d ?? [[], [], []];
  const office = me?.role_code === 'HO' || me?.role_code === 'AM';
  return (
    <div>
      <PageHeader title="Tyre Damage Reports" subtitle="Report requests from TRS. When a request is Approved, fill the report." />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className="mb-3 flex flex-wrap gap-3">{Object.entries(DMG_LABEL).map(([k, l]) => <Tile key={k} n={reqs.filter((r) => r.status === k).length} l={l} />)}</div>
      <div className={`${cardCls} overflow-x-auto`}><table className="w-full min-w-[820px] text-sm"><Th cols={['Request No', 'Date & Time', 'Tyre', 'Fleet', 'Injury', 'Request reason', 'Status', 'Action']} />
        <tbody>{d && reqs.length === 0 && <Empty n={8} msg="No request yet." />}
          {reqs.map((r) => <tr key={r.id} className="border-t border-slate-100 align-top"><td className="px-3 py-2 font-medium"><button className="text-blue-700 underline" onClick={() => setView(r)}>{r.req_no}</button></td><td className="px-3 py-2">{fmtDT(r.requested_at)}</td>
            <td className="px-3 py-2">{tyres.find((t) => t.id === r.tyre_id)?.mtc_no}</td><td className="px-3 py-2">{fleets.find((x) => x.id === r.fleet_id)?.fleet_no ?? '—'}</td><td className="px-3 py-2">{r.injury ?? '—'}</td><td className="px-3 py-2">{r.reason}</td>
            <td className="px-3 py-2"><Pill tone={r.status === 'REPORT_RECEIVED' ? 'green' : r.status === 'APPROVED' ? 'blue' : r.status === 'RETURNED' ? 'red' : 'amber'}>{DMG_LABEL[r.status]}</Pill>{r.returned_reason && <div className="text-xs text-slate-500">{r.returned_reason}</div>}</td>
            <td className="px-3 py-2"><div className="flex gap-2">
              {me?.role_code === 'TIC' && r.status === 'APPROVED' && <button className={btnPrimary} onClick={() => { setDlgError(null); setRep({ puncture_at: '', route: '', place: '', cause: '', remarks: '' }); setFill(r); }}>Fill Report</button>}
              {office && r.status === 'PENDING_APPROVAL' && <><button className={btnPrimary} disabled={busy} onClick={() => void act(() => decideDamage(r.id, true, ''), 'Request approved.', () => undefined)}>Approve</button><button className={btnPlain} onClick={() => { setDlgError(null); setRet(r); }}>Return</button></>}</div></td></tr>)}</tbody></table></div>
      {office && <p className="mt-2 text-xs text-slate-500">The TRS Incharge is not a user of this build, so HO and AM approve or return the requests in his place.</p>}
      {fill && (
        <Modal title={`Fill report · ${fill.req_no}`} onClose={() => setFill(null)}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void act(() => submitDamage(fill.id, rep), 'Report submitted.', () => setFill(null)); }}>
            <p className="text-sm text-slate-600">Tyre {tyres.find((t) => t.id === fill.tyre_id)?.mtc_no} · Fleet {fleets.find((x) => x.id === fill.fleet_id)?.fleet_no ?? '—'}</p>
            <Field label="Puncture date & time *"><input className={inputCls} type="datetime-local" value={rep.puncture_at} onChange={(e) => setRep({ ...rep, puncture_at: e.target.value })} required /></Field>
            <Field label="Route / service *"><input className={inputCls} value={rep.route} onChange={(e) => setRep({ ...rep, route: e.target.value })} required /></Field>
            <Field label="Place *"><input className={inputCls} value={rep.place} onChange={(e) => setRep({ ...rep, place: e.target.value })} required /></Field>
            <Field label="Cause *"><input className={inputCls} value={rep.cause} onChange={(e) => setRep({ ...rep, cause: e.target.value })} required /></Field>
            <Field label="Remarks"><input className={inputCls} value={rep.remarks} onChange={(e) => setRep({ ...rep, remarks: e.target.value })} /></Field>
            <Foot busy={busy} onCancel={() => setFill(null)} label="Submit Report" />
          </form>
        </Modal>)}
      {view && <Modal title={view.req_no} onClose={() => setView(null)}><dl className="space-y-1 text-sm">{[['Status', DMG_LABEL[view.status]], ['Request reason', view.reason], ['Injury', view.injury], ['Returned reason', view.returned_reason], ...Object.entries(view.report ?? {})].map(([k, v]) => v ? <div key={String(k)} className="flex gap-2"><dt className="w-36 text-slate-500">{String(k).replace(/_/g, ' ')}</dt><dd>{String(v)}</dd></div> : null)}</dl><div className="mt-3 flex justify-end"><button className={btnPlain} onClick={() => setView(null)}>Close</button></div></Modal>}
      {ret && <ReasonDialog title={`Return ${ret.req_no}?`} label="Reason (required)" confirmLabel="Return" danger required busy={busy} error={dlgError} onConfirm={(t) => void act(() => decideDamage(ret.id, false, t), 'Request returned.', () => setRet(null))} onCancel={() => setRet(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ DRN (warranty return) */
const DRN_LABEL: Record<string, string> = { AWAITING_APPROVAL: 'Pending', APPROVED: 'Approved', REVERTED: 'Reverted', REJECTED: 'Rejected' };
export function DrnPage() {
  const { me } = useAuth();
  const { d, error, notice, busy, dlgError, setDlgError, act } = useRows([['drns', 'created_at', false], ['drn_tyres', 'tyre_id'], ['tyres', 'mtc_no'], ['org_units', 'sort_order']]);
  const [creating, setCreating] = useState(false);
  const [to, setTo] = useState('TRS Chrompet');
  const [remarks, setRemarks] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [decide, setDecide] = useState<{ drn: Row; action: 'REVERT' | 'REJECT' } | null>(null);
  const [drns, dt, tyres] = d ?? [[], [], []];
  const sup = me?.role_code === 'SUP';
  const eligible = tyres.filter((t) => t.stock_place === 'LIVE_STOCK' && t.warranty_upto && !dt.some((x) => x.tyre_id === t.id && drns.some((n) => n.id === x.drn_id && ['AWAITING_APPROVAL', 'APPROVED'].includes(n.status))));
  return (
    <div>
      <PageHeader title={sup ? 'DRN Approvals' : 'DRN'} subtitle="Warranty return: tyres whose warranty is not over, sent to the TRS unit. The Supervisor approves, reverts or rejects."
        action={!sup && <button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => { setDlgError(null); setSel([]); setCreating(true); }}><Plus size={16} /> Create DRN</button>} />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className="mb-3 flex flex-wrap gap-3"><Tile n={drns.length} l="Total DRN" /><Tile n={drns.filter((n) => n.status === 'AWAITING_APPROVAL').length} l="Pending" /><Tile n={drns.filter((n) => n.status === 'REJECTED').length} l="Rejected" /><Tile n={drns.filter((n) => n.status === 'APPROVED').length} l="Approved" /></div>
      <div className={`${cardCls} overflow-x-auto`}><table className="w-full min-w-[760px] text-sm"><Th cols={['DRN No', 'Date', 'To', 'Tyres', 'Remarks', 'Status', 'Action']} />
        <tbody>{d && drns.length === 0 && <Empty n={7} msg="No DRN yet." />}
          {drns.map((n) => <tr key={n.id} className="border-t border-slate-100 align-top"><td className="px-3 py-2 font-medium">{n.drn_no}</td><td className="px-3 py-2">{fmtDate(n.created_at)}</td><td className="px-3 py-2">{n.to_unit}</td>
            <td className="px-3 py-2">{dt.filter((x) => x.drn_id === n.id).map((x) => tyres.find((t) => t.id === x.tyre_id)?.mtc_no ?? 'Tyre').join(', ')}</td><td className="px-3 py-2">{n.remarks ?? '—'}</td>
            <td className="px-3 py-2"><Pill tone={n.status === 'APPROVED' ? 'green' : n.status === 'AWAITING_APPROVAL' ? 'amber' : 'red'}>{DRN_LABEL[n.status]}</Pill>{n.status_note && <div className="text-xs text-slate-500">{n.status_note}</div>}</td>
            <td className="px-3 py-2">{sup && n.status === 'AWAITING_APPROVAL' && <div className="flex gap-2"><button className={btnPrimary} disabled={busy} onClick={() => void act(() => actDrn(n.id, 'APPROVE', ''), 'DRN approved. The tyres are at TRS.', () => undefined)}>Approve</button>
              <button className={btnPlain} onClick={() => { setDlgError(null); setDecide({ drn: n, action: 'REVERT' }); }}>Revert</button><button className={btnPlain} onClick={() => { setDlgError(null); setDecide({ drn: n, action: 'REJECT' }); }}>Reject</button></div>}</td></tr>)}</tbody></table></div>
      {creating && (
        <Modal title="Create DRN" onClose={() => setCreating(false)}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <Field label="To Depot / Unit"><select className={inputCls} value={to} onChange={(e) => setTo(e.target.value)}><option>TRS Chrompet</option><option>TRS Tondiarpet</option></select></Field>
          <fieldset className="my-2"><legend className="mb-1 text-sm font-medium text-slate-700">Tyres in warranty ({sel.length} chosen)</legend>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">{eligible.length === 0 && <span className="text-xs text-slate-500">No live-stock tyre has a warranty date.</span>}
              {eligible.map((t) => <label key={t.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sel.includes(t.id)} onChange={() => setSel(sel.includes(t.id) ? sel.filter((x) => x !== t.id) : [...sel, t.id])} />{t.mtc_no}<span className="ml-auto text-xs text-slate-500">warranty upto {fmtDate(t.warranty_upto)}</span></label>)}</div></fieldset>
          <Field label="Remarks"><input className={inputCls} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
          <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={() => setCreating(false)} disabled={busy}>Cancel</button><button className={btnPrimary} disabled={busy || sel.length === 0} onClick={() => void act(() => createDrn(to, remarks, sel), 'DRN created. It waits for the Supervisor.', () => setCreating(false))}>Create DRN</button></div>
        </Modal>)}
      {decide && <ReasonDialog title={`${decide.action === 'REVERT' ? 'Revert' : 'Reject'} ${decide.drn.drn_no}?`} label="Reason (required)" confirmLabel={decide.action === 'REVERT' ? 'Revert' : 'Reject'} danger required busy={busy} error={dlgError}
        onConfirm={(t) => void act(() => actDrn(decide.drn.id, decide.action, t), 'Done.', () => setDecide(null))} onCancel={() => setDecide(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Air-type conversion requests */
const AT_LABEL: Record<string, string> = { PENDING_HO: 'Pending HO', PENDING_AM: 'Pending AM', APPROVED: 'Approved', REJECTED: 'Rejected' };
export function AirTypePage() {
  const { me } = useAuth();
  const { d, error, notice, busy, dlgError, setDlgError, act } = useRows([['air_type_requests', 'requested_at', false], ['fleets', 'fleet_no']]);
  const [creating, setCreating] = useState(false);
  const [fleet, setFleet] = useState('');
  const [reason, setReason] = useState('');
  const [rej, setRej] = useState<Row | null>(null);
  const [reqs, fleets] = d ?? [[], []];
  const role = me?.role_code;
  const fl = fleets.find((x) => x.id === fleet);
  return (
    <div>
      <PageHeader title="Air-type conversion requests" subtitle="Change a fleet between Regular air and Nitrogen. The Tyre IC raises it, HO checks it, AM approves it."
        action={role === 'TIC' && <button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => { setDlgError(null); setFleet(''); setReason(''); setCreating(true); }}><Plus size={16} /> New request</button>} />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className={`${cardCls} overflow-x-auto`}><table className="w-full min-w-[760px] text-sm"><Th cols={['Request No', 'Date', 'Fleet', 'From', 'To', 'Reason', 'Status', 'Action']} />
        <tbody>{d && reqs.length === 0 && <Empty n={8} msg="No request yet." />}
          {reqs.map((r) => { const mine = (role === 'HO' && r.status === 'PENDING_HO') || (role === 'AM' && r.status === 'PENDING_AM'); return (
            <tr key={r.id} className="border-t border-slate-100 align-top"><td className="px-3 py-2 font-medium">{r.req_no}</td><td className="px-3 py-2">{fmtDate(r.requested_at)}</td><td className="px-3 py-2">{fleets.find((x) => x.id === r.fleet_id)?.fleet_no}</td>
              <td className="px-3 py-2">{r.from_type === 'NITROGEN' ? 'Nitrogen' : 'Regular'}</td><td className="px-3 py-2">{r.to_type === 'NITROGEN' ? 'Nitrogen' : 'Regular'}</td><td className="px-3 py-2">{r.reason}</td>
              <td className="px-3 py-2"><Pill tone={r.status === 'APPROVED' ? 'green' : r.status === 'REJECTED' ? 'red' : 'amber'}>{AT_LABEL[r.status]}</Pill>{r.decision_note && <div className="text-xs text-slate-500">{r.decision_note}</div>}</td>
              <td className="px-3 py-2">{mine && <div className="flex gap-2"><button className={btnPrimary} disabled={busy} onClick={() => void act(() => actAirTypeRequest(r.id, 'APPROVE', ''), 'Done.', () => undefined)}>{role === 'HO' ? 'Forward to AM' : 'Approve'}</button><button className={btnPlain} onClick={() => { setDlgError(null); setRej(r); }}>Reject</button></div>}</td></tr>); })}</tbody></table></div>
      {creating && (
        <Modal title="New air-type conversion request" onClose={() => setCreating(false)}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void act(() => createAirTypeRequest(fleet, fl?.air_type === 'NITROGEN' ? 'REGULAR' : 'NITROGEN', reason), 'Request sent to HO.', () => setCreating(false)); }}>
            <Field label="Fleet *"><select className={inputCls} value={fleet} onChange={(e) => setFleet(e.target.value)} required><option value="">Select…</option>{fleets.filter((x) => x.status === 'ACTIVE' && x.org_unit_id === me?.org_unit_id).map((x) => <option key={x.id} value={x.id}>{x.fleet_no} — now {x.air_type === 'NITROGEN' ? 'Nitrogen' : 'Regular'}</option>)}</select></Field>
            {fl && <p className="text-sm text-slate-600">Change to <strong>{fl.air_type === 'NITROGEN' ? 'Regular air' : 'Nitrogen'}</strong>.</p>}
            <Field label="Reason *"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} required /></Field>
            <Foot busy={busy} onCancel={() => setCreating(false)} label="Send request" />
          </form>
        </Modal>)}
      {rej && <ReasonDialog title={`Reject ${rej.req_no}?`} label="Reason (required)" confirmLabel="Reject" danger required busy={busy} error={dlgError} onConfirm={(t) => void act(() => actAirTypeRequest(rej.id, 'REJECT', t), 'Request rejected.', () => setRej(null))} onCancel={() => setRej(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Tyre Correction Requests */
export function CorrectionsPage() {
  const { me } = useAuth();
  const [params, setParams] = useSearchParams();
  const { d, error, notice, busy, dlgError, setDlgError, act } = useRows([['tyre_corrections', 'requested_at', false], ['tyre_correction_fields', 'field'], ['tyres', 'mtc_no']]);
  const [creating, setCreating] = useState(false);
  const [tyre, setTyre] = useState('');
  const [vals, setVals] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState('');
  const [view, setView] = useState<Row | null>(null);
  const [rej, setRej] = useState<Row | null>(null);
  const [filter, setFilter] = useState('');
  const [reqs, fields, tyres] = d ?? [[], [], []];
  const ho = me?.role_code === 'HO';
  useEffect(() => { const t = params.get('tyre'); if (t && d && me?.role_code === 'TIC') { setTyre(t); setVals({}); setCreating(true); setParams({}); } }, [params, d, me, setParams]);
  const cur = tyres.find((t) => t.id === tyre);
  const shown = reqs.filter((r) => !filter || r.status === filter);
  const ST = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' } as Record<string, string>;
  return (
    <div>
      <PageHeader title="Tyre Correction Requests" subtitle={ho ? 'Corrections of tyre details raised by the depots. Approve to apply them to the tyre.' : 'Ask HO to correct a wrong detail on a tyre of your depot (open a tyre in the Tyre Register and choose Correction Request).'}
        action={me?.role_code === 'TIC' && <button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => { setDlgError(null); setTyre(''); setVals({}); setCreating(true); }}><Plus size={16} /> New request</button>} />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className="mb-3 flex flex-wrap gap-2">{[['', `All ${reqs.length}`], ...Object.entries(ST).map(([k, l]) => [k, `${l} ${reqs.filter((r) => r.status === k).length}`])].map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-4 py-1.5 text-sm ${filter === k ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`}>{l}</button>)}</div>
      <div className={`${cardCls} overflow-x-auto`}><table className="w-full min-w-[720px] text-sm"><Th cols={['Request No', 'Date & Time', 'Tyre No', 'Fields', 'Status', 'Action']} />
        <tbody>{d && shown.length === 0 && <Empty n={6} msg="No correction request." />}
          {shown.map((r) => <tr key={r.id} className="border-t border-slate-100"><td className="px-3 py-2 font-medium">{r.req_no}</td><td className="px-3 py-2">{fmtDT(r.requested_at)}</td><td className="px-3 py-2">{tyres.find((t) => t.id === r.tyre_id)?.mtc_no}</td>
            <td className="px-3 py-2">{fields.filter((f) => f.correction_id === r.id).length}</td><td className="px-3 py-2"><Pill tone={r.status === 'APPROVED' ? 'green' : r.status === 'REJECTED' ? 'red' : 'amber'}>{ST[r.status]}</Pill></td>
            <td className="px-3 py-2"><button className={btnPlain} onClick={() => setView(r)}>View</button></td></tr>)}</tbody></table></div>
      {view && (
        <Modal title={`${view.req_no} · ${tyres.find((t) => t.id === view.tyre_id)?.mtc_no}`} onClose={() => setView(null)}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <table className="w-full text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-1">Field</th><th>Current value</th><th>Correct value</th></tr></thead>
            <tbody>{fields.filter((f) => f.correction_id === view.id).map((f) => <tr key={f.field} className="border-t border-slate-100"><td className="py-1">{CORRECTABLE.find((c) => c.key === f.field)?.label ?? f.field}</td><td>{f.current_value ?? '—'}</td><td className="font-medium">{f.correct_value}</td></tr>)}</tbody></table>
          {view.remarks && <p className="mt-2 text-sm text-slate-600">Remarks: {view.remarks}</p>}{view.decision_remarks && <p className="mt-1 text-sm text-slate-600">HO: {view.decision_remarks}</p>}
          <div className="mt-3 flex justify-end gap-2">{ho && view.status === 'PENDING' && <><button className={btnPrimary} disabled={busy} onClick={() => void act(() => decideCorrection(view.id, true, ''), 'Correction applied to the tyre.', () => setView(null))}>Approve</button><button className={btnPlain} onClick={() => { setRej(view); setView(null); }}>Reject</button></>}<button className={btnPlain} onClick={() => setView(null)}>Close</button></div>
        </Modal>)}
      {rej && <ReasonDialog title={`Reject ${rej.req_no}?`} label="Reason (required)" confirmLabel="Reject" danger required busy={busy} error={dlgError} onConfirm={(t) => void act(() => decideCorrection(rej.id, false, t), 'Request rejected.', () => setRej(null))} onCancel={() => setRej(null)} />}
      {creating && (
        <Modal title="Tyre Correction Request" onClose={() => setCreating(false)}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const f = Object.fromEntries(Object.entries(vals).filter(([, v]) => v.trim())); void act(() => createCorrection(tyre, f, remarks), 'Request sent to HO.', () => setCreating(false)); }}>
            <Field label="Tyre *"><select className={inputCls} value={tyre} onChange={(e) => { setTyre(e.target.value); setVals({}); }} required><option value="">Select…</option>{tyres.filter((t) => t.owner_org_unit_id === me?.org_unit_id).map((t) => <option key={t.id} value={t.id}>{t.mtc_no}</option>)}</select></Field>
            {cur && <div className="space-y-2">{CORRECTABLE.map((c) => (
              <div key={c.key} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2 text-sm"><span>{c.label}</span><span className="text-slate-500">{cur[c.key] ?? '—'}</span>
                {c.kind === 'grade' ? <select className={inputCls} value={vals[c.key] ?? ''} onChange={(e) => setVals({ ...vals, [c.key]: e.target.value })}><option value="">Correct value</option>{['NEW', 'A', 'B', 'C'].map((g) => <option key={g}>{g}</option>)}</select>
                  : <input className={inputCls} type={c.kind === 'date' ? 'date' : c.kind === 'number' ? 'number' : 'text'} step="any" placeholder="Correct value" value={vals[c.key] ?? ''} onChange={(e) => setVals({ ...vals, [c.key]: e.target.value })} />}</div>))}</div>}
            <Field label="Remarks"><input className={inputCls} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
            <Foot busy={busy} onCancel={() => setCreating(false)} label="Send to HO" disabled={!tyre || Object.values(vals).every((v) => !v.trim())} />
          </form>
        </Modal>)}
      {me?.role_code === 'TIC' && <p className="mt-3 text-sm"><Link className="text-blue-700 underline" to="/tic/tyres">Back to the Tyre Register</Link></p>}
    </div>
  );
}
