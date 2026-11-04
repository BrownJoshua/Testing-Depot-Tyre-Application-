import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { getBusinessToday, loadOps, startTask, submitTask, WORK_CATEGORY_LABEL, type OpsCtx, type Row } from '../../lib/ops';
import { Banner, btnPlain, btnPrimary } from '../../components/ui';
import { CardBadge } from '../../components/OpsBits';

/** Tyre Man: My Jobs. Only jobs assigned to this person are returned by the database. */
export function TmJobs() {
  const [ctx, setCtx] = useState<OpsCtx | null>(null);
  const [today, setToday] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([loadOps(), getBusinessToday()]).then(([c, t]) => { setCtx(c); setToday(t); }).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function act(task: Row, kind: 'start' | 'submit') {
    setBusy(task.id); setError(null); setNotice(null);
    try {
      if (kind === 'start') await startTask(task.id); else await submitTask(task.id, null);
      setNotice(kind === 'start' ? `${task.job_task_no} started.` : `${task.job_task_no} submitted for verification.`);
      setConfirming(null); load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  const tasks = ctx?.tasks ?? [];
  const todo = tasks.filter((t) => ['ASSIGNED', 'IN_PROGRESS', 'REWORK'].includes(t.status)).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
  const waiting = tasks.filter((t) => ['SUBMITTED', 'ON_HOLD', 'AWAITING_WSR'].includes(t.status));
  const done = tasks.filter((t) => ['COMPLETED', 'CANCELLED'].includes(t.status)).slice(0, 10);
  const fleet = (cardId: string) => ctx?.fleets.find((f) => f.id === ctx.cards.find((c) => c.id === cardId)?.fleet_id);
  const card = (cardId: string) => ctx?.cards.find((c) => c.id === cardId);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">My Jobs</h1>
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}
      {!ctx && !error && <p className="text-slate-500">Loading…</p>}
      {ctx && tasks.length === 0 && <Banner kind="info">No jobs are assigned to you right now.</Banner>}

      {todo.length > 0 && <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">To do ({todo.length})</h2>}
      {todo.map((t) => {
        const overdue = t.due_date && today && t.due_date < today;
        const rework = t.status === 'REWORK';
        return (
          <article key={t.id} className={`rounded-xl border bg-white p-4 shadow-sm ${rework ? 'border-red-300' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-lg font-bold text-slate-900">{fleet(t.job_card_id)?.fleet_no ?? '—'}</div>
                <div className="text-sm text-slate-700">{WORK_CATEGORY_LABEL[t.work_category]}{t.position ? ` · ${t.position}` : ''}</div>
              </div>
              <CardBadge status={t.status} />
            </div>
            <div className="mt-1 text-xs text-slate-500">{t.job_task_no} · {card(t.job_card_id)?.job_card_no} · due {t.due_date ?? '—'}</div>
            {overdue && <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-700"><AlertTriangle size={14} /> Overdue</div>}
            {card(t.job_card_id)?.instruction && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">{card(t.job_card_id)?.instruction}</p>}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {t.status !== 'IN_PROGRESS' && <button className={`${btnPlain} min-h-12 text-base`} disabled={busy === t.id} onClick={() => void act(t, 'start')}>Start</button>}
              {confirming === t.id ? (
                <button className={`${btnPrimary} min-h-12 text-base ${t.status === 'IN_PROGRESS' ? 'col-span-2' : ''}`} disabled={busy === t.id} onClick={() => void act(t, 'submit')}>Tap again to submit</button>
              ) : (
                <button className={`${btnPrimary} min-h-12 text-base ${t.status === 'IN_PROGRESS' ? 'col-span-2' : ''}`} disabled={busy === t.id} onClick={() => setConfirming(t.id)}>Submit</button>
              )}
            </div>
            <Link className="mt-3 block text-center text-sm font-medium text-blue-700 underline" to={`/tm/complaint?fleet=${fleet(t.job_card_id)?.id ?? ''}`}>Raise a complaint on this fleet</Link>
          </article>
        );
      })}

      {waiting.length > 0 && <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Waiting for the Tyre IC ({waiting.length})</h2>}
      {waiting.map((t) => (
        <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <div><strong>{fleet(t.job_card_id)?.fleet_no}</strong> · {WORK_CATEGORY_LABEL[t.work_category]}<div className="text-xs text-slate-500">{t.job_task_no}</div></div>
          <CardBadge status={t.status} />
        </div>
      ))}

      {done.length > 0 && <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Recently finished</h2>}
      {done.map((t) => (
        <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
          <div><strong>{fleet(t.job_card_id)?.fleet_no}</strong> · {WORK_CATEGORY_LABEL[t.work_category]}<div className="text-xs">{t.job_task_no}</div></div>
          <CardBadge status={t.status} />
        </div>
      ))}
    </div>
  );
}
