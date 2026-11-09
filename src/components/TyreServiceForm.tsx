import { useState } from 'react';
import type { JobsCtx } from '../lib/jobs';
import { createTyreService } from '../lib/rounds';
import { Banner, btnPlain, btnPrimary, Field, inputCls } from './ui';

/** Setting / Unsetting job card for a live-stock tyre (no fleet). Setting: a Good unset tyre. Unsetting: a set tyre of the Repair stock. */
export function TyreServiceForm({ ctx, onDone, onCancel }: { ctx: JobsCtx; onDone: (cardId: string) => void; onCancel: () => void }) {
  const [code, setCode] = useState<'JOB-010' | 'JOB-011'>('JOB-010');
  const [tyre, setTyre] = useState('');
  const [expected, setExpected] = useState('');
  const [shift, setShift] = useState('');
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busyTyres = new Set(ctx.jobIds.filter((j) => j.tyre_id && !['DONE', 'CLOSED'].includes(j.status)).map((j) => j.tyre_id));
  const pool = ctx.tyres.filter((t) => t.stock_place === 'LIVE_STOCK' && !busyTyres.has(t.id)
    && (code === 'JOB-010' ? t.stock_category === 'GOOD' && t.setting_status !== 'SET' : t.stock_category === 'REPAIR' && t.setting_status === 'SET'));
  const list = pool;

  async function save() {
    setBusy(true); setError(null);
    try { onDone(await createTyreService(code, tyre, expected || null, shift || null, instruction)); } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      {error && <Banner kind="error">{error}</Banner>}
      <div className="flex gap-2" role="group" aria-label="Job">
        {([['JOB-010', 'Tyre Setting'], ['JOB-011', 'Tyre Unsetting']] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => { setCode(k); setTyre(''); }} className={`rounded-lg border px-3 py-1.5 text-sm ${code === k ? 'border-blue-600 bg-blue-50 font-semibold' : 'border-slate-300'}`}>{l}</button>
        ))}
      </div>
      <p className="text-xs text-slate-500">Job for: live stock (no fleet). {code === 'JOB-010' ? 'Pick a Good tyre that is not yet set.' : 'Pick a set tyre of the Repair stock.'}</p>
      <Field label="Tyre *">
        <select className={inputCls} value={tyre} onChange={(e) => setTyre(e.target.value)} required>
          <option value="">Select…</option>{list.map((t) => <option key={t.id} value={t.id}>{t.mtc_no} · {t.tyre_condition ?? ''} · {t.stock_category === 'GOOD' ? 'Good' : 'Repair'} · {t.setting_status === 'SET' ? 'Set' : 'Unset'}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Expected completion date"><input className={inputCls} type="date" value={expected} onChange={(e) => setExpected(e.target.value)} /></Field>
        <Field label="Shift"><select className={inputCls} value={shift} onChange={(e) => setShift(e.target.value)}><option value="">—</option>{ctx.shifts.map((s) => <option key={s.id} value={s.id}>{s.shift_name}</option>)}</select></Field>
      </div>
      <Field label="Instruction"><textarea className={inputCls} rows={2} value={instruction} onChange={(e) => setInstruction(e.target.value)} /></Field>
      <div className="flex justify-end gap-2">
        <button type="button" className={btnPlain} onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className={btnPrimary} disabled={busy || !tyre}>{busy ? 'Working…' : 'Create (Draft)'}</button>
      </div>
    </form>
  );
}
