-- 0001: extensions and the private application schema.
-- STATUS: proposed in Stage 3, NOT applied. Review and approve before running.
--
-- Why (from the platform check on the live project):
--   * btree_gist is needed for exclusion constraints (non-overlapping norm date ranges,
--     one open fitment span per tyre); it is available but not installed.
--   * pg_trgm is needed for fast search on folios, vendors and fleets; available, not installed.
--   * gen_random_uuid() is built into PostgreSQL 17, so uuid-ossp is not needed by us.
--   * pg_cron is available but optional; it is NOT enabled here (decide when scheduling is built).
-- Extensions go in the existing "extensions" schema, not in public.

create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_trgm    with schema extensions;

-- Private schema for helper and internal functions (current_role, next_doc_no, apply_*, ...).
-- It must NEVER be listed under "Exposed schemas" in Project Settings > Data API.
create schema if not exists app;
comment on schema app is 'Private functions for the MTC ERP. Not exposed through the Data API.';

-- Nobody can use the schema until later migrations grant exactly what policies need.
revoke all on schema app from public, anon, authenticated;
