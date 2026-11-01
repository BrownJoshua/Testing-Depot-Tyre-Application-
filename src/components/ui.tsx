import { useState, type ReactNode } from 'react';
import type { RequestStatus } from '../lib/masters';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-slate-200 text-slate-600',
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-slate-200 text-slate-600',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: 'Pending approval', DRAFT: 'Draft', APPROVED: 'Approved', REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn', ACTIVE: 'Active', INACTIVE: 'Inactive',
};

export function StatusBadge({ status }: { status: RequestStatus | 'ACTIVE' | 'INACTIVE' }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Banner({ kind, children }: { kind: 'error' | 'ok' | 'info'; children: ReactNode }) {
  const cls = kind === 'error' ? 'border-red-200 bg-red-50 text-red-800'
    : kind === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : 'border-blue-200 bg-blue-50 text-blue-900';
  return <div role={kind === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-lg border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export const btnPrimary = 'rounded-lg bg-[#1d70f5] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50';
export const btnPlain = 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50';
export const btnDanger = 'rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50';
export const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
export const cardCls = 'rounded-xl border border-slate-200 bg-white shadow-sm';

/** Modal asking for remarks (withdraw / reject / approve / summaries). */
export function ReasonDialog(props: {
  title: string; confirmLabel: string; required: boolean; danger?: boolean; label?: string;
  busy: boolean; error: string | null; onConfirm: (text: string) => void; onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const blocked = props.busy || (props.required && text.trim().length === 0);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={props.title}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="mb-3 text-lg font-bold text-slate-900">{props.title}</h2>
        {props.error && <Banner kind="error">{props.error}</Banner>}
        <Field label={props.label ?? (props.required ? 'Remarks (required)' : 'Remarks (optional)')}>
          <textarea autoFocus rows={3} value={text} onChange={(e) => setText(e.target.value)} className={inputCls} />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={btnPlain} onClick={props.onCancel} disabled={props.busy}>Cancel</button>
          <button type="button" className={props.danger ? btnDanger : btnPrimary} disabled={blocked} onClick={() => props.onConfirm(text.trim())}>
            {props.busy ? 'Working…' : props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
