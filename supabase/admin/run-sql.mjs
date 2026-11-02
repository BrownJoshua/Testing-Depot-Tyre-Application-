// MTC ERP - administrator script: run migrations and tests against the Supabase project.
//
//   Check the token works:               node supabase/admin/run-sql.mjs ping
//   One-time: mark 0001-0012 as applied: node supabase/admin/run-sql.mjs baseline
//   Show what is applied / pending:      node supabase/admin/run-sql.mjs status
//   Apply every pending migration:       node supabase/admin/run-sql.mjs migrate
//   Run a test file (rolls itself back): node supabase/admin/run-sql.mjs test supabase/tests/0012_tyre_masters_test.sql
//
// Runs ONLY on the project owner's machine. Not an ERP role; no screen in the application.
//
// SAFETY
//   - A migration is applied at most once: names are recorded in app.applied_migrations, and a file whose
//     content changed after it was applied is refused (never re-run a changed file; add a new one).
//   - A migration is sent as one request, so it applies completely or not at all.
//   - Migrations stop at the first error. Test files carry their own begin ... rollback.
//
// SECRET: a Supabase personal access token (sbp_...) is read from SUPABASE_ACCESS_TOKEN or from the
// git-ignored file .env.admin.local. It is never printed, logged or committed.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PROJECT_REF = 'hfvjhzxgehyiuuqtfntz';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const migDir = path.join(root, 'supabase', 'migrations');

function loadDotEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const env = { ...loadDotEnv(path.join(root, '.env.admin.local')), ...process.env };
const TOKEN = env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) die('SUPABASE_ACCESS_TOKEN is not set. Put it in .env.admin.local as:  SUPABASE_ACCESS_TOKEN=sbp_...');
if (!TOKEN.startsWith('sbp_')) die(`That does not look like a personal access token (it should start with "sbp_"; yours starts with "${TOKEN.slice(0, 4)}").`);

function die(msg) { console.error(`\nSTOP: ${msg}`); process.exit(1); }

async function sql(query, attempt = 1) {
  let res;
  try {
    res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
  } catch (e) {
    if (attempt < 3) { await new Promise((r) => setTimeout(r, 1500 * attempt)); return sql(query, attempt + 1); }
    throw new Error(`network error: ${e.message}`);
  }
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (res.status === 401 || res.status === 403) throw new Error(`Supabase refused the token (${res.status}). Create a new token and replace the one in .env.admin.local.`);
  if (!res.ok) throw new Error(typeof body === 'object' && body?.message ? body.message : String(text).slice(0, 800));
  return body;
}

const sha = (s) => createHash('sha256').update(s.replace(/\r\n/g, '\n')).digest('hex');
const files = () => readdirSync(migDir).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
const read = (f) => readFileSync(path.join(migDir, f), 'utf8');
const LEDGER = `create table if not exists app.applied_migrations (
  name text primary key, checksum text not null, applied_at timestamptz not null default now());
revoke all on app.applied_migrations from public, anon, authenticated;`;

async function applied() {
  await sql(LEDGER);
  const rows = await sql('select name, checksum from app.applied_migrations order by name');
  return new Map(rows.map((r) => [r.name, r.checksum]));
}

const [cmd, arg] = process.argv.slice(2);

try {
  if (cmd === 'ping') {
    const r = await sql("select current_database() as db, current_setting('server_version') as pg");
    console.log('OK: token accepted.', JSON.stringify(r[0]));
  } else if (cmd === 'baseline') {
    const done = await applied();
    for (const f of files()) {
      if (done.has(f)) continue;
      await sql(`insert into app.applied_migrations (name, checksum) values ('${f}', '${sha(read(f))}')`);
      console.log(`marked as applied: ${f}`);
    }
    console.log('Baseline done. Only run this once, for migrations you have already applied by hand.');
  } else if (cmd === 'status') {
    const done = await applied();
    for (const f of files()) {
      const c = done.get(f);
      console.log(`${c === undefined ? 'PENDING ' : c === sha(read(f)) ? 'applied ' : 'CHANGED '} ${f}`);
    }
  } else if (cmd === 'migrate') {
    const done = await applied();
    const changed = files().filter((f) => done.has(f) && done.get(f) !== sha(read(f)));
    if (changed.length) die(`These applied files were edited afterwards: ${changed.join(', ')}. Add a new migration instead.`);
    const pending = files().filter((f) => !done.has(f));
    if (!pending.length) console.log('Nothing pending.');
    for (const f of pending) {
      process.stdout.write(`applying ${f} ... `);
      const body = read(f);
      // one request = one implicit transaction; the ledger row is part of it
      await sql(`${body}\n;\ninsert into app.applied_migrations (name, checksum) values ('${f}', '${sha(body)}');`);
      console.log('done');
    }
  } else if (cmd === 'test') {
    if (!arg) die('Give the test file: run-sql.mjs test supabase/tests/<file>.sql');
    const file = path.resolve(root, arg);
    if (!existsSync(file)) die(`File not found: ${arg}`);
    await sql(readFileSync(file, 'utf8'));
    console.log(`PASS  ${arg}  (ran inside a transaction that rolled back)`);
  } else {
    die('Commands: ping | baseline | status | migrate | test <file>');
  }
} catch (e) {
  console.error(`\nFAILED: ${e.message}`);
  process.exit(1);
}
