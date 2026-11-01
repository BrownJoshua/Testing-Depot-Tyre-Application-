# Stage 2 — Final Role Matrix

**Status:** draft for your approval. Reflects your Stage 2 decisions, which override the Stage 1 audit where they conflict.
Unresolved points are referenced as `UQ-nn` and listed in `stage2-unresolved-business-questions.md`.

---

## 1. The five roles

| Code | Final name | Original prototype name | Scope | Interface | Landing page |
|---|---|---|---|---|---|
| `HO` | HO (Tech) | HO (Technical) | All 33 depots + org units (read); master-data maker | Desktop | HO dashboard (new, UQ-21) |
| `AM` | AM (Tech) | **AE (HO Technical)** — renamed | All depots (read); master-data approver; some operational approvals | Desktop | Approval dashboard (pending master changes + operational queue) |
| `SUP` | Supervisor | Supervisor | Own depot; operational approver and monitor | Desktop (tablet-friendly) | Depot operations / approval queue |
| `TIC` | Tyre IC | Tyre Incharge | Own depot; operational authority | **Desktop and mobile** (responsive) | Dashboard |
| `TM` | Tyre Man | Tyre Man | Only own assigned work | **Mobile-only** | My Jobs |

Mapping rules applied everywhere in the rebuilt documentation:

- **AE → AM (Tech)** wherever the prototype says AE, unless a workflow needs another approver.
- **Tyre Incharge → Tyre IC**.
- **Supervisor is retained** with every responsibility found in the prototype (section 5).
- Outsource employees (contractor or direct) are **not users**; they can be assigned jobs but never sign in.
- There is **no sixth role**. Tasks that no role owns (creating login accounts, resetting passwords, changing access rules) are done out-of-band by the project administrator using local scripts; see UQ-11.

## 2. Role definitions

### HO (Tech) — master-data maker
- Creates, edits and deactivates master records. **Every** such action becomes a change request that must be approved by AM before any live data changes.
- Can read all 33 depots and the four organisational units, and consolidated dashboards and reports.
- Operational duties retained from the prototype: raises Purchase Indents (AM approves), raises Allocation Requests (AM approves), performs the HO review step of Fleet air-type conversion (UQ-07), accepts or rejects reasons suggested by depots (which then become master change requests).
- Cannot approve anything it submitted. Cannot approve at all in the master workflow.

### AM (Tech) — master-data approver
- Approves or rejects every master-data change request; **rejection requires remarks**.
- Reads full approval history and audit trails; reads all depots.
- Operational approvals retained from the prototype where it said AE: Purchase Indent, Allocation Request, Fleet air-type conversion (final step).
- Does not create or edit masters. Cannot approve a change whose subject is its own employee record.

### Supervisor — separate operational approver and monitor
- Approves/returns: **GIN, Depot Indent, Fleet Grouping, Duty Roster, Skill** requests (and any further workflow assigned in `approval_routes`).
- Records Log Sheet Complaints; views job cards, fleet and tyre registers of own depot.
- What a Supervisor may *do* in the Job Card Register (create/assign/replace/on-behalf/final inspection) is **unresolved** (UQ-06). The prototype shows the same buttons as the Tyre IC; your Stage 2 text says the Supervisor "monitors depot operations" and the Tyre IC "reviews and verifies completed work". Until you decide, the design gives the Supervisor **view-only** access to those actions and keeps the capability switchable in data (`role_capabilities`).
- Does not manage masters.

### Tyre IC — depot operational authority
- Depot maintenance, scheduling, job cards, assignments, execution monitoring, review and verification (final inspection) of completed work.
- Depot store: indents, GIN, GRN, MRN, scrap return, DRN, gate pass, WSR issue, stock, registers, reports.
- Workforce: duty posting, skill requests, outsource employees.
- Same screens at desktop and phone widths; tablet is a breakpoint (UQ-23).
- Cannot read other depots' operational data, cannot touch masters, cannot approve operational items (they are raised by the Tyre IC and approved by the Supervisor) — except where the prototype makes the Tyre IC the decider (WSR issue/reject, complaint triage).

### Tyre Man — mobile execution
- Sees only jobs assigned to them; starts, holds, executes and submits work (inspection, readings, odometer, NSD, photos); raises WSR and complaints; manages own duty, shift-change and leave requests; reads norms.
- **Submits completed work for verification** (job moves to "Awaiting final inspection"); verification is done by the Tyre IC.
- No access to masters, approvals, registers or stock screens. GRN / MRN / SRN tabs are empty shells in the prototype and are carried forward as simple list views (UQ-22).

## 3. Depot visibility

| Role | Reads | Writes |
|---|---|---|
| HO | all depots, all org units | master change requests; HO-owned operational documents (Purchase Indent, Allocation, air-type review) |
| AM | all depots, all org units | approval decisions only |
| SUP | own depot (plus extra depots only if `user_depot_access` rows exist, UQ-18) | approval transitions for own depot; log-sheet complaints |
| TIC | own depot; plus documents addressed *to* the depot by other depots (e.g. incoming indents/GIN) | own depot documents |
| TM | rows assigned to them | execution data on own tasks |

## 4. Capability matrix

Legend: **M** = maker (proposes via change request) · **A** = approver/decider · **C** = create/raise · **X** = execute · **V** = verify · **R** = read (all depots) · **r** = read (own depot) · **o** = read own records only · **—** = no access · **?** = unresolved (see UQ).

### 4.1 Master data (all go through the master workflow)

| Master | HO | AM | SUP | TIC | TM |
|---|---|---|---|---|---|
| Depots and organisational units | M, R | A, R | r (own) | r (own) | — |
| Employee master / Tyre Man Register | M, R | A, R | r | r | o |
| Skills list | M, R | A, R | r | r | r |
| Reference values (units, groups, categories, bus/vehicle/axle types …) | M, R | A, R | r | r | r |
| Tyre sizes, makes, models | M, R | A, R | r | r | — |
| Tyre Folio (+ locations) | M, R | A, R | r | r | — |
| Tyre Detailed Master (attribute columns) | M, R | A, R | — | — | — |
| Fleet Register (master attributes) | M, R | A, R | r | r | — |
| Fleet Type Master (+ tyre sizes per type) | M, R | A, R | r | r | — |
| Route master | M, R | A, R | r | r | — |
| Tyre Stock — individual tyre identity corrections | M, R (UQ-10) | A, R | r | r | — |
| Folio stock parameters (min / max) | M, R (UQ-17) | A, R | r | r | — |
| Maintenance Configuration — jobs, skills per job, estimates | M, R | A, R | r | r | — |
| Maintenance Configuration — schedules (+ categories builder) | M, R | A, R | r | r | — |
| PSI Norms | M, R | A, R | r | r | r |
| Rotation & Discout Norms (+ eligible grades) | M, R | A, R | r | r | r |
| Expected Life KM | M, R | A, R | r | r | — |
| Shift Master | M, R | A, R | r | r | r |
| Tyre Complaint Master | M, R | A, R | r | r | r |
| Reason Master | M, R | A, R | r | r | r |
| Reject Reason Master | M, R | A, R | r | r | — |
| Wear Pattern Master | M, R | A, R | r | r | r |
| QC Master (checklists) | M, R | A, R | r | r | — |
| **Vendor Master** (+ contacts) | M, R | A, R | r | r | — |

HO "M" means: create, edit, deactivate, reactivate — each as a separate change request. AM "A" means approve or reject (with remarks). No role other than AM can apply a master change.

### 4.2 Operational modules

| Module / screen group | HO | AM | SUP | TIC | TM |
|---|---|---|---|---|---|
| Dashboards | HO consolidated (R) | Approval + consolidated (R) | Depot monitor (r) | Depot dashboard (r) | — |
| Maintenance Pending (depot-wise) | R | R | r | r | — |
| Fleet Grouping | — | — | A | C (propose), r | — |
| Schedule Planner / schedule instances | R | R | r | C, r | — |
| Complaints (triage, assign) | R | R | r | C, A (triage) | C (raise) |
| Log Sheet Complaints | — | — | C | r | — |
| Job Card Register — view | R | R | r | r | o |
| Job cards — create / assign / replace / reschedule / cancel | — | — | ? (UQ-06) | C | — |
| Job execution (rounds, tasks) | — | — | — | X (own tasks; on-behalf entry) | X (own tasks) |
| Final inspection / verification | — | — | ? (UQ-06) | V | — |
| WSR | — | — | r | A (issue/reject), C | C (own) |
| Depot Indent | — | — | A | C, r | — |
| Internal Transfer Request (incoming indents) | — | — | r | A (accept/reject), r | — |
| GIN | R | R | A | C, r | — |
| WSR Issue GIN | R | R | r | C (auto) | o (receive) |
| Gate Pass | R | R | r | C | — |
| GRN / MRN / Scrap Return | R | R | r | C | list only (UQ-22) |
| DRN | R | ? | ? | C | — |
| Live Tyre Stock, Tyre Register, TLDC | R | R | r | r | — |
| Purchase Indent | C | A | — | — | — |
| Allocation Requests | C | A | — | r | — |
| Fleet air-type conversion | review | A (final) | C | C | — |
| Premature Failure Reports | R | R | r | C | — |
| Tyre Damage Reports | R | ? | r | C (fill) | — |
| Duty Posting / Roster | R | R | A | C | o |
| Skill requests | R | R | A | C | o |
| Outsource Employees | R | R | r | C, M (direct, with reason) | — |
| Shift change, leave, prepone/postpone | — | — | ? | ? | C (own) |
| Notifications | own | own | own | own | own |
| Audit trail views | R | R | r (own depot) | r (own depot, own docs) | — |
| Master approval history | R | R | — | — | — |

## 5. Supervisor — responsibilities retained from the prototype

| Responsibility (prototype screen) | Retained as |
|---|---|
| GIN Approvals (`sup/gin-approvals`) — approve / revert / reject | `gin` approval route, approver `SUP` |
| Indent Approvals (`sup/indent-approvals`) — approve / revert / reject | `indent` route, approver `SUP` |
| Grouping Approvals (`sup/grouping-approvals`) — approve / return | `fleet_group_revision` route, `SUP` |
| Roster Approvals (`sup/roster-approvals`) — approve / return | `duty_roster` route, `SUP` |
| Skill Approvals (`sup/skill-approvals`) — approve / return | `skill_request` route, `SUP` |
| Log Sheet Complaints (`sup/log-sheet-complaints`) | create right; feeds Complaints |
| Job Card Register (`sup/job-management`) | monitor; actions pending UQ-06 |
| Fleet Master, Tyre Register | read own depot |
| Air-type conversion requests (`sup/fleet-master`) | may raise |

## 6. Separation-of-duties rules (enforced in the database)

1. A user can never approve a request they created (`maker_id <> checker_id`), in addition to the role check.
2. In the master workflow only `AM` can approve or reject; only `HO` can create, edit, deactivate, reactivate, submit, withdraw.
3. Operational approvals are allowed only for the role named in `approval_routes` for that workflow step and only inside the approver's depot scope.
4. Role, depot and employee code of any user can **never** be changed by that user; they are not editable through the API by any end-user role. Employee `role_code` and `org_unit_id` change only through the master workflow (HO proposes, AM approves), and an AM cannot approve a change about themselves.
5. Tyre Man can read and write only rows tied to their own employee record.
6. Rejection, return, revert, cancellation, withdrawal and removal always carry remarks (check constraints and function guards).
7. Nothing is hard-deleted; deactivation is a status.

## 7. Capability codes (`role_capabilities`)

Data-driven so unresolved questions can be settled without schema change. `✔` = granted by default, `?` = disabled until you decide.

| Capability | HO | AM | SUP | TIC | TM |
|---|---|---|---|---|---|
| `master.propose` | ✔ | | | | |
| `master.approve` | | ✔ | | | |
| `purchase_indent.create` | ✔ | | | | |
| `purchase_indent.approve` | | ✔ | | | |
| `allocation.create` | ✔ | | | | |
| `allocation.approve` | | ✔ | | | |
| `airtype.request` | | | ✔ | ✔ | |
| `airtype.review` | ✔ | | | | |
| `airtype.approve` | | ✔ | | | |
| `grouping.propose` | | | | ✔ | |
| `grouping.approve` | | | ✔ | | |
| `roster.propose` | | | | ✔ | |
| `roster.approve` | | | ✔ | | |
| `skill.request` | | | | ✔ | |
| `skill.approve` | | | ✔ | | |
| `indent.create` | | | | ✔ | |
| `indent.approve` | | | ✔ | | |
| `indent.accept_transfer` | | | | ✔ | |
| `gin.create` | | | | ✔ | |
| `gin.approve` | | | ✔ | | |
| `gatepass.create` | | | | ✔ | |
| `grn.receive` | | | | ✔ | |
| `wsr.raise` | | | | ✔ | ✔ |
| `wsr.issue` | | | | ✔ | |
| `complaint.raise` | | | ✔ | ✔ | ✔ |
| `complaint.triage` | | | | ✔ | |
| `job_card.create` / `job_card.assign` | | | ? | ✔ | |
| `job.execute` | | | | ✔ (own tasks) | ✔ (own tasks) |
| `job.onbehalf` | | | ? | ✔ | |
| `job.final_inspect` | | | ? | ✔ | |
| `drn.create` | | | | ✔ | |
| `drn.approve` | | ? | ? | ? | |
| `damage_report.approve` | | ? | ? | ? | |
| `shift_change.approve`, `leave.approve`, `reschedule.approve` | | | ? | ? | |
| `shift_change.request`, `leave.request`, `reschedule.request` | | | | | ✔ |
| `ose.manage` | | | | ✔ | |

### 7a. Stage 2.1 additions
| Capability | HO | AM | SUP | TIC | TM | Status |
|---|---|---|---|---|---|---|
| `central_receipt.post` (post a Central Store receipt, creating tyres) | | | | | | **unassigned** — who operates Central Store is UQ-33; demo receipts are posted by the seed/administrator process |
| `tyre.correct` (propose a correction to an existing tyre) | ✔ | | | | | via master workflow (AM approves), whitelist UQ-38 |
| `allocation.create` / `allocation.approve` | ✔ / | / ✔ | | | | HO raises, AM approves (operational approval) |
| `grn.receive_allocation` | | | | ✔ | | Tyre IC of the destination depot |
| `tools.manage` (Tools & Equipment register) | | | | ? | | UQ-39 |
| Project administrator | not an ERP role: runs the local admin script, no application permissions; `admin_withdraw_master_request`, `admin_set_demo_date`, account create/deactivate/reset | | | | | `stage2.1-employee-login-design.md` |

## 8. Interfaces (for the future implementation plan)

| Role | Interface | Key constraints |
|---|---|---|
| HO | Desktop-first, sidebar | Master lists with status filter, change-request submission and status tracking |
| AM | Desktop-first, sidebar | Approval inbox with **before/after comparison**, history, bulk decisions |
| SUP | Desktop, usable on tablet | Approval queues, depot monitor |
| **TIC** | **Responsive desktop + mobile** (single codebase, one layout system) | Desktop: wide registers; mobile: cards for rounds, jobs, approvals-to-act, stock look-up |
| **TM** | **Mobile-only** | Bottom nav (My Jobs · Duty & Shift · My WSR · GRN · MRN · SRN), large touch targets, camera for photos/QR, PWA install; desktop width shows "open on your phone" |

## 9. Login and role routing (summary)

One login page: **Employee ID + Password** → Supabase Auth → profile → employee → `role_code` → redirect. There is no role selector; the role comes only from the database. Details and feasibility in `stage2-rls-security-design.md` §2.
