import { Database, Info } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { NAV, ROLE_INFO } from '../lib/roles';

/** Landing screen shared by the five shells. It proves what the DATABASE says about the user. */
export function RoleHome() {
  const { me } = useAuth();
  if (!me) return null;
  const info = ROLE_INFO[me.role_code];
  const rows: [string, string][] = [
    ['Employee ID', me.employee_code],
    ['Name', me.full_name],
    ['Role', `${info.label} (${me.role_code})`],
    ['Depot', me.org_unit_name ? `${me.org_unit_name} (mock code ${me.org_unit_code})` : 'All depots (no single depot)'],
    ['Language', me.preferred_language === 'ta' ? 'Tamil' : 'English'],
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {me.full_name}</h1>
        <p className="mt-1 text-slate-600">{info.scope}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <Database size={16} /> Session check (what the database reports)
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-1.5 text-sm">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-right font-medium text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          Your role and depot are read from the database on every request. They cannot be changed from this screen or by editing the browser.
        </p>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
          <Info size={16} /> Placeholders — screens arrive in later stages
        </h2>
        <ul className="grid grid-cols-1 gap-1 text-sm text-amber-900 sm:grid-cols-2">
          {NAV[me.role_code].map((n) => (
            <li key={n.label} className="flex justify-between gap-3">
              <span>{n.label}</span>
              <span className="text-amber-700">{n.arrives}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
