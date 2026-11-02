import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cardCls, StatusBadge } from './ui';
import { fmtDateTime, listHistory, type ChangeRequest, type HistoryRow, type RefValue, type Vendor } from '../lib/masters';
import { describeRequest, type Ctx } from '../lib/entities';

const FIELD_LABEL: Record<string, string> = {
  vendor_code: 'Vendor code', vendor_name: 'Name', category_code: 'Category', contact_person: 'Contact person',
  address_text: 'Address', city: 'City', state: 'State', pincode: 'Pincode', phone_demo: 'Phone (demo)',
  email_demo: 'Email (demo)', gstin: 'GSTIN', contacts: 'Contacts',
};
const ACTION_LABEL: Record<string, string> = {
  CREATE: 'New vendor', UPDATE: 'Change vendor', DEACTIVATE: 'Deactivate vendor', REACTIVATE: 'Reactivate vendor',
};

type Contact = { contact_name?: string; is_primary?: boolean };
function show(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.length === 0 ? 'none' : (v as Contact[]).map((c) => c.contact_name + (c.is_primary ? ' (primary)' : '')).join(', ');
  return String(v);
}

export function RequestCard(props: {
  request: ChangeRequest; ctx: Ctx; actions?: ReactNode; startOpen?: boolean;
}) {
  const { request: r, ctx } = props;
  const vendors: Vendor[] = ctx.vendors;
  const categories: RefValue[] = ctx.refs.filter((x) => x.list_code === 'vendor_category');
  const generic = describeRequest(r, ctx);
  const [open, setOpen] = useState(!!props.startOpen);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  useEffect(() => {
    if (open && history === null) listHistory(r.id).then(setHistory).catch(() => setHistory([]));
  }, [open, history, r.id]);

  const vendor = vendors.find((v) => v.id === r.target_id);
  const catCode = (id: string | undefined) => categories.find((c) => c.id === id)?.code;
  const current: Record<string, unknown> = vendor ? { ...vendor, category_code: catCode(vendor.vendor_category_ref) } : {};
  const catLabel = (code: unknown) => categories.find((c) => c.code === code)?.label ?? String(code ?? '—');
  const isCreate = r.action === 'CREATE';
  const keys = Object.keys(r.proposed_payload);
  const title = generic ? generic.title : `${ACTION_LABEL[r.action] ?? r.action}: ${vendor?.vendor_name ?? String(r.proposed_payload.vendor_name ?? 'New vendor')}`;

  return (
    <div className={cardCls}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 p-4 text-left" aria-expanded={open}>
        <span className="mt-1 text-slate-400">{open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{title}</span>
            <StatusBadge status={r.status} />
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            {r.request_no} · {r.submitted_at ? `submitted ${fmtDateTime(r.submitted_at)}` : `drafted ${fmtDateTime(r.created_at)}`}
          </span>
          {r.change_summary && <span className="mt-1 block text-sm text-slate-700">{r.change_summary}</span>}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4">
          {keys.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-1 pr-4">Field</th>{!isCreate && <th className="py-1 pr-4">Now</th>}<th className="py-1">Proposed</th>
                  </tr>
                </thead>
                <tbody>
                  {generic ? generic.rows.map((g) => (
                    <tr key={g.label} className="border-t border-slate-100 align-top">
                      <td className="py-1.5 pr-4 text-slate-500">{g.label}</td>
                      {!isCreate && <td className="py-1.5 pr-4 text-slate-600">{g.now}</td>}
                      <td className="py-1.5 font-medium text-slate-900">{g.proposed}</td>
                    </tr>
                  )) : keys.map((k) => {
                    const proposed = r.proposed_payload[k];
                    return (
                      <tr key={k} className="border-t border-slate-100 align-top">
                        <td className="py-1.5 pr-4 text-slate-500">{FIELD_LABEL[k] ?? k}</td>
                        {!isCreate && <td className="py-1.5 pr-4 text-slate-600">{k === 'category_code' ? catLabel(current[k]) : show(current[k])}</td>}
                        <td className="py-1.5 font-medium text-slate-900">{k === 'category_code' ? catLabel(proposed) : show(proposed)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              {r.action === 'DEACTIVATE' ? 'The vendor will be marked Inactive.' : r.action === 'REACTIVATE' ? 'The vendor will be marked Active.' : 'No field changes.'}
            </p>
          )}

          {r.decision_remarks && (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><b>Remarks:</b> {r.decision_remarks}</p>
          )}

          {history && history.length > 0 && (
            <ol className="mt-3 space-y-1 text-xs text-slate-500">
              {history.map((h) => (
                <li key={h.id}>{fmtDateTime(h.at)} · {h.action.replace('_', ' ').toLowerCase()}{h.remarks ? ` — “${h.remarks}”` : ''}</li>
              ))}
            </ol>
          )}
          {props.actions && <div className="mt-4 flex flex-wrap justify-end gap-2">{props.actions}</div>}
        </div>
      )}
    </div>
  );
}
