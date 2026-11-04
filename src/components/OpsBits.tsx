import type { ReactNode } from 'react';
import { JC_STATUS_LABEL as CARD_STATUS_LABEL, JC_STATUS_STYLE as CARD_STATUS_STYLE } from '../lib/jobs';

export function CardBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${CARD_STATUS_STYLE[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {CARD_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** Plain modal for forms (the remark-only dialogs use ReasonDialog). */
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <h2 className="mb-3 text-lg font-bold text-slate-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}
