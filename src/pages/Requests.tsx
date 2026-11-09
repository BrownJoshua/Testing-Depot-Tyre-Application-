import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fmtDateTime } from '../lib/masters';
import { decideReschedule, loadReschedules, moveFromAbsent, type Row } from '../lib/notify';
import { loadJobs, type JobsCtx } from '../lib/jobs';
import { Banner, btnPlain, btnPrimary, cardCls, inputCls, PageHeader, ReasonDialog } from '../components/ui';

/** Tyre IC: Prepone / Postpone requests from the Tyre Men, and moving work from people who are off duty. */
export function Requests() {
  const [ctx, setCtx] = useState<JobsCtx | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rej, setRej] = useState<Row | null>(null);
  const [dlgError, setDlgError] = useState<string | null>(null);
  const [day, setDay] = useState('');
  const load = useCallback(() => { Promise.all([loadJobs(), loadReschedules()]).then(([c, r]) => { setCtx(c); setRows(r); setDay((d) => d || c.today); }).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);

  async function run(fn: () => Promise<unknown>, ok: (r: unknown) => string, done?: () => void) {
    setBusy(true); setError(null); setDlgError(null);
    try { const r = await fn(); setNotice(ok(r)); done?.(); load(); } catch (e) { (rej ? setDlgError : setError)((e as Error).message); } finally { setBusy(false); }
  }
  const card = (id: string) => ctx?.cards.find((c) => c.id === id);
  const who = (id: string) => ctx?.staff.find((s) => s.id === id)?.full_name ?? '—';
  const fleet = (cid: string) => ctx?.fleets.find((f) => f.id === card(cid)?.fleet_id)?.fleet_no ?? '—';

  return (
    <div className="space-y-4">
      <PageHeader title="Requests" subtitle="Prepone / Postpone requests from the Tyre Men, and work to move from people who are off duty." />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <section className={`${cardCls} overflow-x-auto`}>
        <h2 className="px-4 pt-3 font-semibold text-slate-900">Prepone / Postpone</h2>
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">Job card</th><th className="px-4 py-2">Fleet</th><th className="px-4 py-2">Asked by</th><th className="px-4 py-2">Change</th><th className="px-4 py-2">Reason</th><th className="px-4 py-2">Status</th><th className="px-4 py-2" /></tr></thead>
          <tbody>
            {!rows && <tr><td colSpan={7} className="px-4 py-4 text-slate-500">Loading…</td></tr>}
            {rows?.length === 0 && <tr><td colSpan={7} className="px-4 py-4 text-slate-500">No requests.</td></tr>}
            {rows?.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-2"><Link className="text-blue-700 underline" to={`/tic/job-cards/${r.job_card_id}`}>{card(r.job_card_id)?.job_card_no}</Link></td>
                <td className="px-4 py-2">{fleet(r.job_card_id)}</td><td className="px-4 py-2">{who(r.requested_by)}<div className="text-xs text-slate-500">{fmtDateTime(r.created_at)}</div></td>
                <td className="px-4 py-2">{r.kind === 'PREPONE' ? 'Prepone' : 'Postpone'}: {r.from_date} → {r.to_date}</td><td className="px-4 py-2">{r.reason}</td>
                <td className="px-4 py-2">{r.status === 'PENDING' ? 'Pending' : r.status === 'APPROVED' ? 'Approved' : `Rejected${r.remarks ? ` · ${r.remarks}` : ''}`}</td>
                <td className="px-4 py-2">{r.status === 'PENDING' && <div className="flex gap-2"><button className={btnPrimary} disabled={busy} onClick={() => void run(() => decideReschedule(r.id, true, ''), () => 'Approved. The dates moved.')}>Approve</button><button className={btnPlain} disabled={busy} onClick={() => { setDlgError(null); setRej(r); }}>Reject</button></div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className={`${cardCls} p-4`}>
        <h2 className="font-semibold text-slate-900">Move work from people who are off duty</h2>
        <p className="mb-2 text-sm text-slate-600">For one day, work assigned to someone on weekly off or leave goes to another person posted for the same schedule or job and on duty that day.</p>
        <div className="flex flex-wrap items-center gap-2"><input type="date" className={`${inputCls} w-44`} value={day} onChange={(e) => setDay(e.target.value)} aria-label="Day" />
          <button className={btnPrimary} disabled={busy || !day} onClick={() => void run(() => moveFromAbsent(day), (r) => { const x = r as { moved: number; unresolved: number }; return `Moved ${x.moved} Job ID${x.moved === 1 ? '' : 's'}${x.unresolved ? `; ${x.unresolved} could not be moved (nobody else posted and on duty)` : ''}.`; })}>Move work</button></div>
      </section>
      {rej && <ReasonDialog title="Reject this request?" label="Reason (required)" confirmLabel="Reject" danger required busy={busy} error={dlgError} onConfirm={(t) => void run(() => decideReschedule(rej.id, false, t), () => 'Rejected.', () => setRej(null))} onCancel={() => setRej(null)} />}
    </div>
  );
}
