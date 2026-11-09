import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Row } from '../lib/jobs';
import { STATE_LABEL } from '../lib/schedules';
import { btnPlain } from './ui';
import { Modal } from './OpsBits';

const ORDER = ['FR', 'FL', 'RRI', 'RRO', 'RLI', 'RLO'];

/** Fleet Tyre View: the tyres on a fleet by position. */
export function FleetTyreView({ fleet, tyres, onClose }: { fleet: Row; tyres: Row[]; onClose: () => void }) {
  const rows = tyres.filter((t) => t.fleet_id === fleet.id && t.stock_place === 'FITTED').sort((a, b) => (ORDER.indexOf(a.fitted_position) + 99) % 99 - (ORDER.indexOf(b.fitted_position) + 99) % 99);
  return (
    <Modal title={`Fleet Tyre View · ${fleet.fleet_no}`} onClose={onClose}>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-1">Position</th><th>Tyre No</th><th>NSD (mm)</th><th>Condition</th><th>Last rotation</th><th>Last discout</th></tr></thead>
        <tbody>{rows.map((t) => <tr key={t.id} className="border-t border-slate-100"><td className="py-1 font-medium">{t.fitted_position}</td><td>{t.mtc_no}</td><td>{t.nsd_mm ?? '—'}</td><td>{t.tyre_condition ?? '—'}</td><td>{t.last_rotation_date ?? '—'}</td><td>{t.last_discout_date ?? '—'}</td></tr>)}
          {rows.length === 0 && <tr><td colSpan={6} className="py-3 text-slate-500">No tyre is fitted on this fleet.</td></tr>}</tbody>
      </table>
      <div className="mt-3 text-right"><button className={btnPlain} onClick={onClose}>Close</button></div>
    </Modal>
  );
}

/** Next schedules of a fleet: its open Schedule Chart rows, soonest first. */
export function NextSchedules({ fleet, onClose }: { fleet: Row; onClose: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    supabase.from('v_schedule_chart').select('schedule_code, schedule_name, schedule_no, due_date, position, tyre_no, state, job_card_no').eq('fleet_id', fleet.id).is('done_date', null).order('due_date').limit(30)
      .then((r) => setRows((r.data ?? []) as Row[]));
  }, [fleet.id]);
  return (
    <Modal title={`Next schedules · ${fleet.fleet_no}`} onClose={onClose}>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-1">Due</th><th>Schedule</th><th>Schedule ID</th><th>Tyre</th><th>Status</th><th>Job card</th></tr></thead>
        <tbody>{!rows && <tr><td colSpan={6} className="py-3 text-slate-500">Loading…</td></tr>}
          {rows?.length === 0 && <tr><td colSpan={6} className="py-3 text-slate-500">No open schedule for this fleet.</td></tr>}
          {rows?.map((r, i) => <tr key={i} className="border-t border-slate-100"><td className="py-1">{r.due_date}</td><td>{r.schedule_code} {r.schedule_name}</td><td>{r.schedule_no}</td><td>{r.position ? `${r.position} ${r.tyre_no}` : '—'}</td><td>{STATE_LABEL[r.state] ?? r.state}</td><td>{r.job_card_no ?? '—'}</td></tr>)}</tbody>
      </table>
      <div className="mt-3 text-right"><button className={btnPlain} onClick={onClose}>Close</button></div>
    </Modal>
  );
}
