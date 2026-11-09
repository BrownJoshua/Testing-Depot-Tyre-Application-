import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fmtDT, loadTyreHistory, type Row, type TyreHistoryData } from '../lib/reg';
import { Banner, btnPlain } from './ui';
import { Modal } from './OpsBits';

const Tbl = ({ title, head, rows, empty }: { title: string; head: string[]; rows: (string | number | null)[][]; empty: string }) => (
  <section className="mb-4"><h3 className="mb-1 text-sm font-semibold text-slate-900">{title}</h3>
    <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[420px] text-xs">
      <thead className="bg-slate-50 text-left uppercase tracking-wide text-slate-500"><tr>{head.map((h) => <th key={h} className="px-2 py-1.5">{h}</th>)}</tr></thead>
      <tbody>{rows.length === 0 && <tr><td colSpan={head.length} className="px-2 py-2 text-slate-500">{empty}</td></tr>}
        {rows.map((r, i) => <tr key={i} className="border-t border-slate-100">{r.map((c, k) => <td key={k} className="px-2 py-1.5">{c ?? '—'}</td>)}</tr>)}</tbody></table></div></section>
);

/** Tyre history popup: Ledger, Fleet Movement History, Readings (FRS REG-007). */
export function TyreHistory({ tyre, canCorrect, onClose }: { tyre: Row; canCorrect: boolean; onClose: () => void }) {
  const [d, setD] = useState<TyreHistoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { loadTyreHistory(tyre.id).then(setD).catch((e: Error) => setError(e.message)); }, [tyre.id]);
  const fleet = (id: string) => d?.fleets.find((f) => f.id === id)?.fleet_no ?? '—';

  // ledger: every document that moved the tyre, oldest first
  const ledger = d ? [
    ...d.gins.filter((g) => g.gin).map((g) => ({ at: g.gin.in_transit_at ?? g.gin.created_at, no: g.gin.gin_no, text: 'Indent GIN', dir: 'Outward', note: g.result ? `${g.result.toLowerCase()}${g.reason ? ' · ' + g.reason : ''}` : '' })),
    ...d.grn.filter((g) => g.grn).map((g) => ({ at: g.grn.receipt_at ?? g.grn.received_at, no: g.grn.grn_no, text: `GRN (${g.grn.source.replace('_', ' ').toLowerCase()})`, dir: g.result === 'ACCEPTED' ? 'Inward' : '—', note: `${g.result.toLowerCase()}${g.reason ? ' · ' + g.reason : ''}${g.note ? ' · ' + g.note : ''}` })),
    ...d.wsr.filter((w) => w.wsr).map((w) => ({ at: w.wsr.created_at, no: w.wsr.wsr_no, text: 'WSR issue', dir: 'Outward', note: w.receive_status ? w.receive_status.toLowerCase() : '' })),
    ...d.mrns.map((m) => ({ at: m.received_at ?? m.created_at, no: m.mrn_no, text: 'MRN', dir: m.status === 'RECEIVED' ? 'Inward' : '—', note: `${m.status.toLowerCase()}${m.grn_no ? ' · ' + m.grn_no : ''}` })),
  ].sort((a, b) => String(a.at).localeCompare(String(b.at))) : [];

  return (
    <Modal title={`Tyre ${tyre.mtc_no}`} onClose={onClose}>
      {error && <Banner kind="error">{error}</Banner>}
      {!d && !error && <p className="text-slate-500">Loading…</p>}
      {d && <>
        <Tbl title="Ledger" head={['Date & Time', 'Document', 'Type', 'In / Out', 'Remarks']} empty="No ledger entries yet." rows={ledger.map((l) => [fmtDT(l.at), l.no, l.text, l.dir, l.note])} />
        <Tbl title="Fleet Movement History" head={['Order No', 'Activity', 'Fleet', 'Position', 'Status', 'Date & Time']} empty="This tyre has not moved on a job card."
          rows={[...d.orders].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((o) => [o.order_no, o.order_type === 'REMOVAL' ? 'Removal' : 'Fitment', fleet(o.fleet_id), o.position, o.status === 'DONE' ? 'Done' : 'Created', fmtDT(o.done_at)])} />
        <Tbl title="Readings" head={['Date & Time', 'Present PSI', 'Inflated PSI', 'NSD', 'Odometer']} empty="No readings yet."
          rows={[...d.readings].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)).map((r) => [fmtDT(r.recorded_at), r.present_psi, r.inflated_psi, r.nsd_mm, r.odometer_km])} />
      </>}
      <div className="flex justify-end gap-2">
        {canCorrect && <Link className={btnPlain} to={`/tic/corrections?tyre=${tyre.id}`}>Correction Request</Link>}
        <button className={btnPlain} onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
