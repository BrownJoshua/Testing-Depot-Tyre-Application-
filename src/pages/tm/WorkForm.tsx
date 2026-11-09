import { useState } from 'react';
import { WEAR_PATTERNS, type WorkFormData } from '../../lib/rounds';
import { shrinkPhoto } from '../../lib/photo';
import { Banner, btnPlain, btnPrimary, inputCls } from '../../components/ui';
import { Modal } from '../../components/OpsBits';

const PARTS = ['tube', 'flap', 'disc'] as const;
const PART_NAME = { tube: 'Tube', flap: 'Flap', disc: 'Disc' } as const;
const blankParts = (): NonNullable<WorkFormData['parts']> => ({ tube: { no: '', condition: '' }, flap: { no: '', condition: '' }, disc: { no: '', condition: '' } });

/** The form of one Tyre Changing step. code: JOB-008 Removal, JOB-011 Unsetting, JOB-010 Setting, JOB-009 Fitment. */
export function WorkForm({ code, tyreNo, busy, onComplete, label }: { code: string; tyreNo: string; busy: boolean; onComplete: (d: WorkFormData) => void; label: string }) {
  const [d, setD] = useState<WorkFormData>({ scanned_no: '', odometer_km: '', wear_pattern: '', nsd_mm: '', psi_after: '', powder_applied: false, photo: null, parts: blankParts() });
  const [err, setErr] = useState<string | null>(null);
  const set = (p: Partial<WorkFormData>) => setD((x) => ({ ...x, ...p }));
  const setPart = (k: (typeof PARTS)[number], p: Partial<{ no: string; condition: '' | 'USABLE' | 'NOT_USABLE' }>) => setD((x) => ({ ...x, parts: { ...x.parts!, [k]: { ...x.parts![k], ...p } } }));
  const matches = d.scanned_no.trim().toUpperCase() === tyreNo.toUpperCase();

  function submit() {
    setErr(null);
    if (!d.scanned_no.trim()) return setErr('Scan or type the tyre number first.');
    if (!matches) return setErr(`${d.scanned_no.trim()} is not the tyre of this step (${tyreNo}).`);
    if ((code === 'JOB-008' || code === 'JOB-009') && !(Number(d.odometer_km) >= 0 && d.odometer_km !== '')) return setErr('Enter the odometer reading (km).');
    if (code === 'JOB-011') for (const k of PARTS) {
      if (!d.parts![k].no.trim()) return setErr(`Enter the ${k} number.`);
      if (!d.parts![k].condition) return setErr(`Choose Usable or Not usable for the ${k}.`);
    }
    onComplete(d);
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
      {err && <Banner kind="error">{err}</Banner>}
      <label className="block text-xs text-slate-600">Tyre number (scan or type) *
        <input className={inputCls} autoCapitalize="characters" placeholder={tyreNo} value={d.scanned_no} onChange={(e) => set({ scanned_no: e.target.value })} /></label>
      {d.scanned_no.trim() !== '' && <p className={`text-xs font-semibold ${matches ? 'text-green-700' : 'text-red-700'}`}>{matches ? '✓ This is the right tyre' : '✗ This is not the tyre of this step'}</p>}

      {(code === 'JOB-008' || code === 'JOB-009') && <label className="block text-xs text-slate-600">Odometer (km) *
        <input className={inputCls} type="number" min="0" inputMode="numeric" value={d.odometer_km} onChange={(e) => set({ odometer_km: e.target.value })} /></label>}

      {code === 'JOB-008' && <>
        <label className="block text-xs text-slate-600">Wear pattern
          <select className={inputCls} value={d.wear_pattern} onChange={(e) => set({ wear_pattern: e.target.value })}><option value="">— select —</option>{WEAR_PATTERNS.map((w) => <option key={w}>{w}</option>)}</select></label>
        <label className="block text-xs text-slate-600">NSD at removal (mm)
          <input className={inputCls} type="number" min="0" step="0.1" inputMode="decimal" value={d.nsd_mm} onChange={(e) => set({ nsd_mm: e.target.value })} /></label>
        <Photo d={d} set={set} />
      </>}

      {code === 'JOB-009' && <>
        <label className="block text-xs text-slate-600">Pressure after fitment (PSI)
          <input className={inputCls} type="number" min="0" inputMode="numeric" value={d.psi_after} onChange={(e) => set({ psi_after: e.target.value })} /></label>
        <label className="block text-xs text-slate-600">NSD (mm)
          <input className={inputCls} type="number" min="0" step="0.1" inputMode="decimal" value={d.nsd_mm} onChange={(e) => set({ nsd_mm: e.target.value })} /></label>
        <Photo d={d} set={set} />
      </>}

      {code === 'JOB-011' && <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-700">Parts taken off (reused parts go to the Setting)</div>
        {PARTS.map((k) => (
          <div key={k} className="rounded-lg border border-slate-200 bg-white p-2">
            <label className="block text-xs text-slate-600">{PART_NAME[k]} number *<input className={inputCls} value={d.parts![k].no} onChange={(e) => setPart(k, { no: e.target.value })} /></label>
            <div className="mt-1 flex gap-4 text-sm" role="radiogroup" aria-label={`${PART_NAME[k]} condition`}>
              <label className="flex items-center gap-1"><input type="radio" name={`c-${k}`} checked={d.parts![k].condition === 'USABLE'} onChange={() => setPart(k, { condition: 'USABLE' })} /> Usable</label>
              <label className="flex items-center gap-1"><input type="radio" name={`c-${k}`} checked={d.parts![k].condition === 'NOT_USABLE'} onChange={() => setPart(k, { condition: 'NOT_USABLE' })} /> Not usable</label>
            </div>
          </div>))}
      </div>}

      {code === 'JOB-010' && <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-700">Parts fitted (leave a part empty if it comes by WSR)</div>
        {PARTS.map((k) => <label key={k} className="block text-xs text-slate-600">{PART_NAME[k]} number<input className={inputCls} value={d.parts![k].no} onChange={(e) => setPart(k, { no: e.target.value })} /></label>)}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!d.powder_applied} onChange={(e) => set({ powder_applied: e.target.checked })} /> Powder applied</label>
      </div>}

      <button className={`${btnPrimary} min-h-12 w-full text-base`} disabled={busy} onClick={submit}>{label}</button>
    </div>
  );
}

function Photo({ d, set }: { d: WorkFormData; set: (p: Partial<WorkFormData>) => void }) {
  return (
    <label className="block text-xs text-slate-600">Photo (optional)
      <input className={inputCls} type="file" accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if (f) shrinkPhoto(f).then((p) => set({ photo: p })).catch(() => set({ photo: null })); }} />
      {d.photo && <img src={d.photo} alt="Step" className="mt-1 h-20 rounded-lg border border-slate-200 object-cover" />}
    </label>
  );
}

/** "Set tyre not available": the Tyre Man says why; the Tyre IC gets a complaint and provides another tyre. */
export function UnavailableDlg({ busy, onClose, onSave }: { busy: boolean; onClose: () => void; onSave: (remarks: string) => void }) {
  const [r, setR] = useState('');
  return (
    <Modal title="Set tyre not available" onClose={onClose}>
      <p className="mb-2 text-sm text-slate-600">A complaint &quot;Set tyre not available&quot; goes to the Tyre IC. This Fitment waits until another tyre is provided, and the tyre you were given is returned by an MRN.</p>
      <textarea className={inputCls} rows={3} placeholder="Remarks (optional)" value={r} onChange={(e) => setR(e.target.value)} />
      <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={onClose} disabled={busy}>Cancel</button><button className={btnPrimary} disabled={busy} onClick={() => onSave(r)}>Raise complaint</button></div>
    </Modal>
  );
}
