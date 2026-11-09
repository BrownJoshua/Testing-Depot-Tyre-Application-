import { useState } from 'react';
import { finalInspectSelected, type ChecklistAnswer, type Row } from '../lib/jobs';
import { Banner, btnPlain, btnPrimary, Field, inputCls } from './ui';
import { Modal } from './OpsBits';

/** Final inspection - selected: pass or fail several cards at the final-inspection stage with one checklist (FIM). */
export function FinalSelectedDlg({ cards, fleetNo, fims, onClose, onDone }: { cards: Row[]; fleetNo: (c: Row) => string; fims: Row[]; onClose: () => void; onDone: (msg: string) => void }) {
  const [pick, setPick] = useState<string[]>([]);
  const [fimId, setFimId] = useState('');
  const [result, setResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [remarks, setRemarks] = useState('');
  const [ans, setAns] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fim = fims.find((f) => f.id === fimId);
  const items: string[] = fim?.checklist_items ?? [];
  const ok = (i: string) => ans[i] !== false;
  async function save() {
    setBusy(true); setError(null);
    try {
      const checklist: ChecklistAnswer[] | null = items.length ? items.map((i) => ({ item: i, pass: ok(i) })) : null;
      const n = await finalInspectSelected(pick, result, remarks, checklist);
      onDone(`${n} job card${n === 1 ? '' : 's'} ${result === 'PASS' ? 'passed' : 'failed'}.`); onClose();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Modal title="Final inspection - selected" onClose={onClose}>
      {error && <Banner kind="error">{error}</Banner>}
      {cards.length === 0 ? <p className="text-sm text-slate-500">No job card is waiting for final inspection.</p> : <div className="space-y-3">
        <fieldset><legend className="mb-1 text-sm font-medium text-slate-700">Job cards ({pick.length} chosen)</legend>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 text-sm">
            <label className="flex items-center gap-1.5 font-medium"><input type="checkbox" checked={pick.length === cards.length} onChange={(e) => setPick(e.target.checked ? cards.map((c) => c.id) : [])} /> Select all</label>
            {cards.map((c) => <label key={c.id} className="flex items-center gap-1.5"><input type="checkbox" checked={pick.includes(c.id)} onChange={() => setPick(pick.includes(c.id) ? pick.filter((x) => x !== c.id) : [...pick, c.id])} /> {c.job_card_no} · {fleetNo(c)}</label>)}
          </div></fieldset>
        <Field label="Checklist (Final Inspection Master)"><select className={inputCls} value={fimId} onChange={(e) => { setFimId(e.target.value); setAns({}); }}><option value="">No checklist</option>{fims.filter((f) => f.status === 'ACTIVE').map((f) => <option key={f.id} value={f.id}>{f.fim_code} · {f.title}</option>)}</select></Field>
        {items.length > 0 && <div className="space-y-1 rounded-lg border border-slate-200 p-2 text-sm">{items.map((i) => (
          <div key={i} className="flex items-center justify-between gap-2"><span>{i}</span><span className="flex gap-3">
            <label className="flex items-center gap-1"><input type="radio" name={`s-${i}`} checked={ok(i)} onChange={() => setAns({ ...ans, [i]: true })} /> Pass</label>
            <label className="flex items-center gap-1"><input type="radio" name={`s-${i}`} checked={!ok(i)} onChange={() => setAns({ ...ans, [i]: false })} /> Fail</label></span></div>))}</div>}
        <div className="flex gap-4 text-sm" role="radiogroup" aria-label="Result">
          {(['PASS', 'FAIL'] as const).map((k) => <label key={k} className="flex items-center gap-1.5"><input type="radio" name="sel-result" checked={result === k} onChange={() => setResult(k)} /> {k === 'PASS' ? 'Pass' : 'Fail'}</label>)}
        </div>
        {result === 'FAIL' && <Field label="Remarks * (what is wrong)"><textarea className={inputCls} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>}
        <div className="flex justify-end gap-2"><button className={btnPlain} onClick={onClose} disabled={busy}>Cancel</button>
          <button className={btnPrimary} disabled={busy || pick.length === 0 || (result === 'FAIL' && !remarks.trim())} onClick={() => void save()}>{busy ? 'Working…' : 'Submit'}</button></div>
      </div>}
    </Modal>
  );
}
