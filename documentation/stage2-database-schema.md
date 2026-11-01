# Stage 2 — Database Schema (design only — nothing has been created in Supabase)

> **Stage 2.1 amendments — read these first.** This document is still the column-level reference, but the following changes (full detail in `stage2.1-final-architecture-review.md` §9, `stage2.1-table-justification.md`, `stage2.1-central-store-tyre-creation.md`, `stage2.1-document-numbering.md`) override it. The schema is consolidated into one version when the migrations are written in Stage 3.
>
> **Net: 127 − 2 + 11 = 136 tables; 27 master entity types.**
> - **Added (11):** `depots` (subtype of `org_units`, 1:1; `is_mock_code`, optional `hub_org_unit_id`), `central_store_receipts`, `central_store_receipt_lots`, `tyre_number_series` (master), `allocation_request_tyres`, `tyre_ownership_history`, `tyre_identity_corrections`, `depot_tools_equipment`, `fleet_route_assignments`, `document_number_series`, `admin_action_log`.
> - **Merged (2):** `mrns`, `mrn_lines` → `grns`, `grn_lines` with `grn_kind` (`GRN`, `MRN`).
> - **Changed:** `tyres` — `origin_receipt_lot_id` NOT NULL, `registration_source` removed; `tyre_location` gains `CENTRAL_STORE`; `movement_type` gains `ALLOCATE`, `RELEASE_ALLOCATION`; `allocation_status` = `PENDING_APPROVAL`, `APPROVED`, `RETURNED`, `WITHDRAWN`; `master_change_requests` gains `withdrawn_by`, `withdrawn_via`, immutability and terminal-state triggers; `profiles` gains `must_change_password`; `employees` gains `is_demo`, code regex + immutability, and references `depots`; `application_settings` gains `demo_mode`, `demo_today`; `grns` gains allocation links.
> - **Removed columns/links:** `complaints.job_card_id`, `wsrs.issued_gin_id`, `removal_orders.received_grn_id`.
> - **Every depot-owned table references `depots(id)`** (not just `org_units`), with composite depot-consistency foreign keys between documents and their lines.
> - **§14 (document-number formats) is superseded** by `stage2.1-document-numbering.md`; the formats listed there for Purchase Indent (`PI-{YYYY}-{NNNN}`) and others were assumptions and are replaced by the catalogue built from the prototype. `MCR-…` is a working internal reference only.
> - Depot codes are **mock** and configurable.

Supersedes `database-design.md`. PostgreSQL 15+ on Supabase. **No migration has been written or applied.** After you approve this document, Stage 3 starts with numbered SQL migrations that implement exactly this design.

---

## 1. Conventions

### 1.1 Notation
`!` = NOT NULL · `U` = unique · `→table` = foreign key (`ON DELETE RESTRICT` unless stated; nothing is cascade-deleted) · `(x)` = default · `[]` = array · `PK` = primary key.
Types: `uuid`, `text`, `int`, `smallint`, `numeric(p,s)`, `bool`, `date`, `time`, `timestamptz`, `jsonb`, `interval`. All money columns are `numeric(14,2)`.

### 1.2 Standard column bundles
| Bundle | Columns |
|---|---|
| **STD** | `id uuid PK (gen_random_uuid())`, `created_at timestamptz! (now())`, `updated_at timestamptz! (now(), set by trigger)`, `created_by uuid →profiles`, `updated_by uuid →profiles` |
| **MST** (master) | STD + `status master_status! ('ACTIVE')`, `row_version int! (1)`, `deactivated_at timestamptz`, `deactivated_by uuid →profiles`. **Not writable by clients**; written only by approval apply-functions |
| **DEP** (depot-owned) | STD + `org_unit_id uuid! →org_units` (owning depot; must be a `DEPOT`) |
| **APPEND** | `id`, `created_at`, `created_by` only. `UPDATE`/`DELETE` blocked by trigger and no policy |

Every foreign-key column has a b-tree index (not repeated below). Additional indexes are listed per table.

### 1.3 Approval-linked masters
Each MST table has a row in `master_entity_registry`. The live row changes only through the apply function; proposals live in `master_change_requests`.

### 1.4 Reference-value pattern
Small editable lists use `ref_values(lookup_type, code, label)`. A referencing column is `<name>_ref uuid →ref_values`, and a trigger `app.assert_ref_type(column, lookup_type)` rejects rows of the wrong list. Fixed system sets are native enums.

## 2. Enumerated types

| Type | Values |
|---|---|
| `master_status` | ACTIVE, INACTIVE |
| `master_request_status` | DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, WITHDRAWN |
| `master_action` | CREATE, UPDATE, DEACTIVATE, REACTIVATE |
| `role_code` | HO, AM, SUP, TIC, TM |
| `org_unit_type` | DEPOT, TRS, CENTRAL_STORE, MIC_VEHICLE_UNIT |
| `doc_approval_status` | DRAFT, PENDING_APPROVAL, APPROVED, RETURNED, WITHDRAWN, SUPERSEDED |
| `work_category` | AIR_INFLATION, AIR_INFLATION_NITROGEN, INSPECTION, TYRE_ROTATION, TYRE_DISCOUT, CENSUS, TYRE_CHANGING, TYRE_REMOVAL, TYRE_FITMENT, TYRE_SETTING, TYRE_UNSETTING |
| `job_source` | SCHEDULED, COMPLAINT, REACTIVE |
| `job_card_status` | NOT_ASSIGNED, ASSIGNED, IN_PROGRESS, ON_HOLD, AWAITING_WSR, AWAITING_FINAL_INSPECTION, REWORK, CLOSED, CANCELLED |
| `task_status` | NOT_ASSIGNED, ASSIGNED, IN_PROGRESS, ON_HOLD, AWAITING_WSR, SUBMITTED, COMPLETED, REWORK, CANCELLED |
| `fleet_availability` | IN_DEPOT, OUT, BREAKDOWN, HELD_UP |
| `fleet_operating_status` | OPERATION, BREAKDOWN, DEPOT_MAINTENANCE, EXTERNAL_MAINTENANCE, SPARE, DEPOT_WORKSHOP, LOAN |
| `air_type` | REGULAR, NITROGEN |
| `tyre_grade` | NEW, A, B, C |
| `tyre_location` | FITTED, LIVE_STOCK, READY_FOR_TRANSIT, IN_TRANSIT, AT_TRS, AT_MIC, AT_OTHER_DEPOT, SCRAPPED |
| `setting_status` | SET, UNSET, NOT_APPLICABLE |
| `stock_class` | GOOD, REPAIR |
| `trs_state` | IDLE, IN_PRODUCTION, UNFIT, CONDEMN |
| `item_condition` | NEW, SERVICED, INJURED |
| `accessory_kind` | TUBE, FLAP, DISC |
| `tyre_position` | FR, FL, RRI, RRO, RLI, RLO (extensible via fleet axle layout text) |
| `movement_type` | RECEIPT, FITMENT, REMOVAL, ROTATION, DISCOUT, SET, UNSET, ISSUE_OUT, RECEIVE_IN, SEND_TO_TRS, RECEIVE_FROM_TRS, SEND_TO_MIC, RETURN_FROM_MIC, GRADE_CHANGE, RESERVE, RELEASE, SCRAP, CORRECTION |
| `indent_status` | DRAFT, AWAITING_APPROVAL, REVERTED, REJECTED, SENT, ACCEPTED, IN_TRANSIT, PARTLY_ISSUED, ISSUED, PARTLY_RECEIVED, RECEIVED, CANCELLED, CLOSED |
| `gin_status` | DRAFT, CREATED, AWAITING_APPROVAL, REVERTED, APPROVED, REJECTED, IN_TRANSIT, RECEIVED, CANCELLED |
| `gate_pass_status` | ISSUED, EXITED, RECEIVED, CANCELLED |
| `grn_status` | READY_TO_RECEIVE, RECEIVED |
| `wsr_status` | REQUESTED, PARTLY_ISSUED, ISSUED, REJECTED, CANCELLED |
| `complaint_status` | NEW, ASSIGNED, CLOSED, REJECTED |
| `complaint_source` | AIR_INFLATION, INSPECTION, LOG_SHEET, TYRE_IC |
| `pi_status` | DRAFT, PENDING_APPROVAL, REVERTED, ISSUED |
| `allocation_status` | REQUESTED, APPROVED, REJECTED |
| `airtype_status` | WITH_HO, WITH_AM, APPROVED, REJECTED, RETURNED |
| `drn_status` | DRAFT, PENDING, APPROVED, REJECTED *(transitions UNRESOLVED, UQ-01)* |
| `pfr_status` | REQUEST_SENT_TO_DEPOT, REPORT_RAISED, PENDING_TRS_IC, SENT_TO_TRS, SENT_TO_DEPOT, RETURNED *(UQ-05)* |
| `damage_status` | PENDING_APPROVAL, APPROVED, RETURNED, REPORT_RECEIVED *(UQ-02)* |
| `request_status_generic` | PENDING_APPROVAL, APPROVED, REJECTED, CANCELLED *(shift change, leave, prepone/postpone; UQ-03/04)* |
| `inspection_result` | PASS, FAIL |
| `response_type` | YES_NO, PASS_FAIL, NUMERIC, TEXT, DROPDOWN |
| `psi_position_class` | FRONT, REAR_OUTER, REAR_INNER |
| `schedule_frequency_kind` | DATE_BASED, KM_BASED, DATE_AND_KM_BASED |
| `km_basis` | SCHEDULED_KM, DEAD_KM, OPERATED_KM, GROSS_KM, LIVE_ODO_KM |
| `notification_category` | APPROVALS, JOB_CARDS, COMPLAINTS, INDENTS, MOVEMENTS, SYSTEM |

---

## 3. Identity, access and organisation

| Table | Columns | Keys / indexes / notes |
|---|---|---|
| `roles` | `code role_code PK`, `label text!`, `description text`, `is_depot_scoped bool!` | Five rows. |
| `role_capabilities` | `role_code →roles!`, `capability text!`, `is_enabled bool! (true)`, `is_resolved bool! (true)`, `note text` | PK(role_code, capability). `is_resolved=false` marks an open business question. |
| `org_units` (MST) | `code text! U`, `name text! U`, `unit_type org_unit_type!`, `short_name text`, `address_text text`, `sort_order int` | Index (unit_type, status). 33 `DEPOT` + 2 `TRS` + 1 `CENTRAL_STORE` + 1 `MIC_VEHICLE_UNIT`. View `v_depots`. |
| `employees` (MST) | `employee_code text! U` (e.g. TIC-1147), `full_name text!`, `role_code →roles!`, `org_unit_id →org_units` (DEPOT; null only for HO/AM), `designation_label text`, `phone_demo text`, `experience_years numeric(4,1)`, `date_of_joining date`, `is_login_enabled bool! (false)` | Check: role_code IN (HO,AM) ⇔ org_unit_id IS NULL. Trigger: org_unit must be `DEPOT`. Indexes (org_unit_id, role_code), (full_name). Tyre Man Register screen reads this. |
| `profiles` | `id uuid PK →auth.users`, `employee_id uuid! U →employees`, `preferred_language text! ('en')` CHECK in (en, ta), `is_active bool! (true)`, `last_login_at timestamptz`, `created_at`, `updated_at` | **No role or depot column** — access always derives from `employees`. Client may update only `preferred_language` (column privilege). Created only by the provisioning script. |
| `user_depot_access` | `profile_id →profiles!`, `org_unit_id →org_units!`, `granted_by →profiles`, `granted_at timestamptz!` | PK both. Empty by default (UQ-18). |
| `skills` (MST) | `code text! U`, `name text! U` | 7 rows (Air Inflation, Tyre Rotation, Wheel Balancing, Tyre Fitment, Nail Removal, Retreading, Wheel Alignment). |
| `employee_skills` | `employee_id →employees!`, `skill_id →skills!`, `status text! ('ACTIVE')` CHECK in (ACTIVE, REMOVED), `granted_at timestamptz!`, `granted_via_request_id →skill_requests`, `removed_at timestamptz` | PK(employee_id, skill_id). Written only by the skill approval function. |
| `outsource_employees` (DEP) | `ose_code text! U` (OSE-001), `full_name text!`, `phone_demo text!`, `aadhaar_last4 char(4)`, `work_order_type text!` CHECK in (THROUGH_CONTRACTOR, DIRECT), `vendor_id →vendors` (required when THROUGH_CONTRACTOR), `address_text text!`, `qualification_ref →ref_values`, `status text! ('ACTIVE')` CHECK in (ACTIVE, INACTIVE), `removal_reason text`, `removed_at timestamptz`, `removed_by →profiles` | Check: INACTIVE ⇒ removal_reason not blank. Full Aadhaar is **never stored** (UQ-29). Contractor identity comes from Vendor Master (category MANPOWER_CONTRACTOR). |
| `outsource_employee_skills` | `ose_id →outsource_employees!`, `skill_id →skills!` | PK both. |

### Helper views / functions (schema `app`, not exposed to the API)
`app.current_employee_id()`, `app.current_role()`, `app.current_depot_id()`, `app.visible_depot_ids()`, `app.has_capability(text)` — all `STABLE SECURITY DEFINER`, `search_path = ''`.

---

## 4. Reference and master data (all HO-managed, AM-approved)

| Table | Columns | Keys / indexes / notes |
|---|---|---|
| `ref_values` (MST) | `lookup_type text!`, `code text!`, `label text!`, `sort_order int` | U(lookup_type, code). Lookup types: BUS_MODEL_TYPE (BSIV, BS-III, Low Floor, AC, Deluxe), VEHICLE_TYPE (Mofussil, Town, Ghat, Suburban), AXLE_TYPE, PRODUCT_GROUP (Tyre, Tube, Flap, Disc), PRODUCT_CATEGORY (Spares, Accessory), UOM (Nos), CONSTRUCTION_TYPE (Radial, Nylon), TUBE_TYPE (Tube, Tubeless), FLEET_CLASS (Small, Standard, Low Floor), COMPLAINT_CATEGORY, QUALIFICATION, VENDOR_CATEGORY, REMOVAL_REASON, FAULT_ON, DAMAGE_TYPE. |
| `tyre_sizes` (MST) | `size_code text! U` (7.50 X 16), `rim_inches numeric(4,1)`, `display_label text` | 7 sizes + 8.25 X 16 in prototype. |
| `tyre_makes` (MST) | `name text! U` | Apollo, Birla, Bridgestone, CEAT, JK, Michelin, MRF, TOLINS. |
| `tyre_models` (MST) | `make_id →tyre_makes!`, `model_name text!` | U(make_id, model_name). |
| `tyre_folios` (MST) | `folio_no text! U` (F7001), `folio_name text!`, `specification text`, `make_id →tyre_makes`, `model_id →tyre_models`, `construction_type_ref →ref_values`, `tube_type_ref →ref_values`, `ply smallint`, `tyre_size_id →tyre_sizes`, `product_group_ref →ref_values!`, `category_ref →ref_values`, `uom_ref →ref_values!`, `hsn_code text`, `has_expiry bool!`, `is_recondition bool!` | Indexes (product_group_ref, tyre_size_id), trigram on folio_name. Covers tyres, tubes, flaps, discs (product group). |
| `tyre_folio_locations` | `folio_id →tyre_folios!`, `location_type org_unit_type!` | PK both. Carried in the folio change request. |
| `tyre_detail_columns` (MST) | `column_code text! U`, `column_name text!`, `description text`, `integration text`, `module text`, `module_master text`, `input_field_type text`, `is_required bool!` | Tyre Detailed Master. |
| `vendors` (MST) | `vendor_code text! U`, `vendor_name text!`, `vendor_category_ref →ref_values!`, `contact_person text`, `address_text text`, `city text`, `state text`, `pincode text`, `phone_demo text`, `email_demo text`, `gstin text` (CHECK 15-char shape), `is_demo bool! (true)` | Created date = `created_at`. Index (vendor_category_ref, status), trigram on vendor_name. See §4.1. |
| `vendor_contacts` | `vendor_id →vendors!`, `contact_name text!`, `designation text`, `phone_demo text`, `email_demo text`, `is_primary bool!` | Partial U(vendor_id) where is_primary. Carried in the vendor change request. |
| `fleet_types` (MST) | `fleet_make text!`, `fleet_model text!`, `fleet_class_ref →ref_values!` | U(fleet_make, fleet_model). |
| `fleet_type_tyre_sizes` | `fleet_type_id →fleet_types!`, `tyre_size_id →tyre_sizes!` | PK both. |
| `routes` (MST) | `route_no text! U`, `route_name text` | Referenced by operational state and tyre route usage. |
| `fleets` (MST) | `fleet_no text! U` (J0264), `registration_no text! U` (TN-01-N-0264), `chassis_no text U`, `purchase_date date`, `org_unit_id →org_units!` (home depot, DEPOT), `fleet_type_id →fleet_types!`, `bus_model_type_ref →ref_values`, `vehicle_type_ref →ref_values`, `axle_type_ref →ref_values`, `oem_tyre_size_id →tyre_sizes`, `position_layout text[]! ('{FR,FL,RRI,RRO,RLI,RLO}')` | Index (org_unit_id, status). Master attributes only. A fleet changing depot is a master change and also writes `fleet_depot_history`. |
| `fleet_depot_history` | APPEND + `fleet_id →fleets!`, `from_org_unit_id`, `to_org_unit_id!`, `effective_from date!`, `change_request_id →master_change_requests` | Keeps history of transfers between depots. |
| `tyres` (identity; changes only by receipt functions or approved correction) | STD + `tyre_no text! U` (MTC no), `makers_no text`, `folio_id →tyre_folios!`, `vendor_id →vendors`, `owner_org_unit_id →org_units!`, `purchase_date date`, `manufactured_date date`, `received_date date`, `warranty_upto date`, `registration_source text!` CHECK in (GRN, OPENING_STOCK, CORRECTION), `row_version int!`, `status master_status!` | Indexes (owner_org_unit_id), (folio_id), (makers_no). Never deleted. |
| `folio_stock_params` (MST) | `org_unit_id →org_units!`, `folio_id →tyre_folios!`, `min_stock int!`, `max_stock int!`, `class_abc char(1)` | U(org_unit_id, folio_id). Check max ≥ min. |
| `maintenance_jobs` (MST) | `job_code text! U` (JOB-001), `job_name text!`, `work_category work_category!`, `fleet_type_id →fleet_types` (null = all), `est_minutes_per_fleet int`, `est_minutes_per_tyre int` | Index (work_category). JOB-007 reserved, not created (UQ-27). |
| `maintenance_job_skills` | `job_id →maintenance_jobs!`, `skill_id →skills!` | PK both. |
| `maintenance_schedules` (MST) | `schedule_code text! U` (SCH001), `schedule_name text!`, `work_category work_category!`, `category_label text`, `frequency_kind schedule_frequency_kind!`, `every_n_days int`, `uses_working_days bool!`, `particular_days_of_month int[]`, `km_basis km_basis`, `every_km int`, `frequency_detail text`, `job_id →maintenance_jobs`, `work_order_based bool!`, `outsource_employee_based bool!`, `due_days_after_assignment int`, `checklist_based bool!`, `effective_from date!` | Checks tie fields to `frequency_kind`. |
| `schedule_categories` | `schedule_id →maintenance_schedules!`, `seq smallint!`, `category_name text!`, `group_based bool!`, `checkpoint_based bool!`, `checklist_based bool!`, `description_based bool!`, `job_mapping_based bool!`, `description_label text`, `description_mandatory bool`, `allow_multiple_entries bool` | U(schedule_id, seq); seq 1–30. |
| `schedule_group_rules` | `category_id →schedule_categories!`, `folio_id →tyre_folios!`, `rule_type text!` CHECK in (REPLACE_AT, INSPECT_AT, SERVICE_AT), `km_value int!` (≥1) | Only ACTIVE folios (trigger). |
| `schedule_checkpoints` | `category_id →`, `seq smallint!` (1–50), `checkpoint_name text!`, `response_type response_type!`, `description_required bool`, `is_mandatory bool`, `remarks_required bool`, `failure_action text` | |
| `schedule_checklist_items` | `category_id →`, `seq`, `item_text text!`, `response_type`, `is_required bool`, `qc_checklist_id →qc_checklists` | Either inline items or a link to an existing QC checklist. |
| `schedule_job_map` | `category_id →`, `job_id →maintenance_jobs!`, `is_mandatory bool!` | Only ACTIVE jobs. |
| `psi_norms` (MST) | `tyre_size_id →tyre_sizes!`, `construction_type_ref →ref_values!`, `position_class psi_position_class!`, `regular_psi int!`, `nitrogen_psi int!`, `effective_from date!`, `effective_to date` | U(size, construction, position_class, effective_from); no overlapping ranges (exclusion constraint). |
| `rotation_discout_norms` (MST) | `norm_type text!` CHECK in (ROTATION, DISCOUT), `operated_days int!`, `operated_km int!`, `effective_from date!`, `effective_to date` | Exclusion constraint on overlapping ranges per type. |
| `norm_eligible_grades` | `norm_id →rotation_discout_norms!`, `grade tyre_grade!` | PK both. Front-tyre eligible grades. Carried in the norm request. |
| `expected_life_km` (MST) | `tyre_size_id →tyre_sizes!`, `new_km int!`, `rt1_km int!`, `rt2_km int!`, `rt3_km int!`, `rt4_km int!`, `rt5_km int!`, `effective_from date!`, `effective_to date` | All six values required (prototype). Effective-dated so past premature-failure norms remain reproducible. |
| `shifts` (MST) | `shift_code text! U`, `label text!`, `short_label text!` (AM, GEN, PM, NIGHT), `start_time time!`, `end_time time!` | Morning/AM, General, Evening/PM, Night (UQ-26). |
| `complaint_types` (MST) | `complaint_code text! U`, `complaint_name text!`, `category_ref →ref_values` | ~67 prototype rows. |
| `complaint_type_jobs` | `complaint_type_id →`, `job_id →maintenance_jobs!` | PK both. Rows absent = "Not linked". |
| `reasons` (MST) | `reason_code text! U` (RSN-), `reason_text text!`, `pauses_schedule bool!` | |
| `reason_usages` | `reason_id →reasons!`, `usage text!` CHECK in (HOLD, RESCHEDULE, REPLACE, MISSED, SEND_BACK) | PK both. |
| `reason_suggestions` (DEP) | `suggestion_no text! U`, `reason_text text!`, `used_for text[]!`, `status text!` CHECK in (NEW, ADDED, REJECTED), `decided_by`, `decision_remarks`, `master_request_id →master_change_requests` | Depot → HO feed (operational record, not master). |
| `reject_reasons` (MST) | `reason_code text! U`, `reason_text text!`, `context text!` CHECK in (GRN, DRN, BOTH) | |
| `wear_patterns` (MST) | `pattern_code text! U`, `pattern_name text! U` | 8–10 rows. |
| `qc_checklists` (MST) | `qc_code text! U`, `work_category work_category!`, `title text`, `checklist_version int!` | One ACTIVE checklist per work_category (partial unique index). 11 categories. |
| `qc_checklist_items` | `checklist_id →qc_checklists!`, `seq smallint!`, `item_text text!`, `response_type response_type! (YES_NO)`, `is_required bool!` | U(checklist_id, seq). |

### 4.1 Vendor Master — fields and relationships
Fields: **code** `vendor_code`, **name**, **category** (ref list: Tyre supplier, Tube/flap/disc supplier, Retreader, Manpower contractor, Service provider), **contact person** (+ `vendor_contacts`), **address, city, state, pincode**, **contact details** (phone, email — fictional), **GSTIN** (15-character shape, demo values), **status** (ACTIVE/INACTIVE), **created date**. Fictional vendors only.

| Related table | Link | Purpose |
|---|---|---|
| `tyres.vendor_id` | supplier of the tyre | procurement traceability |
| `purchase_indent_lines.suggested_vendor_id` | optional | procurement |
| `retread_batches.vendor_id` | external retreader (null for MTC's own TRS units) | retreading |
| `drns.vendor_id` | warranty / discrepancy counterparty | claims |
| `premature_failure_reports.vendor_id` | manufacturer / supplier for claim | quality reporting |
| `outsource_employees.vendor_id` | manpower contractor | workforce |
| `gins.vendor_id` / `grns.vendor_id` | supplier for direct receipts from vendor | receipts |

Whether a full purchase-order module exists is **not in the prototype**; Purchase Indent grid columns "Pending PO / Prev PO No" imply POs elsewhere (UQ-28).

---

## 5. Approval engine

| Table | Columns | Keys / indexes / notes |
|---|---|---|
| `master_entity_registry` | `entity_type text PK`, `label text!`, `target_table text!`, `key_columns text[]!`, `child_tables text[]`, `apply_function text!`, `validate_function text!`, `is_depot_scoped bool!`, `is_enabled bool!` | 27 rows after Stage 2.1 (see approval doc). |
| `master_change_requests` | STD + `request_no text! U` (MCR-2026-000123), `entity_type →master_entity_registry!`, `target_id uuid!` (existing id, or reserved id for CREATE), `action master_action!`, `status master_request_status! ('DRAFT')`, `proposed_payload jsonb!`, `base_snapshot jsonb`, `base_row_version int`, `change_summary text`, `maker_id →profiles!`, `submitted_at timestamptz`, `checker_id →profiles`, `decided_at timestamptz`, `decision_remarks text`, `applied_at timestamptz`, `supersedes_request_id →master_change_requests` | Checks: status=REJECTED/WITHDRAWN ⇒ decision_remarks not blank; maker_id ≠ checker_id; decided/applied rules per status. **Partial unique index** (entity_type, target_id) WHERE status IN (DRAFT, PENDING_APPROVAL). Indexes (status, submitted_at), (maker_id), GIN on proposed_payload (optional). |
| `master_change_request_history` | APPEND + `request_id →master_change_requests!`, `seq int!`, `from_status`, `to_status!`, `action text!`, `actor_id →profiles!`, `actor_role role_code!`, `remarks text`, `at timestamptz!` | U(request_id, seq). Remarks required for REJECT/WITHDRAW rows. |
| `approval_routes` | `workflow_code text!`, `step_no smallint!`, `from_status text!`, `action text!`, `to_status text!`, `approver_role role_code` (null = UNRESOLVED), `scope text!` CHECK in (SAME_DEPOT, ALL_DEPOTS, SUPPLIER_DEPOT), `remarks_required bool!`, `allow_self bool! (false)`, `is_resolved bool!`, `question_ref text` | PK(workflow_code, step_no, from_status, action). Seed from the workflow register. |
| `document_status_history` | APPEND + `entity_type text!`, `entity_id uuid!`, `org_unit_id →org_units`, `seq int!`, `from_status text`, `to_status text!`, `action text!`, `actor_id →profiles!`, `actor_role role_code!`, `remarks text`, `at timestamptz!` | Index (entity_type, entity_id, seq). Feeds the "When / Who / Action / Comment" tables and Audit Trail modals. |
| `v_master_approval_queue`, `v_operational_approval_queue` | views | Queue counts for sidebar badges. |

---

## 6. Tyre inventory, movement and history (nothing is overwritten)

| Table | Columns | Keys / indexes / notes |
|---|---|---|
| `tyre_current_state` | `tyre_id →tyres PK`, `location_type tyre_location!`, `location_org_unit_id →org_units`, `fleet_id →fleets`, `position text`, `setting_status setting_status!`, `stock_class stock_class`, `grade tyre_grade!`, `condition item_condition`, `retread_level smallint! (0)` CHECK 0–5, `trs_state trs_state`, `reserved_for_task_id →job_tasks`, `fitted_at timestamptz`, `last_rotation_at`, `last_discout_at`, `new_km numeric(10,1)`, `rt1_km … rt5_km numeric(10,1)`, `running_km numeric(10,1)`, `total_km numeric(10,1)`, `last_nsd_mm numeric(4,1)`, `last_census_at timestamptz`, `last_movement_id →tyre_movements`, `state_version int!`, `updated_at` | **A projection**, not history. Updated only by `app.post_tyre_movement()`. Indexes (location_type, location_org_unit_id), (fleet_id), (grade), partial (location_type='IN_TRANSIT'). Checks: FITTED ⇒ fleet_id and position set; AT_TRS ⇒ trs_state set. Fitted days / idle days are computed in views. |
| `tyre_movements` (APPEND) | `tyre_id →tyres!`, `movement_type movement_type!`, `occurred_at timestamptz!`, `from_location tyre_location`, `to_location tyre_location`, `from_org_unit_id`, `to_org_unit_id`, `from_fleet_id`, `to_fleet_id`, `from_position text`, `to_position text`, `grade_before tyre_grade`, `grade_after tyre_grade`, `retread_level_after smallint`, `odometer_km numeric(10,1)`, `doc_type text`, `doc_id uuid`, `doc_no text`, `task_id →job_tasks`, `remarks text`, `recorded_by →profiles!`, `org_unit_id →org_units` (depot of record) | **Append-only** (trigger raises on UPDATE/DELETE). Indexes (tyre_id, occurred_at DESC), (doc_type, doc_id), (org_unit_id, occurred_at). This is the tyre's full life: fitments, rotations, TRS trips, transfers. Corrections add a CORRECTION row; they never edit old rows. |
| `tyre_fitment_history` | STD + `tyre_id →tyres!`, `fleet_id →fleets!`, `position text!`, `fitted_at timestamptz!`, `removed_at timestamptz`, `fitted_odometer_km`, `removed_odometer_km`, `fitment_order_id →fitment_orders`, `removal_order_id →removal_orders`, `route_id →routes`, `km_run numeric(10,1)`, `days_stopped int`, `days_running int`, `running_days_km numeric(10,1)`, `dead_km numeric(10,1)`, `removal_reason_ref →ref_values` | One row per span on a fleet. Closed (removed_at set) by removal; later spans are new rows. Exclusion constraint: one open span per tyre. |
| `tyre_retread_stages` | STD + `tyre_id →tyres!`, `retread_no smallint!`, `batch_id →retread_batches`, `stage_label text`, `thread_rubber text`, `bonding_gum text`, `vc_patch text`, `vc_count smallint`, `trs_census text`, `rt_date date`, `recommended_position text`, `achieved_km numeric(10,1)`, `total_km numeric(10,1)`, `trs_remarks text` | TLDC "Retread stages" table. |
| `tyre_repairs` | STD + `tyre_id →tyres!`, `repaired_on date!`, `position text`, `cause text`, `repair_action text`, `odometer_km numeric(10,1)`, `repaired_by →employees`, `remarks text` | |
| `tyre_route_usage` | STD + `tyre_id →tyres!`, `route_id →routes!`, `fleet_id →fleets`, `position text`, `trips int`, `km_driven numeric(10,1)`, `first_driven date`, `last_driven date` | |
| `accessory_items` | STD + `accessory_kind accessory_kind!`, `accessory_no text!`, `folio_id →tyre_folios!`, `size_label text`, `rim_inches numeric(4,1)`, `make_id →tyre_makes`, `owner_org_unit_id →org_units!`, `location_org_unit_id →org_units`, `condition item_condition!`, `stock_class stock_class!`, `setting_status setting_status`, `status text!` CHECK in (IN_STOCK, ISSUED, FITTED, IN_TRANSIT, SCRAPPED), `tyre_id →tyres`, `fleet_id →fleets`, `position text`, `received_at timestamptz` | U(accessory_kind, accessory_no). Tube / flap / disc units; dashboard counts per size. |
| `stock_ledger` (APPEND) | `org_unit_id →org_units!`, `folio_id →tyre_folios!`, `item_kind text!` CHECK in (TYRE, TUBE, FLAP, DISC), `tyre_id →tyres`, `accessory_id →accessory_items`, `posted_at timestamptz!`, `doc_type text!` (ICRN, GIN, GRN, WSR, MRN, SRN, OPENING), `doc_id uuid!`, `doc_no text!`, `direction text!` CHECK in (INWARD, OUTWARD), `inward_qty numeric(10,2)`, `outward_qty numeric(10,2)`, `balance_after numeric(12,2)!`, `unit_rate numeric(14,2)`, `remarks text`, `posted_by →profiles` | Folio × unit quantity ledger shown on Ledger and Folio Stock Details screens. Balance computed under a row lock per (org_unit, folio). Weighted average rate computed from inward rows in views. Indexes (org_unit_id, folio_id, posted_at). |
| `retread_batches` (DEP) | `batch_no text! U`, `trs_org_unit_id →org_units!` (TRS), `vendor_id →vendors`, `dispatch_gin_id →gins`, `return_grn_id →grns`, `status text!` CHECK in (OPEN, IN_PRODUCTION, RETURNED, CLOSED), `sent_at`, `returned_at` | `org_unit_id` = dispatching depot. |
| `retread_batch_tyres` | `batch_id →retread_batches!`, `tyre_id →tyres!`, `trs_state trs_state`, `outcome text` CHECK in (PENDING, RETREADED, UNFIT, CONDEMNED), `result_grade tyre_grade`, `retread_level_after smallint`, `remarks text` | PK(batch_id, tyre_id). |
| `v_tyre_ledger_and_movement`, `v_tyre_tldc`, `v_live_stock_summary`, `v_tyre_register_detail`, `v_folio_stock` | views | Drawer tables, summaries, detailed 40-column register, weighted-average value. |

**Tyre movement rule:** a tyre moving between fleets, depots, stores, TRS or MIC is one `tyre_movements` row (and, where inventory documents are involved, `stock_ledger` rows). `tyre_current_state` is rebuilt from movements if ever needed (`app.rebuild_tyre_state(tyre_id)`), proving that history is the source of truth.

---

## 7. Fleet operations

| Table | Columns | Keys / indexes / notes |
|---|---|---|
| `fleet_operational_state` | `fleet_id →fleets PK`, `operating_status fleet_operating_status!`, `availability fleet_availability!`, `held_up_reason text`, `air_type air_type! ('REGULAR')`, `live_odometer_km numeric(10,1)`, `scheduled_km numeric(10,1)`, `dead_km numeric(10,1)`, `gross_km numeric(10,1)`, `current_route_id →routes`, `fc_valid_until date`, `hfc_due_date date`, `updated_by`, `updated_at` | Operational attributes that change daily and therefore are **not** master data. Check: availability=HELD_UP ⇒ held_up_reason not blank. |
| `fleet_status_history` (APPEND) | `fleet_id →fleets!`, `from_status`, `to_status!`, `availability`, `reason text`, `changed_by →profiles!`, `at` | |
| `odometer_readings` (APPEND) | `fleet_id →fleets!`, `reading_km numeric(10,1)!`, `read_at timestamptz!`, `source text!`, `task_id →job_tasks` | |
| `fleet_air_type_requests` (DEP) | `request_no text! U`, `to_air_type air_type!`, `reason text!`, `status airtype_status! ('WITH_HO')`, `ho_decided_by`, `ho_decided_at`, `ho_remarks`, `am_decided_by`, `am_decided_at`, `am_remarks` | |
| `fleet_air_type_request_fleets` | `request_id →!`, `fleet_id →fleets!` | PK both. |
| `fleet_air_type_changes` (APPEND) | `fleet_id →fleets!`, `from_air_type`, `to_air_type!`, `effective_at`, `request_id →fleet_air_type_requests` | |

---

## 8. Scheduling, groups and complaints

| Table | Columns | Keys / indexes / notes |
|---|---|---|
| `fleet_groups` (DEP) | `schedule_id →maintenance_schedules!`, `group_name text!`, `status text! ('ACTIVE')` CHECK in (ACTIVE, INACTIVE), `current_revision_id →fleet_group_revisions` | U(org_unit_id, schedule_id, group_name). |
| `fleet_group_revisions` (DEP) | `group_id →fleet_groups!`, `revision_no int!`, `status doc_approval_status! ('DRAFT')`, `reason_for_change text!`, `board_note text`, `first_schedule_date date`, `submitted_by`, `submitted_at`, `decided_by`, `decided_at`, `decision_remarks` | U(group_id, revision_no). Partial unique: one open revision (DRAFT/PENDING) per group. Approved revision becomes `current_revision_id`; previous becomes SUPERSEDED. |
| `fleet_group_revision_members` | `revision_id →!`, `fleet_id →fleets!` | PK both. A fleet may be in only one active group per schedule (checked on approve). |
| `schedule_instances` (DEP) | `schedule_id →!`, `group_id →fleet_groups`, `fleet_id →fleets`, `due_date date!`, `due_shift_id →shifts`, `status text!` CHECK in (PLANNED, JOB_CREATED, COMPLETED, OVERDUE, SKIPPED), `job_card_id →job_cards`, `skip_reason_id →reasons` | U(schedule_id, fleet_id, due_date). Indexes (org_unit_id, due_date, status). Generated by a scheduled function. |
| `complaints` (DEP) | `complaint_no text! U` (CMPID-0505), `source complaint_source!`, `fleet_id →fleets`, `position text`, `tyre_id →tyres`, `complaint_type_id →complaint_types!`, `remarks text`, `photo_attachment_id →attachments`, `raised_by →employees!`, `raised_at timestamptz!`, `status complaint_status! ('NEW')`, `decided_by →profiles`, `decided_at`, `decision_remarks text`, `job_card_id →job_cards` | Check: status REJECTED ⇒ decision_remarks not blank. Indexes (org_unit_id, status), (fleet_id). |
| `log_sheet_complaints` (DEP) | `complaint_id →complaints! U`, `driver_name text!`, `driver_ref text`, `shift_id →shifts`, `route_id →routes`, `run_km numeric(8,1)`, `shed_in_time time`, `wheel_position text`, `driver_remarks text` | Supervisor entry. |

---

## 9. Job cards and execution

| Table | Columns | Keys / indexes / notes |
|---|---|---|
| `job_cards` (DEP) | `job_card_no text! U` (JC-6063, JC-ST-2609-20-01), `work_category work_category!`, `source job_source!`, `fleet_id →fleets` (null = "No fleet"), `complaint_id →complaints`, `schedule_instance_id →schedule_instances`, `status job_card_status! ('NOT_ASSIGNED')`, `due_date date`, `due_shift_id →shifts`, `expected_completion_date date`, `instruction text`, `availability_at_creation fleet_availability`, `cancel_reason text`, `cancelled_by`, `closed_at timestamptz` | Checks: CANCELLED ⇒ cancel_reason not blank. Indexes (org_unit_id, status, due_date), (fleet_id), (work_category). |
| `job_tasks` (DEP) | `job_task_no text! U` (JID-4021), `job_card_id →job_cards!`, `seq smallint!`, `job_id →maintenance_jobs`, `work_category work_category!`, `tyre_id →tyres`, `position text`, `depends_on_task_id →job_tasks`, `assigned_employee_id →employees`, `assigned_ose_id →outsource_employees`, `status task_status! ('NOT_ASSIGNED')`, `due_date date`, `due_shift_id →shifts`, `started_at`, `submitted_at`, `completed_at` | Check: not both assignees set. U(job_card_id, seq). **Tyre Changing chain** = 4 tasks (REMOVAL → UNSETTING → SETTING → FITMENT) with `depends_on_task_id` so Fitment cannot start before Setting completes. Indexes (assigned_employee_id, status, due_date) powers Tyre Man's "My Jobs". |
| `job_assignments` | STD + `task_id →job_tasks!`, `assignee_employee_id →employees`, `assignee_ose_id →outsource_employees`, `shift_id →shifts`, `due_date date`, `assignment_type text!` CHECK in (ASSIGN, REPLACE, ADD, RESCHEDULE), `replaced_assignment_id →job_assignments`, `reason_id →reasons`, `remarks text`, `is_current bool!`, `assigned_by →profiles!` | Full assignment history; reason required for REPLACE / RESCHEDULE. |
| `job_holds` | STD + `task_id →job_tasks!`, `reason_id →reasons!`, `remarks text`, `held_at timestamptz!`, `held_by →profiles!`, `resumed_at timestamptz`, `resumed_by →profiles` | Open hold = resumed_at null (partial unique per task). |
| `job_task_execution` | `task_id →job_tasks PK`, `removed_at timestamptz`, `odometer_km numeric(10,1)`, `nsd_at_removal_mm numeric(4,1)`, `tyre_condition text` CHECK in (WORN_BEYOND_LIMIT, CUT_DAMAGE, BURST, OTHER), `fitment_tyre_id →tyres`, `fitted_at timestamptz`, `pressure_after_fitment_psi int`, `powder_applied bool`, `entered_on_behalf_by →profiles`, `on_behalf_reason text`, `submitted_at`, `updated_at` | Check: on-behalf ⇒ reason not blank. |
| `air_inflation_readings` | STD + `task_id →!`, `tyre_id →tyres!`, `position text!`, `found_psi int!`, `inflated_psi int!`, `target_psi int!`, `is_exception bool!`, `complaint_id →complaints`, `remarks text` | `is_exception` = found < target − 15 or > target + 10 (tolerance values in `application_settings`). |
| `inspection_results` | STD + `task_id →!`, `tyre_id →tyres!`, `position text`, `result text!` CHECK in (OK, DEFECT), `complaint_id →complaints`, `remarks text` | |
| `census_readings` | STD + `task_id →!`, `tyre_id →tyres!`, `position text!`, `groove_count smallint!` CHECK in (4,5), `nsd_readings_mm numeric(4,1)[]!`, `nsd_mm numeric(4,1)!`, `wear_pattern_id →wear_patterns!`, `remarks text` | Cardinality of readings = groove_count. |
| `rotation_moves` | STD + `task_id →!`, `tyre_id →tyres!`, `move_type text!` CHECK in (ROTATION, DISCOUT), `from_position text!`, `to_position text!`, `odometer_km numeric(10,1)!` | Each move also posts a `tyre_movements` row. |
| `cirt_checklist_answers` | STD + `task_id →!`, `item_code text!`, `item_text text!`, `answer bool!`, `blocks_job bool!` | Air Inflation CIRT checklist. |
| `final_inspections` (DEP) | `job_card_id →job_cards!`, `qc_checklist_id →qc_checklists`, `checklist_version int`, `inspector_employee_id →employees!`, `result inspection_result!`, `remarks text`, `inspected_at timestamptz!` | Check: FAIL ⇒ remarks not blank. Version stored so later checklist edits do not change history. |
| `final_inspection_answers` | `inspection_id →!`, `seq smallint!`, `item_text text!`, `answer text!` | |
| `removal_orders` (DEP) | `ro_no text! U`, `task_id →job_tasks!`, `tyre_id →tyres!`, `fleet_id →fleets`, `position text`, `removed_at timestamptz!`, `goes_to text` CHECK in (LIVE_STOCK, READY_FOR_TRANSIT, DRN), `status text!` CHECK in (CREATED, RECEIVED), `received_grn_id →grns` | Created when removal completes; `goes_to` set by Tyre IC at GRN. |
| `fitment_orders` (DEP) | `fo_no text! U`, `task_id →job_tasks!`, `tyre_id →tyres!`, `fleet_id →fleets!`, `position text!`, `gin_id →gins`, `status text!` CHECK in (CREATED, FITTED, CANCELLED) | |
| `reschedule_requests` (DEP) | `task_id →job_tasks!`, `direction text!` CHECK in (PREPONE, POSTPONE), `new_date date!`, `reason text!`, `requested_by →employees!`, `status request_status_generic! ('PENDING_APPROVAL')`, `decided_by`, `decided_at`, `decision_remarks` | Approver unresolved (UQ-04). |

---

## 10. Workforce

| Table | Columns | Keys / indexes / notes |
|---|---|---|
| `duty_rosters` (DEP) | `week_start date!`, `revision_no int! (1)`, `status doc_approval_status!`, `submitted_by`, `submitted_at`, `decided_by`, `decided_at`, `decision_remarks` | U(org_unit_id, week_start, revision_no); one APPROVED per week (partial unique). |
| `duty_roster_entries` | `roster_id →!`, `employee_id →employees!`, `duty_date date!`, `entry_type text!` CHECK in (SHIFT, WEEK_OFF, LEAVE), `shift_id →shifts`, `posting_label text` | U(roster_id, employee_id, duty_date). |
| `shift_change_requests` (DEP) | `scr_no text! U` (SCR-018), `employee_id →employees!`, `from_date date!`, `to_date date!`, `to_shift_id →shifts!`, `reason text!`, `status request_status_generic!`, `decided_by`, `decided_at`, `decision_remarks` | Approver unresolved (UQ-03). |
| `leave_requests` (DEP) | `leave_no text! U`, `employee_id →!`, `leave_type text!` CHECK in (CASUAL, SICK, EARNED), `from_date`, `to_date`, `reason text!`, `status request_status_generic!`, `decided_by`, `decided_at`, `decision_remarks` | Approver unresolved (UQ-03). |
| `skill_requests` (DEP) | `request_no text! U`, `employee_id →!`, `remarks text`, `status doc_approval_status!`, `submitted_by`, `decided_by`, `decided_at`, `decision_remarks` | OA-08. |
| `skill_request_items` | `request_id →!`, `skill_id →skills!` | PK both. |
| `attendance_records` | STD + `employee_id →!`, `attendance_date date!`, `status text!` CHECK in (PRESENT, ABSENT, WEEK_OFF, LEAVE, NOT_YET_IN), `in_time time`, `out_time time`, `source text! ('HRMS_MOCK')` | U(employee_id, attendance_date). Mock HRMS feed, read-only to users. |

---

## 11. Store documents

| Table | Columns | Keys / indexes / notes |
|---|---|---|
| `indents` (DEP; owner = requesting unit) | `indent_no text! U` (IND-AD-2026-0044), `indent_type text!`, `material_type text!` CHECK in (NEW, TYRE), `request_to_org_unit_id →org_units!`, `indent_date date!`, `required_for text`, `remarks text`, `status indent_status! ('DRAFT')`, `requested_by →employees!`, `accepted_by →profiles`, `accepted_at`, `supplier_remarks text`, `close_remarks text` | Visible to requesting depot (owner) and `request_to` unit. Indexes (org_unit_id, status), (request_to_org_unit_id, status). SENT is shown to the supplier as "New". |
| `indent_lines` | `indent_id →!`, `folio_id →tyre_folios!`, `required_grade tyre_grade`, `requested_qty numeric(10,2)!`, `issued_qty numeric(10,2)! (0)`, `received_qty numeric(10,2)! (0)`, `remarks text` | |
| `gins` (DEP; owner = issuing unit) | `gin_no text! U`, `gin_type text!` CHECK in (INTERNAL_TRANSFER, TRS_DISPATCH, MIC_ISSUE, OTHER_DEPOT, WSR_ISSUE), `indent_id →indents`, `wsr_id →wsrs`, `to_org_unit_id →org_units!`, `vendor_id →vendors`, `reason text`, `status gin_status! ('DRAFT')`, `requested_by →employees`, `issued_by →employees` | Auto-created WSR-issue GIN has status CREATED and no approval. Indexes (org_unit_id, status), (to_org_unit_id, status). |
| `gin_lines` | `gin_id →!`, `folio_id →tyre_folios!`, `item_kind text!` CHECK in (TYRE, TUBE, FLAP, DISC), `tyre_id →tyres`, `accessory_id →accessory_items`, `requested_qty numeric(10,2)!`, `issued_qty numeric(10,2)!`, `unit_price numeric(14,2)`, `net_amount numeric(14,2)` (generated), `remarks text` | One of tyre_id / accessory_id for serialised items. |
| `gate_passes` (DEP) | `gp_no text! U`, `direction text!` CHECK in (OUTWARD, INWARD), `movement_kind text!` CHECK in (INTERNAL_TRANSFER_GIN_OUT, MRN_OUT, GRN_IN, CENTRAL_STORE_GIN_IN), `source_doc_type text!`, `source_doc_id uuid!`, `from_org_unit_id`, `to_org_unit_id`, `carrier_kind text!` CHECK in (VEHICLE, FLEET, EMPLOYEE, OTHER_PERSON), `vehicle_name text`, `driver_name text`, `contact_phone_demo text`, `odo_km numeric(10,1)`, `fleet_id →fleets`, `employee_id →employees`, `person_name text`, `status gate_pass_status! ('ISSUED')`, `exit_at timestamptz`, `security_checked_by text`, `cancel_reason text` | Issuing sets the source GIN to IN_TRANSIT (function). Check: CANCELLED ⇒ cancel_reason not blank; EXITED ⇒ exit_at and security_checked_by. |
| `grns` (DEP; owner = receiving unit) | `grn_no text! U` (GRN-MN-IN-0027), `source_kind text!` CHECK in (TRS, OTHER_DEPOT, MIC_VEHICLE, CENTRAL_STORE, VENDOR), `from_org_unit_id →org_units`, `vendor_id →vendors`, `gin_id →gins`, `indent_id →indents`, `status grn_status!`, `received_at timestamptz`, `received_by →employees`, `total_value numeric(14,2)` | |
| `grn_lines` | `grn_id →!`, `folio_id →tyre_folios`, `tyre_id →tyres`, `accessory_id →accessory_items`, `expected_qty`, `received_qty`, `accepted_qty`, `rejected_qty` numeric(10,2), `result text!` CHECK in (ACCEPTED, REJECTED, DISCREPANCY), `reject_reason_id →reject_reasons`, `discrepancy_reason text` CHECK in (TYRE_MISSING, WRONG_TYRE, CASING_DAMAGED, GRADE_VARIANCE), `grade_received tyre_grade`, `nsd_mm numeric(4,1)`, `goes_to text`, `batch_no text`, `unit_price numeric(14,2)`, `remarks text` | Check: REJECTED ⇒ reject_reason_id; DISCREPANCY ⇒ discrepancy_reason. |
| `mrns` (DEP) | `mrn_no text! U`, `source_org_unit_id →`, `requested_to_org_unit_id →`, `requested_by →employees`, `status text!` CHECK in (READY_TO_RECEIVE, RECEIVED), `received_at` | Material Return Note – GRN screen. |
| `mrn_lines` | `mrn_id →!`, `tyre_id →tyres`, `accessory_id →accessory_items`, `folio_id →`, `issued_qty`, `accepted_qty`, `rejected_qty`, `result text`, `discrepancy_reason text`, `goes_to text`, `removal_order_id →removal_orders`, `wear_pattern_id →wear_patterns`, `nsd_mm numeric(4,1)` | |
| `scrap_return_notes` (DEP) | `srn_no text! U`, `status text!` CHECK in (DRAFT, RECEIVED), `remarks text`, `received_at` | Check: at least one line when RECEIVED. |
| `scrap_return_lines` | `srn_id →!`, `item_kind text!`, `tyre_id →tyres`, `accessory_id →accessory_items`, `folio_id →`, `qty numeric(10,2)! (>0)`, `scrap_reason text` | |
| `wsrs` (DEP) | `wsr_no text! U`, `task_id →job_tasks`, `job_card_id →job_cards`, `requested_by →employees!`, `raised_for_employee_id →employees`, `status wsr_status! ('REQUESTED')`, `raised_after_work_start bool!`, `reject_reason text`, `cancel_reason text`, `decided_by →profiles`, `decided_at`, `issued_gin_id →gins` | Checks: REJECTED ⇒ reject_reason; CANCELLED ⇒ cancel_reason. A job on hold cannot receive a new WSR (function). |
| `wsr_lines` | `wsr_id →!`, `material_kind accessory_kind!`, `tyre_size_id →tyre_sizes`, `rim_inches numeric(4,1)`, `requested_qty int!`, `issued_qty int! (0)`, `accessory_id →accessory_items`, `unit_price numeric(14,2)` | |
| `drns` (DEP) | `drn_no text! U`, `drn_date date!`, `issued_by →employees!`, `to_org_unit_id →org_units`, `vendor_id →vendors`, `remarks text`, `status drn_status! ('DRAFT')`, `decided_by`, `decided_at`, `decision_remarks` | Approver unresolved (UQ-01). |
| `drn_lines` | `drn_id →!`, `tyre_id →tyres!`, `remarks text` | |
| `purchase_indents` (HO-owned; `org_unit_id` = Central Store) | STD + `org_unit_id →org_units!`, `pi_no text! U`, `indent_type text!` CHECK in (SUPPLEMENTARY, AWR, EMERGENCY), `folio_group_ref →ref_values`, `indent_to text!` CHECK in (CENTRAL_STORE, DEPOT_STORE, ALL), `indent_date date!`, `required_for text`, `source_label text`, `requested_by →employees!`, `remarks text`, `status pi_status! ('DRAFT')`, `decided_by →profiles`, `decided_at`, `decision_remarks` | Totals computed in views. |
| `purchase_indent_lines` | `pi_id →!`, `folio_id →!`, `class_abc char(1)`, `avg_month_qty numeric(10,2)`, `prev_1m_qty`, `prev_3m_cons`, `prev_6m_cons`, `prev_12m_cons` numeric(10,2), `msq_basis text`, `cs_stock`, `max_stock`, `d_store_stock`, `trs_stock`, `total_stock`, `order_qty`, `receive_qty`, `pending_po_qty` numeric(10,2), `prev_po_no text`, `prev_po_date date`, `requested_qty numeric(10,2)!`, `unit_amount numeric(14,2)`, `gst_pct numeric(4,2)`, `suggested_vendor_id →vendors` | Snapshot of consumption/stock at raising time. |
| `allocation_requests` (HO-owned) | STD + `org_unit_id →` (Central Store), `request_no text! U`, `allocation_type text!`, `allocate_from_org_unit_id →`, `allocated_by →employees!`, `status allocation_status! ('REQUESTED')`, `decided_by`, `decided_at`, `decision_remarks` | UQ-08. |
| `allocation_request_lines` | `request_id →!`, `to_org_unit_id →org_units!`, `folio_id →!`, `qty int!` | At least one line with qty > 0. |

---

## 12. Reports

| Table | Columns | Keys / indexes / notes |
|---|---|---|
| `premature_failure_requests` (DEP) | `request_no text! U`, `tyre_id →tyres!`, `reason text`, `requested_by_label text` (TRS), `status pfr_status!`, `report_id →premature_failure_reports` | UQ-05. |
| `premature_failure_reports` (DEP) | `report_no text! U` (PFR-), `request_id →premature_failure_requests`, `tyre_id →tyres!`, `fleet_id →fleets`, `failure_date date!`, `failed_position text!`, `skid_depth_mm numeric(4,1)!`, `damage_type_ref →ref_values!`, `damage_reason text!`, `tic_remarks text`, `fault_on_ref →ref_values!`, `responsible_employee_id →employees`, `km_run numeric(10,1)`, `norm_km numeric(10,1)`, `rotations_count smallint`, `discout_count smallint`, `tyre_price numeric(14,2)`, `remaining_km numeric(10,1)`, `loss_amount numeric(14,2)`, `vendor_id →vendors`, `status pfr_status!` | Computed values are **frozen** at submission. Loss formula: UQ-25. |
| `tyre_damage_requests` (DEP) | `request_no text! U`, `job_card_id →job_cards`, `tyre_id →tyres!`, `fleet_id →fleets`, `injury text`, `request_reason text`, `requested_by_label text`, `status damage_status!` | UQ-02. |
| `tyre_damage_reports` (DEP) | `report_no text! U`, `request_id →!`, `tyre_id →tyres!`, `details jsonb!`, `filled_by →employees`, `filled_at timestamptz`, `status damage_status!` | Report fields not visible in the snapshot; stored as structured JSON until you supply the form (UQ-31). |

---

## 13. System tables

| Table | Columns | Keys / indexes / notes |
|---|---|---|
| `notifications` (STD) | `category notification_category!`, `type text!`, `title text!`, `body text`, `ref_entity_type text`, `ref_entity_id uuid`, `ref_no text`, `recipient_profile_id →profiles`, `recipient_role role_code`, `recipient_org_unit_id →org_units`, `sender_label text` | Targeting by person, or by role + depot. Check: at least one target. Indexes (recipient_profile_id, created_at DESC), (recipient_role, recipient_org_unit_id). |
| `notification_reads` | `notification_id →!`, `profile_id →profiles!`, `read_at timestamptz!` | PK both. |
| `audit_logs` (APPEND) | `user_id →profiles`, `user_role role_code`, `org_unit_id →org_units`, `action text!`, `table_name text!`, `record_id uuid`, `old_values jsonb`, `new_values jsonb`, `ip_hint text`, `at timestamptz!` | Indexes (table_name, record_id), (user_id, at), (org_unit_id, at), BRIN(at). Written by triggers and approval functions. |
| `attachments` | STD + `org_unit_id →`, `bucket text!`, `object_path text!`, `mime_type text!`, `size_bytes int!`, `entity_type text!`, `entity_id uuid!`, `task_id →job_tasks`, `uploaded_by →profiles!` | U(bucket, object_path). Max size / type enforced. Photos (job execution, complaints). |
| `application_settings` | `key text PK`, `value jsonb!`, `description text`, `updated_by`, `updated_at` | `demo_today`, `demo_data`, `psi_tolerance_low` (15), `psi_tolerance_high` (10), feature flags. Writable only by the administrator. |
| `document_sequences` | `doc_type text!`, `org_unit_id →org_units`, `period text!`, `last_value int!` | PK(doc_type, org_unit_id, period). `app.next_doc_no()` locks the row. |
| `import_batches` | STD + `import_type text!`, `file_name text`, `row_count int`, `status text!` | Optional CSV bulk master import log (staging only; imported rows still become change requests). |

---

## 14. Document-number formats (generated by `app.next_doc_no`)

Patterns preserved from the prototype; depot code = `org_units.code` (UQ-13, UQ-19):
`GIN-{DEP}-{YYYY}-{NNNN}` · `IND-{DEP}-{YYYY}-{NNNN}` · `WSR-{DEP}-{YYMM}-{NNNN}` · `GRN-{DEP}-IN-{NNNN}` · `MRN-{DEP}-{NNN}` · `FO-{DEP}-{YYYY}-{NNNN}` · `RO-{DEP}-{YYYY}-{NNNN}` · `JC-{NNNN}` (card) / `JC-ST-{YYMM}-{DD}-{NN}` etc. · `JID-{NNNN}` · `CMPID-{NNNN}` · `PI-{YYYY}-{NNNN}` · `MCR-{YYYY}-{NNNNNN}` (master change request).

## 15. Constraints summary

- All tables have a primary key; all relationships are foreign keys; no cascades.
- Status changes outside functions are blocked by **column-level privileges** (clients cannot `UPDATE status`).
- `CHECK` constraints enforce mandatory remarks wherever a rejection, return, revert, cancel, withdrawal or removal occurs.
- Unique business numbers (fleet, tyre, document numbers, codes).
- Exclusion / partial-unique constraints: one open master request per record, one open span per tyre, one open hold per task, one approved roster per week and depot, non-overlapping norm date ranges.
- Append-only tables (`*_history`, `tyre_movements`, `stock_ledger`, `audit_logs`, `document_status_history`) reject update and delete.

## 16. Indexing summary

FK indexes everywhere; (org_unit_id, status[, date]) on every depot document; (assigned_employee_id, status, due_date) on `job_tasks`; (tyre_id, occurred_at) on `tyre_movements`; trigram indexes on folio, vendor and fleet search fields; partial indexes for open approvals and in-transit items; BRIN on time-ordered append tables.

## 17. Table count

| Group | Tables |
|---|---|
| Identity / org (§3) | 10 |
| Reference & master data incl. child tables (§4) | 38 |
| Approval engine (§5) | 5 (+2 queue views) |
| Tyre inventory & history (§6) | 10 (+ reporting views) |
| Fleet operations (§7) | 6 |
| Scheduling, groups, complaints (§8) | 6 |
| Job cards & execution (§9) | 15 |
| Workforce (§10) | 7 |
| Store documents (§11) | 19 |
| Reports (§12) | 4 |
| System (§13) | 7 |
| **Total (Stage 2)** | **127 tables** (counted from this document), plus views and `app` functions. **After Stage 2.1: 136** (see the amendments at the top) |

This is the single source of truth; the Stage 1 `database-design.md` is superseded.
