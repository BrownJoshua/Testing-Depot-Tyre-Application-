import { useEffect, useMemo, useState } from 'react';
import { all, type Row } from '../lib/ops';
import { Banner, btnPlain, cardCls, inputCls, PageHeader } from '../components/ui';

const inr = (n: number) => (n ? `₹${Math.round(n).toLocaleString('en-IN')}` : '—');

/** Live Tyre Stock (D1): Good / Repair, Summary (by folio) / Detailed (one line per tyre or item), product group and stock status filters. */
export function LiveStock() {
  const [d, setD] = useState<{ tyres: Row[]; items: Row[]; folios: Row[]; params: Row[]; sizes: Row[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState<'GOOD' | 'REPAIR'>('GOOD');
  const [view, setView] = useState<'summary' | 'detailed'>('summary');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState('');
  const [folioView, setFolioView] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([all('tyres', 'mtc_no'), all('stock_items', 'item_no'), all('tyre_folios', 'folio_no'), all('folio_stock_params', 'folio_id'), all('tyre_sizes', 'size_code')])
      .then(([tyres, items, folios, params, sizes]) => setD({ tyres, items, folios, params, sizes })).catch((e: Error) => setError(e.message));
  }, []);

  const live = useMemo(() => (d?.tyres ?? []).filter((t) => t.stock_place === 'LIVE_STOCK' && t.stock_category === cat), [d, cat]);
  const summary = useMemo(() => {
    if (!d) return [];
    const folioRows = d.folios.filter((f) => live.some((t) => t.folio_id === f.id) || d.params.some((p) => p.folio_id === f.id)).map((f) => {
      const p = d.params.find((x) => x.folio_id === f.id); const avail = live.filter((t) => t.folio_id === f.id).length; const min = p?.min_stock ?? 0;
      return { key: f.id, id: f.folio_no, name: f.folio_name, group: 'Tyre', spec: f.specification ?? '', avail, min, max: p?.max_stock ?? 0, back: p?.backorder_qty ?? 0, rate: Number(p?.avg_rate ?? 0), low: avail < min, folio: f.id };
    });
    const sizeRows = (['TUBE', 'FLAP', 'DISC'] as const).flatMap((part) => d.sizes.map((s) => {
      const n = d.items.filter((i) => i.part === part && i.size_id === s.id && i.stock_place === 'LIVE_STOCK').length;
      return { key: `${part}${s.id}`, id: '—', name: `${part[0] + part.slice(1).toLowerCase()} ${s.size_code}`, group: part[0] + part.slice(1).toLowerCase(), spec: s.size_code, avail: cat === 'GOOD' ? n : 0, min: 0, max: 0, back: 0, rate: 0, low: false, folio: '' };
    })).filter((r) => r.avail > 0);
    return [...folioRows, ...sizeRows].filter((r) => (!group || r.group === group) && (!status || (status === 'Low Stock') === r.low));
  }, [d, live, group, status, cat]);

  const detailed = useMemo(() => {
    if (!d) return [] as Row[];
    const t = live.filter(() => !group || group === 'Tyre').map((x) => ({ key: x.id, no: x.mtc_no, group: 'Tyre', folio: d.folios.find((f) => f.id === x.folio_id)?.folio_name ?? '—', grade: x.grade ?? '—', setting: x.setting_status === 'SET' ? 'Set' : 'Unset', cond: x.tyre_condition ?? '—' }));
    const it = d.items.filter((i) => i.stock_place === 'LIVE_STOCK' && cat === 'GOOD' && (!group || group.toUpperCase() === i.part)).map((i) => ({ key: i.id, no: i.item_no, group: i.part[0] + i.part.slice(1).toLowerCase(), folio: d.sizes.find((s) => s.id === i.size_id)?.size_code ?? '—', grade: '—', setting: '—', cond: '—' }));
    return [...t, ...it];
  }, [d, live, group, cat]);

  const chip = (on: boolean) => `rounded-full border px-4 py-1.5 text-sm ${on ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-slate-300 bg-white text-slate-600'}`;
  return (
    <div>
      <PageHeader title="Live Tyre Stock" subtitle="What is in the depot store now. A folio below its Minimum Stk is Low Stock." />
      {error && <Banner kind="error">{error}</Banner>}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className={chip(cat === 'GOOD')} onClick={() => setCat('GOOD')}>Good</button><button className={chip(cat === 'REPAIR')} onClick={() => setCat('REPAIR')}>Repair</button>
        <span className="mx-2 h-5 w-px bg-slate-300" />
        <button className={chip(view === 'summary')} onClick={() => setView('summary')}>Summary</button><button className={chip(view === 'detailed')} onClick={() => setView('detailed')}>Detailed</button>
        <select className={`${inputCls} ml-auto w-40`} aria-label="Product group" value={group} onChange={(e) => setGroup(e.target.value)}><option value="">All groups</option>{['Tyre', 'Tube', 'Flap', 'Disc'].map((g) => <option key={g}>{g}</option>)}</select>
        {view === 'summary' && <select className={`${inputCls} w-36`} aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All status</option><option>Healthy</option><option>Low Stock</option></select>}
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        {view === 'summary' ? (
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{['S.No', 'Folio ID', 'Folio Name', 'Product Group', 'Specification', 'UOM', 'Available Stock', 'Minimum Stk', 'Maximum Stock', 'Total Qty', 'Backorder Qty', 'Weighted Average Rate', 'Stock Value', 'Status', 'Action'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>
              {!d && !error && <tr><td colSpan={15} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
              {d && summary.length === 0 && <tr><td colSpan={15} className="px-4 py-6 text-center text-slate-500">Nothing in {cat === 'GOOD' ? 'Good' : 'Repair'} stock for this filter.</td></tr>}
              {summary.map((r, i) => (
                <tr key={r.key} className="border-t border-slate-100">
                  <td className="px-3 py-2">{i + 1}</td><td className="px-3 py-2 font-medium">{r.id}</td><td className="px-3 py-2">{r.name}</td><td className="px-3 py-2">{r.group}</td><td className="px-3 py-2">{r.spec}</td><td className="px-3 py-2">Nos</td>
                  <td className="px-3 py-2">{r.avail || '—'}</td><td className="px-3 py-2">{r.min || '—'}</td><td className="px-3 py-2">{r.max || '—'}</td><td className="px-3 py-2">{r.avail || '—'}</td><td className="px-3 py-2">{r.back || '—'}</td>
                  <td className="px-3 py-2">{inr(r.rate)}</td><td className="px-3 py-2">{inr(r.rate * r.avail)}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.low ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{r.low ? 'Low Stock' : 'Healthy'}</span></td>
                  <td className="px-3 py-2">{r.folio && <button className={btnPlain} onClick={() => { setFolioView(r.folio); setView('detailed'); }}>View</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{['S.No', 'MTC / Item No', 'Product Group', 'Folio / Size', 'Grade', 'Setting', 'Condition'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>
              {detailed.filter((x) => !folioView || x.folio === (d?.folios.find((f) => f.id === folioView)?.folio_name)).map((r, i) => (
                <tr key={r.key} className="border-t border-slate-100"><td className="px-3 py-2">{i + 1}</td><td className="px-3 py-2 font-medium">{r.no}</td><td className="px-3 py-2">{r.group}</td><td className="px-3 py-2">{r.folio}</td><td className="px-3 py-2">{r.grade}</td><td className="px-3 py-2">{r.setting}</td><td className="px-3 py-2">{r.cond}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {folioView && view === 'detailed' && <button className={`${btnPlain} mt-2`} onClick={() => setFolioView(null)}>Show every folio</button>}
    </div>
  );
}
