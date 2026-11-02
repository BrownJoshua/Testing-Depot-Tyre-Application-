import { useCallback, useEffect, useState } from 'react';
import { approveRequest, listRequests, rejectRequest, friendlyError, type ChangeRequest } from '../lib/masters';
import { loadCtx, type Ctx } from '../lib/entities';
import { RequestCard } from '../components/RequestCard';
import { Banner, btnDanger, btnPrimary, PageHeader, ReasonDialog } from '../components/ui';

type Pending = { request: ChangeRequest; kind: 'approve' | 'reject' };

/** AM: pending master-data changes (mode "pending") or decided ones (mode "history"). */
export function ApprovalInbox({ mode }: { mode: 'pending' | 'history' }) {
  const [reqs, setReqs] = useState<ChangeRequest[] | null>(null);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [act, setAct] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(() => {
    const statuses = mode === 'pending' ? (['PENDING_APPROVAL'] as const) : (['APPROVED', 'REJECTED', 'WITHDRAWN'] as const);
    Promise.all([listRequests([...statuses]), loadCtx()])
      .then(([r, c]) => { setReqs(r); setCtx(c); })
      .catch((e: Error) => setError(friendlyError(e.message)));
  }, [mode]);
  useEffect(() => { setReqs(null); load(); }, [load]);

  async function decide(remarks: string) {
    if (!act) return;
    setBusy(true); setDialogError(null);
    try {
      if (act.kind === 'approve') await approveRequest(act.request.id, remarks);
      else await rejectRequest(act.request.id, remarks);
      setNotice(`${act.request.request_no} was ${act.kind === 'approve' ? 'approved and applied' : 'rejected'}.`);
      setAct(null); load();
    } catch (e) { setDialogError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader
        title={mode === 'pending' ? 'Master change approvals' : 'Approval history'}
        subtitle={mode === 'pending' ? 'Changes proposed by HO. Nothing takes effect until you approve it.' : 'Requests that have been approved, rejected or withdrawn.'}
      />
      {error && <Banner kind="error">{error}</Banner>}
      {notice && <Banner kind="ok">{notice}</Banner>}
      {reqs === null && !error && <p className="text-slate-500">Loading…</p>}
      {reqs?.length === 0 && <Banner kind="info">{mode === 'pending' ? 'Nothing is waiting for your approval.' : 'No decided requests yet.'}</Banner>}
      <div className="space-y-3">
        {ctx && reqs?.map((r) => (
          <RequestCard key={r.id} request={r} ctx={ctx} startOpen={mode === 'pending'}
            actions={mode === 'pending' && <>
              <button className={btnDanger} onClick={() => { setDialogError(null); setAct({ request: r, kind: 'reject' }); }}>Reject</button>
              <button className={btnPrimary} onClick={() => { setDialogError(null); setAct({ request: r, kind: 'approve' }); }}>Approve</button>
            </>} />
        ))}
      </div>
      {act && (
        <ReasonDialog
          title={`${act.kind === 'approve' ? 'Approve' : 'Reject'} ${act.request.request_no}?`}
          confirmLabel={act.kind === 'approve' ? 'Approve and apply' : 'Reject'} danger={act.kind === 'reject'}
          required={act.kind === 'reject'} busy={busy} error={dialogError}
          onConfirm={(t) => void decide(t)} onCancel={() => setAct(null)} />
      )}
    </div>
  );
}
