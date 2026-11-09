import { Link } from 'react-router-dom';
import type { Row } from '../lib/ops';
import { cardCls } from './ui';

const PLACE: Record<string, string> = { FITTED: 'Fitted', LIVE_STOCK: 'Live stock', AT_TRS: 'At TRS', AT_MIC: 'At MIC', AT_OTHER_DEPOT: 'Other depots', IN_TRANSIT: 'In transit' };
const GRADES = ['NEW', 'A', 'B', 'C'];

export interface AnalyticsData { complaints: Row[]; tyres: Row[]; depots: Row[]; chart: Row[]; today: string; fleets: Row[]; items: Row[]; ctypes: Row[]; folios: Row[]; sizes: Row[] }

const T = ({ label, value, sub, to, tone = 'text-slate-900' }: { label: string; value: number | string; sub?: string; to?: string; tone?: string }) => {
  const body = <><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className={`text-2xl font-bold ${tone}`}>{value}</div>{sub && <div className="text-xs text-slate-500">{sub}</div>}</>;
  return to ? <Link to={to} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-400">{body}</Link> : <div className="rounded-xl border border-slate-200 bg-white p-4">{body}</div>;
};

/** D1 Tyre IC dashboard blocks: headline tiles, stock by place, tube / flap / disc, float by status and grade, complaint types, tyre sizes. */
export function DepotAnalytics({ d, overdueJobs, base }: { d: AnalyticsData; overdueJobs: number; base: string }) {
  const tyres = d.tyres;
  const live = tyres.filter((t) => t.stock_place === 'LIVE_STOCK');
  const good = live.filter((t) => t.stock_category === 'GOOD'), repair = live.filter((t) => t.stock_category === 'REPAIR');
  const fleetsInService = d.fleets.filter((f) => f.status === 'ACTIVE').length;
  const fittedFleets = new Set(tyres.filter((t) => t.stock_place === 'FITTED').map((t) => t.fleet_id)).size;
  const due = d.chart.filter((c) => c.due_date === d.today), done = due.filter((c) => c.done_date).length;
  const compliance = due.length === 0 ? '100%' : `${Math.round((done / due.length) * 100)}%`;
  const place = (p: string) => tyres.filter((t) => t.stock_place === p).length;
  const sizeOf = (t: Row) => d.sizes.find((s) => s.id === d.folios.find((f) => f.id === t.folio_id)?.tyre_size_id)?.size_code ?? '—';
  const sizeCounts = Object.entries(tyres.reduce<Record<string, number>>((m, t) => { const k = sizeOf(t); m[k] = (m[k] ?? 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const byType = Object.entries(d.complaints.reduce<Record<string, number>>((m, c) => { const k = d.ctypes.find((t) => t.id === c.complaint_type_id)?.complaint_name ?? '—'; m[k] = (m[k] ?? 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const openC = d.complaints.filter((c) => ['NEW', 'PENDING_INSPECTION', 'APPROVED'].includes(c.state)).length;
  const mat = (part: string) => { const it = d.items.filter((i) => i.part === part); return { live: it.filter((i) => i.stock_place === 'LIVE_STOCK').length, fitted: it.filter((i) => i.stock_place === 'FITTED').length }; };
  return <>
    <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
      <T label="Fleets in service" value={fleetsInService} /><T label="Tyres tracked" value={tyres.length} to={`${base}/tyres`} />
      <T label="Today's compliance" value={compliance} sub={`${done} of ${due.length} due today`} to={`${base}/planner`} />
      <T label="Open complaints" value={openC} to={`${base}/complaints`} tone="text-amber-700" />
      <T label="Overdue jobs" value={overdueJobs} tone={overdueJobs ? 'text-red-700' : 'text-green-700'} />
      <T label="PSI exceptions" value={0} sub="from air inflation readings" />
    </section>
    <section>
      <h2 className="mb-2 font-semibold text-slate-900">Stock — {d.depots.find((x) => x.id === tyres[0]?.owner_org_unit_id)?.name ?? 'your depot'} (Tyres)</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <T label="Good" value={good.length} sub={`Set ${good.filter((t) => t.setting_status === 'SET').length} · Unset ${good.filter((t) => t.setting_status !== 'SET').length}`} tone="text-green-700" to={`${base}/tyres`} />
        <T label="Repair" value={repair.length} sub="Ready for transit" /><T label="In transit" value={place('IN_TRANSIT')} sub="Sent on a GIN, GRN not received" />
        <T label="Fitted" value={place('FITTED')} sub={`on ${fittedFleets} fleets`} /><T label="At TRS" value={place('AT_TRS')} /><T label="At MIC" value={place('AT_MIC')} sub="on MIC vehicles" />
        <T label="At other depots" value={place('AT_OTHER_DEPOT')} sub="owned by this depot" />
      </div>
    </section>
    <section className={`${cardCls} overflow-x-auto`}>
      <h2 className="px-4 pt-3 font-semibold text-slate-900">Tube, Flap and Disc</h2>
      <table className="w-full min-w-[360px] text-sm"><thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">Material</th><th className="px-4 py-2">Live stock</th><th className="px-4 py-2">Fitted</th></tr></thead>
        <tbody>{(['TUBE', 'FLAP', 'DISC'] as const).map((p) => <tr key={p} className="border-t border-slate-100"><td className="px-4 py-2">{p[0] + p.slice(1).toLowerCase()}</td><td className="px-4 py-2">{mat(p).live}</td><td className="px-4 py-2">{mat(p).fitted}</td></tr>)}</tbody></table>
    </section>
    <section className="grid gap-3 md:grid-cols-3">
      <div className={`${cardCls} p-4 text-sm`}><h2 className="mb-2 font-semibold text-slate-900">Fleet &amp; tyre float</h2>
        <div className="text-xs uppercase tracking-wide text-slate-500">By status</div><div>{Object.keys(PLACE).map((p) => `${PLACE[p]} ${place(p)}`).join(' · ')}</div>
        <div className="mt-2 text-xs uppercase tracking-wide text-slate-500">By grade</div><div>{GRADES.map((g) => `${g === 'NEW' ? 'New' : g} ${tyres.filter((t) => t.grade === g).length}`).join(' · ')}</div></div>
      <div className={`${cardCls} p-4 text-sm`}><h2 className="mb-2 font-semibold text-slate-900">Complaints — top types</h2>
        {byType.length === 0 && <p className="text-slate-500">No complaints yet.</p>}{byType.map(([k, n]) => <div key={k} className="flex justify-between"><span>{k}</span><strong>{n}</strong></div>)}
        <p className="mt-2 text-xs text-slate-500">{d.complaints.length} total · {openC} open · {d.complaints.filter((c) => c.state === 'CLOSED').length} closed</p></div>
      <div className={`${cardCls} p-4 text-sm`}><h2 className="mb-2 font-semibold text-slate-900">Top tyre sizes held</h2>
        {sizeCounts.map(([k, n]) => <div key={k} className="flex justify-between"><span>{k}</span><strong>{n}</strong></div>)}</div>
    </section>
  </>;
}
