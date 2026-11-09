import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { loadRound, fleetStatus, ROUND_LABEL, type Row, type RoundCtx } from '../../lib/rounds';
import { all } from '../../lib/ops';
import { useAuth } from '../../lib/auth';
import { fmtDateTime } from '../../lib/masters';
import { Banner } from '../../components/ui';

const TONE = { green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800', slate: 'bg-slate-100 text-slate-700', red: 'bg-red-100 text-red-800', blue: 'bg-blue-100 text-blue-800' };
const longDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

function useRound() {
  const [ctx, setCtx] = useState<RoundCtx | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { loadRound().then(setCtx).catch((e: Error) => setError(e.message)); }, []);
  return { ctx, error };
}
/** my fleet cards that contain a Job ID of this job code */
function myCards(ctx: RoundCtx, code: string, me: string | undefined) {
  const jc = ctx.jobs.find((j) => j.job_code === code);
  const mine = new Set(ctx.assignees.filter((a) => a.employee_id === me).map((a) => a.job_id_ref));
  const cardIds = [...new Set(ctx.jobIds.filter((j) => j.job_code_id === jc?.id && mine.has(j.id)).map((j) => j.job_card_id))];
  return ctx.cards.filter((c) => cardIds.includes(c.id)).sort((a, b) => (ctx.fleets.find((f) => f.id === a.fleet_id)?.fleet_no ?? '').localeCompare(ctx.fleets.find((f) => f.id === b.fleet_id)?.fleet_no ?? ''));
}
const Back = ({ to, label }: { to: string; label: string }) => <Link to={to} className="text-sm font-medium text-blue-700">‹ {label}</Link>;

/** Round: the list of my fleets for one job code, with the n/6 status of each */
export function TmRound() {
  const { code = '' } = useParams();
  const { me } = useAuth();
  const { ctx, error } = useRound();
  const cards = ctx ? myCards(ctx, code, me?.employee_id) : [];
  const done = ctx ? cards.filter((c) => fleetStatus(ctx, c.id, me?.employee_id).label === 'Done').length : 0;
  const first = cards[0];
  const fleetOf = (c: Row) => ctx?.fleets.find((f) => f.id === c.fleet_id);
  const shift = ctx?.shifts.find((s) => s.id === first?.expected_shift_id)?.shift_name;
  const air = code === 'JOB-001' || code === 'JOB-002';
  return (
    <div className="space-y-3">
      <Back to="/tm" label="My Jobs" />
      <h1 className="text-xl font-bold text-slate-900">{ROUND_LABEL[code] ?? code}</h1>
      {error && <Banner kind="error">{error}</Banner>}
      {!ctx && !error && <p className="text-slate-500">Loading…</p>}
      {ctx && <>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Round</span><span>{first ? longDate(first.expected_date) : '—'}{shift ? ` · ${shift}` : ''}</span></div>
          {air && <div className="flex justify-between"><span className="text-slate-500">Air type</span><span>{code === 'JOB-002' ? 'Nitrogen' : 'Regular'}</span></div>}
          <div className="flex justify-between"><span className="text-slate-500">Job cards</span><span>{cards.length} · one per fleet</span></div>
          {air && <Link to={`/tm/norms?back=/tm/round/${code}`} className="mt-1 inline-block font-medium text-blue-700">📏 PSI norms</Link>}
        </div>
        <div className="text-sm font-semibold text-slate-700">{done}/{cards.length} done</div>
        {cards.length === 0 && <Banner kind="info">No fleets of this kind are assigned to you.</Banner>}
        {cards.map((c) => { const st = fleetStatus(ctx, c.id, me?.employee_id); const f = fleetOf(c); return (
          <Link key={c.id} to={`/tm/fleet/${c.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
            <div><div className="text-lg font-bold text-slate-900">{f?.fleet_no ?? 'No fleet'}</div><div className="text-xs text-slate-500">{f?.registration_no} · {c.job_card_no}</div></div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[st.tone]}`}>{st.label}</span>
          </Link>); })}
      </>}
    </div>
  );
}

/** Month list (Rotation / Discout): my fleets of the month by week */
export function TmMonth() {
  const { code = '' } = useParams();
  const { me } = useAuth();
  const { ctx, error } = useRound();
  const month = ctx?.today.slice(0, 7) ?? '';
  const cards = ctx ? myCards(ctx, code, me?.employee_id).filter((c) => c.expected_date.startsWith(month)).sort((a, b) => a.expected_date.localeCompare(b.expected_date)) : [];
  const weeks: Record<number, Row[]> = {};
  for (const c of cards) (weeks[Math.min(4, Math.floor((Number(c.expected_date.slice(8)) - 1) / 7))] ??= []).push(c);
  const sched = ctx && code === 'JOB-004' ? 'Rotation' : 'Discout';
  const nDone = ctx ? cards.filter((c) => fleetStatus(ctx, c.id, me?.employee_id).label === 'Done').length : 0;
  return (
    <div className="space-y-3">
      <Back to="/tm" label="My Jobs" />
      <h1 className="text-xl font-bold text-slate-900">{ROUND_LABEL[code] ?? sched}</h1>
      {error && <Banner kind="error">{error}</Banner>}
      {!ctx && !error && <p className="text-slate-500">Loading…</p>}
      {ctx && <>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Month</span><span>{new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Fleets</span><span>{cards.length} · one job card per fleet</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Done</span><span>{nDone} / {cards.length}</span></div>
        </div>
        {cards.length === 0 && <Banner kind="info">No {sched.toLowerCase()} is assigned to you this month.</Banner>}
        {Object.entries(weeks).map(([w, list]) => (
          <div key={w} className="space-y-2">
            <h2 className="pt-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Week {Number(w) + 1} · {list.length} fleet{list.length === 1 ? '' : 's'}</h2>
            {list.map((c) => {
              const st = fleetStatus(ctx, c.id, me?.employee_id); const overdue = st.label !== 'Done' && c.expected_date < ctx.today;
              return (
                <Link key={c.id} to={`/tm/fleet/${c.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                  <div><div className="font-bold text-slate-900">{ctx.fleets.find((f) => f.id === c.fleet_id)?.fleet_no}</div><div className="text-xs text-slate-500">{c.job_card_no} · FR ↔ FL · due {longDate(c.expected_date)}</div></div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[overdue ? 'red' : st.tone]}`}>{overdue ? 'Overdue' : st.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </>}
    </div>
  );
}

/** Air inflation norms (HO, read only) with the tolerance band */
export function TmNorms() {
  const { ctx, error } = useRound();
  const nav = useNavigate();
  const back = new URLSearchParams(location.search).get('back') ?? '/tm';
  return (
    <div className="space-y-3">
      <button className="text-sm font-medium text-blue-700" onClick={() => nav(back)}>‹ Back</button>
      <h1 className="text-xl font-bold text-slate-900">Air inflation norms</h1>
      <p className="text-sm text-slate-600">HO (Technical) norms, approved by AE. Inflate each tyre to the value for this fleet&apos;s air type.</p>
      {error && <Banner kind="error">{error}</Banner>}
      {!ctx && !error && <p className="text-slate-500">Loading…</p>}
      {ctx?.norms.filter((n) => n.status === 'ACTIVE').map((n) => (
        <div key={n.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <div className="font-semibold">{ctx.sizes.find((s) => s.id === n.size_id)?.size_code} · {n.construction === 'NYLON' ? 'Nylon' : 'Radial'}</div>
          <div className="mt-1 flex justify-between"><span className="text-slate-600">Front</span><span>{n.front_regular} PSI (Reg {n.front_regular} / Nit {n.front_nitrogen})</span></div>
          <div className="flex justify-between"><span className="text-slate-600">Rear</span><span>{n.rear_regular} PSI (Reg {n.rear_regular} / Nit {n.rear_nitrogen})</span></div>
        </div>
      ))}
      <p className="text-xs text-slate-500">Tolerance band: found pressure below target − 15 or above target + 10 is flagged to the Tyre IC.</p>
    </div>
  );
}

/** Notifications derived from what happened on my job cards */
export function TmNotifications() {
  const { ctx, error } = useRound();
  const [events, setEvents] = useState<Row[]>([]);
  const [gins, setGins] = useState<Row[]>([]);
  useEffect(() => { all('job_card_events', 'created_at', false).then(setEvents).catch(() => undefined); all('wsr_gins', 'issued_at', false).then(setGins).catch(() => undefined); }, []);
  const cardNo = (id: string) => ctx?.cards.find((c) => c.id === id);
  const fleetNo = (id: string) => ctx?.fleets.find((f) => f.id === cardNo(id)?.fleet_id)?.fleet_no ?? 'No fleet';
  const items: { at: string; title: string; text: string }[] = [
    ...events.filter((e) => /^(ASSIGNED_FOR_WORK|ASSIGNED_FOR_INSPECTION|FINAL_INSPECTION_(FAIL|REWORK)|HOLD|TYRE_PROVIDED)/.test(e.event) && cardNo(e.job_card_id)).map((e) => ({
      at: e.created_at, title: e.event.startsWith('ASSIGNED') ? 'Job assigned' : e.event.startsWith('FINAL') ? (e.event.endsWith('REWORK') ? 'Rework needed' : 'Final inspection failed') : e.event.startsWith('HOLD') ? 'Job on hold' : 'Tyre provided',
      text: `${cardNo(e.job_card_id)?.job_card_no} · ${fleetNo(e.job_card_id)}${e.remarks ? ` · ${e.remarks}` : ''}` })),
    ...gins.map((g) => ({ at: g.issued_at, title: 'WSR issued', text: `${g.gin_no} · receive it in GRN` })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
      {error && <Banner kind="error">{error}</Banner>}
      {!ctx && !error && <p className="text-slate-500">Loading…</p>}
      {ctx && items.length === 0 && <Banner kind="info">Nothing new.</Banner>}
      {items.map((n, i) => <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><div className="font-semibold">{n.title}</div><div className="text-slate-600">{n.text}</div><div className="mt-1 text-xs text-slate-400">{fmtDateTime(n.at)}</div></div>)}
      <Link to="/tm" className="block text-center text-sm font-medium text-blue-700 underline">Back to my jobs</Link>
    </div>
  );
}
