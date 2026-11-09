import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { addDaysIso } from '../lib/ops';
import { assignTechnician, createRun, frequencyText, loadChart, loadPlanner, moveItem, replaceTechnician, STATE_LABEL, STATE_STYLE, type PlannerCtx, type Row } from '../lib/schedules';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader } from '../components/ui';
import { Modal } from '../components/OpsBits';
import { PostedHint } from '../components/PostedHint';
import { assignFromDuty } from '../lib/notify';
import { ScheduledWork } from '../components/ScheduledWork';
import { ReplaceDlg, ScheduleCards } from '../components/ScheduleCards';

const PAGE = 10;
const StateBadge = ({ s }: { s: string }) => <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE_STYLE[s]}`}>{STATE_LABEL[s]}</span>;
const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

/** Schedule Planner: Schedule Setup (HO schedules, Create Schedule ID) and Schedule Chart (one card per Schedule ID, Assign Technician). */
export function SchedulePlanner() {
  const { me } = useAuth();
  const isTic = me?.role_code === 'TIC';
  const base = me?.role_code === 'SUP' ? '/sup' : '/tic';
  const [ctx, setCtx] = useState<PlannerCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [creating, setCreating] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [moving, setMoving] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [dlgError, setDlgError] = useState<string | null>(null);
  const [c, setC] = useState({ from: '', to: '', group: '' });
  const [a, setA] = useState({ emps: [] as string[], due: '', shift: '', remarks: '' });

  const load = useCallback(() => { loadPlanner().then(setCtx).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);
  const loadRows = useCallback((id: string) => { loadChart(id).then(setRows).catch((e: Error) => setError(e.message)); }, []);
  useEffect(() => { if (open) { setRows([]); setPicked([]); setFilter(''); setPage(0); loadRows(open); } }, [open, loadRows]);

  const sched = (id: string) => ctx?.schedules.find((s) => s.id === id);
  const jobName = (s: Row | undefined) => ctx?.jobs.find((j) => j.id === s?.job_id)?.job_code ?? '—';
  const run = ctx?.runs.find((r) => r.id === open);
  const tyreLevel = rows.some((r) => r.tyre_id);
  const shown = useMemo(() => rows.filter((r) => !filter || r.state === filter), [rows, filter]);
  const counts = useMemo(() => { const m: Record<string, number> = {}; for (const r of rows) m[r.state] = (m[r.state] ?? 0) + 1; return m; }, [rows]);
  const selectable = shown.filter((r) => !r.job_card_id && !r.done_date);
  const pickedNew = picked.filter((id) => !rows.find((x) => x.id === id)?.job_card_id);
  const pickedAssigned = picked.filter((id) => !!rows.find((x) => x.id === id)?.job_card_id);
  const pageRows = shown.slice(page * PAGE, page * PAGE + PAGE);

  async function act(fn: () => Promise<unknown>, ok: string, done: () => void) {
    setBusy(true); setDlgError(null); setNotice(null);
    try { await fn(); setNotice(ok); done(); load(); if (open) loadRows(open); } catch (e) { setDlgError((e as Error).message); } finally { setBusy(false); }
  }
  function openCreate(scheduleId: string) { setDlgError(null); setC({ from: addDaysIso(ctx!.today, -3), to: addDaysIso(ctx!.today, 27), group: '' }); setCreating(scheduleId); }
  const groupFleets = (gid: string) => { const g = ctx?.groups.find((x) => x.id === gid); return (ctx?.members ?? []).filter((m) => m.revision_id === g?.current_revision_id).map((m) => m.fleet_id as string); };

  return (
    <div className="space-y-5">
      <PageHeader title="Schedule Planner" subtitle={isTic ? 'Create a Schedule ID for a schedule and a period, then assign technicians from its chart. Job cards are created for you.' : 'Schedule IDs and their chart (monitor).'} />
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}
      {!ctx && !error && <p className="text-slate-500">Loading…</p>}

      {ctx && <ScheduledWork key={ctx.runs.length} today={ctx.today} />}
      {ctx && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Schedule Setup</h2>
          <div className={`${cardCls} overflow-x-auto`}>
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">Schedule Code</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Job Code</th><th className="px-4 py-2">Frequency</th><th className="px-4 py-2">Effective from</th><th className="px-4 py-2">Status</th>{isTic && <th className="px-4 py-2 text-right">Action</th>}</tr></thead>
              <tbody>
                {ctx.schedules.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium">{s.schedule_code}</td><td className="px-4 py-2">{s.schedule_name}</td><td className="px-4 py-2">{jobName(s)}</td>
                    <td className="px-4 py-2">{frequencyText(s)}</td><td className="px-4 py-2">{s.effective_from}</td>
                    <td className="px-4 py-2">{s.status === 'ACTIVE' ? 'Active' : 'Inactive'}</td>
                    {isTic && <td className="px-4 py-2 text-right"><button className={btnPlain} disabled={s.status !== 'ACTIVE'} onClick={() => openCreate(s.id)}>Create Schedule ID</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {ctx && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Schedule Chart</h2>
          {ctx.runs.length === 0 && <Banner kind="info">No Schedule ID yet.{isTic && ' Press “Create Schedule ID” on a schedule above.'}</Banner>}
          {ctx.runs.length > 0 && <div className="mb-4"><ScheduleCards runs={ctx.runs} schedules={ctx.schedules} today={ctx.today} fleetCount={ctx.fleets.filter((f) => f.status === 'ACTIVE').length} isTic={isTic} openId={open} onOpen={(id) => { setOpen(id); setTimeout(() => document.getElementById('run-detail')?.scrollIntoView({ behavior: 'smooth' }), 300); }} /></div>}
          <div className="space-y-3" id="run-detail">
            {ctx.runs.filter((r) => r.id === open).map((r) => (
              <div key={r.id} className={`${cardCls} p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><div className="font-semibold text-slate-900">{r.schedule_no} <span className="font-normal text-slate-500">· {sched(r.schedule_id)?.schedule_code} {sched(r.schedule_id)?.schedule_name}</span></div>
                    <div className="text-xs text-slate-500">{r.from_date} to {r.to_date}</div></div>
                  <button className={btnPlain} onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Hide full list' : 'See full list'}</button>
                </div>
                {open === r.id && (
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <button className={`rounded-full border px-3 py-1 ${!filter ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`} onClick={() => { setFilter(''); setPage(0); }}>All ({rows.length})</button>
                      {Object.keys(STATE_LABEL).map((s) => <button key={s} className={`rounded-full border px-3 py-1 ${filter === s ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`} onClick={() => { setFilter(s); setPage(0); }}>{STATE_LABEL[s]} ({counts[s] ?? 0})</button>)}
                      {isTic && <>
                        <button className={btnPlain} onClick={() => setPicked(picked.length === selectable.length ? [] : selectable.map((x) => x.id))}>{picked.length > 0 && picked.length === selectable.length ? 'Clear selection' : 'Select all without a job card'}</button>
                        <button className={btnPrimary} disabled={pickedNew.length === 0} onClick={() => { setDlgError(null); setA({ emps: [], due: '', shift: '', remarks: '' }); setAssigning(true); }}>Assign Technician ({pickedNew.length})</button>
                        <button className={btnPlain} disabled={pickedAssigned.length === 0} onClick={() => { setDlgError(null); setReplacing(true); }}>Replace selected ({pickedAssigned.length})</button></>}
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{isTic && <th className="w-8 px-3 py-2" />}<th className="px-3 py-2">Fleet Number</th>{tyreLevel && <><th className="px-3 py-2">Position</th><th className="px-3 py-2">Tyre No</th><th className="px-3 py-2">Last {sched(r.schedule_id)?.work_category === 'TYRE_DISCOUT' ? 'Discout' : 'Rotation'}</th></>}<th className="px-3 py-2">Due Date</th><th className="px-3 py-2">Done Date</th><th className="px-3 py-2">Job card</th><th className="px-3 py-2">Status</th>{isTic && <th className="px-3 py-2 text-right">Action</th>}</tr></thead>
                        <tbody>
                          {pageRows.length === 0 && <tr><td colSpan={9} className="px-3 py-4 text-center text-slate-500">{rows.length === 0 ? 'Loading…' : 'Nothing here.'}</td></tr>}
                          {pageRows.map((x) => (
                            <tr key={x.id} className="border-t border-slate-100">
                              {isTic && <td className="px-3 py-2">{!x.done_date && <input type="checkbox" aria-label={`Select ${x.fleet_no} ${x.due_date}`} checked={picked.includes(x.id)} onChange={() => setPicked(toggle(picked, x.id))} />}</td>}
                              <td className="px-3 py-2 font-medium">{x.fleet_no}</td>
                              {tyreLevel && <><td className="px-3 py-2">{x.position}</td><td className="px-3 py-2">{x.tyre_no}</td><td className="px-3 py-2">{(sched(r.schedule_id)?.work_category === 'TYRE_DISCOUT' ? x.last_discout_date : x.last_rotation_date) ?? '—'}</td></>}
                              <td className="px-3 py-2">{x.due_date}</td><td className="px-3 py-2">{x.done_date ?? '—'}</td>
                              <td className="px-3 py-2">{x.job_card_id ? <Link className="text-blue-700 underline" to={`${base}/job-cards/${x.job_card_id}`}>{x.job_card_no}</Link> : '—'}</td>
                              <td className="px-3 py-2"><StateBadge s={x.state} /></td>
                              {isTic && <td className="px-3 py-2 text-right">{!x.done_date && <button className={btnPlain} onClick={() => { setDlgError(null); setMoving(x); }}>Prepone / Postpone</button>}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-600"><span>{shown.length} row{shown.length === 1 ? '' : 's'}{rows.length >= 1000 && ' (first 1000 shown)'}</span>
                      <div className="flex gap-2"><button className={btnPlain} disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><button className={btnPlain} disabled={(page + 1) * PAGE >= shown.length} onClick={() => setPage(page + 1)}>Next</button></div></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {creating && ctx && (
        <Modal title="Create Schedule ID" onClose={() => setCreating(null)}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void act(() => createRun(creating, c.from, c.to, c.group ? groupFleets(c.group) : null), 'Schedule ID created.', () => setCreating(null)); }}>
            <Field label="Schedule Code"><input className={inputCls} disabled value={`${sched(creating)?.schedule_code} · ${sched(creating)?.schedule_name} (${frequencyText(sched(creating)!)})`} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From *"><input type="date" className={inputCls} value={c.from} onChange={(e) => setC({ ...c, from: e.target.value })} required /></Field>
              <Field label="To *"><input type="date" className={inputCls} value={c.to} onChange={(e) => setC({ ...c, to: e.target.value })} required /></Field>
            </div>
            <Field label="Fleets" hint="All fleets of your depot, or only the fleets of an approved group of this schedule.">
              <select className={inputCls} value={c.group} onChange={(e) => setC({ ...c, group: e.target.value })}>
                <option value="">All fleets</option>
                {ctx.groups.filter((g) => g.schedule_id === creating && g.current_revision_id).map((g) => <option key={g.id} value={g.id}>Group {g.group_name} ({groupFleets(g.id).length} fleets)</option>)}
              </select></Field>
            <div className="flex justify-end gap-2"><button type="button" className={btnPlain} onClick={() => setCreating(null)} disabled={busy}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>{busy ? 'Working…' : 'Create Schedule ID'}</button></div>
          </form>
        </Modal>
      )}
      {assigning && ctx && run && (
        <Modal title={`Assign Technician · ${run.schedule_no}`} onClose={() => setAssigning(false)}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void act(() => assignTechnician(run.id, pickedNew, a.emps, a.due || null, a.shift || null, a.remarks), 'Job cards created and assigned.', () => { setAssigning(false); setPicked([]); }); }}>
            <p className="text-sm text-slate-600">One job card is created for each fleet of the {picked.length} selected row{picked.length === 1 ? '' : 's'} and assigned at once. The fleets are shared among the chosen people in turn.</p>
            <PostedHint schedule={run.schedule_id} date={a.due || ((m: string) => (m && m > ctx.today ? m : ctx.today))(picked.map((p) => rows.find((c) => c.id === p)?.due_date as string).filter(Boolean).sort()[0] ?? '')} shift={a.shift || null} staff={ctx.staff} chosen={a.emps} use={(ids) => setA({ ...a, emps: ids })} />
            <fieldset><legend className="mb-1 text-sm font-medium text-slate-700">Tyre Men * ({a.emps.length} chosen)</legend>
              <div className="grid grid-cols-1 gap-1 rounded-lg border border-slate-200 p-2 sm:grid-cols-2">{ctx.staff.map((s) => <label key={s.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={a.emps.includes(s.id)} onChange={() => setA({ ...a, emps: toggle(a.emps, s.id) })} /> {s.full_name} ({s.employee_code})</label>)}</div></fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Due date" hint="Empty = the row's due date (or today)."><input type="date" className={inputCls} value={a.due} onChange={(e) => setA({ ...a, due: e.target.value })} /></Field>
              <Field label="Shift"><select className={inputCls} value={a.shift} onChange={(e) => setA({ ...a, shift: e.target.value })}><option value="">—</option>{ctx.shifts.map((s) => <option key={s.id} value={s.id}>{s.shift_name}</option>)}</select></Field>
            </div>
            <Field label="Remarks"><textarea className={inputCls} rows={2} value={a.remarks} onChange={(e) => setA({ ...a, remarks: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><button type="button" className={btnPlain} onClick={() => setAssigning(false)} disabled={busy}>Cancel</button><button type="button" className={btnPlain} disabled={busy} onClick={() => void act(() => assignFromDuty(run.id, pickedNew, a.due || null, a.shift || null, a.remarks), 'Job cards created and assigned from Duty Posting.', () => { setAssigning(false); setPicked([]); })}>Assign from Duty Posting</button><button type="submit" className={btnPrimary} disabled={busy || a.emps.length === 0}>{busy ? 'Working…' : 'Assign'}</button></div>
          </form>
        </Modal>
      )}
      {replacing && ctx && <ReplaceDlg staff={ctx.staff} count={pickedAssigned.length} onCancel={() => setReplacing(false)} onDone={async (emps) => { await replaceTechnician(pickedAssigned, emps); setNotice('Technician replaced.'); setReplacing(false); setPicked([]); load(); if (open) loadRows(open); }} />}
      {moving && (
        <Modal title={`Prepone / Postpone · ${moving.fleet_no}${moving.tyre_no ? ` · ${moving.tyre_no}` : ''}`} onClose={() => setMoving(null)}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <MoveForm item={moving} busy={busy} onCancel={() => setMoving(null)} onSave={(d, reason) => void act(() => moveItem(moving.id, d, reason), 'Due date changed.', () => setMoving(null))} />
        </Modal>
      )}
    </div>
  );
}

function MoveForm({ item, busy, onCancel, onSave }: { item: Row; busy: boolean; onCancel: () => void; onSave: (date: string, reason: string) => void }) {
  const [d, setD] = useState(item.due_date as string);
  const [reason, setReason] = useState('');
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(d, reason); }}>
      <Field label="New due date *"><input type="date" className={inputCls} value={d} onChange={(e) => setD(e.target.value)} required /></Field>
      <Field label="Reason *"><textarea className={inputCls} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required /></Field>
      <div className="flex justify-end gap-2"><button type="button" className={btnPlain} onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>{busy ? 'Working…' : 'Save'}</button></div>
    </form>
  );
}
