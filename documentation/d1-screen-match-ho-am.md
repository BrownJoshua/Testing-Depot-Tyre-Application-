# D1 screen match: HO (Tech) and AE (= AM)

Source: D1 prototype pages `ho/*` and `ae/*`, FRS D1 sheets. Rule kept: HO proposes every master change, AM approves.
Done 2026-11-09 (migrations 0030-0032, test `0030_ho_masters_purchase_test.sql`).

| Prototype page (HO / AE) | Our screen | State |
|---|---|---|
| Tyre Folio | `/ho/m/tyre-folio`, `/am/m/tyre-folio` | already built (step 1) |
| Fleet Register (fleet-master) | `/ho/m/fleets` | already built |
| Fleet Type Master (+ Tyre Size, Fleet Type Tyre Size tabs) | `/ho/m/fleet-types` | built; the three tabs of the prototype are one screen here |
| Tyre Complaint Master | `/ho/m/complaint-types` | already built |
| Maintenance Configuration (jobs, schedules) | `/ho/m/maintenance-jobs`, `/ho/m/schedules` | built (step 3) |
| Shift Master | `/ho/m/shifts`, `/am/m/shifts` | **built now** (approval engine; shift, start, end) |
| Reject Reason Master | `/ho/m/reject-reasons` | **built now** (DRR-001..004 seeded) |
| Wear Pattern Master | `/ho/m/wear-patterns` | **built now** (WP-001..008 seeded) |
| QC Master | `/ho/m/qc-master` | **built now** (QCM-001..011, checklist items one per line) |
| Expected Life KM | `/ho/m/expected-life-km` | **built now** (New, RT1..RT5 by tyre size) |
| Purchase Indent | `/ho/purchase-indent`, `/am/purchase-indent` | **built now**: totals, Export (CSV), Raise Indent (type, folio group, source, folio lines), View; AM issues or reverts with a reason. Sample PI-HO-2026-001..003 |
| Allocation Requests | `/ho/allocation-requests`, `/am/allocation-requests` | **built now**: read-only list with the prototype's columns (empty: the Central Store is not built) |
| Maintenance Pending | `/ho/maintenance-pending`, `/am/maintenance-pending` | **built now**: month and maintenance type filters, depot-wise planned / done / pending / overdue from the Schedule Chart, as on the demo date |
| Tyre Man Register | built by another agent (`StaffRegisters`) | not mine |
| Tyre Stock / in-transit | built by another agent (`LiveStock`, `Logistics`) | not mine |

## Gaps left
- **Tyre Detailed Master** (66 columns list) and **Tyre Correction Requests**: the registry type `tyre_detail_column` and `tyre` exist but have no screen. Not built.
- **Maintenance Configuration** tabs **Skills** and **PSI Norms**, and **Norm Master** (AE): not built.
- **Fleet Master: Air Type Requests**: not built.
- Status chips of the prototype masters (Draft / Pending approval / Approved / Returned with Withdraw / Send for Approval in the list): our lists show Active / Inactive; the request states are on "My change requests" and the AM approvals screen.
- Notification bell with counts: not built.
- Expected Life KM seeds only the tyre sizes that exist in our Tyre Size master (8.25 X 16 and 9.00 X 20 appear only if present).
