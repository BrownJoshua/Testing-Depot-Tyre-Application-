import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { createCard, daysBetween, JC_STATUS_LABEL, loadJobs, ONGOING, TYPE_LABEL, type JobsCtx, type NewCard, type Row } from '../lib/jobs';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader } from '../components/ui';
import { CardBadge, Modal } from '../components/OpsBits';
import { TyreChangeForm } from '../components/TyreChangeForm';

type Tile = '' | 'ONGOING' | 'OVERDUE' | 'COMPLETED';
const CLOSED = ['COMPLETED', 'CLOSED'];

/** Job Card Register. The Tyre IC creates and manages cards; the Supervisor monitors (same view, no actions). */
export function JobCards() {
  const { me } = useAuth();
  const base = me?.role_code === 'SUP' ? '/sup' : '/tic';
  const canCreate = me?.role_code === 'TIC';
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const fromComplaint = params.get('complaint');
  const [ctx, setCtx] = useState<JobsCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tile, setTile] = useState<Tile>('');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [tyreChange, setTyreChange] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const blank: NewCard = { type: 'COMPLAINT', fleet: null, tyres: [], jobCodes: [], complaints: [], newComplaints: [], expected: null, shift: null, instruction: '' };
  const [f, setF] = useState<NewCard>(blank);

  const load = useCallback(() => { loadJobs().then(setCtx).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);
  useEffect(() => {
    if (!ctx || !fromComplaint) return;
    const c = ctx.complaints.find((x) => x.id === fromComplaint);
    if (c && c.state === 'NEW') { setF({ ...blank, type: 'COMPLAINT', fleet: c.fleet_id, complaints: [c.id] }); setCreating(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, fromComplaint]);

  const fleet = (id: string | null) => ctx?.fleets.find((x) => x.id === id);
  const techs = (cardId: string) => {
    const ids = new Set(ctx?.jobIds.filter((j) => j.job_card_id === cardId).map((j) => j.id));
    const emp = new Set(ctx?.assignees.filter((a) => ids.has(a.job_id_ref)).map((a) => a.employee_id));
    return [...emp].map((e) => ctx?.staff.find((s) => s.id === e)?.full_name ?? '').filter(Boolean);
  };
  const overdueDays = (c: Row) => (ctx && !CLOSED.includes(c.status) ? Math.max(0, daysBetween(c.expected_date, ctx.today)) : 0);
  const cards = ctx?.cards ?? [];
  const counts = { all: cards.length, ongoing: cards.filter((c) => ONGOING.includes(c.status)).length, overdue: cards.filter((c) => overdueDays(c) > 0).length, done: cards.filter((c) => CLOSED.includes(c.status)).length };

  const rows = useMemo(() => {
    if (!ctx) return [];
    const t = q.trim().toLowerCase();
    return ctx.cards.filter((c) => {
      if (tile === 'ONGOING' && !ONGOING.includes(c.status)) return false;
      if (tile === 'OVERDUE' && !(!CLOSED.includes(c.status) && daysBetween(c.expected_date, ctx.today) > 0)) return false;
      if (tile === 'COMPLETED' && !CLOSED.includes(c.status)) return false;
      if (!t) return true;
      const fl = fleet(c.fleet_id);
      const jobs = ctx.jobIds.filter((j) => j.job_card_id === c.id);
      const hay = [c.job_card_no, fl?.fleet_no, fl?.registration_no, JC_STATUS_LABEL[c.status], ...jobs.map((j) => j.job_id_no), ...jobs.map((j) => ctx.tyres.find((y) => y.id === j.tyre_id)?.mtc_no),
        ...ctx.complaints.filter((x) => x.job_card_id === c.id).map((x) => x.complaint_no), ...techs(c.id)].join(' ').toLowerCase();
      return hay.includes(t);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, tile, q]);

  const fleetTyres = (ctx?.tyres ?? []).filter((t) => f.fleet && t.fleet_id === f.fleet && t.stock_place === 'FITTED').sort((a, b) => a.fitted_position.localeCompare(b.fitted_position));
  const newOnes = (ctx?.complaints ?? []).filter((c) => c.state === 'NEW' && c.fleet_id === f.fleet);
  // Removal / Setting / Fitment / Unsetting are made by the Tyre Changing panel, never as loose job codes
  const activeJobs = (ctx?.jobs ?? []).filter((j) => j.status === 'ACTIVE' && !['JOB-008', 'JOB-009', 'JOB-010', 'JOB-011'].includes(j.job_code));

  async function create() {
    setBusy(true); setDialogError(null);
    try { const id = await createCard(f); nav(`${base}/job-cards/${id}`); } catch (e) { setDialogError((e as Error).message); } finally { setBusy(false); }
  }
  function closeForm() { setCreating(false); if (fromComplaint) setParams({}); }
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const tileBtn = (key: Tile, label: string, n: number) => (
    <button onClick={() => setTile(key)} className={`rounded-xl border px-4 py-2 text-left ${tile === key ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className="text-xl font-bold text-slate-900">{n}</div>
    </button>
  );

  return (
    <div>
      <PageHeader title="Job Card Register" subtitle={canCreate ? 'Create job cards, assign inspection and work, and verify finished work.' : 'Monitor the job cards of your depot.'}
        action={canCreate && <button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => { setF(blank); setTyreChange(false); setDialogError(null); setCreating(true); }}><Plus size={16} /> New job card</button>} />
      {error && <Banner kind="error">{error}</Banner>}
      <div className="mb-3 flex flex-wrap gap-3">{tileBtn('', 'All', counts.all)}{tileBtn('ONGOING', 'Ongoing', counts.ongoing)}{tileBtn('OVERDUE', 'Overdue', counts.overdue)}{tileBtn('COMPLETED', 'Completed', counts.done)}</div>
      <div className="relative mb-3 max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className={`${inputCls} pl-9`} placeholder="Job card, fleet, register no, tyre no, Job ID, complaint, employee, status" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2">Job Card Number</th><th className="px-4 py-2">Fleet Number</th><th className="px-4 py-2">Work Category</th><th className="px-4 py-2">Assigned Technicians</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Action</th></tr>
          </thead>
          <tbody>
            {!ctx && !error && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {ctx && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No job cards here.</td></tr>}
            {rows.map((c) => {
              const jobs = ctx!.jobIds.filter((j) => j.job_card_id === c.id);
              const codes = [...new Set(jobs.map((j) => ctx!.jobs.find((x) => x.id === j.job_code_id)?.job_name))].filter(Boolean);
              const od = overdueDays(c);
              return (
                <tr key={c.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-2 font-medium"><Link className="text-blue-700 underline" to={`${base}/job-cards/${c.id}`}>{c.job_card_no}</Link><div className="text-xs font-normal text-slate-500">{TYPE_LABEL[c.job_type]}</div></td>
                  <td className="px-4 py-2">{fleet(c.fleet_id)?.fleet_no ?? 'No fleet'}<div className="text-xs text-slate-500">{fleet(c.fleet_id)?.registration_no}</div></td>
                  <td className="px-4 py-2">{codes.length ? codes.join(', ') : c.job_type === 'COMPLAINT' ? 'Complaint (awaiting inspection)' : '—'}<div className="text-xs text-slate-500">{jobs.length} Job ID{jobs.length === 1 ? '' : 's'}</div></td>
                  <td className="px-4 py-2 text-slate-700">{techs(c.id).join(', ') || '—'}</td>
                  <td className="px-4 py-2"><CardBadge status={c.status} /><div className="mt-1 text-xs text-slate-500">Due {c.expected_date}{od > 0 && <span className="font-semibold text-red-700"> · Overdue {od}d</span>}</div></td>
                  <td className="px-4 py-2 text-right"><Link className={btnPlain} to={`${base}/job-cards/${c.id}`}>View</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {creating && ctx && (
        <Modal title={fromComplaint ? 'Create job card from complaint' : 'New job card'} onClose={closeForm}>
          {dialogError && <Banner kind="error">{dialogError}</Banner>}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Job type">
              {(['COMPLAINT', 'JOB_CODE'] as const).map((t) => (
                <button type="button" key={t} disabled={!!fromComplaint} onClick={() => { setTyreChange(false); setF({ ...blank, type: t, fleet: f.fleet }); }}
                  className={`rounded-full border px-3 py-1 text-sm ${!tyreChange && f.type === t ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`}>{TYPE_LABEL[t]}</button>
              ))}
              <button type="button" disabled={!!fromComplaint} onClick={() => setTyreChange(true)}
                className={`rounded-full border px-3 py-1 text-sm ${tyreChange ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`}>Tyre Changing</button>
              <span className="self-center text-xs text-slate-500">Schedule cards come from a Schedule ID.</span>
            </div>
            {tyreChange && <TyreChangeForm ctx={ctx} onCancel={closeForm} onDone={(id) => nav(`${base}/job-cards/${id}`)} />}
            {!tyreChange && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void create(); }}>
            <Field label="Fleet *">
              <select className={inputCls} value={f.fleet ?? ''} disabled={!!fromComplaint} onChange={(e) => setF({ ...f, fleet: e.target.value || null, tyres: [], complaints: [], newComplaints: [] })} required={f.type === 'COMPLAINT'}>
                <option value="">{f.type === 'JOB_CODE' ? 'No fleet (live stock)' : 'Select…'}</option>
                {ctx.fleets.filter((x) => x.status === 'ACTIVE').map((x) => <option key={x.id} value={x.id}>{x.fleet_no} — {x.registration_no}</option>)}
              </select>
            </Field>

            {f.type === 'JOB_CODE' && <>
              <fieldset><legend className="mb-1 text-sm font-medium text-slate-700">Job Code *</legend>
                <div className="grid max-h-36 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
                  {activeJobs.map((j) => <label key={j.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={f.jobCodes.includes(j.job_code)} onChange={() => setF({ ...f, jobCodes: toggle(f.jobCodes, j.job_code) })} /> {j.job_code} · {j.job_name}</label>)}
                </div></fieldset>
              <fieldset><legend className="mb-1 text-sm font-medium text-slate-700">Tyres * ({f.tyres.length} chosen)</legend>
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 p-2 sm:grid-cols-3">
                  {!f.fleet && <span className="col-span-full text-xs text-slate-500">Choose a fleet to pick its fitted tyres.</span>}
                  {fleetTyres.map((t) => <label key={t.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={f.tyres.includes(t.id)} onChange={() => setF({ ...f, tyres: toggle(f.tyres, t.id) })} /> {t.fitted_position} · {t.mtc_no}</label>)}
                </div></fieldset>
            </>}

            {f.type === 'COMPLAINT' && f.fleet && <>
              <fieldset><legend className="mb-1 text-sm font-medium text-slate-700">Complaints of this fleet waiting for a job card</legend>
                <div className="space-y-1 rounded-lg border border-slate-200 p-2">
                  {newOnes.length === 0 && <span className="text-xs text-slate-500">None. Add a complaint below.</span>}
                  {newOnes.map((c) => (
                    <label key={c.id} className="flex items-start gap-1.5 text-sm"><input type="checkbox" className="mt-1" checked={f.complaints.includes(c.id)} onChange={() => setF({ ...f, complaints: toggle(f.complaints, c.id) })} />
                      <span>{c.complaint_no} · {ctx.complaintTypes.find((t) => t.id === c.complaint_type_id)?.complaint_name}</span></label>
                  ))}
                </div></fieldset>
              <fieldset><legend className="mb-1 text-sm font-medium text-slate-700">Add complaints</legend>
                <div className="space-y-2">
                  {f.newComplaints.map((n, i) => (
                    <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                      <select className={inputCls} value={n.tyre_id ?? ''} aria-label="Tyre" onChange={(e) => setF({ ...f, newComplaints: f.newComplaints.map((x, k) => (k === i ? { ...x, tyre_id: e.target.value || null } : x)) })}>
                        <option value="">General</option>{fleetTyres.map((t) => <option key={t.id} value={t.id}>{t.fitted_position} · {t.mtc_no}</option>)}
                      </select>
                      <select className={inputCls} value={n.complaint_type_id} aria-label="Complaint" onChange={(e) => setF({ ...f, newComplaints: f.newComplaints.map((x, k) => (k === i ? { ...x, complaint_type_id: e.target.value } : x)) })}>
                        <option value="">Complaint…</option>{ctx.complaintTypes.filter((t) => t.status === 'ACTIVE').map((t) => <option key={t.id} value={t.id}>{t.complaint_code} · {t.complaint_name}</option>)}
                      </select>
                      <button type="button" className={btnPlain} aria-label="Remove complaint" onClick={() => setF({ ...f, newComplaints: f.newComplaints.filter((_, k) => k !== i) })}><Trash2 size={16} /></button>
                    </div>
                  ))}
                  <button type="button" className={btnPlain} onClick={() => setF({ ...f, newComplaints: [...f.newComplaints, { tyre_id: null, complaint_type_id: '', remarks: '' }] })}>+ Add complaint</button>
                </div></fieldset>
            </>}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Expected completion date"><input className={inputCls} type="date" value={f.expected ?? ''} onChange={(e) => setF({ ...f, expected: e.target.value || null })} /></Field>
              <Field label="Shift"><select className={inputCls} value={f.shift ?? ''} onChange={(e) => setF({ ...f, shift: e.target.value || null })}><option value="">—</option>{ctx.shifts.map((s) => <option key={s.id} value={s.id}>{s.shift_name}</option>)}</select></Field>
            </div>
            <Field label="Instruction"><textarea className={inputCls} rows={2} value={f.instruction} onChange={(e) => setF({ ...f, instruction: e.target.value })} /></Field>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnPlain} onClick={closeForm} disabled={busy}>Cancel</button>
              <button type="submit" className={btnPrimary} disabled={busy}>{busy ? 'Working…' : 'Create (Draft)'}</button>
            </div>
          </form>}
          </div>
        </Modal>
      )}
    </div>
  );
}
