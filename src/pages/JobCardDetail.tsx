import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/masters';
import { assignTask, cancelCard, inspectCard, loadCardDetail, loadOps, startTask, submitTask, WORK_CATEGORY_LABEL, type OpsCtx, type Row } from '../lib/ops';
import { Banner, btnDanger, btnPlain, btnPrimary, cardCls, inputCls, PageHeader, ReasonDialog } from '../components/ui';
import { CardBadge } from '../components/OpsBits';

type Dialog = { kind: 'cancel' } | { kind: 'fail' } | { kind: 'behalf'; task: Row } | { kind: 'replace'; task: Row; employee: string };

/** One job card: its tasks, who they are assigned to, the timeline, and the Tyre IC's final inspection. */
export function JobCardDetail() {
  const { id } = useParams();
  const { me } = useAuth();
  const isTic = me?.role_code === 'TIC';
  const base = me?.role_code === 'SUP' ? '/sup' : '/tic';
  const [ctx, setCtx] = useState<OpsCtx | null>(null);
  const [detail, setDetail] = useState<{ events: Row[]; inspections: Row[]; assignments: Row[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([loadOps(), loadCardDetail(id)]).then(([c, d]) => { setCtx(c); setDetail(d); }).catch((e: Error) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  const card = ctx?.cards.find((c) => c.id === id);
  const tasks = (ctx?.tasks ?? []).filter((t) => t.job_card_id === id);
  const fleet = ctx?.fleets.find((x) => x.id === card?.fleet_id);
  const who = (emp: string | null) => { const s = ctx?.staff.find((x) => x.id === emp); return s ? `${s.full_name} (${s.employee_code})` : emp ? 'Unknown' : '—'; };

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setDialogError(null); setError(null);
    try { await fn(); setNotice(ok); setDialog(null); load(); }
    catch (e) { const m = (e as Error).message; if (dialog) setDialogError(m); else setError(m); }
    finally { setBusy(false); }
  }

  if (!ctx && !error) return <p className="text-slate-500">Loading…</p>;
  if (ctx && !card) return <Banner kind="error">Job card not found in your depot.</Banner>;
  if (!card) return <Banner kind="error">{error}</Banner>;
  const open = !['CLOSED', 'CANCELLED'].includes(card.status);

  return (
    <div className="space-y-4">
      <PageHeader title={`Job card ${card.job_card_no}`}
        subtitle={`${WORK_CATEGORY_LABEL[card.work_category]} · fleet ${fleet?.fleet_no ?? '—'} · due ${card.due_date}`}
        action={<div className="flex items-center gap-2"><CardBadge status={card.status} /><Link className={btnPlain} to={`${base}/job-cards`}>Back</Link></div>} />
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}
      {card.instruction && <Banner kind="info">Instruction: {card.instruction}</Banner>}
      {card.cancel_reason && <Banner kind="error">Cancelled: {card.cancel_reason}</Banner>}

      <section className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2">Job ID</th><th className="px-4 py-2">Step</th><th className="px-4 py-2">Assigned to</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const mine = t.assigned_employee_id === me?.employee_id;
              const canAssign = isTic && ['NOT_ASSIGNED', 'ASSIGNED', 'REWORK'].includes(t.status);
              const candidate = pick[t.id] ?? '';
              return (
                <tr key={t.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-2 font-medium">{t.job_task_no}</td>
                  <td className="px-4 py-2">{t.seq}. {WORK_CATEGORY_LABEL[t.work_category]}{t.position && <span className="text-slate-500"> · {t.position}</span>}</td>
                  <td className="px-4 py-2">
                    {who(t.assigned_employee_id)}
                    {canAssign && (
                      <div className="mt-1 flex gap-2">
                        <select className={`${inputCls} max-w-[14rem]`} value={candidate} onChange={(e) => setPick({ ...pick, [t.id]: e.target.value })} aria-label={`Assign ${t.job_task_no}`}>
                          <option value="">{t.assigned_employee_id ? 'Replace with…' : 'Assign to…'}</option>
                          {(ctx?.staff ?? []).filter((s) => s.id !== t.assigned_employee_id).map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.employee_code})</option>)}
                        </select>
                        <button className={btnPlain} disabled={!candidate || busy}
                          onClick={() => t.assigned_employee_id ? (setDialogError(null), setDialog({ kind: 'replace', task: t, employee: candidate }))
                            : void act(() => assignTask(t.id, candidate, null, ''), 'Assigned.')}>
                          {t.assigned_employee_id ? 'Replace' : 'Assign'}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2"><CardBadge status={t.status} /></td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      {mine && ['ASSIGNED', 'REWORK'].includes(t.status) && <button className={btnPlain} disabled={busy} onClick={() => void act(() => startTask(t.id), 'Started.')}>Start</button>}
                      {mine && ['ASSIGNED', 'IN_PROGRESS', 'REWORK'].includes(t.status) && <button className={btnPrimary} disabled={busy} onClick={() => void act(() => submitTask(t.id, null), 'Submitted.')}>Submit</button>}
                      {isTic && !mine && t.assigned_employee_id && ['ASSIGNED', 'IN_PROGRESS', 'REWORK'].includes(t.status) &&
                        <button className={btnPlain} disabled={busy} onClick={() => { setDialogError(null); setDialog({ kind: 'behalf', task: t }); }}>Submit on behalf</button>}
                    </div>
                    {t.on_behalf_reason && <div className="mt-1 text-right text-xs text-slate-500">On behalf: {t.on_behalf_reason}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {isTic && card.status === 'AWAITING_FINAL_INSPECTION' && (
        <section className={`${cardCls} flex flex-wrap items-center justify-between gap-3 p-4`}>
          <div><h2 className="font-semibold text-slate-900">Final inspection</h2><p className="text-sm text-slate-600">All steps are submitted. Verify the work, then pass it or send it back for rework.</p></div>
          <div className="flex gap-2">
            <button className={btnDanger} disabled={busy} onClick={() => { setDialogError(null); setDialog({ kind: 'fail' }); }}>Fail — rework</button>
            <button className={btnPrimary} disabled={busy} onClick={() => void act(() => inspectCard(card.id, 'PASS', ''), 'Passed. The job card is closed.')}>Pass and close</button>
          </div>
        </section>
      )}
      {isTic && open && (
        <div className="flex justify-end"><button className={btnPlain} onClick={() => { setDialogError(null); setDialog({ kind: 'cancel' }); }}>Cancel job card</button></div>
      )}

      {detail && detail.inspections.length > 0 && (
        <section className={`${cardCls} p-4`}>
          <h2 className="mb-2 font-semibold text-slate-900">Inspections</h2>
          <ul className="space-y-1 text-sm">
            {detail.inspections.map((i) => <li key={i.id}><strong className={i.result === 'PASS' ? 'text-green-700' : 'text-red-700'}>{i.result}</strong> · {fmtDateTime(i.inspected_at)}{i.remarks && ` · ${i.remarks}`}</li>)}
          </ul>
        </section>
      )}
      {detail && (
        <section className={`${cardCls} p-4`}>
          <h2 className="mb-2 font-semibold text-slate-900">Timeline</h2>
          <ol className="space-y-1 text-sm text-slate-700">
            {detail.events.map((e) => (
              <li key={e.id}><span className="text-slate-500">{fmtDateTime(e.created_at)}</span> · {e.event.replace(/_/g, ' ').toLowerCase()}
                {e.task_id && <span className="text-slate-500"> · {tasks.find((t) => t.id === e.task_id)?.job_task_no}</span>}{e.remarks && ` — ${e.remarks}`}</li>
            ))}
          </ol>
        </section>
      )}

      {dialog?.kind === 'cancel' && <ReasonDialog title="Cancel this job card?" label="Reason (required)" confirmLabel="Cancel job card" danger required busy={busy} error={dialogError}
        onConfirm={(t) => void act(() => cancelCard(card.id, t), 'Job card cancelled.')} onCancel={() => setDialog(null)} />}
      {dialog?.kind === 'fail' && <ReasonDialog title="Fail the inspection?" label="What must be redone? (required)" confirmLabel="Send for rework" danger required busy={busy} error={dialogError}
        onConfirm={(t) => void act(() => inspectCard(card.id, 'FAIL', t), 'Sent back for rework.')} onCancel={() => setDialog(null)} />}
      {dialog?.kind === 'behalf' && <ReasonDialog title={`Submit ${dialog.task.job_task_no} on behalf of the assignee?`} label="Reason (required)" confirmLabel="Submit on behalf" required busy={busy} error={dialogError}
        onConfirm={(t) => void act(() => submitTask(dialog.task.id, t), 'Submitted on behalf.')} onCancel={() => setDialog(null)} />}
      {dialog?.kind === 'replace' && <ReasonDialog title="Replace the assignee?" label="Reason (required)" confirmLabel="Replace" required busy={busy} error={dialogError}
        onConfirm={(t) => void act(() => assignTask(dialog.task.id, dialog.employee, null, t), 'Assignee replaced.')} onCancel={() => setDialog(null)} />}
    </div>
  );
}
