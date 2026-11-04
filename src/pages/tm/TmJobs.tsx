import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { completeJobId, daysBetween, loadJobs, startJobId, type JobsCtx, type Row } from '../../lib/jobs';
import { Banner, btnPlain, btnPrimary } from '../../components/ui';
import { CardBadge } from '../../components/OpsBits';

/** Tyre Man: My Jobs. Inspections assigned to him and the Job IDs assigned to him; the database returns only his own. */
export function TmJobs() {
  const [ctx, setCtx] = useState<JobsCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(() => { loadJobs().then(setCtx).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);

  async function act(job: Row, kind: 'start' | 'complete') {
    setBusy(job.id); setError(null); setNotice(null);
    try {
      if (kind === 'start') await startJobId(job.id); else await completeJobId(job.id, null);
      setNotice(kind === 'start' ? `Work started on ${job.job_id_no}.` : `${job.job_id_no} completed.`); setConfirming(null); load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  const card = (id: string) => ctx?.cards.find((c) => c.id === id);
  const fleet = (cardId: string) => ctx?.fleets.find((f) => f.id === card(cardId)?.fleet_id);
  const tyre = (id: string | null) => { const t = ctx?.tyres.find((x) => x.id === id); return t ? `${t.fitted_position ?? ''} ${t.mtc_no}`.trim() : null; };
  const job = (j: Row) => ctx?.jobs.find((x) => x.id === j.job_code_id);
  const inspections = (ctx?.inspections ?? []).filter((i) => i.status === 'ASSIGNED');
  const all = ctx?.jobIds ?? [];
  const todo = all.filter((j) => ['ASSIGNED', 'STARTED'].includes(j.status)).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
  const waiting = all.filter((j) => j.status === 'DONE' && ['FINAL_INSPECTION', 'FINAL_INSPECTION_FAILED', 'ASSIGNED_FOR_WORK'].includes(card(j.job_card_id)?.status));
  const finished = all.filter((j) => (j.status === 'DONE' || j.status === 'CLOSED') && ['COMPLETED', 'CLOSED'].includes(card(j.job_card_id)?.status)).slice(0, 8);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">My Jobs</h1>
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}
      {!ctx && !error && <p className="text-slate-500">Loading…</p>}
      {ctx && inspections.length + todo.length + waiting.length === 0 && <Banner kind="info">No jobs are assigned to you right now.</Banner>}

      {inspections.length > 0 && <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Inspections ({inspections.length})</h2>}
      {inspections.map((i) => (
        <article key={i.id} className="rounded-xl border border-sky-300 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2"><div><div className="text-lg font-bold text-slate-900">{fleet(i.job_card_id)?.fleet_no ?? '—'}</div><div className="text-sm text-slate-700">Inspect complaints</div></div><CardBadge status="ASSIGNED_FOR_INSPECTION" /></div>
          <div className="mt-1 text-xs text-slate-500">{i.inspection_no} · {card(i.job_card_id)?.job_card_no} · due {i.due_date}</div>
          {i.remarks && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">{i.remarks}</p>}
          <ul className="mt-2 space-y-1 text-sm">
            {ctx!.complaints.filter((c) => c.inspection_id === i.id).map((c) => <li key={c.id}>{c.complaint_no} · {ctx!.complaintTypes.find((t) => t.id === c.complaint_type_id)?.complaint_name}{ctx!.tyres.find((t) => t.id === c.tyre_id) && ` · ${ctx!.tyres.find((t) => t.id === c.tyre_id)?.mtc_no}`}</li>)}
          </ul>
          <Link className={`${btnPrimary} mt-3 block min-h-12 text-center text-base leading-8`} to={`/tm/job-card/${i.job_card_id}`}>Open and inspect</Link>
        </article>
      ))}

      {todo.length > 0 && <h2 className="pt-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Work to do ({todo.length})</h2>}
      {todo.map((j) => {
        const overdue = j.due_date && daysBetween(j.due_date, ctx!.today) > 0;
        return (
          <article key={j.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div><div className="text-lg font-bold text-slate-900">{fleet(j.job_card_id)?.fleet_no ?? 'No fleet'}</div><div className="text-sm text-slate-700">{job(j)?.job_name}{tyre(j.tyre_id) ? ` · ${tyre(j.tyre_id)}` : ''}</div></div>
              <CardBadge status={j.status} />
            </div>
            <div className="mt-1 text-xs text-slate-500">{j.job_id_no} · {card(j.job_card_id)?.job_card_no} · due {j.due_date ?? '—'}</div>
            {overdue && <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-700"><AlertTriangle size={14} /> Overdue</div>}
            {card(j.job_card_id)?.instruction && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">{card(j.job_card_id)?.instruction}</p>}
            {j.rework_of && <p className="mt-2 text-xs font-semibold text-amber-700">Rework: the Tyre IC sent this back.</p>}
            <div className="mt-3 grid grid-cols-1 gap-3">
              {j.status === 'ASSIGNED' && <button className={`${btnPrimary} min-h-12 text-base`} disabled={busy === j.id} onClick={() => void act(j, 'start')}>Start Work</button>}
              {j.status === 'STARTED' && (confirming === j.id
                ? <button className={`${btnPrimary} min-h-12 text-base`} disabled={busy === j.id} onClick={() => void act(j, 'complete')}>Tap again to complete</button>
                : <button className={`${btnPlain} min-h-12 text-base`} disabled={busy === j.id} onClick={() => setConfirming(j.id)}>Complete</button>)}
            </div>
            <Link className="mt-3 block text-center text-sm font-medium text-blue-700 underline" to={`/tm/complaint?fleet=${fleet(j.job_card_id)?.id ?? ''}`}>Raise a complaint on this fleet</Link>
          </article>
        );
      })}

      {waiting.length > 0 && <h2 className="pt-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Waiting for the Tyre IC ({waiting.length})</h2>}
      {waiting.map((j) => <div key={j.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm"><div><strong>{fleet(j.job_card_id)?.fleet_no}</strong> · {job(j)?.job_name}<div className="text-xs text-slate-500">{j.job_id_no}</div></div><CardBadge status="DONE" /></div>)}
      {finished.length > 0 && <h2 className="pt-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Recently finished</h2>}
      {finished.map((j) => <div key={j.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600"><div><strong>{fleet(j.job_card_id)?.fleet_no}</strong> · {job(j)?.job_name}<div className="text-xs">{j.job_id_no}</div></div><CardBadge status="COMPLETED" /></div>)}
    </div>
  );
}
