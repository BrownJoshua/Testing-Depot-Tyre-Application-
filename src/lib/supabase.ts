import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !publishableKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.');
}
// Guard: a service-role/secret key must never reach a browser bundle.
if (publishableKey.startsWith('sb_secret_')) {
  throw new Error('VITE_SUPABASE_ANON_KEY holds a SECRET key. Use the publishable key only.');
}

export const authEmailDomain = (import.meta.env.VITE_AUTH_EMAIL_DOMAIN || '').trim();

export const supabase = createClient(url, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
