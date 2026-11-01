import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { ROLE_INFO } from '../lib/roles';
import { Spinner } from '../components/ProtectedRoute';

/** One common login for everyone. There is no role selector: the database decides the role. */
export function Login() {
  const { loading, me, notice, signIn } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading && !busy) return <Spinner />;
  if (me) return <Navigate to={ROLE_INFO[me.role_code].home} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const failure = await signIn(employeeId, password);
    setBusy(false);
    if (failure) setError(failure);
    setPassword('');
  }

  const message = error ?? notice;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f3a5f] to-[#1d70f5] p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" noValidate>
        <h1 className="text-xl font-bold text-slate-900">MTC Tyre Management</h1>
        <p className="mb-5 text-sm text-slate-500">Sign in with your Employee ID</p>

        <label htmlFor="employeeId" className="mb-1 block text-sm font-medium text-slate-700">Employee ID</label>
        <input
          id="employeeId"
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder="e.g. TIC-1147"
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 uppercase outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
        />

        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
        <div className="relative mb-4">
          <input
            id="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-11 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-2 text-slate-500"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {message && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1d70f5] px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <LogIn size={18} /> {busy ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="mt-5 text-center text-xs text-slate-500">
          Demonstration system. All records are fictional and are not MTC data.
        </p>
      </form>
    </div>
  );
}
