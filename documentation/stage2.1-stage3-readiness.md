# Stage 2.1 — Stage 3 Readiness

**Update: Stage 2 and 2.1 are approved. UQ-12 is decided (you run the one-account login test locally, I guide) and UQ-30 is decided (you set up Git yourself). Stage 3 starts once you confirm Git is ready and you have the Supabase keys on your machine (service-role key never in chat).** All other open questions gate later stages, not Stage 3.

Nothing was created: no tables, migrations, Supabase users, Git repository, or React code.

---

## 1. Git inspection (read-only, nothing changed)

### 1.1 Findings
| Check | Result |
|---|---|
| Is the folder a Git repository? | **No.** `git rev-parse --is-inside-work-tree` → "not a git repository". No `.git` in the folder or any parent folder |
| Is the correct GitHub remote configured? | **No remote exists** (there is no repository to hold one). The URL you gave earlier is `https://github.com/BrownJoshua/Testing-Depot-Tyre-Application-.git`; I did **not** contact it |
| Current branch | none |
| Working tree status | not applicable (no repository) |
| Existing commits | none |
| `.gitignore` | **absent** |
| Git itself | installed and responding |

Files currently in `C:\Users\USER\Desktop\Test DTyre App`:

| Item | Size / date | Note |
|---|---|---|
| `MTC-Depot-Tyre-Prototype.html` | 41,491,119 bytes, unchanged since Stage 1 | the original prototype; **must never be overwritten** |
| `documentation/` | Stage 1, Stage 2, Stage 2.1 documents + `audit-tools/` | |
| `documentation.zip` | 158,998 bytes, modified 01-Nov-2026 17:02 when first seen | not created by me and **not opened**. It was **no longer in the folder at the end of this stage**; I did not remove it (presumably you moved or deleted it) |
| `MTC_Tyre_Master.xlsx` | 6,168,537 bytes, modified 28-Jul-2026 | not created by me; **not opened**. It may contain real operational data, so it must not be committed or used for seed data until you say what it is |

I did not initialise Git, add a remote, commit, push, move or delete anything.

### 1.2 Recommendation
Do not `git init` blindly. First decide how the GitHub repository and this folder relate (UQ-30). Three safe options:

| Option | When to choose | Risk |
|---|---|---|
| **(a)** You set it up yourself with the commands below | You want full control | lowest |
| **(b)** You authorise me to run `git init` and add the existing remote only (no commit or push) | Repository on GitHub is empty or you are happy to merge later | low |
| **(c)** Clone the GitHub repository into a **new** folder and copy files in | The GitHub repository already has content | lowest risk of clobbering; most manual |

### 1.3 Safe sequence (nothing here has been run)
1. **Check whether the GitHub repository is empty** (read-only).

```bash
git ls-remote https://github.com/BrownJoshua/Testing-Depot-Tyre-Application-.git
```
Empty output means no branches yet. If it lists branches, choose option (c).

2. **Create `.gitignore` before the first `git add`.** Suggested content:

```
.env
.env.*
!.env.example
.env.admin.local
node_modules/
dist/
.netlify/
supabase/.temp/
*.local
*.log
# keep out until reviewed (may contain real data):
MTC_Tyre_Master.xlsx
*.zip
```

3. **Initialise** (only if the folder is not yet a repository and you chose (a) or (b)):

```bash
git init -b main
```

4. **Add the remote** (it only records the URL):

```bash
git remote add origin https://github.com/BrownJoshua/Testing-Depot-Tyre-Application-.git
```

5. **Review before the first commit:** `git status` and `git add -n .` (dry run). Confirm that `MTC_Tyre_Master.xlsx`, `documentation.zip` and any key files are *not* listed.
6. **Never** use `git push --force`, `git reset --hard`, `git clean`, or `git checkout --` on files you want to keep. If the remote already has commits, fetch and merge deliberately; do not overwrite.
7. The 41 MB prototype is below GitHub's 50 MB warning threshold and 100 MB hard limit, so it can be committed. Moving it to `/reference/` is optional and only on your word.

---

## 2. Gating items

### 2.1 Required before Stage 3 starts
| # | Item | Status |
|---|---|---|
| G-1 | Your approval of Stage 2 and Stage 2.1 documents (including the 11 new tables, the MRN→GRN merge, the 27th master entity) | **done** |
| G-2 | **UQ-12**: one-account Auth test authorised; you run it locally, I guide; service-role key stays on your machine | **decided** — waiting for keys to be ready |
| G-3 | **UQ-30**: you set up Git yourself | **decided** — waiting for your confirmation that it is done |

### 2.2 Not needed for Stage 3
35 later-stage blockers and 4 optional enhancements are listed in `stage2-unresolved-business-questions.md` (sections C and D) with the stage that first needs each. In particular:
- **Stage 4:** 11 questions (air-type route, reason chain, deactivation of in-use masters, bulk approval, depot parameters, shift names, job codes, Vendor scope, allocation rules, tyre-correction whitelist, draft discard).
- **Stage 5a:** 4 (Supervisor register rights, tablet, Aadhaar, number scope for JC/JID/CMPID).
- **Stage 5b:** 16 (DRN, damage report, premature failure, Central Store operator, MTC Tyre No, receipt document, ICRN, tools & equipment, WSR/TRS/other numbers, accessories, reference lists, loss formula, dead links).
- **Stage 6:** 3. **Stage 7:** 1.

### 2.3 Optional future enhancements (never block)
Multi-depot cover (UQ-18), depot hubs (UQ-46), in-app demo date control (UQ-47), forced first-login password change (UQ-48), MFA for HO/AM, CSV bulk import, access-token hook, Edge Function login fallback, photo thumbnails, depot-prefixed mock fleet numbers.

---

## 3. What Stage 3 will deliver

Foundation only — masters and workflows follow in Stage 4.

| # | Deliverable | Notes |
|---|---|---|
| 1 | **Auth feasibility result** (one test account, protocol in `stage2.1-employee-login-design.md` §8) | decides the email domain; written up before anything depends on it |
| 2 | **Platform spike**: confirm Supabase default grants, view invoker behaviour, RLS-bypass ownership of helper functions, Realtime publications | answers security findings S-01, S-03, S-05 |
| 3 | **Supabase project settings checklist** applied and recorded: sign-ups off, no anonymous sign-ins, email confirmation not needed for admin-created users, password minimum, JWT expiry, only `public` exposed | you confirm in the dashboard |
| 4 | **Numbered migrations** (applied only after you approve each batch): extensions/schemas · enums · `org_units` + `depots` + 33 depots (MOCK codes) + 4 units · `roles`, `role_capabilities`, `employees`, `profiles` · helper functions (`current_role`, `visible_depot_ids`, `is_active_user`, `business_today`) · restrictive active-user gate and base RLS on every table · audit log + triggers · `document_number_series` / `document_sequences` / numbering trigger · `application_settings` (demo date) · approval engine tables and functions (workflow A skeleton) · `admin_action_log` | no operational tables yet |
| 5 | **Admin tool** `supabase/admin/` (create, deactivate, reset-password, list, verify, set-demo-date) with the safeguards in the login design | key never in React/repo |
| 6 | **React shell**: common login (Employee ID + Password), role-based routing, five role shells with navigation, route guards, shared UI kit v1, Tyre Man mobile shell, Tyre IC responsive shell, loading/error/empty patterns | no business screens yet |
| 7 | **Demo accounts** for the five personas with retained IDs (`HOT-0114`, `HOT-AE-021`, `SUP-2231`, `TIC-1147`, `TM-3092`), fictional names | after the test passes |
| 8 | **SQL test suite** for identity tables and helper functions: role × table × operation matrix; numbering concurrency; demo-date behaviour; active-user gate | committed with the migrations |
| 9 | **Stage 3 report**: what was done, files, database changes, pending work, tests | and a pause for your approval |

### 3.1 Stage 3 exit criteria
1. Sign in as each of the five roles with Employee ID + password; wrong ID/password gives the generic message.
2. A user cannot change their own role or depot (tested through the API).
3. A deactivated employee is locked out immediately even with a valid token.
4. No table in `public` lacks RLS; `anon` has no privileges; views respect RLS.
5. 2,000 concurrent inserts into one numbered series produce no duplicates.
6. Changing the demo date changes business-date outputs but not `created_at`.
7. The production bundle contains no service-role key (scan).
8. The original prototype is untouched.

---

## 4. Readiness checklist

| Area | Ready? | Notes |
|---|---|---|
| Roles and capability model | ✔ | five roles; contested capabilities held in data |
| Master approval (HO → AM) incl. withdraw rule | ✔ | 27 entity types; terminal states; admin override designed |
| Operational approvals | ✔ with gaps | six workflows intentionally disabled until answered (UQ-01, 02, 03, 04, 05, 06) |
| Depot master (33 depots, MOCK codes, separate org units) | ✔ | codes configurable |
| Central Store tyre creation | ✔ design / ✘ operator | operator and number rules open (UQ-33, 34, 35) |
| Document numbering | ✔ mechanism / partial catalogue | ten formats unresolved, flagged |
| Employee-ID login | ✔ design / ✘ tested | needs G-2 |
| Demo date | ✔ | designed |
| Schema (136 tables) | ✔ | column-level detail in Stage 2 schema + Stage 2.1 amendments; consolidated at migration time |
| RLS design | ✔ | 21 findings with fixes |
| Mock data plan | ✔ | updated to the prototype's real headcounts |
| Version control | ✘ | G-3 |
| Supabase credentials/settings | ✘ | not touched; dashboard checklist at Stage 3 |

## 5. Risks for Stage 3

| Risk | Plan |
|---|---|
| Synthetic email rejected by Supabase | try candidates in order; fall back to a domain you control; Edge Function login only with your approval |
| RLS helper functions blocked by `FORCE` RLS | spike first; narrow exception with tests |
| Amendments not yet merged into one schema file | consolidate when writing migrations; migrations become the single source of truth |
| Supabase free-tier limits | verify during Stage 3 and report |
| Real data in `MTC_Tyre_Master.xlsx` | untouched; ask before any use |

## 6. Stage 2.1 validation results

| Check | Result |
|---|---|
| All 127 Stage 2 tables have a verdict in the justification | 127 of 127 |
| Security review sets reconcile to the Stage 2 list | 13 amended + 112 unchanged + 2 removed = 127; 11 new tables identical in both documents |
| Table count after changes | 127 − 2 + 11 = **136** |
| Question ids UQ-01 … UQ-49 | all present; none referenced but undefined; groups A 8, B 2, C 35, D 4 = 49 |
| Mermaid diagrams (all documents) | verified with the real Mermaid parser (see final summary) |
| Five roles and Supervisor | present in the role matrix and workflow documents |
| 33 depots in your order, unique mock codes | verified by script |
| Original prototype unchanged | same size and not modified |
| Nothing created in Supabase / Git / React | confirmed |
