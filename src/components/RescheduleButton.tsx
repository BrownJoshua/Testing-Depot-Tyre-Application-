import { useState } from 'react';
import { requestReschedule } from '../lib/notify';
import { Banner, btnPlain, btnPrimary, Field, inputCls } from './ui';
import { Modal } from './OpsBits';

/** Tyre Man: ask the Tyre IC to prepone / postpone the work of a job card. */
export function RescheduleButton({ card, cardNo, today, onDone }: { card: string; cardNo: string; today: string; onDone: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send() {
    setBusy(true); setError(null);
    try { await requestReschedule(card, date, reason); setOpen(false); setDate(''); setReason(''); onDone(`Request sent for ${cardNo}. The Tyre IC will approve or reject it.`); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return (<>
    <button className="mt-2 block w-full text-center text-sm font-medium text-blue-700 underline" onClick={() => { setError(null); setOpen(true); }}>Request prepone / postpone</button>
    {open && (
      <Modal title={`Prepone / Postpone · ${cardNo}`} onClose={() => setOpen(false)}>
        {error && <Banner kind="error">{error}</Banner>}
        <Field label="New date *"><input type="date" className={inputCls} min={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Reason *"><textarea className={inputCls} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <div className="mt-3 grid grid-cols-2 gap-2"><button className={`${btnPlain} min-h-12`} onClick={() => setOpen(false)} disabled={busy}>Cancel</button><button className={`${btnPrimary} min-h-12`} disabled={busy || !date || !reason.trim()} onClick={() => void send()}>Send request</button></div>
      </Modal>
    )}
  </>);
}
