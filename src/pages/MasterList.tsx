import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { createRequest, friendlyError, submitRequest } from '../lib/masters';
import { entityBySlug, loadCtx, type Ctx, type Row } from '../lib/entities';
import { Banner, btnPlain, btnPrimary, cardCls, inputCls, PageHeader, ReasonDialog, StatusBadge } from '../components/ui';

/** Generic register for the tyre masters. Everyone reads; HO proposes; AM approves (elsewhere). */
export function MasterList() {
  const { slug } = useParams();
  const def = entityBySlug(slug);
  const { me } = useAuth();
  const isHo = me?.role_code === 'HO';
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [toggle, setToggle] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(() => { loadCtx().then(setCtx).catch((e: Error) => setError(friendlyError(e.message))); }, []);
  useEffect(() => { setCtx(null); setNotice(null); load(); }, [load, slug]);

  const rows = useMemo(() => {
    if (!def || !ctx) return [];
    const t = q.trim().toLowerCase();
    return def.rows(ctx).filter((r) => !t || def.columns.map((c) => c.value(r, ctx)).join(' ').toLowerCase().includes(t));
  }, [def, ctx, q]);

  if (!def) return <Banner kind="error">Unknown master.</Banner>;
  const base = me?.role_code === 'AM' ? '/am' : '/ho';

  async function sendToggle(summary: string) {
    if (!toggle || !def) return;
    setBusy(true); setDialogError(null);
    try {
      const action = toggle.status === 'ACTIVE' ? 'DEACTIVATE' : 'REACTIVATE';
      const id = await createRequest(def.type, action, toggle.id, {}, summary);
      await submitRequest(id);
      setNotice(`Request to ${action.toLowerCase()} this ${def.singular} was sent to AM for approval.`);
      setToggle(null); load();
    } catch (e) { setDialogError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader
        title={def.title}
        subtitle={isHo ? `Changes you propose go to AM (Tech) for approval. ${def.hint ?? ''}` : `Read-only register. ${def.hint ?? ''}`}
        action={isHo && <Link to={`/ho/m/${def.slug}/new`} className={`${btnPrimary} inline-flex items-center gap-1.5`}><Plus size={16} /> Propose new</Link>}
      />
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}
      <div className="relative mb-3 max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className={`${inputCls} pl-9`} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>{def.columns.map((c) => <th key={c.label} className="px-4 py-2">{c.label}</th>)}<th className="px-4 py-2">Status</th>{isHo && <th className="px-4 py-2 text-right">Actions</th>}</tr>
          </thead>
          <tbody>
            {!ctx && !error && <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {ctx && rows.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-500">{q ? 'Nothing matches.' : `No ${def.title.toLowerCase()} yet.`}</td></tr>}
            {ctx && rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                {def.columns.map((c, i) => <td key={c.label} className={`px-4 py-2 ${i === 0 ? 'font-medium text-slate-900' : 'text-slate-600'}`}>{c.value(r, ctx)}</td>)}
                <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                {isHo && (
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <Link to={`/ho/m/${def.slug}/${r.id}/edit`} className={btnPlain}>Propose change</Link>
                      <button type="button" className={btnPlain} onClick={() => { setDialogError(null); setToggle(r); }}>
                        {r.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isHo && <p className="mt-2 text-xs text-slate-500">Changes to this register are proposed by HO and approved in <Link className="underline" to={`${base}/approvals`}>Master change approvals</Link>.</p>}
      {toggle && ctx && (
        <ReasonDialog
          title={`${toggle.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'} this ${def.singular}?`}
          label="Reason (shown to the approver)" confirmLabel="Send for approval" required busy={busy} error={dialogError}
          onConfirm={(t) => void sendToggle(t)} onCancel={() => setToggle(null)} />
      )}
    </div>
  );
}
