import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ROLE_INFO } from '../lib/roles';
import type { RoleCode } from '../lib/types';

export function Spinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-screen items-center justify-center text-slate-500" role="status" aria-live="polite">
      <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      {label}
    </div>
  );
}

/**
 * Front-end routing convenience only. The REAL protection is in the database (RLS and functions):
 * even if someone bypasses this component, they still cannot read another role's data.
 */
export function ProtectedRoute({ allow, children }: { allow: RoleCode; children: ReactNode }) {
  const { loading, me } = useAuth();
  if (loading) return <Spinner />;
  if (!me) return <Navigate to="/login" replace />;
  if (me.role_code !== allow) return <Navigate to={ROLE_INFO[me.role_code].home} replace />;
  return <>{children}</>;
}

/** "/" and unknown paths: send the user to their own home, or to the login page. */
export function RootRedirect() {
  const { loading, me } = useAuth();
  if (loading) return <Spinner />;
  return <Navigate to={me ? ROLE_INFO[me.role_code].home : '/login'} replace />;
}
