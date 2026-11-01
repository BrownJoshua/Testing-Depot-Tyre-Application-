import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { authEmailDomain, supabase } from './supabase';
import type { Me } from './types';

/** One message for every failure, so the form never reveals which part was wrong. */
export const GENERIC_ERROR = 'Employee ID or password is incorrect.';
const EMPLOYEE_ID_RE = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

/** Employee ID -> the internal sign-in identity. Users never see or type this. */
export function employeeEmail(employeeId: string): string {
  return `${employeeId.trim().toLowerCase()}@${authEmailDomain}`;
}

interface AuthState {
  loading: boolean;
  me: Me | null;
  notice: string | null;
  signIn: (employeeId: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Ask the database who we are. The role and depot come from here, never from the browser. */
async function fetchMe(): Promise<Me | null> {
  const { data, error } = await supabase.rpc('my_session');
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as Me;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) { setMe(null); setLoading(false); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    // not awaited inside the auth callback (avoids a known client deadlock); runs as its own effect
    void fetchMe().then(async (row) => {
      if (cancelled) return;
      if (!row) {
        // valid password but no active employee behind it: treat exactly like a failed sign-in
        await supabase.auth.signOut();
        setMe(null);
        setNotice(GENERIC_ERROR);
      } else {
        setMe(row);
        setNotice(null);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const signIn = useCallback(async (employeeId: string, password: string) => {
    const code = employeeId.trim().toUpperCase();
    if (!EMPLOYEE_ID_RE.test(code) || !password || !authEmailDomain) return GENERIC_ERROR;
    setNotice(null);
    const { error } = await supabase.auth.signInWithPassword({ email: employeeEmail(code), password });
    return error ? GENERIC_ERROR : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMe(null);
  }, []);

  const value = useMemo(() => ({ loading, me, notice, signIn, signOut }), [loading, me, notice, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
