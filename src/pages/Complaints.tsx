import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/masters';
import { closeComplaint, loadJobs, raiseComplaint, reinspectComplaint, SOURCE_LABEL, type JobsCtx } from '../lib/jobs';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader, ReasonDialog } from '../components/ui';
import { CardBadge, Modal } from '../components/OpsBits';

const STATES = ['NEW', 'PENDING_INSPECTION', 'APPROVED', 'REJECTED', 'CLOSED', ''];
const STATE_CHIP: Record<string, string> = { NEW: 'New', PENDING_INSPECTION: 'Pending inspection', APPROVED: 'Approved', REJECTED: 'Rejected', CLOSED: 'Closed', '': 'All' };

/** Depot complaints. A complaint never becomes a job directly: the Tyre IC puts it on a job card, an inspection approves or rejects it. */
export function Complaints() {
  const { me } = useAuth();
  const role = me?.role_code;
  const base = role === 'SUP' ? '/sup' : '/tic';
  const [ctx, setCtx] = useState<JobsCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [state, setState] = useState('NEW');
  const [source, setSource] = useState('');
  const [raising, setRaising] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const empty = { fleet: '', tyre: '', type: '', remarks: '', driver: '', driverRef: '', runKm: '' };
  const [f, setF] = useState(empty);

  const load = useCallback(() => { loadJobs().then(setCtx).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);

  const fleet = (id: string) => ctx?.fleets.find((x) => x.id === id);
  const tyre = (id: string | null) => ctx?.tyres.find((x) => x.id === id);
  const card = (id: string | null) => ctx?.cards.find((x) => x.id === id);
  const rows = useMemo(() => (ctx?.complaints ?? []).filter((c) => (!state || c.state === state) && (!source || c.source === source)), [ctx, state, source]);
  const fleetTyres = (ctx?.tyres ?? []).filter((t) => t.fleet_id === f.fleet && t.stock_place === 'FITTED').sort((a, b) => a.fitted_position.localeCompare(b.fitted_position));
  const canRaise = role === 'TIC' || role === 'SUP';
  const myFleets = (ctx?.fleets ?? []).filter((x) => x.status === 'ACTIVE');

  async function run(fn: () => Promise<unknown>, ok: string, done: () => void) {
    setBusy(true); setDialogError(null);
    try { await fn(); setNotice(ok); done(); load(); } catch (e) { setDialogError((e as Error).message); } finally { setBusy(false); }
  }
  const raise = () => run(() => raiseComplaint(f.fleet, f.tyre || null, f.type, f.remarks, null,
    role === 'SUP' ? { driver_name: f.driver.trim(), driver_ref: f.driverRef.trim() || null, run_km: f.runKm ? Number(f.runKm) : null } : undefined),
    'Complaint raised.', () => { setRaising(false); setF(empty); });

  return (
    <div>
      <PageHeader title={role === 'SUP' ? 'Log Sheet Complaints' : 'Complaints'}
        subtitle={role === 'TIC' ? 'Put a new complaint on a job card. The inspector then approves or rejects it.' : 'Complaints of your depot.'}
        action={canRaise && <button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => { setDialogError(null); setRaising(true); }}><Plus size={16} /> Raise complaint</button>} />
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}
      {ctx && <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {([['New — need review', ctx.complaints.filter((c) => c.state === 'NEW').length], ['Assigned', ctx.complaints.filter((c) => ['PENDING_INSPECTION', 'APPROVED'].includes(c.state)).length], ['Closed', ctx.complaints.filter((c) => c.state === 'CLOSED').length], ['Total', ctx.complaints.length]] as const).map(([l, n]) => (
          <div key={l} className="rounded-xl border border-slate-200 bg-white px-4 py-2"><div className="text-xs uppercase tracking-wide text-slate-500">{l}</div><div className="text-xl font-bold text-slate-900">{n}</div></div>))}
      </div>}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="text-sm text-slate-600">Source <select className="ml-1 rounded-lg border border-slate-300 px-2 py-1 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All</option>{Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {STATES.map((s) => (
          <button key={s || 'all'} onClick={() => setState(s)}
            className={`rounded-full border px-3 py-1 text-sm ${state === s ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`}>
            {STATE_CHIP[s]}{ctx ? ` (${s ? ctx.complaints.filter((c) => c.state === s).length : ctx.complaints.length})` : ''}
          </button>
        ))}
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[1200px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2">Complaint ID</th><th className="px-4 py-2">Maintenance Category</th><th className="px-4 py-2">Source</th><th className="px-4 py-2">Fleet</th><th className="px-4 py-2">Position</th><th className="px-4 py-2">Tyre No.</th><th className="px-4 py-2">Complaint Code</th><th className="px-4 py-2">Suggested Job Codes</th><th className="px-4 py-2">Raised by</th><th className="px-4 py-2">Raised at</th><th className="px-4 py-2">Job ref</th><th className="px-4 py-2">Status</th>{role === 'TIC' && <th className="px-4 py-2 text-right">Actions</th>}</tr>
          </thead>
          <tbody>
            {!ctx && !error && <tr><td colSpan={14} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {ctx && rows.length === 0 && <tr><td colSpan={14} className="px-4 py-6 text-center text-slate-500">No complaints here.</td></tr>}
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-2 font-medium text-slate-900">{c.complaint_no}</td>
                <td className="px-4 py-2">Tyre</td><td className="px-4 py-2">{SOURCE_LABEL[c.source]}</td>
                <td className="px-4 py-2">{fleet(c.fleet_id)?.fleet_no ?? '—'}<div className="text-xs text-slate-500">{fleet(c.fleet_id)?.registration_no}</div></td>
                <td className="px-4 py-2">{tyre(c.tyre_id)?.fitted_position ?? '—'}</td><td className="px-4 py-2">{tyre(c.tyre_id)?.mtc_no ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className="mr-1 rounded bg-slate-100 px-1.5 text-xs">{ctx?.complaintTypes.find((t) => t.id === c.complaint_type_id)?.complaint_code}</span>
                  {ctx?.complaintTypes.find((t) => t.id === c.complaint_type_id)?.complaint_name}
                  {c.remarks && <div className="text-xs text-slate-500">{c.remarks}</div>}
                  {c.decision_reason && <div className="text-xs text-red-700">Rejected: {c.decision_reason}</div>}
                </td>
                <td className="px-4 py-2 text-xs">{(ctx?.typeJobs[c.complaint_type_id] ?? []).join(', ') || '—'}</td>
                <td className="px-4 py-2">{ctx?.staff.find((x) => x.id === c.raised_by)?.full_name ?? '—'}<div className="text-xs text-slate-500">{ctx?.staff.find((x) => x.id === c.raised_by)?.employee_code}</div></td>
                <td className="px-4 py-2 text-slate-600">{fmtDateTime(c.raised_at)}</td>
                <td className="px-4 py-2">{card(c.job_card_id)?.job_card_no ?? '—'}</td>
                <td className="px-4 py-2"><CardBadge status={c.state} /></td>
                {role === 'TIC' && (
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      {c.state === 'NEW' && <Link className={btnPrimary} to={`${base}/job-cards?complaint=${c.id}`}>Create job card</Link>}
                      {c.job_card_id && <Link className={btnPlain} to={`${base}/job-cards/${c.job_card_id}`}>{card(c.job_card_id)?.job_card_no ?? 'Open job card'}</Link>}
                      {c.state === 'REJECTED' && <>
                        <button className={btnPlain} onClick={() => void run(() => reinspectComplaint(c.id), 'Complaint reopened. Assign an inspection on its job card.', () => undefined)}>Re-inspect</button>
                        <button className={btnPlain} onClick={() => { setDialogError(null); setClosing(c.id); }}>Close complaint</button>
                      </>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {raising && ctx && (
        <Modal title="Raise a complaint" onClose={() => setRaising(false)}>
          {dialogError && <Banner kind="error">{dialogError}</Banner>}
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void raise(); }}>
            <Field label="Fleet *">
              <select className={inputCls} value={f.fleet} onChange={(e) => setF({ ...f, fleet: e.target.value, tyre: '' })} required>
                <option value="">Select…</option>
                {myFleets.map((x) => <option key={x.id} value={x.id}>{x.fleet_no} — {x.registration_no}</option>)}
              </select>
            </Field>
            <Field label="Tyre">
              <select className={inputCls} value={f.tyre} onChange={(e) => setF({ ...f, tyre: e.target.value })}>
                <option value="">General (no specific tyre)</option>
                {fleetTyres.map((t) => <option key={t.id} value={t.id}>{t.fitted_position} · {t.mtc_no}</option>)}
              </select>
            </Field>
            <Field label="Complaint *">
              <select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} required>
                <option value="">Select…</option>
                {ctx.complaintTypes.filter((t) => t.status === 'ACTIVE').map((t) => <option key={t.id} value={t.id}>{t.complaint_code} · {t.complaint_name}</option>)}
              </select>
            </Field>
            {role === 'SUP' && <>
              <Field label="Driver name *"><input className={inputCls} value={f.driver} onChange={(e) => setF({ ...f, driver: e.target.value })} required /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Driver emp ID"><input className={inputCls} value={f.driverRef} onChange={(e) => setF({ ...f, driverRef: e.target.value })} /></Field>
                <Field label="Run KM (today)"><input className={inputCls} type="number" min="0" value={f.runKm} onChange={(e) => setF({ ...f, runKm: e.target.value })} /></Field>
              </div>
            </>}
            <Field label="Remarks"><textarea className={inputCls} rows={2} value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} /></Field>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnPlain} onClick={() => setRaising(false)} disabled={busy}>Cancel</button>
              <button type="submit" className={btnPrimary} disabled={busy}>{busy ? 'Working…' : 'Raise complaint'}</button>
            </div>
          </form>
        </Modal>
      )}
      {closing && <ReasonDialog title="Close this complaint?" label="Remarks (optional)" confirmLabel="Close complaint" required={false} busy={busy} error={dialogError}
        onConfirm={(t) => void run(() => closeComplaint(closing, t), 'Complaint closed.', () => setClosing(null))} onCancel={() => setClosing(null)} />}
    </div>
  );
}
