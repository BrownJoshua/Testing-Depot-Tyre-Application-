# Stage 2.1 — Table Justification

Review of the 127 tables proposed in `stage2-database-schema.md`, with the Stage 2.1 decisions applied. **No functionality is removed to simplify the schema.** Every prototype requirement still has a home.

## 0. Result in one view

| Measure | Count |
|---|---|
| Tables proposed in Stage 2 | **127** |
| Merged into another table | **2** (`mrns`, `mrn_lines` → `grns`, `grn_lines`) |
| Added by Stage 2.1 | **11** |
| **Tables after Stage 2.1** | **136** |
| Tables with no screen or workflow of their own, or used without a maintaining screen (§12) | 12 |
| Tables kept although derivable (projection, or the source data is outside the system) (verdict **D**) | 4 (`tyre_current_state`, `tyre_fitment_history`, `tyre_route_usage`, `attendance_records`) |
| Redundant columns / circular references removed (§11: R2, R3, R4, R7) | 4 |
| Missing relationships found (§13) | 9 |
| Missing constraints added (§14) | 14 |
| Index requirements consolidated (§15) | 18 (7 are new because of Stage 2.1 tables and columns) |

**Legend.** Verdict: **E** essential business entity · **S** essential supporting (child, line, junction) · **D** derivable but kept (projection/snapshot) · **I** infrastructure (no screen by design) · **O** optional, dormant · **M** merged · **N** new in Stage 2.1.
History: **A** append-only history table · **R** revisions/status history · **V** effective-dated · **T** audited via change-request trail · **–** none needed.

---

## 1. Identity, access and organisation (§3 of the schema)

| Table | Verdict | Served by | History | Notes |
|---|---|---|---|---|
| `roles` | E | login routing, all authorisation | – | five fixed rows |
| `role_capabilities` | I | authorisation of contested actions (UQ-06 etc.) | T (admin log) | no screen; changed only by administrator |
| `org_units` | E | Depot Master, every document | T | 33 depots + TRS ×2 + Central Store + MIC; **`code` is a MOCK CODE, configurable** |
| `employees` | E | Tyre Man Register (HO-07, TIC-23), assignment lists, roster | T | access role/depot derive from here; `is_demo` flag added |
| `profiles` | E | login, language | – | login-enabled subset; `must_change_password` added |
| `user_depot_access` | O | none (UQ-18) | T | dormant; kept so multi-depot cover needs no migration |
| `skills` | E | HO-09, assignment "skill match" | T | |
| `employee_skills` | S | skill lists, assignment | R (via `skill_requests`) | |
| `outsource_employees` | E | TIC-24 | T | contractor from Vendor Master |
| `outsource_employee_skills` | S | TIC-24 | – | |

## 2. Reference and master data (§4)

| Table | Verdict | Served by | History | Notes |
|---|---|---|---|---|
| `ref_values` | S | dropdown lists across masters | T | generic list table |
| `tyre_sizes` | E | folios, norms, fleet types | T | |
| `tyre_makes` | S | folio make | T | |
| `tyre_models` | S | folio model | T | |
| `tyre_folios` | E | HO-01; every stock line | T | |
| `tyre_folio_locations` | S | HO-01 "Locations" | T | |
| `tyre_detail_columns` | I | HO-02 screen only | T | **screen exists, no workflow consumes it**; confirm intent (UQ-31 family) |
| `vendors` | E | Vendor Master (new requirement) | T | |
| `vendor_contacts` | S | Vendor Master | T | |
| `fleet_types` | E | HO-04 | T | |
| `fleet_type_tyre_sizes` | S | HO-04 | T | |
| `routes` | S | fleet state, TLDC routes | T | **no master screen in prototype**; routes appear only in data |
| `fleets` | E | Fleet Register | T | master attributes only; operational state separate |
| `fleet_depot_history` | S | fleet moves between depots | A | |
| `tyres` | E | Tyre Stock/Register | A (movements, ownership, corrections) | **now created only by posted Central Store receipts** |
| `folio_stock_params` | S | min/max on stock screens, low-stock alert | T | **no maintaining screen in prototype** (UQ-17) |
| `maintenance_jobs` | E | HO-08 | T | |
| `maintenance_job_skills` | S | HO-09 | T | |
| `maintenance_schedules` | E | HO-10, planner | T | |
| `schedule_categories` | S | schedule builder | T | |
| `schedule_group_rules` | S | schedule builder | T | |
| `schedule_checkpoints` | S | schedule builder | T | |
| `schedule_checklist_items` | S | schedule builder | T | |
| `schedule_job_map` | S | schedule builder | T | |
| `psi_norms` | E | HO-11, TM-10, air inflation | V + T | effective-dated |
| `rotation_discout_norms` | E | HO-12 | V + T | |
| `norm_eligible_grades` | S | HO-12 | V + T | |
| `expected_life_km` | E | HO-19, premature failure | V + T | |
| `shifts` | E | HO-13, rosters, assignment | T | |
| `complaint_types` | E | HO-14, complaints | T | |
| `complaint_type_jobs` | S | HO-14 required jobs | T | |
| `reasons` | E | HO-15, holds | T | |
| `reason_usages` | S | HO-15 "Used for" | T | could be an array column; kept as rows for referential integrity |
| `reason_suggestions` | S | HO-15 "New reasons from depots" | R | operational feed to master workflow |
| `reject_reasons` | E | HO-16, GRN/DRN rejects | T | |
| `wear_patterns` | E | HO-17, census | T | |
| `qc_checklists` | E | HO-18, final inspection | T | versioned |
| `qc_checklist_items` | S | HO-18 | T | |

## 3. Approval engine, history and system (§5, §13)

| Table | Verdict | Served by | History | Notes |
|---|---|---|---|---|
| `master_entity_registry` | I | master workflow engine | T | no screen; 27 entity types after Stage 2.1 |
| `master_change_requests` | E | HO requests, AM inbox | R | payload immutable after submit |
| `master_change_request_history` | E | Audit Trail modals | A | |
| `approval_routes` | I | operational approvals | T (admin) | holds UNRESOLVED approvers |
| `document_status_history` | E | Audit Trail / "When-Who-Action-Comment" | A | |
| `notifications` | E | bell lists | – | |
| `notification_reads` | S | per-user read state | – | needed because role broadcasts are shared |
| `audit_logs` | E | audit requirement | A | |
| `attachments` | E | photos | – | |
| `application_settings` | I | demo date, tolerances | T | **adds `demo_mode`, `demo_today`** |
| `document_sequences` | I | numbering counters | – | no screen; see numbering doc |
| `import_batches` | O | optional CSV master import | – | no screen; defer to optional enhancements |

## 4. Tyre inventory, movement and history (§6)

| Table | Verdict | Served by | History | Notes |
|---|---|---|---|---|
| `tyre_current_state` | D | Live Tyre Stock, Register, dashboards | – | projection rebuilt from movements; kept for speed |
| `tyre_movements` | E | TLDC, ledgers, "no overwrite" requirement | A | the source of truth |
| `tyre_fitment_history` | D | TLDC fitment table | A (closed spans) | derivable from movements, kept as spans for km/day totals |
| `tyre_retread_stages` | S | TLDC retread stages | A | |
| `tyre_repairs` | S | TLDC repair history | A | |
| `tyre_route_usage` | D | TLDC routes table | A | **source data (trip logs) is outside the system**; kept as an imported snapshot |
| `accessory_items` | E | tube/flap/disc stock | via ledger | |
| `stock_ledger` | E | Ledger, Folio Stock Details | A | |
| `retread_batches` | E | TRS cycle | R | |
| `retread_batch_tyres` | S | TRS cycle | A | |

## 5. Fleet operations (§7)

| Table | Verdict | Served by | History | Notes |
|---|---|---|---|---|
| `fleet_operational_state` | E | status, odometer, air type, FC | via history tables | |
| `fleet_status_history` | S | status changes | A | |
| `odometer_readings` | S | KM-based schedules | A | |
| `fleet_air_type_requests` | E | OA-03 | R | |
| `fleet_air_type_request_fleets` | S | OA-03 | – | |
| `fleet_air_type_changes` | S | air-type history | A | |

## 6. Scheduling, groups, complaints, jobs (§8, §9)

| Table | Verdict | Served by | History | Notes |
|---|---|---|---|---|
| `fleet_groups` | E | TIC-05 | R | |
| `fleet_group_revisions` | E | TIC-05, SUP-03 | R | |
| `fleet_group_revision_members` | S | TIC-05 | R | |
| `schedule_instances` | E | planner, rounds | status | |
| `complaints` | E | TIC-03 | R | **drop `job_card_id`** (see §11, R2) |
| `log_sheet_complaints` | S | SUP-02 | – | |
| `job_cards` | E | TIC-02 | R | |
| `job_tasks` | E | TIC-06, TM-01 | R | current assignee is a denormalised copy of `job_assignments` |
| `job_assignments` | E | replace/reschedule history | A | authoritative for assignee history |
| `job_holds` | S | hold reasons | A | |
| `job_task_execution` | E | removal/fitment/odometer | – | |
| `air_inflation_readings` | E | air rounds | – | |
| `inspection_results` | E | inspection rounds | – | |
| `census_readings` | E | census | – | |
| `rotation_moves` | S | rotation/discout | – | overlaps `tyre_movements`; each move must reference its movement (§6) |
| `cirt_checklist_answers` | S | air round checklist | – | |
| `final_inspections` | E | verification | – | |
| `final_inspection_answers` | S | verification | – | |
| `removal_orders` | E | removal, MRN/GRN "Goes To" | R | |
| `fitment_orders` | E | fitment | R | |
| `reschedule_requests` | E | TM prepone/postpone | R | approver UNRESOLVED |

## 7. Workforce (§10)

| Table | Verdict | Served by | History | Notes |
|---|---|---|---|---|
| `duty_rosters` | E | TIC-07, SUP-04, TM-08 | R | |
| `duty_roster_entries` | S | roster grid | R | |
| `shift_change_requests` | E | TM-08 | R | approver UNRESOLVED |
| `leave_requests` | E | TM-08 | R | approver UNRESOLVED |
| `skill_requests` | E | TIC-23, SUP-05 | R | |
| `skill_request_items` | S | TIC-23 | – | |
| `attendance_records` | D | TM-08 "Attendance (HRMS)" | A | mock HRMS feed; external in reality |

## 8. Store documents (§11)

| Table | Verdict | Served by | History | Notes |
|---|---|---|---|---|
| `indents` | E | TIC-08/09, SUP-07 | R | |
| `indent_lines` | S | | – | |
| `gins` | E | TIC-10/11, SUP-06 | R | `wsr_id` is the only WSR↔GIN link |
| `gin_lines` | S | | – | |
| `gate_passes` | E | TIC-17 | R | |
| `grns` | E | TIC-12, TIC-13 | R | **absorbs MRN** via `grn_kind` |
| `grn_lines` | S | | – | absorbs MRN lines |
| `mrns` | **M** | TIC-13 | – | merged: same structure as GRN; separate numbering series kept (`MRN-…`) |
| `mrn_lines` | **M** | TIC-13 | – | merged |
| `scrap_return_notes` | E | TIC-14 | R | |
| `scrap_return_lines` | S | | – | |
| `wsrs` | E | TIC-15, TM-09 | R | **drop `issued_gin_id`** (see §11, R3) |
| `wsr_lines` | S | | – | |
| `drns` | E | TIC-16 | R | approver UNRESOLVED |
| `drn_lines` | S | | – | |
| `purchase_indents` | E | HO-20, AE-10 | R | |
| `purchase_indent_lines` | S | | – | |
| `allocation_requests` | E | HO-21, AE-11 | R | now tied to individual tyres |
| `allocation_request_lines` | S | | – | per-depot summary |

## 9. Reports (§12)

| Table | Verdict | Served by | History | Notes |
|---|---|---|---|---|
| `premature_failure_requests` | E | TIC-20 | R | |
| `premature_failure_reports` | E | TIC-20 | R | computed values frozen at submission |
| `tyre_damage_requests` | E | TIC-21 | R | |
| `tyre_damage_reports` | E | TIC-21 | R | fields unknown (UQ-31) |

---

## 10. Tables added in Stage 2.1 (11)

| Table | Verdict | Why it is needed | History |
|---|---|---|---|
| `depots` | N | Subtype of `org_units` (1:1, PK = org unit id) for the 33 depots. Lets every depot-only reference (employees, fleets, job cards…) be a **real foreign key to depots**, so a TRS unit or Central Store can never be assigned as a depot. Holds depot-only attributes (hub, `is_mock_code`) | T |
| `central_store_receipts` | N | Goods receipt at Central Store, the origin of every tyre (your UQ-10 decision) | R |
| `central_store_receipt_lots` | N | Lots (folio, quantity, tyre-number range, rate, dates) within a receipt; `tyres.origin_receipt_lot_id` points here | A once posted |
| `tyre_number_series` | N | Configured MTC Tyre No series (prefix, width, size); HO master with AM approval | T |
| `allocation_request_tyres` | N | The prototype allocates **individual** tyres; Stage 2 held only quantities | R |
| `tyre_ownership_history` | N | Which unit owned a tyre and when (receipt → depot → transfer…); `tyres.owner_org_unit_id` is only the current owner | A |
| `tyre_identity_corrections` | N | Before/after values of every approved HO correction; alias lookup for corrected numbers | A |
| `depot_tools_equipment` | N | **Tools & Equipment register found in the prototype** (`TL-…`, `EQ-…`; add/view/edit/activate popups in Live Tyre Stock) that Stage 1 missed: name, location (Tyre bay, Tyre store, Nitrogen room), quantity, working/down counts, last service, used-for job types, status. Ownership and exact screen are UQ-39 | T |
| `fleet_route_assignments` | N | Route history per fleet; without it `tyre_route_usage` and TLDC routes cannot be derived | A |
| `document_number_series` | N | Configuration of numbering templates, scope and reset | T (admin) |
| `admin_action_log` | N | Audit of administrator-script actions (create/reset/deactivate/withdraw/set demo date); no secrets | A |

## 11. Duplicate, redundant or overlapping elements

| # | Finding | Decision |
|---|---|---|
| R1 | `mrns` / `mrn_lines` duplicate `grns` / `grn_lines` (same header, same lines, same receive/accept/reject pattern) | **Merge** with `grn_kind` (`GRN`, `MRN`); keep two numbering series and two screens |
| R2 | `complaints.job_card_id` and `job_cards.complaint_id` point at each other | **Remove** `complaints.job_card_id`; "Job ref" becomes a view |
| R3 | `wsrs.issued_gin_id` and `gins.wsr_id` point at each other (and a partial issue can produce several GINs) | **Remove** `wsrs.issued_gin_id` |
| R4 | `removal_orders.received_grn_id` duplicates the link from `grn_lines` | Keep only the `grn_lines → removal_orders` reference |
| R5 | `job_tasks.assigned_*` repeats `job_assignments` | Keep (query speed) but only the assignment function writes it; test enforces equality |
| R6 | `rotation_moves` vs `tyre_movements` | Keep both (task detail vs tyre life); each rotation move stores its `tyre_movement_id` |
| R7 | `tyres.registration_source` | Replaced by `origin_receipt_lot_id` |
| R8 | `document_sequences` plus `document_number_series` | Not duplicates: configuration vs counters |
| R9 | `outsource_employee_skills` vs `employee_skills` | Keep separate for foreign-key integrity |
| R10 | `reason_usages` could be an array | Keep as a table to allow FK and query by usage |

## 12. Tables associated with no screen or workflow (infrastructure only)

`role_capabilities`, `master_entity_registry`, `approval_routes`, `document_sequences`, `document_number_series`, `application_settings`, `admin_action_log`, `user_depot_access`, `import_batches`, `tyre_detail_columns` (screen but no consumer), `routes` and `folio_stock_params` (consumed but without a maintaining screen).
None is removed. `user_depot_access` and `import_batches` are dormant until needed.

## 13. Missing relationships found (9)

| # | Gap | Fix |
|---|---|---|
| M1 | Tyres were not tied to an origin | `tyres.origin_receipt_lot_id` → `central_store_receipt_lots` |
| M2 | Allocation by quantity cannot say **which tyres** | `allocation_request_tyres` |
| M3 | Depot GRN had no link to an allocation | `grns.allocation_request_id`, `grn_lines.allocation_request_tyre_id` |
| M4 | No route history per fleet | `fleet_route_assignments` |
| M5 | Ownership history absent | `tyre_ownership_history` |
| M6 | Corrected tyre numbers could not be found by their old value | `tyre_identity_corrections` + alias view |
| M7 | Vendor link missing from receipts | `central_store_receipts.vendor_id` |
| M8 | Depot hub grouping seen in the prototype (28 depots under 5 hub depots) has no home | `depots.hub_org_unit_id` (optional, UQ-46) |
| M9 | Tools & Equipment register absent | `depot_tools_equipment` |

## 14. Missing constraints (14)

1. `tyres.origin_receipt_lot_id NOT NULL`.
2. Unique `(make_id, makers_no)` where `makers_no` is not null.
3. Child/parent depot consistency (`job_tasks.org_unit_id = job_cards.org_unit_id`, same for lines): composite foreign keys on `(id, org_unit_id)`.
4. All depot-owned tables reference `depots(id)`, not just `org_units`.
5. One open allocation per tyre (partial unique index).
6. Terminal states: no transition out of `APPROVED`, `REJECTED`, `WITHDRAWN` on `master_change_requests` (trigger).
7. `proposed_payload` immutable once `PENDING_APPROVAL` (trigger).
8. `withdrawn_by` = `maker_id` unless `withdrawn_via = 'ADMIN'`; remarks required.
9. `employees.employee_code` immutable and matching the Employee-ID regex.
10. HO and AM employees have no depot; others have one (check).
11. A posted `central_store_receipts` row cannot be updated.
12. Allocated quantity equals the number of `allocation_request_tyres` for each depot line.
13. Document numbers unique per series; supplied values rejected by trigger.
14. Check `demo_today` is a valid date and only the service role can change it.

## 15. Missing indexes (18)

`tyres(owner_org_unit_id)`, `tyres(origin_receipt_lot_id)`, partial unique `tyres(make_id, makers_no)`, `tyre_current_state(location_type, location_org_unit_id)`, `tyre_movements(tyre_id, occurred_at desc)`, `tyre_movements(doc_type, doc_id)`, `tyre_ownership_history(tyre_id, effective_at desc)`, `allocation_request_tyres(request_id)`, partial unique on open `allocation_request_tyres(tyre_id)`, `central_store_receipt_lots(receipt_id)`, `grn_lines(allocation_request_tyre_id)`, `job_tasks(assigned_employee_id, status, due_date)`, `job_cards(org_unit_id, status, due_date)`, `schedule_instances(org_unit_id, due_date, status)`, `master_change_requests(status, submitted_at)`, partial unique `master_change_requests(entity_type, target_id) where status in (DRAFT, PENDING_APPROVAL)`, `document_status_history(entity_type, entity_id, seq)`, `audit_logs(table_name, record_id)` with BRIN on `at`.

## 16. Tables requiring separate historical tracking

| Need | Mechanism | Tables |
|---|---|---|
| Never overwrite events | append-only | `tyre_movements`, `tyre_ownership_history`, `tyre_identity_corrections`, `stock_ledger`, `fleet_status_history`, `fleet_depot_history`, `fleet_air_type_changes`, `fleet_route_assignments`, `odometer_readings`, `job_assignments`, `job_holds`, `attendance_records`, `audit_logs`, `document_status_history`, `master_change_request_history`, `admin_action_log` |
| Proposal then approval | revisions | `fleet_group_revisions`, `duty_rosters`, `master_change_requests` |
| Value changes over time | effective-dated | `psi_norms`, `rotation_discout_norms`, `expected_life_km`, `norm_eligible_grades` |
| Master edits | change-request trail + `row_version` | all MST tables |
| Posted business documents | immutable after posting; corrections by new documents | `central_store_receipts` and lots, GIN/GRN once received, premature-failure reports |

## 17. Conclusion
No table is redundant enough to drop; two are merged, two circular links removed, eleven added. The schema now matches the prototype more closely (allocation by tyre, tools & equipment, route history, ownership) and your decisions (Central Store origin, depot subtype, numbering, admin audit).
