# Tyre Man app: match with the D1 prototype (tm pages)

Source: `MTC-Depot-Tyre D1.html` tm pages (per-user `--aja` / `--sil` variants ignored) and the FRS sheets Air Inflation, Inspection, Census, Tyre Rotation, Tyre Discout, Tyre Changing / Setting / Unsetting, GRN, MRN, SRN, WSR.
Built with migration `0060_tm_rounds_readings.sql` (test `supabase/tests/0060_tm_rounds_test.sql`). Not checked in a browser (no browser use in this task).

| Prototype page | Our screen | State |
|---|---|---|
| my-jobs | `/tm` My Jobs: rounds (Air, Nitrogen, Inspection, Rotation, Discout, Census) as one entry each, Tyre Changing / Setting / Unsetting cards, inspections, other Job IDs; status chips All / Not started / In progress / On hold / Rework / Done; Request Material (WSR); bell | Built. Scan fleet QR / Scan tyre and Request Prepone / Postpone are not built (no scanner, no request table). |
| round-AIR, round-AIRN, round-INSP, round-CENSUS, round-ROT, round-DO | `/tm/round/:jobCode` (`/tm/month/:jobCode` for Rotation and Discout): round name, date and shift, air type, PSI norms link, "n of N done", fleet rows with Done / n/6 / Not started / Rework / On hold | Built |
| fleet-AIR, fleet-AIRN | `/tm/fleet/:cardId`: Present (found) and Inflated to per tyre, target PSI from the HO norm, Low / High flag (below target - 15, above target + 10), warning button to raise a complaint, CIRT checklist (level surface and gauge = No stops the job), fleet remarks, Save progress, Save & next fleet, Hold job, Raise a complaint on this fleet | Built. Inline complaint-type list is a pop-up per tyre. Raise WSR on the fleet page is reached from My Jobs. |
| fleet-INSP | same screen: six tyres as a tap diagram (checked), complaint per tyre, "No issues - complete inspection" | Built (grid, not the bus drawing) |
| fleet-CENSUS | same screen: grooves, NSD readings joined by "-" (NSD = lowest), current NSD, wear pattern, Complete census (updates the tyre NSD and grooves) | Built. Tyre lock "being checked by someone else" and photo on complaint not built. |
| fleet-ROT, fleet-DO | same screen: due tyre and partner Job IDs, Odometer (km) required, Discout "Powder applied"; completing runs the existing FR / FL swap | Built |
| month-ROT, month-DO | `/tm/month/:jobCode`: schedule month, weeks, fleets with due date and Done / Overdue | Built |
| job-TC, job-ST, job-US | `/tm/work/:cardId`: steps in order (Removal, Unsetting, Setting, Fitment) with Job ID, assigned to, tyre, Removal / Fitment Orders, WSR lines and receive state, Receive GIN, Start, Complete (scrap review on the last step), Hold, Raise extra WSR | Built. "Set tyre not available" (switch to Want of Tyre) not built. |
| duty-shift | `/tm/duty` (step 5) | Done earlier |
| grn, mrn, srn, my-wsr | `/tm/grn`, `/tm/mrn`, `/tm/srn`, `/tm/wsr` (step 5) | Done earlier. "Raise extra WSR" opens My WSR without pre-filling the job card and Job ID (deferred). |
| notifications | `/tm/notifications`: job assigned, rework, final inspection failed, job on hold, tyre provided, WSR issued (from the audit trail and WSR GINs) | Built (derived, no unread count) |
| norms | `/tm/norms`: HO PSI norms by size and construction (Front / Rear, Regular / Nitrogen) and the tolerance note | Built. The norms table `psi_norms` is seeded with the four prototype sizes; the HO edit screen is not part of this task. |

Data: `job_readings` (one row per Job ID: present / inflated PSI, target PSI, flag, groove readings, grooves, NSD, wear pattern, checked, odometer, powder, remarks), `card_checklists`, `psi_norms`, view `v_tyre_psi_target`, and `job_ids.on_hold`. Functions: `reading_save`, `fleet_round_complete`, `job_hold`, `job_resume`.

Deferred: Tamil language switch, QR scanning, Prepone / Postpone request, photo on complaints, Census lock, rework banner details, pre-filled extra WSR.
