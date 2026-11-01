-- MTC ERP - Stage 3 step 2: platform check (READ-ONLY).
-- Changes nothing: it only reads system catalogues and returns ONE json value.
-- Run in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- The result contains role names, counts and settings only - no keys, no passwords, no personal data.

select jsonb_pretty(jsonb_build_object(
  'postgres_version', version(),
  'server_version_num', current_setting('server_version_num'),
  'current_user', current_user,
  'row_security_setting', current_setting('row_security'),

  -- S-03: do the roles that will own helper functions bypass RLS?
  'roles', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'role', rolname, 'bypassrls', rolbypassrls, 'superuser', rolsuper, 'login', rolcanlogin) order by rolname), '[]'::jsonb)
    from pg_roles
    where rolname in ('postgres','anon','authenticated','service_role','authenticator','supabase_admin','supabase_auth_admin')
  ),

  -- S-05: privileges that new tables/functions/sequences receive automatically
  'default_privileges', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'owner_role', defaclrole::regrole::text, 'schema', coalesce(defaclnamespace::regnamespace::text,'(all)'),
             'object_type', defaclobjtype::text, 'acl', defaclacl::text) order by 1), '[]'::jsonb)
    from pg_default_acl
  ),

  -- do anon / authenticated currently have rights on the public schema?
  'schema_usage_public', jsonb_build_object(
      'anon', has_schema_privilege('anon','public','USAGE'),
      'authenticated', has_schema_privilege('authenticated','public','USAGE'),
      'anon_can_create', has_schema_privilege('anon','public','CREATE')),

  -- what already exists in public (should be empty before our migrations)
  'public_tables', (
    select coalesce(jsonb_agg(jsonb_build_object('table', tablename, 'rls', rowsecurity)), '[]'::jsonb)
    from pg_tables where schemaname = 'public'
  ),
  'public_function_count', (
    select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
  ),
  'schemas', (
    select coalesce(jsonb_agg(nspname order by nspname), '[]'::jsonb)
    from pg_namespace where nspname not like 'pg\_%' and nspname <> 'information_schema'
  ),

  -- extensions we plan to use (btree_gist for exclusion constraints, pg_trgm for search, pgcrypto/uuid, pg_cron optional)
  'extensions', (
    select coalesce(jsonb_agg(jsonb_build_object('name', name, 'available_version', default_version, 'installed', installed_version)
                    order by name), '[]'::jsonb)
    from pg_available_extensions
    where name in ('pgcrypto','pg_trgm','btree_gist','uuid-ossp','pg_cron','pg_stat_statements','citext')
  ),

  -- S-16: which tables Realtime publishes
  'realtime_published_tables', (
    select coalesce(jsonb_agg(schemaname || '.' || tablename), '[]'::jsonb)
    from pg_publication_tables where pubname = 'supabase_realtime'
  ),

  -- confirms the login-test user was really deleted (expect 0 unless you created others)
  'auth_user_count', (select count(*) from auth.users),
  'storage_bucket_count', (select count(*) from storage.buckets)
)) as platform_check;
