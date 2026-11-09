import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { fmtDateTime } from '../lib/masters';
import { decideGroup, loadGrouping, rpc, type GroupingCtx, type Row } from '../lib/ops';
import { frequencyText } from '../lib/schedules';
import { Banner, btnDanger, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader, ReasonDialog } from '../components/ui';
import { Modal } from '../components/OpsBits';

const groupSave = (schedule: string, group: string | null, name: string, fleets: string[], reason: string) =>
  rpc<string>('group_save', { p_schedule: schedule, p_group: group, p_name: name, p_fleets: fleets, p_reason: reason });
const boardSave = (schedule: string, assign: Record<string, string[]>, reason: string) => rpc<number>('group_board_save', { p_schedule: schedule, p_assign: assign, p_reason: reason });

type View = { k: 'create'; schedule: string } | { k: 'board'; schedule: string } | { k: 'fleets'; group: Row } | { k: 'ungrouped'; schedule: string } | { k: 'audit'; group: Row } | { k: 'return'; rev: Row };

/** Fleet Grouping (D1): a group is saved and Active at once; a fleet is in one group for each schedule. */
export function FleetGrouping() {
  const { me } = useAuth();
  const isTic = me?.role_code === 'TIC';
  const isSup = me?.role_code === 'SUP';
  const [ctx, setCtx] = useState<GroupingCtx | null>(null);
  const [refs, setRefs] = useState<{ model: Record<string, string>; size: Record<string, string>; type: Record<string, string> }>({ model: {}, size: {}, type: {} });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  const [dlgError, setDlgError] = useState<string | null>(null);

  const load = useCallback(() => {
    loadGrouping().then(setCtx).catch((e: Error) => setError(e.message));
    Promise.all([supabase.from('ref_values').select('id, label'), supabase.from('tyre_sizes').select('id, size_code'), supabase.from('fleet_types').select('id, fleet_make, fleet_model')]).then(([r, s, t]) => {
      setRefs({
        model: Object.fromEntries((r.data ?? []).map((x: Row) => [x.id, x.label])), size: Object.fromEntries((s.data ?? []).map((x: Row) => [x.id, x.size_code])),
        type: Object.fromEntries((t.data ?? []).map((x: Row) => [x.id, `${x.fleet_make} ${x.fleet_model}`])),
      });
    });
  }, []);
  useEffect(load, [load]);

  const fleets = useMemo(() => (ctx?.fleets ?? []).filter((f) => f.status === 'ACTIVE'), [ctx]);
  const modelOf = (f: Row) => refs.model[f.bus_model_type_ref] ?? '—';
  const sizeOf = (f: Row) => refs.size[f.oem_tyre_size_id] ?? '—';
  const airOf = (f: Row) => (f.air_type === 'NITROGEN' ? 'Nitrogen' : 'Regular');
  const membersOf = (g: Row) => (g.current_revision_id ? (ctx?.members ?? []).filter((m) => m.revision_id === g.current_revision_id).map((m) => m.fleet_id) : []);
  const fleet = (id: string) => fleets.find((f) => f.id === id);
  const activeGroups = (sch: string) => (ctx?.groups ?? []).filter((g) => g.schedule_id === sch && g.status === 'ACTIVE' && g.current_revision_id);
  const groupedIds = (sch: string) => new Set(activeGroups(sch).flatMap(membersOf));
  const ungrouped = (sch: string) => fleets.filter((f) => !groupedIds(sch).has(f.id));
  const pending = (ctx?.revisions ?? []).filter((r) => r.status === 'PENDING_APPROVAL');   // proposals made before D1 removed the approval
  const schedules = (ctx?.schedules ?? []).filter((s) => s.status === 'ACTIVE');
  const tally = (ids: string[], by: (f: Row) => string) => { const m: Record<string, number> = {}; ids.forEach((i) => { const f = fleet(i); if (f) m[by(f)] = (m[by(f)] ?? 0) + 1; }); return Object.entries(m).map(([k, n]) => `${k} ${n}`).join(' · '); };

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setDlgError(null);
    try { await fn(); setNotice(ok); setView(null); load(); } catch (e) { setDlgError((e as Error).message); } finally { setBusy(false); }
  }
  const fleetTable = (ids: string[]) => (
    <div className="max-h-72 overflow-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="px-2 py-1">S.No</th><th className="px-2 py-1">Fleet No</th><th className="px-2 py-1">Reg No</th><th className="px-2 py-1">Model type</th><th className="px-2 py-1">Size</th><th className="px-2 py-1">Air type</th></tr></thead>
      <tbody>{ids.map((i, n) => { const f = fleet(i); return f ? <tr key={i} className="border-t border-slate-100"><td className="px-2 py-1">{n + 1}</td><td className="px-2 py-1">{f.fleet_no}</td><td className="px-2 py-1">{f.registration_no}</td><td className="px-2 py-1">{modelOf(f)}</td><td className="px-2 py-1">{sizeOf(f)}</td><td className="px-2 py-1">{airOf(f)}</td></tr> : null; })}</tbody></table></div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title={isSup ? 'Fleet Grouping' : 'Fleet Grouping'}
        subtitle="Split the fleets of the depot into groups for each scheduled maintenance type, so the daily workload matches the technicians. A group is Active as soon as it is saved."
        action={isTic && <button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => { setDlgError(null); setView({ k: 'create', schedule: schedules[0]?.id ?? '' }); }}><Plus size={16} /> Create Group</button>} />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      {!ctx && !error && <p className="text-slate-500">Loading…</p>}
      {ctx && <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2"><div className="text-xs uppercase tracking-wide text-slate-500">Fleets in the depot</div><div className="text-xl font-bold">{fleets.length}</div></div>
        {schedules.filter((s) => activeGroups(s.id).length > 0).map((s) => <div key={s.id} className="rounded-xl border border-slate-200 bg-white px-4 py-2"><div className="text-xs uppercase tracking-wide text-slate-500">{s.schedule_name}</div><div className="text-sm font-semibold">{groupedIds(s.id).size} / {fleets.length} fleets grouped</div></div>)}
      </div>}

      {isSup && pending.length > 0 && <section><h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Earlier proposals awaiting approval ({pending.length})</h2>
        {pending.map((r) => <div key={r.id} className={`${cardCls} mb-2 flex flex-wrap items-center justify-between gap-2 p-3 text-sm`}>
          <span>{ctx?.groups.find((g) => g.id === r.group_id)?.group_name} · revision {r.revision_no} · {r.reason_for_change}</span>
          <span className="flex gap-2"><button className={btnDanger} onClick={() => { setDlgError(null); setView({ k: 'return', rev: r }); }}>Return</button>
            <button className={btnPrimary} disabled={busy} onClick={() => void act(() => decideGroup(r.id, true, ''), 'Approved.')}>Approve</button></span></div>)}</section>}

      {ctx && schedules.map((s) => {
        const gs = activeGroups(s.id); const un = ungrouped(s.id);
        if (gs.length === 0 && !isTic) return null;
        return (
          <section key={s.id} className={`${cardCls} p-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h2 className="font-semibold text-slate-900">{s.schedule_name} <span className="font-normal text-slate-500">· {s.schedule_code}</span></h2>
                <div className="text-sm text-slate-600">{frequencyText(s)}</div>
                <div className="text-sm">{gs.length === 0 ? 'No group yet.' : <>{groupedIds(s.id).size} of {fleets.length} fleets grouped - {un.length === 0 ? 'All grouped' : <button className="text-blue-700 underline" onClick={() => setView({ k: 'ungrouped', schedule: s.id })}>{un.length} ungrouped</button>}</>}</div></div>
              {isTic && gs.length > 0 && <button className={btnPlain} onClick={() => { setDlgError(null); setView({ k: 'board', schedule: s.id }); }}>Edit groups</button>}
            </div>
            {gs.length > 0 && <div className="mt-3 grid gap-3 md:grid-cols-2">{gs.map((g) => {
              const ids = membersOf(g); const rev = ctx.revisions.find((r) => r.id === g.current_revision_id);
              return (
                <div key={g.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between"><strong>{g.group_name}</strong><span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Active</span></div>
                  <div className="mt-1 text-slate-700">{ids.length} fleets · {ids.length * 6} tyres · {frequencyText(s)} - {s.schedule_code}</div>
                  <div className="text-xs text-slate-500">By model type: {tally(ids, modelOf) || '—'}</div>
                  <div className="text-xs text-slate-500">By tyre size: {tally(ids, sizeOf) || '—'}</div>
                  <div className="text-xs text-slate-500">Last updated {rev?.decided_at ? fmtDateTime(rev.decided_at) : '—'}</div>
                  <div className="mt-2 flex gap-2"><button className={btnPlain} onClick={() => setView({ k: 'fleets', group: g })}>View fleets</button><button className={btnPlain} onClick={() => setView({ k: 'audit', group: g })}>Audit Trail</button></div>
                </div>);
            })}</div>}
          </section>
        );
      })}

      {view?.k === 'create' && ctx && <CreateDlg ctx={ctx} fleets={fleets} schedules={schedules} modelOf={modelOf} sizeOf={sizeOf} airOf={airOf} initial={view.schedule} groupedIds={groupedIds} activeGroups={activeGroups} busy={busy} error={dlgError}
        onCancel={() => setView(null)} onSave={(sch, name, ids, reason) => void act(() => groupSave(sch, null, name, ids, reason), `Group ${name} created.`)} />}
      {view?.k === 'board' && ctx && <BoardDlg groups={activeGroups(view.schedule)} membersOf={membersOf} ungrouped={ungrouped(view.schedule)} fleets={fleets} modelOf={modelOf} sizeOf={sizeOf} busy={busy} error={dlgError}
        onCancel={() => setView(null)} onSave={(assign, reason) => void act(() => boardSave((view as { schedule: string }).schedule, assign, reason), 'Groups saved. They are used at once.')} />}
      {view?.k === 'fleets' && <Modal title={`${view.group.group_name} · ${schedules.find((s) => s.id === view.group.schedule_id)?.schedule_name ?? ''}`} onClose={() => setView(null)}>{fleetTable(membersOf(view.group))}<div className="mt-3 text-right"><button className={btnPlain} onClick={() => setView(null)}>Close</button></div></Modal>}
      {view?.k === 'ungrouped' && <Modal title="Ungrouped fleets" onClose={() => setView(null)}>{fleetTable(ungrouped(view.schedule).map((f) => f.id))}<div className="mt-3 text-right"><button className={btnPlain} onClick={() => setView(null)}>Close</button></div></Modal>}
      {view?.k === 'audit' && ctx && <Modal title={`Audit Trail · ${view.group.group_name}`} onClose={() => setView(null)}>
        <ol className="space-y-2 text-sm">{ctx.revisions.filter((r) => r.group_id === view.group.id).sort((a, b) => b.revision_no - a.revision_no).map((r) => (
          <li key={r.id} className="rounded-lg border border-slate-200 p-2"><div className="font-medium">Revision {r.revision_no} · {r.status === 'APPROVED' ? 'Active' : r.status.toLowerCase()}</div>
            <div className="text-slate-600">{ctx.staff.find((x) => x.id === r.proposed_by)?.full_name ?? '—'} · {fmtDateTime(r.decided_at ?? r.submitted_at)}</div><div className="text-slate-700">{r.reason_for_change}</div></li>))}</ol>
        <div className="mt-3 text-right"><button className={btnPlain} onClick={() => setView(null)}>Close</button></div></Modal>}
      {view?.k === 'return' && <ReasonDialog title="Return this proposal?" label="Reason (required)" confirmLabel="Return" danger required busy={busy} error={dlgError} onConfirm={(t) => void act(() => decideGroup(view.rev.id, false, t), 'Returned.')} onCancel={() => setView(null)} />}
    </div>
  );
}

function CreateDlg({ fleets, schedules, modelOf, sizeOf, airOf, initial, groupedIds, activeGroups, busy, error, onCancel, onSave }: {
  ctx: GroupingCtx; fleets: Row[]; schedules: Row[]; modelOf: (f: Row) => string; sizeOf: (f: Row) => string; airOf: (f: Row) => string; initial: string;
  groupedIds: (s: string) => Set<string>; activeGroups: (s: string) => Row[]; busy: boolean; error: string | null; onCancel: () => void; onSave: (s: string, name: string, ids: string[], reason: string) => void;
}) {
  const [sch, setSch] = useState(initial);
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [model, setModel] = useState('');
  const [size, setSize] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const shown = fleets.filter((f) => (!model || modelOf(f) === model) && (!size || sizeOf(f) === size));
  const models = [...new Set(fleets.map(modelOf))].sort(); const sizes = [...new Set(fleets.map(sizeOf))].sort();
  const taken = groupedIds(sch);
  const groupName = (id: string) => activeGroups(sch).find((g) => (g as Row).current_revision_id && false)?.group_name ?? id;
  void groupName;
  return (
    <Modal title="Create Group" onClose={onCancel}>
      {error && <Banner kind="error">{error}</Banner>}
      <div className="space-y-3">
        <Field label="Group for (Schedule Code) *"><select className={inputCls} value={sch} onChange={(e) => setSch(e.target.value)}>{schedules.map((s) => <option key={s.id} value={s.id}>{s.schedule_code} · {s.schedule_name}</option>)}</select></Field>
        <Field label="Group Name *"><input className={inputCls} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <select className={inputCls} aria-label="Model type" value={model} onChange={(e) => setModel(e.target.value)}><option value="">All model types</option>{models.map((m) => <option key={m}>{m}</option>)}</select>
          <select className={inputCls} aria-label="Tyre size" value={size} onChange={(e) => setSize(e.target.value)}><option value="">All tyre sizes</option>{sizes.map((m) => <option key={m}>{m}</option>)}</select>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm"><button type="button" className={btnPlain} onClick={() => setSel([...new Set([...sel, ...shown.map((f) => f.id)])])}>Select all filtered</button>
          <button type="button" className={btnPlain} onClick={() => setSel(sel.filter((i) => !shown.some((f) => f.id === i)))}>Clear filtered</button>
          <span className="text-slate-500">{shown.length} fleets match this filter - {sel.length} selected overall</span></div>
        <div className="max-h-48 overflow-auto rounded-lg border border-slate-200"><table className="w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-2 py-1" /><th className="px-2 py-1">Fleet No</th><th className="px-2 py-1">Reg</th><th className="px-2 py-1">Model type</th><th className="px-2 py-1">Size</th><th className="px-2 py-1">Air type</th></tr></thead>
          <tbody>{shown.map((f) => <tr key={f.id} className="border-t border-slate-100"><td className="px-2 py-1"><input type="checkbox" aria-label={`Select ${f.fleet_no}`} checked={sel.includes(f.id)} onChange={() => setSel(sel.includes(f.id) ? sel.filter((x) => x !== f.id) : [...sel, f.id])} /></td>
            <td className="px-2 py-1">{f.fleet_no}{taken.has(f.id) && <span className="ml-1 text-xs text-amber-700">(in a group)</span>}</td><td className="px-2 py-1">{f.registration_no}</td><td className="px-2 py-1">{modelOf(f)}</td><td className="px-2 py-1">{sizeOf(f)}</td><td className="px-2 py-1">{airOf(f)}</td></tr>)}</tbody></table></div>
        <p className="text-xs text-slate-500">A fleet is in only one group of a schedule. A fleet that is already in another group is moved to this group.</p>
        <Field label="Reason for change *"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <Field label="Remarks"><input className={inputCls} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><button className={btnPlain} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={btnPrimary} disabled={busy || !sch || !name.trim() || !reason.trim() || sel.length === 0} onClick={() => onSave(sch, name, sel, remarks.trim() ? `${reason.trim()} (${remarks.trim()})` : reason.trim())}>{busy ? 'Working…' : 'Create'}</button></div>
      </div>
    </Modal>
  );
}

/** Edit groups board: one column for each group and one for Ungrouped; pick fleets, then move them. */
function BoardDlg({ groups, membersOf, ungrouped, fleets, modelOf, sizeOf, busy, error, onCancel, onSave }: {
  groups: Row[]; membersOf: (g: Row) => string[]; ungrouped: Row[]; fleets: Row[]; modelOf: (f: Row) => string; sizeOf: (f: Row) => string; busy: boolean; error: string | null;
  onCancel: () => void; onSave: (assign: Record<string, string[]>, reason: string) => void;
}) {
  const [cols, setCols] = useState<Record<string, string[]>>(() => ({ ...Object.fromEntries(groups.map((g) => [g.id, membersOf(g)])), '': ungrouped.map((f) => f.id) }));
  const [picked, setPicked] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [size, setSize] = useState('');
  const [reason, setReason] = useState('');
  const fleet = (id: string) => fleets.find((f) => f.id === id);
  const visible = (id: string) => { const f = fleet(id); return !!f && (!model || modelOf(f) === model) && (!size || sizeOf(f) === size); };
  const move = (ids: string[], to: string) => { setCols((c) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, k === to ? [...v.filter((x) => !ids.includes(x)), ...ids] : v.filter((x) => !ids.includes(x))]))); setPicked([]); };
  const models = [...new Set(fleets.map(modelOf))].sort(); const sizes = [...new Set(fleets.map(sizeOf))].sort();
  return (
    <Modal title="Edit groups" onClose={onCancel}>
      {error && <Banner kind="error">{error}</Banner>}
      <div className="mb-2 grid grid-cols-2 gap-2"><select className={inputCls} aria-label="Model type" value={model} onChange={(e) => setModel(e.target.value)}><option value="">All model types</option>{models.map((m) => <option key={m}>{m}</option>)}</select>
        <select className={inputCls} aria-label="Tyre size" value={size} onChange={(e) => setSize(e.target.value)}><option value="">All tyre sizes</option>{sizes.map((m) => <option key={m}>{m}</option>)}</select></div>
      <p className="mb-2 text-xs text-slate-500">Drag fleets between the columns, or tick fleets and press a "Move to" button. {picked.length} ticked.</p>
      <div className="mb-2 flex flex-wrap gap-2">{[...groups.map((g) => [g.id, g.group_name] as const), ['', 'Ungrouped'] as const].map(([id, nm]) => <button key={id} className={btnPlain} disabled={picked.length === 0} onClick={() => move(picked, id)}>Move to {nm}</button>)}</div>
      <div className="grid gap-2 md:grid-cols-2">{[...groups.map((g) => [g.id, g.group_name] as const), ['', 'Ungrouped'] as const].map(([id, nm]) => (
        <div key={id} className="rounded-lg border border-slate-200 p-2" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const ids = (e.dataTransfer.getData('text/plain') || '').split(',').filter(Boolean); if (ids.length) move(ids, id); }}>
          <div className="mb-1 flex justify-between text-sm font-semibold"><span>{nm}</span><span>{cols[id]?.length ?? 0}</span></div>
          <div className="flex max-h-44 flex-wrap gap-1 overflow-auto">{(cols[id] ?? []).filter(visible).map((fid) => (
            <label key={fid} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', picked.includes(fid) ? picked.join(',') : fid)}
              className={`cursor-grab rounded border px-1.5 py-0.5 text-xs ${picked.includes(fid) ? 'border-blue-600 bg-blue-50' : 'border-slate-300'}`}>
              <input type="checkbox" className="mr-1" checked={picked.includes(fid)} onChange={() => setPicked(picked.includes(fid) ? picked.filter((x) => x !== fid) : [...picked, fid])} />{fleet(fid)?.fleet_no}</label>))}</div>
        </div>))}</div>
      <div className="mt-3"><Field label="Reason for change *"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field></div>
      <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={btnPrimary} disabled={busy || !reason.trim()} onClick={() => { const { '': _u, ...assign } = cols; void _u; onSave(assign, reason.trim()); }}>{busy ? 'Working…' : 'Save'}</button></div>
    </Modal>
  );
}
