-- 0002: stop new objects in "public" from being handed to the API roles automatically.
-- STATUS: proposed in Stage 3, NOT applied. Review and approve before running.
--
-- Why (platform check, security finding S-05): on this project every table, function and
-- sequence that the "postgres" role creates in public is automatically granted to anon,
-- authenticated and service_role (tables: arwdDxtm, functions: execute, sequences: rwU).
-- So a table created without RLS would be readable and writable by the public.
-- After this migration new objects start with NO access for anon/authenticated and each
-- migration grants only what is needed (RLS then filters rows).
--
-- service_role keeps its default grants: it is used only by the local administrator script,
-- never by the browser.
--
-- Scope: our migrations run as the "postgres" role, so only postgres' defaults matter here.
-- Defaults owned by supabase_admin (Supabase's own internals) are deliberately left alone.

-- tables, views, materialized views
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

-- sequences
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

-- functions: remove the explicit schema-level grants ...
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

-- ... and the implicit PostgreSQL default that lets PUBLIC execute any new function.
-- (This form has no IN SCHEMA clause because PUBLIC's default is global for the role.)
alter default privileges for role postgres
  revoke execute on functions from public;

-- Defence in depth: nobody may create objects in public except the owner.
revoke create on schema public from public;
