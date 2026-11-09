import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { all, rpc, type Row } from '../lib/ops';
import { daysBetween, ONGOING } from '../lib/jobs';
import { Banner, cardCls, PageHeader } from '../components/ui';
import { DepotAnalytics } from '../components/DepotAnalytics';

interface Data {
  cards: Row[]; complaints: Row[]; tyres: Row[]; depots: Row[]; chart: Row[]; today: string;
  wsrs: Row[]; mrns: Row[]; srns: Row[]; requests: Row[]; groups: Row[]; fleets: Row[]; items: Row[]; ctypes: Row[]; folios: Row[]; sizes: Row[];
}
const CLOSED = ['COMPLETED', 'CLOSED'];
const PLACE: Record<string, string> = { FITTED: 'Fitted', LIVE_STOCK: 'Live stock', AT_TRS: 'At TRS', AT_MIC: 'At MIC', AT_OTHER_DEPOT: 'Other depot', CENTRAL_STORE: 'Central Store', IN_TRANSIT: 'In transit', SCRAPPED: 'Scrapped' };

async function load(): Promise<Data> {
  const q = (t: string) => supabase.from(t).select('*').range(0, 4999).then((r) => { if (r.error) throw new Error(r.error.message); return (r.data ?? []) as Row[]; });
  const [cards, complaints, tyres, depots, chart, wsrs, mrns, srns, requests, groups, fleets, items, ctypes, folios, sizes, today] = await Promise.all([
    all('job_cards', 'created_at', false), all('complaints', 'raised_at', false), q('tyres'), all('org_units', 'code'), q('v_schedule_chart'),
    all('wsrs', 'created_at', false), all('mrns', 'created_at', false), all('srns', 'created_at', false),
    supabase.from('master_change_requests').select('id, status').eq('status', 'PENDING_APPROVAL').then((r) => (r.data ?? []) as Row[]),
    supabase.from('fleet_group_revisions').select('id, status').eq('status', 'PENDING_APPROVAL').then((r) => (r.data ?? []) as Row[]),
    supabase.from('fleets').select('id, status, org_unit_id').range(0, 4999).then((r) => (r.data ?? []) as Row[]), q('stock_items'),
    all('complaint_types', 'complaint_code'), all('tyre_folios', 'folio_no'), all('tyre_sizes', 'size_code'),
    rpc<string>('get_business_today', {}),
  ]);
  return { cards, complaints, tyres, depots, chart, today, wsrs, mrns, srns, requests, groups, fleets, items, ctypes, folios, sizes };
}

const Tile = ({ label, value, to, tone = 'slate', hint }: { label: string; value: number | string; to?: string; tone?: 'slate' | 'red' | 'amber' | 'green' | 'blue'; hint?: string }) => {
  const color = { slate: 'text-slate-900', red: 'text-red-700', amber: 'text-amber-700', green: 'text-green-700', blue: 'text-blue-700' }[tone];
  const body = <><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className={`text-2xl font-bold ${color}`}>{value}</div>{hint && <div className="text-xs text-slate-500">{hint}</div>}</>;
  return to ? <Link to={to} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-400">{body}</Link> : <div className="rounded-xl border border-slate-200 bg-white p-4">{body}</div>;
};

/** Role dashboard: counts and tables computed from what row-level security lets the signed-in role read. */
export function Dashboard() {
  const { me } = useAuth();
  const role = me?.role_code ?? 'TIC';
  const base = `/${role.toLowerCase()}`;
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { load().then(setD).catch((e: Error) => setError(e.message)); }, []);

  if (error) return <Banner kind="error">{error}</Banner>;
  if (!d) return <p className="text-slate-500">Loading…</p>;

  const open = d.cards.filter((c) => !CLOSED.includes(c.status) && c.status !== 'DRAFT' ? true : c.status === 'DRAFT');
  const overdue = d.cards.filter((c) => !CLOSED.includes(c.status) && daysBetween(c.expected_date, d.today) > 0);
  const live = d.tyres.filter((t) => t.stock_place === 'LIVE_STOCK');
  const depotName = (id: string) => d.depots.find((x) => x.id === id)?.name ?? id;
  const isDepot = role === 'TIC' || role === 'SUP';
  const dueToday = d.chart.filter((c) => c.due_date === d.today);
  const codes = [...new Set(dueToday.map((c) => c.schedule_code))].sort();
  const chartOverdue = d.chart.filter((c) => c.state === 'OVERDUE').length;
  const pct = (a: number, b: number) => (b === 0 ? '100%' : `${Math.round((a / b) * 100)}%`);

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" subtitle={`${isDepot ? 'Your depot' : 'All depots'} · ${d.today}`} />

      {isDepot && <>
        {role === 'TIC' && <DepotAnalytics d={d} overdueJobs={overdue.length + chartOverdue} base={base} />}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Open job cards" value={open.filter((c) => ONGOING.includes(c.status) || c.status === 'DRAFT').length} to={`${base}/job-cards`} tone="blue" />
          <Tile label="Overdue cards" value={overdue.length} to={`${base}/job-cards`} tone={overdue.length ? 'red' : 'green'} />
          <Tile label="New complaints" value={d.complaints.filter((c) => c.state === 'NEW').length} to={`${base}/complaints`} tone="amber" />
          <Tile label="At final inspection" value={d.cards.filter((c) => ['FINAL_INSPECTION', 'FINAL_INSPECTION_FAILED'].includes(c.status)).length} to={`${base}/job-cards`} />
          {role === 'TIC' && <>
            <Tile label="WSR to issue" value={d.wsrs.filter((w) => w.status !== 'ISSUED').length} to="/tic/wsr" tone="amber" />
            <Tile label="MRN ready to receive" value={d.mrns.filter((m) => m.status === 'CREATED' && m.ready).length} to="/tic/material-return" tone="amber" />
            <Tile label="SRN to receive" value={d.srns.filter((s) => s.status === 'CREATED').length} to="/tic/srn" tone="amber" />
          </>}
          {role === 'SUP' && <Tile label="Group approvals" value={d.groups.length} to="/sup/grouping" tone="amber" />}
          <Tile label="Live stock · Good" value={live.filter((t) => t.stock_category === 'GOOD').length} to={`${base}/tyres`} tone="green" />
          <Tile label="Live stock · Repair" value={live.filter((t) => t.stock_category === 'REPAIR').length} to={`${base}/tyres`} />
          <Tile label="Overdue chart items" value={chartOverdue} to={`${base}/planner`} tone={chartOverdue ? 'red' : 'green'} />
        </section>

        <section className={`${cardCls} overflow-x-auto`}>
          <h2 className="px-4 pt-3 font-semibold text-slate-900">Today&apos;s compliance</h2>
          <table className="w-full min-w-[420px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">Schedule</th><th className="px-4 py-2">Done</th><th className="px-4 py-2">Due today</th><th className="px-4 py-2">Compliance</th></tr></thead>
            <tbody>
              {codes.length === 0 && <tr><td colSpan={4} className="px-4 py-3 text-slate-500">Nothing is due today.</td></tr>}
              {codes.map((c) => { const rows = dueToday.filter((x) => x.schedule_code === c); const done = rows.filter((x) => x.done_date).length;
                return <tr key={c} className="border-t border-slate-100"><td className="px-4 py-2">{c} · {rows[0].schedule_name}</td><td className="px-4 py-2">{done}</td><td className="px-4 py-2">{rows.length}</td><td className="px-4 py-2 font-semibold">{pct(done, rows.length)}</td></tr>; })}
            </tbody>
          </table>
        </section>
      </>}

      {!isDepot && <>
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Master changes waiting" value={d.requests.length} to={role === 'AM' ? '/am/approvals' : '/ho/requests'} tone="amber" />
          <Tile label="Open job cards" value={open.filter((c) => ONGOING.includes(c.status) || c.status === 'DRAFT').length} tone="blue" />
          <Tile label="Overdue cards" value={overdue.length} tone={overdue.length ? 'red' : 'green'} />
          <Tile label="Overdue chart items" value={chartOverdue} tone={chartOverdue ? 'red' : 'green'} />
        </section>

        <section className={`${cardCls} overflow-x-auto`}>
          <h2 className="px-4 pt-3 font-semibold text-slate-900">Maintenance pending by depot</h2>
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">Depot</th><th className="px-4 py-2">Open cards</th><th className="px-4 py-2">Overdue</th><th className="px-4 py-2">New complaints</th></tr></thead>
            <tbody>
              {[...new Set(d.cards.map((c) => c.org_unit_id))].length === 0 && <tr><td colSpan={4} className="px-4 py-3 text-slate-500">No job cards yet.</td></tr>}
              {[...new Set(d.cards.map((c) => c.org_unit_id))].map((id) => (
                <tr key={id} className="border-t border-slate-100"><td className="px-4 py-2">{depotName(id)}</td>
                  <td className="px-4 py-2">{d.cards.filter((c) => c.org_unit_id === id && !CLOSED.includes(c.status)).length}</td>
                  <td className="px-4 py-2">{overdue.filter((c) => c.org_unit_id === id).length}</td>
                  <td className="px-4 py-2">{d.complaints.filter((c) => c.org_unit_id === id && c.state === 'NEW').length}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={`${cardCls} overflow-x-auto`}>
          <h2 className="px-4 pt-3 font-semibold text-slate-900">Tyre stock by place</h2>
          <table className="w-full min-w-[420px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">Place</th><th className="px-4 py-2">Tyres</th><th className="px-4 py-2">Depots</th></tr></thead>
            <tbody>
              {Object.keys(PLACE).filter((p) => d.tyres.some((t) => t.stock_place === p)).map((p) => (
                <tr key={p} className="border-t border-slate-100"><td className="px-4 py-2">{PLACE[p]}</td><td className="px-4 py-2 font-semibold">{d.tyres.filter((t) => t.stock_place === p).length}</td>
                  <td className="px-4 py-2 text-slate-600">{[...new Set(d.tyres.filter((t) => t.stock_place === p).map((t) => depotName(t.owner_org_unit_id)))].join(', ')}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </>}
    </div>
  );
}
