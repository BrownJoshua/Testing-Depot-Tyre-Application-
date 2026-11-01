import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  createRequest, listCategories, listVendors, submitRequest, friendlyError,
  type RefValue, type Vendor,
} from '../lib/masters';
import { Banner, btnPlain, btnPrimary, cardCls, inputCls, PageHeader, ReasonDialog, StatusBadge } from '../components/ui';

/** Vendor Master register. Everyone signed in can read it; only HO can propose changes (AM approves them). */
export function VendorList() {
  const { me } = useAuth();
  const isHo = me?.role_code === 'HO';
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [cats, setCats] = useState<RefValue[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [toggle, setToggle] = useState<Vendor | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([listVendors(), listCategories()])
      .then(([v, c]) => { setVendors(v); setCats(c); })
      .catch((e: Error) => setError(friendlyError(e.message)));
  }, []);
  useEffect(load, [load]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (vendors ?? []).filter((v) => !t || `${v.vendor_code} ${v.vendor_name} ${v.city ?? ''}`.toLowerCase().includes(t));
  }, [vendors, q]);
  const catLabel = (id: string) => cats.find((c) => c.id === id)?.label ?? '—';

  async function sendToggle(summary: string) {
    if (!toggle) return;
    setBusy(true); setDialogError(null);
    try {
      const action = toggle.status === 'ACTIVE' ? 'DEACTIVATE' : 'REACTIVATE';
      const id = await createRequest('vendor', action, toggle.id, {}, summary);
      await submitRequest(id);
      setNotice(`Request to ${action.toLowerCase()} ${toggle.vendor_name} was sent to AM for approval.`);
      setToggle(null);
    } catch (e) {
      setDialogError((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader
        title="Vendor Master"
        subtitle={isHo ? 'Changes you propose go to AM (Tech) for approval before they take effect.' : 'Read-only register. Changes are proposed by HO and approved by you.'}
        action={isHo && <Link to="/ho/vendors/new" className={`${btnPrimary} inline-flex items-center gap-1.5`}><Plus size={16} /> Propose new vendor</Link>}
      />
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}

      <div className="relative mb-3 max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className={`${inputCls} pl-9`} placeholder="Search code, name or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search vendors" />
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2">Code</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">City</th><th className="px-4 py-2">Status</th>{isHo && <th className="px-4 py-2 text-right">Actions</th>}</tr>
          </thead>
          <tbody>
            {vendors === null && !error && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {vendors !== null && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No vendors match.</td></tr>}
            {rows.map((v) => (
              <tr key={v.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs">{v.vendor_code}</td>
                <td className="px-4 py-2 font-medium text-slate-900">{v.vendor_name}</td>
                <td className="px-4 py-2 text-slate-600">{catLabel(v.vendor_category_ref)}</td>
                <td className="px-4 py-2 text-slate-600">{v.city ?? '—'}</td>
                <td className="px-4 py-2"><StatusBadge status={v.status} /></td>
                {isHo && (
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <Link to={`/ho/vendors/${v.id}/edit`} className={btnPlain}>Propose change</Link>
                      <button type="button" className={btnPlain} onClick={() => { setDialogError(null); setToggle(v); }}>
                        {v.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">All vendors shown are fictional demonstration records.</p>

      {toggle && (
        <ReasonDialog
          title={`${toggle.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'} ${toggle.vendor_name}?`}
          label="Reason (shown to the approver)" confirmLabel="Send for approval" required busy={busy} error={dialogError}
          onConfirm={(t) => void sendToggle(t).then(load)} onCancel={() => setToggle(null)}
        />
      )}
    </div>
  );
}
