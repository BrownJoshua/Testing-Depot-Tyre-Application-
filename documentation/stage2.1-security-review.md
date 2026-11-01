# Stage 2.1 — Security and RLS Review

Review of `stage2-rls-security-design.md` against the Stage 2.1 decisions. This is a **design review by reading**; no policy has been executed or tested, because no SQL exists yet. Every finding becomes a Stage 3/4 test.

## 1. Result

| Measure | Result |
|---|---|
| Stage 2 tables reviewed one by one | 127 |
| Policy **unchanged** | 112 |
| Policy **amended** | 13 |
| Tables **removed** (merged MRN → GRN) | 2 |
| New tables with policies defined here | 11 |
| Findings | **21** (5 high, 10 medium, 6 low); none leaves a hole once the fix is built |
| Four named controls (approval, withdrawal, document numbering, Central Store tyre creation) | all implemented as **database-side functions with no direct write path** — verified by design in §4 |

The two approval systems remain independent: master data is HO → AM only; operational approvals follow `approval_routes` with Supervisor kept as a separate approver.

---

## 2. Findings

| ID | Sev | Finding | Affected | Fix (design) |
|---|---|---|---|---|
| **S-01** | High | In PostgreSQL, a view runs with its owner's rights unless told otherwise, so any `v_*` view (queues, summaries, registers) would **bypass RLS** | all `v_*` views | Create every view `WITH (security_invoker = true)`; test that each view returns different rows for different roles |
| **S-02** | High | A deactivated user may still hold a valid token. Policies that test `auth.uid()` directly (notifications, profiles) would still match their own rows | all tables | Add one **RESTRICTIVE** policy per table: `using (app.is_active_user())`; restrictive policies are AND-ed with every permissive one, so a locked employee sees nothing even from own-row policies; same check in Storage policies |
| **S-03** | High | Policies call helper functions that read `profiles`/`employees`. With `FORCE ROW LEVEL SECURITY` and a non-bypass owner the helpers could be blocked or recurse | helper functions | Define helpers `SECURITY DEFINER`, `STABLE`, `search_path = ''`, owned by the role that bypasses RLS on Supabase; **verify in the Stage 3 spike**; if `FORCE` blocks them, drop `FORCE` on `profiles`/`employees` only and add a test |
| **S-04** | High | Anything in `public` is callable through the API. A write function that forgets its own check is an open door; Postgres grants `EXECUTE` to everyone by default | all RPCs | `REVOKE EXECUTE ON ALL FUNCTIONS … FROM PUBLIC, anon`; grant per function; every function begins with role/depot/state checks; internal functions (`next_doc_no`, `post_tyre_movement`, `apply_*`) live in `app`, are **not exposed**, and are not granted to API roles |
| **S-05** | High | Supabase grants table privileges to `anon`/`authenticated` by default on new tables. A table created without RLS is public | every table | `ALTER DEFAULT PRIVILEGES … REVOKE ALL`; explicit grants only; **migration test** fails if any table in `public` lacks RLS or has `anon` privileges |
| **S-06** | Med | "Administrator" withdrawal must not be available to ERP users | `master_change_requests` | `admin_withdraw_master_request` executable by the **service role only**; remarks mandatory; written to `admin_action_log` |
| **S-07** | Med | `audit_logs` rows hold full old/new JSON, which can contain personal fields (employee phone, address). Supervisors and Tyre ICs would read them | `audit_logs` | HO and AM read the full table; depot roles read `v_audit_summary` (who, when, action, table, record id; **no JSON**) for their depot |
| **S-08** | Med | A role broadcast notification (`recipient_role`) could target Tyre Men and show one Tyre Man's content to the others | `notifications` | `CHECK (recipient_role <> 'TM')`; Tyre Man notifications are always addressed to one profile |
| **S-09** | Med | Tyres now live at Central Store before reaching a depot; a depot must not see tyres not yet allocated to it | `tyres`, `tyre_current_state`, `tyre_movements`, `allocation_*` | Tyres at `CENTRAL_STORE` readable by HO/AM (and `central_receipt` capability holders) only. A depot sees tyres in an allocation addressed to it **only after APPROVED**, matching the prototype (GRN row appears after approval) |
| **S-10** | Med | Master proposals are JSON. If an apply function builds SQL from payload keys, a crafted payload could alter other columns or tables | all `apply_*` functions | Fixed column whitelist per entity; typed casts; no dynamic SQL from payload keys; unknown keys rejected at submit and at approval; per-entity tests with hostile payloads |
| **S-11** | Med | Races: AM approves while HO withdraws; two HO users allocate the same tyres; two receipts claim a number | approval, allocation, receipt functions | `SELECT … FOR UPDATE` on the request/receipt/tyres first, then check state; the loser gets a clear error; concurrency tests (§4) |
| **S-12** | Med | Tyre Man execution tables: a row policy cannot tell *which column* changed or whether the status transition is legal | `job_task_execution`, readings tables | Column privileges exclude status/assignment columns; transitions only through functions; policy limits rows to the user's own task and to states IN_PROGRESS/REWORK |
| **S-13** | Med | Photos: Storage rules depend on a path convention and an `attachments` row that may be written after the upload | storage, `attachments` | Policy derives the permitted folder from the task assignment (not from the row); orphan sweep; MIME/size limits |
| **S-14** | Med | Administrator script holds the service-role key | provisioning | Controls in `stage2.1-employee-login-design.md` §9: never in the repo/React/Netlify, wrong-project guard, dry-run default, audit log, secret scanning, rotate if exposed |
| **S-15** | Med | JWT `user_metadata` is editable by the signed-in user | auth | Never used for authorisation; role/depot read from `employees` |
| **S-16** | Low | Realtime may publish rows that policies protect only partly; broadcast channels are not row-filtered | Realtime | Publish only `job_tasks`, `notifications`, `master_change_requests`; never `employees`, `audit_logs`, `profiles`; use per-user channels |
| **S-17** | Low | The demo date is a setting; a user able to write it could distort overdue logic | `application_settings` | Writable only by service role through `admin_set_demo_date`; readable by all via `app.business_today()` |
| **S-18** | Low | Login enumeration by differing messages | login | Generic message for every failure; sign-ups disabled |
| **S-19** | Low | Role changes should not wait for token expiry | auth | Roles are looked up in the database on every request |
| **S-20** | Low | Self-approval through two accounts for one person | approvals | One employee = one role = one account; `maker_id <> checker_id`; AM cannot decide a change about their own employee record |
| **S-21** | Low | CSV import (optional) could bypass approval | `import_batches` | Imports land in staging and become **change requests**, never direct master writes |

---

## 3. Table-by-table review

Policy classes are those of the Stage 2 RLS document (G1–G3 global read, D1–D3 depot, T1 task-assigned, C1 child, A1 append-only, M1 approval engine, S1 self, N1 notifications, X1 admin). "Gate" = the new restrictive active-user policy (S-02), now applied to **every** table below.

### 3.1 Amended (13)
| Table | Stage 2 policy | Stage 2.1 amendment | Finding |
|---|---|---|---|
| `audit_logs` | A1/X1 | depot roles via `v_audit_summary` only; full JSON HO/AM | S-07 |
| `notifications` | N1 | `recipient_role <> 'TM'` check | S-08 |
| `tyres` | D3 | Central Store tyres HO/AM only; depots see allocated tyres after APPROVED; no INSERT policy at all (created only by receipt posting) | S-09, UQ-10 |
| `tyre_current_state` | D3 | same visibility; location `CENTRAL_STORE` handled | S-09 |
| `tyre_movements` | A1 | same visibility; append-only trigger retained | S-09 |
| `allocation_requests` | D2 | HO creates/withdraws; AM approves/returns; destination depots see only APPROVED requests addressed to them | S-09, S-11 |
| `allocation_request_lines` | D2 | follows parent | S-09 |
| `grns` | D2 | now includes `grn_kind` (GRN/MRN) and allocation receipts | R1 |
| `grn_lines` | C1 | includes MRN lines and allocation tyre links | R1 |
| `master_change_requests` | M1 | terminal-state and payload-immutability triggers; `withdrawn_via`; employee-subject rule | S-06, S-10 |
| `master_change_request_history` | A1/M1 | withdrawal rows require remarks | UQ-14 |
| `application_settings` | X1 | `demo_mode`, `demo_today` readable via function, writable only by service role | S-17 |
| `profiles` | S1 | adds `must_change_password`; still no role/depot columns | UQ-12 |

### 3.2 Unchanged (112), reviewed and confirmed
Each of these keeps its Stage 2 class and gains only the Gate.

- **Identity/organisation:** `roles`, `role_capabilities`, `org_units`, `employees`, `user_depot_access`, `skills`, `employee_skills`, `outsource_employees`, `outsource_employee_skills`
- **Reference/master (G1/G2/G3):** `ref_values`, `tyre_sizes`, `tyre_makes`, `tyre_models`, `tyre_folios`, `tyre_folio_locations`, `tyre_detail_columns`, `vendors`, `vendor_contacts`, `fleet_types`, `fleet_type_tyre_sizes`, `routes`, `fleets`, `fleet_depot_history`, `folio_stock_params`, `maintenance_jobs`, `maintenance_job_skills`, `maintenance_schedules`, `schedule_categories`, `schedule_group_rules`, `schedule_checkpoints`, `schedule_checklist_items`, `schedule_job_map`, `psi_norms`, `rotation_discout_norms`, `norm_eligible_grades`, `expected_life_km`, `shifts`, `complaint_types`, `complaint_type_jobs`, `reasons`, `reason_usages`, `reason_suggestions`, `reject_reasons`, `wear_patterns`, `qc_checklists`, `qc_checklist_items`
- **Approval engine/history:** `master_entity_registry`, `approval_routes`, `document_status_history`
- **Tyre inventory:** `tyre_fitment_history`, `tyre_retread_stages`, `tyre_repairs`, `tyre_route_usage`, `accessory_items`, `stock_ledger`, `retread_batches`, `retread_batch_tyres`
- **Fleet operations:** `fleet_operational_state`, `fleet_status_history`, `odometer_readings`, `fleet_air_type_requests`, `fleet_air_type_request_fleets`, `fleet_air_type_changes`
- **Scheduling/jobs:** `fleet_groups`, `fleet_group_revisions`, `fleet_group_revision_members`, `schedule_instances`, `complaints`, `log_sheet_complaints`, `job_cards`, `job_tasks`, `job_assignments`, `job_holds`, `job_task_execution`, `air_inflation_readings`, `inspection_results`, `census_readings`, `rotation_moves`, `cirt_checklist_answers`, `final_inspections`, `final_inspection_answers`, `removal_orders`, `fitment_orders`, `reschedule_requests`
- **Workforce:** `duty_rosters`, `duty_roster_entries`, `shift_change_requests`, `leave_requests`, `skill_requests`, `skill_request_items`, `attendance_records`
- **Store:** `indents`, `indent_lines`, `gins`, `gin_lines`, `gate_passes`, `scrap_return_notes`, `scrap_return_lines`, `wsrs`, `wsr_lines`, `drns`, `drn_lines`, `purchase_indents`, `purchase_indent_lines`
- **Reports/system:** `premature_failure_requests`, `premature_failure_reports`, `tyre_damage_requests`, `tyre_damage_reports`, `notification_reads`, `attachments`, `document_sequences`, `import_batches`

Specific confirmations worth noting:
- `employees`: staff roles see colleagues; Tyre Man sees names only via `v_staff_directory`; phone and address visible to HO/AM and the same depot's Supervisor/Tyre IC only.
- `job_tasks`: Tyre Man row filter `assigned_employee_id = app.current_employee_id()`; no other Tyre Man's job is selectable even by guessing an id.
- `indents`/`gins`: visible to the owner depot and the addressed unit only after the relevant status.
- `document_sequences`: no client access of any kind.

### 3.3 Removed (2)
`mrns`, `mrn_lines` (merged into `grns`, `grn_lines`; their policies are the GRN policies).

### 3.4 New tables and their policies (11)
| Table | Class | SELECT | Write |
|---|---|---|---|
| `depots` | G1 | all active users (names are not sensitive) | apply function (master workflow) only |
| `central_store_receipts` | D1 (Central Store) | HO, AM, holders of capability `central_receipt.post` | functions only (`central_receipt_*`) |
| `central_store_receipt_lots` | C1 | as parent | functions only |
| `tyre_number_series` | G2 | HO, AM, capability holders; staff roles read active series | apply function (master workflow) |
| `allocation_request_tyres` | D2 | HO, AM; destination depot's Supervisor/Tyre IC once APPROVED | functions only |
| `tyre_ownership_history` | A1 | as `tyres` | function only |
| `tyre_identity_corrections` | A1 | HO, AM (and an alias view for searching old numbers) | apply function only |
| `depot_tools_equipment` | D3 | HO, AM; Supervisor/Tyre IC own depot | Tyre IC own depot if `tools.manage` is granted (UQ-39) |
| `fleet_route_assignments` | A1 | as `fleets` | function only |
| `document_number_series` | X1 | none (labels via a view limited to series name) | administrator only |
| `admin_action_log` | X1 | none from the application | service role only, insert-only |

---

## 4. Verification that the key controls are database-side

For each control: the **only** write path, what the function checks, what stops a direct write, how races are handled, and the test that proves it. Status is "designed"; proof comes with the SQL tests.

### 4.1 Approval (master data and operational)
| Item | Master data | Operational |
|---|---|---|
| Only write path | `master_request_*` functions | `op_transition` and typed wrappers |
| Authority | role `AM` for approve/reject; role `HO` for create/submit/withdraw; `maker ≠ checker`; AM cannot decide a change about their own employee | `approval_routes` row for (workflow, status, action) names the allowed role; scope SAME_DEPOT/ALL; unresolved route ⇒ refuse |
| Remarks | reject/withdraw: non-blank | revert/return/reject/cancel/withdraw/remove: non-blank |
| Direct write blocked by | no INSERT/UPDATE/DELETE policy on any master or on `master_change_requests`; no column privilege on `status` | status columns not updatable by API roles |
| Race handling | row lock on request; first decision wins | row lock on document |
| Independence | uses `master_change_requests` only | uses document tables and `approval_routes` only; the two share only audit and notifications |
| Test | for all 27 entity types: direct write fails; HO approve fails; AM create fails; pending leaves live row unchanged | per workflow: wrong role fails, wrong depot fails, missing remarks fails, illegal transition fails |

### 4.2 Withdrawal of pending master changes
| Rule (your decision) | Enforcement |
|---|---|
| Only the original submitting HO user, or an authorised administrator | function checks `auth.uid() = maker_id` **and** role still HO; separate service-role-only `admin_withdraw_master_request` |
| Mandatory remarks | check in function and `CHECK` on the history row |
| Only from `PENDING_APPROVAL` | function checks status; terminal-state trigger blocks any change out of `APPROVED`, `REJECTED`, `WITHDRAWN` |
| Not after approval or rejection | same trigger; lock-then-check ordering resolves approve/withdraw races |
| Recorded in approval history | history row (action `WITHDRAW`, actor, role, `via` MAKER/ADMIN, remarks) in the same transaction; `audit_logs` entry |
| Live data untouched; payload preserved | withdrawal updates only status fields; `proposed_payload` immutable by trigger once submitted |
| Test | withdraw by another HO fails; by AM fails; empty remarks fails; after approve fails; concurrent approve/withdraw: exactly one wins; live row version unchanged |

### 4.3 Document numbering
Only write path: `BEFORE INSERT` trigger calling `app.next_doc_no` (not exposed). Counters locked by `INSERT … ON CONFLICT DO UPDATE`; unique constraint on the number; supplied values overwritten/rejected; series config writable by administrator only. Tests: 2,000 concurrent inserts without duplicates, separate depot and type counters, rollback gaplessness, period rollover (`stage2.1-document-numbering.md` §2.4).

### 4.4 Central Store tyre creation
Only write path into `tyres`: `central_receipt_post` (and, for demo data, the same function called by the seed script). No INSERT/UPDATE/DELETE policy on `tyres`, `tyre_current_state`, `tyre_movements`, `tyre_ownership_history`; origin foreign key `NOT NULL`; uniqueness on `tyre_no` and `(make, makers_no)`; reservation by row locks; corrections only via workflow A with a field whitelist. Tests listed in `stage2.1-central-store-tyre-creation.md` §9.

### 4.5 Other controls re-checked
| Control | Result |
|---|---|
| Users cannot change own role/depot | `employees`/`profiles` have no user write path; role/depot changes go through master workflow; AM cannot decide about self |
| Tyre Man sees only own jobs | row filter + column grants (S-12) |
| Tyre IC cannot reach other depots | `visible_depot_ids()` with composite depot consistency checks |
| Service-role key never in React | build check + bundle grep (Stage 9) + admin-script rules |
| Demo date | `app.business_today()`; `admin_set_demo_date` service-role only (S-17) |
| Account administration | outside the application, logged in `admin_action_log` |

## 5. Residual risks
1. Supabase-specific behaviours (default grants, role ownership, view invoker settings) are checked in the **Stage 3 spike** before policies are written in bulk.
2. Policy count is large; the generated role × table × operation test matrix is therefore a Stage 3 deliverable, not an afterthought.
3. Unresolved approvers (DRN, damage report, shift/leave, prepone, premature-failure TRS step) are disabled by data, not left permissive.
4. RLS protects data access; it does not stop a legitimate user entering wrong values. Business validation is in functions and constraints, not in policies.
