import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { completeJobId, daysBetween, loadJobs, startJobId, type JobsCtx, type Row } from '../../lib/jobs';
import { Banner, btnPlain, btnPrimary } from '../../components/ui';
import { CardBadge } from '../../components/OpsBits';
import { createSrn } from '../../lib/stock';
import { CHANGE_CODES, ROUND_CODES, ROUND_LABEL, STEP_LABEL } from '../../lib/rounds';
import { blankScrap, ScrapLines, type ScrapRow } from './TmStock';

/** Tyre Man: My Jobs. Inspections assigned to him and the Job IDs assigned to him; the database returns only his own. */
export function TmJobs() {
  const [ctx, setCtx] = useState<JobsCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(() => { loadJobs().then(setCtx).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);

  const [review, setReview] = useState<Row | null>(null);
  const [scrapYes, setScrapYes] = useState<boolean | null>(null);
  const [scrap, setScrap] = useState<ScrapRow[]>(blankScrap());

  async function act(job: Row, kind: 'start' | 'complete') {
    setBusy(job.id); setError(null); setNotice(null);
    try {
      if (kind === 'start') await startJobId(job.id); else await completeJobId(job.id, null);
      // the review step of the last Job IDs of a card: scrap return available? (Scrap Return Note)
      if (kind === 'complete' && review && scrapYes) {
        const no = await createSrn(job.job_card_id, scrap.map((r) => ({ material: r.material, qty: Number(r.qty), unit: r.unit })), '');
        setNotice(`${job.job_id_no} completed. ${no} created.`);
      } else setNotice(kind === 'start' ? `Work started on ${job.job_id_no}.` : `${job.job_id_no} completed.`);
      setConfirming(null); setReview(null); setScrapYes(null); setScrap(blankScrap()); load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }
  /** the last open Job ID of the card (of the ones this Tyre Man can see) asks the scrap question first */
  const isLast = (j: Row) => !(ctx?.jobIds ?? []).some((x) => x.job_card_id === j.job_card_id && x.id !== j.id && !['DONE', 'CLOSED'].includes(x.status));

  const card = (id: string) => ctx?.cards.find((c) => c.id === id);
  const fleet = (cardId: string) => ctx?.fleets.find((f) => f.id === card(cardId)?.fleet_id);
  const tyre = (id: string | null) => { const t = ctx?.tyres.find((x) => x.id === id); return t ? `${t.fitted_position ?? ''} ${t.mtc_no}`.trim() : null; };
  const job = (j: Row) => ctx?.jobs.find((x) => x.id === j.job_code_id);
  const inspections = (ctx?.inspections ?? []).filter((i) => i.status === 'ASSIGNED');
  const all = ctx?.jobIds ?? [];
  const myOpen = all.filter((j) => ['ASSIGNED', 'STARTED'].includes(j.status));
  const codeOf = (j: Row) => job(j)?.job_code as string;
  const roundJobs = myOpen.filter((j) => (ROUND_CODES as readonly string[]).includes(codeOf(j)));
  const changeJobs = myOpen.filter((j) => CHANGE_CODES.includes(codeOf(j)));
  const todo = myOpen.filter((j) => !roundJobs.includes(j) && !changeJobs.includes(j)).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
  const statusOf = (js: Row[]) => (js.some((j) => j.on_hold) ? 'On hold' : js.some((j) => j.rework_of) ? 'Rework' : js.every((j) => j.status === 'ASSIGNED') ? 'Not started' : 'In progress');
  const rounds = Object.entries(roundJobs.reduce<Record<string, Row[]>>((m, j) => { (m[codeOf(j)] ??= []).push(j); return m; }, {})).map(([code, js]) => ({ code, js, cards: [...new Set(js.map((j) => j.job_card_id))] }));
  const changes = Object.entries(changeJobs.reduce<Record<string, Row[]>>((m, j) => { (m[j.job_card_id] ??= []).push(j); return m; }, {})).map(([cardId, js]) => ({ cardId, js }));
  const [chip, setChip] = useState('All');
  const show = (st: string) => chip === 'All' || chip === st;
  const waiting = all.filter((j) => j.status === 'DONE' && ['FINAL_INSPECTION', 'FINAL_INSPECTION_FAILED', 'ASSIGNED_FOR_WORK'].includes(card(j.job_card_id)?.status));
  const finished = all.filter((j) => (j.status === 'DONE' || j.status === 'CLOSED') && ['COMPLETED', 'CLOSED'].includes(card(j.job_card_id)?.status)).slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold text-slate-900">My Jobs <span className="text-sm font-normal text-slate-500">· {ctx?.today} Today</span></h1><Link to="/tm/notifications" aria-label="Notifications" className="rounded-lg border border-slate-300 px-3 py-2">🔔</Link></div>
      <div className="grid grid-cols-2 gap-2"><Link to="/tm/wsr" className={`${btnPlain} min-h-12 text-center leading-8`}>📦 Request Material (WSR)</Link><Link to="/tm/complaint" className={`${btnPlain} min-h-12 text-center leading-8`}>⚠ Raise complaint</Link></div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">{['All', 'Not started', 'In progress', 'On hold', 'Rework', 'Done'].map((c) => <button key={c} role="tab" aria-selected={chip === c} onClick={() => setChip(c)} className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${chip === c ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`}>{c}</button>)}</div>
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}
      {!ctx && !error && <p className="text-slate-500">Loading…</p>}
      {ctx && inspections.length + todo.length + waiting.length + rounds.length + changes.length === 0 && <Banner kind="info">No jobs are assigned to you right now.</Banner>}

      {chip !== 'Done' && rounds.filter((r) => show(statusOf(r.js))).map((r) => (
        <Link key={r.code} to={`/tm/${r.code === 'JOB-004' || r.code === 'JOB-005' ? 'month' : 'round'}/${r.code}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div><div className="text-lg font-bold text-slate-900">{ROUND_LABEL[r.code]}</div><div className="text-sm text-slate-600">{r.cards.length} job card{r.cards.length === 1 ? '' : 's'} · one per fleet</div></div>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">{statusOf(r.js)}</span></Link>))}
      {chip !== 'Done' && changes.filter((c) => show(statusOf(c.js))).map((c) => (
        <Link key={c.cardId} to={`/tm/work/${c.cardId}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div><div className="text-lg font-bold text-slate-900">{c.js.length === 1 && codeOf(c.js[0]) === 'JOB-010' ? 'Tyre Setting' : c.js.length === 1 && codeOf(c.js[0]) === 'JOB-011' ? 'Tyre Unsetting' : 'Tyre Changing'}</div>
            <div className="text-sm text-slate-600">{card(c.cardId)?.job_card_no} · {fleet(c.cardId)?.fleet_no ?? 'No fleet'} · {[...new Set(c.js.map((j) => STEP_LABEL[codeOf(j)]))].join(', ')}</div></div>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">{statusOf(c.js)}</span></Link>))}
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
      {chip !== 'Done' && todo.filter((j) => show(statusOf([j]))).map((j) => {
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
              {j.status === 'STARTED' && review?.id === j.id && (
                <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <div className="text-sm font-semibold">Scrap return available?</div>
                  <div className="grid grid-cols-2 gap-2"><button className={`${scrapYes === true ? btnPrimary : btnPlain} min-h-12`} onClick={() => setScrapYes(true)}>Yes</button><button className={`${scrapYes === false ? btnPrimary : btnPlain} min-h-12`} onClick={() => setScrapYes(false)}>No</button></div>
                  {scrapYes && <ScrapLines rows={scrap} setRows={setScrap} />}
                  <div className="grid grid-cols-2 gap-2"><button className={`${btnPlain} min-h-12`} onClick={() => setReview(null)}>Back</button>
                    <button className={`${btnPrimary} min-h-12`} disabled={busy === j.id || scrapYes === null || (scrapYes && scrap.some((r) => !(Number(r.qty) > 0)))} onClick={() => void act(j, 'complete')}>Complete</button></div>
                </div>)}
              {j.status === 'STARTED' && review?.id !== j.id && (confirming === j.id
                ? <button className={`${btnPrimary} min-h-12 text-base`} disabled={busy === j.id} onClick={() => void act(j, 'complete')}>Tap again to complete</button>
                : <button className={`${btnPlain} min-h-12 text-base`} disabled={busy === j.id} onClick={() => (isLast(j) ? (setReview(j), setScrapYes(null)) : setConfirming(j.id))}>Complete</button>)}
            </div>
            <Link className="mt-3 block text-center text-sm font-medium text-blue-700 underline" to={`/tm/complaint?fleet=${fleet(j.job_card_id)?.id ?? ''}`}>Raise a complaint on this fleet</Link>
          </article>
        );
      })}

      {(chip === 'All' || chip === 'Done') && waiting.length > 0 && <h2 className="pt-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Waiting for the Tyre IC ({waiting.length})</h2>}
      {(chip === 'All' || chip === 'Done') && waiting.map((j) => <div key={j.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm"><div><strong>{fleet(j.job_card_id)?.fleet_no}</strong> · {job(j)?.job_name}<div className="text-xs text-slate-500">{j.job_id_no}</div></div><CardBadge status="DONE" /></div>)}
      {(chip === 'All' || chip === 'Done') && finished.length > 0 && <h2 className="pt-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Recently finished</h2>}
      {(chip === 'All' || chip === 'Done') && finished.map((j) => <div key={j.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600"><div><strong>{fleet(j.job_card_id)?.fleet_no}</strong> · {job(j)?.job_name}<div className="text-xs">{j.job_id_no}</div></div><CardBadge status="COMPLETED" /></div>)}
    </div>
  );
}
