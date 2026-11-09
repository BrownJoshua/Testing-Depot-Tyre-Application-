# Deployment guide (Netlify + Supabase)

For the person who owns the accounts. No programming needed. Do the steps in order. Nothing here has been done for you: creating the site and changing the Supabase settings are your own account steps.

## What goes where

| Part | Where it lives |
|---|---|
| The screens (website) | Netlify, built from the GitHub repository `BrownJoshua/Testing-Depot-Tyre-Application-`, branch `main` |
| The data, logins and rules | Supabase project `hfvjhzxgehyiuuqtfntz` |
| Secret keys | Only on your own computer (`.env.admin.local`, `.demo-logins.local`). Never in GitHub, never in Netlify |

A check of the repository on 2026-11-09 found no Supabase access token (`sbp_...`), no secret key and none of the demo passwords in any saved file or in the history. `.gitignore` already keeps `.env`, `.env.*`, `*.local` and `dist/` out of GitHub.

## 1. Create the Netlify site

1. Sign in at netlify.com and choose **Add new site → Import an existing project → GitHub**.
2. Allow Netlify to read the repository `Testing-Depot-Tyre-Application-` and pick it.
3. Branch `main`. Build command `npm run build`, publish folder `dist` (already set in `netlify.toml`, so these fields fill themselves).
4. **Do not press Deploy yet.** First do step 2.

## 2. Set the environment variables

In Netlify: **Site configuration → Environment variables → Add a variable**. Add these three (the same values as in your local `.env` file):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://hfvjhzxgehyiuuqtfntz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the **publishable** key (starts with `sb_publishable_`), from Supabase → Project Settings → API Keys |
| `VITE_AUTH_EMAIL_DOMAIN` | the same value as in your `.env` (the login uses a synthetic address, `employee id` + `@` + this domain) |

Rules: never paste a key that starts with `sb_secret_` or a "service_role" key here. The app refuses to start if it sees one, because anything in these variables is visible to everyone who opens the website.

Now press **Deploy**. The first build takes about two minutes. Netlify gives you an address like `https://something.netlify.app`.

## 3. Tell Supabase about the website address

In Supabase: **Authentication → URL Configuration**.

- **Site URL:** your Netlify address (later your own domain, if you add one).
- **Redirect URLs:** add the Netlify address followed by `/**`, and keep `http://localhost:5173/**` for working on your computer.

This app signs in with Employee ID and password only (no email links), so no email provider needs setting up.

## 4. First check of the live site

1. Open the Netlify address. The login screen must appear.
2. Refresh on a deep address such as `/tic/job-cards`: it must not show "Page not found" (the rule in `netlify.toml` handles this).
3. Sign in as each role (see `.demo-logins.local` on your computer): `HOT-0114` (HO), `HOT-AE-021` (AM), `SUP-2231`, `TIC-1147`, `TM-3092` (open the Tyre Man on a phone).
4. The Tyre IC dashboard shows numbers.

## Everyday tasks

### Reset a demo password
Supabase → **Authentication → Users**, find `<employee id lower case>@<your domain>` (for example `tic-1147@...`), open it, choose **Reset password** / **Update user** and type a new one. Write it in `.demo-logins.local` on your computer. Do not send passwords by email or chat.

### Move the demo date
The demonstration runs on a business date set in the database (currently 2026-09-20), not on the real clock. In Supabase open **SQL Editor** and run, with the date you want:

```sql
select public.admin_set_demo_date('2026-09-25', true, 'owner');
```

Everything that depends on "today" (overdue, schedule due dates, dashboard) follows at once. Moving the date back does not undo documents already made.

### Change the database (new migration)
Only from your computer: `node supabase/admin/run-sql.mjs status` shows what is applied, `... migrate` applies the new files. A migration that has been applied is never edited; a fix is a new file. Needs the access token in `.env.admin.local`.

### Release a code change
Push to `main` on GitHub. Netlify builds and publishes by itself. Deploy previews are made for pull requests.

## Backup and rollback

- **Website rollback:** Netlify → **Deploys**, open an earlier good deploy, **Publish deploy**. Takes seconds, no data is touched.
- **Database backup:** Supabase → **Database → Backups**. Free projects keep no scheduled backups. Before a presentation, export a copy: **SQL Editor** is not a backup; use `supabase db dump` from your computer, or upgrade the project to get daily backups.
- **Database rollback:** there is no automatic undo for data. If a test left unwanted documents, restore from a backup, or ask for a clean-up migration.
- Test documents made so far (job cards, WSR, MRN, SRN, postings) are ordinary demo data and stay until cleaned.

## Go-live checklist

- [ ] Netlify variables set (3), no secret key among them
- [ ] First deploy green; login screen opens; deep-link refresh works
- [ ] Supabase Site URL and Redirect URLs set to the Netlify address
- [ ] All five roles sign in; Tyre Man tested on a real phone
- [ ] Passwords reset to ones you keep privately; `.demo-logins.local` updated
- [ ] Demo date set for the presentation day
- [ ] A backup or export taken
- [ ] Row-level security still on for every table (run `node supabase/admin/run-sql.mjs test` on the latest test files; each must say PASS)
- [ ] Share the address and the logins only with people who should see the demonstration
- [ ] The Supabase access token (`sbp_...`) is revoked or kept only on your computer once setup is finished

## If something goes wrong

| Sign | Likely cause | Fix |
|---|---|---|
| White page, console says "Missing VITE_SUPABASE_URL" | variables not set before the build | set them, then **Deploys → Trigger deploy → Clear cache and deploy** |
| "Invalid login" for a right password | wrong `VITE_AUTH_EMAIL_DOMAIN` | make it match the domain the accounts were created with |
| Page not found after refresh | `netlify.toml` missing from the deploy | check it is in the repository root |
| Lists are empty after login | the user is not linked to an employee, or RLS blocks | check the Employee ID in Supabase and the `profiles` table |

## Installing the Tyre Man app on a phone

The Tyre Man app is a web app that installs like a normal app (no app store). After the site is live on Netlify (it must be https):

- **Android (Chrome):** open the site address, sign in as a Tyre Man, tap **Install** in the blue box at the top of My Jobs (or the browser menu, then Install app).
- **iPhone (Safari):** open the address, tap the Share button, then **Add to Home Screen**.
- The app opens full screen with its own icon. The camera is used for photos and for the **Scan** button beside the tyre number (Scan shows only on phones whose browser supports barcode scanning; otherwise the number is typed).
- Without internet the app opens but shows no data; it needs the network to read and save work.
- Updates reach the phone the next time the app is opened with internet.
