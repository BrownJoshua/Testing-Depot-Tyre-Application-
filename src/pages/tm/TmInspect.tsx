import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { decideInspection, loadJobs, type JobsCtx } from '../../lib/jobs';
import { InspectDlg } from '../JobCardDetail';
import { Banner } from '../../components/ui';

/** Tyre Man: do an inspection assigned to him (approve or reject each complaint, add new ones). */
export function TmInspect() {
  const { id } = useParams();
  const nav = useNavigate();
  const [ctx, setCtx] = useState<JobsCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadJobs().then(setCtx).catch((e: Error) => setError(e.message)); }, []);
  const card = ctx?.cards.find((c) => c.id === id);
  const ins = ctx?.inspections.find((i) => i.job_card_id === id && i.status === 'ASSIGNED');

  if (!ctx) return error ? <Banner kind="error">{error}</Banner> : <p className="text-slate-500">Loading…</p>;
  if (!card || !ins) return <Banner kind="info">There is no open inspection for this job card.</Banner>;
  return (
    <InspectDlg ctx={ctx} card={card} ins={ins} complaints={ctx.complaints.filter((c) => c.inspection_id === ins.id && c.state === 'PENDING_INSPECTION')}
      busy={busy} error={error} onCancel={() => nav('/tm')}
      onSave={(d, f, r) => { setBusy(true); setError(null); decideInspection(ins.id, d, f, r).then(() => nav('/tm')).catch((e: Error) => { setError(e.message); setBusy(false); }); }} />
  );
}
