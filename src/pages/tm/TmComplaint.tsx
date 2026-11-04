import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fmtDateTime } from '../../lib/masters';
import { loadJobs, raiseComplaint, type JobsCtx } from '../../lib/jobs';
import { Banner, btnPrimary, Field, inputCls } from '../../components/ui';
import { CardBadge } from '../../components/OpsBits';

/** Tyre Man: raise a complaint on a fleet of the depot, and follow the ones raised. */
export function TmComplaint() {
  const [params] = useSearchParams();
  const [ctx, setCtx] = useState<JobsCtx | null>(null);
  const [f, setF] = useState({ fleet: params.get('fleet') ?? '', tyre: '', type: '', remarks: '' });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { loadJobs().then(setCtx).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);

  const tyres = (ctx?.tyres ?? []).filter((t) => t.fleet_id === f.fleet && t.stock_place === 'FITTED').sort((a, b) => a.fitted_position.localeCompare(b.fitted_position));

  async function submit() {
    setBusy(true); setError(null); setNotice(null);
    try {
      await raiseComplaint(f.fleet, f.tyre || null, f.type, f.remarks);
      setNotice('Complaint raised. The Tyre IC will put it on a job card.'); setF({ fleet: '', tyre: '', type: '', remarks: '' }); load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Raise a complaint</h1>
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}
      <form className="space-y-3 rounded-xl border border-slate-200 bg-white p-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Fleet *">
          <select className={`${inputCls} min-h-12 text-base`} value={f.fleet} onChange={(e) => setF({ ...f, fleet: e.target.value, tyre: '' })} required>
            <option value="">Select…</option>
            {(ctx?.fleets ?? []).filter((x) => x.status === 'ACTIVE').map((x) => <option key={x.id} value={x.id}>{x.fleet_no} — {x.registration_no}</option>)}
          </select>
        </Field>
        <Field label="Tyre">
          <select className={`${inputCls} min-h-12 text-base`} value={f.tyre} onChange={(e) => setF({ ...f, tyre: e.target.value })}>
            <option value="">General</option>
            {tyres.map((t) => <option key={t.id} value={t.id}>{t.fitted_position} · {t.mtc_no}</option>)}
          </select>
        </Field>
        <Field label="What is wrong? *">
          <select className={`${inputCls} min-h-12 text-base`} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} required>
            <option value="">Select…</option>
            {(ctx?.complaintTypes ?? []).filter((t) => t.status === 'ACTIVE').map((t) => <option key={t.id} value={t.id}>{t.complaint_name}</option>)}
          </select>
        </Field>
        <Field label="Remarks"><textarea className={`${inputCls} text-base`} rows={3} value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} /></Field>
        <button type="submit" className={`${btnPrimary} min-h-12 w-full text-base`} disabled={busy}>{busy ? 'Working…' : 'Raise complaint'}</button>
      </form>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">My complaints</h2>
      {ctx && ctx.complaints.length === 0 && <p className="text-sm text-slate-500">You have not raised any complaint.</p>}
      {(ctx?.complaints ?? []).map((c) => (
        <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <div className="flex items-center justify-between gap-2"><strong>{c.complaint_no}</strong><CardBadge status={c.state} /></div>
          <div className="text-slate-700">{ctx?.fleets.find((x) => x.id === c.fleet_id)?.fleet_no} · {ctx?.complaintTypes.find((t) => t.id === c.complaint_type_id)?.complaint_name}</div>
          <div className="text-xs text-slate-500">{fmtDateTime(c.raised_at)}</div>
          {c.decision_reason && <div className="mt-1 text-xs text-red-700">Rejected: {c.decision_reason}</div>}
        </div>
      ))}
    </div>
  );
}
