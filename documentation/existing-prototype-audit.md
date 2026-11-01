# Existing Prototype Audit — MTC Depot Tyre Management

> **Stage 2 note.** This is the Stage 1 record of the prototype and is not edited further. Where it says **AE**, read **AM (Tech)**; where it says **Tyre Incharge**, read **Tyre IC**. Section 9's questions are superseded by `stage2-unresolved-business-questions.md` (status table in its §G). Your Stage 2 decisions (five roles, all masters need AM approval, 33 depots, Vendor Master) override Sections 8 and 9.

**Stage:** 1 of 9 (analysis only — no application code, no database changes)
**Source analysed:** `MTC-Depot-Tyre-Prototype.html` (41,491,119 bytes; left untouched)
**Audit date:** 2026-11-01
**Status:** Awaiting your review. Section 9 lists the decisions I need from you before Stage 2.

---

## 1. Executive summary

The prototype is much larger and more specific than the generic outline in the master prompt. It is a click-through prototype of a **depot-level tyre maintenance and tyre-store system** for MTC Chennai, set at **Mandaveli Depot**, with the "current date" fixed at **Sunday 20 Sep 2026**.

| Fact | Value |
|---|---|
| Screen files in the bundle | **118** (+ 1 login/landing page) |
| Role folders | `tic/` 29, `tm/` 40, `ho/` 25, `ae/` 15, `sup/` 9 |
| Role-specific screens (variants merged) | **82** — HO 22, AE 12, SUP 9, TIC 25, TM 14 (≈65 unique once screens shared between roles are merged; see `screen-inventory.md`) |
| Modal / popup definitions | **5,222** instances (≈500 distinct titles once IDs are normalised) |
| Roles in the prototype | **5** — Tyre Incharge, Tyre Man, HO (Technical), AE (HO Technical), Supervisor |
| Roles in the master prompt | 4 — HO (Tech), AM (Tech), Tyre IC, Tyre Man |
| Languages | English + Tamil toggle on the Tyre Man mobile app |

**The five things that matter most for the rebuild**

1. **There is a fifth role, Supervisor (SUP)**, that the master prompt does not mention. It owns real approval authority: GIN approvals, Indent approvals, Fleet Grouping approvals, Duty Roster approvals, Skill approvals, and it shares the Job Card Register with the Tyre Incharge. Dropping it breaks several workflows.
2. **Approvals are not limited to HO master data.** The prototype has at least 10 distinct approval flows, split across four approver roles (AE, Supervisor, HO, Tyre Incharge). The master prompt says to follow the prototype for operational approvals, so I will model a general approval mechanism with different rules per flow, not a single master-data one.
3. **Only five masters use maker-checker** (Draft → Pending approval → Approved / Returned): Tyre Folio, Expected Life KM, Reject Reason Master, QC Master, Wear Pattern Master. About ten other HO masters save immediately with no approval. The master prompt's default ("all HO master-data changes need AM approval") conflicts with this (Question Q3).
4. **The domain is far richer than the suggested schema.** It includes Folio (item) master, tyre ledger and life history, GIN/GRN/DRN/MRN/SRN/WSR documents, gate passes, indents, purchase indents, allocation requests, retreading (TRS) cycle, premature-failure and damage reports, scheduling with fleet groups, rosters and skills. The suggested tables (`tyre_fittings`, `tyre_removals`, …) are a fraction of what is needed.
5. **The prototype is a front-end mock-up.** All data is hard-coded inside the page snapshots and there is no backend. Business rules live partly in visible text and partly in the shared `runtime` script, and some are only implied by the data. I have separated *rules stated by the prototype* from *rules I inferred* in `business-rules.md`.

---

## 2. What the prototype file actually is

The `.html` file is a self-contained bundle:

- A tiny loader plus one large `<script type="application/json">` blob.
- The blob holds **119 page snapshots** (`pages`), **3 CSS files** (`trs-design-system`, `app`, `depot-trs-theme`), **2 JS files** (`runtime` ≈ 997 KB, `tm-ta` ≈ 9 KB) and **4 images** (MTC logo ×2, login background, sidebar background; about 2.6 MB of the file).
- The loader renders one page at a time inside an `<iframe srcdoc>` and navigates between pages by URL hash (`#tic/dashboard.html`). A link to a page that is not in the bundle shows the toast *"Page not in prototype: …"*.
- Each page carries a `window.PROTO` object (role, sidebar navigation, and popup HTML templates), and the shared `runtime` script wires up buttons, modals, filters and a few simulated side effects (for example issuing a gate pass changes a GIN to "In transit").

**Method used for the audit** (scripts are saved in `documentation/audit-tools/` so the analysis can be re-run):

1. Extract all pages, CSS and JS from the bundle.
2. Parse every page's HTML for headings, tabs, table columns, filters, dropdown options, form fields, required markers and buttons.
3. Parse every `PROTO.popups` definition (the modals and drawers where most forms live).
4. Extract status vocabularies ("pills") per screen, validation messages and rule-like text from the runtime.
5. Compare each role's navigation against the pages that exist.
6. Read the Tyre Man mobile screens as text.

Output of step 2–3 for every screen is in `screen-inventory-appendix-generated.md`, so no field or column is omitted.

**Limits of this audit.** The runtime is about 4,700 long lines of dense JavaScript. I mined it for validation messages, rule constants and form builders, but I did not trace every code path. Where a rule is only implied by hard-coded data, it is marked as *inferred* and listed for your confirmation.

---

## 3. Users, roles and landing pages

The login page shows five demo persona cards plus a username/password form, and a link to a **Tablet Edition** login for the Tyre Incharge.

| Prototype role | Demo user | Employee ID | Lands on | Maps to master-prompt role |
|---|---|---|---|---|
| Tyre Incharge (TIC) | K. Saravanan | TIC-1147 | Dashboard | **Tyre IC** |
| Tyre Man (TM) | M. Perumal | TM-3092 | My Jobs | **Tyre Man** |
| HO (Technical) | V. Ganesh Kumar | HOT-0114 | Tyre Folio | **HO (Tech)** |
| AE (HO Technical) | R. Venkatesan | HOT-AE-021 | Tyre Folio | **AM (Tech)** (assumed — Q1) |
| Supervisor (SUP) | S. Rajendran | SUP-2231 | Log Sheet Complaints | **not in master prompt** (Q1) |

Other Tyre Men appearing in the data: S. Ilango (TM-3110), A. Jaganathan (TM-3158), D. Karthik (TM-3163), K. Bhaskar (TM-3124), P. Selvam (TM-3137), V. Suresh (TM-3179), R. Manikandan (TM-3145). Outsource employees (contractor staff, "OSE-001…") can also be assigned jobs but are not app users.

Notes:
- HO, AE and SUP have **no dashboard** in the prototype. Only the Tyre Incharge has one. The master prompt asks for HO/AM dashboards; those would be new screens (Q9).
- TIC, TM and SUP are all **Mandaveli Depot** users. HO and AE see **all depots**.
- The prototype's own text sometimes calls the TIC's approver "Tyre AC" (norms screen). I treat this as a naming slip, to be confirmed.

---

## 4. Information architecture (sidebar navigation per role)

### Tyre Incharge (TIC) — 29 screens
- **Dashboard**
- **Maintenance:** Job Card Register · Complaints · Schedule Planner · Fleet Grouping · My Jobs · Duty Posting
- **Depot Tyre Store:** Depot Indent · GRN · (MRN) Material Return Note – GRN · Scrap Return Note · Internal Transfer Issue · WSR List · GIN · WSR Issue GIN · DRN · Gate Pass
- **Inventory:** Live Tyre Stock · Tyre Register
- **Reports:** Premature Failure Reports · Tyre Damage Reports
- **Setup & records:** Fleet Register · Tyre Man Register · Outsource Employee
- Notifications (bell)

### Tyre Man (TM) — mobile app, 40 files (many are per-person variants)
Bottom navigation: **My Jobs · Duty & Shift · My WSR · GRN · MRN · SRN** (GRN/MRN/SRN appear for some personas), plus Notifications, language toggle, Sign out. Drill-down screens: round lists and fleet screens per job type, monthly lists, norms.

### HO (Technical) — 25 screens
- **Maintenance Master:** Tyre Folio · Tyre Detailed Master · Fleet Register · Fleet Type Master · Tyre Stock · Tyre Man Register · Maintenance Configuration · Shift Master · Tyre Complaint Master · Reason Master · Reject Reason Master · Wear Pattern Master · QC Master
- **Expected Life KM**
- **Purchase:** Purchase Indent
- **Tyres:** Allocation Requests (in the nav; In Transit is reached from the stock view)
- **Schedule:** Maintenance Pending

### AE (HO Technical) — 15 screens
- **HO Technical:** Tyre Folio · Norm Master · Fleet Register · Rotation & Discout Norms · Expected Life KM
- **Configuration:** Maintenance Configuration · Reject Reason Master · Wear Pattern Master · QC Master
- **Purchase:** Purchase Indent · **Tyres:** Allocation Requests · **Schedule:** Maintenance Pending

### Supervisor (SUP) — 9 screens
Job Card Register · Log Sheet Complaints · Grouping Approvals · Roster Approvals · Skill Approvals · GIN Approvals · Indent Approvals · **Records:** Fleet Master · Tyre Register

### Navigation entries that have no page in the prototype (dead links)
Tyre Incharge: **Duty Roster, In Service, At TRS, At MIC Vehicle, At Other Depots, In Transit Stock.** The Tyre Register screen does contain *Fitted / At TRS / At MIC / At Other Depots* tabs, so most of these are probably meant as shortcuts into it — to be confirmed (Q8).

---

## 5. Module catalogue

| # | Module | Primary roles | Screens (prototype files) | Business purpose |
|---|---|---|---|---|
| M1 | Authentication & demo personas | all | `index` | Login, role routing, tablet login |
| M2 | Item master — **Tyre Folio** | HO → AE | `ho/tyre-folio`, `ae/tyre-folio` | Define tyre/tube/flap/disc items (make, model, size, ply, HSN, locations…) with approval |
| M3 | Fleet & tyre masters | HO, AE, TIC, SUP | Fleet Register, Fleet Type Master (+ tyre sizes, type↔size), Tyre Detailed Master, Tyre Stock/Master, Tyre Man Register | Buses, bus types, which tyre sizes fit, every individual tyre, staff |
| M4 | Maintenance configuration | HO, AE | Maintenance Configuration (Jobs, Skills, Schedules), PSI Norms, Rotation & Discout Norms, Expected Life KM, Shift Master, QC Master, Wear Pattern Master, Complaint Master, Reason Master, Reject Reason Master | The rules engine for scheduling, air pressure, rotation cadence, tyre life, checklists |
| M5 | Fleet grouping & scheduling | TIC, SUP | Fleet Grouping, Schedule Planner (calendar, setup, chart, pending), Grouping Approvals, Maintenance Pending | Group buses into rounds; plan recurring jobs; track what is overdue per depot |
| M6 | Job cards | TIC, SUP, TM | Job Card Register, My Jobs, Complaints, Log Sheet Complaints, Duty Posting | Create, assign, run and close work: Air Inflation (regular / nitrogen), Inspection, Rotation, Discout, Census, Tyre Changing (Removal → Unsetting → Setting → Fitment) |
| M7 | Tyre Man mobile execution | TM | `tm/*` | Round lists, per-fleet execution screens, hold, complaint, WSR, norms, roster, leave, notifications |
| M8 | Workforce | TIC, SUP, TM | Duty Posting/Roster Approvals, Duty & Shift, Skill Approvals, Tyre Man Register, Outsource Employee | Shifts, weekly roster, leave, shift change, skills, contractor staff |
| M9 | Material requests (WSR) | TM, TIC | WSR Request, WSR Issue GIN, Raise WSR (from TM) | Tube/flap/disc requests per job, issue against live stock |
| M10 | Depot stores | TIC, SUP | Depot Indent, Internal Transfer Issue, GIN, GRN, Material Return GRN, Scrap Return Note, DRN, Gate Pass, GIN/Indent Approvals | Inter-depot transfers, retreading (TRS) dispatch and return, warranty/discrepancy returns, gate control |
| M11 | Stock & registers | TIC, HO, SUP | Live Tyre Stock, Tyre Register, In Transit, TLDC tyre life drawer, ledgers | Current stock by status, full tyre history, ledger |
| M12 | Central purchasing | HO → AE | Purchase Indent, Allocation Requests | Raise and approve purchase indents; allocate stock to depots |
| M13 | Quality & loss reports | TIC | Premature Failure Reports, Tyre Damage Reports | Loss analysis against expected life; damage report workflow with TRS |
| M14 | Dashboards & notifications | TIC (all roles have a bell) | `tic/dashboard`, notifications ×3 | KPI tiles, pending actions, low stock, compliance; role notifications |

---

## 6. Scale and data seen in the prototype

Useful for sizing the seed data:

- **Fleet:** 300 buses in the HO/AE Fleet Register (295 operating, 5 spare; models Ashok Leyland and Tata in the filter; model types BSIV, BS-III, Low Floor, AC, Deluxe; vehicle types Mofussil, Town, Ghat, Suburban); **70 fleets** in service at Mandaveli; fleet numbers like `J0264`, registration like `TN-01-N-0264`.
- **Tyres:** 535 tracked at Mandaveli (420 fitted, 64 good, 28 in transit, 12 at TRS, 6 at MIC, 3 at other depots, 2 repair); HO view 594 fitted / 440 new across all depots; grades New / A / B / C; retread levels RT1–RT5.
- **Sizes:** 7.50 X 16, 10.00 X 20, 9.00 X 20, 8.25 X 16, 295/80R22.5, 235/75R17.5, 295/90R20.
- **Makes:** Apollo, Birla, Bridgestone, CEAT, JK, Michelin, MRF, TOLINS.
- **Staff:** 174 active tyre-men/incharges across depots (141 Tyre Man + 33 Tyre Incharge) in the HO register; 9 shown for Mandaveli, plus 6 outsource employees.
- **Depots:** 33 in both the HO Fleet Register filter and the Tyre Register depot filter (Adyar, Thiruvanmiyur, Mandaveli, Kannagi Nagar, Perumbakkam, Semmencheri, T. Nagar, Saidapet, K.K. Nagar, Adambakkam, Chrompet, Tambaram, Chrompet-II, Kilambakkam, Kundrathur, Iyyappanthangal, Vadapalani, Poonamallee, Koyambedu, Central Depot, Ayanavaram, Perambur, Basin Bridge, Anna Nagar East, Anna Nagar, Ambattur, Avadi, Vyasarpadi, Tondiarpet-1, Tondiarpet-II, Ennore, Madhavaram, Padiyanallur), plus TRS Chrompet and TRS Tondiarpet (retreading units), a Central Store, and a "MIC Vehicle Unit".
- **Jobs (September 2026 at Mandaveli):** about 290 distinct job-card numbers are referenced in the register (reactive jobs outnumber scheduled ones roughly 2:1) across 9 statuses. The exact seed volume is a Stage 2 design decision.
- **Reference lists:** 12 complaint types for air/inspection, 8 wear patterns, 7 hold reasons, 4 discrepancy reasons, 11 QC checklist job types, 7 skills, 4 shifts.

Sensitive-data note: the Outsource Employee screen stores **Aadhaar number** and phone number. The prototype values are full 12-digit numbers. For the rebuild I will use obviously fake values, mask on display and avoid storing full numbers (Q10).

---

## 7. Observations: gaps, inconsistencies and things the prototype leaves unclear

1. **Dead navigation links** (see section 4).
2. **Empty screens.** Tyre Man GRN, MRN and SRN are navigation shells with no content. HO/AE Allocation Requests is a list with a "Stock" button but no create form visible; the create/approve flows appear only in the runtime. AE Norm Master has no actions even though the Tyre Man norms screen says norms are "approved by AE".
3. **Approval stages are shown inconsistently.** The Maintenance Configuration audit trail shows *Draft → Pending approval → Approved → Published to all depots* for a schedule, but the AE Maintenance Configuration screens have no Approve button, and HO has direct Create/Edit/Deactivate buttons.
4. **Job code gap.** Job codes run JOB-001…006, 008…011, and 012 (Air Inflation) — **JOB-007 is missing.** Possibly intended for Tyre Changing, which is a composite of four jobs.
5. **Persona variant pages.** `tm/*--aja` and `--sil` are the same screens for other tyre men (A. Jaganathan, S. Ilango) showing different data — not extra screens. Likewise `ho/…--1` and the `--` suffix pages are tab states of one screen.
6. **Date logic.** "Today" is 20 Sep 2026; the duty roster is available only September–December 2026 (a toast says so). Data therefore ages: a demo date strategy is needed (Q12).
7. **Hard-wired depot.** Mandaveli is hard-coded in headers; Depot, "From Depot / Unit" and "Request To" fields exist, so multi-depot behaviour is implied for transfers, but the TIC/TM/SUP views are single-depot.
8. **External systems are implied** and simulated: HRMS (attendance, leave, week-off), Central Store / Material CS / D.Store (stock and indents), TRS retreading units, MIC (a vehicle unit that holds tyres), security gate. The master prompt says no integration with legacy systems is required, so these will be mock tables.
9. **Unit and numbering formats** are consistent and should be preserved: `JC-6063`, `JID-4021`, `JC-ST-2609-20-01`, `GIN-MN-2026-0163`, `WSR-MN-2609-0120`, `IND-AD-2026-0044`, `GRN-MN-IN-0027`, `FO-MN-2026-3012`, `DRN-…`, `PFR-…`, `PI-…`, `CMPID-0505`, `SCH001…`, `TRS-GIN-…`.
10. **Terminology differences to align.** Prototype says *Returned* (masters/skills/roster/grouping), *Revert* (GIN/Indent/PI) and *Reject* (GIN/Indent/WSR/Complaint/DRN). The master prompt uses *Rejected*. Details in `business-rules.md`.
11. **Shift names are inconsistent.** Shift Master defines *Morning 06:00–14:00, General 09:00–17:30, Evening 14:00–22:00, Night 22:00–06:00*, but job assignment, rosters and the Tyre Man app use **AM / General / PM / Night** (for example "PM (2 PM – 10 PM)"), and the Log Sheet form uses Morning / General / Evening / Night. I assume AM = Morning and PM = Evening; to be confirmed.
12. **Tablet edition.** The Tyre Incharge tablet view is a separate fixed-size canvas offering "Maintenance rounds and Live Tyre Stock". The master prompt asks for a desktop + mobile responsive TIC interface (Q6).

---

## 8. Where the prototype differs from the master prompt

| Topic | Master prompt | Prototype | Proposed handling |
|---|---|---|---|
| Roles | 4 | 5 (adds Supervisor) | Keep all 5 (Q1) |
| Approval scope | All HO master changes → AM | 5 masters via AE; ~10 masters immediate; ~6 operational flows via Supervisor/AE | Follow prototype; make "requires approval" a per-table setting (Q3) |
| Reject terminology | `REJECTED` | `Returned` / `Revert` / `Reject` | Canonical DB statuses + prototype labels (Q4) |
| Who verifies finished work | Tyre IC | "Final inspection" button on both TIC and SUP registers | Needs your ruling (Q5) |
| Dashboards | HO and AM dashboards | None for HO/AE/SUP | New simple dashboards, flagged as additions (Q9) |
| Tyre Man | Mobile-only, can upload photos | Mobile app with optional photo, QR scan, Tamil toggle | Match prototype |
| TIC UI | Desktop + mobile | Desktop + separate fixed tablet canvas | One responsive layout (Q6) |
| Schema | Generic table list | Domain much richer | Extended schema, proposed in `database-design.md` |
| Master-prompt term "AM (Tech)" | AM | "AE (HO Technical)" | Treat as the same role (Q1) |

---

## 9. Questions I need answered before Stage 2

Each has my recommended default. If you simply reply "go with your defaults", I will proceed with the bold options.

**Q1. Roles.** Is the prompt's "AM (Tech)" the prototype's "AE (HO Technical)"? And should **Supervisor** stay as a fifth role? *Default:* **yes to both.** Removing the Supervisor would orphan five approval flows.

**Q2. Build scope and order.** 82 role-specific screens (about 65 unique) is a very large build. I will not drop any, but I propose delivering in business-value order (see `implementation-plan.md`, section 4) so you can demo early. *Default:* **phased delivery, with all screens eventually built.** Do you need everything before first demo, or are phased demos fine?

**Q3. Which masters need approval?** Prototype: Tyre Folio, Expected Life KM, Reject Reason, QC, Wear Pattern use maker-checker; Complaint, Reason, Fleet Type, Shift, Tyre Detailed, Maintenance Configuration (jobs, skills, schedules), PSI norms, Rotation/Discout norms and Fleet edits are direct. *Default:* **replicate the prototype exactly**, and implement approval as a configurable flag per master so more can be switched on later without rework. Alternatively, force approval on every HO master.

**Q4. Status words.** *Default:* the UI keeps the prototype's labels (Returned / Revert / Reject) and the database stores canonical values (`DRAFT, PENDING_APPROVAL, APPROVED, RETURNED, WITHDRAWN`, and `REJECTED` where the prototype has a terminal reject). Mandatory reason on every return/reject/withdraw. OK?

**Q5. Final inspection.** Who closes a job that is "Awaiting final inspection" — the Tyre Incharge, the Supervisor, or either? *Default:* **either can**, recorded with the actor, matching the prototype where both registers show the button.

**Q6. Tablet.** *Default:* the Tyre Incharge gets a **single responsive layout** (desktop, tablet, phone) instead of a separate fixed tablet canvas; the tablet is just a breakpoint with larger touch targets.

**Q7. Depots to seed.** *Default:* Mandaveli fully populated (one month, as in the prototype) plus **two lightly populated depots** (Adyar, Tambaram) and the full depot list as master data, so HO/AE depot-wise views and inter-depot transfers are demonstrable. TRS Chrompet and TRS Tondiarpet seeded as retreading units.

**Q8. Dead links and empty screens.** *Default:* build In Service / At TRS / At MIC Vehicle / At Other Depots / In Transit Stock as **filtered views of the Tyre Register**; build Duty Roster as the read view of Duty Posting; build Tyre Man GRN/MRN/SRN as simple receive/return lists; and build Allocation Requests create/approve flow from the runtime hints. Anything beyond that will be labelled "placeholder".

**Q9. Dashboards for HO, AE and SUP.** The prototype has none. *Default:* add **one simple dashboard each** (pending approvals, depot-wise maintenance pending, stock summary), clearly marked as additions to the prototype.

**Q10. Sensitive fields.** *Default:* Aadhaar stored only as masked last-4 plus a flag; phone numbers fake; no real personal data anywhere.

**Q11. Numbering.** *Default:* generate document numbers server-side in the prototype's formats (per depot/year/month sequences).

**Q12. Demo date.** *Default:* seed **September 2026** (matching the prototype) and add an admin-set "demo today" setting so the data does not go stale. Today's real date is 1 Nov 2026.

**Q13. Language.** Keep the Tamil/English toggle for Tyre Man (the prototype labels the translations as samples for client review)? *Default:* **yes**, with an i18n layer.

**Q14. Photos and QR scanning.** Photos → Supabase Storage (free tier). QR scanning → camera-based with a manual-entry fallback. *Default:* yes to both.

**Q15. Repository state.** Your project folder is **not yet a git repository** (no `.git`). You gave me `https://github.com/BrownJoshua/Testing-Depot-Tyre-Application-.git`. May I run `git init`, add it as `origin`, and (only when you say) push? Is the GitHub repo empty? The 41 MB prototype file is under GitHub's 100 MB limit but will trigger a size warning; I propose moving it to a `/reference/` folder later (your call).

**Not needed yet:** the Supabase *publishable/anon* key (needed at Stage 3). I have noted the project URL you gave (`https://hfvjhzxgehyiuuqtfntz.supabase.co`). It is a public URL, not a secret, and I will place it only in `.env` and `.env.example` when we get there. Never send me the service-role key.

---

## 10. Deliverables in this stage

| File | Purpose |
|---|---|
| `existing-prototype-audit.md` | This document |
| `screen-inventory.md` | Curated per-screen analysis (9 required attributes) |
| `screen-inventory-appendix-generated.md` | Exhaustive machine-extracted fields, columns, filters, popups for all 118 screens |
| `business-rules.md` | Rules, with source and confidence, plus conflicts |
| `workflow-documentation.md` | Workflow and state diagrams |
| `database-design.md` | **Preliminary** data model and security approach (not final; Stage 2 will refine and explain before any migration) |
| `implementation-plan.md` | Architecture decisions, phasing, stage checklist, risks |
| `audit-tools/` | Scripts used to extract the prototype (re-runnable) |
