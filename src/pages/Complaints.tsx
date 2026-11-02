import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/masters';
import { loadOps, raiseComplaint, rejectComplaint, type OpsCtx } from '../lib/ops';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader, ReasonDialog } from '../components/ui';
import { CardBadge, Modal } from '../components/OpsBits';

/** Depot complaints. Tyre IC triages (job card or reject); Tyre IC, Supervisor (log sheet) and Tyre Man raise. */
export function Complaints() {
  const { me } = useAuth();
  const role = me?.role_code;
  const base = role === 'SUP' ? '/sup' : '/tic';
  const [ctx, setCtx] = useState<OpsCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState('NEW');
  const [raising, setRaising] = useState(false);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [f, setF] = useState({ fleet: '', position: '', type: '', remarks: '', driver: '', driverRef: '', runKm: '' });

  const load = useCallback(() => { loadOps().then(setCtx).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);

  const fleet = (id: string) => ctx?.fleets.find((x) => x.id === id);
  const rows = useMemo(() => (ctx?.complaints ?? []).filter((c) => !status || c.status === status), [ctx, status]);
  const canRaise = role === 'TIC' || role === 'SUP';
  const selFleet = fleet(f.fleet);

  async function raise() {
    setBusy(true); setDialogError(null);
    try {
      const log = role === 'SUP' ? { driver_name: f.driver.trim(), driver_ref: f.driverRef.trim() || null, run_km: f.runKm ? Number(f.runKm) : null } : undefined;
      await raiseComplaint(f.fleet, f.position || null, f.type, f.remarks, log);
      setNotice('Complaint raised.'); setRaising(false); setF({ fleet: '', position: '', type: '', remarks: '', driver: '', driverRef: '', runKm: '' }); load();
    } catch (e) { setDialogError((e as Error).message); } finally { setBusy(false); }
  }
  async function reject(remarks: string) {
    if (!rejecting) return;
    setBusy(true); setDialogError(null);
    try { await rejectComplaint(rejecting, remarks); setNotice('Complaint rejected.'); setRejecting(null); load(); }
    catch (e) { setDialogError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader
        title={role === 'SUP' ? 'Log Sheet Complaints' : 'Complaints'}
        subtitle={role === 'TIC' ? 'Review each complaint: create a job card for it, or reject it with a reason.' : 'Complaints of your depot.'}
        action={canRaise && <button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => { setDialogError(null); setRaising(true); }}><Plus size={16} /> Raise complaint</button>}
      />
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}
      <div className="mb-3 flex flex-wrap gap-2">
        {['NEW', 'ASSIGNED', 'CLOSED', 'REJECTED', ''].map((s) => (
          <button key={s || 'all'} onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-sm ${status === s ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`}>
            {s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All'}
          </button>
        ))}
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2">Complaint</th><th className="px-4 py-2">Fleet</th><th className="px-4 py-2">Position</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Raised</th><th className="px-4 py-2">Status</th>{role === 'TIC' && <th className="px-4 py-2 text-right">Actions</th>}</tr>
          </thead>
          <tbody>
            {!ctx && !error && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {ctx && rows.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">No complaints here.</td></tr>}
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-2 font-medium text-slate-900">{c.complaint_no}<div className="text-xs font-normal text-slate-500">{c.source.replace('_', ' ').toLowerCase()}</div></td>
                <td className="px-4 py-2">{fleet(c.fleet_id)?.fleet_no ?? '—'}</td>
                <td className="px-4 py-2">{c.position ?? 'General'}</td>
                <td className="px-4 py-2">{ctx?.complaintTypes.find((t) => t.id === c.complaint_type_id)?.complaint_name ?? '—'}
                  {c.remarks && <div className="text-xs text-slate-500">{c.remarks}</div>}
                  {c.decision_remarks && <div className="text-xs text-red-700">Rejected: {c.decision_remarks}</div>}</td>
                <td className="px-4 py-2 text-slate-600">{fmtDateTime(c.raised_at)}</td>
                <td className="px-4 py-2"><CardBadge status={c.status} /></td>
                {role === 'TIC' && (
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      {c.status === 'NEW' && <>
                        <Link className={btnPrimary} to={`${base}/job-cards?complaint=${c.id}`}>Create job card</Link>
                        <button className={btnPlain} onClick={() => { setDialogError(null); setRejecting(c.id); }}>Reject</button>
                      </>}
                      {c.job_card_id && <Link className={btnPlain} to={`${base}/job-cards/${c.job_card_id}`}>Open job card</Link>}
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
              <select className={inputCls} value={f.fleet} onChange={(e) => setF({ ...f, fleet: e.target.value, position: '' })} required>
                <option value="">Select…</option>
                {ctx.fleets.filter((x) => x.status === 'ACTIVE').map((x) => <option key={x.id} value={x.id}>{x.fleet_no} — {x.registration_no}</option>)}
              </select>
            </Field>
            <Field label="Wheel / tyre position">
              <select className={inputCls} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })}>
                <option value="">General</option>
                {(selFleet?.position_layout ?? []).map((p: string) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Complaint type *">
              <select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} required>
                <option value="">Select…</option>
                {ctx.complaintTypes.filter((t) => t.status === 'ACTIVE').map((t) => <option key={t.id} value={t.id}>{t.complaint_name}</option>)}
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
      {rejecting && (
        <ReasonDialog title="Reject this complaint?" label="Reason (required)" confirmLabel="Reject complaint" danger required busy={busy}
          error={dialogError} onConfirm={(t) => void reject(t)} onCancel={() => setRejecting(null)} />
      )}
    </div>
  );
}
