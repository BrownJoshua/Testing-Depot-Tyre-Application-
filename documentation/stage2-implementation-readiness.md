# Stage 2 — Implementation Readiness Report

> **Superseded for current status by `stage2.1-stage3-readiness.md`.** Figures below (127 tables, 26 entity types, 32 questions) are the Stage 2 values; after Stage 2.1 they are **136 tables, 27 entity types, 49 questions**.

**Verdict: Stage 2 documentation is complete and internally consistent. It is ready for your review. It is *not* ready to build until you approve it and answer the Stage 3 blockers (section 5).**
Nothing has been applied to Supabase, no tables exist, no React code exists, and the original prototype is untouched.

---

## 1. The twelve validation checks

| # | Check | Result | Evidence | How verified |
|---|---|---|---|---|
| 1 | All five roles included | **Pass** | HO (Tech), AM (Tech), Supervisor, Tyre IC, Tyre Man in `stage2-final-role-matrix.md` §1–2, capability table §7, `roles` table in schema §3 | Script check of the role matrix text |
| 2 | Supervisor not removed | **Pass** | Role matrix §2 and §5 (nine responsibilities retained); workflows OA-04 … OA-08 name the Supervisor as approver; capabilities `gin.approve`, `indent.approve`, `grouping.approve`, `roster.approve`, `skill.approve`; 33 Supervisors in the mock data plan | Manual cross-read |
| 3 | All HO master-data changes require AM approval | **Pass (design)** | Approval workflows §A: 26 entity types registered, rule R1 (only HO proposes, only AM decides), R10 (no client write on any master table); schema §5; RLS §5.2 shows no client write class for any master. Creation, modification, deactivation and reactivation are all request actions | Cross-read of every master table: all carry the `MST` bundle and an entry in the registry. **Proof by SQL tests is a Stage 4 exit criterion** |
| 4 | Master-data and operational approvals are separate | **Pass** | Approval workflows §B.4: different tables, approver sets, queue views, effects; only audit/notification/attachments are shared | Cross-read |
| 5 | Operational approvers match documented workflows | **Pass** | Each of the 17 `BR-AP-xx` rules maps to an `OA-xx` row; AE → AM mapping applied; unresolved approvers left empty, not invented (see table below) | Row-by-row mapping |
| 6 | All 33 depot records included | **Pass** | `stage2-depot-master.md` §2 lists 33 rows | Script: names equal your list **in your order**, 33 unique codes, tiers A=1 / B=6 / C=26 |
| 7 | TRS units, Central Store, MIC separate from depots | **Pass** | Depot master §1 and §3: `org_units.unit_type` = TRS / CENTRAL_STORE / MIC_VEHICLE_UNIT; `v_depots` returns exactly the 33 | Script confirms the four names; design check |
| 8 | Vendor Master included | **Pass** | `vendors`, `vendor_contacts` in schema §4; §4.1 lists code, name, category, contact person, address, contacts, fictional GSTIN, status, created date; relationships to tyres, purchase indent lines, retread batches, DRN, premature-failure claims, outsource employees, GIN/GRN; entity #26 in the approval registry; role matrix row; 14 fictional vendors in the mock data plan | Cross-read |
| 9 | Employee-ID login technically feasible with Supabase Auth | **Pass by design, one open risk** | Standard `signInWithPassword` with a deterministic synthetic email, admin-created users, sign-ups disabled, role read from the database not the JWT (`stage2-rls-security-design.md` §2). **Not tested against a live Supabase project** because Stage 2 forbids creating anything there. The open risk is whether Supabase's email validator accepts the chosen synthetic domain (UQ-12) | Reasoned from documented Auth features; Stage 3 starts with a one-user spike |
| 10 | Tyre IC has desktop **and** mobile interfaces in the future plan | **Pass** | `implementation-plan.md` §2 (one responsive layout, mobile card layouts, ≥44 px targets), stages 5a/5b; role matrix §8 | Cross-read |
| 11 | Tyre Man is mobile-only in the future plan | **Pass** | `implementation-plan.md` §2 (bottom navigation, desktop-width "open on your phone" screen, role guard regardless), Stage 6; role matrix §8 | Cross-read |
| 12 | All original prototype modules accounted for | **Pass** | Traceability in section 3: modules M1–M14 and all 82 role screens map to tables; additions listed | Script confirms every screen ID in `screen-inventory.md` appears in this report |

### Check 5 detail — operational approver mapping

| Stage 1 rule | Stage 2 workflow | Approver in Stage 2 |
|---|---|---|
| BR-AP-01 Purchase Indent | OA-01 | AM (was AE) |
| BR-AP-02 Allocation | OA-02 | AM (was AE) |
| BR-AP-03 Air-type conversion | OA-03 | HO review → AM final (UQ-07) |
| BR-AP-04 GIN | OA-04 | Supervisor |
| BR-AP-05 Depot Indent | OA-05 | Supervisor |
| BR-AP-06 Fleet Grouping | OA-06 | Supervisor |
| BR-AP-07 Duty Roster | OA-07 | Supervisor |
| BR-AP-08 Skill | OA-08 | Supervisor |
| BR-AP-09 WSR | OA-09 | Tyre IC |
| BR-AP-10 Complaint triage | OA-10 | Tyre IC |
| BR-AP-11 DRN | OA-16 | **unresolved** (UQ-01) |
| BR-AP-12 Tyre Damage Report | OA-17 | **unresolved** (UQ-02) |
| BR-AP-13 Premature Failure | OA-18 | **unresolved** (UQ-05) |
| BR-AP-14 Reason suggestions | OA-13 | HO, then master workflow to AM (UQ-09) |
| BR-AP-15 Shift change / leave | OA-19, OA-20 | **unresolved** (UQ-03) |
| BR-AP-16 Prepone / Postpone | OA-21 | **unresolved** (UQ-04) |
| BR-AP-17 WSR Issue GIN | OA-11 | none (automatic) |

## 2. Automated checks that were run

| Check | Result |
|---|---|
| Depot list equals your 33 names, in order | Match |
| Depot codes unique | 33 of 33 unique |
| Tables defined in the schema | **127**, no duplicates |
| Every table has an explicit entry in the RLS document | 127 of 127 |
| Every table appears in at least one ER diagram, or is listed as free-standing | Yes (3 documented free-standing tables) |
| ER diagram entity names exist in the schema | All |
| Mermaid syntax (rendered with Mermaid 10.9.1 in the built-in browser) | **29 of 29 diagrams parse** (this also caught and fixed one Stage 1 diagram) |
| Every `UQ-nn` referenced in any document is defined; every defined one is referenced | 32 defined; none undefined; none orphaned |
| Original `MTC-Depot-Tyre-Prototype.html` unchanged | Same size as at Stage 1 (41,491,119 bytes) |

**Not verified (cannot be, yet):** the SQL itself. No DDL has been written or compiled, so column types, constraints and policy syntax are validated only by reading. The first migrations in Stage 3 will be the real test, and each ships with SQL tests.

## 3. Traceability: every prototype module and screen → tables

### 3.1 Modules

| Module (Stage 1) | Primary tables |
|---|---|
| M1 Authentication & personas | `auth.users`, `profiles`, `employees`, `roles`, `role_capabilities` |
| M2 Tyre Folio | `tyre_folios`, `tyre_folio_locations`, `tyre_makes`, `tyre_models`, `tyre_sizes`, `ref_values` |
| M3 Fleet & tyre masters | `fleets`, `fleet_operational_state`, `fleet_types`, `fleet_type_tyre_sizes`, `routes`, `tyres`, `tyre_current_state`, `employees`, `skills`, `tyre_detail_columns` |
| M4 Maintenance configuration | `maintenance_jobs`, `maintenance_job_skills`, `maintenance_schedules` (+ 5 child tables), `psi_norms`, `rotation_discout_norms`, `norm_eligible_grades`, `expected_life_km`, `shifts`, `qc_checklists`(+items), `wear_patterns`, `complaint_types`(+jobs), `reasons`(+usages), `reject_reasons` |
| M5 Fleet grouping & scheduling | `fleet_groups`, `fleet_group_revisions`, `fleet_group_revision_members`, `schedule_instances` |
| M6 Job cards | `job_cards`, `job_tasks`, `job_assignments`, `job_holds`, `complaints`, `log_sheet_complaints`, `final_inspections`(+answers), `removal_orders`, `fitment_orders` |
| M7 Tyre Man execution | `job_task_execution`, `air_inflation_readings`, `inspection_results`, `census_readings`, `rotation_moves`, `cirt_checklist_answers`, `attachments` |
| M8 Workforce | `duty_rosters`(+entries), `shift_change_requests`, `leave_requests`, `skill_requests`(+items), `employee_skills`, `outsource_employees`(+skills), `attendance_records`, `reschedule_requests` |
| M9 WSR | `wsrs`, `wsr_lines`, `accessory_items` |
| M10 Depot stores | `indents`(+lines), `gins`(+lines), `gate_passes`, `grns`(+lines), `mrns`(+lines), `scrap_return_notes`(+lines), `drns`(+lines), `retread_batches`(+tyres) |
| M11 Stock & registers | `tyre_current_state`, `tyre_movements`, `stock_ledger`, `tyre_fitment_history`, `tyre_retread_stages`, `tyre_repairs`, `tyre_route_usage`, `folio_stock_params`, views |
| M12 Central purchasing | `purchase_indents`(+lines), `allocation_requests`(+lines), `vendors` |
| M13 Quality reports | `premature_failure_requests/reports`, `tyre_damage_requests/reports`, `expected_life_km` |
| M14 Dashboards & notifications | views over the above, `notifications`, `notification_reads` |
| **New in Stage 2** | `org_units` (33 depots + 4 units), `vendors`, `master_change_requests` engine, `approval_routes`, `document_status_history`, `audit_logs` |

### 3.2 Screens (all 82 role-specific screens)

**HO (22)** — HO-01 Tyre Folio → `tyre_folios`, locations · HO-02 Tyre Detailed Master → `tyre_detail_columns` · HO-03 Fleet Register → `fleets`, `fleet_operational_state`, `fleet_air_type_requests` · HO-04 Fleet Type Master → `fleet_types`, `fleet_type_tyre_sizes`, `tyre_sizes` · HO-05 Tyre Stock → `tyres`, `tyre_current_state`, views · HO-06 In Transit → `tyre_current_state`, `gins`, `gate_passes` · HO-07 Tyre Man Register → `employees`, `employee_skills` · HO-08 Jobs → `maintenance_jobs` · HO-09 Skills → `maintenance_job_skills` · HO-10 Schedules → `maintenance_schedules` + children · HO-11 PSI Norms → `psi_norms` · HO-12 Rotation & Discout Norms → `rotation_discout_norms`, `norm_eligible_grades` · HO-13 Shift Master → `shifts` · HO-14 Complaint Master → `complaint_types`, `complaint_type_jobs` · HO-15 Reason Master → `reasons`, `reason_usages`, `reason_suggestions` · HO-16 Reject Reason → `reject_reasons` · HO-17 Wear Pattern → `wear_patterns` · HO-18 QC Master → `qc_checklists`, items · HO-19 Expected Life KM → `expected_life_km` · HO-20 Purchase Indent → `purchase_indents`, lines · HO-21 Allocation → `allocation_requests`, lines · HO-22 Maintenance Pending → view over `schedule_instances`/`job_cards`.

**AM (12)** *(IDs keep the Stage 1 prefix `AE-` used in `screen-inventory.md`)* — AE-01 Tyre Folio approvals · AE-02 Norm Master · AE-03 Fleet Register + air-type · AE-04 Rotation & Discout Norms · AE-05 Expected Life KM approvals · AE-06 Maintenance Configuration · AE-07 Reject Reason approvals · AE-08 Wear Pattern approvals · AE-09 QC approvals → all served by `master_change_requests` + history and the live master tables (read) · AE-10 Purchase Indent approvals → `purchase_indents` + `approval_routes` · AE-11 Allocation → `allocation_requests` · AE-12 Maintenance Pending → same view as HO-22. The prototype's AE screens become one **AM approval inbox** plus read views of the masters.

**Supervisor (9)** — SUP-01 Job Card Register → `job_cards`, `job_tasks` (view) · SUP-02 Log Sheet Complaints → `complaints`, `log_sheet_complaints` · SUP-03 Grouping Approvals → `fleet_group_revisions` · SUP-04 Roster Approvals → `duty_rosters` · SUP-05 Skill Approvals → `skill_requests` · SUP-06 GIN Approvals → `gins` · SUP-07 Indent Approvals → `indents` · SUP-08 Fleet Master → `fleets`, `fleet_operational_state` · SUP-09 Tyre Register → `tyres`, `tyre_current_state`.

**Tyre IC (25)** — TIC-01 Dashboard → views, `folio_stock_params` · TIC-02 Job Card Register → `job_cards`, `job_tasks`, `job_assignments` · TIC-03 Complaints → `complaints` · TIC-04 Schedule Planner → `schedule_instances`, schedules · TIC-05 Fleet Grouping → `fleet_groups`, revisions · TIC-06 My Jobs → `job_tasks` · TIC-07 Duty Posting → `duty_rosters`, entries · TIC-08 Depot Indent → `indents` · TIC-09 Internal Transfer Request → `indents` (supplier view) · TIC-10 GIN → `gins` · TIC-11 WSR Issue GIN → `gins` (WSR type) · TIC-12 GRN → `grns` · TIC-13 Material Return Note → `mrns` · TIC-14 Scrap Return Note → `scrap_return_notes` · TIC-15 WSR List → `wsrs` · TIC-16 DRN → `drns` · TIC-17 Gate Pass → `gate_passes` · TIC-18 Live Tyre Stock → views over `tyre_current_state`, `accessory_items`, `stock_ledger` · TIC-19 Tyre Register → same plus history · TIC-20 Premature Failure → `premature_failure_*` · TIC-21 Tyre Damage → `tyre_damage_*` · TIC-22 Fleet Register → `fleets`, `fleet_operational_state` · TIC-23 Tyre Man Register → `employees`, `skill_requests` · TIC-24 Outsource Employee → `outsource_employees` · TIC-25 Notifications → `notifications`.

**Tyre Man (14)** — TM-01 My Jobs → `job_tasks` · TM-02 Round list → `job_cards`, `job_tasks` · TM-03 Fleet execution → `air_inflation_readings`, `inspection_results`, `rotation_moves`, `census_readings`, `cirt_checklist_answers` · TM-04 Tyre Changing → `job_tasks` chain, `job_task_execution`, `removal_orders`, `fitment_orders` · TM-05 Tyre Setting · TM-06 Tyre Unsetting → `job_tasks`, `accessory_items` · TM-07 Monthly view → `schedule_instances` · TM-08 Duty & Shift → `duty_roster_entries`, `shift_change_requests`, `leave_requests`, `attendance_records` · TM-09 My WSR → `wsrs` · TM-10 Air inflation norms → `psi_norms` · TM-11 Notifications → `notifications` · TM-12 GRN, TM-13 MRN, TM-14 SRN → list views of `grns`, `mrns`, `scrap_return_notes` (placeholders until UQ-22).

### 3.3 Additions that have no prototype screen
Vendor Master screens (HO propose / AM approve), Depot Master screens (33 depots + 4 units), AM two-tab approval inbox with before/after diff, HO consolidated dashboard, AM approval dashboard, Supervisor depot monitor. All flagged as additions (UQ-21).

## 4. What changed from Stage 1

| Area | Stage 1 | Stage 2 |
|---|---|---|
| Roles | five, AE | five, **AE → AM**; HO/AM/SUP/TIC/TM |
| Master approval | five masters; ten direct | **all** HO masters, incl. deactivate / reactivate |
| Status words (masters) | Draft / Pending / Approved / Returned | Draft / Pending / Approved / **Rejected** (+ Withdrawn, UQ-14) |
| Depots | Mandaveli + a few | **33** depots + 4 separate org units |
| Vendor Master | absent | added and linked to 8 modules |
| Schema | ~100 tables, JSON-centric approval | **127 tables**, explicit separation of master / transaction / approval / history / audit, append-only tyre movements |
| Access data | role and depot on profile | derived from `employees` so changes go through approval; users cannot edit |
| Login | Employee ID mapped to email (sketch) | specified, with provisioning and feasibility analysis |
| Mock data | outline | volumes, rules, order, verification |

## 5. What is needed before Stage 3

1. **Your approval** of the nine `stage2-*` documents and the revised `implementation-plan.md` (or corrections).
2. **Answers to the Stage 3 blockers:** UQ-10 (tyre stock editing), UQ-11 (who provisions logins), UQ-12 (auth email domain / passwords / reset), UQ-13 (official depot codes), UQ-14 (keep Withdrawn), UQ-19 (numbering), UQ-20 (demo date), UQ-30 (git/GitHub), UQ-32 (demo names).
3. Everything else in the 32 questions can be answered when its stage arrives; affected features stay disabled meanwhile and nothing is guessed.

## 6. Residual risks

| Risk | Note |
|---|---|
| Synthetic-email acceptance by Supabase | untested; spike first in Stage 3 |
| JSON payload approach for master proposals | flexible and uniform, but needs rigorous per-entity validation and tests (planned) |
| Scope | 127 tables / 82 screens is large; staged demos and placeholders keep it honest |
| Unresolved approvers | six workflows are intentionally incomplete until you decide |
| Seed data realism | generator + verification pack planned; prototype figures used as targets |

**Stage 3 will not begin until you approve.**
