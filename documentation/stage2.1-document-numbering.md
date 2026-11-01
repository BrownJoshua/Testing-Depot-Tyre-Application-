# Stage 2.1 — Document Numbering

Implements your decision on UQ-19: **follow the prototype's patterns; separate counters by document type and depot; no duplicates; safe under concurrency; generated in the database; never by frontend JavaScript alone; anything not in the prototype is flagged as unresolved, not invented.**

---

## 1. How the patterns were found
I scanned every page, popup and script of the prototype for identifier-shaped tokens and grouped them by shape (digits → `N`). About 90 shapes occurred ≥3 times. Each was traced to the screen where it appears to learn what it numbers. The table in §3 is the result. **Format evidence is firm; scope and reset rules are mostly *inferred from the format* and flagged as such**, because the prototype has no number-generation logic beyond a few demo counters.

Depot code in numbers: `MN` Mandaveli, `AD` Adyar, `TB` Tambaram, `CS` Central Store, `MIC` MIC Vehicle Unit appear in the prototype. The other 30 depot codes are **MOCK CODES** (see `stage2-depot-master.md`); they are used in numbers exactly like real codes and are configurable.

## 2. Design

### 2.1 Tables
| Table | Purpose |
|---|---|
| `document_number_series` (system configuration) | One row per series: `series_code` (PK, e.g. `GIN`), `label`, `template`, `scope`, `reset_policy`, `seq_width`, `start_value`, `is_active`, `is_confirmed` (format seen in the prototype), `evidence_note`, `question_ref` |
| `document_sequences` (counters) | `series_code`, `scope_key`, `period_key`, `last_value`; **primary key (series_code, scope_key, period_key)** |

`scope`: `PER_UNIT` (counter per `org_unit_id`), `GLOBAL` (one counter).
`reset_policy`: `NEVER`, `YEARLY`, `MONTHLY`, `DAILY`.
`template` tokens: `{DEP}` (org-unit code), `{YYYY}`, `{YY}`, `{MM}`, `{DD}`, `{SEQ}` (zero-padded to `seq_width`). Example: `GIN-{DEP}-{YYYY}-{SEQ}` with width 4.

`scope_key` = the org unit's **id** (not its code), so changing a depot's mock code later never restarts or collides a counter.
`period_key` = `'ALL'`, `'2026'`, `'2609'` or `'260920'` depending on the reset policy.

### 2.2 Generation function
```sql
-- draft, illustrative: private function in schema app
create function app.next_doc_no(p_series text, p_org_unit uuid, p_date date)
returns text language plpgsql security definer set search_path = '' as $$
declare s record; v_scope text; v_period text; v_n int;
begin
  select * into s from public.document_number_series
   where series_code = p_series and is_active;
  if not found then raise exception 'unknown or inactive series %', p_series; end if;
  v_scope  := case s.scope when 'GLOBAL' then '*' else p_org_unit::text end;
  v_period := case s.reset_policy when 'NEVER' then 'ALL'
              when 'YEARLY'  then to_char(p_date,'YYYY')
              when 'MONTHLY' then to_char(p_date,'YYMM')
              when 'DAILY'   then to_char(p_date,'YYMMDD') end;
  insert into public.document_sequences(series_code, scope_key, period_key, last_value)
       values (p_series, v_scope, v_period, s.start_value)
  on conflict (series_code, scope_key, period_key)
       do update set last_value = public.document_sequences.last_value + 1
  returning last_value into v_n;                      -- row lock held until commit
  return app.render_template(s.template, p_org_unit, p_date, v_n, s.seq_width);
end $$;
```
- The `INSERT … ON CONFLICT DO UPDATE … RETURNING` takes a **row lock** on the counter, so two concurrent sessions can never read the same value; the second waits for the first to commit.
- The increment is part of the caller's transaction: if the document insert fails and rolls back, **the counter rolls back too, so numbers are gapless**. (Trade-off: concurrent creations in the same series/depot/period queue behind each other for the length of their transactions — acceptable at depot scale.)
- `EXECUTE` on `app.next_doc_no` is **not granted to API roles** and the function is not in an exposed schema, so a browser cannot call it or choose a number.

### 2.3 Where it is called
A `BEFORE INSERT` trigger on every numbered table:
```sql
-- draft: trigger function
new.doc_no := app.next_doc_no(TG_ARGV[0], new.org_unit_id, coalesce(new.document_date, app.business_today()));
```
- If a client tries to supply the number, the trigger **overwrites it** (or raises for non-admin writers); the number column has no client-writable path.
- Each numbered table has `UNIQUE (doc_no)` (or unique per series where a number is shared by several tables, such as GINs): a second line of defence against duplicates.
- The date used for year/month is the document's **business date** (demo-adjustable, see the demo-date design in the architecture review), not the wall-clock, so a September 2026 demo document is numbered `…2026…`/`…2609…` consistently.

### 2.4 Guarantees and tests
| Guarantee | Test |
|---|---|
| No duplicates under concurrency | 10 sessions × 200 inserts in one series/depot: exactly 2,000 distinct, consecutive numbers |
| Separate counters by type | interleaved GIN/WSR/Indent inserts do not influence each other |
| Separate counters by depot | MN and AD sequences advance independently |
| Period reset | insert across 31 Dec → 1 Jan (yearly) and 30 Sep → 1 Oct (monthly) restarts at the start value |
| Rollback is gapless | failed insert leaves counter unchanged |
| Client cannot choose | INSERT supplying a number: overwritten/rejected |
| Depot code change | numbers issued later use the new code; counters continue; old numbers unchanged |
| Configuration is not HO-editable | series config writable only by the administrator process |
| Frontend never generates | lint rule: no number-building code in React; screens display `doc_no` returned by the database |

## 3. Pattern catalogue

Legend — **Evidence**: C = pattern consistent across the prototype; V = variants exist (see notes); Scope/Reset **inferred** unless stated.
`{DEP}` = depot/unit code, `YYYY` year, `YYMM` e.g. 2609, `N…` zero-padded sequence.

### 3.1 Store and movement documents
| Series | Template (prototype) | Example(s) in prototype | Scope (inferred) | Reset (inferred) | Notes / questions |
|---|---|---|---|---|---|
| GIN | `GIN-{DEP}-{YYYY}-NNNN` | `GIN-MN-2026-0156`, `GIN-AD-2026-0199`, `GIN-TB-2026-0188` | per depot | yearly | C. WSR-issue GINs use the same pattern (`GIN-MN-2026-0163`) |
| GIN – Central Store | `GIN-CS-{YYYY}-NNNN` | `GIN-CS-2026-0412` | Central Store unit | yearly | C (unit code `CS` — **mock**) |
| GIN – TRS | `TRS-GIN-{YYMM}-NN` | `TRS-GIN-2609-01` | ? | monthly | **UNRESOLVED**: no unit code, yet there are two TRS units (UQ-43) |
| Indent | `IND-{DEP}-{YYYY}-NNNN` | `IND-MN-2026-0025`, `IND-AD-2026-0039`, `IND-TB-2026-0031`, `IND-MIC-2026-0007` | per requesting unit | yearly | C |
| GRN | `GRN-{DEP}-IN-NNNN` | `GRN-MN-IN-0041` | per receiving depot | none visible | C. No year in the pattern, so continuous (confirm, UQ-42) |
| ICRN | `ICRN-{DEP}-{YYYY}-NNNN` | `ICRN-MN-2026-0230` | per depot | yearly | **Meaning unknown**; a second style `ICRN2601000000` exists (UQ-36) |
| Gate Pass | `GP-{DEP}-NNNN` | `GP-MN-0072`, `GP-AD-0102` | per depot | none visible | C |
| MRN | `MRN-{DEP}-NNN` | `MRN-MN-004` | per depot | none visible | C. 3-digit |
| DRN | `DRN-{DEP}-NNN` | `DRN-MN-003` | per depot | none visible | C. 3-digit |
| Removal Order | `RO-{DEP}-{YYYY}-NNNN` | `RO-MN-2026-2902` | per depot | yearly | C |
| Fitment Order | `FO-{DEP}-{YYYY}-NNNN` | `FO-MN-2026-3012` | per depot | yearly | C |
| Scrap Return Note | — | — | — | — | **Not in prototype** (UQ-44) |
| Central Store Receipt | — | — | — | — | **Not in prototype** (UQ-35) |
| Retread batch | — | — | — | — | **Not in prototype** (UQ-44) |

### 3.2 Requests and work documents
| Series | Template | Example(s) | Scope | Reset | Notes / questions |
|---|---|---|---|---|---|
| WSR | **three variants:** `WSR-{DEP}-{YYMM}-NNNN`; `WSR-{YYMM}-NNNN`; `WSR-{YYMM}-NNN` | `WSR-MN-2609-0130`; `WSR-2609-0116`; `WSR-2609-006` | per depot, monthly | monthly | **V** — pick one canonical form (UQ-40). The depot-coded 4-digit form is used on the Tyre Man app and in GINs, so it is my working candidate |
| Job card | `JC-NNNN` (reactive/scheduled generic) | `JC-6063` | **no depot code** | none | **UNRESOLVED scope**: one national counter or per depot (UQ-41) |
| Job card – Setting | `JC-ST-{YYMM}-{DD}-NN` | `JC-ST-2609-20-01` | per day (and depot?) | daily | C |
| Job card – Unsetting | `JC-US-{YYMM}-{DD}-NN` | `JC-US-2609-20-01` | per day | daily | C |
| Job card – Census | `JC-CEN-{YYMM}-{DD}-NNN` | `JC-CEN-2609-20-001` | per day | daily | C |
| Job ID (task) | `JID-NNNN` | `JID-4021` | no depot code | none | UQ-41 |
| Complaint | `CMPID-NNNN` | `CMPID-0505` | no depot code | none | UQ-41 |
| Schedule instance | `SCHID-NNNN` | `SCHID-4001` | no depot code | none | planner "created" ids; UQ-41 |
| Skill request | `SKR-NNN` | `SKR-003` | no depot code | none | UQ-41 |
| Shift change request | `SCR-NNN` | `SCR-018` | ? | none | UQ-41 |
| Premature failure request | `RQ-{YYYY}-NNN` | `RQ-2026-003` | no depot code | yearly | C |
| Premature failure report | `PFR-{DEP}-{YYYY}-NNN` | `PFR-MN-2026-001` | per depot | yearly | C |
| Tyre damage request | `DR-{YYYY}-NNN` | `DR-2026-001` | no depot code | yearly | C. The damage **report** number is not shown (UQ-44) |
| Purchase Indent | `PI-HO-{YYYY}-NNN` | `PI-HO-2026-001` | HO | yearly | C (replaces the `PI-{YYYY}-NNNN` in the Stage 2 schema, which was wrong) |
| Allocation Request | `AR-NNN` | `AR-003` | global | none | C. No year or unit |
| Purchase Order (external) | `PO-{YYYY}-NNNN` | `PO-2026-1848` | external system | — | **Reference only**; not generated by this system |

### 3.3 Master and configuration identifiers
| Series | Template | Example | Notes |
|---|---|---|---|
| Tyre Folio | `F{NNNN}` | `F7001` | master id; HO-managed |
| Job code | `JOB-NNN` | `JOB-001` | JOB-007 missing (UQ-27) |
| Schedule code | `SCHNNN` | `SCH001` | |
| QC checklist | `QCM-NNN` | `QCM-001` | |
| Reason | `RSN-NNN` | `RSN-001` | |
| Reject reason | `DRR-NNN` | `DRR-001` | |
| Wear pattern | `WP-NNN` | `WP-001` | |
| Tyre Detailed Master column | `TDM-NNN` | `TDM-001` | |
| Tool / Equipment | `TL-NNN` / `EQ-NNN` | `TL-001`, `EQ-001` | Tools & Equipment register found in Stage 2.1 (UQ-39) |
| Outsource employee | `OSE-NNN` | `OSE-001` | |

Master identifiers are generated the same way (series per master) when HO creates a record; the number is reserved at draft time and **kept** if the request is rejected/withdrawn (the id belongs to the request, not the live record) — gaps in master ids are therefore possible and acceptable (to confirm, UQ-44).

### 3.4 People, fleet and tyre identifiers
| Item | Pattern | Examples | Handling |
|---|---|---|---|
| Tyre IC | `TIC-NNNN` (Mandaveli) or `{XX}-TIC-NN` (other depots) | `TIC-1147`, `AD-TIC-01` | **Retained** from the prototype as employee codes |
| Tyre Man | `TM-NNNN` (Mandaveli) or `{XX}-TM-NN` | `TM-3092`, `AD-TM-01` | Retained |
| HO / AE→AM / Supervisor | `HOT-NNNN`, `HOT-AE-NNN`, `SUP-NNNN` | `HOT-0114`, `HOT-AE-021`, `SUP-2231` | Retained; other Supervisor/HO/AM IDs generated in the same style |
| Gate-pass employee list | `EMP-NNNN` | `EMP-1024` | different series; meaning unclear (UQ-44) |
| Fleet | `J/K/Z NNNN` (Mandaveli); `{XX}-NNN` (others) | `J0264`, `AD-001` | master data, entered not generated |
| Registration | `TN-01-N-NNNN`, `TN-72-{XX}-NNNN` | `TN-01-N-0264` | master data |
| OEM spare | `OEM-SP-{FLEET}-NN` | `OEM-SP-J0264-01` | stock-item reference |
| **MTC Tyre No** | `{PP}NNNN`; observed prefixes `SS`, `RT`, `RM` in lots, also `QS`, `RS`, `UN`, `EX`, `LM`… | `SS0242`, `RT1005`, `RM3504` | **Series list and generation rule UNRESOLVED (UQ-34)**; design validates numbers against `tyre_number_series` rather than inventing a rule |
| Manufacturer No | `{maker prefix}NNNNNN` | `V3014000305` | supplied by the maker; unique per make |
| Tube / Flap / Disc | `TB-{SIZE}-NNN`, `FP-{RIM}-NNN`, `DS-{RIM}-NNN` | `TB-1020-013`, `FP-16-001`, `DS-225-048` | accessory numbers; generation rule not shown (UQ-45) |

> The employee-ID prefixes (`AD`, `TR`, `KA`, `PA`, `SM`, `TN`, `SP`, `KN`, `AB`, `CR`, `TA`, `CW`, …) are **not** the same as the mock depot codes (`AD`, `TV`, `KN`…). That is intentional: employee IDs are retained exactly as in the prototype; depot codes are mock and configurable; the two are separate fields.

### 3.5 System identifiers not in the prototype
| Identifier | Status |
|---|---|
| Master change request number | **Working internal reference only** (`MCR-{YYYY}-NNNNNN` used in the Stage 2 docs is a placeholder, not a business format; UQ-44) |
| Notification, attachment, audit, history rows | internal UUIDs, no human number |

## 4. Series seeded in Stage 3

- **Confirmed (seeded):** GIN, GIN-CS, IND, GRN, GP, MRN, DRN, RO, FO, PFR, RQ, DR, PI-HO, AR, JC-ST, JC-US, JC-CEN, folio/job/QC/reason/reject-reason/wear-pattern/tool identifiers.
- **Seeded provisionally, flagged `is_confirmed = false`:** WSR (candidate form), JC generic, JID, CMPID, SCHID, SKR, SCR, ICRN, TRS-GIN.
- **Not seeded until answered:** Central Store Receipt, retread batch, damage report, scrap return note, MTC Tyre No generation, accessory numbers.

The application refuses to create a document type whose series is missing or unconfirmed **except in demonstration mode**, where provisional series are allowed and clearly labelled.

## 5. What the frontend may and may not do
- May: display `doc_no`, search by it, copy it.
- May not: build, increment, predict or submit a document number. The INSERT payload has no `doc_no` field; any value is discarded by the trigger.
- May not use the device clock to decide the number's period; the database uses the document's business date.
