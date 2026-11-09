/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { postedFor } from '../lib/notify';
import { btnPlain } from './ui';

/**
 * "Posted for this" (Duty Posting): who is posted to the Schedule Code / Job Codes on the day AND is really on duty (own roster).
 * `use` puts those people in the chosen list.
 */
export function PostedHint({ schedule, jobCodes, date, shift, staff, chosen, use }: {
  schedule?: string | null; jobCodes?: string[]; date: string; shift: string | null; staff: Record<string, any>[]; chosen: string[]; use: (ids: string[]) => void;
}) {
  const [ids, setIds] = useState<string[] | null>(null);
  const key = `${schedule ?? ''}|${(jobCodes ?? []).join(',')}|${date}|${shift ?? ''}`;
  useEffect(() => {
    let alive = true;
    if (!date) { setIds([]); return; }
    const calls = schedule ? [postedFor(schedule, null, date, shift)] : (jobCodes ?? []).map((j) => postedFor(null, j, date, shift));
    Promise.all(calls).then((r) => { if (alive) setIds([...new Set(r.flat())]); }).catch(() => { if (alive) setIds([]); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (ids === null) return <p className="text-xs text-slate-500">Checking Duty Posting…</p>;
  const names = ids.map((i) => staff.find((s) => s.id === i)?.full_name).filter(Boolean);
  const all = ids.length > 0 && ids.every((i) => chosen.includes(i)) && chosen.length === ids.length;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm">
      <span className="text-slate-600">Posted for this on {date || 'the due date'} and on duty:</span>
      <strong>{names.length ? names.join(', ') : 'nobody'}</strong>
      {ids.length > 0 && !all && <button type="button" className={btnPlain} onClick={() => use(ids)}>Use these people</button>}
    </div>
  );
}
