# Implementation Plan (revised for Stage 2.1 — final five-role architecture)

**Supersedes the Stage 1 plan; updated for Stage 2.1 (136 tables, Central Store tyre creation, numbering, login design).** Status: draft for your approval. No React code or database migration exists yet.

Governing documents (Stage 2.1 additions first): `stage2.1-final-architecture-review.md`, `stage2.1-table-justification.md`, `stage2.1-security-review.md`, `stage2.1-stage3-readiness.md`, `stage2.1-document-numbering.md`, `stage2.1-central-store-tyre-creation.md`, `stage2.1-employee-login-design.md`; Stage 2: `stage2-final-role-matrix.md`, `stage2-approval-workflows.md`, `stage2-database-schema.md`, `stage2-entity-relationship-diagram.md`, `stage2-depot-master.md`, `stage2-mock-data-plan.md`, `stage2-rls-security-design.md`, `stage2-unresolved-business-questions.md`, `stage2-implementation-readiness.md`.

---

## 1. Final architecture in one page

| Layer | Decision |
|---|---|
| Roles | **Five**: HO (Tech), AM (Tech), Supervisor, Tyre IC, Tyre Man. AE → AM. Supervisor retained. |
| Login | One page: **Employee ID + Password** → Supabase Auth (Employee ID mapped to a synthetic email; passwords only in Auth) → role from database → redirect. No role selector. No public registration. |
| Approval | Two independent systems: **(A)** master data HO → AM for *all* HO master changes (`DRAFT → PENDING_APPROVAL → APPROVED / REJECTED`, proposals stored separately, live data untouched until approval); **(B)** operational approvals per workflow via `approval_routes` (Supervisor for GIN, Depot Indent, Fleet Grouping, Duty Roster, Skill; AM where the prototype said AE; Tyre IC for WSR and complaints; unresolved ones switched off). |
| Data | Supabase PostgreSQL, 136 tables (Stage 2.1), RLS on all, history append-only, 33 depots + 4 separate org units, Vendor Master included. |
| Front end | React + Vite + TypeScript + Tailwind + Lucide, TanStack Query/Table, react-hook-form + zod, react-i18next, vite-plugin-pwa. |
| Hosting | GitHub + Netlify (static SPA) + Supabase. Free tiers; limits verified at Stage 9. |
| Security | Publishable key only in the browser; service-role key only in local admin scripts; all authority checked in the database. |

## 2. Interfaces (locked)

| Role | Interface | Implementation notes |
|---|---|---|
| HO (Tech) | Desktop-first, sidebar | Master lists + change-request forms, "my requests" status, consolidated dashboard |
| AM (Tech) | Desktop-first, sidebar | Two inboxes: **Master changes** (before/after diff, bulk decisions, mandatory remarks on reject) and **Operational approvals**; approval history |
| Supervisor | Desktop, tablet-friendly | Approval queues (GIN, Indent, Grouping, Roster, Skill), depot monitor, log-sheet complaints |
| **Tyre IC** | **One responsive layout covering desktop *and* mobile** | Desktop: wide registers and planners. Mobile: card layouts for rounds, jobs, approvals to act on, stock lookup, WSR issue. Touch targets ≥ 44 px on small screens. Tablet = breakpoint. |
| **Tyre Man** | **Mobile-only** | Bottom navigation (My Jobs · Duty & Shift · My WSR · GRN · MRN · SRN), large buttons, camera for photos and QR, PWA install. On desktop widths: "Open this on your phone" screen; routes are guarded by role regardless. |

## 3. Technology decisions (unchanged from Stage 1 unless noted)

React 18/19 + Vite + TS + Tailwind; Router with role-guarded route groups; `@supabase/supabase-js` + TanStack Query; TanStack Table for registers; react-hook-form + zod; Lucide; react-i18next (English + Tamil); `vite-plugin-pwa`; Vitest + Testing Library + Playwright; SQL tests for RLS and approval functions. A shared component library (Table, FilterBar, StatusPill, Modal, Drawer, ReasonDialog, ConfirmDialog, DocumentView, AuditTrail, DiffView, ApprovalInbox, Toast) is built once and reused across all five roles.

**New in Stage 2:** `DiffView` for AM's before/after comparison; typed RPC client wrappers for approval functions; a `useEmployeeLogin` hook implementing the Employee-ID mapping; role guards driven by `my_session()`.

## 4. Repository layout

```
/
├─ MTC-Depot-Tyre-Prototype.html     (untouched; may move to /reference/ with your OK — UQ-30)
├─ documentation/
├─ supabase/
│  ├─ migrations/    (numbered, applied in order; none exist yet)
│  ├─ seed/          (generator + provisioning scripts; deterministic)
│  └─ tests/         (RLS, approval, append-only, privacy scans)
├─ src/
│  ├─ app/  components/  lib/
│  ├─ features/      (masters, approvals, jobs, store, tm, reports, workforce, dashboards)
│  └─ roles/         (ho, am, sup, tic, tm shells and navigation)
├─ public/  netlify.toml  .env.example  .gitignore  README.md
```

## 5. Stage plan

Each stage ends with: completed work, files changed, database changes, pending work, tests run — and waits for your approval.

| Stage | Scope | Depends on | Exit tests |
|---|---|---|---|
| **1 — Audit** | done | — | reviewed |
| **2 — Architecture** | five-role matrix, two approval systems, schema, ERD, 33 depots, RLS design, mock-data plan, open questions | your answers | done, awaiting approval |
| **2.1 — Final decisions & architecture review (this)** | Central Store tyre creation, admin-script provisioning, Employee-ID login design, MOCK depot codes, withdraw rule, document numbering, demo date, employee demo data, Git inspection, review of all tables and RLS (136 tables, 21 security findings) | your approval + UQ-12, UQ-30 | your approval of `stage2.1-*` documents |
| **3 — Foundation** | Migrations 001–0xx (extensions, enums, org units, identity, roles, capabilities, helper functions, audit, approval engine tables/functions, RLS skeleton); **Auth spike** (synthetic-email acceptance); provisioning script; common login; role routing; five shells; shared UI kit v1; demo accounts for all five roles | approval of Stage 2/2.1; UQ-12 (authorise the one-account test), UQ-30 (version control) | Sign in as each of 5 roles; role cannot be changed by a user; wrong-role route blocked; RLS tests for identity tables |
| **4 — Masters & master approval** | All 27 master entities: HO change-request UI, AM inbox with diff/bulk/remarks, history/audit views; Vendor Master; Depot Master; seed baseline masters (33 depots first); operational approvals not tied to depots: Purchase Indent, tyre-level Allocation over Central Store arrivals (HO → AM; arrivals created by posted Central Store receipts), air-type (HO review + AM final), Supervisor Grouping/Roster/Skill screens | UQ-07, 09, 15, 16, 17, 26, 27, 28, 37, 38, 49 | HO cannot approve; AM rejection requires remarks; pending change never alters live row; stale-base conflict; deactivation soft-delete; SQL tests for every entity |
| **5a — Tyre IC maintenance** (responsive) | Dashboard, Fleet Grouping, Schedule Planner, Complaints, Job Card Register, My Jobs, Duty Posting, Tyre Man Register view, Outsource Employees, Fleet Register (depot) ; Supervisor monitor + Log Sheet; Tyre IC verification (final inspection) | UQ-06, 23, 29, 41 | Schedule → cards → assignment; verification pass/fail; depot isolation (Tyre IC cannot see another depot) |
| **5b — Tyre IC depot store** | Depot Indent, Internal Transfer, GIN, WSR + WSR-Issue GIN, Gate Pass, GRN (incl. receipt of allocated new tyres), MRN, Tools & Equipment, Scrap Return, DRN*, Live Tyre Stock, Tyre Register + TLDC, Premature Failure*, Tyre Damage*, Notifications; Supervisor GIN & Indent approvals | UQ-01, 02, 05, 22, 25, 31, 33, 34, 35, 36, 39, 40, 42, 43, 44, 45 | Indent → GIN → Supervisor approval → gate pass → In transit → GRN across two depots; ledger balances; TRS cycle |
| **6 — Tyre Man mobile** | My Jobs, rounds, per-job-type execution, Tyre Changing chain, hold, complaint, WSR, duty/shift/leave/prepone*, norms, notifications, GRN/MRN/SRN lists, Tamil toggle, PWA, camera/QR | UQ-03, 04, 24 | Full job on a phone viewport; only own jobs visible (RLS); submit for verification; Tyre IC verifies |
| **7 — Integration** | Dashboards for HO/AM/SUP, notification triggers, Realtime, dead-link screens, exports/print, loading/empty/error states, i18n completion | UQ-21 | Every control has an action or an explicit "placeholder" label |
| **8 — Workflow testing** | Playwright suites across five roles; mock-data verification pack; accessibility; performance on seed volume | — | scenarios in §6 |
| **9 — Deployment** | Repo hygiene, Netlify config, env docs, SPA redirect, production deploy, bundle secret scan, smoke test | — | you test the live URL; no "complete" claim before then |

\* screens whose approver or form is unresolved are built to the documented point and clearly labelled until you answer.

## 6. Cross-role test scenarios (Stage 8)

1. **Master approval:** HO creates a Vendor → submits → AM rejects with remarks → HO revises → AM approves → vendor appears in lists; throughout, the live vendor list is unchanged until approval; HO cannot approve; AM cannot create.
2. **Deactivation:** HO requests deactivation of a Tyre Folio → AM approves → folio hidden from pick-lists, history intact.
3. **All-masters rule:** each of the 27 entity types rejects a direct client write and accepts only the request path.
4. **Grouping:** Tyre IC proposes a group revision → Supervisor returns with remarks → fix → approve → schedule instances use the new revision only after approval.
5. **Tyre Changing:** card with four tasks across two Tyre Men; Fitment blocked until Setting completes; WSR for a disc; Tyre Man submits; Tyre IC verifies (fail → Rework → pass).
6. **Transfer:** Mandaveli indent → Adyar accepts → GIN → Supervisor approval → gate pass → exit → GRN with one rejected tyre (reason) → ledgers and tyre histories correct; no historical row altered.
7. **TRS cycle:** GIN to TRS Chrompet → retread batch → GRN with discrepancy → "Goes To" → live stock; movements show every step.
8. **Roster & skill:** Tyre IC posts → Supervisor approves; Tyre Man sees only own roster.
9. **Security:** Tyre Man cannot read another's job; Tyre IC cannot read another depot; Supervisor cannot decide master requests; self-approval blocked; a user cannot change own role/depot; service-role key absent from the built bundle.
10. **Employee-ID login:** wrong ID/password gives the generic error; deactivated employee locked out.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Size: 82 role screens, 136 tables | shared components; staged demos; placeholders labelled |
| Unresolved approvers | data-driven routes; features off until decided; 49 questions listed with defaults and grouped by the stage that needs them |
| Auth with synthetic emails | one-user spike at the start of Stage 3 before any UI is built |
| RLS errors | SQL role-matrix tests before UI dependence; deny by default |
| Master JSON payload validity | validation at submit **and** approval; per-entity tests; stale-base check |
| Seed realism & integrity | deterministic generator + verification pack |
| Free-tier limits | checked at Stage 9; photos ≤ 5 MB |
| Prototype file in Git | move to `/reference/` on your word |

## 8. What I need before Stage 3

1. Approval of the `stage2-*` documents (or the corrections you want).
2. Answers to the **two Stage 3 questions**: UQ-12 (authorise the one-account login test and say who runs it) and UQ-30 (how to set up version control). The other open questions gate later stages and are grouped by stage in `stage2-unresolved-business-questions.md`.
3. Permission for the repo steps in UQ-30 and, at Stage 3, your Supabase **publishable key** (never the service-role key in chat).

Stage 3 will not start until you approve.
