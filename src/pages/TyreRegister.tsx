import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { friendlyError } from '../lib/masters';
import { Banner, btnPlain, cardCls, inputCls, PageHeader } from '../components/ui';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const PLACE: Record<string, string> = {
  FITTED: 'Fitted', LIVE_STOCK: 'Live stock', AT_TRS: 'At TRS', AT_MIC: 'At MIC', AT_OTHER_DEPOT: 'At other depot', CENTRAL_STORE: 'Central Store', IN_TRANSIT: 'In transit', SCRAPPED: 'Scrapped',
};
const PAGE = 25;
const fmtKm = (v: number | null) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-IN'));
const fmtD = (v: string | null) => (v ? new Date(`${v}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

/** Tyre Register: every tyre of the depot, read-only. Written only by stock documents (later steps). */
export function TyreRegister() {
  const [tyres, setTyres] = useState<Row[] | null>(null);
  const [folios, setFolios] = useState<Row[]>([]);
  const [makes, setMakes] = useState<Row[]>([]);
  const [models, setModels] = useState<Row[]>([]);
  const [fleets, setFleets] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [place, setPlace] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      const get = async (t: string, cols = '*') => { const { data, error: e } = await supabase.from(t).select(cols).range(0, 4999); if (e) throw new Error(e.message); return (data ?? []) as unknown as Row[]; };
      const [t, f, mk, md, fl] = await Promise.all([get('tyres'), get('tyre_folios', 'id, folio_no, folio_name'), get('tyre_makes', 'id, name'), get('tyre_models', 'id, model_name'), get('fleets', 'id, fleet_no')]);
      setTyres(t.sort((a, b) => a.mtc_no.localeCompare(b.mtc_no))); setFolios(f); setMakes(mk); setModels(md); setFleets(fl);
    })().catch((e: Error) => setError(friendlyError(e.message)));
  }, []);

  const by = (rows: Row[]) => new Map(rows.map((r) => [r.id, r]));
  const fMap = useMemo(() => by(folios), [folios]);
  const mkMap = useMemo(() => by(makes), [makes]);
  const mdMap = useMemo(() => by(models), [models]);
  const flMap = useMemo(() => by(fleets), [fleets]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (tyres ?? []).filter((r) => (!place || r.stock_place === place) && (!t || [r.mtc_no, r.makers_no, fMap.get(r.folio_id)?.folio_no, flMap.get(r.fleet_id)?.fleet_no].join(' ').toLowerCase().includes(t)));
  }, [tyres, q, place, fMap, flMap]);
  useEffect(() => setPage(0), [q, place]);
  const counts = useMemo(() => { const c: Record<string, number> = {}; for (const r of tyres ?? []) c[r.stock_place] = (c[r.stock_place] ?? 0) + 1; return c; }, [tyres]);
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div className="space-y-4">
      <PageHeader title="Tyre Register" subtitle="Every tyre of your depot and where it is. Opening data is the prototype's sample register." />
      {error && <Banner kind="error">{error}</Banner>}
      <div className="flex flex-wrap gap-2">
        <button className={`rounded-full border px-3 py-1 text-sm ${!place ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`} onClick={() => setPlace('')}>All ({tyres?.length ?? 0})</button>
        {Object.entries(counts).map(([k, n]) => (
          <button key={k} onClick={() => setPlace(k)} className={`rounded-full border px-3 py-1 text-sm ${place === k ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`}>{PLACE[k] ?? k} ({n})</button>
        ))}
      </div>
      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className={`${inputCls} pl-9`} placeholder="MTC no, makers no, folio or fleet" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-3 py-2">MTC No</th><th className="px-3 py-2">Folio</th><th className="px-3 py-2">Make / model</th><th className="px-3 py-2">Where</th><th className="px-3 py-2">Grade</th><th className="px-3 py-2">Condition</th><th className="px-3 py-2">NSD</th><th className="px-3 py-2 text-right">Total KM</th><th className="px-3 py-2">Last rotation</th><th className="px-3 py-2">Last discout</th></tr>
          </thead>
          <tbody>
            {!tyres && !error && <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {tyres && shown.length === 0 && <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">No tyres match.</td></tr>}
            {shown.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-900">{r.mtc_no}</td>
                <td className="px-3 py-2">{fMap.get(r.folio_id)?.folio_no ?? '—'}</td>
                <td className="px-3 py-2">{mkMap.get(r.make_id)?.name ?? '—'} <span className="text-slate-500">{mdMap.get(r.model_id)?.model_name}</span></td>
                <td className="px-3 py-2">{r.stock_place === 'FITTED' ? `${flMap.get(r.fleet_id)?.fleet_no} · ${r.fitted_position}` : r.stock_place === 'LIVE_STOCK' ? `Live stock ${r.stock_category === 'GOOD' ? 'Good' : 'Repair'}${r.setting_status ? ` ${r.setting_status === 'SET' ? 'Set' : 'Unset'}` : ''}` : PLACE[r.stock_place]}</td>
                <td className="px-3 py-2">{r.grade ?? '—'}</td>
                <td className="px-3 py-2">{r.tyre_condition ?? '—'}</td>
                <td className="px-3 py-2">{r.nsd_mm ?? '—'}</td>
                <td className="px-3 py-2 text-right">{fmtKm(r.total_km)}</td>
                <td className="px-3 py-2">{fmtD(r.last_rotation_date)}</td>
                <td className="px-3 py-2">{fmtD(r.last_discout_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{rows.length} tyre{rows.length === 1 ? '' : 's'}</span>
        <div className="flex gap-2">
          <button className={btnPlain} disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
          <button className={btnPlain} disabled={(page + 1) * PAGE >= rows.length} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
