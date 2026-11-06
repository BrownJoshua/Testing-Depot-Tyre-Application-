import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadDuty, postDuty, SHIFT_SHORT, unpostDuty, type DutyCtx, type Row } from '../lib/duty';
import { addDaysIso } from '../lib/ops';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader } from '../components/ui';
import { Modal } from '../components/OpsBits';

const MONTHS = ['2026-09', '2026-10', '2026-11', '2026-12'];
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const daysOf = (m: string) => { const out: string[] = []; for (let d = `${m}-01`; d.startsWith(m); d = addDaysIso(d, 1)) out.push(d); return out; };
const dow = (iso: string) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;     // Monday = 0

/** Duty Posting (D1): the HRMS duty roster is read only; the Tyre IC posts employees to a Schedule Code or a Job Code for days. */
export function DutyPosting() {
  const [ctx, setCtx] = useState<DutyCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [month, setMonth] = useState('');
  const [tab, setTab] = useState<'roster' | 'posting'>('roster');
  const [target, setTarget] = useState<{ kind: 'S' | 'J'; id: string } | null>(null);
  const [posting, setPosting] = useState(false);

  const load = useCallback(() => { loadDuty().then((c) => { setCtx(c); setMonth((m) => m || (MONTHS.includes(c.today.slice(0, 7)) ? c.today.slice(0, 7) : MONTHS[0])); }).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);

  const days = useMemo(() => (month ? daysOf(month) : []), [month]);
  const rosterOf = useMemo(() => { const m = new Map<string, Row>(); ctx?.roster.forEach((r) => m.set(`${r.employee_id}|${r.duty_date}`, r)); return m; }, [ctx]);
  const shiftCode = (id: string | null) => ctx?.shifts.find((s) => s.id === id)?.shift_code ?? '';
  const cell = (emp: string, d: string) => { const r = rosterOf.get(`${emp}|${d}`); return !r ? '' : r.kind === 'WO' ? 'WO' : r.kind === 'L' ? 'L' : SHIFT_SHORT[shiftCode(r.shift_id)] ?? ''; };
  const men = (ctx?.staff ?? []).filter((s) => s.role_code === 'TM');
  const today = ctx?.today ?? '';
  const onToday = (ctx?.shifts ?? []).map((s) => ({ s, n: (ctx?.staff ?? []).filter((e) => rosterOf.get(`${e.id}|${today}`)?.shift_id === s.id).length })).filter((x) => x.n > 0);

  const targetPostings = (ctx?.postings ?? []).filter((p) => target && (target.kind === 'S' ? p.schedule_id === target.id : p.job_code_id === target.id));
  const covered = (d: string) => targetPostings.some((p) => p.duty_date === d && rosterOf.get(`${p.employee_id}|${d}`)?.kind === 'SHIFT');
  const nCovered = days.filter(covered).length;
  const targetName = target ? (target.kind === 'S' ? ctx?.schedules.find((s) => s.id === target.id)?.schedule_name : ctx?.jobs.find((j) => j.id === target.id)?.job_name) : '';

  return (
    <div>
      <PageHeader title="Duty Posting" subtitle="The duty roster comes from HRMS. Post employees to a Schedule Code or a Job Code for the days they are on duty." />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      {!ctx && !error && <p className="text-slate-500">Loading…</p>}
      {ctx && <>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2"><div className="text-xs uppercase tracking-wide text-slate-500">Tyre Man strength</div><div className="text-xl font-bold">{men.length}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2"><div className="text-xs uppercase tracking-wide text-slate-500">On duty {today}</div><div className="text-sm font-semibold">{onToday.map((x) => `${SHIFT_SHORT[x.s.shift_code]} ${x.n}`).join(' · ') || 'nobody'}</div></div>
          <select className={`${inputCls} ml-auto w-44`} aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>{MONTHS.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
        </div>
        <div className="mb-3 flex gap-2" role="tablist">
          {([['roster', 'Duty roster'], ['posting', 'Job posting']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-1.5 text-sm ${tab === k ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`}>{l}</button>
          ))}
        </div>

        {tab === 'roster' && (
          <div className={`${cardCls} overflow-x-auto`}>
            <table className="text-center text-xs">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="sticky left-0 bg-slate-50 px-3 py-2 text-left">Employee</th>{days.map((d) => <th key={d} className={`px-1.5 py-2 ${dow(d) >= 5 ? 'text-slate-400' : ''}`}>{Number(d.slice(8))}</th>)}</tr></thead>
              <tbody>
                {ctx.staff.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100">
                    <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-1.5 text-left"><span className="font-medium">{e.full_name}</span> <span className="text-slate-500">{e.employee_code}</span></td>
                    {days.map((d) => { const c = cell(e.id, d); return <td key={d} title={`${e.full_name} · ${e.employee_code} · ${d}`} className={`px-1 py-1.5 font-medium ${c === 'WO' ? 'text-slate-400' : c === 'L' ? 'text-amber-700' : 'text-slate-800'} ${d === today ? 'bg-blue-50' : ''}`}>{c}</td>; })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 py-2 text-xs text-slate-500">AM Morning · GEN General · PM Evening · NT Night · WO weekly off · L leave. The roster comes from HRMS and cannot be changed here.</p>
          </div>
        )}

        {tab === 'posting' && (
          <div className="grid gap-3 md:grid-cols-[18rem_1fr]">
            <div className={`${cardCls} max-h-[32rem] overflow-y-auto p-2 text-sm`}>
              <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Schedules</div>
              {ctx.schedules.filter((s) => s.status === 'ACTIVE').map((s) => <TargetBtn key={s.id} on={target?.id === s.id} label={`${s.schedule_code} · ${s.schedule_name}`} onClick={() => setTarget({ kind: 'S', id: s.id })} />)}
              <div className="px-2 py-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Job Codes</div>
              {ctx.jobs.filter((j) => j.status === 'ACTIVE').map((j) => <TargetBtn key={j.id} on={target?.id === j.id} label={`${j.job_code} · ${j.job_name}`} onClick={() => setTarget({ kind: 'J', id: j.id })} />)}
            </div>
            <div className={`${cardCls} p-4`}>
              {!target ? <p className="text-sm text-slate-500">Choose a Schedule or a Job Code on the left.</p> : <>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div><h2 className="font-semibold text-slate-900">{targetName}</h2><div className="text-sm text-slate-600">Covered {nCovered} of {days.length} days</div></div>
                  <button className={btnPrimary} onClick={() => setPosting(true)}>Post duty</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-1 font-semibold text-slate-500">{d}</div>)}
                  {Array.from({ length: dow(days[0] ?? '2026-09-01') }).map((_, i) => <div key={`b${i}`} />)}
                  {days.map((d) => {
                    const codes = [...new Set(targetPostings.filter((p) => p.duty_date === d).map((p) => cell(p.employee_id, d)).filter((c) => c && c !== 'WO' && c !== 'L'))];
                    const ok = covered(d);
                    return <div key={d} className={`min-h-12 rounded-lg border p-1 ${ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}><div className="text-slate-500">{Number(d.slice(8))}</div><div className="font-semibold text-slate-800">{codes.join(' ')}</div></div>;
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">Red: nobody posted is on duty that day. Each green day shows the shift of the people who are really on duty.</p>
              </>}
            </div>
          </div>
        )}
      </>}
      {posting && ctx && target && <PostDlg ctx={ctx} days={days} target={target} targetName={targetName ?? ''} cell={cell} covered={covered} postings={targetPostings} onClose={() => setPosting(false)} onDone={(m) => { setNotice(m); load(); }} />}
    </div>
  );
}

const TargetBtn = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
  <button onClick={onClick} className={`block w-full rounded-lg px-2 py-1.5 text-left ${on ? 'bg-blue-50 font-semibold text-blue-800' : 'hover:bg-slate-50'}`}>{label}</button>
);

function PostDlg({ ctx, days, target, targetName, cell, covered, postings, onClose, onDone }: {
  ctx: DutyCtx; days: string[]; target: { kind: 'S' | 'J'; id: string }; targetName: string; cell: (e: string, d: string) => string; covered: (d: string) => boolean; postings: Row[];
  onClose: () => void; onDone: (m: string) => void;
}) {
  const [sel, setSel] = useState<string[]>([]);
  const [shift, setShift] = useState('');
  const [emps, setEmps] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sc = target.kind === 'S' ? target.id : null, jc = target.kind === 'J' ? target.id : null;
  const toggle = (d: string) => setSel((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));
  const onDuty = (e: string, d: string) => { const c = cell(e, d); return c !== '' && c !== 'WO' && c !== 'L' && (!shift || ctx.shifts.find((s) => s.id === shift)?.shift_code && SHIFT_SHORT[ctx.shifts.find((s) => s.id === shift)!.shift_code] === c); };
  const already = ctx.staff.map((e) => ({ e, ds: sel.filter((d) => postings.some((p) => p.employee_id === e.id && p.duty_date === d)) })).filter((x) => x.ds.length);

  async function run(fn: () => Promise<number>, msg: (n: number) => string) {
    setBusy(true); setError(null);
    try { const n = await fn(); onDone(msg(n)); onClose(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Post duty · ${targetName}`} onClose={onClose}>
      {error && <Banner kind="error">{error}</Banner>}
      <div className="mb-2 flex flex-wrap gap-2 text-sm">
        <button className={btnPlain} onClick={() => setSel(days)}>All days</button>
        <button className={btnPlain} onClick={() => setSel(days.filter((d) => !covered(d)))}>Uncovered days</button>
        <button className={btnPlain} onClick={() => setSel([])}>Clear</button><span className="self-center text-slate-500">{sel.length} selected</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {Array.from({ length: dow(days[0]) }).map((_, i) => <div key={`b${i}`} />)}
        {days.map((d) => <button key={d} type="button" aria-pressed={sel.includes(d)} onClick={() => toggle(d)} className={`rounded-md border py-1.5 ${sel.includes(d) ? 'border-blue-600 bg-blue-600 font-semibold text-white' : covered(d) ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>{Number(d.slice(8))}</button>)}
      </div>
      <div className="mt-3 grid gap-3">
        <Field label="Shift (optional)"><select className={inputCls} value={shift} onChange={(e) => setShift(e.target.value)}><option value="">Any shift (the employee&apos;s own roster)</option>{ctx.shifts.map((s) => <option key={s.id} value={s.id}>{s.shift_name}</option>)}</select></Field>
        <fieldset><legend className="mb-1 text-sm font-medium text-slate-700">Employees</legend>
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {ctx.staff.map((e) => <label key={e.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={emps.includes(e.id)} onChange={() => setEmps(emps.includes(e.id) ? emps.filter((x) => x !== e.id) : [...emps, e.id])} />
              {e.full_name} ({e.employee_code}) <span className="ml-auto text-xs text-slate-500">on duty {sel.filter((d) => onDuty(e.id, d)).length} of {sel.length}</span></label>)}
          </div></fieldset>
        {already.length > 0 && <div className="rounded-lg bg-slate-50 p-2 text-sm"><div className="mb-1 font-medium">Already posted on the selected days</div>
          {already.map((x) => <div key={x.e.id} className="flex items-center justify-between"><span>{x.e.full_name} · {x.ds.length} day{x.ds.length === 1 ? '' : 's'}</span>
            <button className={btnPlain} disabled={busy} onClick={() => void run(() => unpostDuty([x.e.id], sc, jc, x.ds), (n) => `Removed ${n} posting${n === 1 ? '' : 's'}.`)}>Remove from the selected days</button></div>)}</div>}
      </div>
      <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={onClose} disabled={busy}>Cancel</button>
        <button className={btnPrimary} disabled={busy || sel.length === 0 || emps.length === 0} onClick={() => void run(() => postDuty(emps, sc, jc, sel, shift || null), (n) => `Posted ${n} duty day${n === 1 ? '' : 's'}.`)}>Post duty</button></div>
    </Modal>
  );
}
