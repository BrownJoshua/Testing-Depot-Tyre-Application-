# Screen inventory — generated appendix

> **Machine-extracted** from `MTC-Depot-Tyre-Prototype.html` (118 screen files). It lists every table column, filter, dropdown, form field and button found in each screen and in its modal/popup definitions, so nothing is silently omitted. It is reference material: the curated per-screen analysis (purpose, role, validations, relationships) is in `screen-inventory.md`.
>
> Notation: `*` = marked required in the prototype. `SEL` = dropdown (first options shown; "unlabelled filter" = a toolbar filter dropdown with no visible label). `COLS` = table columns. Popup lines are de-duplicated per screen; "(same as …)" points to an identical popup defined on another screen. Long lists of employees/folios/dates are truncated.


---

## Role folder `ho/` — HO (Technical) — maker / master data

### `ho/allocation-requests.html` — HO (Technical) — Allocation Requests
- H: Allocation Requests
- TABLE: S.No, Request No, Allocation Date & Time, Allocation Type, Allocate From, Allocated By, Allocated to Depot / Unit, Items, Status, Action
- BTNS: Stock

### `ho/complaint-master.html` — HO (Technical) — Tyre Complaint Master
- H: Tyre Complaint Master ; Audit Trail — SCH001
- TABLE: S.No, Complaint Code, Complaint Name, Required Jobs, Status, Action
- LABELS: Required job AllJOB-001 — Air Inflation Regular AirJOB-002 — Air Inflation Nitrogen AirJOB-003 — InspectionJOB-004 — Tyre RotationJOB-005 — Tyre Disc OutJOB-006 — CensusJOB-008 — Tyre RemovalJOB-009 — Tyre FitmentJOB-010 — Tyre SettingJOB-011 — Tyre Unsetting
- SEL (unlabelled filter) = All,JOB-001 — Air Inflation Regular Air,JOB-002 — Air Inflation Nitrogen Air,JOB-003 — Inspection,JOB-004 — Tyre Rotation,JOB-005 — Tyre Disc Out,JOB-006 — Census,JOB-008 — Tyre Removal,JOB-009 — Tyre Fitment,JOB-010 — Tyre Setting,JOB-011 — Tyre Unsetting
- BTNS: + Create Complaint | ✕ | Close
- **Popups / modals:**
  - Create Complaint | LABELS: Complaint Code; Complaint Name *; Required Jobs; JOB-001 — Air Inflation Regular Air; JOB-002 — Air Inflation Nitrogen Air; JOB-003 — Inspection; JOB-004 — Tyre Rotation; JOB-005 — Tyre Disc Out; JOB-006 — Census; JOB-008 — Tyre Removal; JOB-009 — Tyre Fitment; JOB-010 — Tyre Setting; JOB-011 — Tyre Unsetting | INPUTS: Complaint Code|text; Complaint Name *|text*; checkbox: | BTNS: ✕, Cancel, Save
  - Edit Complaint — # | LABELS: Complaint Code; Complaint Name *; Required Jobs; JOB-001 — Air Inflation Regular Air; JOB-002 — Air Inflation Nitrogen Air; JOB-003 — Inspection; JOB-004 — Tyre Rotation; JOB-005 — Tyre Disc Out; JOB-006 — Census; JOB-008 — Tyre Removal; JOB-009 — Tyre Fitment; JOB-010 — Tyre Setting; JOB-011 — Tyre Unsetting | INPUTS: Complaint Code|text; Complaint Name *|text*; checkbox: | BTNS: ✕, Cancel, Save
  - Deactivate Complaint #? | BTNS: ✕, Cancel, Deactivate
  - Activate Complaint #? | BTNS: ✕, Cancel, Activate

### `ho/drn-reason-master.html` — HO (Technical) — Reject Reason Master
- H: Reject Reason Master ; Audit Trail — SCH001
- TABLE: S.No, Reason ID, Reject reason, Status, Action
- LABELS: Status AllDraftPending approvalApprovedReturned
- SEL (unlabelled filter) = All,Draft,Pending approval,Approved,Returned
- BTNS: + Create | Withdraw | Send for Approval | ✕ | Close
- **Popups / modals:**
  - Create discrepancy reason | LABELS: Reject reason * | INPUTS: Reject reason *|text* | BTNS: ✕, Cancel, Save
  - Send — for approval? | BTNS: ✕, Back, Send for Approval
  - Withdraw — | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Withdraw
  - (same as ae/drn-reason-master.html) #
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - Edit — # | LABELS: Reject reason * | INPUTS: Reject reason *|text* | BTNS: ✕, Cancel, Save

### `ho/expected-life-km.html` — HO (Technical) — Expected Life KM
- H: Expected Life KM
- TABLE: Tyre size, New, RT1, RT2, RT3, RT4, RT5, Status, Action
- LABELS: Status AllDraftPending approvalApprovedReturned
- SEL (unlabelled filter) = All,Draft,Pending approval,Approved,Returned
- BTNS: + Add Tyre Size | Withdraw | Send for Approval | Previous | 1 | Next
- **Popups / modals:**
  - (same as ae/expected-life-km.html) View Expected Life KM — 7.50 X 16
  - (same as ae/expected-life-km.html) Audit Trail — 7.50 X 16
  - Edit Expected Life KM — 7.50 X 16 | LABELS: Tyre size *; New (KM) *; RT1 (KM) *; RT2 (KM) *; RT3 (KM) *; RT4 (KM) *; RT5 (KM) * | INPUTS: Tyre size *|text; New (KM) *|number; RT1 (KM) *|number; RT2 (KM) *|number; RT3 (KM) *|number; RT4 (KM) *|number; RT5 (KM) *|number | BTNS: ✕, Cancel, Send for Approval
  - Withdraw 10.00 X 20 | LABELS: Reason * | INPUTS: Reason *|Reason for withdrawing* | BTNS: ✕, Cancel, Withdraw
  - View Expected Life KM — 295/80R22.5 | LABELS: Tyre size; New (KM); RT1 (KM); RT2 (KM); RT3 (KM); RT4 (KM); RT5 (KM) | BTNS: ✕, Close
  - Audit Trail — 295/80R22.5 | BTNS: ✕, Close
  - Edit Expected Life KM — 295/80R22.5 | LABELS: Tyre size *; New (KM) *; RT1 (KM) *; RT2 (KM) *; RT3 (KM) *; RT4 (KM) *; RT5 (KM) * | INPUTS: Tyre size *|text; New (KM) *|number; RT1 (KM) *|number; RT2 (KM) *|number; RT3 (KM) *|number; RT4 (KM) *|number; RT5 (KM) *|number | BTNS: ✕, Cancel, Save
  - Send for Approval? | BTNS: ✕, Cancel, Send for Approval
  - Add Tyre Size | LABELS: Tyre size *; New (KM) *; RT1 (KM) *; RT2 (KM) *; RT3 (KM) *; RT4 (KM) *; RT5 (KM) * | INPUTS: Tyre size *|e.g. 12.00 X 20; New (KM) *|number; RT1 (KM) *|number; RT2 (KM) *|number; RT3 (KM) *|number; RT4 (KM) *|number; RT5 (KM) *|number | BTNS: ✕, Cancel, Save

### `ho/fleet-master--air-type-requests-1.html` — HO (Technical) — Fleet Master
- H: Fleet Register ; Fleet — J0264
- TABLE: Fleets, To, Reason, Raised by, Stage, Action
- TABLE: Pos, Tyre No, Size, RT, NSD
- BTNS: Approve | Reject | ✕ | Edit | Close
- **Popups / modals:**
  - Fleet — # | COLS: Pos, Tyre No, Size, RT, NSD | BTNS: ✕, Edit, Close

### `ho/fleet-master.html` — HO (Technical) — Fleet Master
- H: Fleet Register ; Fleet — J0264
- TABLE: S.No, Fleet No, Registration Number, Chassis No., Date of Purchase, Depot, Model, Model Type, Fleet Type, Status, Axle Type, Air Type, OEM Recommended Tyre Size, Live Odometer, Current Route, Schedule KM, Action
- TABLE: Pos, Tyre No, Size, RT, NSD
- SEL (unlabelled filter) = All Depots,Adyar,Thiruvanmiyur,Mandaveli,Kannagi Nagar,Perumbakkam,Semmencheri,T.Nagar,Saidapet,K.K.Nagar,Adambakkam,Chrompet
- SEL (unlabelled filter) = All Models,Ashok Leyland,Tata
- SEL (unlabelled filter) = All Model Types,BSIV,BS-III,Low Floor,AC,Deluxe
- SEL (unlabelled filter) = All Status,Operating Vehicle,Spare Vehicle
- SEL (unlabelled filter) = All Vehicle Types,Mofussil,Town,Ghat,Suburban
- BTNS: Reset | ✕ | Edit | Close
- **Popups / modals:**
  - (same as ho/fleet-master--air-type-requests-1.html) Fleet — #
  - (same as ae/fleet-master.html) FR · #
  - (same as ae/fleet-master.html) (untitled)

### `ho/fleet-type-master--fleet-type-tyre-size.html` — HO (Technical) — Fleet Type Master — Fleet Type Tyre Size
- H: Fleet Type Master ; Audit Trail — JOB-001
- TABLE: S.No, Fleet Type, Tyre Sizes, Action
- BTNS: ✕ | Close

### `ho/fleet-type-master--tyre-size.html` — HO (Technical) — Fleet Type Master — Tyre Size
- H: Fleet Type Master ; Audit Trail — JOB-001
- TABLE: S.No, Size, Status, Action
- LABELS: Status AllActiveInactive
- SEL (unlabelled filter) = All,Active,Inactive
- BTNS: + Add Tyre Size | ✕ | Close
- **Popups / modals:**
  - Edit Tyre Size — 7.50 X 16 | LABELS: Size * | INPUTS: Size *|text* | BTNS: ✕, Cancel, Save
  - (same as ae/expected-life-km.html) Audit Trail — 7.50 X 16
  - Deactivate Tyre Size 7.50 X 16? | BTNS: ✕, Cancel, Deactivate
  - Activate Tyre Size 7.50 X 16? | BTNS: ✕, Cancel, Activate
  - Edit Tyre Size — 295/80R22.5 | LABELS: Size * | INPUTS: Size *|text* | BTNS: ✕, Cancel, Save
  - (same as ho/expected-life-km.html) Audit Trail — 295/80R22.5
  - Deactivate Tyre Size 295/80R22.5? | BTNS: ✕, Cancel, Deactivate
  - Activate Tyre Size 295/80R22.5? | BTNS: ✕, Cancel, Activate
  - Edit Tyre Size — 295/90R20 | LABELS: Size * | INPUTS: Size *|text* | BTNS: ✕, Cancel, Save
  - Audit Trail — 295/90R20 | BTNS: ✕, Close
  - Deactivate Tyre Size 295/90R20? | BTNS: ✕, Cancel, Deactivate
  - Activate Tyre Size 295/90R20? | BTNS: ✕, Cancel, Activate
  - Add Tyre Size | LABELS: Size * | INPUTS: Size *|text* | BTNS: ✕, Cancel, Save

### `ho/fleet-type-master.html` — HO (Technical) — Fleet Type Master
- H: Fleet Type Master ; Audit Trail — JOB-001
- TABLE: S.No, Fleet Make, Fleet Model, Fleet Type, Status, Action
- LABELS: Status AllActiveInactive
- SEL (unlabelled filter) = All,Active,Inactive
- BTNS: + Add Fleet Type | ✕ | Close
- **Popups / modals:**
  - Edit Fleet Type — # | LABELS: Fleet Make *; Fleet Model *; Fleet Type * | INPUTS: Fleet Make *|text*; Fleet Model *|text* | SEL: Fleet Type *=— select —,Small,Standard,Low Floor | BTNS: ✕, Cancel, Save
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - Deactivate Fleet Type #? | BTNS: ✕, Cancel, Deactivate
  - Activate Fleet Type #? | BTNS: ✕, Cancel, Activate
  - Add Fleet Type | LABELS: Fleet Make *; Fleet Model *; Fleet Type * | INPUTS: Fleet Make *|text*; Fleet Model *|text* | SEL: Fleet Type *=— select —,Small,Standard,Low Floor | BTNS: ✕, Cancel, Save

### `ho/in-transit.html` — HO (Technical) — Tyre Stock — In Transit
- H: Tyre Stock
- TABLE: S.No, Depot, MTC No, Manufacturer No, Folio ID, Folio Name, Specification, Make, Makers Model, Size, Construction Type, Tube Type, Grade, From, To, Reference No, Status

### `ho/maintenance-configuration--psi-norms.html` — HO (Technical) — Maintenance Configuration
- H: Maintenance Configuration ; Active norms ; Audit Trail — JOB-001
- TABLE: Tyre Size, Construction Type, Front, Rear, Action, Regular, Nitrogen, Regular, Nitrogen
- BTNS: + Add Norm | ✕ | Close
- **Popups / modals:**
  - Add Norm | LABELS: Tyre Size *; Construction Type *; Regular (PSI) *; Nitrogen (PSI) * | INPUTS: Regular (PSI) *|text*; Nitrogen (PSI) *|text* | SEL: Tyre Size *=— select —,7.50 X 16,10.00 X 20,9.00 X 20,295/80R22.5,235/75R17.5,295/90R20; Construction Type *=— select —,Nylon,Radial | BTNS: ✕, Cancel, Save
  - Edit PSI Norm — 7.50 X 16 · Nylon | LABELS: Tyre Size; Construction Type; Regular (PSI) *; Nitrogen (PSI) * | INPUTS: Tyre Size|text; Construction Type|text; Regular (PSI) *|text*; Nitrogen (PSI) *|text* | BTNS: ✕, Cancel, Save
  - Edit PSI Norm — 7.50 X 16 · Radial | LABELS: Tyre Size; Construction Type; Regular (PSI) *; Nitrogen (PSI) * | INPUTS: Tyre Size|text; Construction Type|text; Regular (PSI) *|text*; Nitrogen (PSI) *|text* | BTNS: ✕, Cancel, Save
  - Edit PSI Norm — 295/80R22.5 · Radial | LABELS: Tyre Size; Construction Type; Regular (PSI) *; Nitrogen (PSI) * | INPUTS: Tyre Size|text; Construction Type|text; Regular (PSI) *|text*; Nitrogen (PSI) *|text* | BTNS: ✕, Cancel, Save
  - Edit PSI Norm — 295/90R20 · Radial | LABELS: Tyre Size; Construction Type; Regular (PSI) *; Nitrogen (PSI) * | INPUTS: Tyre Size|text; Construction Type|text; Regular (PSI) *|text*; Nitrogen (PSI) *|text* | BTNS: ✕, Cancel, Save

### `ho/maintenance-configuration--rotation-discout-norms.html` — HO (Technical) — Maintenance Configuration
- H: Maintenance Configuration ; Active norms ; Audit Trail — JOB-001
- TABLE: Operated Days, Operated KM, Effective From
- TABLE: Operated Days, Operated KM, Effective From
- BTNS: ✕ | Close
- **Popups / modals:**
  - Edit — Rotation cadence | LABELS: Operated days *; Operated KM *; Effective from * | INPUTS: Operated days *|text*; Operated KM *|text*; Effective from *|date* | BTNS: ✕, Cancel, Save
  - Edit — Discout cadence | LABELS: Operated days *; Operated KM *; Effective from * | INPUTS: Operated days *|text*; Operated KM *|text*; Effective from *|date* | BTNS: ✕, Cancel, Save
  - Edit — Eligible tyre grades | LABELS: Front-tyre grades *; New; A; B; C; Effective from * | INPUTS: checkbox:; Effective from *|date* | BTNS: ✕, Cancel, Save

### `ho/maintenance-configuration--schedule-configuration.html` — HO (Technical) — Maintenance Configuration
- H: Maintenance Configuration ; Audit Trail — JOB-001
- TABLE: S.No, Schedule Code, Schedule Name, Category, Frequency, Job Code, Work Order Based, Outsource Employee Based, Effective From, Status, Action
- LABELS: Status AllActiveInactive
- SEL (unlabelled filter) = All,Active,Inactive
- BTNS: + Create Schedule | Previous | 1 | Next | ✕ | Close
- **Popups / modals:**
  - Create Schedule | LABELS: Schedule Code; Category; Schedule Name *; Frequency *; Date Frequency *; No. of Days *; Particular Date (select in calendar) *; KM *; KM Frequency (every ... km) *; Frequency Detail; Work Order Based? *; Outsource Employee Based? *; Due Date (days after assignment) *; Checklist Based? *; Effective From *; Number of Categories * | INPUTS: Schedule Code|text; Category|text; Schedule Name *|text*; No. of Days *|number*; Particular Date (select in calendar) *|date*; KM Frequency (every ... km) *|number*; Frequency Detail|text; Due Date (days after assignment) *|number*; Effective From *|date*; Number of Categories *|number* | SEL: Frequency *=— select —,Date Based,KM  …
  - (same as ae/maintenance-configuration--schedule-configuration.html) View Schedule — #
  - Edit Schedule — # | LABELS: Schedule Code; Category; Schedule Name *; Frequency *; Date Frequency *; No. of Days *; Particular Date (select in calendar) *; KM *; KM Frequency (every ... km) *; Frequency Detail; Work Order Based? *; Outsource Employee Based? *; Due Date (days after assignment) *; Checklist Based? *; Effective From *; Number of Categories * | INPUTS: Schedule Code|text; Category|text; Schedule Name *|text*; No. of Days *|number*; Particular Date (select in calendar) *|date*; KM Frequency (every ... km) *|number*; Frequency Detail|text; Due Date (days after assignment) *|number*; Effective From *|date*; Number of Categories *|number* | SEL: Frequency *=— select —,Date Based,K …
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - Deactivate Schedule #? | BTNS: ✕, Cancel, Deactivate
  - Activate Schedule #? | BTNS: ✕, Cancel, Activate

### `ho/maintenance-configuration--skills.html` — HO (Technical) — Maintenance Configuration
- H: Maintenance Configuration ; Audit Trail — JOB-001
- TABLE: S.No, Job Code, Job Name, Fleet Type, Required Skills, Action
- BTNS: ✕ | Close
- **Popups / modals:**
  - Edit Skills — # | LABELS: Job Code; Job Name; Required Skills *; Air Inflation; Tyre Rotation; Wheel Balancing; Tyre Fitment; Nail Removal; Retreading; Wheel Alignment | INPUTS: Job Code|text; Job Name|text; checkbox: | BTNS: ✕, Cancel, Save
  - (same as ae/drn-reason-master.html) Audit Trail — #

### `ho/maintenance-configuration.html` — HO (Technical) — Maintenance Configuration
- H: Maintenance Configuration ; Audit Trail — JOB-001
- TABLE: S.No, Job Code, Job Name, Fleet Type, Estimated Time of Completion per Fleet, Estimated Time of Completion per Tyre, Status, Action
- LABELS: Status AllActiveInactive
- SEL (unlabelled filter) = All,Active,Inactive
- BTNS: + Create Job | Previous | 1 | Next | ✕ | Close
- **Popups / modals:**
  - Create Job | LABELS: Job Name *; Fleet Type *; Estimated Time of Completion per Fleet (min) *; Estimated Time of Completion per Tyre (min) * | INPUTS: Job Name *|text*; Estimated Time of Completion per Fleet (min) *|text*; Estimated Time of Completion per Tyre (min) *|text* | SEL: Fleet Type *=— select —,Ashok Leyland Viking BS VI,Tata Motors Starbus Ultra,Eicher Skyline Pro | BTNS: ✕, Cancel, Save
  - (same as ae/maintenance-configuration.html) View Job — #
  - Edit Job — # | LABELS: Job Code; Job Name *; Fleet Type *; Estimated Time of Completion per Fleet (min) *; Estimated Time of Completion per Tyre (min) * | INPUTS: Job Code|text; Job Name *|text*; Estimated Time of Completion per Fleet (min) *|text*; Estimated Time of Completion per Tyre (min) *|text* | SEL: Fleet Type *=— select —,Ashok Leyland Viking BS VI,Tata Motors Starbus Ultra,Eicher Skyline Pro | BTNS: ✕, Cancel, Save
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - Deactivate Job #? | BTNS: ✕, Cancel, Deactivate
  - Activate Job #? | BTNS: ✕, Cancel, Activate

### `ho/maintenance-pending.html` — HO (Technical) — Maintenance Pending
- H: Maintenance Pending
- TABLE: Depot
- LABELS: Month | Maintenance type
- SEL Maintenance type = Tyre Rotation,Tyre Discout,Air Inflation,Inspection,Census
- INPUTS: Month

### `ho/purchase-indent.html` — HO (Technical) — Purchase Indent
- H: Purchase Indent
- TABLE: S.No, Indent No, Indent Date & Time, Indent Type, Folio Group, Source, Requested By, Status, Action
- BTNS: Workflow | Raise Indent | Export | View | Edit
- **Popups / modals:**
  - (same as ae/purchase-indent.html) Purchase Indent — PI-#
  - Edit — PI-# | LABELS: Indent Type *; Folio Group; Indent Date; Indent To; Required For; Requested By; Remarks | INPUTS: Folio Group|text; Indent Date|text; Indent To|text; Required For|text; Requested By|text; Remarks|Enter remarks...; Remarks|number | SEL: Indent Type *=Select Indent Type,Supplementary Indent,(AWR) Indent,Emergency Indent; Remarks=Central Store,Depot Store,All; Remarks=— select —,F7001 · TOLINS EnduRace RA 7.50 X 16,F7004 · CEAT R156 10.00 X 20,F7007 · Apollo Endurace RD 295/80R22.5,F7011 · CEAT Win Energy XM3 8.25 X 16,F7012 · JK Jetway JUH5 8.25 X 16,F7013 · CEAT EnduRace RA 7.50 X 16,F7014 · CEAT EnduRace RA 10.00 X 20,F7015 · JK Steel Muscle S1R4 10.00 X 20,F7016 · JK …
  - (same as ae/purchase-indent.html) Purchase Indent — {{no}}
  - Edit — {{no}} | LABELS: Indent Type *; Folio Group; Indent Date; Indent To; Required For; Requested By; Remarks | INPUTS: Folio Group|text; Indent Date|text; Indent To|text; Required For|text; Requested By|text; Remarks|Enter remarks...; Remarks|number | SEL: Indent Type *=Select Indent Type,Supplementary Indent,(AWR) Indent,Emergency Indent; Remarks=Central Store,Depot Store,All; Remarks=— select —,F7001 · TOLINS EnduRace RA 7.50 X 16,F7004 · CEAT R156 10.00 X 20,F7007 · Apollo Endurace RD 295/80R22.5,F7011 · CEAT Win Energy XM3 8.25 X 16,F7012 · JK Jetway JUH5 8.25 X 16,F7013 · CEAT EnduRace RA 7.50 X 16,F7014 · CEAT EnduRace RA 10.00 X 20,F7015 · JK Steel Muscle S1R4 10.00 X 20,F7016 ·  …
  - Workflow | BTNS: ✕, Close
  - Raise Purchase Indent | LABELS: Indent Type *; Folio Group; Indent Date; Indent To; Required For; Requested By; Remarks | INPUTS: Folio Group|text; Indent Date|text; Indent To|text; Required For|text; Requested By|text; Remarks|Enter remarks...; Remarks|number | SEL: Indent Type *=Select Indent Type,Supplementary Indent,(AWR) Indent,Emergency Indent; Remarks=Central Store,Depot Store,All; Remarks=— select —,F7001 · TOLINS EnduRace RA 7.50 X 16,F7004 · CEAT R156 10.00 X 20,F7007 · Apollo Endurace RD 295/80R22.5,F7011 · CEAT Win Energy XM3 8.25 X 16,F7012 · JK Jetway JUH5 8.25 X 16,F7013 · CEAT EnduRace RA 7.50 X 16,F7014 · CEAT EnduRace RA 10.00 X 20,F7015 · JK Steel Muscle S1R4 10.00 X 20, …

### `ho/qc-master.html` — HO (Technical) — QC Master
- H: QC Master ; Audit Trail — SCH001
- TABLE: S.No, QC ID, Job type, Checklist items, Status, Action
- LABELS: Status AllDraftPending approvalApprovedReturned
- SEL (unlabelled filter) = All,Draft,Pending approval,Approved,Returned
- BTNS: + Create | Withdraw | ✕ | Close
- **Popups / modals:**
  - Create QC checklist | LABELS: Job type *; Checklist * | INPUTS: Checklist *|text* | SEL: Job type *=— select —,Air Inflation,Air Inflation — Nitrogen,Inspection,Tyre Rotation,Tyre Discout,Census,Tyre Changing,Tyre Removal,Tyre Fitment | COLS: S.No, Checklist item | BTNS: ✕, + Add item, Cancel, Save
  - (same as ho/drn-reason-master.html) Send — for approval?
  - (same as ho/drn-reason-master.html) Withdraw —
  - (same as ae/qc-master.html) # · Air Inflation
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - Edit — # · Air Inflation | LABELS: Job type *; Checklist * | INPUTS: Checklist *|text* | SEL: Job type *=— select —,Air Inflation,Air Inflation — Nitrogen,Inspection,Tyre Rotation,Tyre Discout,Census,Tyre Changing,Tyre Removal,Tyre Fitment | COLS: S.No, Checklist item | BTNS: ✕, + Add item, Cancel, Save
  - (same as ae/qc-master.html) # · Air Inflation — Nitrogen
  - Edit — # · Air Inflation — Nitrogen | LABELS: Job type *; Checklist * | INPUTS: Checklist *|text* | SEL: Job type *=— select —,Air Inflation,Air Inflation — Nitrogen,Inspection,Tyre Rotation,Tyre Discout,Census,Tyre Changing,Tyre Removal,Tyre Fitment | COLS: S.No, Checklist item | BTNS: ✕, + Add item, Cancel, Save
  - (same as ae/qc-master.html) # · Inspection
  - Edit — # · Inspection | LABELS: Job type *; Checklist * | INPUTS: Checklist *|text* | SEL: Job type *=— select —,Air Inflation,Air Inflation — Nitrogen,Inspection,Tyre Rotation,Tyre Discout,Census,Tyre Changing,Tyre Removal,Tyre Fitment | COLS: S.No, Checklist item | BTNS: ✕, + Add item, Cancel, Save
  - (same as ae/qc-master.html) # · Tyre Rotation
  - Edit — # · Tyre Rotation | LABELS: Job type *; Checklist * | INPUTS: Checklist *|text* | SEL: Job type *=— select —,Air Inflation,Air Inflation — Nitrogen,Inspection,Tyre Rotation,Tyre Discout,Census,Tyre Changing,Tyre Removal,Tyre Fitment | COLS: S.No, Checklist item | BTNS: ✕, + Add item, Cancel, Save
  - (same as ae/qc-master.html) # · Tyre Discout
  - Edit — # · Tyre Discout | LABELS: Job type *; Checklist * | INPUTS: Checklist *|text* | SEL: Job type *=— select —,Air Inflation,Air Inflation — Nitrogen,Inspection,Tyre Rotation,Tyre Discout,Census,Tyre Changing,Tyre Removal,Tyre Fitment | COLS: S.No, Checklist item | BTNS: ✕, + Add item, Cancel, Save
  - (same as ae/qc-master.html) # · Census
  - Edit — # · Census | LABELS: Job type *; Checklist * | INPUTS: Checklist *|text* | SEL: Job type *=— select —,Air Inflation,Air Inflation — Nitrogen,Inspection,Tyre Rotation,Tyre Discout,Census,Tyre Changing,Tyre Removal,Tyre Fitment | COLS: S.No, Checklist item | BTNS: ✕, + Add item, Cancel, Save
  - (same as ae/qc-master.html) # · Tyre Changing
  - Edit — # · Tyre Changing | LABELS: Job type *; Checklist * | INPUTS: Checklist *|text* | SEL: Job type *=— select —,Air Inflation,Air Inflation — Nitrogen,Inspection,Tyre Rotation,Tyre Discout,Census,Tyre Changing,Tyre Removal,Tyre Fitment | COLS: S.No, Checklist item | BTNS: ✕, + Add item, Cancel, Save
  - (same as ae/qc-master.html) # · Tyre Removal
  - Edit — # · Tyre Removal | LABELS: Job type *; Checklist * | INPUTS: Checklist *|text* | SEL: Job type *=— select —,Air Inflation,Air Inflation — Nitrogen,Inspection,Tyre Rotation,Tyre Discout,Census,Tyre Changing,Tyre Removal,Tyre Fitment | COLS: S.No, Checklist item | BTNS: ✕, + Add item, Cancel, Save
  - (same as ae/qc-master.html) # · Tyre Fitment
  - Edit — # · Tyre Fitment | LABELS: Job type *; Checklist * | INPUTS: Checklist *|text* | SEL: Job type *=— select —,Air Inflation,Air Inflation — Nitrogen,Inspection,Tyre Rotation,Tyre Discout,Census,Tyre Changing,Tyre Removal,Tyre Fitment | COLS: S.No, Checklist item | BTNS: ✕, + Add item, Cancel, Save
  - (same as ae/qc-master.html) # · Tyre Setting
  - Edit — # · Tyre Setting | LABELS: Job type *; Checklist * | INPUTS: Checklist *|text* | SEL: Job type *=— select —,Air Inflation,Air Inflation — Nitrogen,Inspection,Tyre Rotation,Tyre Discout,Census,Tyre Changing,Tyre Removal,Tyre Fitment | COLS: S.No, Checklist item | BTNS: ✕, + Add item, Cancel, Save
  - (same as ae/qc-master.html) # · Tyre Unsetting
  - Edit — # · Tyre Unsetting | LABELS: Job type *; Checklist * | INPUTS: Checklist *|text* | SEL: Job type *=— select —,Air Inflation,Air Inflation — Nitrogen,Inspection,Tyre Rotation,Tyre Discout,Census,Tyre Changing,Tyre Removal,Tyre Fitment | COLS: S.No, Checklist item | BTNS: ✕, + Add item, Cancel, Save

### `ho/reason-master.html` — HO (Technical) — Reason Master
- H: Reason Master ; New reasons from depots ; Reasons ; Audit Trail — SCH001
- TABLE: Request No, Reason entered, Used for, Depot, Raised by, Raised at, Status, Action
- TABLE: S.No, Reason ID, Reason, Used for, Pauses schedule, Status, Action
- LABELS: Used for | Status | Search
- SEL Used for = All,Hold,Reschedule,Replace,Missed / not done,Send back
- SEL Status = All,Active,Inactive
- INPUTS: Search
- BTNS: + Create Reason | Add to list | Reject | Deactivate | ✕ | Close
- **Popups / modals:**
  - Create reason | LABELS: Reason *; Used for *; Hold; Reschedule; Replace; Missed / not done; Send back; Pauses the schedule * | INPUTS: Reason *|text*; checkbox: | SEL: Pauses the schedule *=— select —,No,Yes | BTNS: ✕, Cancel, Save
  - Edit reason — — | LABELS: Reason *; Used for *; Hold; Reschedule; Replace; Missed / not done; Send back; Pauses the schedule * | INPUTS: Reason *|text*; checkbox: | SEL: Pauses the schedule *=— select —,No,Yes | BTNS: ✕, Cancel, Save
  - Audit Trail — — | BTNS: ✕, Close
  - Deactivate —? | BTNS: ✕, Cancel, Deactivate
  - Add to list — RSN-# | LABELS: Pauses the schedule * | SEL: Pauses the schedule *=— select —,No,Yes | BTNS: ✕, Cancel, Add to list
  - Reject RSN-# | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Cancel, Reject

### `ho/shift-master.html` — HO (Technical) — Shift Master
- H: Shift Master ; Audit Trail — SCH001
- TABLE: Shift, Start, End, Status, Action
- BTNS: ✕ | Close

### `ho/tyre-detailed-master.html` — HO (Technical) — Tyre Detailed Master
- H: Tyre Detailed Master ; Audit Trail — JOB-001
- TABLE: S.No, Column ID, Column Name, Column Description, Integration, Module, Module Master, Input Field, Required Field, Status, Action
- BTNS: + Add Column | ✕ | Close

### `ho/tyre-folio.html` — HO (Technical) — Tyre Folio
- H: Tyre Folio
- TABLE: Folio ID, Folio Name, Specification, Make, Makers model, Construction Type, Tube Type, Ply, Size, Locations, Group, Category, UOM, HSN, Expiry, Recondition, Created, Status, Action
- LABELS: Status AllDraftPending approvalApprovedReturned
- SEL (unlabelled filter) = All,Draft,Pending approval,Approved,Returned
- BTNS: + Add Tyre Folio | Withdraw | Send for Approval | Previous | 1 | Next
- **Popups / modals:**
  - View Tyre Folio — # | LABELS: Folio ID; Folio Name; Specification; Make; Makers model; Construction Type; Tube Type; Ply; Tyre size; Group; Category; UOM; HSN; Expiry; Recondition; Locations; Created | BTNS: ✕, Close
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - Edit Tyre Folio — # | LABELS: Folio No.; Folio Name; Make; Makers model; Construction Type; Tube Type; Ply; Tyre size; Group; Category; UOM; HSN; Expiry; Recondition; Locations; Central Store; MIC; Depot; TRS | INPUTS: Folio No.|text; Folio Name|text; HSN|text; checkbox:Central Store; checkbox:MIC; checkbox:Depot; checkbox:TRS | SEL: Make=Apollo,APOLLO,BIRLA,Bridgestone,CEAT,JK,MICH (Michelin),MRF,TOLINS; Makers model=Winmile X3-AW,Winmile X3-R,Jet Trak,Jet Xtra XLM,EnduRace RA,Endurace RD,Jetway JUH5,R150,R156,Steel Muscle S1R4; Construction Type=Radial,Nylon; Tube Type=Tube,Tubeless; Ply=12,14,16,18; Tyre size=7.50 X 16,10.00 X 20,9.00 X 20,295/80R22.5,235/75R17.5,295/90R20,8.25 X 16; Gr …
  - (same as ho/expected-life-km.html) Send for Approval?
  - Withdraw # | LABELS: Reason * | INPUTS: Reason *|Reason for withdrawing* | BTNS: ✕, Cancel, Withdraw
  - Add Tyre Folio | LABELS: Folio No.; Folio Name; Make; Makers model; Construction Type; Tube Type; Ply; Tyre size; Group; Category; UOM; HSN; Expiry; Recondition; Locations; Central Store; MIC; Depot; TRS | INPUTS: Folio No.|text; Folio Name|text; HSN|text; checkbox:Central Store; checkbox:MIC; checkbox:Depot; checkbox:TRS | SEL: Make=Apollo,APOLLO,BIRLA,Bridgestone,CEAT,JK,MICH (Michelin),MRF,TOLINS; Makers model=Winmile X3-AW,Winmile X3-R,Jet Trak,Jet Xtra XLM,EnduRace RA,Endurace RD,Jetway JUH5,R150,R156,Steel Muscle S1R4; Construction Type=Radial,Nylon; Tube Type=Tube,Tubeless; Ply=12,14,16,18; Tyre size=7.50 X 16,10.00 X 20,9.00 X 20,295/80R22.5,235/75R17.5,295/90R20,8.25 X 16; Group=T …
  - Delete Tyre Folio — #? | BTNS: ✕, Cancel, Delete

### `ho/tyre-man-master.html` — HO (Technical) — Tyre Man Master
- H: Tyre Man Register ; TLDC — Tyre SS0242
- TABLE: S.No, Employee ID, Name, Role, Depot, Skill, Phone, Experience, Status, Action
- TABLE: Stage, Thread Rubber, Bonding Gum, VC Patch, No. of VC, TRS Census, RT Date, Recom. Position, Achieved KM, Total KMS, TRS Remarks
- TABLE: Particulars, New Tyre Fitment, I Rotation, II Rotation, III Rotation, IV Rotation, V Rotation, VI Rotation, VII Rotation, VIII Rotation, IX Rotation
- TABLE: S.No, Fleet No, Position, Fitted Date, Removal Date, Route, KMS, Days Stopped, Days Running, Running Days KMS, Dead KMS, Total KMS, Reason for Removal
- TABLE: Route, Route Name, Fleet, Trips, KM Driven, First Driven, Last Driven, Tyre Position
- TABLE: S.No, Phase, From Date, To Date, No. of Days, Fleet No, Position, Location / Remarks
- TABLE: When, Fleet / Position, Detail
- TABLE: Date, Position, Cause, Repair action, Odometer (km), Repaired by, Remarks
- SEL (unlabelled filter) = All Depots,Adyar,Thiruvanmiyur,Mandaveli,Kannagi Nagar,Perumbakkam,Semmencheri,T.Nagar,Saidapet,K.K.Nagar,Adambakkam,Chrompet
- SEL (unlabelled filter) = All Roles,Tyre Incharge,Tyre Man
- BTNS: Reset | ✕ | Depot Maintenance History | RT Maintenance History | Audit Trail | Print | 🖨 Print | Close
- **Popups / modals:**
  - K. Saravanan | BTNS: ✕, Close
  - M. Perumal | BTNS: ✕, Close
  - S. Ilango | BTNS: ✕, Close
  - K. Bhaskar | BTNS: ✕, Close
  - P. Selvam | BTNS: ✕, Close
  - R. Manikandan | BTNS: ✕, Close
  - A. Jaganathan | BTNS: ✕, Close
  - D. Karthik | BTNS: ✕, Close
  - V. Suresh | BTNS: ✕, Close
  - V. Senthil | BTNS: ✕, Close
  - M. Suresh | BTNS: ✕, Close
  - R. Kumar | BTNS: ✕, Close
  - A. Velu | BTNS: ✕, Close
  - P. Elango | BTNS: ✕, Close
  - G. Bala | BTNS: ✕, Close
  - S. Murugan | BTNS: ✕, Close
  - N. Prakash | BTNS: ✕, Close
  - K. Rajan | BTNS: ✕, Close
  - T. Anand | BTNS: ✕, Close

### `ho/tyre-master.html` — HO (Technical) — Tyre Master
- H: Tyre Stock ; TLDC — Tyre SS0242
- TABLE: S.No, Depot, Folio ID, Folio Name, Specification, Makers No, MTC No, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Size, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet, Removal position, Removal reason, New KM, RT1 KM, RT2 KM, RT3 KM, RT4 KM, RT5 KM, Running KM, Total KM
- TABLE: Stage, Thread Rubber, Bonding Gum, VC Patch, No. of VC, TRS Census, RT Date, Recom. Position, Achieved KM, Total KMS, TRS Remarks
- TABLE: Particulars, New Tyre Fitment, I Rotation, II Rotation, III Rotation, IV Rotation, V Rotation, VI Rotation, VII Rotation, VIII Rotation, IX Rotation
- TABLE: S.No, Fleet No, Position, Fitted Date, Removal Date, Route, KMS, Days Stopped, Days Running, Running Days KMS, Dead KMS, Total KMS, Reason for Removal
- TABLE: Route, Route Name, Fleet, Trips, KM Driven, First Driven, Last Driven, Tyre Position
- TABLE: S.No, Phase, From Date, To Date, No. of Days, Fleet No, Position, Location / Remarks
- TABLE: When, Fleet / Position, Detail
- TABLE: Date, Position, Cause, Repair action, Odometer (km), Repaired by, Remarks
- BTNS: Summary | Detailed | ⇩ Export CSV | ✕ | Depot Maintenance History | RT Maintenance History | Audit Trail | Print | 🖨 Print | Close
- **Popups / modals:**
  - TLDC — Tyre # | COLS: Stage, Thread Rubber, Bonding Gum, VC Patch, No. of VC, TRS Census, RT Date, Recom. Position, Achieved KM, Total KMS, TRS Remarks, Particulars, New Tyre Fitment, I Rotation, II Rotation, III Rotation, IV Rotation, V Rotation, VI Rotation, VII Rotation, VIII Rotation, IX Rotation, S.No, Fleet No, Position, Fitted Date, Removal Date, Route, KMS, Days Stopped | BTNS: ✕, Close

### `ho/wear-pattern-master.html` — HO (Technical) — Wear Pattern Master
- H: Wear Pattern Master ; Audit Trail — SCH001
- TABLE: S.No, Pattern ID, Wear pattern, Status, Action
- LABELS: Status AllDraftPending approvalApprovedReturned
- SEL (unlabelled filter) = All,Draft,Pending approval,Approved,Returned
- BTNS: + Create | Withdraw | Send for Approval | ✕ | Close
- **Popups / modals:**
  - Create wear pattern | LABELS: Wear pattern * | INPUTS: Wear pattern *|text* | BTNS: ✕, Cancel, Save
  - (same as ho/drn-reason-master.html) Send — for approval?
  - (same as ho/drn-reason-master.html) Withdraw —
  - (same as ae/drn-reason-master.html) #
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - Edit — # | LABELS: Wear pattern * | INPUTS: Wear pattern *|text* | BTNS: ✕, Cancel, Save

---

## Role folder `ae/` — AE (HO Technical) — approver

### `ae/allocation-requests.html` — AE (Technical) — Allocation Requests
- H: Allocation Requests
- TABLE: S.No, Request No, Allocation Date & Time, Allocation Type, Allocate From, Allocated By, Allocated to Depot / Unit, Items, Status, Action

### `ae/drn-reason-master.html` — AE (HO Technical) — Reject Reason Master
- H: Reject Reason Master ; Audit Trail — SCH001
- TABLE: S.No, Reason ID, Reject reason, Status, Action
- BTNS: Approve selected | Return selected | Approve | Return | ✕ | Close
- **Popups / modals:**
  - Approve 1 reason? | BTNS: ✕, Back, Approve
  - Return 1 reason | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Return
  - # | BTNS: ✕, Close
  - Audit Trail — # | BTNS: ✕, Close
  - Approve #? | BTNS: ✕, Back, Approve
  - Return # | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Return

### `ae/expected-life-km.html` — AE (HO Technical) — Expected Life KM
- H: Expected Life KM
- TABLE: Tyre size, New, RT1, RT2, RT3, RT4, RT5, Status, Action
- LABELS: Status AllPending approvalApprovedReturned
- SEL (unlabelled filter) = All,Pending approval,Approved,Returned
- BTNS: Approve selected | Return selected | Approve | Return | Previous | 1 | Next
- **Popups / modals:**
  - View Expected Life KM — 7.50 X 16 | LABELS: Tyre size; New (KM); RT1 (KM); RT2 (KM); RT3 (KM); RT4 (KM); RT5 (KM) | BTNS: ✕, Close
  - Audit Trail — 7.50 X 16 | BTNS: ✕, Close
  - Approve 10.00 X 20? | BTNS: ✕, Cancel, Approve
  - Return 10.00 X 20 | LABELS: Reason * | INPUTS: Reason *|Reason for returning* | BTNS: ✕, Cancel, Return
  - Approve 2 tyre sizes? | BTNS: ✕, Cancel, Approve
  - Return 2 tyre sizes | LABELS: Reason * | INPUTS: Reason *|Reason for returning* | BTNS: ✕, Cancel, Return

### `ae/fleet-master--air-type-requests-1.html` — AE (HO Technical) — Fleet Master
- H: Fleet Register ; Fleet — J0264
- TABLE: Fleets, To, Reason, Raised by, Stage, Action
- TABLE: Pos, Tyre No, Size, RT, NSD
- BTNS: Approve | Return | ✕ | Close
- **Popups / modals:**
  - Fleet — # | COLS: Pos, Tyre No, Size, RT, NSD | BTNS: ✕, Close
  - Approve air-type request? | BTNS: ✕, Cancel, Approve
  - Return air-type request | LABELS: Reason * | INPUTS: Reason *|Reason for returning* | BTNS: ✕, Cancel, Return

### `ae/fleet-master.html` — AE (HO Technical) — Fleet Master
- H: Fleet Register ; Fleet — J0264
- TABLE: S.No, Fleet No, Registration Number, Chassis No., Date of Purchase, Depot, Model, Model Type, Fleet Type, Status, Axle Type, Air Type, OEM Recommended Tyre Size, Live Odometer, Current Route, Schedule KM, Action
- TABLE: Pos, Tyre No, Size, RT, NSD
- SEL (unlabelled filter) = All Depots,Adyar,Thiruvanmiyur,Mandaveli,Kannagi Nagar,Perumbakkam,Semmencheri,T.Nagar,Saidapet,K.K.Nagar,Adambakkam,Chrompet
- SEL (unlabelled filter) = All Models,Ashok Leyland,Tata
- SEL (unlabelled filter) = All Model Types,BSIV,BS-III,Low Floor,AC,Deluxe
- SEL (unlabelled filter) = All Status,Operating Vehicle,Spare Vehicle
- SEL (unlabelled filter) = All Vehicle Types,Mofussil,Town,Ghat,Suburban
- BTNS: Reset | ✕ | Close
- **Popups / modals:**
  - (same as ae/fleet-master--air-type-requests-1.html) Fleet — #
  - (untitled) | COLS: Position, Tyre No, Size, NSD, Tyre Condition, Fitted Date, Fitted KM, Total KM, No of Days Fitted, Grade | BTNS: ✕
  - FR · # | BTNS: ✕, Close

### `ae/maintenance-configuration--schedule-configuration.html` — AE (HO Technical) — Maintenance Configuration
- H: Maintenance Configuration ; Audit Trail — SCH001
- TABLE: S.No, Schedule Code, Schedule Name, Category, Frequency, Job Code, Work Order Based, Outsource Employee Based, Effective From, Status, Action
- LABELS: Status AllActiveInactive
- SEL (unlabelled filter) = All,Active,Inactive
- BTNS: ✕ | Close
- **Popups / modals:**
  - View Schedule — # | LABELS: Schedule Code; Schedule Name; Category; Frequency; Job ID; Work Order Based; Outsource Employee Based; Effective From; Status | BTNS: ✕, Close
  - (same as ae/drn-reason-master.html) Audit Trail — #

### `ae/maintenance-configuration--skills.html` — AE (HO Technical) — Maintenance Configuration
- H: Maintenance Configuration ; Audit Trail — SCH001
- TABLE: S.No, Job Code, Job Name, Fleet Type, Required Skills, Action
- BTNS: ✕ | Close
- **Popups / modals:**
  - (same as ae/drn-reason-master.html) Audit Trail — #

### `ae/maintenance-configuration.html` — AE (HO Technical) — Maintenance Configuration
- H: Maintenance Configuration ; Audit Trail — SCH001
- TABLE: S.No, Job Code, Job Name, Fleet Type, Estimated Time of Completion per Fleet, Estimated Time of Completion per Tyre, Status, Action
- LABELS: Status AllActiveInactive
- SEL (unlabelled filter) = All,Active,Inactive
- BTNS: ✕ | Close
- **Popups / modals:**
  - View Job — # | LABELS: Job Code; Job Name; Fleet Type; Status; Estimated Time of Completion per Fleet; Estimated Time of Completion per Tyre | BTNS: ✕, Close
  - (same as ae/drn-reason-master.html) Audit Trail — #

### `ae/maintenance-pending.html` — AE (Technical) — Maintenance Pending
- H: Maintenance Pending
- TABLE: Depot
- LABELS: Month | Maintenance type
- SEL Maintenance type = Tyre Rotation,Tyre Discout,Air Inflation,Inspection,Census
- INPUTS: Month

### `ae/norm-master.html` — AE (HO Technical) — Norm Master
- H: HO Norm Master
- TABLE: Tyre Size, Construction Type, Front, Rear, Regular, Nitrogen, Regular, Nitrogen

### `ae/purchase-indent.html` — AE (Technical) — Purchase Indent
- H: Purchase Indent
- TABLE: S.No, Indent No, Indent Date & Time, Indent Type, Folio Group, Source, Requested By, Total Qty, Total Net Amount, Status, Action
- BTNS: View | Approve | Revert
- **Popups / modals:**
  - Purchase Indent — PI-# | COLS: S.No, Folio ID, Nomenclature, Specification, UOM, HSN Code, Product Group, Unit, Minimum Stock, Class, Average Month, Prev 1 Mon, Prev. 3 Month Cons, Prev 6 Mons, Prev 12 Mons, MSQ Basis, CS Stock, Max Stock, D.Store Stock, TRS, Total, Order Qty, Receive Qty, Pending PO, Pending Qty, Prev PO No, Prev PO Date, Requested Qty, Unit Amount, GST % | BTNS: ✕, Close
  - Approve PI-# | BTNS: ✕, Back, Approve
  - Revert PI-# | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Revert
  - Purchase Indent — {{no}} | COLS: S.No, Folio ID, Nomenclature, Specification, UOM, HSN Code, Product Group, Unit, Minimum Stock, Class, Average Month, Prev 1 Mon, Prev. 3 Month Cons, Prev 6 Mons, Prev 12 Mons, MSQ Basis, CS Stock, Max Stock, D.Store Stock, TRS, Total, Order Qty, Receive Qty, Pending PO, Pending Qty, Prev PO No, Prev PO Date, Requested Qty, Unit Amount, GST % | BTNS: ✕, Close
  - Approve {{no}} | BTNS: ✕, Back, Approve
  - Revert {{no}} | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Revert

### `ae/qc-master.html` — AE (HO Technical) — QC Master
- H: QC Master ; Audit Trail — SCH001
- TABLE: S.No, QC ID, Job type, Checklist items, Status, Action
- BTNS: Approve selected | Return selected | Approve | Return | ✕ | Close
- **Popups / modals:**
  - Approve 1 checklist? | BTNS: ✕, Back, Approve
  - Return 1 checklist | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Return
  - # · Air Inflation | COLS: S.No, Checklist item | BTNS: ✕, Close
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - # · Air Inflation — Nitrogen | COLS: S.No, Checklist item | BTNS: ✕, Close
  - # · Inspection | COLS: S.No, Checklist item | BTNS: ✕, Close
  - # · Tyre Rotation | COLS: S.No, Checklist item | BTNS: ✕, Close
  - # · Tyre Discout | COLS: S.No, Checklist item | BTNS: ✕, Close
  - # · Census | COLS: S.No, Checklist item | BTNS: ✕, Close
  - (same as ae/drn-reason-master.html) Approve #?
  - (same as ae/drn-reason-master.html) Return #
  - # · Tyre Changing | COLS: S.No, Checklist item | BTNS: ✕, Close
  - # · Tyre Removal | COLS: S.No, Checklist item | BTNS: ✕, Close
  - # · Tyre Fitment | COLS: S.No, Checklist item | BTNS: ✕, Close
  - # · Tyre Setting | COLS: S.No, Checklist item | BTNS: ✕, Close
  - # · Tyre Unsetting | COLS: S.No, Checklist item | BTNS: ✕, Close

### `ae/rotation-discout-norms.html` — AE (HO Technical) — Rotation & Discout Norms
- H: Rotation & Discout Norms ; Active norms ; Fleet — J0264
- TABLE: Operated Days, Operated KM, Effective From
- TABLE: Operated Days, Operated KM, Effective From
- TABLE: Pos, Tyre No, Size, RT, NSD
- BTNS: ✕ | Close

### `ae/tyre-folio.html` — AE (HO Technical) — Tyre Folio
- H: Tyre Folio
- TABLE: Folio ID, Folio Name, Specification, Make, Makers model, Construction Type, Tube Type, Ply, Size, Status, Action
- LABELS: Status AllPending approvalApprovedReturned
- SEL (unlabelled filter) = All,Pending approval,Approved,Returned
- BTNS: Approve selected | Return selected | Approve | Return | Previous | 1 | Next
- **Popups / modals:**
  - View Tyre Folio — # | LABELS: Folio ID; Folio Name; Specification; Make; Makers model; Construction Type; Tube Type; Ply; Tyre size | BTNS: ✕, Close
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - Approve #? | BTNS: ✕, Cancel, Approve
  - Return # | LABELS: Reason * | INPUTS: Reason *|Reason for returning* | BTNS: ✕, Cancel, Return
  - Approve 1 folios? | BTNS: ✕, Cancel, Approve
  - Return 1 folios | LABELS: Reason * | INPUTS: Reason *|Reason for returning* | BTNS: ✕, Cancel, Return

### `ae/wear-pattern-master.html` — AE (HO Technical) — Wear Pattern Master
- H: Wear Pattern Master ; Audit Trail — SCH001
- TABLE: S.No, Pattern ID, Wear pattern, Status, Action
- BTNS: Approve selected | Return selected | Approve | Return | ✕ | Close
- **Popups / modals:**
  - Approve 1 wear pattern? | BTNS: ✕, Back, Approve
  - Return 1 wear pattern | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Return
  - (same as ae/drn-reason-master.html) #
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - (same as ae/drn-reason-master.html) Approve #?
  - (same as ae/drn-reason-master.html) Return #

---

## Role folder `sup/` — Supervisor

### `sup/fleet-master.html` — Supervisor — Fleet Master
- H: Fleet Master ; TLDC — Tyre SS0242
- TABLE: S.No, Fleet No, Reg Number, Type, Current KM, FC Status, Status, Location / Company, Actions
- TABLE: Stage, Thread Rubber, Bonding Gum, VC Patch, No. of VC, TRS Census, RT Date, Recom. Position, Achieved KM, Total KMS, TRS Remarks
- TABLE: Particulars, New Tyre Fitment, I Rotation, II Rotation, III Rotation, IV Rotation, V Rotation, VI Rotation, VII Rotation, VIII Rotation, IX Rotation
- TABLE: S.No, Fleet No, Position, Fitted Date, Removal Date, Route, KMS, Days Stopped, Days Running, Running Days KMS, Dead KMS, Total KMS, Reason for Removal
- TABLE: Route, Route Name, Fleet, Trips, KM Driven, First Driven, Last Driven, Tyre Position
- TABLE: S.No, Phase, From Date, To Date, No. of Days, Fleet No, Position, Location / Remarks
- TABLE: When, Fleet / Position, Detail
- TABLE: Date, Position, Cause, Repair action, Odometer (km), Repaired by, Remarks
- SEL (unlabelled filter) = All Records,Monthly Schedule,Weekly Schedule,Daily Schedule,Schedule-3 Schedule,FC Schedule,HFC Schedule,Oil Top-Up,Coolant Top-Up,Tyre Rotation
- BTNS: Export | View All | Change Status | ✕ | Depot Maintenance History | RT Maintenance History | Audit Trail | Print | 🖨 Print | Close
- **Popups / modals:**
  - (same as ae/fleet-master--air-type-requests-1.html) Fleet — #
  - Air-type conversion request | LABELS: Fleets to convert (0 selected); Convert to; Reason * | INPUTS: checkbox:; Reason *|e.g. these fleets moved to long ghat routes — nitrogen holds pressure better across temperature swings | SEL: Fleets to convert (0 selected)=All groups,Group A,Group B,Nitrogen round; Convert to=Nitrogen,Regular | COLS: S.No, Fleet No., Air Type, Group | BTNS: ✕, Cancel, Submit to HO (Technical)
  - (same as ae/fleet-master.html) (untitled)
  - (same as ae/fleet-master.html) FR · #
  - Fleet Tyre View | COLS: Position, Tyre No, Size, NSD, Tyre Condition, Fitted Date, Fitted KM, No of Days Fitted, Grade | BTNS: ✕, Close
  - Job cards / Unresolved job cards | LABELS: New assignee *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct Skill match; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; Reason *; New date *; Due date *; Due shift *; Assign to *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058 Rotation duty Skill match; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri  …
  - Job card created | COLS: Job ID, Job, Assigned to, Status | BTNS: ✕, Open in Job Card Register, Close
  - Job card created and assigned | COLS: Job ID, Job, Assigned to, Status | BTNS: ✕, Open in Job Card Register, Close
  - # · Inspection | COLS: Job Card No, Maintenance type, Date, Assigned to, Status | BTNS: ✕, ← Back to Create job card
  - Air Inflation · Air A | COLS: Maintenance type, Schedule, Last done, Next due, Job card | BTNS: ✕, ← Back to Create job card
  - Tyre Discout | COLS: Maintenance type, Schedule, Last done, Due, Tyres, Job card | BTNS: ✕, ← Back to Create job card
  - # · Complaint | COLS: Complaint No, Complaint type, Source, Raised by, Raised at, Job (from HO), Status | BTNS: ✕, ← Back to Create job card
  - New Job Card | LABELS: Vehicle Source Type; Fleet Number *; Register Number; Tyre Number *; Job Type *; Expected Completion Date; Complaint Category; Complaint; Job Code; Job *; Tyre size *; Live stock Good Unset tyre — 7.50 X 16 *; Tube; Flap; Disc; Live stock Good Set tyre to unset *; Instruction (optional); Due date *; Due shift *; Assign to *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct Skill match; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retrea …

### `sup/gin-approvals.html` — Supervisor — GIN Approvals
- H: GIN Approvals
- TABLE: S.No, GIN No, GIN Date & Time, Transfer No, From Depot / Unit, To Depot / Unit, Items, Requested By, Status, Action
- BTNS: Approve selected | Revert selected | Reject selected | Approve | Revert | Reject | Previous | 1 | Next
- **Popups / modals:**
  - Approve 2 GINs? | BTNS: ✕, Back, Approve
  - Revert 2 GINs | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Revert
  - Goods Issue Note — GIN-# | COLS: S.No, Folio ID, Folio Name, Specification, MTC No, Manufacturer No, Make, Makers Model, Size, Construction Type, Tube Type, UOM, Requested Qty, Issued Qty, Unit Price, Net Amount, Remarks, S.No, When, Who, Action, Comment | BTNS: ✕, Close, Print GIN
  - Audit Trail — GIN-# | BTNS: ✕, Close
  - Approve GIN-#? | BTNS: ✕, Back, Approve
  - Revert GIN-# | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Revert
  - Approve 4 indents? | BTNS: ✕, Back, Approve
  - Revert 4 indents | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Revert
  - Indent — IND-# | COLS: S.No, Folio ID, Folio Name, Specification, Size, Construction Type, Tube Type, UOM, Depot Stock, Min Stock, Maximum Stock, Request Qty, Issued Qty, Unit Price, Net Amount, Remarks, S.No, When, Who, Action, Comment | BTNS: ✕, Close, Print Indent
  - Audit Trail — IND-# | BTNS: ✕, Close
  - Approve IND-#? | BTNS: ✕, Back, Approve
  - Revert IND-# | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Revert
  - Reject 2 GINs | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Reject
  - Reject GIN-# | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Reject
  - Reject IND-# | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Reject
  - Reject 4 indents | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Reject

### `sup/grouping-approvals.html` — Supervisor — Grouping Approvals
- H: Grouping Approvals — Supervisor
- BTNS: Approve | Return
- **Popups / modals:**
  - Audit Trail — INS B | BTNS: ✕, Close
  - Approve INS B? | BTNS: ✕, Cancel, Approve
  - Return INS B | LABELS: Reason * | INPUTS: Reason *|Reason for returning* | BTNS: ✕, Cancel, Return
  - Audit Trail — Air B | BTNS: ✕, Close
  - Approve Air B? | BTNS: ✕, Cancel, Approve
  - Return Air B | LABELS: Reason * | INPUTS: Reason *|Reason for returning* | BTNS: ✕, Cancel, Return

### `sup/indent-approvals.html` — Supervisor — Indent Approvals
- H: Indent Approvals
- TABLE: S.No, Indent No, Indent Date, Depot / Unit, Indent Type, Total Qty, Requested By, Status, Action
- BTNS: Approve selected | Revert selected | Reject selected | Approve | Revert | Reject | Previous | 1 | Next
- **Popups / modals:**
  - (same as sup/gin-approvals.html) Approve 2 GINs?
  - (same as sup/gin-approvals.html) Revert 2 GINs
  - (same as sup/gin-approvals.html) Goods Issue Note — GIN-#
  - (same as sup/gin-approvals.html) Audit Trail — GIN-#
  - (same as sup/gin-approvals.html) Approve GIN-#?
  - (same as sup/gin-approvals.html) Revert GIN-#
  - (same as sup/gin-approvals.html) Approve 4 indents?
  - (same as sup/gin-approvals.html) Revert 4 indents
  - (same as sup/gin-approvals.html) Indent — IND-#
  - (same as sup/gin-approvals.html) Audit Trail — IND-#
  - (same as sup/gin-approvals.html) Approve IND-#?
  - (same as sup/gin-approvals.html) Revert IND-#
  - (same as sup/gin-approvals.html) Reject 2 GINs
  - (same as sup/gin-approvals.html) Reject GIN-#
  - (same as sup/gin-approvals.html) Reject IND-#
  - (same as sup/gin-approvals.html) Reject 4 indents

### `sup/job-management.html` — Supervisor — Job Card Register
- H: Job Card Register ; Job cards ; Tyre Rotation · Sep 2026 ; Tyre Discout · Sep 2026 ; Census · Sep 2026
- TABLE: S.No, Job Card Number, Fleet Number, Work Category, Assigned Technicians, Status, Action
- TABLE: S.No, Job Card Number, Fleet Number, Work Category, Assigned Technicians, Status, Action
- TABLE: S.No, Job Card Number, Fleet Number, Work Category, Assigned Technicians, Status, Action
- TABLE: S.No, Job Card Number, Fleet Number, Work Category, Assigned Technicians, Status, Action
- TABLE: S.No, Job Card Number, Fleet Number, Work Category, Assigned Technicians, Status, Action
- TABLE: Group, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, Sched., On time, Late, Pending, Upcoming, Done %
- TABLE: Group, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, Sched., On time, Late, Pending, Upcoming, Done %
- TABLE: Day, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, Total
- LABELS: From | To | Work category | Source | Fleet availability | Shift | Status | Global search | Date | Month
- SEL Work category = All types,Air Inflation,Air Inflation — Nitrogen,Inspection,Tyre Rotation,Tyre Discout,Census,Tyre Changing,Tyre Removal,Tyre Fitment,Tyre Setting,Tyre Unsetting
- SEL Source = All sources,Scheduled,Complaint,Reactive
- SEL Fleet availability = All,In depot,Out,Breakdown,Held up
- SEL jmShift = All shifts,AM,General,PM,Night
- SEL Status = All statuses,Not Assigned,Assigned,In Progress,On Hold,Awaiting WSR,Awaiting final inspection,Rework,Closed,Cancelled
- INPUTS: From | To | Global search | Date | Month
- BTNS: Rotation & Discout Norms | Air Inflation Norms | ⇩ Export CSV | + New Job Card | Job cards | Scheduled rounds | Assign selected | Replace selected | Reschedule | Open | On behalf | Hold reason | Final inspection | Previous | 1 | Next | View late / overdue
- **Popups / modals:**
  - (same as sup/fleet-master.html) New Job Card
  - Job card created | COLS: Job ID, Job, Assigned to, Status | BTNS: ✕, Close
  - Job card created and assigned | COLS: Job ID, Job, Assigned to, Status | BTNS: ✕, Close
  - (same as sup/fleet-master.html) # · Inspection
  - (same as sup/fleet-master.html) Air Inflation · Air A
  - (same as sup/fleet-master.html) Tyre Discout
  - (same as sup/fleet-master.html) # · Complaint
  - Census | COLS: Maintenance type, Schedule, Last done, Due, Job card | BTNS: ✕, ← Back to Create job card
  - Replace for today — M. Balamurugan (OSE) | LABELS: Replace with *; Shift *; KSK. SaravananTIC-1147Tyre Incharge · all tyre work94008 23576; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772; RMR. ManikandanTM-3145Air Inflation, Wheel Balanc …
  - Review — Replace for today | BTNS: ✕, Back, Confirm · replace 30 job cards
  - Assign selected — 4 job cards | LABELS: Due date *; Due shift *; Assign to *; KSK. SaravananTIC-1147Tyre Incharge · all tyre work94008 23576; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058 Rotation duty Skill match; DKD. KarthikTM-3163Nail Removal94060 97630; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772; RMR. ManikandanTM-314 …
  - Replace selected — 4 job cards | LABELS: Due date *; Due shift *; Assign to *; KSK. SaravananTIC-1147Tyre Incharge · all tyre work94008 23576; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058 Rotation duty Skill match; DKD. KarthikTM-3163Nail Removal94060 97630; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772; RMR. ManikandanTM-31 …
  - Review — Assign selected | BTNS: ✕, Back, Confirm · assign 4 job cards
  - Review — Replace selected | BTNS: ✕, Back, Confirm · replace 4 job cards
  - Tyre Rotation · Sep 2026 · late, overdue and today | COLS: Fleet, Due date, Done date, Late by, Done / assigned to, Status | BTNS: ✕, Close
  - Tyre Discout · Sep 2026 · late, overdue and today | COLS: Fleet, Due date, Done date, Late by, Done / assigned to, Status | BTNS: ✕, Close
  - Replace — # · # | LABELS: Due date *; Due shift *; Assign to *; KSK. SaravananTIC-1147Tyre Incharge · all tyre work94008 23576; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058 Discout duty; DKD. KarthikTM-3163Nail Removal94060 97630; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772; RMR. ManikandanTM-3145Air Inflation, Wheel Balan …
  - Cancel job card? | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Close, Yes, cancel job card
  - Add — # · # | LABELS: Add *; Shift *; KSK. SaravananTIC-1147Tyre Incharge · all tyre work94008 23576; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct Skill match; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services Skill match; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772 Skill match; RMR. ManikandanTM-3145Air Inflation, Wheel Balancin …
  - On behalf of D. Karthik — # · # | LABELS: Removed at *; Odometer (km) *; NSD at removal (mm) *; Tyre condition; Fitment tyre *; Fitted at *; Pressure after fitment (PSI) *; Photo (optional); WSR reason *; WSR remarks (optional); Reason for entering on behalf * | INPUTS: Removed at *|datetime-local*; Odometer (km) *|text*; NSD at removal (mm) *|text*; Fitted at *|datetime-local*; Pressure after fitment (PSI) *|text*; WSR reason *|text*; WSR remarks (optional)|text; Reason for entering on behalf *|text* | SEL: Tyre condition=Worn beyond limit,Cut / damage,Burst,Other; Fitment tyre *=— select —,RS0505 · Live stock Good Set,RS0683 · Live stock Good Set,RS0789 · Live stock Good Set; Photo (opti …
  - On hold — # · # | BTNS: ✕, Close
  - Replace — JC-# · No fleet | LABELS: Due date *; Due shift *; Assign to *; KSK. SaravananTIC-1147Tyre Incharge · all tyre work94008 23576; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct Skill match; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services Skill match; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772 Skill match; RMR. Manikandan …
  - Assign — # · # | LABELS: Due date *; Due shift *; Assign to *; KSK. SaravananTIC-1147Tyre Incharge · all tyre work94008 23576; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct Skill match; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services Skill match; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772 Skill match; RMR. ManikandanTM-3145Air  …
  - Assign — # · No fleet | LABELS: Due date *; Due shift *; Assign to *; KSK. SaravananTIC-1147Tyre Incharge · all tyre work94008 23576; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct Skill match; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services Skill match; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772 Skill match; RMR. ManikandanTM-3 …
  - Tyre Rotation · 20 Sep 2026 | COLS: S.No, Job Card No, Fleet, Job IDs, Assigned to, Status, Action | BTNS: ✕, Final inspection, On behalf, Hold reason, Close
  - JC-# — 19 Sep 2026 | COLS: S.No, Fleet No., Job Card No, Removal position, Fitment position, Complaint, Remarks / hold, Status, Tyre Man, Done at | BTNS: ✕, Close
  - Tyre Discout · 20 Sep 2026 | COLS: S.No, Job Card No, Fleet, Job IDs, Assigned to, Status, Action | BTNS: ✕, Final inspection, On behalf, Hold reason, Close
  - (same as ae/drn-reason-master.html) Audit Trail — #

### `sup/log-sheet-complaints.html` — Supervisor — Log Sheet Complaints
- H: Log Sheet Complaints ; Log a driver's log-sheet complaint
- TABLE: ID, Fleet, Driver, Shift, Wheel, Complaint, Logged at, Action
- TABLE: ID, Fleet, Driver, Shift, Wheel, Complaint, Logged at, Due
- LABELS: Fleet No. * | Shift | Driver name * | Driver Emp ID | Route | Run KM (today) | Shed-in time | Wheel / Tyre | Complaint type * | Remarks (what the driver wrote)
- SEL lsShift = Morning,General,Evening,Night
- SEL lsPos = General — not a specific wheel,FR,FL,RRI,RRO,RLI,RLO
- SEL lsType = Weak / faulty valve,Continuous leakage (slow puncture),Puncture — nail / foreign object,Tyre burst / blowout,Wrong tyre fitted — number does not match this position,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing,Other (see remarks)
- INPUTS: Fleet No. * | Driver name * | Driver Emp ID | Route | Run KM (today) | Shed-in time | Remarks (what the driver wrote)
- BTNS: + Log Sheet Complaint | ✕ | Cancel | Save to Complaints
- **Popups / modals:**
  - Log a driver's log-sheet complaint | LABELS: Fleet No. *; Shift; Driver name *; Driver Emp ID; Route; Run KM (today); Shed-in time; Wheel / Tyre; Complaint type *; Remarks (what the driver wrote) | INPUTS: Fleet No. *|e.g. J0264; Driver name *|e.g. K. Mohan; Driver Emp ID|e.g. DRV-4021; Route|e.g. Route 21G; Run KM (today)|e.g. 186; Shed-in time|e.g. 21:40; Remarks (what the driver wrote)|lsRemarks | SEL: Shift=Morning,General,Evening,Night; Wheel / Tyre=General — not a specific wheel,FR,FL,RRI,RRO,RLI,RLO; Complaint type *=Weak / faulty valve,Continuous leakage (slow puncture),Puncture — nail / foreign object,Tyre burst / blowout,Wrong tyre fitted — number does not match this position,Sid …

### `sup/roster-approvals.html` — Supervisor — Roster Approvals
- H: Roster Approvals
- TABLE: Week, Raised by, Sent at, Tyre men, Status, Action
- BTNS: Approve | Return
- **Popups / modals:**
  - Roster 31 Aug – 6 Sep 2026 | COLS: Tyre man, 31 AugMon, 01 SepTue, 02 SepWed, 03 SepThu, 04 SepFri, 05 SepSat, 06 SepSun | BTNS: ✕, Close
  - Audit Trail — Roster 31 Aug – 6 Sep 2026 | BTNS: ✕, Close
  - Roster 7 Sep – 13 Sep 2026 | COLS: Tyre man, 07 SepMon, 08 SepTue, 09 SepWed, 10 SepThu, 11 SepFri, 12 SepSat, 13 SepSun | BTNS: ✕, Close
  - Audit Trail — Roster 7 Sep – 13 Sep 2026 | BTNS: ✕, Close
  - Approve roster 21 Sep – 27 Sep 2026? | BTNS: ✕, Back, Approve
  - Return roster 21 Sep – 27 Sep 2026 | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Return

### `sup/skill-approvals.html` — Supervisor — Skill Approvals
- H: Skill Approvals
- TABLE: Request ID, Tyre man, Skill to add, Remarks, Raised, Status, Action
- BTNS: Approve | Return
- **Popups / modals:**
  - Skill request — # | BTNS: ✕, Close
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - (same as ae/drn-reason-master.html) Approve #?
  - (same as ae/drn-reason-master.html) Return #

### `sup/tyre-master.html` — Supervisor — Tyre Master
- H: Tyre Register ; TLDC — Tyre SS0242
- TABLE: Size, Fitted, Live stock, At TRS, At MIC Vehicle, Total
- TABLE: S.No, Tyre No, Depot, Size, Make, Grade, NSD, Location, Status
- TABLE: S.No, Depot, Makers No, Received date, Folio, Purchase date, Manufactured Date, Warranty Upto, Tyre No, Make, Makers model, Construction Type, Tube Type, Size, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet, Removal position, Removal reason, New KM, RT1 KM, RT2 KM, RT3 KM, RT4 KM, RT5 KM, Running KM, Total KM, Expected Life KM, Recent Census
- TABLE: Stage, Thread Rubber, Bonding Gum, VC Patch, No. of VC, TRS Census, RT Date, Recom. Position, Achieved KM, Total KMS, TRS Remarks
- TABLE: Particulars, New Tyre Fitment, I Rotation, II Rotation, III Rotation, IV Rotation, V Rotation, VI Rotation, VII Rotation, VIII Rotation, IX Rotation
- TABLE: S.No, Fleet No, Position, Fitted Date, Removal Date, Route, KMS, Days Stopped, Days Running, Running Days KMS, Dead KMS, Total KMS, Reason for Removal
- TABLE: Route, Route Name, Fleet, Trips, KM Driven, First Driven, Last Driven, Tyre Position
- TABLE: S.No, Phase, From Date, To Date, No. of Days, Fleet No, Position, Location / Remarks
- LABELS: Depot AllAdyarThiruvanmiyurMandaveliKannagi NagarPerumbakkamSemmencheriT.NagarSaidapetK.K.NagarAdambakkamChrompetTambaramChrompet-IIKilambakkamKundrathurIyyappanthangalVadapalaniPoonamalleeKoyambeduCentral DepotAyanavaramPeramburBasin BridgeAnna Nagar EastAnna NagarAmbatturAvadiVyasarpadiTondiarpet-1Tondiarpet-IIEnnoreMadhavaramPadiyanallur | Status AllFittedLive stockSetUnsetAt TRSAt MIC | Grade AllNewABC | Size All7.50 X 1610.00 X 20295/80R22.5— | Make AllJKCEATTOLINSApolloMRFBridgestone— | Construction Type AllRadialNylon | Bus model AllBS-IIIBS-IVBS-VILow FloorAC Low Floor
- SEL (unlabelled filter) = All,Adyar,Thiruvanmiyur,Mandaveli,Kannagi Nagar,Perumbakkam,Semmencheri,T.Nagar,Saidapet,K.K.Nagar,Adambakkam,Chrompet
- SEL Depot AllAdyarThiruvanmiyurMandaveliKannagi NagarPerumbakkamSemmencheriT.NagarSaidapetK.K.NagarAdambakkamChrompetTambaramChrompet-IIKilambakkamKundrathurIyyappanthangalVadapalaniPoonamalleeKoyambeduCentral DepotAyanavaramPeramburBasin BridgeAnna Nagar EastAnna NagarAmbatturAvadiVyasarpadiTondiarpet-1Tondiarpet-IIEnnoreMadhavaramPadiyanallur = All,Fitted,Live stock,Set,Unset,At TRS,At MIC
- SEL Status AllFittedLive stockSetUnsetAt TRSAt MIC = All,New,A,B,C
- SEL Grade AllNewABC = All,7.50 X 16,10.00 X 20,295/80R22.5,—
- SEL Size All7.50 X 1610.00 X 20295/80R22.5— = All,JK,CEAT,TOLINS,Apollo,MRF,Bridgestone,—
- SEL Make AllJKCEATTOLINSApolloMRFBridgestone— = All,Radial,Nylon
- SEL Construction Type AllRadialNylon = All,BS-III,BS-IV,BS-VI,Low Floor,AC Low Floor
- INPUTS: Bus model AllBS-IIIBS-IVBS-VILow FloorAC Low Floor
- BTNS: Summary | Detailed | ⇩ Export CSV | ✕ | Depot Maintenance History | RT Maintenance History | Audit Trail | Print | 🖨 Print | Close
- **Popups / modals:**
  - (same as ho/tyre-master.html) TLDC — Tyre #

---

## Role folder `tic/` — Tyre Incharge (TIC) — desktop/tablet

### `tic/complaints.html` — Tyre Incharge — Complaints
- H: Complaints ; Select Removal Fleet
- TABLE cmpT : Complaint ID, Source, Fleet, Position, Tyre No., Complaint Code, Suggested Job Codes, Raised by, Raised at, Job ref, Status, Action
- TABLE: Fleet No., Registration, Tyre Size, Model, Status
- LABELS: Source AllAir InflationInspectionLog SheetTyre Incharge | Status AllNewAssignedClosedRejected
- SEL (unlabelled filter) = All,Air Inflation,Inspection,Log Sheet,Tyre Incharge
- SEL Source AllAir InflationInspectionLog SheetTyre Incharge = All,New,Assigned,Closed,Rejected
- INPUTS: Status AllNewAssignedClosedRejected
- BTNS: Review & assign | ✕ | Cancel
- **Popups / modals:**
  - Complaint — # | BTNS: ✕, Close
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - Review & assign — # | LABELS: Decision *; Job *; Due date *; Due shift *; Assign to *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct Skill match; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services Skill match; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772 Skill match; RMR. ManikandanTM-3145Air Inflation, Wheel Balancing94045 61344; S …
  - Reject #? | BTNS: ✕, Back, Reject
  - (same as sup/fleet-master.html) New Job Card

### `tic/damage-reports.html` — Tyre Incharge — Tyre Damage Reports
- H: Tyre Damage Reports ; TLDC — Tyre SS0242
- TABLE: S.No, Request No, Date & Time, Job Card No, MTC No, Manufacturer No, Folio ID, Folio Name, Specification, Make, Makers Model, Size, Construction Type, Tube Type, Km Run, Fleet No, Injury, Request Reason, Requested By, Status, Action
- TABLE: Stage, Thread Rubber, Bonding Gum, VC Patch, No. of VC, TRS Census, RT Date, Recom. Position, Achieved KM, Total KMS, TRS Remarks
- TABLE: Particulars, New Tyre Fitment, I Rotation, II Rotation, III Rotation, IV Rotation, V Rotation, VI Rotation, VII Rotation, VIII Rotation, IX Rotation
- TABLE: S.No, Fleet No, Position, Fitted Date, Removal Date, Route, KMS, Days Stopped, Days Running, Running Days KMS, Dead KMS, Total KMS, Reason for Removal
- TABLE: Route, Route Name, Fleet, Trips, KM Driven, First Driven, Last Driven, Tyre Position
- TABLE: S.No, Phase, From Date, To Date, No. of Days, Fleet No, Position, Location / Remarks
- TABLE: When, Fleet / Position, Detail
- TABLE: Date, Position, Cause, Repair action, Odometer (km), Repaired by, Remarks
- BTNS: View | Fill Report | ✕ | Depot Maintenance History | RT Maintenance History | Audit Trail | Print | 🖨 Print | Close
- **Popups / modals:**
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - Tyre Damage Report — # | COLS: #, Details, Information | BTNS: ✕, Close
  - Damage Report Request — # | BTNS: ✕, Close
  - Tyre Damage Report — {{id}} | COLS: #, Details, Information | BTNS: ✕, Close

### `tic/dashboard.html` — Tyre Incharge — Dashboard
- H: Dashboard — Sun 20 Sep 2026
- TABLE: Material, Good, Set, Unset, Repair, Fitted
- TABLE: Folio ID, Folio Name, Available, Minimum, Backorder

### `tic/duty-posting.html` — Tyre Incharge — Duty Posting
- H: Inspection —
- BTNS: ✕ | Close | Start Inspection

### `tic/fleet-master--air-type-requests.html` — Tyre Incharge — Fleet Master
- H: Fleet Register ; Air-type conversion request
- TABLE: Fleets, To, Reason, Raised by, Stage
- TABLE: S.No, Fleet No., Air Type, Group
- LABELS: Fleets to convert (0 selected) | Convert to | Reason *
- SEL Fleets to convert (0 selected) = All groups,Group A,Group B,Nitrogen round
- SEL atrTo = Nitrogen,Regular
- INPUTS: Reason *
- BTNS: Raise a conversion request | ✕ | Cancel | Submit to HO (Technical)
- **Popups / modals:**
  - (same as ae/fleet-master--air-type-requests-1.html) Fleet — #
  - (same as sup/fleet-master.html) Air-type conversion request

### `tic/fleet-master.html` — Tyre Incharge — Fleet Master
- H: Fleet Master ; Fleet — J0264
- TABLE: S.No, Fleet No, Reg Number, Type, Current KM, FC Status, Status, Location / Company, Actions
- TABLE: Pos, Tyre No, Size, RT, NSD
- SEL (unlabelled filter) = All Records,Monthly Schedule,Weekly Schedule,Daily Schedule,Schedule-3 Schedule,FC Schedule,HFC Schedule,Oil Top-Up,Coolant Top-Up,Tyre Rotation
- BTNS: Export | View All | Change Status | ✕ | Close
- **Popups / modals:**
  - (same as ae/fleet-master--air-type-requests-1.html) Fleet — #
  - (same as sup/fleet-master.html) Air-type conversion request
  - (same as ae/fleet-master.html) (untitled)
  - (same as ae/fleet-master.html) FR · #
  - (same as sup/fleet-master.html) Fleet Tyre View
  - (same as sup/fleet-master.html) Job cards / Unresolved job cards
  - (same as sup/fleet-master.html) Job card created
  - (same as sup/fleet-master.html) Job card created and assigned
  - (same as sup/fleet-master.html) # · Inspection
  - (same as sup/fleet-master.html) Air Inflation · Air A
  - (same as sup/fleet-master.html) Tyre Discout
  - (same as sup/fleet-master.html) # · Complaint
  - (same as sup/fleet-master.html) New Job Card

### `tic/gate-pass.html` — Tyre Incharge — Gate Pass
- H: Tyre Gate Pass ; Raise WSR
- TABLE: S.No, Gate Pass No, Gate Pass Date & Time, Type, Source Reference, From, To, Items, Total Qty, Total Value, Vehicle / Driver, Status, Action
- LABELS: Tyre man | Job card (matches both Job Card No and Job ID to this WSR) | Materials needed | Tube | Flap | Disc
- SEL wsrTm = M. Perumal,S. Ilango,K. Bhaskar,P. Selvam,R. Manikandan,A. Jaganathan,D. Karthik,V. Suresh
- SEL wsrJob = — not tied to a job —,JC-ST-2609-20-01 — Tyre Setting · EX260001
- BTNS: + Create Gate Pass | Mark Exit | Cancel | Previous | 1 | Next | ✕ | Raise
- **Popups / modals:**
  - Create Gate Pass | LABELS: Vehicle Name *; Driver Name *; Phone No *; Odo KM; Fleet No *; Registration Number; Employee ID *; Employee Name; Phone No; Employee Type *; Person Name; Person Name *; Phone Number * | INPUTS: Vehicle Name *|text*; Driver Name *|text*; Phone No *|text*; Odo KM|number; Registration Number|text; Employee Name|text; Phone No|text; Person Name|text; Person Name *|text*; Phone Number *|text*; Phone Number *|text | SEL: =Choose the approved movement,Internal Transfer GIN (Outward),MRN (Outward),Goods Receipt Note (Inward),Central Store GIN (Inward); =Choose the source reference,GIN-MN-2026-0136 · Mandaveli Depot → TRS — Retreading Unit; =Choose the source reference,MR …
  - Mark exit — — | LABELS: Exit date & time *; Checked by (Security) *; Odo KM | INPUTS: Exit date & time *|datetime-local*; Checked by (Security) *|text*; Odo KM|number | BTNS: ✕, Back, Mark Exit
  - Cancel — | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Yes, cancel Gate Pass
  - Create Gate Pass — GIN-# | LABELS: Vehicle Name *; Driver Name *; Phone No *; Odo KM; Fleet No *; Registration Number; Employee ID *; Employee Name; Phone No; Employee Type *; Person Name; Person Name *; Phone Number * | INPUTS: Vehicle Name *|text*; Driver Name *|text*; Phone No *|text*; Odo KM|number; Registration Number|text; Employee Name|text; Phone No|text; Person Name|text; Person Name *|text*; Phone Number *|text*; Phone Number *|text | SEL: =Choose the approved movement,Internal Transfer GIN (Outward),MRN (Outward),Goods Receipt Note (Inward),Central Store GIN (Inward); =Choose the source reference,GIN-MN-2026-0136 · Mandaveli Depot → TRS — Retreading Unit; =Choose the source refe …
  - (same as sup/gin-approvals.html) Goods Issue Note — GIN-#
  - Gate Pass — GP-# | COLS: S.No, Folio ID, Folio Name, Specification, MTC No, Manufacturer No, Make, Makers Model, Size, Construction Type, Tube Type, UOM, Qty, Unit Price, Net Amount | BTNS: ✕, Close, Print Gate Pass
  - Audit Trail — GP-# | BTNS: ✕, Close
  - Gate Pass — {{GP}} | COLS: S.No, Folio ID, Folio Name, Specification, MTC No, Manufacturer No, Make, Makers Model, Size, Construction Type, Tube Type, UOM, Qty, Unit Price, Net Amount | BTNS: ✕, Close, Print Gate Pass
  - (same as sup/gin-approvals.html) Audit Trail — GIN-#

### `tic/gin.html` — Tyre Incharge — GIN
- H: GIN — Goods Issue Note ; Goods Issue Note — GIN-MN-2026-0098
- TABLE: S.No, GIN No, GIN Date & Time, GIN Type, Request ID, From Depot / Unit, To Depot / Unit, Items, Requested By, Status, Action
- TABLE: S.No, Tyre No, Manufacturer No, Size, Make, Makers Model, Grade, Tyre Condition, Recent Census, No of Groove
- LABELS: Status AllDraftAwaiting approvalRevertedApprovedRejectedIn transitReceivedCancelled | GIN Type AllInternal Transfer
- SEL (unlabelled filter) = All,Draft,Awaiting approval,Reverted,Approved,Rejected,In transit,Received,Cancelled
- SEL Status AllDraftAwaiting approvalRevertedApprovedRejectedIn transitReceivedCancelled = All,Internal Transfer
- BTNS: Send for Approval | Withdraw | Create Gate Pass → | Cancel | Previous | 1 | Next | ✕ | Close | 🖨 Print GIN
- **Popups / modals:**
  - Create GIN | LABELS: Destination *; Depot *; Indent No *; Reason *; Tyres * | INPUTS: Reason *|text*; checkbox: | SEL: Destination *=— select —,TRS — Retreading Unit,Other depot,MIC Vehicle; Depot *=— select —,Adyar Depot,Tambaram Depot; Indent No *=— select —,IND-AD-2026-0044 · Adyar Depot · Tyre 7.50 X 16 · A × 1; Tube 7.50 X 16 × 1; Flap 16" × 1,IND-MIC-2026-0006 · MIC Vehicle Unit · Tyre 7.50 X 16 · New × 1,IND-TB-2026-0031 · Tambaram Depot · Tyre 10.00 X 20 · A × 1 | COLS: Folio ID, Folio Name, Specification, MTC No, Manufacturer No, Make, Makers Model, Size, Construction Type, Tube Type, UOM, Requested Qty, Issued Qty, Unit Price, Net Amount, Remarks, Folio ID, Folio Name, Specificat …
  - Send for approval? | BTNS: ✕, Back, Send for Approval
  - (same as ho/drn-reason-master.html) Send — for approval?
  - Delete —? | BTNS: ✕, Back, Delete
  - (same as ho/drn-reason-master.html) Withdraw —
  - Cancel — | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Yes, cancel GIN
  - Create GIN — against IND-# | LABELS: Destination *; Depot *; Indent No *; Indent items; Reason *; Tyres * | INPUTS: Indent items|number; Reason *|text*; checkbox: | SEL: Destination *=— select —,TRS — Retreading Unit,Other depot,MIC Vehicle; Depot *=— select —,Adyar Depot,Tambaram Depot; Indent No *=— select —,IND-AD-2026-0044 · Adyar Depot · Tyre 7.50 X 16 · A × 1; Tube 7.50 X 16 × 1; Flap 16" × 1,IND-MIC-2026-0006 · MIC Vehicle Unit · Tyre 7.50 X 16 · New × 1,IND-TB-2026-0031 · Tambaram Depot · Tyre 10.00 X 20 · A × 1 | COLS: Item, Size, Grade / Condition, Requested qty, Issue qty *, Tyre No, Size, Make, Grade, NSD, Tyre No, Size, Make, Grade, NSD | BTNS: ✕, Cancel, Save as Draft, Send f …
  - (same as sup/gin-approvals.html) Goods Issue Note — GIN-#
  - (same as sup/gin-approvals.html) Audit Trail — GIN-#
  - Edit — GIN-# | LABELS: Destination *; Depot *; Indent No *; Reason *; Tyres * | INPUTS: Reason *|text*; checkbox: | SEL: Destination *=— select —,TRS — Retreading Unit,Other depot,MIC Vehicle; Depot *=— select —,Adyar Depot,Tambaram Depot; Indent No *=— select —,IND-AD-2026-0044 · Adyar Depot · Tyre 7.50 X 16 · A × 1; Tube 7.50 X 16 × 1; Flap 16" × 1,IND-MIC-2026-0006 · MIC Vehicle Unit · Tyre 7.50 X 16 · New × 1,IND-TB-2026-0031 · Tambaram Depot · Tyre 10.00 X 20 · A × 1 | COLS: Folio ID, Folio Name, Specification, MTC No, Manufacturer No, Make, Makers Model, Size, Construction Type, Tube Type, UOM, Requested Qty, Issued Qty, Unit Price, Net Amount, Remarks, Folio ID, Folio Name, Specific …
  - GIN — GIN-# | COLS: S.No, Folio No, Folio Name, Specification, MTC No, UOM, Requested Qty, Issued Qty, Unit Price, Net Amount, Remarks | BTNS: ✕, Close, Print
  - (same as tic/gate-pass.html) Create Gate Pass — GIN-#

### `tic/grn.html` — Tyre Incharge — GRN
- H: GRN ; GRN — GRN-MN-IN-0027
- TABLE: S.No, From Depot / Unit, GRN No, GRN Date & Time, Source, Received Qty, Accepted Qty, Rejected Qty, Value, Status, Action
- TABLE: S.No, Tyre No, Status
- LABELS: From AllTRS — Retreading UnitOther depotMIC Vehicle
- SEL (unlabelled filter) = All,TRS — Retreading Unit,Other depot,MIC Vehicle
- BTNS: + Receive from MIC | Receive | Previous | 1 | Next | ✕ | Close
- **Popups / modals:**
  - Receive from MIC Vehicle | LABELS: Received date & time *; Removed tyre No *; Fleet No * | INPUTS: Received date & time *|datetime-local*; checkbox:; Removed tyre No *|text*; Fleet No *|text* | SEL: Received date & time *=Returned unused,Fitted on road — removed tyre returned; Fleet No *=Returned unused,Fitted on road — removed tyre returned; Fleet No *=Returned unused,Fitted on road — removed tyre returned; Fleet No *=Returned unused,Fitted on road — removed tyre returned; Fleet No *=Returned unused,Fitted on road — removed tyre returned; Fleet No *=Returned unused,Fitted on road — removed tyre returned | COLS: Tyre No (issued), Size, Make, Grade, Issued to MIC, Returned as | BTNS: ✕, Can …
  - Review — GRN | COLS: S.No, Tyre No, Returned as | BTNS: ✕, Back, Confirm
  - Receive tyres — TRS-# | LABELS: Received date & time * | INPUTS: Received date & time *|datetime-local*; checkbox: | COLS: S.No, Tyre No, Folio No, Folio Name, Specification, Manufacturer No, Size, Make, Makers Model, Construction Type, Tube Type, Grade, Sent to TRS, Tyre Condition, Result, Reject reason | BTNS: ✕, Accept, Reject, Cancel, Receive
  - Receive tyres — IND-# · GIN-# | LABELS: Received date & time * | INPUTS: Received date & time *|datetime-local*; checkbox: | COLS: S.No, Tyre No, Folio No, Folio Name, Specification, Manufacturer No, Size, Make, Makers Model, Construction Type, Tube Type, Grade, NSD, Result, Reject reason | BTNS: ✕, Accept, Reject, Cancel, Receive
  - Goods Receipt Note — GRN-MN-# | COLS: S.No, Folio ID, Folio Name, Specification, MTC No, Manufacturer No, Make, Makers Model, Size, Construction Type, Tube Type, Batch No, UOM, Requested Qty, Received Qty, Accepted Qty, Rejected Qty, Unit Price, Net Amount, Remarks | BTNS: ✕, Close, Print GRN
  - Audit Trail — GRN-MN-# | BTNS: ✕, Close
  - Receive — RO-# | LABELS: Goes To * | SEL: Goes To *=Select,Live stock,Ready for Transit,DRN | COLS: S.No, MTC No, Manufacturer No, Folio ID, Folio Name, Specification, Make, Makers Model, Size, Construction Type, Tube Type, Removal Reason, Wear Pattern, NSD | BTNS: ✕, Cancel, Receive
  - TLDC — Tyre {{no}} | COLS: Stage, Thread Rubber, Bonding Gum, VC Patch, TRS Census, RT Date, Achieved KM, Total KMS | BTNS: ✕, Close
  - GIN — TRS-# | COLS: S.No, Folio ID, Folio Name, Specification, MTC No, Manufacturer No, Make, Makers Model, Size, Construction Type, Tube Type, UOM, Requested Qty, Issued Qty, Unit Price, Net Amount, Remarks, S.No, When, Who, Action, Comment | BTNS: ✕, Back, Close
  - GIN — GIN-# | COLS: S.No, Folio ID, Folio Name, Specification, MTC No, Manufacturer No, Make, Makers Model, Size, Construction Type, Tube Type, UOM, Requested Qty, Issued Qty, Unit Price, Net Amount, Remarks, S.No, When, Who, Action, Comment | BTNS: ✕, Back, Close
  - (same as sup/gin-approvals.html) Indent — IND-#

### `tic/group-master.html` — Tyre Incharge — Fleet Grouping
- H: Fleet Grouping ; Air Inflation ; Air Inflation — Nitrogen ; Inspection
- LABELS: Schedule | Search name
- SEL Schedule = All types,SCH001 — Air Inflation,SCH002 — Air Inflation — Nitrogen,SCH003 — Inspection
- INPUTS: Search name
- BTNS: + Create Group | Withdraw
- **Popups / modals:**
  - Create fleet group | LABELS: Group name; Job type; Filter Fleet Register to find fleets; Reason for change * | INPUTS: Group name|Enter group name; Reason for change *|e.g. new group for next month's rotation split; checkbox: | SEL: Job type=Air Inflation,Air Inflation — Nitrogen,Inspection; Filter Fleet Register to find fleets=All model types,BSIV,BS-III,Low Floor,AC,Deluxe; Filter Fleet Register to find fleets=All tyre sizes,7.50 X 16,10.00 X 20,295/80R22.5; Filter Fleet Register to find fleets=All air types,Regular,Nitrogen | COLS: Fleet No, Reg, Model type, Size, Air type | BTNS: ✕, Cancel, Save
  - Edit groups — Air Inflation | INPUTS: |Add a note or instruction for this board (optional) | SEL: =All model types,BSIV,BS-III,Low Floor,AC,Deluxe; =All tyre sizes,7.50 X 16,10.00 X 20,295/80R22.5; =All air types,Regular,Nitrogen | BTNS: ✕, Cancel, Send for Approval
  - Edit groups — Air Inflation — Nitrogen | INPUTS: |Add a note or instruction for this board (optional) | SEL: =All model types,BSIV,BS-III,Low Floor,AC,Deluxe; =All tyre sizes,7.50 X 16,10.00 X 20,295/80R22.5; =All air types,Regular,Nitrogen | BTNS: ✕, Cancel, Send for Approval
  - Edit groups — Inspection | INPUTS: |Add a note or instruction for this board (optional) | SEL: =All model types,BSIV,BS-III,Low Floor,AC,Deluxe; =All tyre sizes,7.50 X 16,10.00 X 20,295/80R22.5; =All air types,Regular,Nitrogen | BTNS: ✕, Cancel, Send for Approval
  - Audit Trail — Air A | BTNS: ✕, Close
  - Air A | COLS: S.No, Fleet No, Reg No, Model type, Size, Air type | BTNS: ✕, Close
  - (same as sup/grouping-approvals.html) Audit Trail — Air B
  - Air B | COLS: S.No, Fleet No, Reg No, Model type, Size, Air type | BTNS: ✕, Close
  - Audit Trail — Nitrogen A | BTNS: ✕, Close
  - Nitrogen A | COLS: S.No, Fleet No, Reg No, Model type, Size, Air type | BTNS: ✕, Close
  - Ungrouped fleets — Inspection | COLS: S.No, Fleet No, Reg No, Model type, Size, Air type | BTNS: ✕, Close
  - Audit Trail — INS A | BTNS: ✕, Close
  - INS A | COLS: S.No, Fleet No, Reg No, Model type, Size, Air type | BTNS: ✕, Close
  - (same as sup/grouping-approvals.html) Audit Trail — INS B
  - INS B | COLS: S.No, Fleet No, Reg No, Model type, Size, Air type | BTNS: ✕, Close
  - (same as ho/expected-life-km.html) Send for Approval?
  - Withdraw INS B | LABELS: Reason * | INPUTS: Reason *|Reason for withdrawing* | BTNS: ✕, Cancel, Withdraw
  - Withdraw Air B | LABELS: Reason * | INPUTS: Reason *|Reason for withdrawing* | BTNS: ✕, Cancel, Withdraw

### `tic/internal-transfer-request.html` — Tyre Incharge — Internal Transfer Request
- H: Internal Transfer Request ; Log an other-depot tyre's arrival
- TABLE: S.No, Request ID, Request Date, From Depot / Unit, Material, Total Qty, Requested By, Status, Action
- LABELS: Status AllDraftAwaiting approvalRevertedSentNewAcceptedIn transitPartly issuedPartly receivedIssuedReceivedRejectedCancelled | Tyre No. * | Makers No. | From Depot * | GRN No. | Size | Make | Grade | On our fleet (optional) | Reason present here *
- SEL (unlabelled filter) = All,Draft,Awaiting approval,Reverted,Sent,New,Accepted,In transit,Partly issued,Partly received,Issued,Received
- SEL odGrade = New,A,B,C
- INPUTS: Tyre No. * | Makers No. | From Depot * | GRN No. | Size | Make | On our fleet (optional) | Reason present here *
- BTNS: Accept & Create GIN → | Reject | ✕ | Cancel | Log arrival
- **Popups / modals:**
  - Create Indent | LABELS: Indent Type *; Material Type *; Indent No; Indent Date *; From Depot / Unit *; Request To *; Requested By *; Required For; Remarks | INPUTS: Indent Type *|text; Indent No|text; Indent Date *|date; From Depot / Unit *|text; Requested By *|text; Required For|e.g. All Depot; Remarks|text; Remarks|number | SEL: Material Type *=Select Material Type,New,Tyre; Request To *=Select where to request from; Request To *=Select where to request from,Material CS; Request To *=Select where to request from,TRS Chrompet,TRS Tondiarpet,K.K. Nagar,Anna Nagar,T. Nagar,Saidapet,Tambaram,Vyasarpadi,Thiruvanmiyur; Remarks=— select —,F7001 · TOLINS EnduRace RA 7.50 X 16,F7004 · CEAT R156 1 …
  - (same as tic/gin.html) Send for approval?
  - (same as ho/drn-reason-master.html) Send — for approval?
  - (same as tic/gin.html) Delete —?
  - (same as ho/drn-reason-master.html) Withdraw —
  - Cancel — | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Yes, cancel indent
  - Close — | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Close indent
  - Reject — | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Reject
  - (same as sup/gin-approvals.html) Indent — IND-#
  - (same as sup/gin-approvals.html) Audit Trail — IND-#
  - Edit — IND-# | LABELS: Indent Type *; Material Type *; Indent No; Indent Date *; From Depot / Unit *; Request To *; Requested By *; Required For; Remarks | INPUTS: Indent Type *|text; Indent No|text; Indent Date *|date; From Depot / Unit *|text; Requested By *|text; Required For|e.g. All Depot; Remarks|text; Remarks|number | SEL: Material Type *=Select Material Type,New,Tyre; Request To *=Select where to request from; Request To *=Select where to request from,Material CS; Request To *=Select where to request from,TRS Chrompet,TRS Tondiarpet,K.K. Nagar,Anna Nagar,T. Nagar,Saidapet,Tambaram,Vyasarpadi,Thiruvanmiyur; Remarks=— select —,F7001 · TOLINS EnduRace RA 7.50 X 16,F7004 · CEAT R156 10 …

### `tic/job-management.html` — Tyre Incharge — Job Card Register
- H: Job Card Register ; Job cards ; Tyre Rotation · Sep 2026 ; Tyre Discout · Sep 2026 ; Census · Sep 2026 ; Inspection —
- TABLE: S.No, Job Card Number, Fleet Number, Work Category, Assigned Technicians, Status, Action
- TABLE: S.No, Job Card Number, Fleet Number, Work Category, Assigned Technicians, Status, Action
- TABLE: S.No, Job Card Number, Fleet Number, Work Category, Assigned Technicians, Status, Action
- TABLE: S.No, Job Card Number, Fleet Number, Work Category, Assigned Technicians, Status, Action
- TABLE: S.No, Job Card Number, Fleet Number, Work Category, Assigned Technicians, Status, Action
- TABLE: Group, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, Sched., On time, Late, Pending, Upcoming, Done %
- TABLE: Group, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, Sched., On time, Late, Pending, Upcoming, Done %
- TABLE: Day, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, Total
- LABELS: From | To | Work category | Source | Fleet availability | Shift | Status | Global search | Date | Month
- SEL Work category = All types,Air Inflation,Air Inflation — Nitrogen,Inspection,Tyre Rotation,Tyre Discout,Census,Tyre Changing,Tyre Removal,Tyre Fitment,Tyre Setting,Tyre Unsetting
- SEL Source = All sources,Scheduled,Complaint,Reactive
- SEL Fleet availability = All,In depot,Out,Breakdown,Held up
- SEL jmShift = All shifts,AM,General,PM,Night
- SEL Status = All statuses,Not Assigned,Assigned,In Progress,On Hold,Awaiting WSR,Awaiting final inspection,Rework,Closed,Cancelled
- INPUTS: From | To | Global search | Date | Month
- BTNS: Rotation & Discout Norms | Air Inflation Norms | ⇩ Export CSV | + New Job Card | Job cards | Scheduled rounds | Assign selected | Replace selected | Reschedule | Open | On behalf | Hold reason | Final inspection | Previous | 1 | Next | View late / overdue | ✕ | Close | Start Inspection
- **Popups / modals:**
  - (same as sup/fleet-master.html) New Job Card
  - (same as sup/job-management.html) Job card created
  - (same as sup/job-management.html) Job card created and assigned
  - (same as sup/fleet-master.html) # · Inspection
  - (same as sup/fleet-master.html) Air Inflation · Air A
  - (same as sup/fleet-master.html) Tyre Discout
  - (same as sup/fleet-master.html) # · Complaint
  - (same as sup/job-management.html) Census
  - Replace for today — M. Balamurugan (OSE) | LABELS: Replace with *; Shift *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772; RMR. ManikandanTM-3145Air Inflation, Wheel Balancing94045 61344; SVS. VigneshOSE-002Tyre Rotation, Wheel Balancin …
  - (same as sup/job-management.html) Review — Replace for today
  - Assign selected — 4 job cards | LABELS: Due date *; Due shift *; Assign to *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058 Rotation duty Skill match; DKD. KarthikTM-3163Nail Removal94060 97630; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772; RMR. ManikandanTM-3145Air Inflation, Wheel Balancing94045 61344; SVS. VigneshOSE-002T …
  - Replace selected — 4 job cards | LABELS: Due date *; Due shift *; Assign to *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058 Rotation duty Skill match; DKD. KarthikTM-3163Nail Removal94060 97630; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772; RMR. ManikandanTM-3145Air Inflation, Wheel Balancing94045 61344; SVS. VigneshOSE-002 …
  - (same as sup/job-management.html) Review — Assign selected
  - (same as sup/job-management.html) Review — Replace selected
  - (same as sup/job-management.html) Tyre Rotation · Sep 2026 · late, overdue and today
  - (same as sup/job-management.html) Tyre Discout · Sep 2026 · late, overdue and today
  - Replace — # · # | LABELS: Due date *; Due shift *; Assign to *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058 Discout duty; DKD. KarthikTM-3163Nail Removal94060 97630; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772; RMR. ManikandanTM-3145Air Inflation, Wheel Balancing94045 61344; SVS. VigneshOSE-002Tyre Rotation, Wheel Balanci …
  - (same as sup/job-management.html) Cancel job card?
  - Add — # · # | LABELS: Add *; Shift *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct Skill match; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services Skill match; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772 Skill match; RMR. ManikandanTM-3145Air Inflation, Wheel Balancing94045 61344; SVS. VigneshOSE-002Tyre Rotation, Wheel Balancing9 …
  - (same as sup/job-management.html) On behalf of D. Karthik — # · #
  - (same as sup/job-management.html) On hold — # · #
  - Replace — JC-# · No fleet | LABELS: Due date *; Due shift *; Assign to *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct Skill match; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services Skill match; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772 Skill match; RMR. ManikandanTM-3145Air Inflation, Wheel Balancing94045 61344; SVS. VigneshOS …
  - Assign — # · # | LABELS: Due date *; Due shift *; Assign to *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct Skill match; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services Skill match; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772 Skill match; RMR. ManikandanTM-3145Air Inflation, Wheel Balancing94045 61344; SVS. VigneshOSE-002Tyre R …
  - Assign — # · No fleet | LABELS: Due date *; Due shift *; Assign to *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct Skill match; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services Skill match; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772 Skill match; RMR. ManikandanTM-3145Air Inflation, Wheel Balancing94045 61344; SVS. VigneshOSE-00 …
  - (same as sup/job-management.html) Tyre Rotation · 20 Sep 2026
  - (same as sup/job-management.html) JC-# — 19 Sep 2026
  - (same as sup/job-management.html) Tyre Discout · 20 Sep 2026
  - (same as sup/job-management.html) Census · 20 Sep 2026
  - (same as sup/job-management.html) # — Census
  - (same as sup/job-management.html) Air Inflation · Air A · —
  - (same as sup/job-management.html) Air Inflation · Air A · Sep 2026 — fleet-wise
  - (same as sup/job-management.html) Air Inflation · Air B · —
  - (same as sup/job-management.html) Air Inflation · Air B · Sep 2026 — fleet-wise
  - (same as sup/job-management.html) Air Inflation · Nitrogen A · —
  - (same as sup/job-management.html) Air Inflation · Nitrogen A · Sep 2026 — fleet-wise
  - (same as sup/job-management.html) Inspection · INS A · —
  - (same as sup/job-management.html) Inspection · INS A · Sep 2026 — fleet-wise
  - (same as sup/job-management.html) Inspection · INS B · —
  - (same as sup/job-management.html) Inspection · INS B · Sep 2026 — fleet-wise
  - Reschedule — # · # | LABELS: New date *; Assign to *; Shift *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058 Rotation duty Skill match; DKD. KarthikTM-3163Nail Removal94060 97630; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772; RMR. ManikandanTM-3145Air Inflation, Wheel Balancing94045 61344; SVS. VigneshOSE-002Tyre Rotation, W …
  - (same as sup/job-management.html) Air Inflation · Air B
  - (same as sup/job-management.html) Air Inflation — Nitrogen · Nitrogen A
  - (same as sup/job-management.html) Inspection · INS A
  - Inspection · INS B | LABELS: New date *; Reason *; New reason *; Remarks; Shift *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630On leave; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct Skill match; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services Skill match; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772 Skill match; RMR. ManikandanTM-3145Air Inflation, Wheel Balancing94045 61344; SVS.  …
  - (same as sup/job-management.html) Tyre Rotation & Discout Norms
  - (same as sup/job-management.html) Job card — # · #
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - (same as sup/job-management.html) Job card — JC-# · No fleet
  - (same as sup/job-management.html) Audit Trail — JC-#
  - (same as sup/job-management.html) Final inspection — JC-#
  - (same as sup/job-management.html) Job card — # · No fleet
  - (same as sup/job-management.html) Final inspection — #
  - (same as sup/job-management.html) Submit final inspection?
  - (same as sup/job-management.html) Final inspection · selected — Air B
  - (same as sup/job-management.html) Final inspection · selected — Nitrogen A
  - (same as sup/job-management.html) Final inspection · selected — INS A
  - Assign — — | LABELS: Due date *; Due shift *; Assign to *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct Skill match; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services Skill match; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772 Skill match; RMR. ManikandanTM-3145Air Inflation, Wheel Balancing94045 61344; SVS. VigneshOSE-002Tyre Rotat …
  - Replace — — | LABELS: Due date *; Due shift *; Assign to *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct Skill match; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services Skill match; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772 Skill match; RMR. ManikandanTM-3145Air Inflation, Wheel Balancing94045 61344; SVS. VigneshOSE-002Tyre Rota …
  - Add — — | LABELS: Add *; Shift *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct Skill match; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services Skill match; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772 Skill match; RMR. ManikandanTM-3145Air Inflation, Wheel Balancing94045 61344; SVS. VigneshOSE-002Tyre Rotation, Wheel Balancing94399 …
  - (same as sup/job-management.html) On behalf of — — —
  - (same as sup/job-management.html) On hold — —
  - (same as sup/job-management.html) On behalf — #
  - (same as sup/job-management.html) On behalf — JC-#
  - (same as sup/job-management.html) Job card — JC-# · #
  - (same as sup/job-management.html) Raise WSR
  - (same as sup/job-management.html) AM shift · 20 Sep 2026
  - (same as sup/job-management.html) General shift · 20 Sep 2026
  - (same as sup/job-management.html) PM shift · 20 Sep 2026
  - (same as sup/job-management.html) Night shift · 20 Sep 2026
  - (same as sup/job-management.html) Air Inflation Norms

### `tic/material-return-grn.html` — Tyre Incharge — Material Return Note - GRN
- H: (MRN) Material Return Note - GRN ; GRN — GRN-MN-IN-0027
- TABLE: S.No, GRN No, Source, GRN Date & Time, Requested By, Requested To, Issued Qty, Accepted Qty, Rejected Qty, Status, Action
- TABLE: S.No, Tyre No, Status
- BTNS: Receive | Previous | 1 | Next | ✕ | Close
- **Popups / modals:**
  - (same as tic/grn.html) Receive from MIC Vehicle
  - (same as tic/grn.html) Review — GRN
  - Receive tyres — TRS-# | LABELS: Received date & time *; Discrepancy reason *; Remarks | INPUTS: Received date & time *|datetime-local*; checkbox:; Remarks|text | SEL: Discrepancy reason *=— select —,Tyre missing from shipment,Wrong Tyre Sent — different tyre number received,Casing Damaged — damaged beyond use,Grade Variance — retreaded grade does not match expectation | COLS: S.No, Tyre No, Size, Make, Grade, Sent to TRS, Tyre Condition, Result | BTNS: ✕, Accept, Discrepancy, Cancel, Receive
  - Receive tyres — IND-# · GIN-# | LABELS: Received date & time *; Discrepancy reason *; Remarks | INPUTS: Received date & time *|datetime-local*; checkbox:; Remarks|text | SEL: Discrepancy reason *=— select —,Tyre missing from shipment,Wrong Tyre Sent — different tyre number received,Casing Damaged — damaged beyond use,Grade Variance — retreaded grade does not match expectation | COLS: S.No, Tyre No, Size, Make, Grade, NSD, Result | BTNS: ✕, Accept, Discrepancy, Cancel, Receive
  - (same as tic/grn.html) Goods Receipt Note — GRN-MN-#
  - (same as tic/grn.html) Audit Trail — GRN-MN-#
  - Receive — MRN-# | LABELS: Goes To * | SEL: Goes To *=Select,Live stock,Ready for Transit,DRN | COLS: S.No, MTC No, Manufacturer No, Folio ID, Folio Name, Specification, Make, Makers Model, Size, Construction Type, Tube Type, Removal Reason, Wear Pattern, NSD | BTNS: ✕, Cancel, Receive
  - (same as tic/grn.html) TLDC — Tyre {{no}}
  - (same as sup/job-management.html) Job card — # · #

### `tic/my-jobs.html` — Tyre Incharge — My Jobs
- H: My Jobs ; Job cards ; Inspection —
- TABLE: Job Card No, Maintenance Type, Fleet / Tyre, Job IDs, Date, Status, Action
- LABELS: From | To | Status
- SEL Status = All statuses,Assigned,In Progress,On Hold,Completed
- INPUTS: From | To
- BTNS: Open | View | ✕ | Close | Start Inspection
- **Popups / modals:**
  - Tyre Changing — # | LABELS: Removed at *; Odometer (km) *; NSD at removal (mm) *; Tyre condition; Fitment tyre *; Fitted at *; Pressure after fitment (PSI) *; Photo (optional); WSR reason * | INPUTS: Removed at *|datetime-local*; Odometer (km) *|text*; NSD at removal (mm) *|text*; Fitted at *|datetime-local*; Pressure after fitment (PSI) *|text*; WSR reason *|text* | SEL: Tyre condition=Worn beyond limit,Cut / damage,Burst,Other; Fitment tyre *=— select —,RS0505 · Live stock Good Set,RS0683 · Live stock Good Set; Photo (optional)=No,Yes — raise WSR | BTNS: ✕, Set tyre not available, Close, Hold, Save progress, Complete job
  - Hold — # | LABELS: Reason *; Remarks | INPUTS: Remarks|text | SEL: Reason *=— select —,Moved to an urgent job,Set tyre not available,Tube / flap / disc not available,Equipment down,Fleet left the depot,Shift ended,Other (see remarks) | BTNS: ✕, Back, Hold job
  - Raise complaint — Set tyre not available | LABELS: Remarks | INPUTS: Remarks|text | BTNS: ✕, Back, Raise complaint
  - JC-# | BTNS: ✕, Close
  - (same as ae/drn-reason-master.html) #
  - Census — # | LABELS: Remarks (optional) | INPUTS: |_-_-_-_*; |_-_-_-_-_*; Remarks (optional)|text | SEL: =— select —,Even wear,Centre wear,Both-shoulder wear,One-side shoulder wear,Cupping / scalloping,Feathering,Heel and toe wear,Flat spot; =— select —,Even wear,Centre wear,Both-shoulder wear,One-side shoulder wear,Cupping / scalloping,Feathering,Heel and toe wear,Flat spot; =— select —,Even wear,Centre wear,Both-shoulder wear,One-side shoulder wear,Cupping / scalloping,Feathering,Heel and toe wear,Flat spot; =— select —,Even wear,Centre wear,Both-shoulder wear,One-side shoulder wear,Cupping / scalloping,Feathering,Heel and toe wear,Flat spot; =— select —,Even wear,Centre wear,Both-should …
  - Census · 20 Sep 2026 | COLS: S.No, Job Card No, Fleet, Reg No, Tyre Size, Tyres checked, Tyre man, Status, Action | BTNS: ✕, + Add tyre man, Start, Close
  - Hold — Census | LABELS: Reason *; Remarks | INPUTS: Remarks|text | SEL: Reason *=— select —,Moved to an urgent job,Set tyre not available,Tube / flap / disc not available,Equipment down,Fleet left the depot,Shift ended,Other (see remarks) | BTNS: ✕, Back, Hold job
  - Add tyre man — Census · 20 Sep 2026 | LABELS: Add tyre man *; Shift *; KBK. BhaskarTM-3124Retreading, Tyre Rotation94030 25058; DKD. KarthikTM-3163Nail Removal94060 97630; RDR. DhanushOSE-001Air Inflation94395 95000Contractor · Sri Balaji Manpower Services; PYP. YuvarajOSE-005Tyre Fitment, Retreading94408 93716Direct; PSP. SelvamTM-3137Wheel Alignment94037 93201; VSV. SureshTM-3179Wheel Balancing, Retreading94068 65773On leave; KAK. ArunkumarOSE-003Tyre Fitment94402 44358Contractor · Sri Balaji Manpower Services; MPM. PerumalTM-3092Tyre Fitment, Wheel Alignment94014 88772; RMR. ManikandanTM-3145Air Inflation, Wheel Balancing94045 61344; SVS. VigneshOSE-002Tyre Rotation, Wheel Balancing9439 …
  - Census — # · JC-# | COLS: Position, Tyre No, Job ID, Current NSD, NSD readings (mm), NSD, Check | BTNS: ✕, ← Back to Census
  - Job card — # · # | COLS: S.No, Job ID, Fleet No, Tyre No, Position, Job, Removal reason, Tube · Flap · Disc, Assigned to, Remarks, Complaint, Status, Action | BTNS: ✕, Start, Close, Print
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - Job card — JC-# · No fleet | COLS: S.No, Job ID, Fleet No, Tyre No, Position, Job, Tube · Flap · Disc, Assigned to, Remarks, Complaint, Status, Action | BTNS: ✕, Close, Print
  - (same as sup/job-management.html) Audit Trail — JC-#
  - (same as sup/job-management.html) Raise WSR
  - Raise complaint | LABELS: Complaint type *; Remarks; Photo (optional) | INPUTS: Remarks|text | SEL: Complaint type *=— select —,Weak / faulty valve,Continuous leakage (slow puncture),Tyre burst / blowout,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing | BTNS: ✕, ← Back, Raise complaint

### `tic/notifications.html` — Tyre Incharge — Notifications
- H: Notifications
- TABLE: S.No, Received, Type, Reference, Details, From, Action
- BTNS: All · 7 | Approvals · 2 | Job cards · 2 | Complaints · 1 | Indents · 1 | Movements · 1 | Open

### `tic/other-depot-tyre.html` — Tyre Incharge — Indent
- H: Depot Indent ; Log an other-depot tyre's arrival
- TABLE: S.No, Indent No, Indent Date, From Depot / Unit → Request To, Indent Type, Total Qty, Requested By, Status, Action
- LABELS: Status AllDraftAwaiting approvalRevertedSentNewAcceptedIn transitPartly issuedPartly receivedIssuedReceivedRejectedCancelled | Tyre No. * | Makers No. | From Depot * | GRN No. | Size | Make | Grade | On our fleet (optional) | Reason present here *
- SEL (unlabelled filter) = All,Draft,Awaiting approval,Reverted,Sent,New,Accepted,In transit,Partly issued,Partly received,Issued,Received
- SEL odGrade = New,A,B,C
- INPUTS: Tyre No. * | Makers No. | From Depot * | GRN No. | Size | Make | On our fleet (optional) | Reason present here *
- BTNS: + Create Indent | Withdraw | Send for Approval | Cancel | Receive in GRN → | Close indent | ✕ | Log arrival
- **Popups / modals:**
  - (same as tic/internal-transfer-request.html) Create Indent
  - (same as tic/gin.html) Send for approval?
  - (same as ho/drn-reason-master.html) Send — for approval?
  - (same as tic/gin.html) Delete —?
  - (same as ho/drn-reason-master.html) Withdraw —
  - (same as tic/internal-transfer-request.html) Cancel —
  - (same as tic/internal-transfer-request.html) Close —
  - (same as tic/internal-transfer-request.html) Reject —
  - (same as sup/gin-approvals.html) Indent — IND-#
  - (same as sup/gin-approvals.html) Audit Trail — IND-#
  - (same as tic/internal-transfer-request.html) Edit — IND-#

### `tic/outsource-employee.html` — Tyre Incharge — Outsource Employee
- H: Outsource Employee ; Remove R. Dhanush — OSE-001
- TABLE: S.No, Employee ID, Name, Work order, Phone, Aadhaar No., Address, Educational qualification, Skill, Status, Action
- LABELS: Reason *
- SEL (unlabelled filter) = All statuses,Active,Inactive
- INPUTS: Reason *
- BTNS: Reset | + Add Employee | ✕ | Cancel | Remove Employee
- **Popups / modals:**
  - Add outsource employee | LABELS: Employee name *; Phone number *; Aadhaar number *; Work order *; Contractor name *; Address *; Educational qualification; Skill (select all that apply); Air Inflation; Tyre Rotation; Wheel Balancing; Tyre Fitment; Nail Removal; Retreading; Wheel Alignment; Status | INPUTS: Employee name *|oseName; Phone number *|10-digit mobile; Aadhaar number *|XXXX XXXX XXXX; Contractor name *|text; Address *|oseAddress; checkbox:Air Inflation; checkbox:Tyre Rotation; checkbox:Wheel Balancing; checkbox:Tyre Fitment; checkbox:Nail Removal; checkbox:Retreading; checkbox:Wheel Alignment | SEL: Work order *=— select —,Through contractor,Direct · no contractor; Educational qua …
  - Edit R. Dhanush — # | LABELS: Employee name *; Phone number *; Aadhaar number *; Work order *; Contractor name *; Address *; Educational qualification; Skill (select all that apply); Air Inflation; Tyre Rotation; Wheel Balancing; Tyre Fitment; Nail Removal; Retreading; Wheel Alignment; Status | INPUTS: Employee name *|oseName; Phone number *|10-digit mobile; Aadhaar number *|XXXX XXXX XXXX; Contractor name *|text; Address *|oseAddress; checkbox:Air Inflation; checkbox:Tyre Rotation; checkbox:Wheel Balancing; checkbox:Tyre Fitment; checkbox:Nail Removal; checkbox:Retreading; checkbox:Wheel Alignment | SEL: Work order *=— select —,Through contractor,Direct · no contractor; Educational qualif …
  - Remove R. Dhanush — # | LABELS: Reason * | INPUTS: Reason *|Why this employee is being removed | BTNS: ✕, Cancel, Remove Employee
  - R. Dhanush | BTNS: ✕, Close
  - S. Vignesh | BTNS: ✕, Close
  - Edit S. Vignesh — # | LABELS: Employee name *; Phone number *; Aadhaar number *; Work order *; Contractor name *; Address *; Educational qualification; Skill (select all that apply); Air Inflation; Tyre Rotation; Wheel Balancing; Tyre Fitment; Nail Removal; Retreading; Wheel Alignment; Status | INPUTS: Employee name *|oseName; Phone number *|10-digit mobile; Aadhaar number *|XXXX XXXX XXXX; Contractor name *|text; Address *|oseAddress; checkbox:Air Inflation; checkbox:Tyre Rotation; checkbox:Wheel Balancing; checkbox:Tyre Fitment; checkbox:Nail Removal; checkbox:Retreading; checkbox:Wheel Alignment | SEL: Work order *=— select —,Through contractor,Direct · no contractor; Educational qualif …
  - Remove S. Vignesh — # | LABELS: Reason * | INPUTS: Reason *|Why this employee is being removed | BTNS: ✕, Cancel, Remove Employee
  - K. Arunkumar | BTNS: ✕, Close
  - Edit K. Arunkumar — # | LABELS: Employee name *; Phone number *; Aadhaar number *; Work order *; Contractor name *; Address *; Educational qualification; Skill (select all that apply); Air Inflation; Tyre Rotation; Wheel Balancing; Tyre Fitment; Nail Removal; Retreading; Wheel Alignment; Status | INPUTS: Employee name *|oseName; Phone number *|10-digit mobile; Aadhaar number *|XXXX XXXX XXXX; Contractor name *|text; Address *|oseAddress; checkbox:Air Inflation; checkbox:Tyre Rotation; checkbox:Wheel Balancing; checkbox:Tyre Fitment; checkbox:Nail Removal; checkbox:Retreading; checkbox:Wheel Alignment | SEL: Work order *=— select —,Through contractor,Direct · no contractor; Educational qual …
  - Remove K. Arunkumar — # | LABELS: Reason * | INPUTS: Reason *|Why this employee is being removed | BTNS: ✕, Cancel, Remove Employee
  - M. Balamurugan | BTNS: ✕, Close
  - Edit M. Balamurugan — # | LABELS: Employee name *; Phone number *; Aadhaar number *; Work order *; Contractor name *; Address *; Educational qualification; Skill (select all that apply); Air Inflation; Tyre Rotation; Wheel Balancing; Tyre Fitment; Nail Removal; Retreading; Wheel Alignment; Status | INPUTS: Employee name *|oseName; Phone number *|10-digit mobile; Aadhaar number *|XXXX XXXX XXXX; Contractor name *|text; Address *|oseAddress; checkbox:Air Inflation; checkbox:Tyre Rotation; checkbox:Wheel Balancing; checkbox:Tyre Fitment; checkbox:Nail Removal; checkbox:Retreading; checkbox:Wheel Alignment | SEL: Work order *=— select —,Through contractor,Direct · no contractor; Educational qu …
  - Remove M. Balamurugan — # | LABELS: Reason * | INPUTS: Reason *|Why this employee is being removed | BTNS: ✕, Cancel, Remove Employee
  - P. Yuvaraj | BTNS: ✕, Close
  - Edit P. Yuvaraj — # | LABELS: Employee name *; Phone number *; Aadhaar number *; Work order *; Contractor name *; Address *; Educational qualification; Skill (select all that apply); Air Inflation; Tyre Rotation; Wheel Balancing; Tyre Fitment; Nail Removal; Retreading; Wheel Alignment; Status | INPUTS: Employee name *|oseName; Phone number *|10-digit mobile; Aadhaar number *|XXXX XXXX XXXX; Contractor name *|text; Address *|oseAddress; checkbox:Air Inflation; checkbox:Tyre Rotation; checkbox:Wheel Balancing; checkbox:Tyre Fitment; checkbox:Nail Removal; checkbox:Retreading; checkbox:Wheel Alignment | SEL: Work order *=— select —,Through contractor,Direct · no contractor; Educational qualif …
  - Remove P. Yuvaraj — # | LABELS: Reason * | INPUTS: Reason *|Why this employee is being removed | BTNS: ✕, Cancel, Remove Employee
  - T. Gopal | BTNS: ✕, Close
  - Edit T. Gopal — # | LABELS: Employee name *; Phone number *; Aadhaar number *; Work order *; Contractor name *; Address *; Educational qualification; Skill (select all that apply); Air Inflation; Tyre Rotation; Wheel Balancing; Tyre Fitment; Nail Removal; Retreading; Wheel Alignment; Status | INPUTS: Employee name *|oseName; Phone number *|10-digit mobile; Aadhaar number *|XXXX XXXX XXXX; Contractor name *|text; Address *|oseAddress; checkbox:Air Inflation; checkbox:Tyre Rotation; checkbox:Wheel Balancing; checkbox:Tyre Fitment; checkbox:Nail Removal; checkbox:Retreading; checkbox:Wheel Alignment | SEL: Work order *=— select —,Through contractor,Direct · no contractor; Educational qualific …
  - Remove T. Gopal — # | LABELS: Reason * | INPUTS: Reason *|Why this employee is being removed | BTNS: ✕, Cancel, Remove Employee

### `tic/premature-failure.html` — Tyre Incharge — Premature Failure Reports
- H: Premature Failure Reports ; TLDC — Tyre SS0242
- TABLE: S.No, Report No, Date, MTC No, Manufacturer No, Folio ID, Folio Name, Specification, Make, Makers Model, Size, Construction Type, Tube Type, Bus No, Km Run, Norm Km, Loss ₹, Fault On, Request No, Status, Action
- TABLE: S.No, Request No, Date, MTC No, Manufacturer No, Folio ID, Folio Name, Specification, Make, Makers Model, Size, Construction Type, Tube Type, Reason, Status, Report No, Action
- TABLE: Stage, Thread Rubber, Bonding Gum, VC Patch, No. of VC, TRS Census, RT Date, Recom. Position, Achieved KM, Total KMS, TRS Remarks
- TABLE: Particulars, New Tyre Fitment, I Rotation, II Rotation, III Rotation, IV Rotation, V Rotation, VI Rotation, VII Rotation, VIII Rotation, IX Rotation
- TABLE: S.No, Fleet No, Position, Fitted Date, Removal Date, Route, KMS, Days Stopped, Days Running, Running Days KMS, Dead KMS, Total KMS, Reason for Removal
- TABLE: Route, Route Name, Fleet, Trips, KM Driven, First Driven, Last Driven, Tyre Position
- TABLE: S.No, Phase, From Date, To Date, No. of Days, Fleet No, Position, Location / Remarks
- TABLE: When, Fleet / Position, Detail
- BTNS: + New Report | Reports | Requests from TRS | View | Raise Report | ✕ | Depot Maintenance History | RT Maintenance History | Audit Trail | Print | 🖨 Print | Close
- **Popups / modals:**
  - New Tyre Premature Failure Report | LABELS: MTC Tyre No *; Make / Pattern; Size / Construction; Manufacturer No; New / RT; Fitted Date; Km Run; No. of Rotation; Norm Km; Tyre Price (₹); Remaining Km; Loss Amount (₹); Bus No *; Failure Date *; Failed Tyre Position *; Tyre Skid Depth (mm) *; Type of Damage *; No. of Disc Out; Reason for Tyre Damage *; Depot Tyre Incharge Remarks; Fault On *; Employee ID *; Name · Designation | INPUTS: Make / Pattern|text; Size / Construction|text; Manufacturer No|text; New / RT|text; Fitted Date|text; Km Run|text; No. of Rotation|text; Norm Km|text; Tyre Price (₹)|text; Remaining Km|text; Loss Amount (₹)|text; Bus No *|text*; Failure Date *|date*; Tyre Skid  …
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - Report Request — # | BTNS: ✕, Close
  - New Tyre Premature Failure Report — Request # | LABELS: MTC Tyre No *; Make / Pattern; Size / Construction; Manufacturer No; New / RT; Fitted Date; Km Run; No. of Rotation; Norm Km; Tyre Price (₹); Remaining Km; Loss Amount (₹); Bus No *; Failure Date *; Failed Tyre Position *; Tyre Skid Depth (mm) *; Type of Damage *; No. of Disc Out; Reason for Tyre Damage *; Depot Tyre Incharge Remarks; Fault On *; Employee ID *; Name · Designation | INPUTS: Make / Pattern|text; Size / Construction|text; Manufacturer No|text; New / RT|text; Fitted Date|text; Km Run|text; No. of Rotation|text; Norm Km|text; Tyre Price (₹)|text; Remaining Km|text; Loss Amount (₹)|text; Bus No *|text*; Failure Date *|date* …
  - Premature Failure Report — PFR-# | COLS: #, Details, Information | BTNS: ✕, Close
  - Audit Trail — PFR-# | BTNS: ✕, Close
  - Premature Failure Report — {{no}} | COLS: #, Details, Information | BTNS: ✕, Close

### `tic/schedule-planner--pending.html` — Tyre Incharge — Schedule Planner
- H: Schedule Planner ; SCH001 — Air Inflation — Regular Air
- TABLE: Depot
- TABLE: Group, Fleets, Tyres, Approval
- LABELS: Month | Schedule | Group A · first schedule date | Group B · first schedule date
- SEL Schedule = SCH004 — Tyre Rotation,SCH005 — Tyre Discout,SCH001 — Air Inflation,SCH003 — Inspection,SCH007 — Census
- INPUTS: Month | Group A · first schedule date | Group B · first schedule date
- BTNS: ✕ | + Create Group | Close | Deactivate

### `tic/schedule-planner--schedule-chart.html` — Tyre Incharge — Schedule Planner — Schedule Chart
- H: Schedule Planner ; SCH001 — Air Inflation — Regular Air
- TABLE: Group, Fleets, Tyres, Approval
- LABELS: Group A · first schedule date | Group B · first schedule date
- INPUTS: Group A · first schedule date | Group B · first schedule date
- BTNS: ✕ | + Create Group | Close | Deactivate

### `tic/schedule-planner--schedule-setup.html` — Tyre Incharge — Schedule Planner
- H: Schedule Planner ; SCH001 — Air Inflation — Regular Air
- TABLE: S.No, Schedule Code, Schedule Name, Frequency, Job Code, Work Order Based, Outsource Employee Based, Effective From, Groups, Status, Action
- TABLE: Group, Fleets, Tyres, Approval
- LABELS: Group A · first schedule date | Group B · first schedule date
- INPUTS: Group A · first schedule date | Group B · first schedule date
- BTNS: View | Create Schedule ID | ✕ | + Create Group | Close | Deactivate
- **Popups / modals:**
  - Bulk schedule | LABELS: Job type; From; To | INPUTS: From|splbFrom; To|splbTo | SEL: Job type=Air Inflation,Inspection,Tyre Rotation,Tyre Discout,Census | BTNS: ✕, Cancel, View schedule →
  - Air Inflation · 01 Sep 2026 · Group A | COLS: S.No, Fleet No., Registration, FR, FL, RRI, RRO, RLI, RLO, Size | BTNS: ✕, Close, Print this schedule
  - Create job card | LABELS: Maintenance type | SEL: Maintenance type=Air Inflation,Inspection,Tyre Rotation,Tyre Discout,Tyre Change,Tyre Setting,Tyre Unsetting,Census,Tyre Removal (send for Unsetting) | BTNS: ✕, Cancel, Assign
  - # — Air Inflation — Regular Air | LABELS: Group A · first schedule date; Group B · first schedule date | INPUTS: Group A · first schedule date|dsAlignA; Group B · first schedule date|dsAlignBOut | COLS: Group, Fleets, Tyres, Approval | BTNS: ✕, + Create Group, Close, Deactivate
  - # — Air Inflation — Nitrogen Air | COLS: Group, Fleets, Tyres, Approval | BTNS: ✕, + Create Group, Close
  - # — Inspection | LABELS: INS A · first schedule date; INS B · first schedule date | INPUTS: INS A · first schedule date|date; INS B · first schedule date|text | COLS: Group, Fleets, Tyres, Approval | BTNS: ✕, + Create Group, Close
  - # — Rotation | BTNS: ✕, Close
  - # — Discout | BTNS: ✕, Close
  - # — Census | BTNS: ✕, Close
  - Create job cards — # | LABELS: Job type; From; To | INPUTS: From|splbFrom; To|splbTo | SEL: Job type=Air Inflation,Inspection,Tyre Rotation,Tyre Discout,Census | BTNS: ✕, Cancel, View schedule →

### `tic/schedule-planner.html` — Tyre Incharge — Schedule Planner
- H: Schedule Planner ; Create job card
- TABLE: S.No, Date, Air Inflation, Inspection, Tyre Rotation, Tyre Discout, Census, Fleets, Job cards, Status, Action
- LABELS: Search | Month | Date | Schedule | Status | Maintenance type
- SEL Schedule = All schedules,Air Inflation,Inspection,Tyre Rotation,Tyre Discout,Census
- SEL Status = All statuses,Not Assigned,Assigned,Completed
- SEL jmcMaint = Air Inflation,Inspection,Tyre Rotation,Tyre Discout,Tyre Change,Tyre Setting,Tyre Unsetting,Census,Tyre Removal (send for Unsetting)
- INPUTS: Search | Month | Date
- BTNS: Print | View | ✕ | Cancel | Assign
- **Popups / modals:**
  - (same as tic/schedule-planner--schedule-setup.html) Air Inflation · 01 Sep 2026 · Group A
  - (same as tic/schedule-planner--schedule-setup.html) # — Air Inflation — Regular Air
  - Assign — — | LABELS: Due shift *; Tyre men *; M. Perumal; D. Karthik; S. Ilango; P. Selvam; R. Manikandan; K. Bhaskar; A. Jaganathan; M. Balamurugan | INPUTS: checkbox: | SEL: Due shift *=— select —,AM,General,PM,Night | BTNS: ✕, Cancel, Save
  - 01 Sep 2026 · Tuesday | COLS: Schedule Code, Schedule Name, Group, Fleet, Fleets, Tyres, Job cards, Status, Action | BTNS: ✕, View fleets, Open in Job Card Register, Close
  - 02 Sep 2026 · Wednesday | COLS: Schedule Code, Schedule Name, Group, Fleet, Fleets, Tyres, Job cards, Status, Action | BTNS: ✕, View fleets, Open in Job Card Register, Close
  - 03 Sep 2026 · Thursday | COLS: Schedule Code, Schedule Name, Group, Fleet, Fleets, Tyres, Job cards, Status, Action | BTNS: ✕, View fleets, Open in Job Card Register, Close
  - 04 Sep 2026 · Friday | COLS: Schedule Code, Schedule Name, Group, Fleet, Fleets, Tyres, Job cards, Status, Action | BTNS: ✕, View fleets, Open in Job Card Register, Close
  - 05 Sep 2026 · Saturday | COLS: Schedule Code, Schedule Name, Group, Fleet, Fleets, Tyres, Job cards, Status, Action | BTNS: ✕, View fleets, Open in Job Card Register, Close
  - 06 Sep 2026 · Sunday | COLS: Schedule Code, Schedule Name, Group, Fleet, Fleets, Tyres, Job cards, Status, Action | BTNS: ✕, Open in Job Card Register, Close
  - 07 Sep 2026 · Monday | COLS: Schedule Code, Schedule Name, Group, Fleet, Fleets, Tyres, Job cards, Status, Action | BTNS: ✕, View fleets, Open in Job Card Register, Close
  - 20 Sep 2026 · Sunday · Today | COLS: Schedule Code, Schedule Name, Group, Fleet, Fleets, Tyres, Job cards, Status, Action | BTNS: ✕, View fleets, Open in Job Card Register, Close

### `tic/scrap-return-note.html` — Tyre Incharge — Scrap Return Note
- H: GRN — GRN-MN-IN-0027
- TABLE: S.No, Tyre No, Status
- BTNS: ✕ | Close

### `tic/tyre-man-master.html` — Tyre Incharge — Tyre Man Master
- H: Tyre Man Register ; TLDC — Tyre SS0242
- TABLE: S.No, Employee ID, Name, Role, Depot, Skill, Phone, Experience, Status, Action
- TABLE: Request ID, Tyre man, Skill to add, Remarks, Raised, Status, Action
- TABLE: Stage, Thread Rubber, Bonding Gum, VC Patch, No. of VC, TRS Census, RT Date, Recom. Position, Achieved KM, Total KMS, TRS Remarks
- TABLE: Particulars, New Tyre Fitment, I Rotation, II Rotation, III Rotation, IV Rotation, V Rotation, VI Rotation, VII Rotation, VIII Rotation, IX Rotation
- TABLE: S.No, Fleet No, Position, Fitted Date, Removal Date, Route, KMS, Days Stopped, Days Running, Running Days KMS, Dead KMS, Total KMS, Reason for Removal
- TABLE: Route, Route Name, Fleet, Trips, KM Driven, First Driven, Last Driven, Tyre Position
- TABLE: S.No, Phase, From Date, To Date, No. of Days, Fleet No, Position, Location / Remarks
- TABLE: When, Fleet / Position, Detail
- SEL (unlabelled filter) = All Roles,Tyre Incharge,Tyre Man
- BTNS: Employees | Skill requests 1 | Reset | + Skill | Withdraw | ✕ | Depot Maintenance History | RT Maintenance History | Audit Trail | Print | 🖨 Print | Close
- **Popups / modals:**
  - (same as ho/tyre-man-master.html) K. Saravanan
  - (same as ho/tyre-man-master.html) M. Perumal
  - (same as ho/tyre-man-master.html) S. Ilango
  - (same as ho/tyre-man-master.html) K. Bhaskar
  - (same as ho/tyre-man-master.html) P. Selvam
  - (same as ho/tyre-man-master.html) R. Manikandan
  - (same as ho/tyre-man-master.html) A. Jaganathan
  - (same as ho/tyre-man-master.html) D. Karthik
  - (same as ho/tyre-man-master.html) V. Suresh
  - (same as ho/tyre-man-master.html) V. Senthil
  - (same as ho/tyre-man-master.html) M. Suresh
  - (same as ho/tyre-man-master.html) R. Kumar
  - (same as ho/tyre-man-master.html) A. Velu
  - (same as ho/tyre-man-master.html) P. Elango
  - (same as ho/tyre-man-master.html) G. Bala
  - (same as ho/tyre-man-master.html) S. Murugan
  - (same as ho/tyre-man-master.html) N. Prakash
  - (same as ho/tyre-man-master.html) K. Rajan
  - (same as ho/tyre-man-master.html) T. Anand
  - Add skill — K. Saravanan | LABELS: Skills to add *; Tyre Rotation; Tyre Fitment; Nail Removal; Wheel Alignment; Remarks | INPUTS: checkbox:; Remarks|text | BTNS: ✕, Cancel, Send for Approval
  - Add skill — M. Perumal | LABELS: Skills to add *; Air Inflation; Tyre Rotation; Wheel Balancing; Nail Removal; Remarks | INPUTS: checkbox:; Remarks|text | BTNS: ✕, Cancel, Send for Approval
  - Add skill — S. Ilango | LABELS: Skills to add *; Wheel Balancing; Tyre Fitment; Wheel Alignment; Remarks | INPUTS: checkbox:; Remarks|text | BTNS: ✕, Cancel, Send for Approval
  - Add skill — K. Bhaskar | LABELS: Skills to add *; Air Inflation; Wheel Balancing; Tyre Fitment; Nail Removal; Wheel Alignment; Remarks | INPUTS: checkbox:; Remarks|text | BTNS: ✕, Cancel, Send for Approval
  - Add skill — P. Selvam | LABELS: Skills to add *; Air Inflation; Tyre Rotation; Wheel Balancing; Tyre Fitment; Nail Removal; Remarks | INPUTS: checkbox:; Remarks|text | BTNS: ✕, Cancel, Send for Approval
  - Add skill — R. Manikandan | LABELS: Skills to add *; Tyre Rotation; Tyre Fitment; Nail Removal; Wheel Alignment; Remarks | INPUTS: checkbox:; Remarks|text | BTNS: ✕, Cancel, Send for Approval
  - Add skill — A. Jaganathan | LABELS: Skills to add *; Air Inflation; Wheel Balancing; Nail Removal; Wheel Alignment; Remarks | INPUTS: checkbox:; Remarks|text | BTNS: ✕, Cancel, Send for Approval
  - Add skill — D. Karthik | LABELS: Skills to add *; Tyre Rotation; Wheel Balancing; Tyre Fitment; Wheel Alignment; Remarks | INPUTS: checkbox:; Remarks|text | BTNS: ✕, Cancel, Send for Approval
  - Add skill — V. Suresh | LABELS: Skills to add *; Air Inflation; Tyre Rotation; Tyre Fitment; Nail Removal; Wheel Alignment; Remarks | INPUTS: checkbox:; Remarks|text | BTNS: ✕, Cancel, Send for Approval
  - Send skill request for approval? | BTNS: ✕, Back, Send for Approval
  - (same as ho/drn-reason-master.html) Withdraw —
  - (same as sup/skill-approvals.html) Skill request — #
  - (same as ae/drn-reason-master.html) Audit Trail — #

### `tic/tyre-register.html` — Tyre Incharge — Tyre Register
- H: Tyre Register ; TLDC — Tyre SS0242
- TABLE: S.No, Folio ID, Folio Name, Product Group, Specification, UOM, Fitted, Required, Want of Tyre, Minimum Stk, Maximum Stock, Weighted Average Rate, Stock Value, Status, Action
- TABLE: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet, Removal position, Removal reason, New KM, RT1 KM, RT2 KM, RT3 KM, RT4 KM, RT5 KM, Running KM, Total KM
- TABLE: S.No, Folio ID, Folio Name, Product Group, Specification, UOM, Fitted, Total Qty, Required, Want of Tube, Minimum Stk, Maximum Stock, Weighted Average Rate, Stock Value, Status, Action
- TABLE: S.No, Folio ID, Folio Name, Specification, Tube No, Size, Make, Condition, Received date, Status, Tyre No, Fleet, Position, Fitted date, Action
- TABLE: S.No, Folio ID, Folio Name, Product Group, Specification, UOM, Fitted, Total Qty, Required, Want of Flap, Minimum Stk, Maximum Stock, Weighted Average Rate, Stock Value, Status, Action
- TABLE: S.No, Folio ID, Folio Name, Specification, Flap No, Size, Make, Condition, Received date, Status, Tyre No, Fleet, Position, Fitted date, Action
- TABLE: S.No, Folio ID, Folio Name, Product Group, Specification, UOM, Fitted, Total Qty, Required, Want of Disc, Minimum Stk, Maximum Stock, Weighted Average Rate, Stock Value, Status, Action
- TABLE: S.No, Folio ID, Folio Name, Specification, Disc No, Size, Make, Condition, Received date, Status, Tyre No, Fleet, Position, Fitted date, Action
- LABELS: Status AllFittedSetUnsetAt MICAt TRS | Grade AllNewABC | Size All7.50 X 1610.00 X 20295/80R22.5 | Make AllJKCEATTOLINSApolloMRFBridgestone | Construction Type AllNylonRadial | Bus model AllBS-IVLow FloorBS-IIIBS-VIAC Low Floor | Status AllFittedLive stockReserved | Size All7.50 X 1610.00 X 20 | Make AllMRFJKApolloCEAT | Condition AllNewServicedInjured | Status AllFittedLive stock | Size All16"20" | Size All16"20"22.5"
- SEL (unlabelled filter) = All,Fitted,Set,Unset,At MIC,At TRS
- SEL Status AllFittedSetUnsetAt MICAt TRS = All,New,A,B,C
- SEL Grade AllNewABC = All,7.50 X 16,10.00 X 20,295/80R22.5
- SEL Size All7.50 X 1610.00 X 20295/80R22.5 = All,JK,CEAT,TOLINS,Apollo,MRF,Bridgestone
- SEL Make AllJKCEATTOLINSApolloMRFBridgestone = All,Nylon,Radial
- SEL Construction Type AllNylonRadial = All,BS-IV,Low Floor,BS-III,BS-VI,AC Low Floor
- SEL Bus model AllBS-IVLow FloorBS-IIIBS-VIAC Low Floor = All,Fitted,Live stock,Reserved
- SEL Status AllFittedLive stockReserved = All,7.50 X 16,10.00 X 20
- SEL Size All7.50 X 1610.00 X 20 = All,MRF,JK,Apollo,CEAT
- SEL Make AllMRFJKApolloCEAT = All,New,Serviced,Injured
- SEL Condition AllNewServicedInjured = All,Fitted,Live stock
- SEL Status AllFittedLive stock = All,16",20"
- SEL Size All16"20" = All,MRF,JK,Apollo,CEAT
- SEL Make AllMRFJKApolloCEAT = All,New,Serviced,Injured
- SEL Condition AllNewServicedInjured = All,Fitted,Live stock
- SEL Status AllFittedLive stock = All,16",20",22.5"
- SEL Size All16"20"22.5" = All,MRF,JK,Apollo,CEAT
- SEL Make AllMRFJKApolloCEAT = All,New,Serviced,Injured
- INPUTS: Bus model AllBS-IVLow FloorBS-IIIBS-VIAC Low Floor | Condition AllNewServicedInjured
- BTNS: Fitted | At TRS | At MIC | At Other Depots | Tyre | Tube | Flap | Disc | Summary | Detailed | History | View | ⇩ Export CSV | ✕ | Depot Maintenance History | RT Maintenance History | Audit Trail | Print | 🖨 Print | Close
- **Popups / modals:**
  - (same as ho/tyre-master.html) TLDC — Tyre #
  - History — # · 7.50 X 16 · Tube · Nylon · 16 PR | SEL: =Overall,Fleet J0264,Fleet J0322,Fleet J0340 | COLS: Date & Time, Removal Order / Fitment Order, Indent No, Tyre No, Make, Makers Model, Activity, Fleet, Position, Inward Qty, Outward Qty, Balance, Remarks, Date & Time, Removal Order / Fitment Order, Indent No, Tyre No, Make, Makers Model, Activity, Fleet, Position, Inward Qty, Outward Qty, Balance, Remarks, Date & Time, Removal Order / Fitment Order, Indent No, Tyre No | BTNS: ✕, Close
  - # · 7.50 X 16 · Tube · Nylon · 16 PR — fitted tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - Tyre # — Ledger and Fleet Movement | COLS: ICRN / GIN / GRN / WSR No, Date & Time, Tyre Inward / Outward, Inward Qty, Outward Qty, Balance, Remarks, Date & Time, Removal Order / Fitment Order, Activity, Fleet, Position, Date & Time, Reading, Value, Source, Fleet, Position | BTNS: ✕, Close
  - # - Folio Stock Details | COLS: Fleet No, Fitted Quantity, Positions | BTNS: ✕, Close
  - History — # · 10.00 X 20 · Tube · Radial · 16 PR | SEL: =Overall,Fleet J0375,Fleet J0378,Fleet J0382,Fleet J0383,Fleet J0384,Fleet J0414,Fleet J0429,Fleet J0431,Fleet J0436 | COLS: Date & Time, Removal Order / Fitment Order, Indent No, Tyre No, Make, Makers Model, Activity, Fleet, Position, Inward Qty, Outward Qty, Balance, Remarks, Date & Time, Removal Order / Fitment Order, Indent No, Tyre No, Make, Makers Model, Activity, Fleet, Position, Inward Qty, Outward Qty, Balance, Remarks, Date & Time, Removal Order / Fitment Order, Indent No, Tyre No | BTNS: ✕, Close
  - # · 10.00 X 20 · Tube · Radial · 16 PR — fitted tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - History — # · 295/80R22.5 · Tubeless · Radial · 16 PR | SEL: =Overall | COLS: Date & Time, Removal Order / Fitment Order, Indent No, Tyre No, Make, Makers Model, Activity, Fleet, Position, Inward Qty, Outward Qty, Balance, Remarks | BTNS: ✕, Close
  - # · 295/80R22.5 · Tubeless · Radial · 16 PR — fitted tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - History — # · 10.00 X 20 · Tubeless · Radial · 16 PR | SEL: =Overall,Fleet J1614 | COLS: Date & Time, Removal Order / Fitment Order, Indent No, Tyre No, Make, Makers Model, Activity, Fleet, Position, Inward Qty, Outward Qty, Balance, Remarks, Date & Time, Removal Order / Fitment Order, Indent No, Tyre No, Make, Makers Model, Activity, Fleet, Position, Inward Qty, Outward Qty, Balance, Remarks | BTNS: ✕, Close
  - # · 10.00 X 20 · Tubeless · Radial · 16 PR — fitted tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - History — # · 295/80R22.5 · Tubeless · Nylon · 16 PR | SEL: =Overall,Fleet J1608,Fleet J1609,Fleet J1611,Fleet J1614,Fleet J1622,Fleet J1623,Fleet J1627,Fleet J1628,Fleet J1629 | COLS: Date & Time, Removal Order / Fitment Order, Indent No, Tyre No, Make, Makers Model, Activity, Fleet, Position, Inward Qty, Outward Qty, Balance, Remarks, Date & Time, Removal Order / Fitment Order, Indent No, Tyre No, Make, Makers Model, Activity, Fleet, Position, Inward Qty, Outward Qty, Balance, Remarks, Date & Time, Removal Order / Fitment Order, Indent No, Tyre No | BTNS: ✕, Close
  - # · 295/80R22.5 · Tubeless · Nylon · 16 PR — fitted tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - History — # · 295/90R20 · Tube · Radial · 16 PR | SEL: =Overall | COLS: Date & Time, Removal Order / Fitment Order, Indent No, Tyre No, Make, Makers Model, Activity, Fleet, Position, Inward Qty, Outward Qty, Balance, Remarks | BTNS: ✕, Close
  - # · 295/90R20 · Tube · Radial · 16 PR — fitted tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - History — # · 295/80R22.5 · Tube · Radial · 16 PR | SEL: =Overall | COLS: Date & Time, Removal Order / Fitment Order, Indent No, Tyre No, Make, Makers Model, Activity, Fleet, Position, Inward Qty, Outward Qty, Balance, Remarks | BTNS: ✕, Close
  - # · 295/80R22.5 · Tube · Radial · 16 PR — fitted tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - History — # · 235/75R17.5 · Tube · Nylon · 16 PR | SEL: =Overall | COLS: Date & Time, Removal Order / Fitment Order, Indent No, Tyre No, Make, Makers Model, Activity, Fleet, Position, Inward Qty, Outward Qty, Balance, Remarks | BTNS: ✕, Close
  - # · 235/75R17.5 · Tube · Nylon · 16 PR — fitted tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - History — # · 295/90R20 · Tubeless · Radial · 16 PR | SEL: =Overall | COLS: Date & Time, Removal Order / Fitment Order, Indent No, Tyre No, Make, Makers Model, Activity, Fleet, Position, Inward Qty, Outward Qty, Balance, Remarks | BTNS: ✕, Close
  - # · 295/90R20 · Tubeless · Radial · 16 PR — fitted tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - Tyres without a size — fitted tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - Tube | BTNS: ✕, Close

### `tic/tyre.html` — Tyre Incharge — Live Tyre Stock
- H: Live Tyre Stock ; TLDC — Tyre SS0242
- TABLE: S.No, Folio ID, Folio Name, Product Group, Specification, UOM, Available Stock, Minimum Stk, Maximum Stock, Total Qty, Backorder Qty, Weighted Average Rate, Stock Value, Status, Action
- TABLE: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet, Removal position, Removal reason, New KM, RT1 KM, RT2 KM, RT3 KM, RT4 KM, RT5 KM, Running KM, Total KM
- TABLE: S.No, Folio ID, Folio Name, Specification, Tube No, Size, Make, Condition, Received date, Stock Status, Setting Status, Tyre No, Fleet, Position, Fitted date, Action
- TABLE: S.No, Folio ID, Folio Name, Specification, Flap No, Size, Make, Condition, Received date, Stock Status, Setting Status, Tyre No, Fleet, Position, Fitted date, Action
- TABLE: S.No, Folio ID, Folio Name, Specification, Disc No, Size, Make, Condition, Received date, Stock Status, Setting Status, Tyre No, Fleet, Position, Fitted date, Action
- TABLE: S.No, Folio ID, Folio Name, Product Group, Specification, UOM, Total Qty
- TABLE: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet, Removal position, Removal reason, New KM, RT1 KM, RT2 KM, RT3 KM, RT4 KM, RT5 KM, Running KM, Total KM
- TABLE: S.No, Folio ID, Folio Name, Specification, Tube No, Size, Make, Condition, Received date, Stock Status, Setting Status, Status, Tyre No, Fleet, Position, Fitted date, Action
- LABELS: Product Group AllTyreTubeFlapDisc | Status AllHealthyLow Stock | Product Group TyreTubeFlapDisc | Setting Status AllSetUnset | Grade AllNewABC | Size All7.50 X 1610.00 X 209.00 X 20295/80R22.5235/75R17.5295/90R20 | Make AllCEATApolloJKMRFBridgestoneTOLINS | Construction Type AllRadialNylon | Bus model AllBS-IVLow FloorBS-IIIBS-VIAC Low Floor | Size All7.50 X 1610.00 X 20 | Make AllMRFJKApolloCEAT | Condition AllNewServicedInjured | Size All16"20" | Size All16"20"22.5" | Status AllReady for TransitIn Transit
- SEL (unlabelled filter) = All,Tyre,Tube,Flap,Disc
- SEL Product Group AllTyreTubeFlapDisc = All,Healthy,Low Stock
- SEL Status AllHealthyLow Stock = Tyre,Tube,Flap,Disc
- SEL Product Group TyreTubeFlapDisc = All,Set,Unset
- SEL Setting Status AllSetUnset = All,New,A,B,C
- SEL Grade AllNewABC = All,7.50 X 16,10.00 X 20,9.00 X 20,295/80R22.5,235/75R17.5,295/90R20
- SEL Size All7.50 X 1610.00 X 209.00 X 20295/80R22.5235/75R17.5295/90R20 = All,CEAT,Apollo,JK,MRF,Bridgestone,TOLINS
- SEL Make AllCEATApolloJKMRFBridgestoneTOLINS = All,Radial,Nylon
- SEL Construction Type AllRadialNylon = All,BS-IV,Low Floor,BS-III,BS-VI,AC Low Floor
- SEL Bus model AllBS-IVLow FloorBS-IIIBS-VIAC Low Floor = All,7.50 X 16,10.00 X 20
- SEL Size All7.50 X 1610.00 X 20 = All,MRF,JK,Apollo,CEAT
- SEL Make AllMRFJKApolloCEAT = All,New,Serviced,Injured
- SEL Condition AllNewServicedInjured = All,16",20"
- SEL Size All16"20" = All,MRF,JK,Apollo,CEAT
- SEL Make AllMRFJKApolloCEAT = All,New,Serviced,Injured
- SEL Condition AllNewServicedInjured = All,16",20",22.5"
- SEL Size All16"20"22.5" = All,MRF,JK,Apollo,CEAT
- SEL Make AllMRFJKApolloCEAT = All,New,Serviced,Injured
- SEL Condition AllNewServicedInjured = All,Tyre,Tube,Flap,Disc
- SEL Product Group AllTyreTubeFlapDisc = Tyre,Tube,Flap,Disc
- SEL Product Group TyreTubeFlapDisc = All,Set,Unset
- SEL Setting Status AllSetUnset = All,Ready for Transit,In Transit
- SEL Status AllReady for TransitIn Transit = All,New,A,B,C
- SEL Grade AllNewABC = All,7.50 X 16,10.00 X 20,9.00 X 20,295/80R22.5,235/75R17.5,295/90R20
- SEL Size All7.50 X 1610.00 X 209.00 X 20295/80R22.5235/75R17.5295/90R20 = All,CEAT,Apollo,JK,MRF,Bridgestone,TOLINS
- INPUTS: Setting Status AllSetUnset | Bus model AllBS-IVLow FloorBS-IIIBS-VIAC Low Floor | Condition AllNewServicedInjured | Status AllReady for TransitIn Transit
- BTNS: Good | Repair | Summary | Detailed | + Create Job Card | Ledger | View | ⇩ Export CSV | Create GIN (TRS) | ✕ | Depot Maintenance History | RT Maintenance History | Audit Trail | Print | 🖨 Print | Close
- **Popups / modals:**
  - (same as ho/tyre-master.html) TLDC — Tyre #
  - Ledger — # · 7.50 X 16 · Tube · Nylon · 16 PR | COLS: ICRN / GIN / GRN / WSR, ICRN / GIN / GRN / WSR Date & Time, Tyre Inward / Outward, MTC No, Make, Makers Model, Inward Qty, Outward Qty, Balance, Remarks | BTNS: ✕, Close
  - # · 7.50 X 16 · Tube · Nylon · 16 PR — current tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - Tyre # — Ledger and Fleet Movement | COLS: ICRN / GIN / GRN / WSR, ICRN / GIN / GRN / WSR Date & Time, Tyre Inward / Outward, Inward Qty, Outward Qty, Balance, Remarks, Date & Time, Removal Order / Fitment Order, Activity, Fleet, Position | BTNS: ✕, Close
  - # - Folio Stock Details | COLS: Folio Name, Available Stock Quantity, Depot Name, Available Stock Quantity, Unit Name, Available Stock Quantity | BTNS: ✕, Close
  - Ledger — # · 10.00 X 20 · Tube · Radial · 16 PR | COLS: ICRN / GIN / GRN / WSR, ICRN / GIN / GRN / WSR Date & Time, Tyre Inward / Outward, MTC No, Make, Makers Model, Inward Qty, Outward Qty, Balance, Remarks | BTNS: ✕, Close
  - # · 10.00 X 20 · Tube · Radial · 16 PR — current tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - Ledger — # · 295/80R22.5 · Tubeless · Radial · 16 PR | COLS: ICRN / GIN / GRN / WSR, ICRN / GIN / GRN / WSR Date & Time, Tyre Inward / Outward, MTC No, Make, Makers Model, Inward Qty, Outward Qty, Balance, Remarks | BTNS: ✕, Close
  - # · 295/80R22.5 · Tubeless · Radial · 16 PR — current tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - Ledger — # · 10.00 X 20 · Tubeless · Radial · 16 PR | COLS: ICRN / GIN / GRN / WSR, ICRN / GIN / GRN / WSR Date & Time, Tyre Inward / Outward, MTC No, Make, Makers Model, Inward Qty, Outward Qty, Balance, Remarks | BTNS: ✕, Close
  - # · 10.00 X 20 · Tubeless · Radial · 16 PR — current tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - Ledger — # · 295/80R22.5 · Tubeless · Nylon · 16 PR | COLS: ICRN / GIN / GRN / WSR, ICRN / GIN / GRN / WSR Date & Time, Tyre Inward / Outward, MTC No, Make, Makers Model, Inward Qty, Outward Qty, Balance, Remarks | BTNS: ✕, Close
  - # · 295/80R22.5 · Tubeless · Nylon · 16 PR — current tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - Ledger — # · 295/90R20 · Tube · Radial · 16 PR | COLS: ICRN / GIN / GRN / WSR, ICRN / GIN / GRN / WSR Date & Time, Tyre Inward / Outward, MTC No, Make, Makers Model, Inward Qty, Outward Qty, Balance, Remarks | BTNS: ✕, Close
  - # · 295/90R20 · Tube · Radial · 16 PR — current tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - Ledger — # · 295/80R22.5 · Tube · Radial · 16 PR | COLS: ICRN / GIN / GRN / WSR, ICRN / GIN / GRN / WSR Date & Time, Tyre Inward / Outward, MTC No, Make, Makers Model, Inward Qty, Outward Qty, Balance, Remarks | BTNS: ✕, Close
  - # · 295/80R22.5 · Tube · Radial · 16 PR — current tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - Ledger — # · 235/75R17.5 · Tube · Nylon · 16 PR | COLS: ICRN / GIN / GRN / WSR, ICRN / GIN / GRN / WSR Date & Time, Tyre Inward / Outward, MTC No, Make, Makers Model, Inward Qty, Outward Qty, Balance, Remarks | BTNS: ✕, Close
  - # · 235/75R17.5 · Tube · Nylon · 16 PR — current tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - Ledger — # · 295/90R20 · Tubeless · Radial · 16 PR | COLS: ICRN / GIN / GRN / WSR, ICRN / GIN / GRN / WSR Date & Time, Tyre Inward / Outward, MTC No, Make, Makers Model, Inward Qty, Outward Qty, Balance, Remarks | BTNS: ✕, Close
  - # · 295/90R20 · Tubeless · Radial · 16 PR — current tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - Tyres without a size — current tyres | COLS: S.No, Folio ID, Folio Name, Specification, Makers No, MTC No, Size, Location, Received date, Purchase date, Manufactured Date, Warranty Upto, Make, Makers model, Construction Type, Tube Type, Ply, Bus model, Grade, Tyre Condition, Recommended Position, Current fleet, Fitted Position, Fitted date, Fitted days, Idle days, Last Rotation date, Last Discout date, Removal date, Removal fleet | BTNS: ✕, Close
  - (same as tic/tyre-register.html) Tube
  - Tube 7.50 X 16 - Folio Stock Details | COLS: Depot Name, Available Stock Quantity | BTNS: ✕, Close
  - (same as tic/tyre-register.html) Ledger — # · Tube 7.50 X 16
  - (same as tic/tyre-register.html) Tube # — Ledger and Fleet Movement
  - (same as tic/tyre-register.html) Flap
  - (same as tic/tyre-register.html) Ledger — 35044 · Flap 16"
  - (same as tic/tyre-register.html) Flap # — Ledger and Fleet Movement
  - (same as tic/tyre-register.html) Disc
  - (same as tic/tyre-register.html) Ledger — 35046 · Disc 16"
  - (same as tic/tyre-register.html) Ledger — 35048 · Disc 22.5"
  - (same as tic/tyre-register.html) Disc # — Ledger and Fleet Movement
  - (same as tic/grn.html) TLDC — Tyre {{no}}

### `tic/warranty-drn.html` — Tyre Incharge — DRN
- H: DRN ; GRN — GRN-MN-IN-0029
- TABLE: S.No, DRN No, DRN Date, Issued By, From Depot / Unit, To Depot / Unit, Total Qty, Status, Action
- TABLE: S.No, Tyre No, Status
- LABELS: Status AllPendingApprovedRejected | From Date | To Date
- SEL (unlabelled filter) = All,Pending,Approved,Rejected
- INPUTS: Status AllPendingApprovedRejected | From Date
- BTNS: + Create DRN | Export | ✕ | Close
- **Popups / modals:**
  - Audit Trail — DRN-# | BTNS: ✕, Close
  - DRN — DRN-# | COLS: S.No, MTC No, Manufacturer No, Folio ID, Folio Name, Specification, Make, Makers Model, Size, Construction Type, Tube Type, Ply, Purchase Date, Manufactured Date, Warranty Upto, S.No, When, Who, Action, Comment | BTNS: ✕, Close, Print DRN
  - Submit DRN? | BTNS: ✕, Back, Submit
  - Create DRN | LABELS: DRN No; DRN Date *; Issued By *; From Depot / Unit *; To Depot / Unit *; Remarks | INPUTS: DRN No|text; DRN Date *|date; Issued By *|text; From Depot / Unit *|text; Remarks|text; Remarks|Search MTC No, Manufacturer No, Make; checkbox: | SEL: To Depot / Unit *=Select where to send,TRS Chrompet,TRS Tondiarpet | COLS: S.No, MTC No, Manufacturer No, Folio ID, Folio Name, Specification, Make, Makers Model, Size, Construction Type, Tube Type, Ply, Purchase Date, Manufactured Date, Warranty Upto, Remarks | BTNS: ✕, Cancel, Save Draft, Submit

### `tic/wsr-issue-gin.html` — Tyre Incharge — WSR Issue GIN
- H: WSR Issue GIN ; Goods Issue Note — GIN-MN-2026-0098
- TABLE ginxT : S.No, GIN Number, GIN Date & Time, WSR No, Items, Requested By, Issued By, Status, Action
- TABLE: S.No, Tyre No, Manufacturer No, Size, Make, Makers Model, Grade, Tyre Condition, Recent Census, No of Groove
- LABELS: Status AllDraftCreatedAwaiting approvalApprovedRejected
- SEL (unlabelled filter) = All,Draft,Created,Awaiting approval,Approved,Rejected
- BTNS: ✕ | Close | 🖨 Print GIN
- **Popups / modals:**
  - (same as tic/gin.html) Create GIN
  - (same as tic/gin.html) Send for approval?
  - (same as ho/drn-reason-master.html) Send — for approval?
  - (same as tic/gin.html) Delete —?
  - (same as ho/drn-reason-master.html) Withdraw —
  - (same as tic/gin.html) Cancel —
  - (same as tic/gin.html) Create GIN — against IND-#
  - (same as sup/gin-approvals.html) Goods Issue Note — GIN-#
  - (same as sup/gin-approvals.html) Audit Trail — GIN-#
  - (same as tic/gin.html) Edit — GIN-#
  - (same as tic/gin.html) GIN — GIN-#
  - (same as tic/gate-pass.html) Create Gate Pass — GIN-#

### `tic/wsr.html` — Tyre Incharge — WSR Request
- H: WSR Request ; Raise WSR
- TABLE: S.No, WSR No, WSR Date & Time, Job Card No, Fleet No, Status, Action
- LABELS: Status AllRequestedPartly IssuedIssuedRejectedCancelled | Material AllTubeFlapDisc | Tyre man | Job card (matches both Job Card No and Job ID to this WSR) | Materials needed | Tube | Flap | Disc
- SEL (unlabelled filter) = All,Requested,Partly Issued,Issued,Rejected,Cancelled
- SEL Status AllRequestedPartly IssuedIssuedRejectedCancelled = All,Tube,Flap,Disc
- SEL wsrTm = M. Perumal,S. Ilango,K. Bhaskar,P. Selvam,R. Manikandan,A. Jaganathan,D. Karthik,V. Suresh
- SEL wsrJob = — not tied to a job —,JC-ST-2609-20-01 — Tyre Setting · EX260001
- BTNS: Accept & Issue | Reject | ✕ | Cancel | Raise
- **Popups / modals:**
  - Raise WSR | LABELS: Job card · Job ID *; Assigned to *; Items * (fill the types you need) | INPUTS: Items * (fill the types you need)|number | SEL: Job card · Job ID *=— select —,JC-ST-2609-20-01 · JID-4027 · Tyre Setting · No fleet,JC-6038 · JID-4013 · Tyre Changing · J0414 RRO · Fitment,JC-6063 · JID-4022 · Tyre Changing · J0264 FR · Fitment,JC-6136 · JID-4034 · Tyre Fitment · J0322 RRO; Assigned to *=— select —,M. Perumal,D. Karthik,S. Ilango,P. Selvam,R. Manikandan,K. Bhaskar,A. Jaganathan; Items * (fill the types you need)=— select —,7.50 X 16,10.00 X 20; Items * (fill the types you need)=— select —,16",20"; Items * (fill the types you need)=— select —,16",20",22.5" | COLS: Tyre size, …
  - (same as ho/drn-reason-master.html) Send — for approval?
  - Approve —? | BTNS: ✕, Back, Approve
  - (same as tic/internal-transfer-request.html) Reject —
  - Cancel — | LABELS: Reason * | INPUTS: Reason *|text* | BTNS: ✕, Back, Yes, cancel WSR
  - WSR — # | COLS: S.No, Size, Folio ID, Folio Name, Specification, MTC No, Manufacturer No, Make, Makers Model, Construction Type, Tube Type, UOM, Requested Qty, Issued Qty, Unit Price, Net Amount, Remarks, Job Card No | BTNS: ✕, Close, Print
  - (same as ae/drn-reason-master.html) Audit Trail — #
  - Issue — # | SEL: =— select —,TB-1020-021,TB-1020-024,TB-1020-027,TB-1020-030,TB-1020-033,TB-1020-036,TB-1020-039,TB-1020-042,TB-1020-045; =— select —,FP-20-019,FP-20-022,FP-20-025,FP-20-028,FP-20-031,FP-20-034,FP-20-037,FP-20-040,FP-20-043 | COLS: Material, Size, Qty, Item No (Live stock) *, Unit price, Net amount | BTNS: ✕, Cancel, Issue
  - Edit — # | LABELS: Job card · Job ID *; Assigned to *; Items * (fill the types you need) | INPUTS: Items * (fill the types you need)|number | SEL: Job card · Job ID *=— select —,JC-ST-2609-20-01 · JID-4027 · Tyre Setting · No fleet,JC-6038 · JID-4013 · Tyre Changing · J0414 RRO · Fitment,JC-6063 · JID-4022 · Tyre Changing · J0264 FR · Fitment,JC-6136 · JID-4034 · Tyre Fitment · J0322 RRO; Assigned to *=— select —,M. Perumal,D. Karthik,S. Ilango,P. Selvam,R. Manikandan,K. Bhaskar,A. Jaganathan; Items * (fill the types you need)=— select —,7.50 X 16,10.00 X 20; Items * (fill the types you need)=— select —,16",20"; Items * (fill the types you need)=— select —,16",20",22.5" | COLS: Tyre size,  …
  - (same as sup/job-management.html) Job card — # · #
  - (same as sup/job-management.html) Job card — JC-# · No fleet
  - Fleet Register — # | COLS: Position, Tyre No, Size, NSD, Tyre Condition, Fitted Date, Fitted KM, No of Days Fitted, Grade | BTNS: ✕, Close

---

## Role folder `tm/` — Tyre Man (TM) — mobile

### `tm/duty-shift--aja.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2 | Request a shift change | Apply leave
- **Popups / modals:**
  - Raise WSR | LABELS: Items | INPUTS: Items|number | SEL: Items=— select —,10.00 X 20,16",20",22.5",7.50 X 16; Items=— select —,10.00 X 20,16",20",22.5",7.50 X 16; Items=— select —,10.00 X 20,16",20",22.5",7.50 X 16 | COLS: Folio Name, Specification, Requested Qty | BTNS: ✕, + Add item, Cancel, Raise WSR
  - Request Prepone / Postpone | LABELS: Job; Request; New date; Reason * | INPUTS: New date|date; Reason *|Why you need this changed | SEL: Job=Air Inflation · J0577,Air Inflation · J0750,Air Inflation · J1614,Air Inflation · J1628,Air Inflation · J1683,Air Inflation · J1691,Air Inflation · J1701,Air Inflation · J1703,Air Inflation · Z0025,Inspection · J0375 | BTNS: ✕, Cancel, Submit
  - Request a shift change | LABELS: Change to *; From *; To *; Reason * | INPUTS: From *|date*; To *|date*; Reason *|text* | SEL: Change to *=— select —,AM,General,PM,Night | BTNS: ✕, Cancel, Submit
  - Apply leave | LABELS: Leave type *; From *; To *; Reason * | INPUTS: From *|date*; To *|date*; Reason *|text* | SEL: Leave type *=— select —,Casual leave,Sick leave,Earned leave | BTNS: ✕, Cancel, Submit

### `tm/duty-shift--sil.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2 | Request a shift change | Apply leave
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone
  - (same as tm/duty-shift--aja.html) Request a shift change
  - (same as tm/duty-shift--aja.html) Apply leave

### `tm/duty-shift.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2 | Request a shift change | Apply leave
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone
  - (same as tm/duty-shift--aja.html) Request a shift change
  - (same as tm/duty-shift--aja.html) Apply leave

### `tm/fleet-AIR.html` — Tyre Man mobile
- H: Sign in
- LABELS: Present (found) | Inflated to | Complaint type | Remarks (T01995) | Remarks (T01996) | Remarks (Q05783) | Remarks (Q01733) | Remarks (R02603) | Remarks (R03221)
- SEL cty-FR = Weak / faulty valve,Continuous leakage (slow puncture),Puncture — nail / foreign object,Tyre burst / blowout,Wrong tyre fitted — number does not match this position,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing,Other (see remarks)
- SEL cty-FL = Weak / faulty valve,Continuous leakage (slow puncture),Puncture — nail / foreign object,Tyre burst / blowout,Wrong tyre fitted — number does not match this position,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing,Other (see remarks)
- SEL cty-RRI = Weak / faulty valve,Continuous leakage (slow puncture),Puncture — nail / foreign object,Tyre burst / blowout,Wrong tyre fitted — number does not match this position,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing,Other (see remarks)
- SEL cty-RRO = Weak / faulty valve,Continuous leakage (slow puncture),Puncture — nail / foreign object,Tyre burst / blowout,Wrong tyre fitted — number does not match this position,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing,Other (see remarks)
- SEL cty-RLI = Weak / faulty valve,Continuous leakage (slow puncture),Puncture — nail / foreign object,Tyre burst / blowout,Wrong tyre fitted — number does not match this position,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing,Other (see remarks)
- SEL cty-RLO = Weak / faulty valve,Continuous leakage (slow puncture),Puncture — nail / foreign object,Tyre burst / blowout,Wrong tyre fitted — number does not match this position,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing,Other (see remarks)
- INPUTS: Present (found) | Inflated to | Remarks (T01995) | Remarks (T01996) | Remarks (Q05783) | Remarks (Q01733) | Remarks (R02603) | Remarks (R03221)
- BTNS: Sign out | தமிழ் | 🔔2 | ⚠ Raise a complaint on this fleet | Hold job | ⚠ | Yes | No | Save & next fleet | Back to fleet list
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone
  - Hold — Air Inflation · # | LABELS: Reason *; Remarks | INPUTS: Remarks|text | SEL: Reason *=— select —,Moved to an urgent job,Fleet left the depot,Set tyre not available,Tube / flap / disc not available,Equipment down,Shift ended,Other (see remarks) | BTNS: ✕, Cancel, Hold job
  - Raise a complaint | LABELS: Complaint type *; Remarks; Photo (optional) | INPUTS: Remarks|text | SEL: Complaint type *=— select —,Weak / faulty valve,Continuous leakage (slow puncture),Tyre burst / blowout,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing | BTNS: ✕, Cancel, Raise complaint
  - Complaint raised | BTNS: ✕, Close
  - Fleet saved | BTNS: ✕, Next fleet, Back to round

### `tm/fleet-AIRN.html` — Tyre Man mobile
- H: Sign in
- LABELS: Present (found) | Inflated to | Complaint type | Remarks (S02600) | Remarks (S02032) | Remarks (R01022) | Remarks (R05371) | Remarks (R00030) | Remarks (R04885)
- SEL cty-FR = Weak / faulty valve,Continuous leakage (slow puncture),Puncture — nail / foreign object,Tyre burst / blowout,Wrong tyre fitted — number does not match this position,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing,Other (see remarks)
- SEL cty-FL = Weak / faulty valve,Continuous leakage (slow puncture),Puncture — nail / foreign object,Tyre burst / blowout,Wrong tyre fitted — number does not match this position,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing,Other (see remarks)
- SEL cty-RRI = Weak / faulty valve,Continuous leakage (slow puncture),Puncture — nail / foreign object,Tyre burst / blowout,Wrong tyre fitted — number does not match this position,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing,Other (see remarks)
- SEL cty-RRO = Weak / faulty valve,Continuous leakage (slow puncture),Puncture — nail / foreign object,Tyre burst / blowout,Wrong tyre fitted — number does not match this position,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing,Other (see remarks)
- SEL cty-RLI = Weak / faulty valve,Continuous leakage (slow puncture),Puncture — nail / foreign object,Tyre burst / blowout,Wrong tyre fitted — number does not match this position,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing,Other (see remarks)
- SEL cty-RLO = Weak / faulty valve,Continuous leakage (slow puncture),Puncture — nail / foreign object,Tyre burst / blowout,Wrong tyre fitted — number does not match this position,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing,Other (see remarks)
- INPUTS: Present (found) | Inflated to | Remarks (S02600) | Remarks (S02032) | Remarks (R01022) | Remarks (R05371) | Remarks (R00030) | Remarks (R04885)
- BTNS: Sign out | தமிழ் | ⚠ Raise a complaint on this fleet | Hold job | ⚠ | Yes | No | Save & next fleet | Back to fleet list
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone
  - Hold — Air Inflation — Nitrogen · # | LABELS: Reason *; Remarks | INPUTS: Remarks|text | SEL: Reason *=— select —,Moved to an urgent job,Fleet left the depot,Set tyre not available,Tube / flap / disc not available,Equipment down,Shift ended,Other (see remarks) | BTNS: ✕, Cancel, Hold job
  - (same as tm/fleet-AIR.html) Raise a complaint
  - (same as tm/fleet-AIR.html) Complaint raised
  - (same as tm/fleet-AIR.html) Fleet saved

### `tm/fleet-CENSUS.html` — Tyre Man mobile
- H: Sign in
- LABELS: NSD (mm) · 4 grooves * | Wear pattern * | NSD (mm) · 5 grooves *
- SEL Wear pattern * = — select —,Even wear,Centre wear,Both-shoulder wear,One-side shoulder wear,Cupping / scalloping,Feathering,Heel and toe wear,Flat spot
- SEL Wear pattern * = — select —,Even wear,Centre wear,Both-shoulder wear,One-side shoulder wear,Cupping / scalloping,Feathering,Heel and toe wear,Flat spot
- SEL Wear pattern * = — select —,Even wear,Centre wear,Both-shoulder wear,One-side shoulder wear,Cupping / scalloping,Feathering,Heel and toe wear,Flat spot
- SEL Wear pattern * = — select —,Even wear,Centre wear,Both-shoulder wear,One-side shoulder wear,Cupping / scalloping,Feathering,Heel and toe wear,Flat spot
- SEL Wear pattern * = — select —,Even wear,Centre wear,Both-shoulder wear,One-side shoulder wear,Cupping / scalloping,Feathering,Heel and toe wear,Flat spot
- SEL Wear pattern * = — select —,Even wear,Centre wear,Both-shoulder wear,One-side shoulder wear,Cupping / scalloping,Feathering,Heel and toe wear,Flat spot
- INPUTS: NSD (mm) · 4 grooves * | NSD (mm) · 5 grooves *
- BTNS: Sign out | தமிழ் | ⚠ | Complete census | Hold job
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone
  - Hold — Census · # | LABELS: Reason *; Remarks | INPUTS: Remarks|text | SEL: Reason *=— select —,Moved to an urgent job,Fleet left the depot,Set tyre not available,Tube / flap / disc not available,Equipment down,Shift ended,Other (see remarks) | BTNS: ✕, Cancel, Hold job
  - Census completed | BTNS: ✕, Back to round
  - (same as tm/fleet-AIR.html) Raise a complaint
  - (same as tm/fleet-AIR.html) Complaint raised

### `tm/fleet-DO.html` — Tyre Man mobile
- H: Sign in
- LABELS: Powder applied | Odometer (km) *
- INPUTS: Odometer (km) *
- BTNS: Sign out | தமிழ் | Start discout | Hold job
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone
  - Hold — Discout · # | LABELS: Reason *; Remarks | INPUTS: Remarks|text | SEL: Reason *=— select —,Moved to an urgent job,Fleet left the depot,Set tyre not available,Tube / flap / disc not available,Equipment down,Shift ended,Other (see remarks) | BTNS: ✕, Cancel, Hold job
  - Discout · # · # | LABELS: JID-4335 · SS0242 FR → FL moved; JID-4336 · SS0243 FL → FR moved; Odometer (km) * | INPUTS: checkbox:; Odometer (km) *|text* | BTNS: ✕, Hold job, Complete discout
  - Discout completed | BTNS: ✕, Back to round

### `tm/fleet-INSP.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | ✓ | No issues — complete inspection | Hold job
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone
  - Hold — Inspection · # | LABELS: Reason *; Remarks | INPUTS: Remarks|text | SEL: Reason *=— select —,Moved to an urgent job,Fleet left the depot,Set tyre not available,Tube / flap / disc not available,Equipment down,Shift ended,Other (see remarks) | BTNS: ✕, Cancel, Hold job
  - Defect on tyre | LABELS: Complaint type *; Remarks; Photo (optional) | INPUTS: Remarks|text | SEL: Complaint type *=— select —,Weak / faulty valve,Continuous leakage (slow puncture),Tyre burst / blowout,Sidewall damage / bulge,Tread worn below limit,Uneven / irregular wear,Cracks on tread / sidewall,Rim / flap / tube fault,Air valve cap missing | BTNS: ✕, Cancel, Raise complaint
  - (same as tm/fleet-AIR.html) Complaint raised
  - Inspection completed | BTNS: ✕, Next fleet, Back to round

### `tm/fleet-ROT.html` — Tyre Man mobile
- H: Sign in
- LABELS: Odometer (km) *
- INPUTS: Odometer (km) *
- BTNS: Sign out | தமிழ் | Start rotation | Hold job
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone
  - Hold — Rotation · # | LABELS: Reason *; Remarks | INPUTS: Remarks|text | SEL: Reason *=— select —,Moved to an urgent job,Fleet left the depot,Set tyre not available,Tube / flap / disc not available,Equipment down,Shift ended,Other (see remarks) | BTNS: ✕, Cancel, Hold job
  - Rotation · # · # | LABELS: JID-4045 · S03276 FR → FL moved; JID-4046 · S00684 FL → FR moved; Odometer (km) * | INPUTS: checkbox:; Odometer (km) *|text* | BTNS: ✕, Hold job, Complete rotation
  - Rotation completed | BTNS: ✕, Back to round

### `tm/grn--aja.html` — Tyre Man — GRN
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2

### `tm/grn--sil.html` — Tyre Man — GRN
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2

### `tm/grn.html` — Tyre Man — GRN
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2

### `tm/job-ST.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | Raise WSR · disc | Start setting | Hold job
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone
  - Hold job — JC-# · Setting | LABELS: Reason *; Remarks | INPUTS: Remarks|text | SEL: Reason *=— select —,Moved to an urgent job,Set tyre not available,Tube / flap / disc not available,Equipment down,Fleet left the depot,Shift ended,Other (see remarks) | BTNS: ✕, Cancel, Hold job
  - Setting · # · # | LABELS: Powder applied | INPUTS: checkbox: | BTNS: ✕, Raise WSR · disc, Hold job, Complete setting
  - Setting completed | BTNS: ✕, Back to My Jobs

### `tm/job-TC--aja.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2 | Receive GIN | Start setting | Hold job | Raise extra WSR
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone
  - Raise complaint | LABELS: Remarks | INPUTS: Remarks|text | BTNS: ✕, Cancel, Raise complaint
  - Hold job — # · Setting | LABELS: Reason *; Remarks | INPUTS: Remarks|text | SEL: Reason *=— select —,Moved to an urgent job,Set tyre not available,Tube / flap / disc not available,Equipment down,Fleet left the depot,Shift ended,Other (see remarks) | BTNS: ✕, Cancel, Hold job
  - Setting · # · # | LABELS: Powder applied | INPUTS: checkbox: | BTNS: ✕, Hold job, Complete setting
  - (same as tm/job-ST.html) Setting completed
  - Receive GIN · GIN-# | LABELS: Tube, flap and disc received | INPUTS: checkbox: | BTNS: ✕, Cancel, Confirm GIN received
  - GIN received | BTNS: ✕, Close

### `tm/job-TC.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | Start removal | Hold job | Start unsetting | Receive GIN | Start fitment | Set tyre not available | Raise extra WSR
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone
  - Hold job — # · Removal | LABELS: Reason *; Remarks | INPUTS: Remarks|text | SEL: Reason *=— select —,Moved to an urgent job,Set tyre not available,Tube / flap / disc not available,Equipment down,Fleet left the depot,Shift ended,Other (see remarks) | BTNS: ✕, Cancel, Hold job
  - (same as tm/job-TC--aja.html) Raise complaint
  - Removal · # · # FR | LABELS: NSD at removal (mm) *; Removal Reason *; Wear Pattern *; Photo (optional) | INPUTS: NSD at removal (mm) *|text* | SEL: Removal Reason *=— select —,Burst-Centre Burst,Burst-Side Burst,Burst-VC Burst,Burst-Hit Burst,Puncture-Stone,Puncture-Nail,Puncture-Bolt,Puncture-Flap Cut,Puncture-Mouth Cut; Wear Pattern *=— select —,Even wear,Centre wear,Both-shoulder wear,One-side shoulder wear,Cupping / scalloping,Feathering | BTNS: ✕, Hold job, Complete removal
  - Removal completed | BTNS: ✕, Back to My Jobs
  - Fitment · # · # FR | LABELS: Fitted at *; Odometer (km) *; Pressure after fitment (PSI) *; NSD (mm) *; Photo (optional) | INPUTS: Fitted at *|datetime-local*; Odometer (km) *|text*; Pressure after fitment (PSI) *|text*; NSD (mm) *|text* | BTNS: ✕, Set tyre not available, Hold job, Complete fitment
  - Job card completed | BTNS: ✕, Back to My Jobs
  - Fitment waits for Setting | BTNS: ✕, Close
  - Unsetting · # · # | LABELS: Tube condition *; Reason *; Flap condition *; Disc condition * | INPUTS: Reason *|text* | SEL: Tube condition *=— select —,Usable,Not usable; Flap condition *=— select —,Usable,Not usable; Disc condition *=— select —,Usable,Not usable | BTNS: ✕, Hold job, Complete unsetting
  - Unsetting completed | BTNS: ✕, Back to My Jobs
  - Receive GIN · GIN-# | LABELS: Tyre received | INPUTS: checkbox: | BTNS: ✕, Cancel, Confirm GIN received
  - (same as tm/job-TC--aja.html) GIN received

### `tm/job-US.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | Start unsetting | Hold job
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone
  - Hold job — JC-# · Unsetting | LABELS: Reason *; Remarks | INPUTS: Remarks|text | SEL: Reason *=— select —,Moved to an urgent job,Set tyre not available,Tube / flap / disc not available,Equipment down,Fleet left the depot,Shift ended,Other (see remarks) | BTNS: ✕, Cancel, Hold job
  - (same as tm/job-TC.html) Unsetting · # · #
  - (same as tm/job-TC.html) Unsetting completed

### `tm/month-DO.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2
- **Popups / modals:**
  - # · Tyre Discout | BTNS: ✕, Close

### `tm/month-ROT.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2
- **Popups / modals:**
  - # · Tyre Rotation | BTNS: ✕, Close

### `tm/mrn--aja.html` — Tyre Man — MRN
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2

### `tm/mrn--sil.html` — Tyre Man — MRN
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2

### `tm/mrn.html` — Tyre Man — MRN
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2

### `tm/my-jobs--aja.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2 | ⌗ Scan fleet QR | ⌗ Scan tyre | 📦 Request Material (WSR) | 🗓 Request Prepone / Postpone | All | Not started | In progress | On hold | Rework | Done
- **Popups / modals:**
  - Raise WSR | LABELS: Job Card No *; JC-6063 · J0264 FR; JC-ST-2609-20-01 · No fleet; JC-US-2609-20-01 · No fleet; JC-6253 · J0340 RRI; Items | INPUTS: checkbox:; Items|number | SEL: Items=— select —,10.00 X 20,16",20",22.5",7.50 X 16; Items=— select —,10.00 X 20,16",20",22.5",7.50 X 16; Items=— select —,10.00 X 20,16",20",22.5",7.50 X 16; Items=— select —,10.00 X 20,16",20",22.5",7.50 X 16 | COLS: Item, Size, Requested Qty | BTNS: ✕, + Add item, Cancel, Raise WSR
  - Request Prepone / Postpone | LABELS: Job *; Request *; New date *; Reason * | INPUTS: New date *|date*; Reason *|text* | SEL: Job *=— select —,JC-6135 · Discout · J0264,JC-6036 · Rotation · J0375,INS A · J0264,INS A · J0340,INS A · J0378,INS A · J0383 | BTNS: ✕, Cancel, Submit
  - Air Inflation · Air A | BTNS: ✕, Close
  - Tyre Changing · # / RRI | BTNS: ✕, Close
  - Rework — Air Inflation · # | BTNS: ✕, Close, Open fleet
  - Scan fleet QR | LABELS: Fleet No | INPUTS: Fleet No|text | BTNS: ✕, Cancel, Open
  - Scan tyre | LABELS: Tyre No | INPUTS: Tyre No|text | BTNS: ✕, Cancel, Open
  - Tyre # | BTNS: ✕, Close

### `tm/my-jobs--sil.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2 | ⌗ Scan fleet QR | ⌗ Scan tyre | 📦 Request Material (WSR) | 🗓 Request Prepone / Postpone | All | Not started | In progress | On hold | Rework | Done
- **Popups / modals:**
  - (same as tm/my-jobs--aja.html) Raise WSR
  - Request Prepone / Postpone | LABELS: Job *; Request *; New date *; Reason * | INPUTS: New date *|date*; Reason *|text* | SEL: Job *=— select —,Air B · J0545,Air B · J0577,Air B · J0750,Air B · J1609,Air B · J1614,Air B · J1623 | BTNS: ✕, Cancel, Submit
  - (same as tm/my-jobs--aja.html) Air Inflation · Air A
  - (same as tm/my-jobs--aja.html) Tyre Changing · # / RRI
  - (same as tm/my-jobs--aja.html) Rework — Air Inflation · #
  - (same as tm/my-jobs--aja.html) Scan fleet QR
  - (same as tm/my-jobs--aja.html) Scan tyre
  - (same as tm/my-jobs--aja.html) Tyre #

### `tm/my-jobs.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2 | ⌗ Scan fleet QR | ⌗ Scan tyre | 📦 Request Material (WSR) | 🗓 Request Prepone / Postpone | All | Not started | In progress | On hold | Rework | Done
- **Popups / modals:**
  - (same as tm/my-jobs--aja.html) Raise WSR
  - Request Prepone / Postpone | LABELS: Job *; Request *; New date *; Reason * | INPUTS: New date *|date*; Reason *|text* | SEL: Job *=— select —,JC-6063 · Tyre Changing · J0264 FR,JC-ST-2609-20-01 · Tyre Setting · LM3248,JC-6253 · Tyre Changing · J0340 RRI | BTNS: ✕, Cancel, Submit
  - (same as tm/my-jobs--aja.html) Air Inflation · Air A
  - (same as tm/my-jobs--aja.html) Rework — Air Inflation · #
  - (same as tm/my-jobs--aja.html) Scan fleet QR
  - (same as tm/my-jobs--aja.html) Scan tyre
  - (same as tm/my-jobs--aja.html) Tyre #

### `tm/my-wsr--aja.html` — Tyre Man — My WSR
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2 | 📦 Request Material (WSR)
- **Popups / modals:**
  - (same as tm/my-jobs--aja.html) Raise WSR
  - (same as tm/my-jobs--aja.html) Request Prepone / Postpone
  - (same as tm/my-jobs--aja.html) Air Inflation · Air A
  - (same as tm/my-jobs--aja.html) Tyre Changing · # / RRI
  - (same as tm/my-jobs--aja.html) Rework — Air Inflation · #
  - (same as tm/my-jobs--aja.html) Scan fleet QR
  - (same as tm/my-jobs--aja.html) Scan tyre
  - (same as tm/my-jobs--aja.html) Tyre #

### `tm/my-wsr--sil.html` — Tyre Man — My WSR
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2 | 📦 Request Material (WSR)
- **Popups / modals:**
  - (same as tm/my-jobs--aja.html) Raise WSR
  - (same as tm/my-jobs--sil.html) Request Prepone / Postpone
  - (same as tm/my-jobs--aja.html) Air Inflation · Air A
  - (same as tm/my-jobs--aja.html) Tyre Changing · # / RRI
  - (same as tm/my-jobs--aja.html) Rework — Air Inflation · #
  - (same as tm/my-jobs--aja.html) Scan fleet QR
  - (same as tm/my-jobs--aja.html) Scan tyre
  - (same as tm/my-jobs--aja.html) Tyre #
  - # | COLS: S.No, Size, Folio ID, Folio Name, Specification, MTC No, Manufacturer No, Make, Makers Model, Construction Type, Tube Type, UOM, Requested Qty, Issued Qty, Unit Price, Net Amount, Remarks, Job Card No | BTNS: ✕, Close

### `tm/my-wsr.html` — Tyre Man — My WSR
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2 | 📦 Request Material (WSR)
- **Popups / modals:**
  - (same as tm/my-jobs--aja.html) Raise WSR
  - (same as tm/my-jobs.html) Request Prepone / Postpone
  - (same as tm/my-jobs--aja.html) Air Inflation · Air A
  - (same as tm/my-jobs--aja.html) Tyre Changing · # / RRI
  - (same as tm/my-jobs--aja.html) Rework — Air Inflation · #
  - (same as tm/my-jobs--aja.html) Scan fleet QR
  - (same as tm/my-jobs--aja.html) Scan tyre
  - (same as tm/my-jobs--aja.html) Tyre #
  - WSR-# | COLS: S.No, Size, Folio ID, Folio Name, Specification, MTC No, Manufacturer No, Make, Makers Model, Construction Type, Tube Type, UOM, Requested Qty, Issued Qty, Unit Price, Net Amount, Remarks, Job Card No | BTNS: ✕, Close

### `tm/norms.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2 | Back to job
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone

### `tm/notifications--aja.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2 | Back to my jobs
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone

### `tm/notifications--sil.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2 | Back to my jobs
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone

### `tm/notifications.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2 | Back to my jobs
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone

### `tm/round-AIR.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2 | 📏 PSI norms
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone

### `tm/round-AIRN.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ் | 📏 PSI norms
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone

### `tm/round-CENSUS.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ்
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone

### `tm/round-DO.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ்
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone

### `tm/round-INSP.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ்
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone

### `tm/round-ROT.html` — Tyre Man mobile
- H: Sign in
- BTNS: Sign out | தமிழ்
- **Popups / modals:**
  - (same as tm/duty-shift--aja.html) Raise WSR
  - (same as tm/duty-shift--aja.html) Request Prepone / Postpone

### `tm/srn--aja.html` — Tyre Man — SRN
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2

### `tm/srn--sil.html` — Tyre Man — SRN
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2

### `tm/srn.html` — Tyre Man — SRN
- H: Sign in
- BTNS: Sign out | தமிழ் | 🔔2
