import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { listRequests, submitRequest, withdrawRequest, friendlyError, type ChangeRequest } from '../lib/masters';
import { entityByType, loadCtx, type Ctx } from '../lib/entities';

/** where a draft is edited: the vendor form, or the generic master form */
const draftPath = (r: ChangeRequest) => {
  const def = entityByType(r.entity_type);
  return def ? `/ho/m/${def.slug}/new?draft=${r.id}` : `/ho/vendors/new?draft=${r.id}`;
};
import { RequestCard } from '../components/RequestCard';
import { Banner, btnPlain, btnPrimary, PageHeader, ReasonDialog } from '../components/ui';

/** HO: every master-data change request, with the actions that are legal for its status. */
export function MyRequests() {
  const location = useLocation();
  const [reqs, setReqs] = useState<ChangeRequest[] | null>(null);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>((location.state as { notice?: string } | null)?.notice ?? null);
  const [withdraw, setWithdraw] = useState<ChangeRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([listRequests(), loadCtx()])
      .then(([r, c]) => { setReqs(r); setCtx(c); })
      .catch((e: Error) => setError(friendlyError(e.message)));
  }, []);
  useEffect(load, [load]);

  async function submit(r: ChangeRequest) {
    setError(null); setNotice(null);
    try { await submitRequest(r.id); setNotice(`${r.request_no} was sent to AM for approval.`); load(); }
    catch (e) { setError((e as Error).message); }
  }
  async function doWithdraw(remarks: string) {
    if (!withdraw) return;
    setBusy(true); setDialogError(null);
    try { await withdrawRequest(withdraw.id, remarks); setNotice(`${withdraw.request_no} was withdrawn.`); setWithdraw(null); load(); }
    catch (e) { setDialogError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="My change requests" subtitle="Master-data changes you have proposed, and where each one stands." />
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}
      {reqs === null && !error && <p className="text-slate-500">Loading…</p>}
      {reqs?.length === 0 && <Banner kind="info">No requests yet. Start from <Link className="underline" to="/ho/vendors">Vendor Master</Link>.</Banner>}
      <div className="space-y-3">
        {ctx && reqs?.map((r) => (
          <RequestCard key={r.id} request={r} ctx={ctx}
            actions={<>
              {r.status === 'DRAFT' && <Link className={btnPlain} to={draftPath(r)}>Edit draft</Link>}
              {r.status === 'DRAFT' && <button className={btnPrimary} onClick={() => void submit(r)}>Send for approval</button>}
              {r.status === 'PENDING_APPROVAL' && <button className={btnPlain} onClick={() => { setDialogError(null); setWithdraw(r); }}>Withdraw</button>}
            </>} />
        ))}
      </div>
      {withdraw && (
        <ReasonDialog title={`Withdraw ${withdraw.request_no}?`} confirmLabel="Withdraw" required danger busy={busy} error={dialogError}
          label="Why are you withdrawing it? (required)" onConfirm={(t) => void doWithdraw(t)} onCancel={() => setWithdraw(null)} />
      )}
    </div>
  );
}
