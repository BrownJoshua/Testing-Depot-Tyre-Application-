# D1 realignment: gap list and plan

Reference: `C:\Users\USER\Desktop\Dtyre Developer version 1\` (prototype `MTC-Depot-Tyre D1.html`, `HANDOFF_Depot-Tyre-Store_2026-10-12.md`, `JOB_AND_SCHEDULE_DEFINITION.md`, `Figma Trail\DATA_MODEL.md`).
Where the handoff's sections 2.16 onward differ from 2.1-2.15, 2.16 onward win. Written 2026-11-04 after the user said most functions of the build differ from the prototype.

Conflict kept by decision: **every HO master change needs AM approval** (the prototype's handoff says masters are saved directly). Change only if the user says so.

## Gaps (build vs prototype) and status

| # | Area | Prototype (D1) | Build before realignment | Status |
|---|---|---|---|---|
| 1 | Tyre Register | One row per tyre (MTC No, folio, make, model, grade, condition, position, dates, NSD, KM, last rotation / discout); fitted / live stock good-repair / TRS / MIC | none | **Done** (0017, 0018: 528 tyres of Mandaveli) |
| 2 | Fleets | 300 in the HO register; Mandaveli 70; Fleet Type Small / Standard / Low Floor; air type, axle, odometer, route | 34 invented demo fleets | **Done** (0018; old demo fleets deactivated) |
| 3 | Tyre Folio | F7001.. (Size + Construction + Tube Type) | none seeded | **Done** (19 of the prototype's folios) |
| 4 | Job Master | JOB-001..012, JOB-007 and JOB-012 inactive, minutes per fleet and per tyre | JOB-007 refused, JOB-012 missing, no minutes | To do |
| 5 | Job card | One fleet (two for a swap); statuses Draft, Assigned for Inspection, Inspection Done, Assigned for Work, Final Inspection, Final Inspection Failed, Completed, Closed; **no Cancel**; running ID JC-6001 | one task per step, Cancel, own statuses | To do |
| 6 | Job ID | One Job Code on one tyre (JID-4001) | one task per step | To do |
| 7 | New Job Card | Types Complaint / Job Code / Schedule Code; vehicle source; fleet; tyre list; expected date | one form for two types | To do |
| 8 | Complaint | Never becomes a job directly; inspection (Tyre IC or Tyre Man) approves / rejects each complaint; approved become Job IDs; re-inspect or close; remarks + photo; CMPID-0501, CMP001 | Tyre IC creates a card or rejects | To do |
| 9 | Assign | Inspection and work are separate people; due date + shift; Job-ID-wise Tyre Men; per-fleet + per-tyre estimated time | single assign per step | To do |
| 10 | Final Inspection | Pass / Fail / Rework (rework = new Job ID) | Pass / Fail only | To do |
| 11 | Schedule | SCH001..007 with real frequencies (2 days, 3 days, 2 days, 30 days, 120 days or 10,000 km, inactive, 15th and 30th) | 3 schedules, date-based | To do |
| 12 | Schedule ID / Chart | One run per period; Chart (Today, This month, Earlier); Assign Technician creates one card per fleet | fleet groups + planner | To do |
| 13 | Rotation / Discout | Front tyres only, FR to FL swap; due per tyre (30 operated days / 120 days or 10,000 km) | none | To do |
| 14 | Tyre Changing | Panel per tyre: removal reason, fitment tyre (live stock set / unset, another fleet swap, want of tyre), tube / flap / disc source; Removal / Unsetting / Setting / Fitment order lock | simple chain | To do |
| 15 | Documents | WSR, WSR GIN, GRN (accepted / rejected), MRN, Scrap Return Note, Removal and Fitment Orders | none | To do |
| 16 | Job Card Detail | One format: strip, complaints, inspection, Job IDs, WSR, GIN, MRN, GRN, orders, final inspection, scrap, audit trail | basic | To do |
| 17 | Tyre Man app | My Jobs, round screens per work type, Start Work, scrap return review, GRN / MRN / SRN tabs, duty and shift | 3 screens | To do |
| 18 | Duty Posting | Schedule / Job-centric posting from an HRMS roster; weekly roster approval was removed | weekly roster with Supervisor approval | To do (needs HRMS roster data) |
| 19 | IDs | Running numbers without date: JC-6001, JID-4001, CMPID-0501, SCHID-4001, INSID-0001, SRN001 | provisional formats | To do |

## Order of work

1. **Tyre register and fleets** (done): needed because a Job ID is one job on one tyre.
2. **Job model v2**: job cards, Job IDs, complaints with inspection, assignment, Final Inspection, running IDs; replaces the batch 7 tables.
3. **Schedules**: Job Master and Schedule Master as in D1, Schedule IDs, Chart, Assign Technician, Rotation and Discout rules.
4. **Documents**: WSR, WSR GIN, GRN, MRN, Scrap Return Note, Removal and Fitment Orders; Tyre Changing panel.
5. **Tyre Man app** and **Duty Posting**.

Each step: migration + test through the runner, screens, a browser check, then commit.

## Notes

- Seed values come from the prototype's sample data (generator in `supabase/admin/d1-seed/`).
- The tests of batches 6-8 (`0013`..`0015`) describe the earlier design; some assertions (fleet counts) no longer hold after 0018. They are kept as history and replaced by new tests as each step lands.

## Progress

- **Step 1 (done):** tyre register, 300 fleets, folios (0017, 0018).
- **Step 2 (done, 2026-11-04):** job model v2 (0019-0021): rows 4 (job master), 5 (job card, no Cancel), 6 (Job ID per tyre), 7 (New Job Card: Complaint and Job Code types), 8 (complaint through inspection, re-inspect / close), 9 (inspection and work assigned separately, 1-3 Tyre Men per Job ID, due date + shift, estimated time), 10 (Final Inspection Pass / Fail / Rework), 19 (JC-6201, JID-4201, CMPID-0601, INSID-0001). Row 16 (Job Card Detail) is built without the WSR / GIN / MRN / GRN / order tables (step 4). Complaint photo and Fail meaning remain open. Row 17 is partly done: My Jobs, inspection, Start Work, Complete.
- The batch 8 Schedule Planner screen is removed until step 3 (it depended on the old job cards). Fleet Grouping and Duty Posting still work.
