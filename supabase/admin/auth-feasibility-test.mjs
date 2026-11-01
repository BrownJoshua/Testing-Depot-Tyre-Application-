// MTC ERP - Stage 3, step 1: Employee-ID login feasibility test (ONE throw-away account).
//
// Run it yourself on your own machine:   node supabase/admin/auth-feasibility-test.mjs
//
// What it does (see documentation/stage2.1-employee-login-design.md section 8):
//   0. refuses to run unless public sign-up is switched off on the project
//   1. creates ONE test user (TEST-0001) with a synthetic email, trying candidate domains in order
//   2. signs in with the right password
//   3. checks wrong password and unknown ID give the same generic failure
//   4. inspects the token (no role is trusted from user-editable metadata)
//   5. bans the user -> sign-in and refresh must fail -> unban
//   6. resets the password -> old fails, new works
//   7. deletes the test user (always, even if a step fails) and confirms it is gone
//
// SECRETS: the service-role/secret key is read from the environment variable
// SUPABASE_SERVICE_ROLE_KEY or typed at a hidden prompt. It is never printed, never
// written to a file and never sent anywhere except your own Supabase project.
// Passwords are random, are never printed, and are discarded when the script ends.
// Nothing is written to the application database.

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const EXPECTED_URL = 'https://hfvjhzxgehyiuuqtfntz.supabase.co';
const TEST_ID = 'TEST-0001';
const DEFAULT_DOMAINS = ['mtc-erp-demo.invalid', 'mtc-erp-demo.test', 'mtc-erp-demo.example.com'];

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

// ---------- config ----------
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

const argv = process.argv.slice(2);
const argVal = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const domains = (argVal('--domains') ? argVal('--domains').split(',') : DEFAULT_DOMAINS).map((d) => d.trim()).filter(Boolean);
if (argVal('--own-domain')) domains.push(argVal('--own-domain').trim());

// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (n = 24) => randomBytes(n).toString('base64url').slice(0, n) + 'aA1!';
const results = [];
const record = (step, ok, detail = '') => { results.push({ step, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? ' - ' + detail : ''}`); };

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
async function api(method, p, { body, key = PUBLISHABLE, bearer, retry = 1 } = {}) {
  const headers = { 'Content-Type': 'application/json', apikey: key };
  const token = bearer || (key.split('.').length === 3 ? key : '');   // legacy JWT-style keys also go in Authorization
  if (token) headers.Authorization = `Bearer ${token}`;
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(SUPABASE_URL + p, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(25000) });
      const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
      return { status: r.status, json, text };
    } catch (e) {
      if (attempt >= retry) return { status: 0, json: null, text: String(e.message || e) };
      await sleep(1500);
    }
  }
}
const admin = (method, p, body) => api(method, p, { body, key: SERVICE });
const signIn = (email, password) => api('POST', '/auth/v1/token?grant_type=password', { body: { email, password } });
const errMsg = (r) => (r.json && (r.json.msg || r.json.error_description || r.json.message || r.json.error)) || r.text.slice(0, 120);
const decodeJwt = (t) => { try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString('utf8')); } catch { return null; } };

// ---------- main ----------
async function main() {
  console.log('\nMTC ERP - Employee-ID login feasibility test (one throw-away account)\n');

  // guards
  if (SUPABASE_URL !== EXPECTED_URL) { console.error(`STOP: VITE_SUPABASE_URL is "${SUPABASE_URL}" but this script only runs against ${EXPECTED_URL}.`); process.exit(2); }
  if (!PUBLISHABLE.startsWith('sb_publishable_') && PUBLISHABLE.split('.').length !== 3) { console.error('STOP: VITE_SUPABASE_ANON_KEY (publishable key) is missing or looks wrong.'); process.exit(2); }

  // step 0: sign-up must be closed (public, read-only endpoint)
  const settings = await api('GET', '/auth/v1/settings');
  if (settings.status !== 200 || !settings.json) { console.error('STOP: cannot read Auth settings:', settings.status, settings.text.slice(0, 120)); process.exit(2); }
  const closed = settings.json.disable_signup === true;
  record('0. public sign-up is switched off', closed, `disable_signup=${settings.json.disable_signup}`);
  if (!closed) {
    console.error('\nSTOP: public sign-up is ENABLED on this project. Anyone with the publishable key could register.\n' +
      'Turn it off in the Supabase dashboard (Authentication > Sign In / Providers > "Allow new users to sign up" = off), then run this script again.\n' +
      'Nothing was created.');
    process.exit(2);
  }

  // key
  SERVICE = env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!SERVICE) SERVICE = await askHidden('Paste the service-role / secret key (hidden; it is not shown or saved): ');
  if (!SERVICE || SERVICE.startsWith('sb_publishable_')) { console.error('STOP: that is not a service-role/secret key.'); process.exit(2); }

  console.log('\nKey received (it was not shown and is not saved). Do NOT paste it again - the next prompt is visible.');
  // harmless read-only check: does the Auth admin API accept this key? (nothing is created)
  console.log(`Key shape: starts with "${SERVICE.startsWith('sb_secret_') ? 'sb_secret_' : SERVICE.split('.').length === 3 ? '(legacy JWT)' : SERVICE.slice(0, 3) + '...'}", length ${SERVICE.length}`);
  const keyCheck = await admin('GET', '/auth/v1/admin/users?page=1&per_page=1');
  record('0b. key is accepted by the Auth admin API (read-only check)', keyCheck.status === 200, `status ${keyCheck.status}${keyCheck.status === 200 ? '' : ' - ' + errMsg(keyCheck)}`);
  if (keyCheck.status !== 200) {
    console.error('\nSTOP: Supabase rejected this key, so nothing was created.\n' +
      '- Use the NEW secret key you created after rotating (the old one no longer works).\n' +
      '- Copy it again with the copy button; make sure the whole value is pasted (a new-style key starts with sb_secret_).\n' +
      '- If you only have a legacy "service_role" key, that also works (long text with two dots).');
    process.exit(2);
  }
  console.log(`\nPlan: create ONE user "${TEST_ID}" in ${EXPECTED_URL}, test sign-in/ban/reset, then delete it.`);
  console.log(`Candidate email domains, in order: ${domains.join(', ')}`);
  const go = await ask('Type the three words CREATE TEST USER (not the key) and press Enter to continue: ');
  if (go !== 'CREATE TEST USER') { console.log('Cancelled. Nothing was created.'); process.exit(0); }

  // step 1: create with first working domain
  let password = rnd(); let userId = null; let email = ''; let usedDomain = '';
  const attempts = [];
  for (const d of domains) {
    const e = `${TEST_ID.toLowerCase()}@${d}`;
    const r = await admin('POST', '/auth/v1/admin/users', { email: e, password, email_confirm: true, app_metadata: { test_account: true } });
    attempts.push({ domain: d, status: r.status, message: r.status === 200 ? 'created' : errMsg(r) });
    console.log(`      domain ${d}: ${r.status === 200 ? 'accepted' : 'rejected (' + r.status + ') ' + errMsg(r)}`);
    if (r.status === 200 && r.json?.id) { userId = r.json.id; email = e; usedDomain = d; break; }
  }
  record('1. create test user with a synthetic email', !!userId, usedDomain ? `accepted domain: ${usedDomain}` : 'no candidate domain was accepted');

  try {
    if (userId) {
      // step 2
      let s = await signIn(email, password);
      record('2. sign in with Employee-ID-derived email + password', s.status === 200 && !!s.json?.access_token, `status ${s.status}`);
      const tokens = s.json || {};

      // step 3
      const wrong = await signIn(email, password + 'x');
      const unknown = await signIn(`nobody-9999@${usedDomain}`, password);
      record('3. wrong password and unknown ID fail identically', wrong.status === unknown.status && errMsg(wrong) === errMsg(unknown) && wrong.status >= 400,
        `wrong: ${wrong.status} "${errMsg(wrong)}" | unknown: ${unknown.status} "${errMsg(unknown)}"`);

      // step 4
      const claims = tokens.access_token ? decodeJwt(tokens.access_token) : null;
      record('4. token belongs to the created user; role claim is "authenticated" only', !!claims && claims.sub === userId && claims.role === 'authenticated',
        claims ? `app_metadata keys: [${Object.keys(claims.app_metadata || {}).join(', ')}], user_metadata keys: [${Object.keys(claims.user_metadata || {}).join(', ')}]` : 'cannot decode token');

      // step 5: ban
      const ban = await admin('PUT', `/auth/v1/admin/users/${userId}`, { ban_duration: '876000h' });
      const blocked = await signIn(email, password);
      const refresh = tokens.refresh_token ? await api('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: tokens.refresh_token } }) : { status: 0 };
      record('5. banned user cannot sign in or refresh', ban.status === 200 && blocked.status >= 400 && refresh.status >= 400,
        `ban ${ban.status}; sign-in ${blocked.status}; refresh ${refresh.status}`);
      const unban = await admin('PUT', `/auth/v1/admin/users/${userId}`, { ban_duration: 'none' });
      const back = await signIn(email, password);
      record('5b. unbanned user can sign in again', unban.status === 200 && back.status === 200, `unban ${unban.status}; sign-in ${back.status}`);

      // step 6: reset
      const newPw = rnd();
      const reset = await admin('PUT', `/auth/v1/admin/users/${userId}`, { password: newPw });
      const oldFails = await signIn(email, password);
      const newWorks = await signIn(email, newPw);
      password = newPw;
      record('6. administrator password reset: old fails, new works', reset.status === 200 && oldFails.status >= 400 && newWorks.status === 200,
        `reset ${reset.status}; old ${oldFails.status}; new ${newWorks.status}`);
    }
  } finally {
    // step 7: always remove the test user
    if (userId) {
      const del = await admin('DELETE', `/auth/v1/admin/users/${userId}`);
      const gone = await signIn(email, password);
      const look = await admin('GET', `/auth/v1/admin/users/${userId}`);
      record('7. test user deleted and can no longer sign in', del.status === 200 && gone.status >= 400 && look.status === 404, `delete ${del.status}; sign-in ${gone.status}; lookup ${look.status}`);
    }
  }

  // report (no secrets, no passwords, no tokens)
  const out = {
    ranAt: new Date().toISOString(), project: EXPECTED_URL, testId: TEST_ID, domainAttempts: attempts, acceptedDomain: usedDomain || null,
    results, allPassed: results.length > 0 && results.every((x) => x.ok),
  };
  const file = path.join(here, 'auth-test-result.local.json');
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`\n${out.allPassed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}.  Accepted domain: ${usedDomain || 'none'}`);
  console.log(`Result saved (no secrets) to ${path.relative(root, file)} - you can paste its contents to me.`);
  SERVICE = ''; password = '';
  process.exit(out.allPassed ? 0 : 1);
}

main().catch((e) => { console.error('Unexpected error:', e?.message || e); process.exit(1); });
