import { useState } from 'react';
import { fmtDateTime } from '../lib/masters';
import type { JobsCtx, Row } from '../lib/jobs';
import { MRN_STATUS_LABEL, ORDER_STATUS_LABEL, PART_LABEL, WSR_STATUS_LABEL, type CardDocs } from '../lib/stock';
import { Banner, btnPlain, btnPrimary, cardCls, inputCls } from './ui';
import { Modal } from './OpsBits';

const pill = (txt: string, tone: 'green' | 'amber' | 'slate' | 'blue' = 'slate') =>
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${{ green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800', slate: 'bg-slate-100 text-slate-700', blue: 'bg-blue-100 text-blue-800' }[tone]}`}>{txt}</span>;

function Table({ title, head, empty, rows }: { title: string; head: string[]; empty: string; rows: React.ReactNode[][] }) {
  return (
    <section className={`${cardCls} overflow-x-auto`}>
      <h2 className="px-4 pt-3 font-semibold text-slate-900">{title}</h2>
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr>{head.map((h) => <th key={h} className="px-4 py-2">{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={head.length} className="px-4 py-3 text-slate-500">{empty}</td></tr>}
          {rows.map((r, i) => <tr key={i} className="border-t border-slate-100 align-top">{r.map((c, k) => <td key={k} className="px-4 py-2">{c}</td>)}</tr>)}
        </tbody>
      </table>
    </section>
  );
}

/** WSR, WSR GIN, GRN, MRN, Removal Orders, Fitment Orders and Scrap Return of one job card (empty ones say "No ..."). */
export function CardDocsView({ ctx, docs, canReceive, onReceive }: { ctx: JobsCtx; docs: CardDocs; canReceive: boolean; onReceive: (gin: Row) => void }) {
  const fleetNo = (id: string | null) => ctx.fleets.find((f) => f.id === id)?.fleet_no ?? '—';
  const jobNo = (id: string | null) => ctx.jobIds.find((j) => j.id === id)?.job_id_no ?? '—';
  const tyreNo = (id: string | null) => ctx.tyres.find((t) => t.id === id)?.mtc_no;
  const itemNo = (id: string | null) => docs.items.find((i) => i.id === id)?.item_no;
  const who = (id: string | null) => ctx.staff.find((s) => s.id === id)?.full_name ?? '—';
  const lineText = (l: Row) => `${PART_LABEL[l.part]} ${l.line_status === 'ISSUED' ? (tyreNo(l.issued_tyre_id) ?? itemNo(l.issued_item_id) ?? '') : l.line_status === 'CLOSED' ? '(closed)' : '(not issued)'}`.trim();
  const orders = (type: string) => docs.orders.filter((o) => o.order_type === type).map((o) => [
    o.order_no, jobNo(o.job_id_ref), fleetNo(o.fleet_id), PART_LABEL[o.part], o.position ?? '—', tyreNo(o.tyre_id) ?? '—', itemNo(o.item_id) ?? (o.part !== 'TYRE' ? o.note ?? '—' : '—'), o.reason ?? '—',
    <span key="s">{pill(ORDER_STATUS_LABEL[o.status], o.status === 'DONE' ? 'green' : 'amber')}{o.done_at && <div className="mt-0.5 text-xs text-slate-500">{fmtDateTime(o.done_at)}</div>}</span>,
  ]);
  const orderHead = ['Order No', 'Job ID', 'Fleet', 'Part', 'Position', 'Tyre MTC No', 'Item No / source', 'Reason', 'Status'];
  const wsrNo = (id: string) => docs.wsrs.find((w) => w.id === id)?.wsr_no ?? '—';
  const srnText = (s: Row) => docs.srnLines.filter((l) => l.srn_id === s.id).map((l) => `${l.material} ${Number(l.qty)} ${l.unit}`).join(', ');

  return <>
    <Table title="WSR" head={['WSR No', 'Date & Time', 'Job ID', 'Fleet', 'Items', 'Status']} empty="No WSR."
      rows={docs.wsrs.map((w) => { const ls = docs.lines.filter((l) => l.wsr_id === w.id); return [w.wsr_no, fmtDateTime(w.created_at), [...new Set(ls.map((l) => jobNo(l.job_id_ref)))].join(', '), [...new Set(ls.map((l) => fleetNo(l.fleet_id)))].join(', '),
        ls.map(lineText).join('; '), pill(WSR_STATUS_LABEL[w.status], w.status === 'ISSUED' ? 'green' : 'amber')]; })} />
    <Table title="WSR GIN" head={['GIN No', 'WSR No', 'Issued By', 'Issued At', 'Receipt', 'Action']} empty="No GIN."
      rows={docs.gins.map((g) => {
        const ls = docs.lines.filter((l) => l.wsr_id === g.wsr_id && l.line_status !== 'REQUESTED' && l.issued_qty > 0);
        const pending = ls.filter((l) => l.receive_status === 'PENDING').length;
        return [g.gin_no, wsrNo(g.wsr_id), who(g.issued_by), fmtDateTime(g.issued_at), pending ? pill(`${pending} to receive`, 'amber') : pill('Received', 'green'),
          canReceive && pending > 0 ? <button key="r" className={btnPlain} onClick={() => onReceive(g)}>Receive</button> : ''];
      })} />
    <Table title="GRN" head={['GRN No', 'Source', 'Issued', 'Accepted', 'Rejected', 'Received By / At']} empty="No GRN."
      rows={docs.grns.map((g) => [g.grn_no, g.source === 'WSR_GIN' ? `WSR GIN ${docs.gins.find((x) => x.id === g.wsr_gin_id)?.gin_no ?? ''}` : `MRN ${docs.mrns.find((x) => x.id === g.mrn_id)?.mrn_no ?? ''}`, g.issued_qty, g.accepted_qty, g.rejected_qty, `${who(g.received_by)} · ${fmtDateTime(g.received_at)}`])} />
    <Table title="MRN" head={['MRN No', 'Tyre / Item', 'Job ID', 'Remarks', 'Status', 'GRN No']} empty="No MRN."
      rows={docs.mrns.map((m) => [m.mrn_no, tyreNo(m.tyre_id) ?? itemNo(m.item_id) ?? '—', jobNo(m.job_id_ref), m.remarks ?? '—',
        m.status === 'CREATED' ? pill(m.ready ? 'Ready to receive' : 'Waiting for removal', m.ready ? 'blue' : 'slate') : pill(MRN_STATUS_LABEL[m.status], m.status === 'RECEIVED' ? 'green' : 'amber'), m.grn_no ?? '—'])} />
    <Table title="Removal Orders" head={orderHead} empty="No Removal Orders." rows={orders('REMOVAL')} />
    <Table title="Fitment Orders" head={orderHead} empty="No Fitment Orders." rows={orders('FITMENT')} />
    <Table title="Scrap Return Note" head={['SRN No', 'Material', 'Status', 'GRN No']} empty="No Scrap Return Note."
      rows={docs.srns.map((s) => [s.srn_no, srnText(s), pill(s.status === 'RECEIVED' ? 'Received' : 'Created', s.status === 'RECEIVED' ? 'green' : 'blue'), s.grn_no ?? '—'])} />
  </>;
}

/** The Tyre Man (or the Tyre IC for him) accepts or rejects each issued item of a WSR GIN. */
export function ReceiveGinDlg({ ctx, docs, gin, busy, error, onCancel, onSave }: { ctx: { tyres: Row[] }; docs: { lines: Row[]; items: Row[] }; gin: Row; busy: boolean; error: string | null; onCancel: () => void;
  onSave: (results: { line_id: string; accept: boolean; reason?: string }[]) => void }) {
  const lines = docs.lines.filter((l) => l.wsr_id === gin.wsr_id && l.receive_status === 'PENDING');
  const [res, setRes] = useState<Record<string, { accept: boolean; reason: string }>>(() => Object.fromEntries(lines.map((l) => [l.id, { accept: true, reason: '' }])));
  const label = (l: Row) => `${PART_LABEL[l.part]} · ${ctx.tyres.find((t) => t.id === l.issued_tyre_id)?.mtc_no ?? docs.items.find((i) => i.id === l.issued_item_id)?.item_no ?? ''}`;
  return (
    <Modal title={`Receive ${gin.gin_no}`} onClose={onCancel}>
      {error && <Banner kind="error">{error}</Banner>}
      <div className="space-y-2">
        {lines.map((l) => (
          <div key={l.id} className="rounded-lg border border-slate-200 p-2 text-sm">
            <div className="flex items-center justify-between gap-2"><span className="font-medium">{label(l)}</span>
              <span className="flex gap-3">
                <label className="flex items-center gap-1"><input type="radio" name={`r-${l.id}`} checked={res[l.id].accept} onChange={() => setRes({ ...res, [l.id]: { ...res[l.id], accept: true } })} /> Accept</label>
                <label className="flex items-center gap-1"><input type="radio" name={`r-${l.id}`} checked={!res[l.id].accept} onChange={() => setRes({ ...res, [l.id]: { ...res[l.id], accept: false } })} /> Reject</label>
              </span></div>
            {!res[l.id].accept && <input className={`${inputCls} mt-2`} placeholder="Reject reason (required)" value={res[l.id].reason} onChange={(e) => setRes({ ...res, [l.id]: { ...res[l.id], reason: e.target.value } })} />}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button className={btnPlain} onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={btnPrimary} disabled={busy} onClick={() => onSave(lines.map((l) => ({ line_id: l.id, accept: res[l.id].accept, reason: res[l.id].reason })))}>{busy ? 'Working…' : 'Create GRN'}</button>
      </div>
    </Modal>
  );
}

/** Want of Tyre: the Tyre IC picks a Good live-stock tyre for a waiting Fitment. */
export function ProvideTyreDlg({ ctx, job, busy, error, onCancel, onSave }: { ctx: JobsCtx; job: Row; busy: boolean; error: string | null; onCancel: () => void; onSave: (tyre: string) => void }) {
  const [tyre, setTyre] = useState('');
  const live = ctx.tyres.filter((t) => t.stock_place === 'LIVE_STOCK' && t.stock_category === 'GOOD' && t.setting_status === 'SET');   // a waiting Fitment has no Setting step
  return (
    <Modal title={`Provide a tyre for ${job.job_id_no}`} onClose={onCancel}>
      {error && <Banner kind="error">{error}</Banner>}
      <select className={inputCls} value={tyre} onChange={(e) => setTyre(e.target.value)} aria-label="Live stock tyre">
        <option value="">Good live-stock tyre…</option>{live.map((t) => <option key={t.id} value={t.id}>{t.mtc_no} · {t.tyre_condition ?? ''} · {t.setting_status === 'SET' ? 'Set' : 'Unset'}</option>)}
      </select>
      <div className="mt-3 flex justify-end gap-2"><button className={btnPlain} onClick={onCancel} disabled={busy}>Cancel</button><button className={btnPrimary} disabled={busy || !tyre} onClick={() => onSave(tyre)}>Provide tyre</button></div>
    </Modal>
  );
}
