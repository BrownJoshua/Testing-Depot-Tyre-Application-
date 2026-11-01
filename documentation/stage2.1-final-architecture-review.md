# Stage 2.1 — Final Architecture Review

Applies your Stage 2.1 decisions to the Stage 2 architecture and reviews the 127 proposed tables. **Nothing was created or run:** no tables, migrations, users, or React code.

Companion documents: `stage2.1-table-justification.md`, `stage2.1-security-review.md`, `stage2.1-central-store-tyre-creation.md`, `stage2.1-document-numbering.md`, `stage2.1-employee-login-design.md`, `stage2.1-stage3-readiness.md`, and the updated `stage2-unresolved-business-questions.md`.

---

## 1. Headline

| | Stage 2 | Stage 2.1 |
|---|---|---|
| Tables | 127 | **136** (−2 merged, +11 new) |
| Master entity types under HO → AM approval | 26 | **27** (adds `tyre_number_series`) |
| Findings from the security review | — | 21, all with a design fix |
| Items the prototype showed that earlier stages missed or mis-modelled | — | **7** (§3) |
| Business questions | 32 | **49** in total (17 new from this review): **8 resolved, 41 open** — 2 gate Stage 3, 35 gate later stages, 4 optional |

The architecture holds. The review found no reason to remove functionality; it **added** what the prototype actually contains (allocation by individual tyre, Tools & Equipment, depot hubs, real numbering patterns, real employee-ID scheme) and tightened integrity and security.

## 2. Your decisions and where they landed

| # | Decision | Effect on the design | Documented in |
|---|---|---|---|
| 1 | **UQ-10** Tyres originate from Central Store receipts; HO may request corrections only | New receipt tables and posting function; no insert path into `tyres`; origin FK mandatory; corrections via workflow A with a field whitelist; original record, movements and receipt preserved | central-store-tyre-creation |
| 2 | **UQ-11** Demo users via a separate project-administrator script; administrator is not an ERP role | Local admin tool (`supabase/admin/`, Stage 3), service-role key never in React, admin actions logged in `admin_action_log`, no ERP screen creates accounts | employee-login-design §9 |
| 3 | **UQ-12** Employee ID → synthetic email; test with one account first | Deterministic mapping, generic errors, reset/deactivate/duplicate rules, validated role/depot; **feasibility protocol written, test not run** (needs your go-ahead and credentials) | employee-login-design |
| 4 | **UQ-13** Keep proposed depot codes, labelled MOCK, configurable, separate from names | `depots.is_mock_code`, codes editable through the master workflow, counters keyed by id so a code change never breaks numbering; all 33 retained | depot-master (updated) |
| 5 | **UQ-14** HO can withdraw its own pending change with remarks | Withdraw only from `PENDING_APPROVAL`; maker or service-role administrator; terminal-state and payload-immutability triggers; history row | security-review §4.2; approval workflows (updated) |
| 6 | **UQ-19** Follow prototype numbering; per type and per depot; database-generated; unresolved formats flagged | `document_number_series` + `document_sequences`, trigger-assigned, row-locked, gapless; full catalogue with evidence; 10 formats flagged unresolved | document-numbering |
| 7 | **UQ-20** September 2026 initial period; adjustable demo date; do not hardcode today's date | `application_settings.demo_mode/demo_today`, `app.business_today()`, business timestamps vs system timestamps kept apart (§4) | this document §4 |
| 8 | **UQ-32** Fictional names, prototype employee IDs retained | 212 employees with the prototype's IDs for 33 Tyre ICs and 141 Tyre Men (§5) | this document §5; mock-data plan (updated) |
| 9 | **UQ-30** No new repository or overwrite; inspect Git | Inspected; folder is **not** a Git repository; nothing was changed | stage3-readiness §1 |
| 10 | Architecture review of 127 tables | Done | table-justification, security-review |
| 11 | Keep approvals independent (master HO → AM; operational workflow-specific, Supervisor separate) | Confirmed and strengthened (§6) | approval workflows, security-review §4.1 |

## 3. What the prototype review corrected

These came from re-reading the prototype for the Central Store question. They show where earlier stages were wrong or incomplete. **None removes functionality; all are corrections.**

| # | Earlier statement | What the prototype shows | Change |
|---|---|---|---|
| C-1 | Allocation Requests were quantities per depot, creation form "not visible" | Allocation is **tyre by tyre** from Central Store arrivals; types, validations, hub grouping, `AR-nnn` numbers, Pending/Approved/Returned/Withdrawn; the depot receives by GRN and tyres are "added to Live Tyre Stock" | `allocation_request_tyres`; allocation statuses use prototype words; screens HO-21/AE-11 now fully specified |
| C-2 | Tyres just existed | Tyres exist at Central Store as numbered lots before allocation; ICRN ledger line "Received from Central Store" | Central Store receipt model (your UQ-10 decision) |
| C-3 | Stage 1 had no Tools & Equipment module | A Tools & Equipment register (`TL-…`, `EQ-…`: add / view / edit / activate) sits in the Live Tyre Stock page's popups | `depot_tools_equipment` (UQ-39) |
| C-4 | Purchase Indent number `PI-{YYYY}-{NNNN}` | `PI-HO-{YYYY}-{NNN}` | numbering catalogue |
| C-5 | 84 Tyre Men in the mock plan | The prototype register has **141 Tyre Men and 33 Tyre ICs** (174), per-depot counts known | mock-data plan |
| C-6 | Depot grouping unknown (UQ-13 asked about zones) | The allocation screen groups **28 depots under 5 "hub" depots** (Tondiarpet-I, Vyasarpadi, Poonamallee, Central-I, Perumbakkam) = 33 | `depots.hub_org_unit_id` (optional, UQ-46) |
| C-7 | Document formats assumed in the Stage 2 schema §14 | Real patterns catalogued, several formats unresolved | numbering doc supersedes schema §14 |

## 4. Demo date and clocks (decision 7)

Two clocks are kept strictly apart:

| Clock | Meaning | Examples |
|---|---|---|
| **System time** | the real moment a row was written | `created_at`, `updated_at`, `audit_logs.at` — always the true time (`now()`), never altered |
| **Business time** | the date the *demonstration* pretends it is | `document_date`, due dates, movement `occurred_at`, "today" in dashboards, overdue/upcoming logic, schedule generation |

Design:
- `application_settings`: `demo_mode` (bool) and `demo_today` (date, initially **2026-09-20**, the prototype's date).
- `app.business_today()` returns `demo_today` when `demo_mode` is on, otherwise `current_date`. `app.business_now()` returns that date plus the real time of day.
- Every date-dependent calculation uses these functions: overdue and "due today" jobs, the schedule planner, compliance %, "Fitted days / Idle days", "Maintenance Pending", roster visibility, document-number periods, low-stock and warranty checks. SQL views and functions never call `current_date` for business logic; a repository check (grep in migrations) enforces it.
- The front end reads the value once through an RPC (`get_business_today`) and **never** calls `new Date()` to decide business logic (lint rule); it may use the device clock only for display such as "5 minutes ago".
- Change: `admin_set_demo_date(date)` — executable by the service role only (the "demo administrator" is the project administrator, UQ-47), audited in `admin_action_log` and `audit_logs`. It never edits existing records; moving the date forward simply makes more jobs overdue.
- The seed data is generated relative to a fixed anchor (September 2026); to refresh for a later demo the seed can be re-run with an offset.
- Tests: changing `demo_today` changes overdue counts and dashboard figures but no `created_at`; turning `demo_mode` off returns the real date.

## 5. Employee demo data (decision 8)

From the prototype register (HO Tyre Man Register, 174 rows) I extracted **only IDs, roles, depots and counts** — not names or phone numbers (the prototype's phone numbers look like real mobiles and will not be used).

| Rule | Detail |
|---|---|
| IDs retained | 33 Tyre IC IDs and 141 Tyre Man IDs exactly as in the prototype; Mandaveli: `TIC-1147` and `TM-3092`, `TM-3110`, `TM-3124`, `TM-3137`, `TM-3145`, `TM-3158`, `TM-3163`, `TM-3179`; other depots `{XX}-TIC-01`, `{XX}-TM-01…` (see §5.1) |
| Other roles | `HOT-0114` (HO), `HOT-AE-021` (AM), `SUP-2231` (Supervisor, Mandaveli) retained. The prototype names only one Supervisor; **32 further Supervisor IDs, 2 HO and 1 AM** are generated in the same style and marked *generated* |
| Names | all replaced by fictional names from a generator with a deny-list of real-looking names; includes the five demo personas |
| Phone, address, Aadhaar | fictional pattern only (`+91 00000 000NN`); Aadhaar not stored (UQ-29) |
| Marking | `employees.is_demo = true` and a visible "demonstration data" label |
| Consistency | one Tyre IC per depot; Tyre Men per depot as in the prototype (3–8); one Supervisor per depot; every employee's depot is one of the 33 `depots`; Tyre IC / Supervisor / Tyre Man share a depot per `employees.org_unit_id`; skills assigned from the 7 skills |
| Totals | 33 TIC + 141 TM + 33 SUP + 3 HO + 2 AM = **212 employees** (previous plan said 155) |
| Logins | demo accounts for all five personas first; Mandaveli and the six Tier-B depots next; remaining employees exist as records and receive accounts only on request |

### 5.1 Prototype employee-ID prefixes and headcounts
These are **observed**, not mock: they identify employees, are separate from the mock depot codes, and are why employee prefixes (e.g. `TR`, `PM`, `MV`) differ from document-number depot codes.

| # | Depot | Employee-ID prefix | Tyre IC | Tyre Men |
|---|---|---|---|---|
| 1 | Adyar | AD | 1 | 5 |
| 2 | Thiruvanmiyur | TR | 1 | 4 |
| 3 | Mandaveli | *(none — `TIC-1147`, `TM-3xxx`)* | 1 | 8 |
| 4 | Kannagi Nagar | KA | 1 | 5 |
| 5 | Perumbakkam | PA | 1 | 5 |
| 6 | Semmencheri | SM | 1 | 5 |
| 7 | T. Nagar | TN | 1 | 3 |
| 8 | Saidapet | SP | 1 | 5 |
| 9 | K.K. Nagar | KN | 1 | 3 |
| 10 | Adambakkam | AB | 1 | 3 |
| 11 | Chrompet | CR | 1 | 4 |
| 12 | Tambaram | TA | 1 | 5 |
| 13 | Chrompet-II | CW | 1 | 3 |
| 14 | Kilambakkam | KB | 1 | 3 |
| 15 | Kundrathur | KU | 1 | 4 |
| 16 | Iyyappanthangal | IY | 1 | 5 |
| 17 | Vadapalani | VP | 1 | 5 |
| 18 | Poonamallee | PN | 1 | 3 |
| 19 | Koyambedu | PM | 1 | 5 |
| 20 | Central Depot | CD | 1 | 5 |
| 21 | Ayanavaram | AY | 1 | 5 |
| 22 | Perambur | PR | 1 | 4 |
| 23 | Basin Bridge | BB | 1 | 3 |
| 24 | Anna Nagar East | AE | 1 | 3 |
| 25 | Anna Nagar | AN | 1 | 3 |
| 26 | Ambattur | AM | 1 | 5 |
| 27 | Avadi | AV | 1 | 5 |
| 28 | Vyasarpadi | VY | 1 | 5 |
| 29 | Tondiarpet-1 | TD | 1 | 5 |
| 30 | Tondiarpet-II | TW | 1 | 3 |
| 31 | Ennore | EN | 1 | 3 |
| 32 | Madhavaram | MV | 1 | 5 |
| 33 | Padiyanallur | PL | 1 | 4 |
| | **Total** | | **33** | **141** |

(This replaces the invented tier-based staffing in the Stage 2 mock-data plan.)

## 6. The two approval systems remain independent

| | Master data | Operational |
|---|---|---|
| Hierarchy | HO (Tech) → AM (Tech), fixed | per workflow, from `approval_routes` |
| Statuses | DRAFT → PENDING_APPROVAL → APPROVED / REJECTED (+ WITHDRAWN) | prototype vocabulary per document |
| Tables | `master_change_requests` (+ history) | document tables, `document_status_history`, `approval_routes` |
| Supervisor | no role | separate operational approver (GIN, Depot Indent, Fleet Grouping, Duty Roster, Skill) |
| AM | decides all | decides only where the prototype said AE (Purchase Indent, Allocation, air-type final) |
| Interaction | none except audit/notifications | none |
| **Stage 2.1 touch-points** | tyre corrections and tyre-number series join workflow A | allocation approval remains operational (HO → AM, as in the prototype); reason suggestions chain depot → HO → *master* workflow |

Note on allocation: it is an **operational** approval (HO raises, AM approves) because it moves stock, not master data — exactly as in the prototype. Tyre *corrections* are master data and follow workflow A. The two are never mixed.

## 7. Review outputs (summary)

| Question | Answer | Detail |
|---|---|---|
| Essential tables | 113 of the 127 (67 business entities + 46 supporting child/line/junction tables); 4 derivable-but-kept; 6 infrastructure; 2 optional/dormant; 2 merged | table-justification §1–9 |
| Redundant / duplicate | 2 tables merged (MRN → GRN), 4 redundant columns/links removed | §11 |
| Need separate historical tracking | 16 append-only tables, 3 revision tables, 4 effective-dated tables; masters via the change-request trail | §16 |
| No screen/workflow of their own | 12 infrastructure tables, all kept | §12 |
| Missing relationships | 9, all fixed | §13 |
| Missing constraints | 14 | §14 |
| Missing indexes | 18 requirements consolidated | §15 |
| Security and RLS risks | 21 findings (5 H, 10 M, 6 L) | security-review §2 |

## 8. Verification that logic is database-side

| Control | Secure database-side implementation | Direct client write? |
|---|---|---|
| Master approval | `master_request_*` functions, AM-only approve | No |
| Operational approval | `op_transition` + `approval_routes` | No |
| Withdrawal | `master_request_withdraw` (maker) / `admin_withdraw_master_request` (service role) | No |
| Document numbering | trigger + `app.next_doc_no`, row-locked counter | No (value discarded) |
| Central Store tyre creation | `central_receipt_post`, only writer of `tyres` | No |
| Allocation / receipt of allocated tyres | `allocation_*`, `grn_receive_allocation` | No |
| Demo date | `admin_set_demo_date` | No |
| Accounts | local admin script via Auth admin API | No ERP path |

Details and tests: `stage2.1-security-review.md` §4.

## 9. Amendment catalogue (what changes in the Stage 2 documents)

| ID | Amendment | Stage 2 document touched |
|---|---|---|
| A-01 | Central Store receipt tables, `tyres.origin_receipt_lot_id`, `CENTRAL_STORE` location, `ALLOCATE`/`RELEASE_ALLOCATION` movements | schema |
| A-02 | `tyre_number_series` master (entity #27) | schema, approval workflows |
| A-03 | `allocation_request_tyres`; allocation statuses to PENDING_APPROVAL / APPROVED / RETURNED / WITHDRAWN | schema, approval workflows |
| A-04 | `tyre_ownership_history`, `tyre_identity_corrections` | schema |
| A-05 | `depot_tools_equipment` | schema, role matrix |
| A-06 | `fleet_route_assignments` | schema |
| A-07 | `document_number_series`; numbers assigned by trigger | schema, numbering doc |
| A-08 | `admin_action_log` | schema, login design |
| A-09 | `depots` subtype table (+ `hub_org_unit_id`, `is_mock_code`); code configurable | schema, depot master |
| A-10 | Merge `mrns`/`mrn_lines` into `grns`/`grn_lines` (`grn_kind`) | schema |
| A-11 | Remove `complaints.job_card_id`, `wsrs.issued_gin_id`, `removal_orders.received_grn_id`, `tyres.registration_source` | schema |
| A-12 | `master_change_requests`: `withdrawn_by`, `withdrawn_via`, terminal-state and payload-immutability triggers | schema, approval workflows |
| A-13 | `profiles.must_change_password`; `employees.is_demo`; employee code regex and immutability | schema, login design |
| A-14 | `application_settings.demo_mode/demo_today`; `app.business_today()` | schema, mock-data plan |
| A-15 | Views created with `security_invoker`; restrictive active-user policy; default privileges revoked; `v_audit_summary` | RLS doc |
| A-16 | Composite depot-consistency foreign keys | schema |

These amendments are recorded in each affected Stage 2 document as a dated "Stage 2.1 amendment" note; the full column-level schema is regenerated when migrations are written in Stage 3 so that there is one authoritative version.

## 9a. Role matrix addition
New capabilities (disabled until decided): `central_receipt.post` (UQ-33), `tools.manage` (UQ-39), `allocation.create`/`allocation.approve` remain HO/AM as before.

## 10. Residual risks
| Risk | Mitigation |
|---|---|
| Central Store operator unknown (UQ-33) | receipts are posted by the seed script in demonstration; capability stays unassigned until you decide |
| Employee-ID login depends on a domain Supabase accepts | one-account test first; documented fallbacks |
| Table count rose (136) | each addition has a prototype or decision basis; infrastructure tables are small |
| Amendment notes instead of regenerating the schema | avoids three divergent versions; consolidated at migration time |
| Large unresolved-format list for numbering | provisional series flagged; confirmed ones seeded first |
