# Unresolved Business Questions (updated in Stage 2.1)

No answer below has been assumed. Where a question is open the design keeps the behaviour **switched off or data-configurable** (`approval_routes.approver_role = NULL`, a disabled `role_capabilities` row, or a series flagged `is_confirmed = false`), so your answer needs only data, not redesign. "Suggested" is my recommendation, offered so you can reply with only "UQ-nn: agree".

## 0. Summary

| Group | Count | Meaning |
|---|---|---|
| **A. Resolved by your decisions** | 10 | closed (some leave minor follow-ups, listed in the group they belong to) |
| **B. Blockers for Stage 3** | **0** | none left: you approved Stage 2/2.1 and answered UQ-12 and UQ-30 (two practical confirmations remain, see section B) |
| **C. Blockers for later stages** | **35** | each names the first stage that needs it; Stage 3 can proceed without them |
| **D. Optional future enhancements** | **4 questions** + 6 further ideas | do not block anything |
| Total questions (UQ-01 … UQ-49) | 49 | 39 still open |

---

## A. Resolved (10)

| ID | Question | Your decision | Residual |
|---|---|---|---|
| UQ-08 | Allocation Requests form and flow | Superseded: the prototype runtime defines it (tyre-by-tyre allocation from Central Store arrivals; HO → AM; depot GRN). See `stage2.1-central-store-tyre-creation.md` | detail rules → UQ-37 |
| UQ-10 | Who creates individual tyre records | **Central Store receipt creates every tyre**; HO may request corrections via HO → AM; original and history preserved | operator UQ-33; number format UQ-34; whitelist UQ-38 |
| UQ-11 | Who provisions logins | **Separate project-administrator script**, not an ERP role | execution arrangement is in UQ-12 |
| UQ-12 | Employee-ID login and the feasibility test | Mapping design approved. **Decision: you run the one-account test locally with my guidance**; keys stay on your machine, never in chat | **Test passed (1 Nov 2026): email domain `mtc-erp-demo.invalid`**; details in `stage2.1-employee-login-design.md` §8.3 |
| UQ-30 | Version control | **Decision: you set it up yourself** (no new repository or overwrite authorised for me) | I continue only after you confirm it is done |
| UQ-13 | Depot codes | **Keep the proposed codes, labelled MOCK, configurable, separate from names**; all 33 retained | official codes whenever available; hubs UQ-46 |
| UQ-14 | Withdraw pending master change | **HO withdraws own pending change with mandatory remarks; administrator override; never after approval/rejection** | draft discard UQ-49 |
| UQ-19 | Document numbering | **Follow prototype patterns; per type and depot; DB-generated** | unresolved formats UQ-35, 36, 40–44 |
| UQ-20 | Demo period | **September 2026, adjustable demo date, not the system clock** | who changes it UQ-47 |
| UQ-32 | Demo employees | **Fictional names, prototype IDs retained** | none |

---

## B. Blockers for Stage 3 (0 questions)

UQ-12 and UQ-30 are answered (section A). Two **practical confirmations** are still needed from you before the first Stage 3 step, but they are not open design questions:

1. **Git is set up** (you chose to do it yourself): tell me when the folder is a repository with a `.gitignore` that excludes `.env*`, `MTC_Tyre_Master.xlsx` and `*.zip`, so I never write keys or the spreadsheet into history.
2. **Ready for the login test:** you have the Supabase **publishable (anon) key** for the front end, and the **service-role key stays only on your machine** for the admin script (never pasted in chat). I will then give you the exact test steps.

---

## C. Blockers for later stages (35)

### C1. Needed before Stage 4 — masters and master approval (11)

| ID | Question | Options | Suggested |
|---|---|---|---|
| UQ-07 | **Fleet air-type conversion**: keep the two-stage route (Tyre IC / Supervisor → HO review → AM final)? Does the HO step count as a master change now that all HO changes need AM? | Keep as operational two-stage · collapse to Tyre IC → AM · treat as HO master change | Keep two stages, operational |
| UQ-09 | **Reason suggestions from depots**: confirm *depot → HO accepts → AM approves the Reason Master change*; HO rejection needs remarks only | As stated · HO adds directly (contradicts your rule) | As stated |
| UQ-15 | **Deactivating a master that is in use** (a folio with stock, a fleet with open jobs, a depot with staff): block, warn, or allow? | Block · allow and hide from new pick-lists · allow with a warning to AM | Allow, hide from new pick-lists, show a dependency count to AM |
| UQ-16 | **Bulk approval** of several master requests (each recorded individually)? | Yes · one at a time | Yes |
| UQ-17 | **Depot-level records**: (a) who maintains Minimum/Maximum stock per depot (no screen in prototype)? (b) Outsource Employees are added/removed by the Tyre IC without approval in the prototype — keep? | (a) HO master with AM approval · Tyre IC (b) direct · with approval | (a) HO master with approval; (b) direct with reason on removal |
| UQ-26 | **Shift names**: AM = Morning and PM = Evening? | Yes, one code with two labels | Yes |
| UQ-27 | **Job codes**: JOB-007 is missing; is a job unique by code or by (name, fleet type)? | Reserve JOB-007; unique by code | Reserve, unique by code |
| UQ-28 | **Vendor Master scope**: global and HO-managed? Is a purchase-order record needed, or do Purchase Indents stop at Central Store? Which vendor links to show (tyres, receipts, retread batches, DRN, claims, contractor)? | Global; no PO module; links as in schema §4.1 | As suggested |
| UQ-37 | **Allocation rules** (from the prototype): (a) must *all* unallocated tyres of a size be allocated in one request ("Total must equal N")? (b) Allocation types (New Tyre / Additional / Re-allocation / Emergency) fixed? (c) who picks the specific tyres — system by number order, or HO? (d) approved allocation goes straight to a depot GRN as shown, or does Central Store issue a CS GIN and gate pass first? | (a) keep · relax; (d) as prototype · add dispatch step | Keep the prototype behaviour for (a)–(d), confirm |
| UQ-38 | **Tyre correction whitelist**: which fields may HO correct (`makers_no`, `tyre_no`, folio of same size, purchase/manufactured/warranty dates, vendor) and which never (receipt rate/date, location, grade, owner, km)? Is correcting the MTC No itself allowed? | As in `stage2.1-central-store-tyre-creation.md` §6 | As listed; MTC No correction allowed with alias |
| UQ-49 | **Discarding a DRAFT master request**: your workflow withdraws from PENDING only. A draft that is never submitted needs a way to be abandoned. Allow `DRAFT → WITHDRAWN` (remarks) as a small extension? | Allow · leave drafts open indefinitely | Allow with remarks |

### C2. Needed before Stage 5a — Tyre IC maintenance (4)

| ID | Question | Suggested |
|---|---|---|
| UQ-06 | **Supervisor in the Job Card Register**: your text says Supervisors *monitor*; the prototype shows the same buttons as the Tyre IC (New Job Card, Assign, Replace, Reschedule, On-behalf, Hold reason, Final inspection). Which may the Supervisor do? Does the Supervisor also verify? You decided the **Tyre IC verifies**. | Monitor only; verification by Tyre IC only |
| UQ-23 | **Tablet**: treat as a responsive breakpoint of the Tyre IC layout (not a separate fixed canvas)? | Yes |
| UQ-29 | **Aadhaar** (mandatory in the prototype's Outsource Employee form): store only a masked last-4 (fictional in the demo), or drop the field? | Last 4 only |
| UQ-41 | **Number scope for items with no depot code**: `JC-NNNN`, `JID-NNNN`, `CMPID-NNNN`, `SCHID-NNNN`, `SKR-NNN`, `SCR-NNN` — one counter for the whole organisation, or per depot (then depot would have to appear in the number to stay unique)? | One organisation-wide counter, as the format implies |

### C3. Needed before Stage 5b — Tyre IC depot store, Central Store, reports (16)

| ID | Question | Suggested |
|---|---|---|
| UQ-01 | **DRN**: who approves Pending → Approved / Rejected? | Supervisor |
| UQ-02 | **Tyre Damage Report**: who approves? Who raises the request? | AM (Technical) |
| UQ-05 | **Premature Failure Report**: the prototype has a "Pending TRS IC" step and a request list whose *Requested By* reads "Tyre Man". Is the TRS IC a person without login, one of the five roles, or out of scope? | No sixth role: the Tyre IC records the TRS step |
| UQ-22 | **Dead links and empty screens**: Tyre IC In Service / At TRS / At MIC / At Other Depots / In Transit Stock / Duty Roster; Tyre Man GRN, MRN, SRN | Tyre Register filtered views; Duty Roster = read view of posting; Tyre Man tabs = depot document lists labelled placeholder |
| UQ-25 | **Loss amount** for premature failure: *tyre price × remaining km ÷ norm km*? | Confirm |
| UQ-31 | **Reference lists not visible in the prototype**: removal reasons, "Fault On" values, damage types, Tyre Damage Report form fields | Provide lists; placeholders flagged |
| **UQ-33** | **Who operates Central Store goods receipt?** None of the five roles is Central Store staff. Who posts a receipt: HO (Tech), a capability granted to an existing role, or not in the application at all (loaded by the administrator script only)? | Not in the application for now; seeded by the administrator; capability `central_receipt.post` unassigned |
| **UQ-34** | **MTC Tyre No**: confirm format (2-letter prefix + 4-digit serial), the full list of series prefixes (observed `SS`, `RT`, `RM`, `QS`, `RS`, `UN`, `EX`, `LM`), whether the system may *generate* numbers or only validate numbers read from the tyre, and Manufacturer No uniqueness (per make) | Validate supplied numbers against configured series; no generation until a rule is given |
| **UQ-35** | **Central Store receipt document**: name and number format (not in the prototype) | Supply the format; until then an internal working number |
| **UQ-36** | **ICRN**: what does it stand for, who issues it, and is it the depot's receipt document for Central Store goods (it appears in ledgers as "Received from Central Store")? Two formats exist (`ICRN2601000000`, `ICRN-MN-2026-0230`). How does it relate to GRN? | Explain; treat ICRN-MN-YYYY-NNNN as the ledger reference until told |
| UQ-39 | **Tools & Equipment register** (found in Live Tyre Stock popups: `TL-`/`EQ-`, location, quantity, working/down, last service, used-for): in scope? who maintains it? which screen? | In scope, Tyre IC maintains directly, own screen |
| UQ-40 | **WSR number**: three variants exist (`WSR-MN-2609-0130`, `WSR-2609-0116`, `WSR-2609-006`). Which is canonical? | `WSR-{DEP}-{YYMM}-{NNNN}` |
| UQ-42 | **Counter reset** for each series: yearly where the number has a year, monthly where `YYMM`, and **continuous** where neither (GRN, Gate Pass, MRN, DRN, AR)? | As inferred |
| UQ-43 | **TRS GIN** `TRS-GIN-YYMM-NN` has no unit code but there are two TRS units: one shared series or one per TRS unit? | One series per TRS unit with its code in the number |
| UQ-44 | **Numbers not in the prototype**: Scrap Return Note, Retread batch, Damage *report*, master IDs for requests that are rejected (keep the id or release it), `EMP-NNNN` meaning | Internal working numbers; confirm formats |
| UQ-45 | **Accessories** (tube, flap, disc): must they also originate from Central Store receipts? | Yes, same mechanism, later |

### C4. Needed before Stage 6 — Tyre Man (3)

| ID | Question | Suggested |
|---|---|---|
| UQ-03 | **Shift change and leave** requests: who approves? | Supervisor |
| UQ-04 | **Prepone / Postpone**: who decides? | Tyre IC |
| UQ-24 | Keep the **Tamil/English toggle**, **QR scanning** (with manual fallback) and photo limit (≤ 5 MB) for the Tyre Man app? | Keep all three |

### C5. Needed before Stage 7 — dashboards (1)

| ID | Question | Suggested |
|---|---|---|
| UQ-21 | **Dashboards** for HO (consolidated), AM (approvals + oversight) and Supervisor (depot monitor) do not exist in the prototype. Confirm contents: HO — depot-wise maintenance pending, stock summary, my change requests by status; AM — pending master and operational approvals, recent decisions; Supervisor — approval queue, job status summary | As listed |

---

## D. Optional future enhancements (do not block anything)

### D1. Questions

| ID | Idea / question | Default |
|---|---|---|
| UQ-18 | Let a Supervisor or Tyre IC cover **more than one depot** (extra rows in `user_depot_access`) | No; table kept, empty |
| UQ-46 | Adopt the prototype's **depot "hub" grouping** (28 depots under 5 hub depots: Tondiarpet-I, Vyasarpadi, Poonamallee, Central-I, Perumbakkam) as an optional depot attribute and allocation grouping. Two hub names map to depot names by inference (Tondiarpet-I ↔ Tondiarpet-1, Central-I ↔ Central Depot) | Store as optional `hub_org_unit_id`; fill after confirmation |
| UQ-47 | **Demo date control**: is the "demo administrator" the project administrator (script/command), or should HO see an in-app control? | Project administrator only |
| UQ-48 | **Force a password change at first login** for demo accounts | Off |

### D2. Further ideas (not blocking, no decision requested now)
1. MFA for HO and AM accounts.
2. Optional CSV bulk import of masters (always lands as change requests).
3. Custom access-token hook adding role/depot claims.
4. Edge Function login as a fallback if no synthetic email domain works (would return for approval).
5. Photo thumbnails and cleanup of orphan photos.
6. Mock fleet numbers and registrations in the prototype's depot-prefixed style for the other depots.

---

## E. Stage 1 questions — final status

| Stage 1 | Topic | Status |
|---|---|---|
| Q1 | Roles / Supervisor | Resolved (Stage 2) |
| Q2 | Build order | Open, low impact: stage order in `implementation-plan.md` |
| Q3 | Which masters need approval | Resolved (all) |
| Q4 | Status words | Resolved for masters; operational flows keep prototype wording |
| Q5 | Final inspection | Tyre IC verifies; Supervisor part → UQ-06 |
| Q6 | Tablet | → UQ-23 |
| Q7 | Depots to seed | Resolved (33, Mandaveli full) |
| Q8 | Dead links | → UQ-22 |
| Q9 | Dashboards | → UQ-21 |
| Q10 | Sensitive data | Resolved; last-4 → UQ-29 |
| Q11 | Numbering | Resolved (UQ-19) |
| Q12 | Demo date | Resolved (UQ-20) |
| Q13 | Tamil | → UQ-24 |
| Q14 | Photos / QR | → UQ-24 |
| Q15 | Git | → UQ-30 |
