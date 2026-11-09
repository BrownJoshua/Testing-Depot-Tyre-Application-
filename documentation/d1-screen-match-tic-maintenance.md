# D1 screen match: Tyre IC maintenance side and Supervisor (2026-11-09)

Reference: `MTC-Depot-Tyre D1.html` pages (unpacked) and `Depot Tyre FRS D1.xlsx`. "Done" = built in this pass. Browser check was not done by this pass (only typecheck).

| Prototype page | Our screen | Gap found | Status |
|---|---|---|---|
| tic/dashboard | Dashboard (TIC) | Headline tiles (fleets, tyres tracked, compliance %, open complaints, overdue jobs, PSI), stock by place with Set / Unset, tube / flap / disc table, float by status and grade, complaint top types, top sizes | Done (`DepotAnalytics.tsx`). Left: Pending-actions list wording, low-stock folio table |
| tic/complaints | Complaints | Tiles New / Assigned / Closed / Total; Source filter; columns Maintenance Category, Source, Position, Tyre No, Complaint Code, Suggested Job Codes, Raised by, Job ref | Done. Left: "Review & assign" popup, Create Complaint with a removal fleet picker |
| tic/job-management (Job Card Register) | Job Card Register | Filters From / To, Work category, Source, Shift, Status, Overdue / Today / Upcoming, Reset; Export CSV | Done. Left: grouped "29 job cards, one per fleet" rows, Assign selected / Replace selected, Rotation & Discout Norms, Air Inflation Norms tabs |
| tic/schedule-planner (Scheduled Work) | Schedule Planner | Date-wise table (a column per schedule, fleets, job cards, day status) | Done (`ScheduledWork.tsx`). Left: Print |
| tic/schedule-planner--schedule-chart / --pending / --schedule-setup | Schedule Planner charts / setup | Today / This month / Earlier-days layout of the chart and the Pending tab | Left (existing chart is one table per Schedule ID with status filters) |
| tic/outsource-employee | none | Whole register: Employee ID OSE-001.., Work order (Contractor / Direct), phone, Aadhaar, address, qualification, skill, status, Add, Remove with reason | Done (migration 0040, `StaffRegisters.tsx`, route /tic/outsource). Left: outsource staff in the Assign Work picker |
| tic/tyre-man-master | none | Tyre Man Register (employees list, role filter) | Done read-only (/tic/tyre-men). Left: Skill column, skill requests tab, + Skill |
| tic/tyre (Live Tyre Stock) | Tyre Register only | Folio summary with Available / Minimum / Maximum / Backorder / rate / value / Low Stock, Good / Repair, Summary / Detailed, product-group filter | Done (migration 0041 folio parameters for 19 folios, `LiveStock.tsx`, /tic/live-stock). Left: Ledger popup, Create Job Card button, Low Stock raising an Indent |
| tic/tyre-register | Tyre Register | Not compared in detail (202 KB page) | Left |
| tic/group-master (Fleet Grouping) | Fleet Grouping | Group cards (Air A / B, fleets, tyres, model type and size mix) | Left |
| tic/duty-posting, tic/my-jobs, tic/notifications, tic/fleet-master* | Duty Posting (step 5), none, none, Fleet Register | My Jobs for the Tyre IC (Census card list), notifications bell, Air Type requests | Left |
| sup/* | Supervisor monitor screens | Log Sheet Complaints, Job Management monitor, Fleet Master and Tyre Master views exist; GIN / Indent / Skill approvals not built here; Roster Approvals is not used in D1 | Left |

Files touched: `src/components/DepotAnalytics.tsx`, `src/components/ScheduledWork.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Complaints.tsx`, `src/pages/JobCards.tsx`, `src/pages/SchedulePlanner.tsx`, `src/pages/StaffRegisters.tsx`, `src/pages/LiveStock.tsx`, `src/App.tsx`, `src/lib/roles.ts`, migrations 0040 and 0041, test `supabase/tests/0040_outsource_test.sql`.
