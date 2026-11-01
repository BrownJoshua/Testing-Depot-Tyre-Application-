# Stage 2 — Entity Relationship Diagrams

> **Stage 2.1:** the 11 added tables (`depots`, `central_store_receipts`, `central_store_receipt_lots`, `tyre_number_series`, `allocation_request_tyres`, `tyre_ownership_history`, `tyre_identity_corrections`, `depot_tools_equipment`, `fleet_route_assignments`, `document_number_series`, `admin_action_log`) are drawn in the relationship diagram of `stage2.1-central-store-tyre-creation.md` §4.3 (receipts, tyres, allocation) and described in `stage2.1-table-justification.md` §10. `mrns`/`mrn_lines` in diagram 5 are now `grns`/`grn_lines` with `grn_kind = MRN`. The diagrams below otherwise stand.

Six Mermaid diagrams, one per domain, because a single diagram of 127 tables would be unreadable. Column-level detail is in `stage2-database-schema.md`. `||--o{` = one-to-many, `||--o|` = one-to-zero-or-one, `}o--o{` = many-to-many (shown through its join table in the diagrams).
Only the most important columns appear in each box. Standard audit columns (`created_at`, `updated_at`, `created_by`, `updated_by`) exist on every table and are omitted.

## 1. Identity, organisation, access and approval

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "login identity"
    EMPLOYEES ||--o| PROFILES : "has login"
    ROLES ||--o{ EMPLOYEES : "assigned"
    ROLES ||--o{ ROLE_CAPABILITIES : grants
    ORG_UNITS ||--o{ EMPLOYEES : "works at depot"
    PROFILES ||--o{ USER_DEPOT_ACCESS : "extra depots"
    ORG_UNITS ||--o{ USER_DEPOT_ACCESS : scope
    EMPLOYEES ||--o{ EMPLOYEE_SKILLS : holds
    SKILLS ||--o{ EMPLOYEE_SKILLS : "skill of"
    MASTER_ENTITY_REGISTRY ||--o{ MASTER_CHANGE_REQUESTS : "entity type"
    PROFILES ||--o{ MASTER_CHANGE_REQUESTS : "maker (HO)"
    PROFILES ||--o{ MASTER_CHANGE_REQUESTS : "checker (AM)"
    MASTER_CHANGE_REQUESTS ||--o{ MASTER_CHANGE_REQUEST_HISTORY : "audit trail"
    MASTER_CHANGE_REQUESTS ||--o| MASTER_CHANGE_REQUESTS : supersedes
    APPROVAL_ROUTES ||--o{ DOCUMENT_STATUS_HISTORY : "governs transitions"
    PROFILES ||--o{ DOCUMENT_STATUS_HISTORY : actor
    PROFILES ||--o{ AUDIT_LOGS : performed
    PROFILES ||--o{ NOTIFICATIONS : receives
    NOTIFICATIONS ||--o{ NOTIFICATION_READS : "read by"

    AUTH_USERS {
        uuid id PK
        text email "synthetic, derived from Employee ID"
    }
    PROFILES {
        uuid id PK
        uuid employee_id FK
        text preferred_language
        bool is_active
    }
    EMPLOYEES {
        uuid id PK
        text employee_code UK
        role_code role_code FK
        uuid org_unit_id FK
        master_status status
    }
    ORG_UNITS {
        uuid id PK
        text code UK
        text name UK
        org_unit_type unit_type
    }
    MASTER_CHANGE_REQUESTS {
        uuid id PK
        text request_no UK
        text entity_type FK
        uuid target_id
        master_action action
        master_request_status status
        jsonb proposed_payload
        jsonb base_snapshot
        uuid maker_id FK
        uuid checker_id FK
        text decision_remarks
    }
    MASTER_CHANGE_REQUEST_HISTORY {
        uuid request_id FK
        int seq
        text action
        uuid actor_id FK
        text remarks
    }
    APPROVAL_ROUTES {
        text workflow_code PK
        int step_no PK
        text action PK
        role_code approver_role "null = unresolved"
    }
    DOCUMENT_STATUS_HISTORY {
        text entity_type
        uuid entity_id
        text to_status
        uuid actor_id FK
        text remarks
    }
```

`org_units` has 33 rows of type `DEPOT` plus TRS Chrompet, TRS Tondiarpet, Central Store and MIC Vehicle Unit (separate units, not depots).

## 2. Master data

```mermaid
erDiagram
    TYRE_MAKES ||--o{ TYRE_MODELS : has
    TYRE_MAKES ||--o{ TYRE_FOLIOS : make
    TYRE_MODELS ||--o{ TYRE_FOLIOS : model
    TYRE_SIZES ||--o{ TYRE_FOLIOS : size
    REF_VALUES ||--o{ TYRE_FOLIOS : "group, category, uom, construction, tube"
    TYRE_FOLIOS ||--o{ TYRE_FOLIO_LOCATIONS : "stocked at"
    FLEET_TYPES ||--o{ FLEET_TYPE_TYRE_SIZES : fits
    TYRE_SIZES ||--o{ FLEET_TYPE_TYRE_SIZES : size
    FLEET_TYPES ||--o{ FLEETS : "type of"
    ORG_UNITS ||--o{ FLEETS : "home depot"
    TYRE_SIZES ||--o{ FLEETS : "OEM size"
    FLEETS ||--|| FLEET_OPERATIONAL_STATE : "live state"
    FLEETS ||--o{ FLEET_DEPOT_HISTORY : "depot moves"
    FLEETS ||--o{ FLEET_STATUS_HISTORY : "status changes"
    FLEETS ||--o{ ODOMETER_READINGS : "odometer log"
    ROUTES ||--o{ FLEET_OPERATIONAL_STATE : "current route"
    TYRE_FOLIOS ||--o{ FOLIO_STOCK_PARAMS : "min max"
    ORG_UNITS ||--o{ FOLIO_STOCK_PARAMS : depot
    MAINTENANCE_JOBS ||--o{ MAINTENANCE_JOB_SKILLS : needs
    SKILLS ||--o{ MAINTENANCE_JOB_SKILLS : skill
    FLEET_TYPES ||--o{ MAINTENANCE_JOBS : "job for type"
    MAINTENANCE_JOBS ||--o{ MAINTENANCE_SCHEDULES : "scheduled job"
    MAINTENANCE_SCHEDULES ||--o{ SCHEDULE_CATEGORIES : contains
    SCHEDULE_CATEGORIES ||--o{ SCHEDULE_GROUP_RULES : rules
    SCHEDULE_CATEGORIES ||--o{ SCHEDULE_CHECKPOINTS : checkpoints
    SCHEDULE_CATEGORIES ||--o{ SCHEDULE_CHECKLIST_ITEMS : checklist
    SCHEDULE_CATEGORIES ||--o{ SCHEDULE_JOB_MAP : "job mapping"
    TYRE_FOLIOS ||--o{ SCHEDULE_GROUP_RULES : "folio rule"
    QC_CHECKLISTS ||--o{ QC_CHECKLIST_ITEMS : items
    TYRE_SIZES ||--o{ PSI_NORMS : size
    TYRE_SIZES ||--o{ EXPECTED_LIFE_KM : size
    ROTATION_DISCOUT_NORMS ||--o{ NORM_ELIGIBLE_GRADES : grades
    COMPLAINT_TYPES ||--o{ COMPLAINT_TYPE_JOBS : requires
    MAINTENANCE_JOBS ||--o{ COMPLAINT_TYPE_JOBS : job
    REASONS ||--o{ REASON_USAGES : "used for"
    REF_VALUES ||--o{ VENDORS : category
    VENDORS ||--o{ VENDOR_CONTACTS : contacts

    TYRE_FOLIOS {
        uuid id PK
        text folio_no UK
        text folio_name
        uuid make_id FK
        uuid tyre_size_id FK
        master_status status
        int row_version
    }
    FLEETS {
        uuid id PK
        text fleet_no UK
        text registration_no UK
        uuid org_unit_id FK
        uuid fleet_type_id FK
    }
    FLEET_OPERATIONAL_STATE {
        uuid fleet_id PK
        air_type air_type
        numeric live_odometer_km
        fleet_availability availability
    }
    VENDORS {
        uuid id PK
        text vendor_code UK
        text vendor_name
        uuid vendor_category_ref FK
        text gstin "fictional demo value"
        master_status status
    }
    MAINTENANCE_SCHEDULES {
        uuid id PK
        text schedule_code UK
        schedule_frequency_kind frequency_kind
        uuid job_id FK
    }
```

All tables in this diagram except the operational-state and history tables are **HO-managed masters** (change requests approved by AM).

## 3. Tyre inventory, movement and life history

```mermaid
erDiagram
    TYRE_FOLIOS ||--o{ TYRES : defines
    VENDORS ||--o{ TYRES : "supplied by"
    ORG_UNITS ||--o{ TYRES : "owned by"
    TYRES ||--|| TYRE_CURRENT_STATE : "projection"
    TYRES ||--o{ TYRE_MOVEMENTS : "append only history"
    TYRES ||--o{ TYRE_FITMENT_HISTORY : "spans on fleets"
    TYRES ||--o{ TYRE_RETREAD_STAGES : retreads
    TYRES ||--o{ TYRE_REPAIRS : repairs
    TYRES ||--o{ TYRE_ROUTE_USAGE : routes
    FLEETS ||--o{ TYRE_FITMENT_HISTORY : fitted
    FLEETS ||--o{ TYRE_CURRENT_STATE : "currently on"
    ORG_UNITS ||--o{ TYRE_CURRENT_STATE : "currently at"
    ORG_UNITS ||--o{ TYRE_MOVEMENTS : "depot of record"
    RETREAD_BATCHES ||--o{ RETREAD_BATCH_TYRES : contains
    TYRES ||--o{ RETREAD_BATCH_TYRES : "sent for retread"
    ORG_UNITS ||--o{ RETREAD_BATCHES : "TRS unit"
    VENDORS ||--o{ RETREAD_BATCHES : "external retreader"
    RETREAD_BATCHES ||--o{ TYRE_RETREAD_STAGES : produces
    TYRE_FOLIOS ||--o{ ACCESSORY_ITEMS : "tube flap disc"
    ACCESSORY_ITEMS ||--o{ STOCK_LEDGER : posted
    TYRES ||--o{ STOCK_LEDGER : posted
    TYRE_FOLIOS ||--o{ STOCK_LEDGER : folio
    ORG_UNITS ||--o{ STOCK_LEDGER : "unit balance"
    TYRES ||--o{ ACCESSORY_ITEMS : "fitted with"

    TYRES {
        uuid id PK
        text tyre_no UK
        uuid folio_id FK
        uuid vendor_id FK
        uuid owner_org_unit_id FK
        date warranty_upto
    }
    TYRE_CURRENT_STATE {
        uuid tyre_id PK
        tyre_location location_type
        uuid fleet_id FK
        text position
        tyre_grade grade
        smallint retread_level
        uuid last_movement_id FK
    }
    TYRE_MOVEMENTS {
        uuid id PK
        uuid tyre_id FK
        movement_type movement_type
        timestamptz occurred_at
        uuid from_org_unit_id FK
        uuid to_org_unit_id FK
        uuid from_fleet_id FK
        uuid to_fleet_id FK
        text doc_type
        uuid doc_id
    }
    STOCK_LEDGER {
        uuid id PK
        uuid org_unit_id FK
        uuid folio_id FK
        text doc_type
        numeric inward_qty
        numeric outward_qty
        numeric balance_after
    }
```

`tyre_current_state` is a projection; `tyre_movements` is the permanent record, so moving a tyre never overwrites history.

## 4. Scheduling, job cards and execution

```mermaid
erDiagram
    MAINTENANCE_SCHEDULES ||--o{ FLEET_GROUPS : "grouped for"
    ORG_UNITS ||--o{ FLEET_GROUPS : depot
    FLEET_GROUPS ||--o{ FLEET_GROUP_REVISIONS : revisions
    FLEET_GROUP_REVISIONS ||--o{ FLEET_GROUP_REVISION_MEMBERS : members
    FLEETS ||--o{ FLEET_GROUP_REVISION_MEMBERS : "in group"
    FLEET_GROUPS ||--o{ SCHEDULE_INSTANCES : "due rounds"
    SCHEDULE_INSTANCES ||--o| JOB_CARDS : "creates"
    COMPLAINT_TYPES ||--o{ COMPLAINTS : type
    COMPLAINTS ||--o| LOG_SHEET_COMPLAINTS : "log sheet detail"
    COMPLAINTS ||--o{ JOB_CARDS : "may create"
    FLEETS ||--o{ JOB_CARDS : "for fleet"
    JOB_CARDS ||--o{ JOB_TASKS : "Job IDs"
    JOB_TASKS ||--o| JOB_TASKS : "depends on"
    MAINTENANCE_JOBS ||--o{ JOB_TASKS : "job type"
    TYRES ||--o{ JOB_TASKS : tyre
    EMPLOYEES ||--o{ JOB_TASKS : "assigned tyre man"
    OUTSOURCE_EMPLOYEES ||--o{ JOB_TASKS : "assigned OSE"
    JOB_TASKS ||--o{ JOB_ASSIGNMENTS : "assignment history"
    JOB_TASKS ||--o{ JOB_HOLDS : holds
    REASONS ||--o{ JOB_HOLDS : reason
    JOB_TASKS ||--o| JOB_TASK_EXECUTION : execution
    JOB_TASKS ||--o{ AIR_INFLATION_READINGS : psi
    JOB_TASKS ||--o{ INSPECTION_RESULTS : inspection
    JOB_TASKS ||--o{ CENSUS_READINGS : census
    WEAR_PATTERNS ||--o{ CENSUS_READINGS : pattern
    JOB_TASKS ||--o{ ROTATION_MOVES : moves
    JOB_TASKS ||--o{ CIRT_CHECKLIST_ANSWERS : checklist
    JOB_CARDS ||--o{ FINAL_INSPECTIONS : verification
    QC_CHECKLISTS ||--o{ FINAL_INSPECTIONS : checklist
    FINAL_INSPECTIONS ||--o{ FINAL_INSPECTION_ANSWERS : answers
    JOB_TASKS ||--o| REMOVAL_ORDERS : removal
    JOB_TASKS ||--o| FITMENT_ORDERS : fitment
    JOB_TASKS ||--o{ ATTACHMENTS : photos
    JOB_TASKS ||--o{ RESCHEDULE_REQUESTS : "prepone postpone"

    JOB_CARDS {
        uuid id PK
        text job_card_no UK
        work_category work_category
        job_source source
        uuid org_unit_id FK
        uuid fleet_id FK
        job_card_status status
    }
    JOB_TASKS {
        uuid id PK
        text job_task_no UK
        uuid job_card_id FK
        smallint seq
        uuid depends_on_task_id FK
        uuid assigned_employee_id FK
        uuid assigned_ose_id FK
        task_status status
    }
    FLEET_GROUP_REVISIONS {
        uuid id PK
        uuid group_id FK
        int revision_no
        doc_approval_status status
        text reason_for_change
    }
```

The Tyre Man's "My Jobs" is `job_tasks WHERE assigned_employee_id = me`, and RLS enforces the same.

## 5. Store documents, procurement and vendor links

```mermaid
erDiagram
    ORG_UNITS ||--o{ INDENTS : "requesting depot"
    ORG_UNITS ||--o{ INDENTS : "request to"
    INDENTS ||--o{ INDENT_LINES : lines
    TYRE_FOLIOS ||--o{ INDENT_LINES : folio
    INDENTS ||--o{ GINS : "fulfilled by"
    GINS ||--o{ GIN_LINES : lines
    TYRES ||--o{ GIN_LINES : "serialised tyre"
    ACCESSORY_ITEMS ||--o{ GIN_LINES : "tube flap disc"
    ORG_UNITS ||--o{ GINS : "to unit"
    GINS ||--o{ GATE_PASSES : "leaves on"
    GINS ||--o{ GRNS : "received as"
    GRNS ||--o{ GRN_LINES : lines
    REJECT_REASONS ||--o{ GRN_LINES : "reject reason"
    VENDORS ||--o{ GRNS : "direct receipt"
    VENDORS ||--o{ GINS : "return to vendor"
    JOB_TASKS ||--o{ WSRS : "needs material"
    WSRS ||--o{ WSR_LINES : lines
    WSRS ||--o| GINS : "issue GIN auto"
    REMOVAL_ORDERS ||--o{ MRN_LINES : "received via"
    MRNS ||--o{ MRN_LINES : lines
    SCRAP_RETURN_NOTES ||--o{ SCRAP_RETURN_LINES : lines
    DRNS ||--o{ DRN_LINES : lines
    TYRES ||--o{ DRN_LINES : "returned tyre"
    VENDORS ||--o{ DRNS : "warranty counterparty"
    PURCHASE_INDENTS ||--o{ PURCHASE_INDENT_LINES : lines
    TYRE_FOLIOS ||--o{ PURCHASE_INDENT_LINES : folio
    VENDORS ||--o{ PURCHASE_INDENT_LINES : "suggested vendor"
    ALLOCATION_REQUESTS ||--o{ ALLOCATION_REQUEST_LINES : lines
    ORG_UNITS ||--o{ ALLOCATION_REQUEST_LINES : "to depot"
    FLEETS ||--o{ FLEET_AIR_TYPE_REQUEST_FLEETS : "convert"
    FLEET_AIR_TYPE_REQUESTS ||--o{ FLEET_AIR_TYPE_REQUEST_FLEETS : fleets
    FLEET_AIR_TYPE_REQUESTS ||--o{ FLEET_AIR_TYPE_CHANGES : "when approved"

    INDENTS {
        uuid id PK
        text indent_no UK
        uuid org_unit_id FK
        uuid request_to_org_unit_id FK
        indent_status status
    }
    GINS {
        uuid id PK
        text gin_no UK
        uuid org_unit_id FK
        uuid to_org_unit_id FK
        uuid indent_id FK
        gin_status status
    }
    GATE_PASSES {
        uuid id PK
        text gp_no UK
        uuid source_doc_id
        gate_pass_status status
        timestamptz exit_at
    }
    GRN_LINES {
        uuid grn_id FK
        uuid tyre_id FK
        text result
        uuid reject_reason_id FK
    }
```

## 6. Workforce, vendors in people/quality, reports and system

```mermaid
erDiagram
    ORG_UNITS ||--o{ DUTY_ROSTERS : depot
    DUTY_ROSTERS ||--o{ DUTY_ROSTER_ENTRIES : entries
    EMPLOYEES ||--o{ DUTY_ROSTER_ENTRIES : posted
    SHIFTS ||--o{ DUTY_ROSTER_ENTRIES : shift
    EMPLOYEES ||--o{ SHIFT_CHANGE_REQUESTS : requests
    EMPLOYEES ||--o{ LEAVE_REQUESTS : applies
    EMPLOYEES ||--o{ ATTENDANCE_RECORDS : "HRMS mock"
    EMPLOYEES ||--o{ SKILL_REQUESTS : "skill request for"
    SKILL_REQUESTS ||--o{ SKILL_REQUEST_ITEMS : items
    SKILLS ||--o{ SKILL_REQUEST_ITEMS : skill
    VENDORS ||--o{ OUTSOURCE_EMPLOYEES : "manpower contractor"
    OUTSOURCE_EMPLOYEES ||--o{ OUTSOURCE_EMPLOYEE_SKILLS : skills
    TYRES ||--o{ PREMATURE_FAILURE_REPORTS : "failed tyre"
    PREMATURE_FAILURE_REQUESTS ||--o| PREMATURE_FAILURE_REPORTS : "answered by"
    VENDORS ||--o{ PREMATURE_FAILURE_REPORTS : "claim against"
    TYRES ||--o{ TYRE_DAMAGE_REQUESTS : damaged
    TYRE_DAMAGE_REQUESTS ||--o| TYRE_DAMAGE_REPORTS : "filled as"
    REASONS ||--o{ REASON_SUGGESTIONS : "may become"
    MASTER_CHANGE_REQUESTS ||--o| REASON_SUGGESTIONS : "created from"
    ORG_UNITS ||--o{ NOTIFICATIONS : "targets depot"
    ORG_UNITS ||--o{ DOCUMENT_SEQUENCES : "number series"
    PROFILES ||--o{ ATTACHMENTS : uploaded

    DUTY_ROSTERS {
        uuid id PK
        uuid org_unit_id FK
        date week_start
        int revision_no
        doc_approval_status status
    }
    PREMATURE_FAILURE_REPORTS {
        uuid id PK
        text report_no UK
        uuid tyre_id FK
        numeric km_run
        numeric norm_km
        numeric loss_amount
    }
    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        text table_name
        uuid record_id
        jsonb old_values
        jsonb new_values
    }
```

## 7. Tables with no foreign-key relationship

Three tables are deliberately free-standing and therefore not drawn: `tyre_detail_columns` (Tyre Detailed Master: attribute definitions), `application_settings` (key/value configuration) and `import_batches` (staging log for optional CSV import). Every other one of the 127 tables appears in at least one diagram above.

## 8. Cardinality notes worth checking

| Relationship | Rule |
|---|---|
| Employee ↔ Profile | 0..1 login per employee; Outsource employees never have profiles |
| Fleet ↔ Fleet group (per schedule) | A fleet is in at most one active group per schedule |
| Tyre ↔ open fitment span | At most one open span |
| Master record ↔ open change request | At most one DRAFT / PENDING request |
| Job card ↔ Job tasks | 1..n; Tyre Changing = 4, Rotation = 2, Census = one per tyre, Air Inflation / Inspection = one per fleet |
| Indent ↔ GIN | 1..n (partial issues) |
| GIN ↔ Gate pass | 0..n (cancel and re-issue allowed) |
| Tyre ↔ Movements | 1..n, append-only |
