import { useState } from 'react';
import type { JobsCtx, Row } from '../lib/jobs';
import { createTyreChange, REMOVAL_REASONS, type ChangeLine } from '../lib/stock';
import { Banner, btnPlain, btnPrimary, Field, inputCls } from './ui';

const FIT_LABEL: Record<string, string> = {
  LIVE_SET: 'Live stock tyre, already set', LIVE_UNSET: 'Live stock tyre, unset (needs setting)', SWAP: 'Another fleet (swap)', WANT: 'Want of tyre (no tyre yet)',
};
const ITEMS = ['tube', 'flap', 'disc'] as const;

/** Tyre Changing panel: one row per fitted tyre of the fleet that is to be changed. */
export function TyreChangeForm({ ctx, onDone, onCancel }: { ctx: JobsCtx; onDone: (cardId: string) => void; onCancel: () => void }) {
  const [fleet, setFleet] = useState('');
  const [fleet2, setFleet2] = useState('');
  const [lines, setLines] = useState<Record<string, ChangeLine>>({});
  const [expected, setExpected] = useState('');
  const [shift, setShift] = useState('');
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fitted = (fid: string) => ctx.tyres.filter((t) => t.fleet_id === fid && t.stock_place === 'FITTED').sort((a, b) => a.fitted_position.localeCompare(b.fitted_position));
  const live = ctx.tyres.filter((t) => t.stock_place === 'LIVE_STOCK' && t.stock_category === 'GOOD');
  const chosen = Object.values(lines);
  const usedLive = new Set(chosen.map((l) => l.fit_tyre_id).filter(Boolean));
  const usedSwap = new Set(chosen.map((l) => l.swap_tyre_id).filter(Boolean));
  const needsFleet2 = chosen.some((l) => l.fit === 'SWAP');
  const active = ctx.fleets.filter((x) => x.status === 'ACTIVE');

  const setLine = (id: string, patch: Partial<ChangeLine> | null) => setLines((cur) => {
    const next = { ...cur };
    if (patch === null) delete next[id]; else next[id] = { ...(cur[id] ?? { tyre_id: id, reason: '', fit: '' }), ...patch };
    return next;
  });
  const liveOptions = (l: ChangeLine) => live.filter((t) => (l.fit === 'LIVE_SET' ? t.setting_status === 'SET' : t.setting_status !== 'SET') && (!usedLive.has(t.id) || t.id === l.fit_tyre_id));

  async function save() {
    setBusy(true); setError(null);
    try {
      if (!fleet) throw new Error('Choose the fleet.');
      if (chosen.length === 0) throw new Error('Tick at least one tyre to change.');
      for (const l of chosen) {
        const pos = ctx.tyres.find((t) => t.id === l.tyre_id)?.fitted_position;
        if (!l.reason.trim()) throw new Error(`${pos}: choose the removal reason.`);
        if (!l.fit) throw new Error(`${pos}: choose how the tyre is replaced.`);
        if ((l.fit === 'LIVE_SET' || l.fit === 'LIVE_UNSET') && !l.fit_tyre_id) throw new Error(`${pos}: choose the live-stock tyre.`);
        if (l.fit === 'SWAP' && !l.swap_tyre_id) throw new Error(`${pos}: choose the tyre of the second fleet.`);
        if (l.fit === 'LIVE_UNSET' && ITEMS.some((k) => !l[k])) throw new Error(`${pos}: choose Reuse or Other item for the tube, flap and disc.`);
      }
      if (needsFleet2 && !fleet2) throw new Error('A swap needs the second fleet.');
      const id = await createTyreChange(fleet, chosen, needsFleet2 ? fleet2 : null, expected || null, shift || null, instruction);
      onDone(id);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      {error && <Banner kind="error">{error}</Banner>}
      <Field label="Fleet *">
        <select className={inputCls} value={fleet} onChange={(e) => { setFleet(e.target.value); setLines({}); }} required>
          <option value="">Select…</option>{active.map((x) => <option key={x.id} value={x.id}>{x.fleet_no} — {x.registration_no}</option>)}
        </select>
      </Field>

      {fleet && <div className="space-y-2">
        <div className="text-sm font-medium text-slate-700">Tyres to change</div>
        {fitted(fleet).map((t) => {
          const l = lines[t.id];
          return (
            <div key={t.id} className={`rounded-lg border p-2 ${l ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200'}`}>
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={!!l} onChange={(e) => setLine(t.id, e.target.checked ? {} : null)} /> {t.fitted_position} · {t.mtc_no}</label>
              {l && <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <select className={inputCls} aria-label={`Removal reason ${t.fitted_position}`} value={l.reason} onChange={(e) => setLine(t.id, { reason: e.target.value })}>
                  <option value="">Removal reason…</option>{REMOVAL_REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                <select className={inputCls} aria-label={`Fitment tyre ${t.fitted_position}`} value={l.fit} onChange={(e) => setLine(t.id, { fit: e.target.value as ChangeLine['fit'], fit_tyre_id: undefined, swap_tyre_id: undefined, tube: undefined, flap: undefined, disc: undefined })}>
                  <option value="">Fitment tyre…</option>{Object.entries(FIT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {(l.fit === 'LIVE_SET' || l.fit === 'LIVE_UNSET') && (
                  <select className={`${inputCls} sm:col-span-2`} aria-label={`Live stock tyre ${t.fitted_position}`} value={l.fit_tyre_id ?? ''} onChange={(e) => setLine(t.id, { fit_tyre_id: e.target.value })}>
                    <option value="">Good live-stock tyre…</option>{liveOptions(l).map((y) => <option key={y.id} value={y.id}>{y.mtc_no} · {y.tyre_condition ?? ''} · {y.setting_status === 'SET' ? 'Set' : 'Unset'}</option>)}
                  </select>
                )}
                {l.fit === 'SWAP' && (
                  <select className={`${inputCls} sm:col-span-2`} aria-label={`Swap tyre ${t.fitted_position}`} value={l.swap_tyre_id ?? ''} onChange={(e) => setLine(t.id, { swap_tyre_id: e.target.value })}>
                    <option value="">Tyre of the second fleet…</option>
                    {fleet2 && fitted(fleet2).filter((y) => !usedSwap.has(y.id) || y.id === l.swap_tyre_id).map((y) => <option key={y.id} value={y.id}>{y.fitted_position} · {y.mtc_no}</option>)}
                  </select>
                )}
                {l.fit === 'LIVE_UNSET' && (
                  <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                    {ITEMS.map((k) => (
                      <select key={k} className={inputCls} aria-label={`${k} ${t.fitted_position}`} value={l[k] ?? ''} onChange={(e) => setLine(t.id, { [k]: e.target.value as 'REUSE' | 'OTHER' })}>
                        <option value="">{k[0].toUpperCase() + k.slice(1)}…</option><option value="REUSE">Reuse from removed tyre</option><option value="OTHER">Other item (WSR)</option>
                      </select>
                    ))}
                  </div>
                )}
                {l.fit === 'WANT' && <p className="text-xs text-orange-700 sm:col-span-2">The Fitment waits until a tyre is provided. Provide it from this job card.</p>}
              </div>}
            </div>
          );
        })}
        {needsFleet2 && (
          <Field label="Second fleet (for the swap) *">
            <select className={inputCls} value={fleet2} onChange={(e) => { setFleet2(e.target.value); setLines((cur) => Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, { ...v, swap_tyre_id: undefined }]))); }}>
              <option value="">Select…</option>{active.filter((x) => x.id !== fleet).map((x) => <option key={x.id} value={x.id}>{x.fleet_no} — {x.registration_no}</option>)}
            </select>
          </Field>
        )}
      </div>}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Expected completion date"><input className={inputCls} type="date" value={expected} onChange={(e) => setExpected(e.target.value)} /></Field>
        <Field label="Shift"><select className={inputCls} value={shift} onChange={(e) => setShift(e.target.value)}><option value="">—</option>{ctx.shifts.map((s: Row) => <option key={s.id} value={s.id}>{s.shift_name}</option>)}</select></Field>
      </div>
      <Field label="Instruction"><textarea className={inputCls} rows={2} value={instruction} onChange={(e) => setInstruction(e.target.value)} /></Field>
      <p className="text-xs text-slate-500">Job IDs follow the order Removal, Unsetting, Setting, Fitment. A Live stock tyre makes a WSR and its WSR GIN at once; the removed tyre goes back to live stock by an MRN. A swap uses one job card for both fleets and needs no MRN.</p>
      <div className="flex justify-end gap-2">
        <button type="button" className={btnPlain} onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className={btnPrimary} disabled={busy}>{busy ? 'Working…' : 'Create (Draft)'}</button>
      </div>
    </form>
  );
}
