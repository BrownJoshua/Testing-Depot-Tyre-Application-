import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { raiseComplaint } from '../../lib/jobs';
import {
  completeFleet, fleetStatus, holdJob, jobCode, loadRound, POSITIONS, psiFlag, resumeJob, ROUND_LABEL, saveReading, WEAR_PATTERNS, type Row, type RoundCtx,
} from '../../lib/rounds';
import { Banner, btnPlain, btnPrimary, inputCls } from '../../components/ui';
import { Modal } from '../../components/OpsBits';

type F = { present: string; inflated: string; groove: string; grooves: string; wear: string; checked: boolean; remarks: string };
const blank: F = { present: '', inflated: '', groove: '', grooves: '', wear: '', checked: false, remarks: '' };
const CHECK = [['level_surface', 'Vehicle parked on level surface *', 'Answer No only if the job cannot proceed'], ['tyre_damage', 'Check for visible tyre damage/bulge *', 'Answer No to flag this as a defect'], ['gauge', 'Check current pressure with calibrated gauge *', 'Answer No only if the job cannot proceed']] as const;

/** One fleet job card of a round: the readings of every tyre, complaints, checklist, hold, save and complete. */
export function TmFleet() {
  const { cardId } = useParams();
  const { me } = useAuth();
  const nav = useNavigate();
  const [ctx, setCtx] = useState<RoundCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, F>>({});
  const [odo, setOdo] = useState('');
  const [powder, setPowder] = useState(false);
  const [check, setCheck] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState('');
  const [complaintFor, setComplaintFor] = useState<{ tyre: string | null; label: string } | null>(null);
  const [holding, setHolding] = useState<Row | null>(null);

  const load = useCallback(() => { loadRound().then(setCtx).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);

  const card = ctx?.cards.find((c) => c.id === cardId);
  const fleet = ctx?.fleets.find((f) => f.id === card?.fleet_id);
  const myJobs = useMemo(() => (ctx?.jobIds ?? []).filter((j) => j.job_card_id === cardId && ctx!.assignees.some((a) => a.job_id_ref === j.id && a.employee_id === me?.employee_id))
    .sort((a, b) => {
      const pa = POSITIONS.indexOf(ctx!.tyres.find((t) => t.id === a.tyre_id)?.fitted_position ?? ''), pb = POSITIONS.indexOf(ctx!.tyres.find((t) => t.id === b.tyre_id)?.fitted_position ?? '');
      return (pa < 0 ? 9 : pa) - (pb < 0 ? 9 : pb) || a.job_id_no.localeCompare(b.job_id_no);
    }), [ctx, cardId, me?.employee_id]);
  const code = myJobs[0] ? jobCode(ctx!, myJobs[0]) : undefined;
  const open = myJobs.filter((j) => !['DONE', 'CLOSED'].includes(j.status));

  // fill the form from the saved readings once
  useEffect(() => {
    if (!ctx || !myJobs.length) return;
    setForm((cur) => {
      const next = { ...cur };
      for (const j of myJobs) if (!next[j.id]) {
        const r = ctx.readings.find((x) => x.job_id_ref === j.id);
        next[j.id] = r ? { present: r.present_psi ?? '', inflated: r.inflated_psi ?? '', groove: r.groove_readings ?? '', grooves: r.grooves ?? '', wear: r.wear_pattern ?? '', checked: r.checked, remarks: r.remarks ?? '' } : { ...blank };
      }
      return next;
    });
    const r0 = ctx.readings.find((x) => x.job_id_ref === myJobs[0].id);
    if (r0?.odometer_km != null) setOdo((o) => o || String(r0.odometer_km));
    const cl = ctx.checklists.find((x) => x.job_card_id === cardId);
    if (cl) { setCheck((c) => (Object.keys(c).length ? c : cl.answers)); setRemarks((r) => r || cl.remarks || ''); }
  }, [ctx, myJobs, cardId]);

  const tyre = (j: Row) => ctx?.tyres.find((t) => t.id === j.tyre_id);
  const target = (j: Row) => ctx?.targets.find((t) => t.tyre_id === j.tyre_id)?.target_psi as number | undefined;
  const upd = (id: string, p: Partial<F>) => setForm((f) => ({ ...f, [id]: { ...f[id], ...p } }));

  const payload = (j: Row): Record<string, unknown> => {
    const f = form[j.id] ?? blank;
    if (code === 'JOB-001' || code === 'JOB-002') return { present_psi: f.present, inflated_psi: f.inflated, remarks: f.remarks };
    if (code === 'JOB-003') return { checked: f.checked, remarks: f.remarks };
    if (code === 'JOB-006') return { groove_readings: f.groove, grooves: f.grooves || tyre(j)?.groove_count || undefined, wear_pattern: f.wear, remarks: f.remarks };
    return { odometer_km: odo, powder_applied: code === 'JOB-005' ? powder : undefined };
  };
  const hasInput = (j: Row) => { const f = form[j.id] ?? blank; return code === 'JOB-003' ? f.checked : code === 'JOB-006' ? f.groove !== '' : code === 'JOB-004' || code === 'JOB-005' ? odo !== '' : f.present !== '' || f.inflated !== ''; };

  async function run(fn: () => Promise<unknown>, ok: string, then?: () => void) {
    setBusy(true); setError(null); setNotice(null);
    try { await fn(); setNotice(ok); load(); then?.(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const saveAll = async () => { for (const j of open) if (hasInput(j)) await saveReading(j.id, payload(j)); };
  const complete = (done: string) => run(async () => { await saveAll(); await completeFleet(cardId!, code === 'JOB-001' || code === 'JOB-002' ? check : null, remarks); }, done, () => nav(`/tm/${code === 'JOB-004' || code === 'JOB-005' ? 'month' : 'round'}/${code}`));

  if (!ctx) return error ? <Banner kind="error">{error}</Banner> : <p className="text-slate-500">Loading…</p>;
  if (!card || !code) return <Banner kind="info">This job card has nothing for you to work on.</Banner>;
  const st = fleetStatus(ctx, card.id, me?.employee_id);
  const air = code === 'JOB-001' || code === 'JOB-002';
  const finished = open.length === 0;
  const rotation = code === 'JOB-004' || code === 'JOB-005';
  const heldJob = myJobs.find((j) => j.on_hold);

  return (
    <div className="space-y-3 pb-4">
      <Link to={rotation ? `/tm/month/${code}` : `/tm/round/${code}`} className="text-sm font-medium text-blue-700">‹ Round</Link>
      <h1 className="text-xl font-bold text-slate-900">{ROUND_LABEL[code]} · {fleet?.fleet_no}</h1>
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
        <Row2 k="Fleet" v={`${fleet?.fleet_no} · ${fleet?.registration_no}`} />
        {air && <Row2 k="Air · Target PSI (HO)" v={`${fleet?.air_type === 'NITROGEN' ? 'Nitrogen' : 'Regular'} air · Front ${ctx.targets.find((t) => t.fleet_id === fleet?.id && ['FR', 'FL'].includes(t.fitted_position))?.target_psi ?? '—'} / Rear ${ctx.targets.find((t) => t.fleet_id === fleet?.id && !['FR', 'FL'].includes(t.fitted_position))?.target_psi ?? '—'}`} />}
        <Row2 k="Job Card No" v={card.job_card_no} />
        <Row2 k="Due" v={`${card.expected_date}${ctx.shifts.find((s) => s.id === card.expected_shift_id) ? ' · ' + ctx.shifts.find((s) => s.id === card.expected_shift_id)?.shift_name : ''}`} />
        <Row2 k="Status" v={heldJob ? `On hold · ${heldJob.hold_remarks}` : finished ? 'Done' : st.label} />
        {air && <Link to={`/tm/norms?back=/tm/fleet/${cardId}`} className="mt-1 inline-block font-medium text-blue-700">see all norms</Link>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={btnPlain} onClick={() => setComplaintFor({ tyre: null, label: 'this fleet' })}><AlertTriangle size={14} className="mr-1 inline" />Raise a complaint on this fleet</button>
        {!finished && !heldJob && <button className={btnPlain} onClick={() => setHolding(open[0])}>Hold job</button>}
        {heldJob && <button className={btnPlain} disabled={busy} onClick={() => void run(async () => { for (const j of myJobs.filter((x) => x.on_hold)) await resumeJob(j.id); }, 'Job resumed.')}>Resume</button>}
      </div>

      {rotation ? (
        <div className="space-y-2">
          {myJobs.map((j, i) => <div key={j.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><div className="font-semibold">{i + 1} · {tyre(j)?.fitted_position ?? '—'} {i === 0 ? '(due tyre)' : '(partner)'} <span className="font-normal text-slate-500">· {j.status === 'DONE' ? 'Done' : 'Assigned to you'}</span></div>
            <div className="text-slate-600">Job ID {j.job_id_no} · Tyre {tyre(j)?.mtc_no}</div></div>)}
          {code === 'JOB-005' && <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><div className="text-slate-500">Each tyre</div><div>Unset → same tube, flap and disc → powder → set</div>
            <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={powder} onChange={(e) => setPowder(e.target.checked)} /> Powder applied</label></div>}
          {!finished && <label className="block text-sm font-medium text-slate-700">Odometer (km) *<input className={inputCls} type="number" min="0" inputMode="numeric" value={odo} onChange={(e) => setOdo(e.target.value)} /></label>}
        </div>
      ) : code === 'JOB-003' ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 grid grid-cols-3 gap-2 text-center text-sm">
            {['FL', 'FR', 'RLO', 'RLI', 'RRI', 'RRO'].map((p) => { const j = myJobs.find((x) => tyre(x)?.fitted_position === p); const f = j && form[j.id]; return (
              <button key={p} disabled={!j || j.status === 'DONE'} onClick={() => j && upd(j.id, { checked: !f?.checked })} className={`min-h-14 rounded-lg border p-2 ${f?.checked ? 'border-green-400 bg-green-50 font-semibold' : 'border-slate-300'}`}>{f?.checked ? '✓ ' : ''}{p}<div className="text-xs font-normal text-slate-500">{j && tyre(j)?.mtc_no}</div></button>); })}
          </div>
          <p className="text-xs text-slate-500">Tap a tyre to mark it checked. A defect: use the warning button below the list.</p>
          <div className="mt-2 space-y-1">{myJobs.map((j) => <button key={j.id} className="mr-2 text-xs font-medium text-blue-700 underline" onClick={() => setComplaintFor({ tyre: j.tyre_id, label: `${tyre(j)?.fitted_position} ${tyre(j)?.mtc_no}` })}>⚠ {tyre(j)?.fitted_position}</button>)}</div>
          <p className="mt-2 text-sm font-medium text-green-700">{myJobs.every((j) => form[j.id]?.checked) ? 'All 6 tyres checked' : `${myJobs.filter((j) => form[j.id]?.checked).length} of ${myJobs.length} checked`}</p>
        </div>
      ) : (
        myJobs.map((j) => { const f = form[j.id] ?? blank; const t = tyre(j); const tg = target(j); const flag = psiFlag(f.present === '' ? null : Number(f.present), tg ?? null);
          return (
            <div key={j.id} className={`rounded-xl border bg-white p-3 ${flag ? 'border-amber-400' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-2"><div><div className="font-bold text-slate-900">{t?.fitted_position} · {t?.mtc_no}</div><div className="text-xs text-slate-500">NSD {t?.nsd_mm ?? '—'} · {t?.tyre_condition ?? '—'}{air && tg ? ` · target ${tg}` : ''}</div></div>
                <button aria-label={`Raise a complaint ${t?.mtc_no}`} className="rounded-lg border border-slate-300 px-2 py-1" onClick={() => setComplaintFor({ tyre: j.tyre_id, label: `${t?.fitted_position} ${t?.mtc_no}` })}>⚠</button></div>
              {air && <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-600">Present (found)<input className={inputCls} type="number" inputMode="numeric" disabled={j.status === 'DONE'} value={f.present} onChange={(e) => upd(j.id, { present: e.target.value })} /></label>
                <label className="text-xs text-slate-600">Inflated to<input className={inputCls} type="number" inputMode="numeric" disabled={j.status === 'DONE'} value={f.inflated} onChange={(e) => upd(j.id, { inflated: e.target.value })} /></label>
                {flag && <div className="col-span-2 text-xs font-semibold text-amber-700">⚠ {flag === 'LOW' ? 'Low' : 'High'} PSI: {Number(f.present) - (tg ?? 0) > 0 ? '+' : ''}{Number(f.present) - (tg ?? 0)} from target</div>}
              </div>}
              {code === 'JOB-006' && <div className="mt-2 space-y-2">
                {!t?.groove_count && <label className="block text-xs text-slate-600">Number of grooves<input className={inputCls} type="number" min="1" max="8" value={f.grooves} onChange={(e) => upd(j.id, { grooves: e.target.value })} /></label>}
                <label className="block text-xs text-slate-600">NSD (mm) · {t?.groove_count ?? (f.grooves || '?')} grooves * — type the readings joined by &quot;-&quot;<input className={inputCls} placeholder="12-13-10-10" disabled={j.status === 'DONE'} value={f.groove} onChange={(e) => upd(j.id, { groove: e.target.value.replace(/[^0-9.\-]/g, '') })} /></label>
                <div className="text-xs text-slate-500">Current NSD: {t?.nsd_mm ?? '—'}{f.groove && !f.groove.endsWith('-') ? ` · new NSD ${Math.min(...f.groove.split('-').filter(Boolean).map(Number))}` : ''}</div>
                <label className="block text-xs text-slate-600">Wear pattern *<select className={inputCls} disabled={j.status === 'DONE'} value={f.wear} onChange={(e) => upd(j.id, { wear: e.target.value })}><option value="">— select —</option>{WEAR_PATTERNS.map((w) => <option key={w}>{w}</option>)}</select></label>
              </div>}
            </div>); })
      )}

      {air && !finished && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <div className="mb-2 font-semibold">CIRT Checklist</div>
          {CHECK.map(([k, q, hint]) => <div key={k} className="mb-2"><div>{q}</div>
            <div className="mt-1 flex gap-2">{(['Y', 'N'] as const).map((v) => <button key={v} type="button" onClick={() => setCheck({ ...check, [k]: v })} className={`min-h-10 flex-1 rounded-lg border ${check[k] === v ? 'border-blue-600 bg-blue-50 font-semibold' : 'border-slate-300'}`}>{v === 'Y' ? 'Yes' : 'No'}</button>)}</div>
            <div className="text-xs text-slate-500">{hint}</div></div>)}
          <label className="block text-xs text-slate-600">Remarks<textarea className={inputCls} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></label>
        </div>
      )}

      {!finished && (
        <div className="grid grid-cols-1 gap-2">
          {!rotation && <button className={`${btnPlain} min-h-12 text-base`} disabled={busy} onClick={() => void run(saveAll, 'Saved.')}>Save progress</button>}
          <button className={`${btnPrimary} min-h-12 text-base`} disabled={busy} onClick={() => void complete(code === 'JOB-006' ? 'Census completed.' : code === 'JOB-003' ? 'Inspection completed.' : rotation ? 'Done.' : 'Fleet saved.')}>
            {code === 'JOB-006' ? 'Complete census' : code === 'JOB-003' ? 'No issues - complete inspection' : code === 'JOB-004' ? 'Complete rotation' : code === 'JOB-005' ? 'Complete discout' : 'Save & next fleet'}</button>
        </div>
      )}
      {finished && <Banner kind="ok">This fleet is done. The Tyre IC does the final inspection.</Banner>}

      {complaintFor && <ComplaintDlg ctx={ctx} fleetId={fleet!.id} target={complaintFor} onClose={() => setComplaintFor(null)} onDone={(m) => { setNotice(m); setComplaintFor(null); }} />}
      {holding && <HoldDlg onClose={() => setHolding(null)} onSave={(r) => void run(async () => { for (const j of open) await holdJob(j.id, r); }, 'Job put on hold. The Tyre IC is informed.', () => setHolding(null))} />}
    </div>
  );
}

const Row2 = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between gap-3 py-0.5"><span className="text-slate-500">{k}</span><span className="text-right font-medium text-slate-800">{v}</span></div>;

function ComplaintDlg({ ctx, fleetId, target, onClose, onDone }: { ctx: RoundCtx; fleetId: string; target: { tyre: string | null; label: string }; onClose: () => void; onDone: (m: string) => void }) {
  const [type, setType] = useState('');
  const [rem, setRem] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    setBusy(true); setErr(null);
    try { await raiseComplaint(fleetId, target.tyre, type, rem); onDone(`Complaint raised for ${target.label}.`); } catch (e) { setErr((e as Error).message); setBusy(false); }
  }
  return (
    <Modal title={`Raise a complaint · ${target.label}`} onClose={onClose}>
      {err && <Banner kind="error">{err}</Banner>}
      <select className={inputCls} aria-label="Complaint type" value={type} onChange={(e) => setType(e.target.value)}><option value="">Complaint type…</option>{ctx.complaintTypes.filter((t) => t.status === 'ACTIVE').map((t) => <option key={t.id} value={t.id}>{t.complaint_name}</option>)}</select>
      <textarea className={`${inputCls} mt-2`} rows={2} placeholder="Remarks" value={rem} onChange={(e) => setRem(e.target.value)} />
      <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={onClose} disabled={busy}>Cancel</button><button className={btnPrimary} disabled={busy || !type} onClick={() => void go()}>Raise complaint</button></div>
    </Modal>
  );
}
export function HoldDlg({ onClose, onSave }: { onClose: () => void; onSave: (r: string) => void }) {
  const [r, setR] = useState('');
  return (
    <Modal title="Hold job" onClose={onClose}>
      <textarea className={inputCls} rows={3} placeholder="Reason (required)" value={r} onChange={(e) => setR(e.target.value)} />
      <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={onClose}>Cancel</button><button className={btnPrimary} disabled={!r.trim()} onClick={() => onSave(r)}>Hold job</button></div>
    </Modal>
  );
}
