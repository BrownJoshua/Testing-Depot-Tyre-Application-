import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { CARD_CATEGORIES, CARD_STATUS_LABEL, createJobCard, loadOps, WORK_CATEGORY_LABEL, type OpsCtx } from '../lib/ops';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader } from '../components/ui';
import { CardBadge, Modal } from '../components/OpsBits';

/** Job Card Register. The Tyre IC creates and manages cards; the Supervisor only monitors (UQ-06 default). */
export function JobCards() {
  const { me } = useAuth();
  const base = me?.role_code === 'SUP' ? '/sup' : '/tic';
  const canCreate = me?.role_code === 'TIC';
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const fromComplaint = params.get('complaint');
  const [ctx, setCtx] = useState<OpsCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [f, setF] = useState({ fleet: '', category: 'INSPECTION', position: '', due: '', instruction: '' });

  const load = useCallback(() => { loadOps().then(setCtx).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);

  // arriving from a complaint opens the form with that complaint's fleet and position filled in
  useEffect(() => {
    if (!ctx || !fromComplaint) return;
    const c = ctx.complaints.find((x) => x.id === fromComplaint);
    if (c && c.status === 'NEW') { setF((p) => ({ ...p, fleet: c.fleet_id, position: c.position ?? '' })); setCreating(true); }
  }, [ctx, fromComplaint]);

  const fleet = (id: string) => ctx?.fleets.find((x) => x.id === id);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (ctx?.cards ?? []).filter((c) => (!status || c.status === status) &&
      (!t || `${c.job_card_no} ${fleet(c.fleet_id)?.fleet_no ?? ''}`.toLowerCase().includes(t)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, status, q]);
  const taskInfo = (cardId: string) => {
    const t = (ctx?.tasks ?? []).filter((x) => x.job_card_id === cardId && x.status !== 'CANCELLED');
    return `${t.filter((x) => x.assigned_employee_id).length}/${t.length}`;
  };
  const selFleet = fleet(f.fleet);

  async function create() {
    setBusy(true); setDialogError(null);
    try {
      const id = await createJobCard(f.fleet, f.category, fromComplaint, f.position || null, f.due || null, f.instruction);
      nav(`${base}/job-cards/${id}`);
    } catch (e) { setDialogError((e as Error).message); } finally { setBusy(false); }
  }
  function closeForm() { setCreating(false); if (fromComplaint) setParams({}); }

  return (
    <div>
      <PageHeader
        title="Job Card Register"
        subtitle={canCreate ? 'Create job cards, assign them to Tyre Men and verify the finished work.' : 'Monitor the job cards of your depot.'}
        action={canCreate && <button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => { setDialogError(null); setCreating(true); }}><Plus size={16} /> New job card</button>}
      />
      {error && <Banner kind="error">{error}</Banner>}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-9`} placeholder="Job card or fleet no." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        </div>
        <select className={`${inputCls} max-w-[16rem]`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {['NOT_ASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_FINAL_INSPECTION', 'REWORK', 'CLOSED', 'CANCELLED'].map((s) => <option key={s} value={s}>{CARD_STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2">Job card</th><th className="px-4 py-2">Fleet</th><th className="px-4 py-2">Work</th><th className="px-4 py-2">Source</th><th className="px-4 py-2">Due</th><th className="px-4 py-2">Assigned</th><th className="px-4 py-2">Status</th></tr>
          </thead>
          <tbody>
            {!ctx && !error && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {ctx && rows.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">No job cards here.</td></tr>}
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium"><Link className="text-blue-700 underline" to={`${base}/job-cards/${c.id}`}>{c.job_card_no}</Link></td>
                <td className="px-4 py-2">{fleet(c.fleet_id)?.fleet_no ?? '—'}</td>
                <td className="px-4 py-2">{WORK_CATEGORY_LABEL[c.work_category]}</td>
                <td className="px-4 py-2 text-slate-600">{c.source.toLowerCase()}</td>
                <td className="px-4 py-2 text-slate-600">{c.due_date}</td>
                <td className="px-4 py-2 text-slate-600">{taskInfo(c.id)}</td>
                <td className="px-4 py-2"><CardBadge status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && ctx && (
        <Modal title={fromComplaint ? 'Create job card from complaint' : 'New job card'} onClose={closeForm}>
          {dialogError && <Banner kind="error">{dialogError}</Banner>}
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void create(); }}>
            <Field label="Fleet *">
              <select className={inputCls} value={f.fleet} disabled={!!fromComplaint} onChange={(e) => setF({ ...f, fleet: e.target.value, position: '' })} required>
                <option value="">Select…</option>
                {ctx.fleets.filter((x) => x.status === 'ACTIVE').map((x) => <option key={x.id} value={x.id}>{x.fleet_no} — {x.registration_no}</option>)}
              </select>
            </Field>
            <Field label="Work *" hint={f.category === 'TYRE_CHANGING' ? 'Creates four steps in order: Removal, Unsetting, Setting, Fitment.' : undefined}>
              <select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                {CARD_CATEGORIES.map((c) => <option key={c} value={c}>{WORK_CATEGORY_LABEL[c]}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tyre position">
                <select className={inputCls} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })}>
                  <option value="">Not specific</option>
                  {(selFleet?.position_layout ?? []).map((p: string) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Due date"><input className={inputCls} type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
            </div>
            <Field label="Instruction"><textarea className={inputCls} rows={2} value={f.instruction} onChange={(e) => setF({ ...f, instruction: e.target.value })} /></Field>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnPlain} onClick={closeForm} disabled={busy}>Cancel</button>
              <button type="submit" className={btnPrimary} disabled={busy || !f.fleet}>{busy ? 'Working…' : 'Create job card'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
