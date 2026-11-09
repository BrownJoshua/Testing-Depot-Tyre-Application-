import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/masters';
import { loadFeed, markRead, type Row } from '../lib/notify';
import { Banner, btnPlain, cardCls, PageHeader } from '../components/ui';

const KIND: Record<string, string> = {
  COMPLAINT: 'Complaint', INSPECTION: 'Inspection', INSPECTION_DONE: 'Inspection done', WORK: 'Work', FINAL_INSPECTION: 'Final inspection', GIN: 'Material issued',
  MRN: 'MRN', WSR: 'WSR', SRN: 'SRN', RESCHEDULE: 'Prepone / Postpone', OVERDUE: 'Overdue',
};

/** Notification list for every role (the Tyre Man's own mobile version is TmNotifications). */
export function Notifications({ mobile = false }: { mobile?: boolean }) {
  const { me } = useAuth();
  const home = me ? `/${me.role_code.toLowerCase()}` : '/';
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => { loadFeed().then(setRows).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);
  const unread = (rows ?? []).filter((r) => !r.read_at).length;

  const Body = (
    <>
      {error && <Banner kind="error">{error}</Banner>}
      {!rows && !error && <p className="text-slate-500">Loading…</p>}
      {rows && rows.length === 0 && <Banner kind="info">Nothing new.</Banner>}
      <div className="space-y-2">
        {(rows ?? []).map((r, i) => {
          const inner = (<>
            <div className="flex items-start justify-between gap-2"><div className="font-semibold text-slate-900">{r.title}</div>
              {!r.read_at && <span className="rounded-full bg-blue-600 px-2 text-xs font-semibold text-white">New</span>}</div>
            {r.body && <div className="text-sm text-slate-600">{r.body}</div>}
            <div className="mt-1 text-xs text-slate-400">{KIND[r.kind] ?? r.kind} · {fmtDateTime(r.created_at)}</div></>);
          const cls = `block rounded-xl border p-3 ${r.kind === 'OVERDUE' ? 'border-red-200 bg-red-50' : r.read_at ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/40'}`;
          return r.link ? <Link key={r.id ?? `o${i}`} to={r.link} className={cls} onClick={() => { if (r.id && !r.read_at) void markRead([r.id]); }}>{inner}</Link> : <div key={r.id ?? `o${i}`} className={cls}>{inner}</div>;
        })}
      </div>
    </>
  );
  const readAll = <button className={btnPlain} disabled={unread === 0} onClick={() => void markRead(null).then(load).catch((e: Error) => setError(e.message))}>Mark all read</button>;

  if (mobile) return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold text-slate-900">Notifications</h1>{readAll}</div>
      {Body}
      <Link to="/tm" className="block text-center text-sm font-medium text-blue-700 underline">Back to my jobs</Link>
    </div>
  );
  return (
    <div>
      <PageHeader title="Notifications" subtitle={me?.role_code === 'HO' || me?.role_code === 'AM' ? 'Updates for you, and every job card that is overdue since the day after its due date.' : 'What needs you next.'} action={readAll} />
      <div className={`${cardCls} p-3`}>{Body}</div>
      <p className="mt-2 text-xs text-slate-500"><Link to={home} className="underline">Back to home</Link></p>
    </div>
  );
}
