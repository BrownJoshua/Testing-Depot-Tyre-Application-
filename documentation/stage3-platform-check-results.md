# Stage 3, Step 2 — Platform Check Results

Run on 1 Nov 2026 by the project owner in the Supabase SQL Editor, using the **read-only** query `supabase/admin/platform-check-readonly.sql`. It changed nothing. The output contains role names, settings and counts only.

## 1. Results and what they mean

| Item | Result | Meaning for the design |
|---|---|---|
| Database | PostgreSQL **17.11** (`row_security = on`) | `security_invoker` views are supported (needs 15+), so finding **S-01** can be fixed as designed |
| Empty project | `public` has **0 tables and 0 functions**; 0 auth users; 0 storage buckets | Clean slate. The login-test user was really deleted (`auth_user_count = 0`) |
| `postgres` role | `bypassrls = true`, not superuser | **S-03 resolved:** helper functions owned by `postgres` bypass RLS even when `FORCE ROW LEVEL SECURITY` is set, so we can keep `FORCE` on all tables and avoid recursion. Migrations must run as `postgres` |
| `service_role` | `bypassrls = true` | Expected; used only by the local administrator script |
| `anon`, `authenticated`, `authenticator` | no bypass | Correct: RLS applies to every browser user |
| **Default privileges in `public`** | tables created by `postgres` are automatically granted **all rights (`arwdDxtm`) to `anon`, `authenticated`, `service_role`**; functions get `EXECUTE` for all three; sequences get `rwU` | **S-05 confirmed (high):** without action, a new table without RLS would be open to the public. Fixed by migration `0002` (proposed, not applied) |
| `anon`/`authenticated` on schema `public` | `USAGE = true`, `CREATE = false` | Normal and required for the API; nobody can create objects |
| Extensions installed | `pgcrypto`, `uuid-ossp`, `pg_stat_statements` | |
| Extensions available, not installed | **`btree_gist`** (needed for exclusion constraints), **`pg_trgm`** (search), `citext`, `pg_cron` | `btree_gist` and `pg_trgm` go in migration `0001`; `pg_cron` stays off until scheduling is built; `uuid-ossp` is not needed (`gen_random_uuid()` is built in) |
| Realtime | **no tables published** | S-16: nothing leaks; we publish only `job_tasks`, `notifications`, `master_change_requests` later |
| Schemas | `auth, extensions, graphql, graphql_public, pgbouncer, public, realtime, storage, vault` | There is **no `app` schema yet**; it will be created by `0001` and must not be exposed |

## 2. New finding

**S-22 (low–medium): GraphQL schema.** The `graphql` and `graphql_public` schemas exist, so the project exposes a GraphQL endpoint. Row-level security still protects data, but the endpoint can show table and column names to anyone with the public key. The ERP does not use GraphQL. Recommendation (needs your approval, dashboard): disable the `pg_graphql` extension (Database → Extensions) before the real tables are created. Not part of the migration files.

## 3. Changes this causes

| Item | Change |
|---|---|
| `stage2.1-security-review.md` | S-03 resolved, S-05 confirmed, S-22 added (recorded in this file) |
| Migrations | `0001_extensions_and_schemas.sql` and `0002_default_privileges_hardening.sql` written, **not applied**; test `supabase/tests/0002_default_privileges_test.sql` (rolls back its own work) |

## 4. Still needed from the dashboard (read-only; do not change anything)

1. **Project Settings → Data API:** the *Exposed schemas* list (expect `public`, `graphql_public`; `app` must not appear) and any option about automatically exposing new tables.
2. **Authentication → Sign In / Providers → Email:** minimum password length; whether "Confirm email" is on.
3. **Authentication → Sessions:** JWT expiry.
4. **Project Settings → General / Billing:** confirm the plan (the dashboard shows **Free**) and note that free projects can be paused after a period of inactivity; check the current limits before the demo.

## 5. Status update (1 Nov 2026)

Migrations `0001` and `0002` were **approved and applied by the project owner** in the SQL Editor; the test `0002_default_privileges_test.sql` **passed** (no assertion failed). Batch 2 (identity foundation) follows.

## 6. Next step
Approve (or change) migrations `0001` and `0002`; after you run them in the SQL Editor and the test passes, batch 2 creates the identity foundation (`org_units`, `depots`, `roles`, `employees`, `profiles`, helper functions, the active-user gate).
