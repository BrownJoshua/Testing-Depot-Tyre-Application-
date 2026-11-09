import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { completeJobId, startJobId, type Row } from '../../lib/jobs';
import { holdJob, loadRound, resumeJob, STEP_LABEL, type RoundCtx } from '../../lib/rounds';
import { createSrn, loadCardDocs, PART_LABEL, type CardDocs } from '../../lib/stock';
import { Banner, btnPlain, btnPrimary } from '../../components/ui';
import { CardBadge } from '../../components/OpsBits';
import { HoldDlg } from './TmFleet';
import { blankScrap, ScrapLines, type ScrapRow } from './TmStock';

const ORDER = ['JOB-008', 'JOB-011', 'JOB-010', 'JOB-009'];

/** Work pop-up of a Tyre Changing / Setting / Unsetting job card: the steps in order with their material, orders and the action of each. */
export function TmWork() {
  const { cardId } = useParams();
  const { me } = useAuth();
  const [ctx, setCtx] = useState<RoundCtx | null>(null);
  const [docs, setDocs] = useState<CardDocs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [holding, setHolding] = useState<Row | null>(null);
  const [review, setReview] = useState<Row | null>(null);
  const [scrapYes, setScrapYes] = useState<boolean | null>(null);
  const [scrap, setScrap] = useState<ScrapRow[]>(blankScrap());

  const load = useCallback(() => { if (cardId) Promise.all([loadRound(), loadCardDocs(cardId)]).then(([c, d]) => { setCtx(c); setDocs(d); }).catch((e: Error) => setError(e.message)); }, [cardId]);
  useEffect(load, [load]);

  const card = ctx?.cards.find((c) => c.id === cardId);
  const fleet = ctx?.fleets.find((f) => f.id === card?.fleet_id);
  const fleetOf = (id: string | null) => ctx?.fleets.find((f) => f.id === id)?.fleet_no;
  const jobs = (ctx?.jobIds ?? []).filter((j) => j.job_card_id === cardId).sort((a, b) => ORDER.indexOf(ctx!.jobs.find((x) => x.id === a.job_code_id)?.job_code) - ORDER.indexOf(ctx!.jobs.find((x) => x.id === b.job_code_id)?.job_code) || a.job_id_no.localeCompare(b.job_id_no));
  const mine = (j: Row) => ctx!.assignees.some((a) => a.job_id_ref === j.id && a.employee_id === me?.employee_id);
  const who = (j: Row) => ctx!.assignees.filter((a) => a.job_id_ref === j.id).map((a) => ctx!.staff.find((s) => s.id === a.employee_id)?.full_name).filter(Boolean).join(', ') || '—';
  const tyreNo = (id: string | null) => ctx!.tyres.find((t) => t.id === id)?.mtc_no ?? '—';
  const locked = (j: Row) => (j.wait_for ?? []).some((w: string) => !['DONE', 'CLOSED'].includes(jobs.find((x) => x.id === w)?.status ?? 'DONE'));
  const isLast = (j: Row) => !jobs.some((x) => x.id !== j.id && !['DONE', 'CLOSED'].includes(x.status));

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setError(null); setNotice(null);
    try { await fn(); setNotice(ok); setReview(null); setScrapYes(null); setScrap(blankScrap()); setHolding(null); load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (!ctx || !docs) return error ? <Banner kind="error">{error}</Banner> : <p className="text-slate-500">Loading…</p>;
  if (!card) return <Banner kind="info">Job card not found.</Banner>;
  const firstCode = ctx.jobs.find((x) => x.id === jobs[0]?.job_code_id)?.job_code;
  const title = firstCode === 'JOB-010' && jobs.length === 1 ? 'Tyre Setting' : firstCode === 'JOB-011' && jobs.length === 1 ? 'Tyre Unsetting' : 'Tyre Changing';

  return (
    <div className="space-y-3 pb-4">
      <Link to="/tm" className="text-sm font-medium text-blue-700">‹ My Jobs</Link>
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
        <KV k="Job card" v={card.job_card_no} /><KV k="Fleet" v={fleet ? `${fleet.fleet_no} · ${fleet.registration_no} · In depot${card.fleet2_id ? ` ⇄ ${fleetOf(card.fleet2_id)}` : ''}` : 'No fleet'} />
        <KV k="Due" v={`${card.expected_date}${ctx.shifts.find((s) => s.id === card.expected_shift_id) ? ' · ' + ctx.shifts.find((s) => s.id === card.expected_shift_id)?.shift_name + ' shift' : ''}`} />
        {card.instruction && <KV k="Instruction" v={card.instruction} />}
      </div>

      {jobs.map((j, i) => {
        const code = ctx.jobs.find((x) => x.id === j.job_code_id)?.job_code as string;
        const wsrLines = docs.lines.filter((l) => l.job_id_ref === j.id);
        const pendingGin = wsrLines.some((l) => l.receive_status === 'PENDING');
        const orders = docs.orders.filter((o) => o.job_id_ref === j.id);
        const blocked = locked(j);
        return (
          <div key={j.id} className={`rounded-xl border bg-white p-3 text-sm ${mine(j) ? 'border-blue-300' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between"><div className="font-semibold">{i + 1} · {STEP_LABEL[code] ?? code}{!mine(j) && ` · ${who(j)}`}</div>{j.on_hold ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">On hold</span> : <CardBadge status={j.status} />}</div>
            <KV k="Job ID" v={j.job_id_no} /><KV k="Assigned to" v={mine(j) ? `${who(j)} (you)` : who(j)} />
            <KV k={code === 'JOB-008' ? 'Tyre coming off' : code === 'JOB-009' ? 'Tyre going on' : 'Tyre'} v={tyreNo(j.tyre_id)} />
            {orders.map((o) => <KV key={o.id} k={o.order_type === 'REMOVAL' ? 'Removal Order' : 'Fitment Order'} v={`${o.order_no} · ${PART_LABEL[o.part]}${o.position ? ' ' + o.position : ''} · ${o.status === 'DONE' ? 'Done' : 'Created'}`} />)}
            {wsrLines.map((l) => <KV key={l.id} k={`WSR ${PART_LABEL[l.part]}`} v={`${docs.wsrs.find((w) => w.id === l.wsr_id)?.wsr_no ?? ''} · ${l.receive_status === 'ACCEPTED' ? 'received' : l.receive_status === 'PENDING' ? 'receive the GIN' : l.line_status === 'REQUESTED' ? 'waiting for issue' : l.receive_status ?? ''}`} />)}
            {j.status === 'WAITING_FOR_TYRE' && <p className="mt-1 text-xs font-semibold text-orange-700">Waiting for a tyre. The Tyre IC provides it.</p>}
            {blocked && j.status === 'ASSIGNED' && <p className="mt-1 text-xs text-slate-500">Waiting for the earlier step</p>}
            {j.on_hold && <p className="mt-1 text-xs text-amber-700">Hold: {j.hold_remarks}</p>}

            {mine(j) && review?.id === j.id ? (
              <div className="mt-2 space-y-2 rounded-lg border border-slate-200 p-3">
                <div className="font-semibold">Scrap return available?</div>
                <div className="grid grid-cols-2 gap-2"><button className={`${scrapYes === true ? btnPrimary : btnPlain} min-h-12`} onClick={() => setScrapYes(true)}>Yes</button><button className={`${scrapYes === false ? btnPrimary : btnPlain} min-h-12`} onClick={() => setScrapYes(false)}>No</button></div>
                {scrapYes && <ScrapLines rows={scrap} setRows={setScrap} />}
                <div className="grid grid-cols-2 gap-2"><button className={`${btnPlain} min-h-12`} onClick={() => setReview(null)}>Back</button>
                  <button className={`${btnPrimary} min-h-12`} disabled={busy || scrapYes === null || (scrapYes && scrap.some((r) => !(Number(r.qty) > 0)))}
                    onClick={() => void act(async () => { await completeJobId(j.id, null); if (scrapYes) await createSrn(card.id, scrap.map((r) => ({ material: r.material, qty: Number(r.qty), unit: r.unit })), ''); }, `${j.job_id_no} completed.`)}>Complete</button></div>
              </div>
            ) : mine(j) && (
              <div className="mt-2 grid grid-cols-1 gap-2">
                {pendingGin && <Link to="/tm/grn" className={`${btnPlain} min-h-12 text-center leading-8`}>Receive GIN</Link>}
                {j.status === 'ASSIGNED' && <button className={`${btnPrimary} min-h-12 text-base`} disabled={busy || blocked} onClick={() => void act(() => startJobId(j.id), `Work started on ${j.job_id_no}.`)}>Start {STEP_LABEL[code]?.toLowerCase()}</button>}
                {j.status === 'STARTED' && <button className={`${btnPrimary} min-h-12 text-base`} disabled={busy} onClick={() => (isLast(j) ? (setReview(j), setScrapYes(null)) : void act(() => completeJobId(j.id, null), `${j.job_id_no} completed.`))}>Complete {STEP_LABEL[code]?.toLowerCase()}</button>}
                {['ASSIGNED', 'STARTED'].includes(j.status) && !j.on_hold && <button className={`${btnPlain} min-h-12`} onClick={() => setHolding(j)}>Hold job</button>}
                {j.on_hold && <button className={`${btnPlain} min-h-12`} disabled={busy} onClick={() => void act(() => resumeJob(j.id), 'Job resumed.')}>Resume</button>}
                {['ASSIGNED', 'STARTED'].includes(j.status) && ['JOB-009', 'JOB-010'].includes(code) && <Link to={`/tm/wsr?card=${card.id}&job=${j.id}`} className={`${btnPlain} min-h-12 text-center leading-8`}>Raise extra WSR</Link>}
              </div>
            )}
          </div>
        );
      })}
      {holding && <HoldDlg onClose={() => setHolding(null)} onSave={(r) => void act(() => holdJob(holding.id, r), 'Job put on hold. The Tyre IC is informed.')} />}
    </div>
  );
}
const KV = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between gap-3 py-0.5"><span className="text-slate-500">{k}</span><span className="text-right font-medium text-slate-800">{v}</span></div>;
