# Business Rules

> **Stage 2 update.** Your Stage 2 decisions override these rules where they conflict: **AE is now AM (Tech)**; the roles are HO, AM, Supervisor, Tyre IC, Tyre Man; **BR-MC-11 is superseded — every HO master change (create, edit, deactivate) now needs AM approval**, so conflicts **C1, C2, C3, C11, C12** are resolved; master statuses are `DRAFT → PENDING_APPROVAL → APPROVED / REJECTED` (+ `WITHDRAWN`, UQ-14) and "Returned" for masters becomes "Rejected" with mandatory remarks. Operational rules (§3 onward) stand, with AE read as AM. Remaining conflicts are tracked in `stage2-unresolved-business-questions.md`. See `stage2-approval-workflows.md`.

Every rule below is tagged with how I know it, so you can tell what the prototype states from what I deduced.

| Tag | Meaning | Confidence |
|---|---|---|
| **[UI]** | Stated in visible prototype text, a label, a required marker or a button | High |
| **[JS]** | Enforced by a validation message or logic in the shared runtime script | High |
| **[DATA]** | Visible only in the hard-coded sample data (status values, example records) | Medium |
| **[INF]** | My inference from structure; **needs your confirmation** | Low |

Rules marked **[INF]** are *not* built until you confirm them. Section 14 lists conflicts and unresolved points.

---

## 1. Identity, roles and access

| ID | Rule | Tag |
|---|---|---|
| BR-ID-01 | Five roles exist: Tyre Incharge, Tyre Man, HO (Technical), AE (HO Technical), Supervisor. | [UI] |
| BR-ID-02 | One login screen; the role decides the landing page (TIC → Dashboard, TM → My Jobs, HO/AE → Tyre Folio, SUP → Log Sheet Complaints). | [UI] |
| BR-ID-03 | Tyre Incharge also has a tablet sign-in "Tyre Incharge access only, on this device". | [UI] |
| BR-ID-04 | Depot users (TIC, TM, SUP) work in one depot (Mandaveli in the prototype). HO and AE see all depots, including per-depot filters. | [UI][DATA] |
| BR-ID-05 | Tyre Man has no access to masters, approvals, stores or registers; only jobs, duty, WSR, norms, notifications (and GRN/MRN/SRN shells). | [UI] |
| BR-ID-06 | Supervisor cannot create or edit masters; HO creates, AE approves. Supervisor approves operational items. | [UI] |
| BR-ID-07 | Each user has an employee ID (`TIC-1147`, `TM-3092`, `HOT-0114`, `HOT-AE-021`, `SUP-2231`) shown in the header and in audit trails. | [UI] |
| BR-ID-08 | Outsource employees (OSE-xxx, contractor or direct) can be *assigned* jobs but are not system users. | [UI][INF] |
| BR-ID-09 | The Tyre Incharge is also a workable assignee ("Tyre Incharge · all tyre work") and has a personal My Jobs list. | [UI] |

## 2. Maker–checker for masters (HO → AE)

| ID | Rule | Tag |
|---|---|---|
| BR-MC-01 | Approval chain: **Draft → Pending approval → Approved → Published to all depots.** A checker may instead **Return** the item. | [UI] |
| BR-MC-02 | Masters under maker-checker: **Tyre Folio, Expected Life KM, Reject Reason Master, QC Master, Wear Pattern Master.** | [UI] |
| BR-MC-03 | The maker must press **Send for Approval** (with a confirm step); until then the record is Draft and not live. | [UI] |
| BR-MC-04 | The maker can **Withdraw** a pending item; withdrawal needs a reason. | [UI] |
| BR-MC-05 | The checker can approve or return one or many items; **Return requires a reason**. | [UI] |
| BR-MC-06 | A returned item goes back to the maker for editing and resubmission (status "Returned"). | [UI] |
| BR-MC-07 | Each record has an **Audit Trail** (stage, action, timestamp, actor name and employee ID). Approved items are shown as "Published to all depots" by "System". | [UI] |
| BR-MC-08 | HO may **Delete** a Tyre Folio after a confirm step. For the rebuild this becomes soft-delete/inactive. | [UI] / master prompt |
| BR-MC-09 | Maker and checker are different roles, so a maker cannot approve their own change by construction; this will also be enforced in the database. | [INF] / master prompt |
| BR-MC-10 | Changes to a live master record are held as a proposal until approval; the live record is unchanged until then. *(The prototype shows edit-then-send but not the intermediate "live vs proposed" state.)* | [INF] / master prompt |
| BR-MC-11 | Directly-saved masters (no approval): Complaint Master, Reason Master, Fleet Type Master (+ tyre sizes, type↔size), Shift Master, Tyre Detailed Master, Maintenance Configuration (jobs, skills, schedules), PSI norms, Rotation & Discout norms, Fleet Register edits. They use Activate/Deactivate (soft delete) with an Audit Trail. | [UI] — **conflicts with master prompt (C1)** |

## 3. Other approval flows (operational)

| ID | Flow | Maker | Checker | Outcomes | Tag |
|---|---|---|---|---|---|
| BR-AP-01 | Purchase Indent | HO | AE | Approve → Issued; **Revert** (reason) → Reverted, editable by HO | [UI] |
| BR-AP-02 | Allocation Request | HO | AE | Approve → "goes to Central Store"; Reject needs reason; at least one depot quantity required | [JS] |
| BR-AP-03 | Fleet air-type conversion (Regular ↔ Nitrogen) | TIC or SUP | HO (Technical) then AE | Stage shown as "With HO (Technical)" → "With AE"; reason mandatory; AE Approve / Return (reason) | [UI] |
| BR-AP-04 | GIN (internal transfer / TRS / MIC) | TIC | Supervisor | Approve / Revert (reason) / Reject (reason) | [UI] |
| BR-AP-05 | Depot Indent / Internal Transfer Indent | TIC | Supervisor | Approve / Revert (reason) / Reject (reason) | [UI] |
| BR-AP-06 | Fleet Grouping change | TIC | Supervisor | Approve / Return (reason) | [UI] |
| BR-AP-07 | Weekly Duty Roster | TIC | Supervisor | Approve ("Posted") / Return (reason) | [UI] |
| BR-AP-08 | Tyre-man Skill addition | TIC | Supervisor | Approve / Return (reason) | [UI] |
| BR-AP-09 | WSR (tube/flap/disc request) | Tyre Man or TIC | TIC (Accept & Issue / Reject) | Reject needs reason; Cancel needs reason | [UI][JS] |
| BR-AP-10 | Complaint triage | Tyre Man / Supervisor / TIC | TIC | Per complaint **Approve** (create/assign job) or **Reject**; every selected complaint must be decided | [JS] |
| BR-AP-11 | DRN (warranty/discrepancy return) | TIC | not shown | Pending / Approved / Rejected | [DATA] — approver unknown (**C6**) |
| BR-AP-12 | Tyre Damage Report | system/TRS request | TIC fills | Pending approval / Approved / Returned / Report Received; TIC can **Fill Report** only when Approved | [DATA][UI] |
| BR-AP-13 | Premature Failure Report | TIC | TRS IC | Report Raised → Pending TRS IC → Sent to TRS → Sent to Depot / Returned | [DATA] |
| BR-AP-14 | New reasons suggested by depots | Depots | HO | **Add to list** (choose "pauses schedule") or **Reject** (reason) | [UI] |
| BR-AP-15 | Shift change and leave request (Tyre Man) | TM | not shown | "Pending approval" | [DATA] — approver unknown (**C7**) |
| BR-AP-16 | Prepone/Postpone request (Tyre Man) | TM | not shown | New date + reason | [UI] — approver unknown (**C7**) |
| BR-AP-17 | **GIN raised for a Tyre-Man-raised WSR** | system | none | "auto, no approval" | [UI] |

General rules for all flows: a Return/Revert/Reject/Cancel/Withdraw/Remove always asks for a **mandatory reason** (the confirm button stays disabled until it is entered) **[UI]**; bulk Approve/Revert/Reject on multiple selected rows is allowed for GIN, Indent and master lists **[UI]**; every approval document has an audit trail with "When, Who, Action, Comment" **[UI]**.

## 4. Scheduling and fleet grouping

| ID | Rule | Tag |
|---|---|---|
| BR-SC-01 | Schedules are defined in Maintenance Configuration with a code (SCH001…), name, category, frequency, linked job code, effective-from date, Work-Order-based flag, Outsource-Employee-based flag and status. | [UI] |
| BR-SC-02 | Frequency types: **Date Based**, **KM Based**, **Date and KM Based**. Date: every *n* days, or particular dates (e.g. "15th and 30th of the month"). KM: every *n* km measured on one basis: Scheduled KM, Dead KM, Operated KM, Gross KM or Live Odo KM. | [UI] |
| BR-SC-03 | A schedule has a "Due date (days after assignment)" and may be checklist-based. | [UI] |
| BR-SC-04 | A schedule contains 1–30 *categories*; each category can combine group-based rules (Replace At / Inspect At / Service At KM), checkpoints (1–50), checklist, description and job-ID mapping. Only active folios and active jobs may be selected. | [JS] |
| BR-SC-05 | Examples in data: Air Inflation every 2 working days (Regular, SCH001), Tyre Rotation every 30 days (SCH004). Other frequencies present in the list: every 3 days, every 120 days, "15th and 30th of the month", operated-KM every 10,000 km and every 2,500 km. Schedule codes seen: SCH001 Air Inflation, SCH002 Air Inflation — Nitrogen, SCH003 Inspection, SCH004 Tyre Rotation, SCH005 Tyre Discout, SCH007 Census (which frequency belongs to which code is not fully shown). | [DATA] |
| BR-SC-06 | Fleets are placed into **groups** per schedule (Air A, Air B, Nitrogen A, INS A, INS B). Each group has a "first schedule date"; the next dates follow the schedule frequency. | [UI] |
| BR-SC-07 | Creating or changing a group needs a **Reason for change** and Supervisor approval; the TIC may withdraw with a reason. | [UI] |
| BR-SC-08 | Fleets not in any group are shown as "Ungrouped fleets". | [UI] |
| BR-SC-09 | The Schedule Planner shows, per day, how many fleets/tyres are due and how many job cards exist; a day can be Not Assigned / Assigned / Completed / Overdue / Today. | [DATA] |
| BR-SC-10 | **Job cards are generated from schedules**: one job card per fleet for Air Inflation, Inspection, Rotation, Discout and Census; one Job ID per tyre for Census; two Job IDs for Rotation (due tyre and partner). | [UI][DATA] |
| BR-SC-11 | The Duty Roster is available only for September–December 2026 (toast: "Duty roster is available for September to December 2026"). This is a prototype limit, not necessarily a business rule. | [JS] |
| BR-SC-12 | Rotation cadence and Discout cadence are expressed as operated days *and* operated KM with an effective-from date; only tyres of certain **grades (New, A, B, C)** are eligible in the front position. | [UI] |
| BR-SC-13 | A reason in Reason Master has a flag **"Pauses schedule" (Yes/No)**, used when a job is held, rescheduled, replaced, missed, or sent back. | [UI] |

## 5. Job cards and execution

| ID | Rule | Tag |
|---|---|---|
| BR-JB-01 | Job sources are **Scheduled, Complaint, Reactive.** | [UI] |
| BR-JB-02 | Work categories: Air Inflation, Air Inflation — Nitrogen, Inspection, Tyre Rotation, Tyre Discout, Census, Tyre Changing, Tyre Removal, Tyre Fitment, Tyre Setting, Tyre Unsetting. Job codes JOB-001…006, 008…012. | [UI] |
| BR-JB-03 | Status set: **Not Assigned, Assigned, In Progress, On Hold, Awaiting WSR, Awaiting final inspection, Rework, Closed, Cancelled.** | [UI] |
| BR-JB-04 | **Tyre Changing** is a chain of four Job IDs in this order: **Removal → Unsetting → Setting → Fitment.** Fitment cannot start until Setting is complete ("Fitment JID-4022 starts after Setting JID-4023"). | [UI] |
| BR-JB-05 | A Tyre Changing job card can be created from a complaint (CMPID) or as reactive; assignments of its Job IDs can differ (e.g. Setting assigned to another tyre man). | [UI][DATA] |
| BR-JB-06 | When a complaint requires inspection first, work is assigned *after* inspection ("Inspection assignment before work"; "Work assigned, starts after inspection"). | [JS] |
| BR-JB-07 | Assignment requires **Due date, Due shift, Assign to**. Shifts: AM / General / PM / Night. The assignee list shows skills, flags a **Skill match** against the job's required skills and flags people **On leave**. | [UI] |
| BR-JB-08 | A job can be **assigned, replaced, added to (extra tyre man), rescheduled** (new date, reason, new assignee, shift) or **cancelled** (reason). Bulk assign/replace shows a review step with the count before confirming. | [UI] |
| BR-JB-09 | If an assigned person is absent, the TIC can **Replace for today** (replace-with + shift) for all that person's open job cards (example: "replace 30 job cards"). | [UI] |
| BR-JB-10 | **Hold** requires a reason from Reason Master (Moved to an urgent job, Fleet left the depot, Set tyre not available, Tube / flap / disc not available, Equipment down, Shift ended, Other + remarks). | [UI][JS] |
| BR-JB-11 | A job must be **started** before work can be saved ("Start the work first"); the user must select the work that is done ("Select the work that is done"). | [JS] |
| BR-JB-12 | The TIC or Supervisor can enter work **on behalf of** a tyre man, and must give a **reason for entering on behalf**. | [UI] |
| BR-JB-13 | When the work is done the job moves to **Awaiting final inspection**; a QC checklist (from QC Master, per job type) is completed; result is **Closed** or **Rework**. Re-inspection can be assigned. | [UI][JS] |
| BR-JB-14 | Final inspection can be done from both the TIC and Supervisor registers. *(Who is authoritative: **C4**.)* | [UI] |
| BR-JB-15 | A fleet can be marked Held-up and its status changed (In depot, Out, Breakdown, Held up); a **held-up reason is required** ("Enter the held-up reason"). | [JS] |
| BR-JB-16 | A **fleet-wide "Raise a complaint"** can be made from any execution screen (Air Inflation, Inspection) with complaint type, remarks and optional photo. Complaint types: Weak/faulty valve; Continuous leakage (slow puncture); Puncture — nail/foreign object; Tyre burst/blowout; Wrong tyre fitted — number does not match this position; Sidewall damage/bulge; Tread worn below limit; Uneven/irregular wear; Cracks on tread/sidewall; Rim/flap/tube fault; Air valve cap missing; Other. | [UI] |
| BR-JB-17 | **Wrong tyre size detected** on a fleet notifies HO ("Wrong tyre size is being used on <fleet> (<type>). HO notified."). | [JS] |
| BR-JB-18 | **Set tyre not available** during Fitment raises a complaint and holds the job. | [UI] |
| BR-JB-19 | Complaint Master maps each complaint code to the **required jobs** (e.g. a complaint requires Removal, Fitment, Setting, Unsetting); 44 of 67 complaints are "Not linked". | [UI][DATA] |
| BR-JB-20 | Each job has an **estimated completion time** per fleet and per tyre (minutes), set by fleet type. | [UI] |

### 5.1 Execution data captured per job type

| Job | Mandatory input (from prototype) | Notes |
|---|---|---|
| Air Inflation / Nitrogen | Per tyre: Present (found) PSI, Inflated-to PSI; CIRT checklist (level surface = Yes is mandatory) | Target PSI from PSI Norms for tyre size × construction × position × air type. **Tolerance:** found pressure < target − 15 or > target + 10 is flagged (PSI exception) **[UI]**. "Answer No only if the job cannot proceed"; other No answers flag a defect. |
| Inspection | Tyre-by-tyre check; "No issues" or Defect (complaint type *) | Photo optional. |
| Tyre Rotation | **Odometer (km) *** | Moves FR↔FL (due tyre and partner); each move is its own Job ID. |
| Tyre Discout | **Odometer (km) ***, Powder applied | Tyres swap positions; eligibility by grade. |
| Census | Per tyre **NSD (mm) *** (4 or 5 readings by groove count) and **Wear pattern *** | Shows current NSD for comparison. |
| Removal | Removed at *, Odometer *, NSD at removal (mm) *, Tyre condition (Worn beyond limit / Cut-damage / Burst / Other) | Creates a **Removal Order** on completion. |
| Unsetting | Tyre; tube/flap/disc disposition (selected by TIC: Live stock Good or Repair) | Result: Unset; stays Repair / Ready for Transit. |
| Setting | Tyre (from live stock Good Unset), tube, flap, disc | Tube/flap/disc via WSR; result Live stock Good Set. |
| Fitment | Fitment tyre * (live stock Good Set), Fitted at *, Pressure after fitment (PSI) * | Creates a **Fitment Order**; needs GIN received. |

## 6. Material requests (WSR) and issue

| ID | Rule | Tag |
|---|---|---|
| BR-WS-01 | A WSR requests **Tube, Flap and/or Disc** by size, tied to a job card/Job ID (or "not tied to a job") and a tyre man. | [UI] |
| BR-WS-02 | A tyre man can raise a WSR **after work starts**; a job card on hold cannot take a new WSR ("raise again when the work resumes"). A Setting job whose disc was "Not given" shows "Raise WSR · disc". | [UI] |
| BR-WS-03 | Job status **Awaiting WSR** exists; the TIC accepts and issues against live stock, selecting an **Item No** per unit with price. | [UI][DATA] |
| BR-WS-04 | WSR statuses: Requested, Partly Issued, Issued, Rejected, Cancelled. Reject and Cancel require a reason. | [UI] |
| BR-WS-05 | Issuing a Tyre-Man-raised WSR creates a **WSR Issue GIN automatically with no approval**; GIN is received by the tyre man ("Receive GIN") before Fitment. | [UI] |
| BR-WS-06 | Tube/flap/disc stock has its own register (Good, Set, Unset, Repair, Fitted counts per size). | [UI] |

## 7. Depot store, transfers and retreading (TRS) cycle

| ID | Rule | Tag |
|---|---|---|
| BR-ST-01 | **Depot Indent** requests material (tyres, tube, flap) from Central Store, another depot or a TRS unit. Statuses: Draft, Awaiting approval, Reverted, Sent, New, Accepted, In transit, Partly issued, Partly received, Issued, Received, Rejected, Cancelled. | [UI] |
| BR-ST-02 | The receiving depot sees an **Internal Transfer Request** (status New) and either **Rejects** it (reason) or **Accepts & creates a GIN**. | [UI] |
| BR-ST-03 | A **GIN** is created against an indent (or for a destination: TRS, other depot, MIC vehicle), with tyres selected individually; Draft → Send for Approval → Supervisor → Approved. | [UI] |
| BR-ST-04 | An **approved GIN** needs a **Gate Pass** to leave; issuing the pass sets the GIN to **In transit**. | [UI][JS] |
| BR-ST-05 | Gate Pass types: Internal Transfer GIN (Outward), MRN (Outward), Goods Receipt Note (Inward), Central Store GIN (Inward). It records vehicle & driver (or fleet, or employee, or other person), then **Mark Exit** with date/time and security check name. A pass can be cancelled with a reason. | [UI] |
| BR-ST-06 | The destination records a **GRN**; each tyre is **Accepted or Rejected** (reject reason from Reject Reason Master), and a **partial receipt** gives "Partly received". | [UI][JS] |
| BR-ST-07 | GRN from **TRS (retreading)** returns retreaded tyres with a **Grade**; for returns from TRS the TIC records **Discrepancy** with a reason (Tyre missing from shipment, Wrong tyre sent, Casing damaged, Grade variance). | [UI] |
| BR-ST-08 | When a removed tyre is received (Removal Order, MRN), the TIC chooses **Goes To: Live stock, Ready for Transit, or DRN**. Tube/flap/disc from an unsetting go to Live stock Good or Repair, chosen by the TIC. | [UI] |
| BR-ST-09 | Tyres can be returned from a **MIC vehicle** as "Returned unused" or "Fitted on road — removed tyre returned". | [UI] |
| BR-ST-10 | **Log arrival** records a tyre from another depot (Tyre No *, From Depot *, Reason present here *), optionally linked to our fleet. | [UI] |
| BR-ST-11 | **Scrap Return Note** requires at least one scrap item with a quantity. | [JS] |
| BR-ST-12 | **DRN** is created from tyres in warranty/discrepancy, shows purchase, manufactured and warranty-upto dates, and is sent to a TRS unit. | [UI] |
| BR-ST-13 | Stock states for a tyre: Fitted, Live stock (Good Set / Good Unset / Repair), Reserved (for a job), Ready for Transit, In Transit, At TRS (Idle, In Production, Unfit, Condemn), At MIC, At Other Depots. Grade: New, A, B, C. Condition (tube/flap/disc): New, Serviced, Injured. | [UI][DATA] |
| BR-ST-14 | Dashboard raises a **low-stock** alert when Available < Minimum Stk, offering "Raise a Depot Indent"; folios carry Minimum Stk, Maximum Stock, Backorder. | [UI] |
| BR-ST-15 | Each tyre has a **ledger** (Inward/Outward/Balance with ICRN/GIN/GRN/WSR reference) and a **fleet movement** history. Folio stock is shown by depot/unit. | [UI] |
| BR-ST-16 | Stock value uses a **Weighted Average Rate**. | [UI] |
| BR-ST-17 | Purchase Indent types: Supplementary, (AWR), Emergency; shows consumption history (1/3/6/12 months), minimum/maximum stock, CS/D.Store/TRS stock, pending PO, GST %. | [UI] |

## 8. Workforce, roster and leave

| ID | Rule | Tag |
|---|---|---|
| BR-WF-01 | Shifts (Shift Master): Morning 06:00–14:00, General 09:00–17:30, Evening 14:00–22:00, Night 22:00–06:00. Editing a shift affects future rostering only; existing rosters are untouched. | [UI] |
| BR-WF-02 | The TIC posts a weekly roster; the Supervisor approves ("Approved by S. Rajendran (SUP) · date time") or returns it with a reason. | [UI] |
| BR-WF-03 | Attendance and week-off come from **HRMS** (read-only for the tyre man); leave types Casual, Sick, Earned. | [UI] |
| BR-WF-04 | A tyre man can request a shift change for a date range with a reason (e.g. SCR-018 PM → General) and apply for leave. | [UI] |
| BR-WF-05 | Skills: Air Inflation, Tyre Rotation, Wheel Balancing, Tyre Fitment, Nail Removal, Retreading, Wheel Alignment. Adding a skill needs TIC request + Supervisor approval. Skills drive "Skill match" in assignment. | [UI] |
| BR-WF-06 | Outsource employees: required name, phone (10-digit), Aadhaar, work order type (through contractor / direct), contractor name, address; removal needs a reason and **does not** erase their name on past job cards. | [UI] |
| BR-WF-07 | Shift naming difference (AM/PM vs Morning/Evening) — treat as equivalent. | [INF] (**C8**) |

## 9. Reports, losses and life tracking

| ID | Rule | Tag |
|---|---|---|
| BR-RP-01 | **Expected Life KM** is held per tyre size for New and for each retread level RT1–RT5; all six values are required. | [UI] |
| BR-RP-02 | A **Premature Failure** is a tyre that failed below its norm km (example: "Casing separation at 61,656 km, below the norm"). The report holds Km Run, Norm Km, Remaining Km, Tyre Price and **Loss Amount (₹)**. | [UI][DATA] |
| BR-RP-03 | Loss Amount = Tyre Price × Remaining Km ÷ Norm Km. *(Formula not shown; it is the usual pro-rata method.)* | [INF] (**C9**) |
| BR-RP-04 | Premature Failure fields are pre-filled from the tyre's life history (fitted date, km run, rotations, disc-outs). | [UI] |
| BR-RP-05 | Tyre life record (TLDC) tracks retread stages (rubber, bonding gum, VC patches), per-rotation matrix, fitment history with KM and days, routes, location phases, repairs. | [UI] |
| BR-RP-06 | Dashboard shows "Today's compliance" per job type (for example Tyre Rotation 100% — nothing planned; Tyre Discout 0% — 0/1 today), plus overdue jobs and PSI exceptions. The formula is inferred as done ÷ due today. | [UI][DATA] / formula [INF] |
| BR-RP-07 | Maintenance Pending (HO/AE) counts pending maintenance per depot for a chosen month and type. | [UI] |

## 10. Notifications

| ID | Rule | Tag |
|---|---|---|
| BR-NT-01 | Each user has a bell with an unread count and a list typed by category. TIC: Approvals, Job cards, Complaints, Indents, Movements. Seen types: WSR approval, New complaint, Indent received, Final inspection pending, Rework, Returned. TM: WSR issued, Fitment waits for Setting, Job assigned. | [UI] |
| BR-NT-02 | Sidebar items carry pending-count badges (for example Tyre Folio 3 for AE). | [UI] |
| BR-NT-03 | Clicking a notification opens the related record. | [UI][INF] |

## 11. Numbering formats (preserve)

| Document | Pattern seen |
|---|---|
| Job card (scheduled/reactive) | `JC-6063`; typed: `JC-ST-2609-20-01` (Setting), `JC-US-…` (Unsetting), `JC-CEN-2609-20-001` (Census) |
| Job ID | `JID-4021` |
| Fleet / Reg | `J0264` / `TN-01-N-0264` |
| GIN | `GIN-MN-2026-0163` (MN = Mandaveli), `TRS-GIN-2609-01` |
| WSR | `WSR-MN-2609-0120`, `WSR-2609-008` |
| Indent | `IND-AD-2026-0044` (Adyar), `IND-MIC-2026-0006`, Purchase Indent `PI-…` |
| GRN / MRN | `GRN-MN-IN-0027`, `MRN-MN-004` |
| Orders | Fitment Order `FO-MN-2026-3012`, Removal Order `RO-…` |
| Complaint | `CMPID-0505` |
| Schedule | `SCH001…SCH007`; Reason `RSN-…`; Tyre men `TM-3092`; Outsource `OSE-001` |
| Roster request | `SCR-018` (shift change) |

## 12. Data validation conventions

- Required fields are marked `*` and show "<Field> is required" inline **[UI]**.
- Numeric entries (odometer, NSD, PSI, KM, quantities) are positive numbers; KM values minimum 1 **[JS][INF]**.
- Dates use `dd Mon yyyy`; date-times are 24-hour; toast confirmations for every save **[UI]**.
- Counts shown as "Select at least one job card / complaint / day / employee / schedule code / job ID" when a bulk action is attempted with nothing selected **[JS]**.

## 13. Rules in the master prompt that the prototype does not contradict and I will add

- Database-side enforcement of every approval and role rule (not only the front end).
- Soft delete instead of permanent delete.
- Full audit log for create/update/approve/reject with previous and new values.
- Users cannot change their own role or depot; Tyre Men see only their own jobs; TIC sees only their depot.

## 14. Conflicts and unresolved points (need your decision)

| ID | Conflict / gap | Evidence | My default |
|---|---|---|---|
| C1 | Master prompt: all HO master changes need AM approval. Prototype: only five masters do. | BR-MC-02 vs BR-MC-11 | Follow the prototype; make approval configurable per master. |
| C2 | Maintenance Configuration audit trail shows an approval chain, but AE has no Approve/Return controls and HO has direct Create/Edit. | HO-08/10, AE-06 | Treat as direct (matches the UI controls) unless you say otherwise. |
| C3 | Tyre Man norms screen says norms are "approved by AE"; AE Norm Master has no approve controls and HO adds/edits PSI norms directly. | TM-10, AE-02, HO-11 | Add AE approval for PSI norms only if you confirm. |
| C4 | Who performs **final inspection**: TIC, Supervisor, or either. | BR-JB-14 | Either, recorded by actor. |
| C5 | "Tyre AC" appears in the norms text instead of "Tyre Incharge". | TM-10 | Treat as TIC. |
| C6 | DRN: who approves (Pending → Approved/Rejected). | TIC-16 | Supervisor (consistent with other TIC documents) — please confirm. |
| C7 | Shift change, leave and prepone/postpone requests: approver not shown. | TM-08, TM-01 | TIC approves prepone/postpone; Supervisor approves shift change/leave — please confirm. |
| C8 | Shift names AM/PM vs Morning/Evening. | Shift Master vs TIC/TM | Equivalent; store one code per shift with both labels. |
| C9 | Loss Amount formula not shown. | BR-RP-03 | Pro-rata on remaining km vs norm km — please confirm. |
| C10 | JOB-007 missing from job codes. | HO-14 list | Reserve the code; do not invent a job. |
| C11 | Tyre Folio "Delete" button vs master-prompt soft-delete. | HO-01 | Soft delete (status Inactive). |
| C12 | Terminology: Returned / Revert / Reject / Rejected. | §3 | Canonical statuses in DB, prototype wording in UI. |
| C13 | Allocation Requests: create/stock forms are not visible in the snapshot; only list and approve hints exist. | HO-21/AE-11 | Build from the list columns and runtime hints; label gaps. |
| C14 | Tablet edition as a separate canvas vs responsive layout. | Login | Responsive layout. |
