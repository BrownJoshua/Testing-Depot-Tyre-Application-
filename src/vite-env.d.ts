/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string; // the PUBLISHABLE key (safe for browsers). Never the service-role key.
  readonly VITE_AUTH_EMAIL_DOMAIN: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
