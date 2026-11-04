import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createRequest, friendlyError, listRequests, submitRequest, updateRequest } from '../lib/masters';
import { entityBySlug, loadCtx, type Ctx, type FieldDef, type Row } from '../lib/entities';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader } from '../components/ui';

/** choosing a new value for the key clears the field that depends on it */
const DEPENDENT: Record<string, string> = { make_name: 'model_name', fleet_make: 'fleet_model' };
const sameValue =(a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Generic propose form driven by the entity definition (/ho/m/:slug/new, /ho/m/:slug/:id/edit, ?draft=<request id>). */
export function MasterForm() {
  const { slug, id } = useParams();
  const [params] = useSearchParams();
  const draftId = params.get('draft');
  const def = entityBySlug(slug);
  const nav = useNavigate();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [rec, setRec] = useState<Row | null>(null);
  const [orig, setOrig] = useState<Row>({});
  const [f, setF] = useState<Row>({});
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!def) return;
    (async () => {
      const c = await loadCtx(); setCtx(c);
      const draft = draftId ? (await listRequests(['DRAFT'])).find((r) => r.id === draftId) : undefined;
      if (draftId && !draft) throw new Error('That draft was not found.');
      const targetId = draft ? (draft.action === 'CREATE' ? null : draft.target_id) : id ?? null;
      let base: Row = {};
      if (targetId) {
        const row = def.rows(c).find((r) => r.id === targetId);
        if (!row) throw new Error('Record not found.');
        setRec(row); base = def.toForm(row, c);
      } else {
        for (const fd of def.fields) base[fd.key] = fd.kind === 'bool' ? false : fd.kind === 'multi' ? [] : '';
      }
      setOrig(base);
      setF(draft ? { ...base, ...draft.proposed_payload } : base);
      if (draft) setSummary(draft.change_summary ?? '');
    })().catch((e: Error) => setError(friendlyError(e.message)));
  }, [def, id, draftId]);

  if (!def) return <Banner kind="error">Unknown master.</Banner>;
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const norm = (fd: FieldDef, v: unknown) => {
    if (fd.kind === 'bool' || fd.kind === 'multi') return v;
    const s = typeof v === 'string' ? v.trim() : v;
    if (s === '' || s === undefined) return null;
    return fd.kind === 'number' ? Number(s) : s;
  };

  function buildPayload(): Row {
    const out: Row = {};
    for (const fd of def!.fields) {
      if (rec && fd.createOnly) continue;
      const v = norm(fd, f[fd.key]);
      const changed = rec ? !sameValue(v, norm(fd, orig[fd.key])) : (v !== null && !(Array.isArray(v) && v.length === 0 && fd.kind === 'multi') || !!fd.required);
      if (changed) out[fd.key] = v;
    }
    if (rec) for (const [k, extra] of Object.entries(def!.companions ?? {})) if (k in out) for (const x of extra) out[x] = norm(def!.fields.find((d) => d.key === x)!, f[x]);
    return out;
  }

  async function save(andSubmit: boolean) {
    setError(null);
    const payload = buildPayload();
    if (rec && Object.keys(payload).length === 0) { setError('Nothing has changed.'); return; }
    if (!summary.trim()) { setError('Please add a short reason for this request.'); return; }
    const missing = def!.fields.filter((fd) => fd.required && !(rec && fd.createOnly) && (payload[fd.key] === null || payload[fd.key] === undefined) && !rec);
    if (missing.length) { setError(`Please fill in: ${missing.map((m) => m.label).join(', ')}.`); return; }
    setBusy(true);
    let reqId = draftId;
    try {
      if (draftId) await updateRequest(draftId, payload, summary.trim());
      else reqId = await createRequest(def!.type, rec ? 'UPDATE' : 'CREATE', rec?.id ?? null, payload, summary.trim());
      if (andSubmit && reqId) await submitRequest(reqId);
      nav('/ho/requests', { state: { notice: andSubmit ? 'Request sent to AM for approval.' : 'Draft saved.' } });
    } catch (err) {
      const msg = (err as Error).message;
      setError(reqId && !draftId ? `${msg} (A draft was saved — open My change requests to fix it.)` : msg);
    } finally { setBusy(false); }
  }

  if (!ctx && !error) return <p className="text-slate-500">Loading…</p>;
  return (
    <div className="max-w-3xl">
      <PageHeader title={rec ? `Propose change: ${def.nameOf(orig)}` : `Propose a new ${def.singular}`}
        subtitle="Nothing changes until AM (Tech) approves. Only the fields you edit are sent." />
      {error && <Banner kind="error">{error}</Banner>}
      {ctx && (
        <form className={`${cardCls} space-y-4 p-4 sm:p-6`} onSubmit={(e) => { e.preventDefault(); void save(true); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            {def.fields.map((fd) => {
              const locked = !!rec && !!fd.createOnly;
              const wrap = fd.wide ? 'sm:col-span-2' : '';
              if (fd.kind === 'bool') return (
                <label key={fd.key} className={`flex items-center gap-2 text-sm font-medium text-slate-700 ${wrap}`}>
                  <input type="checkbox" checked={!!f[fd.key]} onChange={(e) => set(fd.key, e.target.checked)} /> {fd.label}
                </label>
              );
              if (fd.kind === 'multi') return (
                <fieldset key={fd.key} className={wrap}>
                  <legend className="mb-1 text-sm font-medium text-slate-700">{fd.label}</legend>
                  <div className="flex flex-wrap gap-4">
                    {fd.options!(ctx, f).map((o) => (
                      <label key={o.value} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" checked={(f[fd.key] as string[]).includes(o.value)}
                          onChange={(e) => {
                            const chosen = new Set(f[fd.key] as string[]);
                            if (e.target.checked) chosen.add(o.value); else chosen.delete(o.value);
                            set(fd.key, fd.options!(ctx, f).map((x) => x.value).filter((v) => chosen.has(v)));
                          }} />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
              return (
                <div key={fd.key} className={wrap}>
                  <Field label={fd.label} hint={locked ? 'Cannot be changed after creation.' : fd.hint}>
                    {fd.kind === 'select' ? (
                      <select className={inputCls} disabled={locked} value={(f[fd.key] as string) ?? ''}
                        onChange={(e) => { set(fd.key, e.target.value); const dep = DEPENDENT[fd.key]; if (dep && e.target.value !== f[fd.key]) set(dep, ''); }}>
                        <option value="">{fd.required ? 'Select…' : '— none —'}</option>
                        {fd.options!(ctx, f).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <input className={inputCls} disabled={locked} type={fd.kind === 'number' ? 'number' : fd.kind === 'date' ? 'date' : 'text'} step="any"
                        value={(f[fd.key] as string | number | null) ?? ''}
                        onChange={(e) => set(fd.key, fd.key.endsWith('_no') && fd.key !== 'chassis_no' || fd.key === 'size_code' || fd.key === 'job_code' || fd.key === 'complaint_code' || fd.key === 'schedule_code' ? e.target.value.toUpperCase() : e.target.value)} />
                    )}
                  </Field>
                </div>
              );
            })}
          </div>
          <Field label="Reason for this request (shown to the approver)">
            <textarea className={inputCls} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} required />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <Link to={`/ho/m/${def.slug}`} className={btnPlain}>Cancel</Link>
            <button type="button" className={btnPlain} disabled={busy} onClick={() => void save(false)}>Save as draft</button>
            <button type="submit" className={btnPrimary} disabled={busy}>{busy ? 'Working…' : 'Send for approval'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
