// MTC ERP - administrator script: create login accounts for EXISTING employee records.
//
//   Preview only (default, creates nothing):  node supabase/admin/create-users.mjs
//   Actually create the accounts:             node supabase/admin/create-users.mjs --yes
//   Only some employees:                      node supabase/admin/create-users.mjs --codes HOT,TIC --yes
//
// Runs ONLY on the project owner's machine. It is not an ERP role and has no screen in the application.
//
// What it does, per employee (see documentation/stage2.1-employee-login-design.md):
//   - reads the employee row (role and depot come from the DATABASE, never from this script)
//   - requires: ACTIVE, is_login_enabled = true, no login yet
//   - creates the Supabase Auth user with the synthetic email <code>@<AUTH_EMAIL_DOMAIN>
//   - creates the profile row linking the Auth user to the employee
//   - signs in as the new user and calls my_session() to prove the role the database reports
//   - if the profile step fails, it deletes the Auth user it just created (no half-made accounts)
//
// SECRETS: the service-role/secret key is read from the environment (SUPABASE_SERVICE_ROLE_KEY) or a
// hidden prompt. It is never printed or saved. Each password is random, shown ONCE in this terminal and
// never written to a file or log. Copy them somewhere safe; they cannot be read back later (only reset).

import { readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const EXPECTED_URL = 'https://hfvjhzxgehyiuuqtfntz.supabase.co';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

function loadDotEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2];
  }
  return out;
}
const env = { ...loadDotEnv(path.join(root, '.env')), ...process.env };
const SUPABASE_URL = (env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const PUBLISHABLE = env.VITE_SUPABASE_ANON_KEY || '';
const DOMAIN = (env.VITE_AUTH_EMAIL_DOMAIN || '').trim();

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const argVal = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const wanted = argVal('--codes') ? argVal('--codes').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : null;
const doIt = flag('--yes');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const newPassword = () => randomBytes(15).toString('base64url') + 'aA1!';
const errMsg = (r) => (r.json && (r.json.msg || r.json.error_description || r.json.message || r.json.error || r.json.hint)) || r.text.slice(0, 160);

function ask(q) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(q, (a) => { rl.close(); res(a.trim()); }));
}
function askHidden(q) {
  return new Promise((res) => {
    process.stdout.write(q);
    const stdin = process.stdin; let s = '';
    stdin.setRawMode?.(true); stdin.resume(); stdin.setEncoding('utf8');
    const on = (chunk) => {
      for (const c of chunk) {
        if (c === '\r' || c === '\n') { stdin.setRawMode?.(false); stdin.pause(); stdin.off('data', on); process.stdout.write('\n'); return res(s.trim()); }
        if (c === '\u0003') process.exit(130);
        if (c === '\u007f' || c === '\b') s = s.slice(0, -1); else s += c;
      }
    };
    stdin.on('data', on);
  });
}

let SERVICE = '';
async function http(method, p, { body, key, bearer, prefer } = {}) {
  const headers = { 'Content-Type': 'application/json', apikey: key };
  const token = bearer || (key.split('.').length === 3 ? key : '');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (prefer) headers.Prefer = prefer;
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(SUPABASE_URL + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(25000) });
      const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
      return { status: r.status, json, text };
    } catch (e) {
      // status 0 = no answer at all (network drop), NOT a rejected key; retry a few times with growing pauses
      if (attempt >= 4) return { status: 0, json: null, text: String(e.message || e) };
      await sleep(2000 * (attempt + 1));
    }
  }
}
const admin = (m, p, b, prefer) => http(m, p, { body: b, key: SERVICE, prefer });
const publicApi = (m, p, b, bearer) => http(m, p, { body: b, key: PUBLISHABLE, bearer });

async function main() {
  console.log('\nMTC ERP - create login accounts for existing employees\n');
  if (SUPABASE_URL !== EXPECTED_URL) { console.error(`STOP: VITE_SUPABASE_URL is "${SUPABASE_URL}", expected ${EXPECTED_URL}.`); process.exit(2); }
  if (!PUBLISHABLE) { console.error('STOP: VITE_SUPABASE_ANON_KEY (publishable key) missing in .env'); process.exit(2); }
  if (!DOMAIN) { console.error('STOP: VITE_AUTH_EMAIL_DOMAIN is empty in .env (expected mtc-erp-demo.invalid).'); process.exit(2); }

  const settings = await publicApi('GET', '/auth/v1/settings');
  if (settings.status !== 200 || settings.json?.disable_signup !== true) {
    console.error('STOP: public sign-up is not switched off (or settings unreadable). Nothing was created.'); process.exit(2);
  }
  console.log('PASS  public sign-up is switched off');

  SERVICE = env.SUPABASE_SERVICE_ROLE_KEY || await askHidden('Paste the service-role / secret key (hidden; not shown or saved): ');
  if (!SERVICE || SERVICE.startsWith('sb_publishable_')) { console.error('STOP: that is not a service-role/secret key.'); process.exit(2); }
  console.log(`Key shape: starts with "${SERVICE.startsWith('sb_secret_') ? 'sb_secret_' : SERVICE.split('.').length === 3 ? '(legacy JWT)' : SERVICE.slice(0, 3) + '...'}", length ${SERVICE.length}`);
  const keyCheck = await admin('GET', '/auth/v1/admin/users?page=1&per_page=1');
  if (keyCheck.status === 0) { console.error('STOP: could not reach Supabase (network problem, not a key problem). Check your connection and run the command again. Nothing was created.'); process.exit(2); }
  if (keyCheck.status !== 200) { console.error(`STOP: Supabase rejected this key (HTTP ${keyCheck.status}). Use the current secret key. Nothing was created.`); process.exit(2); }
  console.log('PASS  key accepted by the Auth admin API');

  // employees to give logins to
  const cols = 'id,employee_code,full_name,role_code,org_unit_id,status,is_login_enabled';
  const q = wanted ? `&employee_code=in.(${wanted.map(encodeURIComponent).join(',')})` : '&is_login_enabled=eq.true&status=eq.ACTIVE';
  const emp = await admin('GET', `/rest/v1/employees?select=${cols}${q}&order=employee_code`);
  if (emp.status !== 200 || !Array.isArray(emp.json)) { console.error('STOP: cannot read employees:', emp.status, errMsg(emp)); process.exit(2); }
  const depots = await admin('GET', '/rest/v1/org_units?select=id,code,name&unit_type=eq.DEPOT');
  const depotById = Object.fromEntries((depots.json || []).map((d) => [d.id, d]));
  const existing = await admin('GET', '/rest/v1/profiles?select=employee_id');
  const hasLogin = new Set((existing.json || []).map((p) => p.employee_id));

  const plan = []; const skipped = [];
  for (const e of emp.json) {
    if (e.status !== 'ACTIVE') skipped.push([e.employee_code, 'employee is not ACTIVE']);
    else if (!e.is_login_enabled) skipped.push([e.employee_code, 'is_login_enabled is false']);
    else if (hasLogin.has(e.id)) skipped.push([e.employee_code, 'already has a login']);
    else plan.push(e);
  }
  if (wanted) for (const c of wanted) if (!emp.json.some((e) => e.employee_code === c)) skipped.push([c, 'no such employee']);

  console.log(`\nPlan (${doIt ? 'will create' : 'PREVIEW ONLY - nothing is created'}):`);
  for (const e of plan) console.log(`  ${e.employee_code.padEnd(12)} ${e.role_code.padEnd(4)} ${(depotById[e.org_unit_id]?.name || '(no depot)').padEnd(14)} -> ${e.employee_code.toLowerCase()}@${DOMAIN}`);
  for (const [c, why] of skipped) console.log(`  skipped ${c}: ${why}`);
  if (!plan.length) { console.log('\nNothing to create.'); process.exit(0); }
  if (!doIt) { console.log('\nPreview finished. Run again with --yes to create these accounts.'); process.exit(0); }

  const go = await ask(`\nType CREATE ${plan.length} ACCOUNTS to continue: `);
  if (go !== `CREATE ${plan.length} ACCOUNTS`) { console.log('Cancelled. Nothing was created.'); process.exit(0); }

  const made = []; const failed = [];
  for (const e of plan) {
    const email = `${e.employee_code.toLowerCase()}@${DOMAIN}`; const password = newPassword();
    const created = await admin('POST', '/auth/v1/admin/users', { email, password, email_confirm: true, app_metadata: { employee_code: e.employee_code } });
    if (created.status !== 200 || !created.json?.id) { failed.push([e.employee_code, `auth user: ${errMsg(created)}`]); continue; }
    const uid = created.json.id;
    const prof = await admin('POST', '/rest/v1/profiles', { id: uid, employee_id: e.id }, 'return=minimal');
    if (prof.status !== 201 && prof.status !== 204) {
      await admin('DELETE', `/auth/v1/admin/users/${uid}`);      // never leave a half-made account
      failed.push([e.employee_code, `profile: ${errMsg(prof)} (auth user removed)`]); continue;
    }
    // prove it end to end: sign in, then ask the database who it thinks we are
    const si = await publicApi('POST', '/auth/v1/token?grant_type=password', { email, password });
    let verified = false, seen = '';
    if (si.status === 200 && si.json?.access_token) {
      const ms = await publicApi('POST', '/rest/v1/rpc/my_session', {}, si.json.access_token);
      const row = Array.isArray(ms.json) ? ms.json[0] : null;
      seen = row ? `${row.role_code}${row.org_unit_name ? ' @ ' + row.org_unit_name : ''}` : `my_session ${ms.status}`;
      verified = !!row && row.employee_code === e.employee_code && row.role_code === e.role_code;
    } else seen = `sign-in ${si.status}`;
    made.push({ code: e.employee_code, role: e.role_code, password, verified, seen });
  }

  console.log('\n================ RESULT ================');
  for (const m of made) console.log(`${m.verified ? 'OK  ' : 'WARN'} ${m.code.padEnd(12)} ${m.role.padEnd(4)} database says: ${m.seen}`);
  for (const [c, why] of failed) console.log(`FAIL ${c}: ${why}`);
  if (made.length) {
    console.log('\nPASSWORDS - shown ONCE. Copy them now to a safe place. They are not stored anywhere.');
    for (const m of made) console.log(`  ${m.code.padEnd(12)} ${m.password}`);
  }
  console.log('\nThe application database was changed only by adding profile rows.');
  SERVICE = '';
  process.exit(failed.length || made.some((m) => !m.verified) ? 1 : 0);
}
main().catch((e) => { console.error('Unexpected error:', e?.message || e); process.exit(1); });
