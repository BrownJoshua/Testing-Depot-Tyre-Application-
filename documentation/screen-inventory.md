# Screen Inventory

> **Stage 2 note.** Screen content is unchanged. Read **AE → AM (Tech)** and **Tyre Incharge → Tyre IC**. Screens that the prototype saved directly (Complaint, Reason, Fleet Type, Shift, Tyre Detailed, Maintenance Configuration, PSI/Rotation/Discout norms, Fleet edits) now use the maker-checker pattern **P1** (HO proposes, AM approves/rejects with remarks). Vendor Master and the HO/AM/Supervisor dashboards are additions with no prototype screen. Role permissions are in `stage2-final-role-matrix.md`.

Curated analysis of every screen in `MTC-Depot-Tyre-Prototype.html`. For the exhaustive machine-extracted list of columns, filters, dropdown options, form fields and popups, see `screen-inventory-appendix-generated.md` (referenced as **Appendix**). Where this file says "all columns: see Appendix" it means the columns are listed there verbatim.

**Counting.** 118 screen files → **82 role-specific screens** (HO 22, AE 12, SUP 9, TIC 25, TM 14) once persona variants (`--aja`, `--sil`) and tab-state files (`--air-type-requests`, `--schedule-setup`, …) are merged. Several are the same screen seen by different roles (Job Card Register, Fleet Register, Tyre Register, Tyre Man Register, Audit Trail), so the number of *unique functional screens* is about 65.

**IDs.** `HO-xx`, `AE-xx`, `SUP-xx`, `TIC-xx`, `TM-xx`. Status words are the prototype's own. `*` = marked required in the prototype. "Conf." flags something I could not confirm and added to the open questions.

---

## 0. Shared patterns (referenced by many screens)

**P1 — Maker–checker master (HO maker, AE checker).**
- *HO side:* list with status filter (All / Draft / Pending approval / Approved / Returned), `+ Create`/`+ Add`, row actions View · Edit · Audit Trail · Delete/Withdraw · Send for Approval; row selection with bulk **Withdraw** and **Send for Approval**.
- *AE side:* same list without Draft; **Approve selected / Return selected**, per-row **Approve / Return**, View, Audit Trail.
- *Modals:* Create/Edit form → "Send for Approval?" confirm → Withdraw (reason *) → Approve confirm → Return (reason *) → Audit Trail.
- *Audit Trail modal:* status chain **Draft → Pending approval → Approved → Published to all depots**, timeline of steps (actor role, action, timestamp) and event list (actor name + employee ID).
- *Used by:* Tyre Folio, Expected Life KM, Reject Reason Master, QC Master, Wear Pattern Master.

**P2 — Supervisor approval list.** Selectable rows, **Approve selected / Revert selected / Reject selected** plus per-row Approve / Revert / Reject; Revert and Reject open a modal with **Reason ***; Approve opens a confirm; each document opens a read-only view with Print and an Audit Trail. *Used by:* GIN Approvals, Indent Approvals. (Grouping / Roster / Skill approvals use Approve / **Return** only.)

**P3 — Tyre life drawer "TLDC — Tyre …"** (opened from any tyre number): tabs/tables for *Retread stages* (Stage, Thread Rubber, Bonding Gum, VC Patch, No. of VC, TRS Census, RT Date, Recom. Position, Achieved KM, Total KMS, TRS Remarks), *Rotation matrix* (Particulars × New Tyre Fitment, I…IX Rotation), *Fitment history* (S.No, Fleet No, Position, Fitted Date, Removal Date, Route, KMS, Days Stopped, Days Running, Running Days KMS, Dead KMS, Total KMS, Reason for Removal), *Routes driven* (Route, Route Name, Fleet, Trips, KM Driven, First/Last Driven, Tyre Position), *Location phases* (S.No, Phase, From/To Date, No. of Days, Fleet No, Position, Location/Remarks), *Timeline* (When, Fleet/Position, Detail), *Repair history* (Date, Position, Cause, Repair action, Odometer, Repaired by, Remarks). Buttons: Depot Maintenance History · RT Maintenance History · Audit Trail · Print. Read-only.

**P4 — Document view with Print.** GIN, GRN, DRN, WSR, Gate Pass, Indent, Purchase Indent, Damage / Premature Failure reports open a read-only document with line-item table, status history (S.No, When, Who, Action, Comment) and a **Print** button.

**P5 — Confirm + reason modal.** Destructive or workflow-changing actions (Cancel, Withdraw, Reject, Return, Revert, Remove, Close, Hold) open a modal with a mandatory **Reason ***; the confirm button stays inactive until the reason is entered ("*X is required*" shown inline).

---

## 1. HO (Technical) — 22 screens

### HO-01 Tyre Folio (`ho/tyre-folio`) — pattern P1
- **Purpose:** Define tyre items (folios) that the whole system uses; changes need AE approval.
- **Role:** HO (maker). AE approves (AE-01).
- **Inputs (Add/Edit):** Folio No.; Folio Name; Make (Apollo, Birla, Bridgestone, CEAT, JK, Michelin, MRF, TOLINS); Makers model (Winmile X3-AW/R, Jet Trak, Jet Xtra XLM, EnduRace RA, Endurace RD, Jetway JUH5, R150, R156, Steel Muscle S1R4); Construction Type (Radial, Nylon); Tube Type (Tube, Tubeless); Ply (12, 14, 16, 18); Tyre size; Group (Tyre); Category (Spares, Accessory); UOM (Nos); HSN; Expiry (Yes/No); Recondition (Yes/No); Locations (Central Store, MIC, Depot, TRS).
- **Table columns:** Folio ID, Folio Name, Specification, Make, Makers model, Construction Type, Tube Type, Ply, Size, Locations, Group, Category, UOM, HSN, Expiry, Recondition, Created, Status, Action.
- **Actions:** + Add Tyre Folio; View; Edit; Audit Trail; Delete (confirm); Withdraw (reason); Send for Approval; pagination; status filter.
- **Validations:** Withdraw reason required; Send-for-approval confirm; ~50 folios (48 approved, 1 pending, 1 draft, 1 returned).
- **Related master data:** Makes, models, tyre sizes, locations, HSN.
- **Related transactions:** Every stock, indent, GIN/GRN, WSR and purchase line refers to a Folio ID. Delete must become soft-delete.
- **Output:** Approved folio is "published to all depots".

### HO-02 Tyre Detailed Master (`ho/tyre-detailed-master`)
- **Purpose:** Configure the attribute columns the tyre record carries (metadata master).
- **Role:** HO.
- **Inputs:** Add Column — Column Name, Description, Integration, Module, Module Master, Input Field, Required Field, Status.
- **Columns:** S.No, Column ID, Column Name, Column Description, Integration, Module, Module Master, Input Field, Required Field, Status, Action.
- **Actions:** + Add Column; Edit; Audit Trail. Toast "Column <id> saved".
- **Validations:** Not documented beyond required markers (see Appendix).
- **Related:** Tyre Master fields. **Output:** Column definitions. *Conf.:* whether this drives dynamic forms or is documentation only.

### HO-03 Fleet Register (`ho/fleet-master`, `ho/fleet-master--air-type-requests-1`)
- **Purpose:** All buses across depots; also the second approval stage for air-type conversion requests.
- **Role:** HO (view/edit); requests tab approves/rejects before AE.
- **Filters:** Depot (33), Model (Ashok Leyland, Tata), Model Type (BSIV, BS-III, Low Floor, AC, Deluxe), Status (Operating Vehicle, Spare Vehicle), Vehicle Type (Mofussil, Town, Ghat, Suburban); Reset.
- **Columns:** S.No, Fleet No, Registration Number, Chassis No., Date of Purchase, Depot, Model, Model Type, Fleet Type, Status, Axle Type, Air Type (Regular/Nitrogen), OEM Recommended Tyre Size, Live Odometer, Current Route, Schedule KM, Action. Fleet drawer: Pos, Tyre No, Size, RT, NSD (6 tyres: FR, FL, RRI, RRO, RLI, RLO).
- **Request tab columns:** Fleets, To, Reason, Raised by, Stage, Action.
- **Actions:** View fleet tyres; Edit; Approve / Reject air-type request.
- **Validations:** Reason carried from requester. **Related:** Fleet Type Master, Depot, Tyre Master. **Transactions:** Air-type conversion (WF-10). **Output:** Request moves "With HO (Technical)" → "With AE".

### HO-04 Fleet Type Master (`ho/fleet-type-master` + `--tyre-size` + `--fleet-type-tyre-size`)
- **Purpose:** Classify buses and define which tyre sizes fit each type.
- **Role:** HO (direct, no approval in prototype).
- **Tabs / columns:** Fleet Types — S.No, Fleet Make, Fleet Model, Fleet Type (Small, Standard, Low Floor), Status, Action · Tyre Sizes — S.No, Size, Status, Action · Fleet Type ↔ Tyre Size — S.No, Fleet Type, Tyre Sizes, Action.
- **Inputs:** Fleet Make *, Fleet Model *, Fleet Type *; Size *.
- **Actions:** + Add Fleet Type; + Add Tyre Size; Edit; Activate/Deactivate (confirm); Audit Trail.
- **Related:** Fleet Register, Maintenance Configuration (jobs by fleet type), tyre-size lists everywhere. **Output:** Active sizes feed all size dropdowns.

### HO-05 Tyre Stock — Tyre Master (`ho/tyre-master`)
- **Purpose:** Cross-depot view of every individual tyre.
- **Role:** HO (read-only). Summary and Detailed views; ⇩ Export CSV.
- **Columns (40):** S.No, Depot, Folio ID, Folio Name, Specification, Makers No, MTC No, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Size, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet, Removal position, Removal reason, New KM, RT1–RT5 KM, Running KM, Total KM.
- **Actions:** open TLDC drawer (P3); Export CSV; Print.
- **Related:** Folio, Fleet, Depot. **Output:** Status pills: Fitted, New, A/B/C, RT1–RT3, At TRS, At MIC, In Transit, Good, Repair.

### HO-06 Tyre Stock — In Transit (`ho/in-transit`)
- **Purpose:** Tyres sent by one unit and not yet received.
- **Role:** HO (read-only). **Columns:** S.No, Depot, MTC No, Manufacturer No, Folio ID, Folio Name, Specification, Make, Makers Model, Size, Construction Type, Tube Type, Grade, From, To, Reference No, Status.
- **Related transactions:** GIN, Gate Pass, GRN. 29 tyres in transit in seed data.

### HO-07 Tyre Man Register (`ho/tyre-man-master`)
- **Purpose:** Directory of tyre men and tyre incharges across depots.
- **Role:** HO (view). Also shown to TIC for the own depot (TIC-23).
- **Filters:** Depot, Role (Tyre Incharge / Tyre Man); Reset.
- **Columns:** S.No, Employee ID, Name, Role, Depot, Skill, Phone, Experience, Status, Action. Person drawer + TLDC-style history tables.
- **Related:** Skills (7), Skill Approvals, Roster. 174 active records.

### HO-08 Maintenance Configuration — Jobs (`ho/maintenance-configuration`)
- **Purpose:** Define maintenance job types and their estimated time.
- **Role:** HO (direct in prototype; conflicts with audit-trail chain — Conf.).
- **Inputs:** Job Name *; Fleet Type * (e.g. Ashok Leyland Viking BS VI, Tata Motors Starbus Ultra, Eicher Skyline Pro); Estimated Time of Completion per Fleet (min) *; per Tyre (min) *.
- **Columns:** S.No, Job Code, Job Name, Fleet Type, Estimated Time of Completion per Fleet, per Tyre, Status, Action.
- **Actions:** + Create Job; View; Edit; Activate/Deactivate; Audit Trail; pagination; status filter. 12 jobs (10 active).
- **Related:** Skills, Schedules, Complaint Master (required jobs), Job cards.

### HO-09 Maintenance Configuration — Skills (`…--skills`)
- **Purpose:** Which skills a job requires, used for "Skill match" when assigning.
- **Inputs:** Required Skills * (checkboxes: Air Inflation, Tyre Rotation, Wheel Balancing, Tyre Fitment, Nail Removal, Retreading, Wheel Alignment).
- **Columns:** S.No, Job Code, Job Name, Fleet Type, Required Skills, Action. **Actions:** Edit Skills; Audit Trail.

### HO-10 Maintenance Configuration — Schedule Configuration (`…--schedule-configuration`)
- **Purpose:** Define recurring maintenance schedules (SCH001…).
- **Inputs:** Schedule Code; Category; Schedule Name *; Frequency * (Date Based / KM Based / Date and KM Based); Date Frequency * (No. of Days / Particular Date); No. of Days *; Particular Date *; KM * basis (Scheduled KM, Dead KM, Operated KM, Gross KM, Live Odo KM); KM Frequency * (every … km); Frequency Detail; Work Order Based? *; Outsource Employee Based? *; Due Date (days after assignment) *; Checklist Based? *; Effective From *; Number of Categories * (1–30). **Category builder** per category: Group-based (rule types Replace At KM / Inspect At KM / Service At KM with KM value), Checkpoint-based (name, response type Yes/No · Pass/Fail · Numeric · Text · Dropdown, description/mandatory/remarks required, failure action; 1–50 checkpoints), Checklist-based (existing checklist ID/name/version or create items), Description-based (label, mandatory, allow multiple), Job ID mapping (mapped job, mandatory).
- **Columns:** S.No, Schedule Code, Schedule Name, Category, Frequency, Job Code, Work Order Based, Outsource Employee Based, Effective From, Status, Action. Examples: "Every 2 days", "Every 30 days", "Every 120 days", "On the 15th and 30th of the month", "Operated KM · every 10,000 km", "every 2,500 km".
- **Actions:** + Create Schedule; View; Edit; Activate/Deactivate; Audit Trail; pagination.
- **Related:** Jobs, QC checklists, folios (group-based), Fleet groups. **Output:** Drives Schedule Planner and generated job cards.

### HO-11 Maintenance Configuration — PSI Norms (`…--psi-norms`)
- **Purpose:** Target tyre pressure by size, construction and wheel position, for regular and nitrogen air.
- **Inputs:** Tyre Size *, Construction Type * (Nylon/Radial), Regular (PSI) *, Nitrogen (PSI) *. Positions: Front (single), Rear outer (dual), Rear inner (dual).
- **Columns:** Tyre Size, Construction Type, Front (Regular, Nitrogen), Rear (Regular, Nitrogen), Action. **Actions:** + Add Norm; Edit; Audit Trail.
- **Output:** Shown to Tyre Man as "Air inflation norms"; tolerance band −15/+10 PSI.

### HO-12 Maintenance Configuration — Rotation & Discout Norms (`…--rotation-discout-norms`)
- **Inputs:** Rotation cadence (Operated days *, Operated KM *, Effective from *); Discout cadence (same); Eligible tyre grades for front tyres (New/A/B/C checkboxes *, Effective from *).
- **Columns:** Operated Days, Operated KM, Effective From. **Actions:** Edit (each block); Audit Trail.

### HO-13 Shift Master (`ho/shift-master`)
- **Columns:** Shift, Start, End, Status, Action. Morning 06:00–14:00, General 09:00–17:30, Evening 14:00–22:00, Night 22:00–06:00. **Actions:** Edit, Retire. Note: "Editing here changes what Shift Posting can roster next — existing rosters are untouched."

### HO-14 Tyre Complaint Master (`ho/complaint-master`)
- **Purpose:** Complaint codes and the jobs each requires.
- **Inputs:** Complaint Code; Complaint Name *; Required Jobs (JOB-001…JOB-011 checkboxes).
- **Columns:** S.No, Complaint Code, Complaint Name, Required Jobs, Status, Action. Filter by Required job. 67 complaint rows, all Active; 44 of them show "Not linked" (no required job set). Categories visible in names: Wear, Tread/condition, Vehicle & Operations.
- **Actions:** + Create Complaint; Edit; Activate/Deactivate (confirm); Audit Trail.
- **Output:** Selecting a complaint on a job creates its required jobs (Removal, Fitment, Setting, Unsetting, Air Inflation …).

### HO-15 Reason Master (`ho/reason-master`)
- **Purpose:** Reasons used for Hold, Reschedule, Replace, Missed/not done, Send back; includes whether a reason **pauses the schedule**.
- **Inputs:** Reason *; Used for * (checkboxes); Pauses the schedule * (Yes/No).
- **Two panes:** *New reasons from depots* — Request No, Reason entered, Used for, Depot, Raised by, Raised at, Status, Action → **Add to list** (set Pauses schedule) or **Reject** (reason *); *Reasons* — S.No, Reason ID, Reason, Used for, Pauses schedule, Status, Action (Edit, Deactivate, Audit Trail).
- **Filters:** Used for, Status, Search.

### HO-16 Reject Reason Master (`ho/drn-reason-master`) — pattern P1
- Reasons used when rejecting items at GRN/DRN. **Inputs:** Reject reason *. **Columns:** S.No, Reason ID, Reject reason, Status, Action.

### HO-17 Wear Pattern Master (`ho/wear-pattern-master`) — pattern P1
- Wear patterns offered during Census. **Inputs:** Wear pattern *. **Columns:** S.No, Pattern ID, Wear pattern, Status, Action. 10 records. Values seen: Even wear, Centre wear, Both-shoulder wear, One-side shoulder wear, Cupping/scalloping, Feathering, Heel and toe wear, Flat spot.

### HO-18 QC Master (`ho/qc-master`) — pattern P1
- Final-inspection checklists per job type. **Inputs:** Job type * (Air Inflation, Air Inflation — Nitrogen, Inspection, Tyre Rotation, Tyre Discout, Census, Tyre Changing, Tyre Removal, Tyre Fitment, Tyre Setting, Tyre Unsetting); Checklist items * (+ Add item). **Columns:** S.No, QC ID, Job type, Checklist items, Status, Action.

### HO-19 Expected Life KM (`ho/expected-life-km`) — pattern P1
- Expected life by tyre size. **Inputs (all *):** Tyre size, New (KM), RT1…RT5 (KM). **Columns:** Tyre size, New, RT1, RT2, RT3, RT4, RT5, Status, Action. Pagination.
- **Output:** Norm Km used in Premature Failure analysis.

### HO-20 Purchase Indent (`ho/purchase-indent`)
- **Purpose:** Raise purchase requests to Central Store.
- **Inputs:** Indent Type * (Supplementary Indent, (AWR) Indent, Emergency Indent); Folio Group; Indent Date; Indent To (Central Store, Depot Store, All); Required For; Requested By; Remarks; item grid.
- **Columns (list):** S.No, Indent No, Indent Date & Time, Indent Type, Folio Group, Source, Requested By, Status, Action. **Item grid:** S.No, Folio ID, Nomenclature, Specification, UOM, HSN Code, Product Group, Unit, Minimum Stock, Class, Average Month, Prev 1 Mon, Prev 3 Month Cons, Prev 6 Mons, Prev 12 Mons, MSQ Basis, CS Stock, Max Stock, D.Store Stock, TRS, Total, Order Qty, Receive Qty, Pending PO, Pending Qty, Prev PO No, Prev PO Date, Requested Qty, Unit Amount, GST %.
- **Actions:** Raise Indent; View; Edit (reverted ones); Workflow (view diagram); Export. **Statuses:** Pending Approval, Reverted, Issued.

### HO-21 Allocation Requests (`ho/allocation-requests`)
- **Columns:** S.No, Request No, Allocation Date & Time, Allocation Type, Allocate From, Allocated By, Allocated to Depot / Unit, Items, Status, Action. **Actions:** Stock (view allocable stock). Runtime: allocate quantity per depot (error "Enter a quantity for at least one depot"); AE approves ("goes to Central Store"). *Conf.:* creation form not visible.

### HO-22 Maintenance Pending (`ho/maintenance-pending`)
- **Purpose:** Depot-wise count of pending maintenance. **Filters:** Month; Maintenance type (Tyre Rotation, Tyre Discout, Air Inflation, Inspection, Census). **Columns:** Depot + per-type pending counts. Read-only.

---

## 2. AE (HO Technical) — 12 screens

### AE-01 Tyre Folio approvals (`ae/tyre-folio`) — P1 (checker)
- **Columns:** Folio ID, Folio Name, Specification, Make, Makers model, Construction Type, Tube Type, Ply, Size, Status, Action. **Filter:** All / Pending approval / Approved / Returned. **Actions:** View; Approve; Return (reason *); Approve selected; Return selected; Audit Trail; pagination.

### AE-02 Norm Master (`ae/norm-master`)
- **Title:** HO Norm Master. **Columns:** Tyre Size, Construction Type, Front (Regular, Nitrogen), Rear (Regular, Nitrogen). **Read-only** — no approve buttons although the Tyre Man norms screen says "approved by AE" (Conf.).

### AE-03 Fleet Register + air-type requests (`ae/fleet-master`, `--air-type-requests-1`)
- Same table as HO-03, read-only; request tab with **Approve** (confirm) / **Return** (reason *). Fleet drawer lists tyres.

### AE-04 Rotation & Discout Norms (`ae/rotation-discout-norms`) — read-only view of HO-12 values plus fleet drawer.

### AE-05 Expected Life KM approvals (`ae/expected-life-km`) — P1 checker. View shows all tyre-size KM; Approve / Return (single and multiple), Audit Trail.

### AE-06 Maintenance Configuration (`ae/maintenance-configuration`, `--schedule-configuration`, `--skills`) — **view-only** of Jobs, Skills, Schedules with View modal and Audit Trail (no approve/return controls). Conf.: see Q3.

### AE-07 Reject Reason approvals (`ae/drn-reason-master`), AE-08 Wear Pattern approvals (`ae/wear-pattern-master`), AE-09 QC approvals (`ae/qc-master`) — P1 checker with Approve selected / Return selected, per-row Approve / Return, View/Audit Trail.

### AE-10 Purchase Indent approvals (`ae/purchase-indent`)
- **Columns:** S.No, Indent No, Indent Date & Time, Indent Type, Folio Group, Source, Requested By, **Total Qty, Total Net Amount**, Status, Action. **Actions:** View; **Approve** (confirm); **Revert** (reason *). Statuses: Pending Approval, Reverted, Issued.

### AE-11 Allocation Requests (`ae/allocation-requests`) — list as HO-21; Approve ("This allocation request goes to Central Store"), Reject needs reason ("Reason is required").

### AE-12 Maintenance Pending (`ae/maintenance-pending`) — same as HO-22.

---

## 3. Supervisor — 9 screens

### SUP-01 Job Card Register (`sup/job-management`) — same screen as TIC-02 (see below). Differences: same action set in the prototype (New Job Card, Assign selected, Replace selected, Reschedule, On behalf, Hold reason, Final inspection).

### SUP-02 Log Sheet Complaints (`sup/log-sheet-complaints`)
- **Purpose:** Record complaints a driver wrote on the daily log sheet; they feed the Complaints queue.
- **Inputs:** Fleet No. *; Shift (Morning, General, Evening, Night); Driver name *; Driver Emp ID; Route; Run KM (today); Shed-in time; Wheel / Tyre (General or FR, FL, RRI, RRO, RLI, RLO); Complaint type * (12 types); Remarks (what the driver wrote).
- **Tables:** Logged complaints — ID, Fleet, Driver, Shift, Wheel, Complaint, Logged at, Action; Due — ID, Fleet, Driver, Shift, Wheel, Complaint, Logged at, Due.
- **Actions:** + Log Sheet Complaint; Save to Complaints. **Output:** New complaint with source "Log Sheet" for the TIC.

### SUP-03 Grouping Approvals (`sup/grouping-approvals`)
- Approve (confirm) / Return (reason *) fleet-group changes raised by the TIC; Audit Trail. Pending items seen: INS B (Inspection), Air B (Air Inflation).

### SUP-04 Roster Approvals (`sup/roster-approvals`)
- **Columns:** Week, Raised by, Sent at, Tyre men, Status, Action. Roster view: Tyre man × 7 days. Approve / Return (reason *); Audit Trail. Statuses: Posted, Pending approval.

### SUP-05 Skill Approvals (`sup/skill-approvals`)
- **Columns:** Request ID, Tyre man, Skill to add, Remarks, Raised, Status, Action. Approve / Return (reason *).

### SUP-06 GIN Approvals (`sup/gin-approvals`) — P2
- **Columns:** S.No, GIN No, GIN Date & Time, Transfer No, From Depot / Unit, To Depot / Unit, Items, Requested By, Status, Action. **GIN document columns:** S.No, Folio ID, Folio Name, Specification, MTC No, Manufacturer No, Make, Makers Model, Size, Construction Type, Tube Type, UOM, Requested Qty, Issued Qty, Unit Price, Net Amount, Remarks. **Statuses:** Draft, Awaiting approval, Reverted, Approved, Rejected, In transit, Received, Cancelled.

### SUP-07 Indent Approvals (`sup/indent-approvals`) — P2
- **Columns:** S.No, Indent No, Indent Date, Depot / Unit, Indent Type, Total Qty, Requested By, Status, Action. **Indent document columns:** S.No, Folio ID, Folio Name, Specification, Size, Construction Type, Tube Type, UOM, Depot Stock, Min Stock, Maximum Stock, Request Qty, Issued Qty, Unit Price, Net Amount, Remarks.

### SUP-08 Fleet Master (`sup/fleet-master`) — same as TIC-22 (depot fleet register with schedule history, Change Status, air-type conversion, fleet tyre view, unresolved job cards).

### SUP-09 Tyre Register (`sup/tyre-master`) — depot tyre list with size summary (Size, Fitted, Live stock, At TRS, At MIC Vehicle, Total) and detailed 40-column table (adds Expected Life KM, Recent Census). Filters: Depot (33), Status, Grade, Size, Make, Construction Type, Bus model. TLDC drawer (P3).

---

## 4. Tyre Incharge (TIC) — 25 screens

### TIC-01 Dashboard (`tic/dashboard`) — "Dashboard — Sun 20 Sep 2026"
- **KPI tiles:** Fleets in service (70) · Tyres tracked (535) · Today's compliance (50%) · Open complaints (2) · Overdue jobs (7) · PSI exceptions (3).
- **Stock — Mandaveli (tyres):** Good (Set / Unset), Repair (Ready for Transit), In Transit, Fitted, At TRS (Idle / In Production / Unfit / Condemn), At MIC, At Other Depots. **Table:** Material (Tube/Flap/Disc) × Good, Set, Unset, Repair, Fitted.
- **Pending actions:** GRN ready to receive · Internal Transfer requests (New) · WSR requests (Requested) · Removal Orders awaiting GRN · Approved GINs for a gate pass · Depot Indents reverted · Premature Failure report requests (Sent to Depot) · Tyre Damage reports to fill (Approved) · Low stock folios.
- **Low stock table:** Folio ID, Folio Name, Available, Minimum, Backorder → "Raise a Depot Indent".
- **Compliance today:** Tyre Rotation, Tyre Discout, etc.; **Float:** by status and by grade; **Complaints top types**; **Top tyre sizes held.**
- **Actions:** each tile and pending item deep-links to its screen. Read-only otherwise.

### TIC-02 Job Card Register (`tic/job-management`, `sup/job-management`)
- **Purpose:** Central register to create, assign, replace, reschedule, hold, finish and inspect all job cards; includes scheduled rounds.
- **Tabs:** *Job cards* and *Scheduled rounds* (per work type monthly/fleet-wise grids: Group × days 1–30 with Sched., On time, Late, Pending, Upcoming, Done %; Day × days 1–30 totals).
- **Filters:** From, To, Work category (Air Inflation, Air Inflation — Nitrogen, Inspection, Tyre Rotation, Tyre Discout, Census, Tyre Changing, Tyre Removal, Tyre Fitment, Tyre Setting, Tyre Unsetting), Source (Scheduled / Complaint / Reactive), Fleet availability (In depot / Out / Breakdown / Held up), Shift (AM / General / PM / Night), Status, Global search, Date, Month.
- **Columns:** S.No, Job Card Number, Fleet Number, Work Category, Assigned Technicians, Status, Action. **Status values:** Not Assigned, Assigned, In Progress, On Hold, Awaiting WSR, Awaiting final inspection, Rework, Closed, Cancelled.
- **Actions:** + New Job Card; Assign selected; Replace selected; Reschedule; Open; On behalf; Hold reason; Final inspection; View late / overdue; Rotation & Discout Norms; Air Inflation Norms; ⇩ Export CSV; pagination.
- **Modals:** New Job Card (Vehicle Source Type; Fleet Number *; Register Number; Tyre Number *; Job Type *; Expected Completion Date; Complaint Category; Complaint; Job Code; Job *; Tyre size *; Live stock Good Unset tyre *; Tube; Flap; Disc; Live stock Good Set tyre to unset *; Instruction; Due date *; Due shift *; Assign to *) · Assign / Replace / Add / Reschedule (Due date *, Due shift *, Assign to *, New date *, Reason *) with a **review-then-confirm step** ("Confirm · replace 30 job cards") · Cancel job card (Reason *) · On behalf (Removed at *, Odometer *, NSD at removal *, Tyre condition, Fitment tyre *, Fitted at *, Pressure after fitment *, Photo, WSR reason *, Reason for entering on behalf *) · On hold (view reason) · Raise WSR · Job card view (S.No, Job ID, Fleet No, Tyre No, Position, Job, Removal reason, Tube·Flap·Disc, Assigned to, Remarks, Complaint, Status, Action; Print) · Final inspection (QC checklist per job type, submit confirm) · Audit Trail.
- **Assign-to list** shows each person's skills, "Skill match", "On leave", and contractor vs direct for outsource staff.
- **Validations:** Select at least one job card; Select a Work Type; due date/shift/assignee required; hold reason required ("Enter the held-up reason."); cancel needs reason; replace-for-today needs "Replace with" + shift.
- **Related master:** Jobs, Skills, Complaint master, QC, Shift, Tyre Man, Outsource Employee, Fleet, Tyre/Folio. **Transactions:** Complaints, WSR, GIN, Removal/Fitment Orders. **Output:** Job cards and Job IDs visible to assigned tyre men.

### TIC-03 Complaints (`tic/complaints`)
- **Purpose:** Triage complaints from Air Inflation rounds, Inspection, Log Sheet and Tyre Incharge.
- **Filters:** Source (All, Air Inflation, Inspection, Log Sheet, Tyre Incharge); Status (All, New, Assigned, Closed, Rejected). **Columns:** Complaint ID, Source, Fleet, Position, Tyre No., Complaint Code, Suggested Job Codes, Raised by, Raised at, Job ref, Status, Action.
- **Actions:** **Review & assign** (Decision * Approve/Reject, Job *, Due date *, Due shift *, Assign to *); Reject (confirm); Select Removal Fleet (Fleet No., Registration, Tyre Size, Model, Status); multi-select. Validations: "Select at least one complaint", "Approve or reject every complaint". Closing a complaint toasts "Complaint … closed". **Output:** Job card(s) created from complaint.

### TIC-04 Schedule Planner (`tic/schedule-planner`, `--schedule-setup`, `--schedule-chart`, `--pending`)
- **Purpose:** Plan recurring rounds and see what falls on each day.
- **Tabs:** Calendar (S.No, Date, Air Inflation, Inspection, Tyre Rotation, Tyre Discout, Census, Fleets, Job cards, Status, Action; statuses Completed, Not Assigned, Overdue, Today) · Schedule setup (S.No, Schedule Code, Schedule Name, Frequency, Job Code, Work Order Based, Outsource Employee Based, Effective From, Groups, Status, Action) · Schedule chart · Pending (Depot; Group, Fleets, Tyres, Approval).
- **Filters:** Search, Month, Date, Schedule (All, Air Inflation, Inspection, Tyre Rotation, Tyre Discout, Census), Status (Not Assigned, Assigned, Completed).
- **Actions:** View a day (Schedule Code, Schedule Name, Group, Fleet, Fleets, Tyres, Job cards, Status, Action; View fleets; Open in Job Card Register); Assign (Due shift *, Tyre men * multi-select) ; Create job card (Maintenance type: Air Inflation, Inspection, Tyre Rotation, Tyre Discout, Tyre Change, Tyre Setting, Tyre Unsetting, Census, Tyre Removal); Bulk schedule (Job type, From, To → View schedule; printable per-day fleet list with FR FL RRI RRO RLI RLO columns); first-schedule-date per group; Create Group; Deactivate. Validation: "Select a schedule first."

### TIC-05 Fleet Grouping (`tic/group-master`)
- **Purpose:** Group fleets into rounds (Air A/B, Nitrogen A, INS A/B) for Air Inflation, Nitrogen and Inspection schedules.
- **Filters:** Schedule (SCH001 Air Inflation, SCH002 Air Inflation — Nitrogen, SCH003 Inspection), Search name.
- **Inputs:** Create fleet group — Group name; Job type; fleet picker filtered by Model type / Tyre size / Air type; **Reason for change ***. Edit groups → **Send for Approval** (note field). Withdraw (reason *).
- **Columns (group members):** S.No, Fleet No, Reg No, Model type, Size, Air type. **Statuses:** Approved, Pending approval. Approver: Supervisor (SUP-03).

### TIC-06 My Jobs (`tic/my-jobs`)
- **Purpose:** TIC's own job cards (the TIC can also be assigned work; roster shows "Tyre Incharge · all tyre work").
- **Filters:** From, To, Status (Assigned, In Progress, On Hold, Completed). **Columns:** Job Card No, Maintenance Type, Fleet / Tyre, Job IDs, Date, Status, Action. Execution modals mirror the Tyre Man screens (Tyre Changing, Census, Hold, Raise complaint, Set tyre not available) — see TM-04.

### TIC-07 Duty Posting (`tic/duty-posting`)
- **Purpose:** Post the weekly roster of tyre men to shifts, then send for Supervisor approval. Page shows a start-Inspection prompt; roster availability limited to Sep–Dec 2026. *Conf.:* the roster grid itself is not rendered in the snapshot; Supervisor's Roster Approvals shows the week × tyre-man matrix to reproduce.

### TIC-08 Depot Indent (`tic/other-depot-tyre`) and TIC-09 Internal Transfer Request (`tic/internal-transfer-request`)
- **Purpose:** Request material from Central Store / other depots / TRS (Depot Indent), and handle requests *received* from other depots (Internal Transfer Request). Same document engine, two views.
- **Create Indent inputs:** Indent Type *; Material Type * (New, Tyre); Indent No; Indent Date *; From Depot / Unit *; Request To * (Material CS, TRS Chrompet, TRS Tondiarpet, K.K. Nagar, Anna Nagar, T. Nagar, Saidapet, Tambaram, Vyasarpadi, Thiruvanmiyur); Requested By *; Required For; Remarks; item grid (folio, qty).
- **Columns (Indent):** S.No, Indent No, Indent Date, From Depot / Unit → Request To, Indent Type, Total Qty, Requested By, Status, Action. **(Internal transfer):** S.No, Request ID, Request Date, From Depot / Unit, Material, Total Qty, Requested By, Status, Action.
- **Filters:** Status — Draft, Awaiting approval, Reverted, Sent, New, Accepted, In transit, Partly issued, Partly received, Issued, Received, Rejected, Cancelled.
- **Actions:** + Create Indent; Edit; Delete; Send for Approval; Withdraw (reason); Cancel (reason); Close indent (reason); Reject (reason); **Accept & Create GIN →**; **Receive in GRN →**; **Log arrival** (log an other-depot tyre that arrived: Tyre No. *, Makers No., From Depot *, GRN No., Size, Make, Grade [New/A/B/C], On our fleet, Reason present here *).
- **Approver:** Supervisor (SUP-07). **Related:** Folio, Depot list, GIN, GRN.

### TIC-10 GIN (`tic/gin`)
- **Purpose:** Goods Issue Note for tyres leaving the depot (to TRS retreading, other depot, MIC vehicle).
- **Columns:** S.No, GIN No, GIN Date & Time, GIN Type, Request ID, From Depot / Unit, To Depot / Unit, Items, Requested By, Status, Action. **Tyre line columns:** S.No, Tyre No, Manufacturer No, Size, Make, Makers Model, Grade, Tyre Condition, Recent Census, No of Groove.
- **Inputs (Create GIN):** Destination * (TRS — Retreading Unit, Other depot, MIC Vehicle); Depot *; Indent No *; Indent items; Reason *; Tyres * (select specific tyres); Issue qty *.
- **Actions:** Create GIN; Save as Draft; Send for Approval; Withdraw; Cancel (reason *); Delete; View; Print GIN; **Create Gate Pass →**.
- **Statuses:** Draft, Awaiting approval, Reverted, Approved, Rejected, In transit, Received, Cancelled.

### TIC-11 WSR Issue GIN (`tic/wsr-issue-gin`)
- GIN generated when a WSR is issued. **Columns:** S.No, GIN Number, GIN Date & Time, WSR No, Items, Requested By, Issued By, Status, Action. Statuses: Draft, Created, Awaiting approval, Approved, Rejected. Tyre-man-raised WSR GINs are **auto-created, no approval**.

### TIC-12 GRN (`tic/grn`) and TIC-13 Material Return Note – GRN (`tic/material-return-grn`)
- **Purpose:** Receive tyres back from TRS, other depots or MIC vehicles; accept or reject per tyre.
- **Filter:** From (All, TRS — Retreading Unit, Other depot, MIC Vehicle). **Columns:** S.No, From Depot / Unit, GRN No, GRN Date & Time, Source, Received Qty, Accepted Qty, Rejected Qty, Value, Status, Action (MRN: S.No, GRN No, Source, GRN Date & Time, Requested By, Requested To, Issued Qty, Accepted Qty, Rejected Qty, Status, Action). Statuses: Ready to receive, Received.
- **Receive modals:** *Receive tyres* — Received date & time *; per tyre Accept / Reject (GRN) or Accept / **Discrepancy** (MRN) with Discrepancy reason * (Tyre missing from shipment, Wrong tyre sent, Casing damaged, Grade variance) and Remarks; *Receive from MIC Vehicle* — Received date & time *, Removed tyre No *, Fleet No *, Returned as (Returned unused / Fitted on road — removed tyre returned); *Receive — RO-#/MRN-#* — **Goes To *** (Live stock / Ready for Transit / DRN) for each removed tyre with Removal Reason, Wear Pattern, NSD; review-then-confirm step.
- **Document:** Goods Receipt Note columns (…Batch No, Requested / Received / Accepted / Rejected Qty, Unit Price, Net Amount, Remarks). Print GRN; Audit Trail; TLDC.

### TIC-14 Scrap Return Note (`tic/scrap-return-note`)
- Scrap items returned to store. Table: S.No, Tyre No, Status. Validation: "Add at least one scrap item with a quantity". Toast "Scrap return received".

### TIC-15 WSR List (`tic/wsr`) and Gate Pass "Raise WSR"
- **Purpose:** Material (tube, flap, disc) requests from tyre men; TIC accepts and issues from live stock.
- **Filters:** Status (Requested, Partly Issued, Issued, Rejected, Cancelled), Material (Tube, Flap, Disc). **Columns:** S.No, WSR No, WSR Date & Time, Job Card No, Fleet No, Status, Action.
- **Raise WSR:** Job card · Job ID * (job cards on hold flagged "raise again when the work resumes"); Assigned to *; Items * (tube by tyre size + qty, flap by rim size + qty, disc by rim size + qty; "+ Add tube/flap/disc"). **Accept & Issue:** per item "Item No (Live stock) *" picker (e.g. TB-1020-021, FP-20-019), unit price, net amount. **Reject / Cancel** need reason. Print WSR.

### TIC-16 DRN (`tic/warranty-drn`)
- **Purpose:** Discrepancy / warranty return note raised against supplier or TRS.
- **Inputs:** DRN No; DRN Date *; Issued By *; From Depot / Unit *; To Depot / Unit * (TRS Chrompet, TRS Tondiarpet); Remarks; tyre picker (search MTC No, Manufacturer No, Make).
- **Columns:** S.No, DRN No, DRN Date, Issued By, From Depot / Unit, To Depot / Unit, Total Qty, Status, Action. Line columns: S.No, MTC No, Manufacturer No, Folio ID, Folio Name, Specification, Make, Makers Model, Size, Construction Type, Tube Type, Ply, Purchase Date, Manufactured Date, Warranty Upto, Remarks.
- **Actions:** + Create DRN; Save Draft; Submit (confirm); View/Print; Export. Statuses: Pending, Approved, Rejected. Filters: Status, From Date, To Date. *Conf.:* who approves.

### TIC-17 Gate Pass (`tic/gate-pass`)
- **Purpose:** Authorise physical movement of goods out of / into the depot, with security exit check.
- **Create inputs:** Movement type * (Internal Transfer GIN (Outward), MRN (Outward), Goods Receipt Note (Inward), Central Store GIN (Inward)); source reference; Vehicle Name *; Driver Name *; Phone No *; Odo KM; or Fleet No *, Registration Number; or Employee ID *, Employee Name, Phone No; or Employee Type *, Person Name *, Phone Number *.
- **Columns:** S.No, Gate Pass No, Gate Pass Date & Time, Type, Source Reference, From, To, Items, Total Qty, Total Value, Vehicle / Driver, Status, Action. Statuses: Issued, Exited, Received, Cancelled; types Outward / Inward.
- **Actions:** + Create Gate Pass; Mark Exit (Exit date & time *, Checked by (Security) *, Odo KM); Cancel (reason *); Print. **Effect:** issuing a pass moves its GIN to "In transit".

### TIC-18 Live Tyre Stock (`tic/tyre`)
- **Purpose:** What the depot holds now. **Tabs:** Tyre · Tube · Flap · Disc, each with Summary and Detailed views; Good / Repair sub-tabs.
- **Summary columns:** S.No, Folio ID, Folio Name, Product Group, Specification, UOM, Available Stock, Minimum Stk, Maximum Stock, Total Qty, Backorder Qty, Weighted Average Rate, Stock Value, Status (Healthy / Low Stock), Action. **Detailed:** 40-column tyre table (as HO-05). **Tube/Flap/Disc detail:** S.No, Folio ID, Folio Name, Specification, Tube/Flap/Disc No, Size, Make, Condition (New, Serviced, Injured), Received date, Stock Status, Setting Status (Set/Unset), Tyre No, Fleet, Position, Fitted date, Action.
- **Filters:** Product Group, Status, Setting Status (Set/Unset), Grade, Size, Make, Construction Type, Bus model, Condition, Status (Ready for Transit / In Transit).
- **Actions:** View; Ledger (ICRN / GIN / GRN / WSR, Date & Time, Tyre Inward/Outward, MTC No, Make, Makers Model, Inward Qty, Outward Qty, Balance, Remarks); Folio Stock Details (by depot / unit); **+ Create Job Card**; **Create GIN (TRS)**; Export CSV; TLDC.

### TIC-19 Tyre Register (`tic/tyre-register`)
- **Purpose:** Complete register including fitted tyres and tyres away from the depot.
- **Tabs:** Fitted · At TRS · At MIC · At Other Depots; product tabs Tyre · Tube · Flap · Disc; Summary / Detailed / History.
- **Summary columns:** S.No, Folio ID, Folio Name, Product Group, Specification, UOM, Fitted, Required, Want of Tyre (Tube/Flap/Disc), Minimum Stk, Maximum Stock, Weighted Average Rate, Stock Value, Status, Action. **History:** Date & Time, Removal Order / Fitment Order, Indent No, Tyre No, Make, Makers Model, Activity, Fleet, Position, Inward Qty, Outward Qty, Balance, Remarks (filter by fleet). **Ledger and Fleet Movement** per tyre.
- **Filters:** Status (Fitted, Set, Unset, At MIC, At TRS), Grade, Size, Make, Construction Type, Bus model. Export CSV. Seed-data flag "Tyres without a size" / "Size missing".

### TIC-20 Premature Failure Reports (`tic/premature-failure`)
- **Purpose:** Report tyres that failed before the norm and compute the loss.
- **Tabs:** Reports · Requests from TRS. **Columns (reports):** S.No, Report No, Date, MTC No, Manufacturer No, Folio ID, Folio Name, Specification, Make, Makers Model, Size, Construction Type, Tube Type, Bus No, Km Run, Norm Km, Loss ₹, Fault On, Request No, Status, Action. **Columns (requests):** S.No, Request No, Date, MTC No, …, Reason, Status, Report No, Action.
- **Form (+ New Report / Raise Report):** MTC Tyre No *; Make/Pattern; Size/Construction; Manufacturer No; New/RT; Fitted Date; Km Run; No. of Rotation; Norm Km; Tyre Price (₹); Remaining Km; Loss Amount (₹); Bus No *; Failure Date *; Failed Tyre Position *; Tyre Skid Depth (mm) *; Type of Damage *; No. of Disc Out; Reason for Tyre Damage *; Depot Tyre Incharge Remarks; Fault On *; Employee ID *; Name · Designation. Prefilled fields come from the tyre's life history.
- **Statuses:** Report Raised, Pending TRS IC, Sent to TRS, Sent to Depot, Returned. Print, Audit Trail, TLDC.

### TIC-21 Tyre Damage Reports (`tic/damage-reports`)
- **Columns:** S.No, Request No, Date & Time, Job Card No, MTC No, Manufacturer No, Folio ID, Folio Name, Specification, Make, Makers Model, Size, Construction Type, Tube Type, Km Run, Fleet No, Injury, Request Reason, Requested By, Status, Action. **Actions:** View; **Fill Report** (when Approved); Print. Statuses: Report Received, Approved, Pending approval, Returned.

### TIC-22 Fleet Register (`tic/fleet-master`, `--air-type-requests`; `sup/fleet-master`)
- **Columns:** S.No, Fleet No, Reg Number, Type, Current KM, FC Status, Status, Location / Company, Actions. **Filter:** All Records, Monthly / Weekly / Daily / Schedule-3 / FC / HFC Schedule, Oil Top-Up, Coolant Top-Up, Tyre Rotation. **Status pills:** Operation, Breakdown, Depot Maint., External Maintenance, Spare, Depot Workshop Fleet, Loan Vehicle; FC (fitness) Valid/Due/Overdue by month, HFC Due.
- **Actions:** Export; View All; **Change Status** (reason required when Held up); Fleet Tyre View (Position, Tyre No, Size, NSD, Tyre Condition, Fitted Date, Fitted KM, Total KM, No of Days Fitted, Grade); Job cards / Unresolved job cards with reassign (New assignee *, Reason *, New date *, Due date *, Due shift *); Job card created / created-and-assigned confirmations; **Raise a conversion request** (Fleets to convert, Convert to Nitrogen/Regular, Reason *; "Submit to HO (Technical)"); Close.

### TIC-23 Tyre Man Register (`tic/tyre-man-master`)
- **Tabs:** Employees (S.No, Employee ID, Name, Role, Depot, Skill, Phone, Experience, Status, Action) · Skill requests (Request ID, Tyre man, Skill to add, Remarks, Raised, Status, Action). **Actions:** + Skill → Add skill (checkbox list of skills not yet held, Remarks) → Send for Approval; Withdraw (reason); Reset; person drawer. Approver: Supervisor (SUP-05).

### TIC-24 Outsource Employee (`tic/outsource-employee`)
- **Inputs:** Employee name *; Phone number * (10-digit); Aadhaar number *; Work order * (Through contractor / Direct · no contractor); Contractor name *; Address *; Educational qualification (ITI — Automobile, Diploma — Mechanical Engg, 12th Std, ITI — Tyre & Rubber Tech, Diploma — Automobile Engg); Skill (7 checkboxes); Status (Active / Inactive).
- **Columns:** S.No, Employee ID (OSE-001…), Name, Work order, Phone, Aadhaar No., Address, Educational qualification, Skill, Status, Action. **Actions:** + Add Employee; Edit; **Remove Employee** (reason *; "removes the record from the technician picker; existing job cards keep the name"); Reset; Status filter.

### TIC-25 Notifications (`tic/notifications`)
- **Columns:** S.No, Received, Type, Reference, Details, From, Action (Open). **Tabs:** All · Approvals · Job cards · Complaints · Indents · Movements. **Types seen:** WSR approval, New complaint, Indent received, Final inspection pending, Rework, Returned.

---

## 5. Tyre Man (mobile) — 14 screens

Common header: MTC · Depot Tyre, user chip (name · TM-id · depot), persona switcher, 🔔 bell with count, language toggle (தமிழ்/English), Sign out. Bottom navigation: My Jobs · Duty & Shift · My WSR (+ GRN · MRN · SRN for some personas).

### TM-01 My Jobs (`tm/my-jobs`)
- Header "My Jobs · 20 Sep 2026 · Today · Shift PM (2 PM – 10 PM)". Quick buttons: **⌗ Scan fleet QR · ⌗ Scan tyre · 📦 Request Material (WSR) · 🗓 Request Prepone / Postpone.** Status chips: All · Not started · In progress · On hold · Rework · Done. Cards: job type, job card no, fleet · position · step · shift, status (Assigned / Pending approval / Overdue · 1d). Examples: Tyre Changing JC-6063 J0264 FR; Tyre Setting JC-ST-2609-20-01; Tyre Unsetting JC-US-2609-20-01; Census "70 job cards".

### TM-02 Round list (`tm/round-AIR|AIRN|INSP|ROT|DO|CENSUS`)
- Round header (e.g. "Air Inflation · Air B · Night shift · Air type Regular · Job cards 15 · one per fleet · 5/15 done"); **📏 PSI norms** link; list of fleets (Fleet No, Reg No, size, job card no, state Done / n/6 tyres / Not started / Rework). Census round lists 70 job cards; tyre men shown for the round.

### TM-03 Fleet execution (`tm/fleet-AIR|AIRN|INSP|ROT|DO|CENSUS`)
- **Air Inflation / Nitrogen:** Fleet header (reg, size, air type, target PSI front/rear from HO norms, job card, route, assigned to, status/started time); per tyre FR/FL/RRI/RRO/RLI/RLO (tyre no, NSD, New/RT level) with **Present (found)** PSI and **Inflated to** PSI, flag ⚠, per-tyre **Complaint type** (12 options) and Remarks; **CIRT Checklist** (Vehicle parked on level surface *, Check for visible tyre damage/bulge, Check current pressure with calibrated gauge — Yes/No); buttons **⚠ Raise a complaint on this fleet**, **Hold job**, **Save & next fleet**, **Back to fleet list**; completion popups "Fleet saved" (Next fleet / Back to round).
- **Inspection:** per tyre check; "No issues — complete inspection"; **Defect on tyre** → Complaint type *, Remarks, Photo (optional).
- **Rotation:** two Job IDs ("FR → FL (due tyre)", "FL → FR (partner)"), **Odometer (km) ***, Start rotation → Complete rotation, Hold job. **Discout:** same pattern, **Powder applied**, Start/Complete discout.
- **Census:** per tyre NSD (mm) * (4 or 5 grooves → 4 or 5 readings), **Wear pattern *** (8 options), Current NSD shown, remarks; Complete census, Hold job.
- **Hold modal:** Reason * (Moved to an urgent job, Fleet left the depot, Set tyre not available, Tube / flap / disc not available, Equipment down, Shift ended, Other (see remarks)), Remarks.

### TM-04 Tyre Changing job (`tm/job-TC`, `--aja`)
- Job card header (JC no, fleet, position, complaint CMPID, due, shift) and four ordered **Job IDs**: 1·Removal → 2·Unsetting → 3·Setting → 4·Fitment, each with assignee, status and next action (Start removal / Start unsetting / Start setting / Receive GIN / Start fitment). Removal records the tyre coming off; "Removal Order is made when the removal is complete; Tyre IC decides Goes To at GRN". Setting shows WSR (tube/flap/disc) and the auto WSR Issue GIN. Fitment shows Fitment Order, "Waiting for Setting", and **Set tyre not available** (raises a complaint and holds). **Raise extra WSR** available after work starts. Fields on the execute modal: Removed at *, Odometer *, NSD at removal (mm) *, Tyre condition (Worn beyond limit, Cut / damage, Burst, Other), Photo, Fitment tyre * (live stock Good Set), Fitted at *, Pressure after fitment (PSI) *, WSR reason *.

### TM-05 Tyre Setting (`tm/job-ST`) and TM-06 Tyre Unsetting (`tm/job-US`)
- Setting: tyre (e.g. EX260003 New, "Stock Reserved for this job"), tube/flap given by TIC, disc "Not given" → **Raise WSR · disc**; outcome "Live stock Good Set". Unsetting: tyre, tube/flap/disc "go to Repair, selected by TIC"; outcome "Unset · stays in Repair (Ready for Transit)". Both: Start → Complete, Hold job.

### TM-07 Monthly view (`tm/month-ROT`, `tm/month-DO`)
- Schedule SCH004/SCH005 "every 30 days", month grouped by week (Week 1 1–7 Sep …), each fleet with job card, due date, state (Done / Overdue / Not started). Progress "Done 6 / 12".

### TM-08 Duty & Shift (`tm/duty-shift`)
- Today's shift and posting ("Shift crew · PM (Tyre Changing, Setting, Unsetting)"), **Attendance (HRMS)** status, **My roster** for the week with approval stamp ("Approved by S. Rajendran (SUP)"), next-week status, **Shift change requests** list (SCR-018 Pending approval PM → General), buttons **Request a shift change** (Change to *, From *, To *, Reason *) and **Apply leave** (Leave type * Casual / Sick / Earned, From *, To *, Reason *), week off, Leave.

### TM-09 My WSR (`tm/my-wsr`) — list of own WSRs (WSR no, raised time, job card, fleet, status Requested / Issued / Cancelled, linked GIN) with **📦 Request Material (WSR)** (Raise WSR: items table Folio Name, Specification, Requested Qty).

### TM-10 Air inflation norms (`tm/norms`) — read-only table by size × construction × wheel position, Regular / Nitrogen PSI; explanatory text and tolerance band (below target − 15 or above target + 10 is flagged).

### TM-11 Notifications (`tm/notifications`) — WSR issued, Fitment waits for Setting, Job assigned; Back to my jobs.

### TM-12 GRN, TM-13 MRN, TM-14 SRN (`tm/grn|mrn|srn`) — **empty shells** (navigation only).

---

## 6. Cross-cutting UI behaviours seen in every desktop screen

- Top bar with shift indicator, notification bell with count, user name, role and ID; sidebar groups with pending-count badges; Sign out.
- Table pattern: filter bar, sortable-looking columns, row action icons, pagination (Previous / 1 / Next) on long lists, status pills, mono-spaced IDs.
- Modal and drawer patterns (confirm, reason, form, document, drawer). Toast at the bottom for confirmations.
- Print views for documents; Export CSV on registers.
- Bilingual Tyre Man app (English / Tamil) via a label dictionary.
