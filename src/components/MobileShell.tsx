import type { ReactNode } from 'react';
import { CalendarDays, ClipboardList, LogOut, PackageCheck, PackagePlus, Smartphone, Trash2, Undo2 } from 'lucide-react';
import { useAuth } from '../lib/auth';

const TABS = [
  { label: 'My Jobs', Icon: ClipboardList },
  { label: 'Duty & Shift', Icon: CalendarDays },
  { label: 'My WSR', Icon: PackagePlus },
  { label: 'GRN', Icon: PackageCheck },
  { label: 'MRN', Icon: Undo2 },
  { label: 'SRN', Icon: Trash2 },
];

/**
 * Tyre Man: a MOBILE-ONLY interface. On a wide screen (tablet landscape and desktop) it shows an
 * "open this on your phone" screen instead of the app. Large touch targets, bottom navigation.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  const { me, signOut } = useAuth();
  if (!me) return null;

  return (
    <>
      {/* wide screens: not supported */}
      <div className="hidden min-h-screen flex-col items-center justify-center gap-4 p-8 text-center md:flex">
        <Smartphone size={48} className="text-blue-700" />
        <h1 className="text-2xl font-bold">Please open this on your phone</h1>
        <p className="max-w-md text-slate-600">
          The Tyre Man app is built for mobile phones. Open this address on your phone's browser, and add it to your home screen.
        </p>
        <button onClick={() => void signOut()} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium">
          Sign out
        </button>
      </div>

      {/* phones */}
      <div className="flex min-h-screen flex-col md:hidden">
        <header className="flex items-center justify-between bg-[#0f3a5f] px-4 py-3 text-white">
          <div className="min-w-0">
            <div className="truncate text-base font-bold">{me.full_name}</div>
            <div className="truncate text-xs text-blue-100">{me.employee_code} · {me.org_unit_name ?? ''} · Tyre Man</div>
          </div>
          <button onClick={() => void signOut()} aria-label="Sign out" className="rounded-lg bg-white/10 p-3">
            <LogOut size={20} />
          </button>
        </header>
        <main className="flex-1 p-4 pb-28">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 grid grid-cols-6 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]" aria-label="Sections (placeholders)">
          {TABS.map(({ label, Icon }) => (
            <span key={label} className="flex flex-col items-center gap-1 py-2 text-[10px] text-slate-500">
              <Icon size={20} />
              {label}
            </span>
          ))}
        </nav>
      </div>
    </>
  );
}
