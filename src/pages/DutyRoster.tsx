import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/masters';
import { addDaysIso, decideRoster, getBusinessToday, loadRoster, mondayOfIso, saveRoster, submitRoster, type RosterCtx } from '../lib/ops';
import { Banner, btnDanger, btnPlain, btnPrimary, cardCls, inputCls, PageHeader, ReasonDialog } from '../components/ui';

const ROSTER_LABEL: Record<string, string> = { DRAFT: 'Draft', PENDING_APPROVAL: 'Awaiting approval', POSTED: 'Posted', RETURNED: 'Returned' };
const ROSTER_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700', PENDING_APPROVAL: 'bg-amber-100 text-amber-800', POSTED: 'bg-green-100 text-green-800', RETURNED: 'bg-red-100 text-red-800',
};
const addDays = addDaysIso;
const dayLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Weekly duty roster. Tyre IC plans and submits; Supervisor posts or returns. A Tyre Man sees only their own posted duties. */
export function DutyRoster() {
  const { me } = useAuth();
  const isTic = me?.role_code === 'TIC';
  const isSup = me?.role_code === 'SUP';
  const [week, setWeek] = useState('');
  const [ctx, setCtx] = useState<RosterCtx | null>(null);
  const [grid, setGrid] = useState<Record<string, string>>({});   // "employee|date" -> shift code or '' (off)
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'return' | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(() => { loadRoster().then(setCtx).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);
  // the first week shown is the one containing the business date (the demo date), not the device clock
  useEffect(() => { getBusinessToday().then((t) => setWeek(mondayOfIso(t))).catch((e: Error) => setError(e.message)); }, []);

  const roster = ctx?.rosters.find((r) => r.week_start === week);
  const days = useMemo(() => (week ? Array.from({ length: 7 }, (_, i) => addDays(week, i)) : []), [week]);
  useEffect(() => {
    if (!ctx) return;
    const g: Record<string, string> = {};
    for (const e of ctx.entries.filter((x) => x.roster_id === roster?.id)) g[`${e.employee_id}|${e.duty_date}`] = ctx.shifts.find((s) => s.id === e.shift_id)?.shift_code ?? '';
    setGrid(g); setDirty(false);
  }, [ctx, roster?.id]);

  const editable = isTic && (!roster || ['DRAFT', 'RETURNED'].includes(roster.status));
  const people = ctx?.staff ?? [];

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setError(null); setDialogError(null);
    try { await fn(); setNotice(ok); setDialog(null); load(); } catch (e) { const m = (e as Error).message; if (dialog) setDialogError(m); else setError(m); } finally { setBusy(false); }
  }
  const entriesPayload = () => Object.entries(grid).map(([k, v]) => { const [employee_id, duty_date] = k.split('|'); return { employee_id, duty_date, shift_code: v || null }; });
  const planned = Object.keys(grid).length;

  return (
    <div className="space-y-4">
      <PageHeader title={isSup ? 'Roster Approvals' : 'Duty Posting'}
        subtitle={isSup ? 'Post the weekly roster your Tyre IC submits, or return it with a reason.' : 'Plan each person’s shift for the week. The Supervisor posts it.'} />
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}
      <div className="flex flex-wrap items-center gap-2">
        <button className={btnPlain} onClick={() => setWeek(addDays(week, -7))}>← Previous week</button>
        <strong className="px-2 text-slate-800">{week ? `Week of ${dayLabel(week)}` : '…'}</strong>
        <button className={btnPlain} onClick={() => setWeek(addDays(week, 7))}>Next week →</button>
        {roster && <span className={`ml-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROSTER_STYLE[roster.status]}`}>{ROSTER_LABEL[roster.status]}</span>}
      </div>
      {roster?.decision_remarks && <Banner kind={roster.status === 'RETURNED' ? 'error' : 'info'}>{roster.status === 'RETURNED' ? 'Returned' : 'Remarks'}: {roster.decision_remarks}</Banner>}
      {roster?.submitted_at && roster.status === 'PENDING_APPROVAL' && <Banner kind="info">Submitted {fmtDateTime(roster.submitted_at)}.</Banner>}

      {!ctx && !error && <p className="text-slate-500">Loading…</p>}
      {ctx && (
        <div className={`${cardCls} overflow-x-auto`}>
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-2">Person</th>{days.map((d) => <th key={d} className="px-2 py-2">{dayLabel(d)}</th>)}</tr>
            </thead>
            <tbody>
              {people.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">No staff to show.</td></tr>}
              {people.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{p.full_name}<div className="text-xs font-normal text-slate-500">{p.employee_code}</div></td>
                  {days.map((d) => {
                    const k = `${p.id}|${d}`;
                    const v = grid[k];
                    return (
                      <td key={d} className="px-2 py-2">
                        {editable ? (
                          <select className={`${inputCls} px-1 py-1 text-xs`} value={v === undefined ? '__none' : v} aria-label={`${p.full_name} ${d}`}
                            onChange={(e) => { const n = { ...grid }; if (e.target.value === '__none') delete n[k]; else n[k] = e.target.value; setGrid(n); setDirty(true); }}>
                            <option value="__none">—</option><option value="">Off</option>
                            {ctx.shifts.filter((s) => s.status === 'ACTIVE').map((s) => <option key={s.id} value={s.shift_code}>{s.shift_name}</option>)}
                          </select>
                        ) : <span className="text-xs text-slate-700">{v === undefined ? '—' : v === '' ? 'Off' : ctx.shifts.find((s) => s.shift_code === v)?.shift_name}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isTic && editable && (
        <div className="flex flex-wrap justify-end gap-2">
          <button className={btnPlain} disabled={busy || !dirty} onClick={() => void act(() => saveRoster(week, entriesPayload()), 'Roster saved.')}>Save draft</button>
          <button className={btnPrimary} disabled={busy || planned === 0}
            onClick={() => void act(async () => { const id = await saveRoster(week, entriesPayload()); await submitRoster(id); }, 'Roster sent to the Supervisor.')}>Save and submit</button>
        </div>
      )}
      {isSup && roster?.status === 'PENDING_APPROVAL' && (
        <div className="flex flex-wrap justify-end gap-2">
          <button className={btnDanger} disabled={busy} onClick={() => { setDialogError(null); setDialog('return'); }}>Return</button>
          <button className={btnPrimary} disabled={busy} onClick={() => void act(() => decideRoster(roster.id, true, ''), 'Roster posted.')}>Post roster</button>
        </div>
      )}
      {dialog === 'return' && roster && <ReasonDialog title="Return this roster?" label="Reason (required)" confirmLabel="Return" danger required busy={busy} error={dialogError}
        onConfirm={(t) => void act(() => decideRoster(roster.id, false, t), 'Roster returned.')} onCancel={() => setDialog(null)} />}
    </div>
  );
}
