import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/masters';
import {
  assignInspection, assignWork, closeComplaint, completeJobId, daysBetween, decideInspection, finalInspect, fmtMinutes, loadCardDetail, loadFimForCard, loadJobs,
  reinspectComplaint, SOURCE_LABEL, startJobId, TYPE_LABEL, type ChecklistAnswer, type Decision, type FoundComplaint, type JobsCtx, type Row,
} from '../lib/jobs';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader, ReasonDialog } from '../components/ui';
import { CardBadge, Modal } from '../components/OpsBits';
import { PostedHint } from '../components/PostedHint';
import { FleetTyreView, NextSchedules } from '../components/FleetExtras';
import { CardDocsView, ProvideTyreDlg, ReceiveGinDlg } from '../components/CardDocs';
import { loadCardDocs, provideTyre, receiveGin, type CardDocs } from '../lib/stock';

type Dlg = { k: 'gin'; gin: Row } | { k: 'provide'; job: Row } | { k: 'inspection' } | { k: 'work' } | { k: 'inspect'; ins: Row } | { k: 'final' } | { k: 'behalf'; job: Row } | { k: 'close'; c: Row };
const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

/** One job card, one format: strip, complaints, inspections, Job IDs, final inspection, timeline, and the footer actions. */
export function JobCardDetail() {
  const { id } = useParams();
  const { me } = useAuth();
  const isTic = me?.role_code === 'TIC';
  const base = me?.role_code === 'SUP' ? '/sup' : '/tic';
  const [ctx, setCtx] = useState<JobsCtx | null>(null);
  const [detail, setDetail] = useState<{ events: Row[]; finals: Row[]; workAssignments: Row[] } | null>(null);
  const [docs, setDocs] = useState<CardDocs | null>(null);
  const [fim, setFim] = useState<Row | null>(null);
  const [extra, setExtra] = useState<'tyres' | 'next' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const [dlgError, setDlgError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([loadJobs(), loadCardDetail(id), loadCardDocs(id), loadFimForCard(id)]).then(([c, d, s, f]) => { setCtx(c); setDetail(d); setDocs(s); setFim(f); }).catch((e: Error) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  const card = ctx?.cards.find((c) => c.id === id);
  const fleet = ctx?.fleets.find((f) => f.id === card?.fleet_id);
  const fleet2 = ctx?.fleets.find((f) => f.id === card?.fleet2_id);
  const complaints = (ctx?.complaints ?? []).filter((c) => c.job_card_id === id);
  const inspections = (ctx?.inspections ?? []).filter((i) => i.job_card_id === id);
  const jobIds = (ctx?.jobIds ?? []).filter((j) => j.job_card_id === id);
  const who = (e: string | null) => ctx?.staff.find((s) => s.id === e)?.full_name ?? (e ? 'Unknown' : '—');
  const assignedTo = (jobId: string) => (ctx?.assignees ?? []).filter((a) => a.job_id_ref === jobId).map((a) => who(a.employee_id)).join(', ') || '—';
  const typeOf = (c: Row) => ctx?.complaintTypes.find((t) => t.id === c.complaint_type_id);
  const tyreLabel = (tid: string | null) => { const t = ctx?.tyres.find((x) => x.id === tid); return t ? `${t.fitted_position ?? t.stock_place} · ${t.mtc_no}` : '—'; };
  const jobOf = (j: Row) => ctx?.jobs.find((x) => x.id === j.job_code_id);
  const shiftName = (sid: string | null) => ctx?.shifts.find((s) => s.id === sid)?.shift_name;
  const mine = (j: Row) => (ctx?.assignees ?? []).some((a) => a.job_id_ref === j.id && a.employee_id === me?.employee_id);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setDlgError(null); setError(null);
    try { await fn(); setNotice(ok); setDlg(null); load(); } catch (e) { const m = (e as Error).message; if (dlg) setDlgError(m); else setError(m); } finally { setBusy(false); }
  }

  if (!ctx && !error) return <p className="text-slate-500">Loading…</p>;
  if (ctx && !card) return <Banner kind="error">Job card not found.</Banner>;
  if (!card || !ctx) return <Banner kind="error">{error}</Banner>;

  const closed = ['COMPLETED', 'CLOSED'].includes(card.status);
  const overdue = !closed ? Math.max(0, daysBetween(card.expected_date, ctx.today)) : 0;
  const pendingComplaints = complaints.filter((c) => c.state === 'PENDING_INSPECTION');
  const canAssignInspection = isTic && card.job_type === 'COMPLAINT' && ['DRAFT', 'INSPECTION_DONE'].includes(card.status) && pendingComplaints.length > 0;
  const assignable = jobIds.filter((j) => ['PENDING', 'ASSIGNED'].includes(j.status));
  const canAssignWork = isTic && assignable.length > 0 && (card.status === 'INSPECTION_DONE' || card.status === 'ASSIGNED_FOR_WORK' || (card.status === 'DRAFT' && card.job_type !== 'COMPLAINT'));
  const canFinal = isTic && ['FINAL_INSPECTION', 'FINAL_INSPECTION_FAILED'].includes(card.status);
  const technicians = [...new Set(ctx.assignees.filter((a) => jobIds.some((j) => j.id === a.job_id_ref)).map((a) => who(a.employee_id)))].join(', ') || '—';

  return (
    <div className="space-y-4">
      <PageHeader title={`Job card ${card.job_card_no}`} subtitle={TYPE_LABEL[card.job_type] + ' job card'} action={<div className="flex items-center gap-2"><CardBadge status={card.status} /><Link className={btnPlain} to={`${base}/job-cards`}>Close</Link></div>} />
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}

      <section className={`${cardCls} grid grid-cols-2 gap-x-6 gap-y-2 p-4 text-sm sm:grid-cols-4`}>
        {([
          ['Fleet Number', [fleet?.fleet_no ?? 'No fleet', fleet2?.fleet_no].filter(Boolean).join(' + ')], ['Register Number', [fleet?.registration_no ?? '—', fleet2?.registration_no].filter(Boolean).join(' + ')],
          ['Expected Done', <>{card.expected_date}{card.expected_shift_id ? ` · ${shiftName(card.expected_shift_id)}` : ''}{overdue > 0 && <span className="font-semibold text-red-700"> · Overdue {overdue}d</span>}</>],
          ['Estimated Time', card.estimated_minutes ? fmtMinutes(card.estimated_minutes) : '—'], ['Assignment', technicians], ['Vehicle Source', card.vehicle_source],
          ['Job Type', TYPE_LABEL[card.job_type]], ['Created', `${who(card.created_by)} · ${fmtDateTime(card.created_at)}`],
        ] as [string, React.ReactNode][]).map(([k, v]) => <div key={k}><div className="text-xs uppercase tracking-wide text-slate-500">{k}</div><div className="font-medium text-slate-900">{v}</div></div>)}
        {card.instruction && <div className="col-span-full"><div className="text-xs uppercase tracking-wide text-slate-500">Instruction</div><div>{card.instruction}</div></div>}
      </section>

      {card.job_type === 'COMPLAINT' && (
        <section className={`${cardCls} overflow-x-auto`}>
          <h2 className="px-4 pt-3 font-semibold text-slate-900">Complaints</h2>
          <table className="w-full min-w-[700px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">Complaint ID</th><th className="px-4 py-2">Complaint</th><th className="px-4 py-2">Tyre</th><th className="px-4 py-2">Source</th><th className="px-4 py-2">Status</th>{isTic && <th className="px-4 py-2 text-right">Action</th>}</tr></thead>
            <tbody>
              {complaints.length === 0 && <tr><td colSpan={6} className="px-4 py-3 text-slate-500">No complaints.</td></tr>}
              {complaints.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-2 font-medium">{c.complaint_no}</td>
                  <td className="px-4 py-2"><span className="mr-1 rounded bg-slate-100 px-1.5 text-xs">{typeOf(c)?.complaint_code}</span>{typeOf(c)?.complaint_name}{c.decision_reason && <div className="text-xs text-red-700">Rejected: {c.decision_reason}</div>}</td>
                  <td className="px-4 py-2">{tyreLabel(c.tyre_id)}</td><td className="px-4 py-2">{SOURCE_LABEL[c.source]}</td><td className="px-4 py-2"><CardBadge status={c.state} /></td>
                  {isTic && <td className="px-4 py-2 text-right">{c.state === 'REJECTED' && <div className="flex justify-end gap-2">
                    <button className={btnPlain} disabled={busy} onClick={() => void act(() => reinspectComplaint(c.id), 'Complaint reopened. Assign an inspection.')}>Re-inspect</button>
                    <button className={btnPlain} onClick={() => { setDlgError(null); setDlg({ k: 'close', c }); }}>Close complaint</button></div>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {card.job_type === 'COMPLAINT' && (
        <section className={`${cardCls} overflow-x-auto`}>
          <h2 className="px-4 pt-3 font-semibold text-slate-900">Inspection</h2>
          <table className="w-full min-w-[600px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">Inspection ID</th><th className="px-4 py-2">Inspector</th><th className="px-4 py-2">Due</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Action</th></tr></thead>
            <tbody>
              {inspections.length === 0 && <tr><td colSpan={5} className="px-4 py-3 text-slate-500">No inspection assigned yet.</td></tr>}
              {inspections.map((i) => (
                <tr key={i.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{i.inspection_no}</td><td className="px-4 py-2">{who(i.inspector_id)}</td>
                  <td className="px-4 py-2">{i.due_date}{i.shift_id ? ` · ${shiftName(i.shift_id)}` : ''}</td><td className="px-4 py-2">{i.status === 'DONE' ? `Done ${fmtDateTime(i.done_at)}` : 'Assigned'}</td>
                  <td className="px-4 py-2 text-right">{i.status === 'ASSIGNED' && i.inspector_id === me?.employee_id && <button className={btnPrimary} onClick={() => { setDlgError(null); setDlg({ k: 'inspect', ins: i }); }}>Inspect</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className={`${cardCls} overflow-x-auto`}>
        <h2 className="px-4 pt-3 font-semibold text-slate-900">Job IDs</h2>
        <table className="w-full min-w-[900px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">Job ID</th><th className="px-4 py-2">Complaint ID</th><th className="px-4 py-2">Job Code</th><th className="px-4 py-2">Tyre</th><th className="px-4 py-2">Assigned To</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Completed By / At</th><th className="px-4 py-2 text-right">Action</th></tr></thead>
          <tbody>
            {jobIds.length === 0 && <tr><td colSpan={8} className="px-4 py-3 text-slate-500">{card.job_type === 'COMPLAINT' ? 'Job IDs are made when the inspector approves a complaint.' : 'No Job IDs.'}</td></tr>}
            {jobIds.map((j) => (
              <tr key={j.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-2 font-medium">{j.job_id_no}{j.rework_of && <div className="text-xs font-normal text-amber-700">Rework of {jobIds.find((x) => x.id === j.rework_of)?.job_id_no}</div>}</td>
                <td className="px-4 py-2">{complaints.find((c) => c.id === j.complaint_id)?.complaint_no ?? '—'}</td>
                <td className="px-4 py-2"><span className="mr-1 rounded bg-slate-100 px-1.5 text-xs">{jobOf(j)?.job_code}</span>{jobOf(j)?.job_name}<div className="text-xs text-slate-500">{fmtMinutes(j.estimated_minutes)}</div></td>
                <td className="px-4 py-2">{tyreLabel(j.tyre_id)}{(j.wait_for ?? []).some((w: string) => !['DONE', 'CLOSED'].includes(jobIds.find((x) => x.id === w)?.status ?? 'DONE')) && j.status === 'ASSIGNED' && <div className="text-xs text-slate-500">Locked until the earlier step is done</div>}</td><td className="px-4 py-2">{assignedTo(j.id)}</td><td className="px-4 py-2"><CardBadge status={j.status} /></td>
                <td className="px-4 py-2 text-slate-600">{j.done_at ? <>{who(j.done_by)}<div className="text-xs">{fmtDateTime(j.done_at)}{j.on_behalf_reason && ` · on behalf: ${j.on_behalf_reason}`}</div></> : '—'}</td>
                <td className="px-4 py-2"><div className="flex justify-end gap-2">
                  {mine(j) && j.status === 'ASSIGNED' && <button className={btnPlain} disabled={busy} onClick={() => void act(() => startJobId(j.id), 'Work started.')}>Start Work</button>}
                  {mine(j) && j.status === 'STARTED' && <button className={btnPrimary} disabled={busy} onClick={() => void act(() => completeJobId(j.id, null), 'Job ID completed.')}>Complete</button>}
                  {isTic && j.status === 'WAITING_FOR_TYRE' && <button className={btnPlain} onClick={() => { setDlgError(null); setDlg({ k: 'provide', job: j }); }}>Provide tyre</button>}
                  {isTic && !mine(j) && ['ASSIGNED', 'STARTED'].includes(j.status) && <button className={btnPlain} onClick={() => { setDlgError(null); setDlg({ k: 'behalf', job: j }); }}>Enter on behalf</button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {docs && <CardDocsView ctx={ctx} docs={docs} canReceive={isTic} onReceive={(g) => { setDlgError(null); setDlg({ k: 'gin', gin: g }); }} />}

      {detail && detail.finals.length > 0 && (
        <section className={`${cardCls} p-4`}><h2 className="mb-2 font-semibold text-slate-900">Final Inspection</h2>
          <ul className="space-y-1 text-sm">{detail.finals.map((f) => <li key={f.id}><strong className={f.result === 'PASS' ? 'text-green-700' : f.result === 'FAIL' ? 'text-red-700' : 'text-amber-700'}>{f.result === 'PASS' ? 'Pass' : f.result === 'FAIL' ? 'Fail' : 'Rework'}</strong> · {who(f.inspector_id)} · {fmtDateTime(f.inspected_at)}{f.remarks && ` · ${f.remarks}`}</li>)}</ul></section>
      )}
      {detail && (
        <section className={`${cardCls} p-4`}><h2 className="mb-2 font-semibold text-slate-900">Audit Trail</h2>
          <ol className="space-y-1 text-sm text-slate-700">{detail.events.map((e) => <li key={e.id}><span className="text-slate-500">{fmtDateTime(e.created_at)}</span> · {e.event.replace(/_/g, ' ').toLowerCase()} · {who(e.actor_id)}{e.job_id_ref && <span className="text-slate-500"> · {jobIds.find((j) => j.id === e.job_id_ref)?.job_id_no}</span>}{e.remarks && ` — ${e.remarks}`}</li>)}</ol></section>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {fleet && <><button className={btnPlain} onClick={() => setExtra('tyres')}>Fleet Tyre View</button><button className={btnPlain} onClick={() => setExtra('next')}>Next schedules</button></>}
        {canAssignInspection && <button className={btnPlain} onClick={() => { setDlgError(null); setDlg({ k: 'inspection' }); }}>Assign Inspection</button>}
        {canAssignWork && <button className={btnPlain} onClick={() => { setDlgError(null); setDlg({ k: 'work' }); }}>{card.status === 'ASSIGNED_FOR_WORK' ? 'Reassign Technician' : 'Assign Work'}</button>}
        {canFinal && <button className={btnPrimary} onClick={() => { setDlgError(null); setDlg({ k: 'final' }); }}>Final Inspection</button>}
      </div>

      {extra === 'tyres' && fleet && <FleetTyreView fleet={fleet} tyres={ctx.tyres} onClose={() => setExtra(null)} />}
      {extra === 'next' && fleet && <NextSchedules fleet={fleet} onClose={() => setExtra(null)} />}
      {dlg?.k === 'inspection' && <AssignInspectionDlg ctx={ctx} card={card} busy={busy} error={dlgError} onCancel={() => setDlg(null)}
        onSave={(v) => void act(() => assignInspection(card.id, v.inspector, v.due, v.shift, v.remarks), 'Inspection assigned.')} />}
      {dlg?.k === 'work' && <AssignWorkDlg ctx={ctx} card={card} jobs={assignable} busy={busy} error={dlgError} onCancel={() => setDlg(null)}
        onSave={(v) => void act(() => assignWork(card.id, v.employees, v.per, v.due, v.shift, v.remarks), 'Work assigned.')} />}
      {dlg?.k === 'inspect' && <InspectDlg ctx={ctx} card={card} ins={dlg.ins} complaints={complaints.filter((c) => c.inspection_id === dlg.ins.id && c.state === 'PENDING_INSPECTION')} busy={busy} error={dlgError} onCancel={() => setDlg(null)}
        onSave={(d, f, r) => void act(() => decideInspection(dlg.ins.id, d, f, r), 'Inspection saved.')} />}
      {dlg?.k === 'final' && <FinalDlg fim={fim} jobs={jobIds.filter((j) => j.status === 'DONE')} jobOf={jobOf} tyreLabel={tyreLabel} busy={busy} error={dlgError} onCancel={() => setDlg(null)}
        onSave={(r, remarks, jobs, cl) => void act(() => finalInspect(card.id, r, remarks, jobs, cl), r === 'PASS' ? 'Passed. The job card is completed.' : r === 'REWORK' ? 'Sent back for rework.' : 'Final inspection failed.')} />}
      {dlg?.k === 'behalf' && <ReasonDialog title={`Enter ${dlg.job.job_id_no} on behalf of the Tyre Man?`} label="Reason (required)" confirmLabel="Complete" required busy={busy} error={dlgError}
        onConfirm={(t) => void act(() => completeJobId(dlg.job.id, t), 'Job ID completed on behalf.')} onCancel={() => setDlg(null)} />}
      {dlg?.k === 'gin' && docs && <ReceiveGinDlg ctx={ctx} docs={docs} gin={dlg.gin} busy={busy} error={dlgError} onCancel={() => setDlg(null)}
        onSave={(r) => void act(() => receiveGin(dlg.gin.id, r), 'GRN created.')} />}
      {dlg?.k === 'provide' && <ProvideTyreDlg ctx={ctx} job={dlg.job} busy={busy} error={dlgError} onCancel={() => setDlg(null)}
        onSave={(t) => void act(() => provideTyre(dlg.job.id, t), 'Tyre provided. Assign the Fitment if the card is not assigned yet.')} />}
      {dlg?.k === 'close' && <ReasonDialog title="Close this complaint?" label="Remarks (optional)" confirmLabel="Close complaint" required={false} busy={busy} error={dlgError}
        onConfirm={(t) => void act(() => closeComplaint(dlg.c.id, t), 'Complaint closed.')} onCancel={() => setDlg(null)} />}
    </div>
  );
}

function Actions({ busy, disabled, onCancel, label }: { busy: boolean; disabled?: boolean; onCancel: () => void; label: string }) {
  return <div className="flex justify-end gap-2"><button type="button" className={btnPlain} onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy || disabled}>{busy ? 'Working…' : label}</button></div>;
}

function AssignInspectionDlg({ ctx, card, busy, error, onCancel, onSave }: { ctx: JobsCtx; card: Row; busy: boolean; error: string | null; onCancel: () => void;
  onSave: (v: { inspector: string; due: string | null; shift: string | null; remarks: string }) => void }) {
  const [v, setV] = useState({ inspector: '', due: card.expected_date as string, shift: '', remarks: '' });
  return (
    <Modal title="Assign inspection" onClose={onCancel}>
      {error && <Banner kind="error">{error}</Banner>}
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave({ inspector: v.inspector, due: v.due || null, shift: v.shift || null, remarks: v.remarks }); }}>
        <Field label="Inspector *" hint="The Tyre IC or a Tyre Man."><select className={inputCls} value={v.inspector} onChange={(e) => setV({ ...v, inspector: e.target.value })} required>
          <option value="">Select…</option>{ctx.staff.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.employee_code}) · {s.role_code === 'TIC' ? 'Tyre IC' : 'Tyre Man'}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date"><input type="date" className={inputCls} value={v.due} onChange={(e) => setV({ ...v, due: e.target.value })} /></Field>
          <Field label="Due shift"><select className={inputCls} value={v.shift} onChange={(e) => setV({ ...v, shift: e.target.value })}><option value="">—</option>{ctx.shifts.map((s) => <option key={s.id} value={s.id}>{s.shift_name}</option>)}</select></Field>
        </div>
        <Field label="Remarks"><textarea className={inputCls} rows={2} value={v.remarks} onChange={(e) => setV({ ...v, remarks: e.target.value })} /></Field>
        <Actions busy={busy} onCancel={onCancel} label="Assign inspection" />
      </form>
    </Modal>
  );
}

function AssignWorkDlg({ ctx, card, jobs, busy, error, onCancel, onSave }: { ctx: JobsCtx; card: Row; jobs: Row[]; busy: boolean; error: string | null; onCancel: () => void;
  onSave: (v: { employees: string[]; per: Record<string, string[]> | null; due: string | null; shift: string | null; remarks: string }) => void }) {
  const [emps, setEmps] = useState<string[]>([]);
  const [per, setPer] = useState<Record<string, string[]>>({});
  const [due, setDue] = useState<string>(card.expected_date);
  const [shift, setShift] = useState<string>(card.expected_shift_id ?? '');
  const [remarks, setRemarks] = useState('');
  const sel = (j: Row) => (per[j.id] ?? emps).filter((e) => emps.includes(e));
  const perPayload = emps.length > 1 ? Object.fromEntries(jobs.map((j) => [j.id, sel(j)])) : null;
  return (
    <Modal title={card.status === 'ASSIGNED_FOR_WORK' ? 'Reassign Technician' : 'Assign Work'} onClose={onCancel}>
      {error && <Banner kind="error">{error}</Banner>}
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave({ employees: emps, per: perPayload, due: due || null, shift: shift || null, remarks }); }}>
        <PostedHint jobCodes={[...new Set(jobs.map((j) => j.job_code_id as string))]} date={due} shift={shift || null} staff={ctx.staff} chosen={emps} use={setEmps} />
        <fieldset><legend className="mb-1 text-sm font-medium text-slate-700">Tyre Men * ({emps.length} chosen)</legend>
          <div className="grid grid-cols-1 gap-1 rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
            {ctx.staff.map((s) => <label key={s.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={emps.includes(s.id)} onChange={() => setEmps(toggle(emps, s.id))} /> {s.full_name} ({s.employee_code})</label>)}
          </div></fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date"><input type="date" className={inputCls} value={due} onChange={(e) => setDue(e.target.value)} /></Field>
          <Field label="Due shift"><select className={inputCls} value={shift} onChange={(e) => setShift(e.target.value)}><option value="">—</option>{ctx.shifts.map((s) => <option key={s.id} value={s.id}>{s.shift_name}</option>)}</select></Field>
        </div>
        {emps.length > 1 && (
          <fieldset><legend className="mb-1 text-sm font-medium text-slate-700">Job ID wise (at most 3 Tyre Men each)</legend>
            <div className="space-y-2 rounded-lg border border-slate-200 p-2">
              {jobs.map((j) => (
                <div key={j.id} className="text-sm"><div className="font-medium">{j.job_id_no} · {ctx.jobs.find((x) => x.id === j.job_code_id)?.job_code}</div>
                  <div className="flex flex-wrap gap-3">{emps.map((e) => <label key={e} className="flex items-center gap-1"><input type="checkbox" checked={sel(j).includes(e)} onChange={() => setPer({ ...per, [j.id]: toggle(sel(j), e) })} />{ctx.staff.find((s) => s.id === e)?.full_name}</label>)}</div></div>
              ))}
            </div></fieldset>
        )}
        <Field label="Remarks"><textarea className={inputCls} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        <Actions busy={busy} disabled={emps.length === 0} onCancel={onCancel} label="Assign" />
      </form>
    </Modal>
  );
}

export function InspectDlg({ ctx, card, ins, complaints, busy, error, onCancel, onSave }: { ctx: JobsCtx; card: Row; ins: Row; complaints: Row[]; busy: boolean; error: string | null; onCancel: () => void;
  onSave: (d: Decision[], f: FoundComplaint[], remarks: string) => void }) {
  type D = { approve: boolean | null; reason: string; codes: string[] };
  const [d, setD] = useState<Record<string, D>>(() => Object.fromEntries(complaints.map((c) => [c.id, { approve: null, reason: '', codes: (ctx.typeJobs[c.complaint_type_id] ?? []).filter((x) => ctx.jobs.find((j) => j.job_code === x && j.status === 'ACTIVE')) }])));
  const [found, setFound] = useState<{ tyre_id: string; type: string; remarks: string; codes: string[] }[]>([]);
  const [remarks, setRemarks] = useState('');
  const active = ctx.jobs.filter((j) => j.status === 'ACTIVE');
  const tyres = ctx.tyres.filter((t) => t.fleet_id === card.fleet_id && t.stock_place === 'FITTED').sort((a, b) => a.fitted_position.localeCompare(b.fitted_position));
  const ready = complaints.every((c) => d[c.id]?.approve !== null && (d[c.id].approve !== true || d[c.id].codes.length > 0));
  const set = (id: string, patch: Partial<D>) => setD({ ...d, [id]: { ...d[id], ...patch } });
  return (
    <Modal title={`Inspection ${ins.inspection_no}`} onClose={onCancel}>
      {error && <Banner kind="error">{error}</Banner>}
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(
        complaints.map((c) => ({ complaint_id: c.id, approve: !!d[c.id].approve, reason: d[c.id].reason, job_codes: d[c.id].approve ? d[c.id].codes : undefined })),
        found.map((x) => ({ tyre_id: x.tyre_id || null, complaint_type_id: x.type, remarks: x.remarks, job_codes: x.codes.length ? x.codes : undefined })), remarks); }}>
        <p className="text-sm text-slate-600">Approve or reject every complaint. A rejection needs a reason. Approved complaints become Job IDs.</p>
        {complaints.map((c) => {
          const t = ctx.complaintTypes.find((x) => x.id === c.complaint_type_id);
          return (
            <div key={c.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="font-medium">{c.complaint_no} · {t?.complaint_name}</div>
              <div className="text-xs text-slate-500">{ctx.tyres.find((y) => y.id === c.tyre_id)?.mtc_no ?? 'General'}{c.remarks && ` · ${c.remarks}`}</div>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-1"><input type="radio" name={c.id} checked={d[c.id].approve === true} onChange={() => set(c.id, { approve: true })} /> Approve</label>
                <label className="flex items-center gap-1"><input type="radio" name={c.id} checked={d[c.id].approve === false} onChange={() => set(c.id, { approve: false })} /> Reject</label>
              </div>
              {d[c.id].approve === false && <input className={`${inputCls} mt-2`} placeholder="Reason for rejecting (required)" value={d[c.id].reason} onChange={(e) => set(c.id, { reason: e.target.value })} />}
              {d[c.id].approve === true && (
                <div className="mt-2"><div className="text-xs text-slate-500">Job Codes {d[c.id].codes.length === 0 && <span className="text-red-700">(none suggested: choose at least one)</span>}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">{active.map((j) => <label key={j.id} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={d[c.id].codes.includes(j.job_code)} onChange={() => set(c.id, { codes: toggle(d[c.id].codes, j.job_code) })} />{j.job_code}</label>)}</div></div>
              )}
            </div>
          );
        })}
        <fieldset><legend className="mb-1 text-sm font-medium text-slate-700">New complaints found (approved at once)</legend>
          <div className="space-y-2">
            {found.map((x, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                <select className={inputCls} aria-label="Tyre" value={x.tyre_id} onChange={(e) => setFound(found.map((y, k) => (k === i ? { ...y, tyre_id: e.target.value } : y)))}><option value="">General</option>{tyres.map((t) => <option key={t.id} value={t.id}>{t.fitted_position} · {t.mtc_no}</option>)}</select>
                <select className={inputCls} aria-label="Complaint" value={x.type} onChange={(e) => setFound(found.map((y, k) => (k === i ? { ...y, type: e.target.value, codes: (ctx.typeJobs[e.target.value] ?? []).filter((c) => active.some((j) => j.job_code === c)) } : y)))}>
                  <option value="">Complaint…</option>{ctx.complaintTypes.filter((t) => t.status === 'ACTIVE').map((t) => <option key={t.id} value={t.id}>{t.complaint_code} · {t.complaint_name}</option>)}</select>
                <button type="button" className={btnPlain} aria-label="Remove" onClick={() => setFound(found.filter((_, k) => k !== i))}><Trash2 size={16} /></button>
                {x.type && x.codes.length === 0 && (
                  <div className="col-span-full flex flex-wrap gap-x-3 text-xs"><span className="text-red-700">Choose a Job Code:</span>{active.map((j) => <label key={j.id} className="flex items-center gap-1"><input type="checkbox" checked={x.codes.includes(j.job_code)} onChange={() => setFound(found.map((y, k) => (k === i ? { ...y, codes: toggle(y.codes, j.job_code) } : y)))} />{j.job_code}</label>)}</div>
                )}
              </div>
            ))}
            <button type="button" className={`${btnPlain} inline-flex items-center gap-1`} onClick={() => setFound([...found, { tyre_id: '', type: '', remarks: '', codes: [] }])}><Plus size={14} /> Add complaint</button>
          </div></fieldset>
        <Field label="Inspection remarks"><textarea className={inputCls} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        <Actions busy={busy} disabled={!ready} onCancel={onCancel} label="Save inspection" />
      </form>
    </Modal>
  );
}

function FinalDlg({ fim, jobs, jobOf, tyreLabel, busy, error, onCancel, onSave }: { fim: Row | null; jobs: Row[]; jobOf: (j: Row) => Row | undefined; tyreLabel: (t: string | null) => string; busy: boolean; error: string | null;
  onCancel: () => void; onSave: (r: 'PASS' | 'FAIL' | 'REWORK', remarks: string, jobs: string[], checklist: ChecklistAnswer[] | null) => void }) {
  const items: string[] = fim?.checklist_items ?? [];
  const [ans, setAns] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((i) => [i, true])));
  const [result, setResult] = useState<'PASS' | 'FAIL' | 'REWORK'>('PASS');
  const [remarks, setRemarks] = useState('');
  const [pick, setPick] = useState<string[]>([]);
  return (
    <Modal title="Final Inspection" onClose={onCancel}>
      {error && <Banner kind="error">{error}</Banner>}
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(result, remarks, result === 'REWORK' ? pick : [], items.length ? items.map((i) => ({ item: i, pass: ans[i] })) : null); }}>
        {fim && <fieldset><legend className="mb-1 text-sm font-medium text-slate-700">{fim.fim_code} {fim.title}</legend>
          <div className="space-y-1 rounded-lg border border-slate-200 p-2 text-sm">{items.map((i) => (
            <div key={i} className="flex items-center justify-between gap-2"><span>{i}</span><span className="flex gap-3">
              <label className="flex items-center gap-1"><input type="radio" name={`fim-${i}`} checked={ans[i]} onChange={() => setAns({ ...ans, [i]: true })} /> Pass</label>
              <label className="flex items-center gap-1"><input type="radio" name={`fim-${i}`} checked={!ans[i]} onChange={() => setAns({ ...ans, [i]: false })} /> Fail</label></span></div>))}</div></fieldset>}
        <div className="flex gap-4 text-sm" role="radiogroup" aria-label="Result">
          {([['PASS', 'Pass'], ['FAIL', 'Fail'], ['REWORK', 'Rework']] as const).map(([k, l]) => <label key={k} className="flex items-center gap-1.5"><input type="radio" name="result" checked={result === k} onChange={() => setResult(k)} /> {l}</label>)}
        </div>
        {result !== 'PASS' && <Field label="Remarks * (what is wrong)"><textarea className={inputCls} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} required /></Field>}
        {result === 'REWORK' && (
          <fieldset><legend className="mb-1 text-sm font-medium text-slate-700">Job IDs to redo * (a new Job ID is made for each)</legend>
            <div className="space-y-1 rounded-lg border border-slate-200 p-2 text-sm">{jobs.map((j) => <label key={j.id} className="flex items-center gap-1.5"><input type="checkbox" checked={pick.includes(j.id)} onChange={() => setPick(toggle(pick, j.id))} /> {j.job_id_no} · {jobOf(j)?.job_name} · {tyreLabel(j.tyre_id)}</label>)}</div></fieldset>
        )}
        <Actions busy={busy} disabled={result === 'REWORK' && pick.length === 0} onCancel={onCancel} label="Save" />
      </form>
    </Modal>
  );
}
