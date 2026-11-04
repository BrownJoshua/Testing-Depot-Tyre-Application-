import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/masters';
import { decideGroup, loadGrouping, proposeGroup, withdrawGroup, type GroupingCtx, type Row } from '../lib/ops';
import { Banner, btnDanger, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader, ReasonDialog } from '../components/ui';
import { CardBadge, Modal } from '../components/OpsBits';

type Dialog = { kind: 'withdraw' | 'return'; revision: Row } | { kind: 'approve'; revision: Row };
const REV_LABEL: Record<string, string> = { PENDING_APPROVAL: 'Awaiting approval', APPROVED: 'Approved', RETURNED: 'Returned', WITHDRAWN: 'Withdrawn', SUPERSEDED: 'Superseded' };

/** Fleet Grouping. Tyre IC proposes groups per schedule; Supervisor approves or returns them. */
export function FleetGrouping() {
  const { me } = useAuth();
  const isTic = me?.role_code === 'TIC';
  const isSup = me?.role_code === 'SUP';
  const [ctx, setCtx] = useState<GroupingCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<{ group: Row | null } | null>(null);
  const [f, setF] = useState({ schedule: '', name: '', first: '', reason: '', fleets: [] as string[] });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(() => { loadGrouping().then(setCtx).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);

  const sched = (id: string) => ctx?.schedules.find((s) => s.id === id);
  const fleetNos = (rev: string) => (ctx?.members ?? []).filter((m) => m.revision_id === rev).map((m) => ctx?.fleets.find((x) => x.id === m.fleet_id)?.fleet_no ?? '?').sort();
  const groupOf = (id: string) => ctx?.groups.find((g) => g.id === id);
  const pending = (ctx?.revisions ?? []).filter((r) => r.status === 'PENDING_APPROVAL');
  const grouped = new Set((ctx?.groups ?? []).filter((g) => g.current_revision_id).flatMap((g) => (ctx?.members ?? []).filter((m) => m.revision_id === g.current_revision_id).map((m) => `${g.schedule_id}:${m.fleet_id}`)));

  function openForm(group: Row | null) {
    setDialogError(null);
    const cur = group?.current_revision_id ? (ctx?.revisions.find((r) => r.id === group.current_revision_id) ?? null) : null;
    setF({
      schedule: group?.schedule_id ?? '', name: group?.group_name ?? '', first: cur?.first_schedule_date ?? '', reason: '',
      fleets: group?.current_revision_id ? (ctx?.members ?? []).filter((m) => m.revision_id === group.current_revision_id).map((m) => m.fleet_id) : [],
    });
    setForm({ group });
  }
  async function act(fn: () => Promise<unknown>, ok: string, close: () => void) {
    setBusy(true); setDialogError(null);
    try { await fn(); setNotice(ok); close(); load(); } catch (e) { setDialogError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <PageHeader title={isSup ? 'Grouping Approvals' : 'Fleet Grouping'}
        subtitle={isSup ? 'Review the groups your Tyre IC proposes. Approve them, or return them with a reason.' : 'Put fleets into groups for each maintenance schedule. A Supervisor approves every change.'}
        action={isTic && <button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => openForm(null)}><Plus size={16} /> New group</button>} />
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}
      {!ctx && !error && <p className="text-slate-500">Loading…</p>}

      {ctx && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Awaiting approval ({pending.length})</h2>
          {pending.length === 0 && <Banner kind="info">Nothing is waiting for approval.</Banner>}
          <div className="space-y-3">
            {pending.map((r) => {
              const g = groupOf(r.group_id);
              return (
                <div key={r.id} className={`${cardCls} p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{sched(g?.schedule_id)?.schedule_code} · group {g?.group_name} <span className="font-normal text-slate-500">(revision {r.revision_no})</span></div>
                      <div className="mt-1 text-sm text-slate-700">Fleets: {fleetNos(r.id).join(', ')} · first schedule date {r.first_schedule_date}</div>
                      <div className="mt-1 text-sm text-slate-600">Reason: {r.reason_for_change}</div>
                      <div className="text-xs text-slate-500">Proposed {fmtDateTime(r.submitted_at)}</div>
                    </div>
                    <div className="flex gap-2">
                      {isSup && <><button className={btnDanger} onClick={() => { setDialogError(null); setDialog({ kind: 'return', revision: r }); }}>Return</button>
                        <button className={btnPrimary} onClick={() => { setDialogError(null); setDialog({ kind: 'approve', revision: r }); }}>Approve</button></>}
                      {isTic && <button className={btnPlain} onClick={() => { setDialogError(null); setDialog({ kind: 'withdraw', revision: r }); }}>Withdraw</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {ctx && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Groups</h2>
          <div className={`${cardCls} overflow-x-auto`}>
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2">Schedule</th><th className="px-4 py-2">Group</th><th className="px-4 py-2">Fleets</th><th className="px-4 py-2">First date</th><th className="px-4 py-2">Status</th>{isTic && <th className="px-4 py-2 text-right">Actions</th>}</tr>
              </thead>
              <tbody>
                {ctx.groups.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No groups yet.</td></tr>}
                {ctx.groups.map((g) => {
                  const cur = ctx.revisions.find((r) => r.id === g.current_revision_id);
                  const hasPending = ctx.revisions.some((r) => r.group_id === g.id && r.status === 'PENDING_APPROVAL');
                  const last = ctx.revisions.find((r) => r.group_id === g.id);
                  return (
                    <tr key={g.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-2">{sched(g.schedule_id)?.schedule_code} <span className="text-slate-500">{sched(g.schedule_id)?.schedule_name}</span></td>
                      <td className="px-4 py-2 font-medium">{g.group_name}</td>
                      <td className="px-4 py-2">{cur ? fleetNos(cur.id).join(', ') : '—'}</td>
                      <td className="px-4 py-2">{cur?.first_schedule_date ?? '—'}</td>
                      <td className="px-4 py-2">{cur ? <CardBadge status="APPROVED" /> : <span className="text-xs text-slate-600">{last ? REV_LABEL[last.status] : '—'}</span>}
                        {last?.status === 'RETURNED' && <div className="text-xs text-red-700">{last.decision_remarks}</div>}</td>
                      {isTic && <td className="px-4 py-2 text-right"><button className={btnPlain} disabled={hasPending} onClick={() => openForm(g)}>Propose change</button></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {isTic && (
            <div className={`${cardCls} mt-4 p-4`}>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Ungrouped fleets</h3>
              {ctx.schedules.filter((s) => s.status === 'ACTIVE').map((s) => {
                const un = ctx.fleets.filter((x) => x.status === 'ACTIVE' && !grouped.has(`${s.id}:${x.id}`)).map((x) => x.fleet_no);
                return <p key={s.id} className="text-sm text-slate-600"><strong>{s.schedule_code}</strong>: {un.length ? un.join(', ') : 'every fleet is grouped'}</p>;
              })}
            </div>
          )}
        </section>
      )}

      {form && ctx && (
        <Modal title={form.group ? `Propose change to group ${form.group.group_name}` : 'New fleet group'} onClose={() => setForm(null)}>
          {dialogError && <Banner kind="error">{dialogError}</Banner>}
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void act(() => proposeGroup(f.schedule, f.name, f.fleets, f.first, f.reason, form.group?.id ?? null), 'Sent to the Supervisor for approval.', () => setForm(null)); }}>
            <Field label="Schedule *">
              <select className={inputCls} value={f.schedule} disabled={!!form.group} onChange={(e) => setF({ ...f, schedule: e.target.value })} required>
                <option value="">Select…</option>
                {ctx.schedules.filter((s) => s.status === 'ACTIVE').map((s) => <option key={s.id} value={s.id}>{s.schedule_code} — {s.schedule_name}</option>)}
              </select>
            </Field>
            <Field label="Group name *"><input className={inputCls} value={f.name} disabled={!!form.group} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
            <Field label="First schedule date *" hint="The next dates follow the schedule's frequency."><input className={inputCls} type="date" value={f.first} onChange={(e) => setF({ ...f, first: e.target.value })} required /></Field>
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-slate-700">Fleets * ({f.fleets.length} chosen)</legend>
              <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-3">
                {ctx.fleets.filter((x) => x.status === 'ACTIVE').map((x) => (
                  <label key={x.id} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" checked={f.fleets.includes(x.id)} onChange={(e) => setF({ ...f, fleets: e.target.checked ? [...f.fleets, x.id] : f.fleets.filter((i) => i !== x.id) })} /> {x.fleet_no}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Reason for change *"><textarea className={inputCls} rows={2} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} required /></Field>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnPlain} onClick={() => setForm(null)} disabled={busy}>Cancel</button>
              <button type="submit" className={btnPrimary} disabled={busy}>{busy ? 'Working…' : 'Send for approval'}</button>
            </div>
          </form>
        </Modal>
      )}
      {dialog?.kind === 'withdraw' && <ReasonDialog title="Withdraw this proposal?" label="Reason (required)" confirmLabel="Withdraw" required busy={busy} error={dialogError}
        onConfirm={(t) => void act(() => withdrawGroup(dialog.revision.id, t), 'Proposal withdrawn.', () => setDialog(null))} onCancel={() => setDialog(null)} />}
      {dialog?.kind === 'return' && <ReasonDialog title="Return this proposal?" label="Reason (required)" confirmLabel="Return" danger required busy={busy} error={dialogError}
        onConfirm={(t) => void act(() => decideGroup(dialog.revision.id, false, t), 'Returned to the Tyre IC.', () => setDialog(null))} onCancel={() => setDialog(null)} />}
      {dialog?.kind === 'approve' && <ReasonDialog title="Approve this group?" label="Remarks (optional)" confirmLabel="Approve" required={false} busy={busy} error={dialogError}
        onConfirm={(t) => void act(() => decideGroup(dialog.revision.id, true, t), 'Group approved.', () => setDialog(null))} onCancel={() => setDialog(null)} />}
    </div>
  );
}
