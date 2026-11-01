import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { NAV, ROLE_INFO } from '../lib/roles';

/**
 * Shell for HO, AM, Supervisor and Tyre IC.
 * Desktop: sidebar. Small screens: the sidebar becomes a scrollable strip, so the Tyre IC
 * (desktop AND mobile) uses the same layout on every device.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { me, signOut } = useAuth();
  if (!me) return null;
  const info = ROLE_INFO[me.role_code];
  const nav = NAV[me.role_code];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-3 bg-[#0f3a5f] px-4 py-3 text-white">
        <div className="min-w-0">
          <div className="truncate text-base font-bold">MTC Tyre Management</div>
          <div className="truncate text-xs text-blue-100">
            {info.label}{me.org_unit_name ? ` · ${me.org_unit_name} Depot` : ''} · demonstration data
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right text-sm sm:block">
            <div className="font-semibold">{me.full_name}</div>
            <div className="text-xs text-blue-100">{me.employee_code}</div>
          </div>
          <button
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      {/* small screens: horizontal strip */}
      <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden" aria-label="Sections (placeholders)">
        <NavLink to={info.home} end className={({ isActive }) => `whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${isActive ? 'bg-[#1d70f5] text-white' : 'bg-slate-100 text-slate-700'}`}>Home</NavLink>
        {nav.map((n) => n.path ? (
          <NavLink key={n.label} to={n.path} className={({ isActive }) => `whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${isActive ? 'bg-[#1d70f5] text-white' : 'bg-slate-100 text-slate-700'}`}>
            {n.label}
          </NavLink>
        ) : (
          <span key={n.label} className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-400">
            {n.label}
          </span>
        ))}
      </nav>

      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-3 md:block" aria-label="Sections (placeholders)">
          <ul className="space-y-1">
            <li>
              <NavLink to={info.home} end className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-blue-50 font-semibold text-[#1d70f5]' : 'text-slate-700 hover:bg-slate-50'}`}>Home</NavLink>
            </li>
            {nav.map((n) => n.path ? (
              <li key={n.label}>
                <NavLink to={n.path} className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-blue-50 font-semibold text-[#1d70f5]' : 'text-slate-700 hover:bg-slate-50'}`}>{n.label}</NavLink>
              </li>
            ) : (
              <li key={n.label} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-400">
                <span>{n.label}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{n.arrives}</span>
              </li>
            ))}
          </ul>
        </aside>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
