# Stage 2 — Depot Master and Organisational Units

> **Stage 2.1 update — all depot codes are MOCK CODES.** The 33 depot names are real (taken from the prototype and your list). The short codes in §2 are **mock codes used for demonstration**, not official MTC codes, and must never be presented as such. Three (`MN`, `AD`, `TB`) happen to match prefixes seen in prototype document numbers; the rest are my proposals, retained at your decision. Codes are **configurable** and kept **separate from depot names**. A depot's code can be changed through the master workflow (HO → AM); counters and history use the depot's id, so a code change never breaks numbering or relationships (see `stage2.1-document-numbering.md`). Depots are linked to employees, fleets, stock and every transaction by id, never by code or name.
## 1. Design

One table, `org_units`, holds every physical or organisational location that can own stock or issue/receive documents. A column `unit_type` separates them:

| `unit_type` | Meaning | Count |
|---|---|---|
| `DEPOT` | MTC bus depot — the **33 depots** | **33** |
| `TRS` | Tyre Retreading Shop (retreading unit) | 2 |
| `CENTRAL_STORE` | Central Store | 1 |
| `MIC_VEHICLE_UNIT` | MIC Vehicle Unit (holds tyres issued to MIC vehicles) | 1 |

- A view `v_depots` returns only `unit_type = 'DEPOT'` (always 33 rows). TRS units, Central Store and MIC are **not depots** and never appear in depot counts, depot pick-lists for staff assignment, or depot-wise maintenance reports.
- A single table keeps foreign keys simple: GIN, GRN, indent and gate-pass records have `from_org_unit_id` / `to_org_unit_id` that may be any unit, without polymorphic references.
- **Users and operational scope** are restricted to `DEPOT` units: `employees.org_unit_id` must reference a `DEPOT` (a check trigger enforces it), except HO and AM who have no depot.
- `org_units` is an HO-managed master: creating, renaming, changing the (mock) code, or deactivating a unit goes through the HO → AM approval workflow. **Codes are configurable** (unique, 2–3 uppercase characters) and `is_mock_code` is true for all of them until MTC supplies official codes.
- **Stage 2.1 subtype:** a table `depots` (primary key = `org_units.id`, only for rows with `unit_type = 'DEPOT'`) holds depot-only attributes (`is_mock_code`, optional `hub_org_unit_id`). Employees, fleets and every depot-owned document reference `depots`, so a TRS unit, Central Store or MIC can never be used as a depot. `v_depots` remains available.
- "Central Depot" (depot #20) and "Central Store" are different things and stay separate.

## 2. The 33 depots

Names are exactly those in your Stage 2 list (taken from the prototype). **Every code below is a MOCK CODE** (retained at your decision, UQ-13). "Evidence" in the table means the same letters appear in a prototype document number; it does **not** make the code official.

| # | Depot | Mock code | Letters seen in prototype numbers? | Seed tier |
|---|---|---|---|---|
| 1 | Adyar | AD | seen (`IND-AD-…`) | B |
| 2 | Thiruvanmiyur | TV | proposed | B |
| 3 | Mandaveli | MN | seen (`GIN-MN-…`) | **A — primary** |
| 4 | Kannagi Nagar | KN | proposed | C |
| 5 | Perumbakkam | PB | proposed | C |
| 6 | Semmencheri | SM | proposed | C |
| 7 | T. Nagar | TNR | proposed | C |
| 8 | Saidapet | SD | proposed | B |
| 9 | K.K. Nagar | KK | proposed | C |
| 10 | Adambakkam | ADK | proposed | C |
| 11 | Chrompet | CH | proposed | B |
| 12 | Tambaram | TB | seen (`IND-TB-…`) | B |
| 13 | Chrompet-II | CH2 | proposed | C |
| 14 | Kilambakkam | KB | proposed | C |
| 15 | Kundrathur | KD | proposed | C |
| 16 | Iyyappanthangal | IY | proposed | C |
| 17 | Vadapalani | VP | proposed | C |
| 18 | Poonamallee | PM | proposed | C |
| 19 | Koyambedu | KY | proposed | C |
| 20 | Central Depot | CD | proposed | C |
| 21 | Ayanavaram | AY | proposed | C |
| 22 | Perambur | PR | proposed | C |
| 23 | Basin Bridge | BB | proposed | C |
| 24 | Anna Nagar East | ANE | proposed | C |
| 25 | Anna Nagar | AN | proposed | B |
| 26 | Ambattur | AT | proposed | C |
| 27 | Avadi | AV | proposed | C |
| 28 | Vyasarpadi | VY | proposed | C |
| 29 | Tondiarpet-1 | TD1 | proposed | C |
| 30 | Tondiarpet-II | TD2 | proposed | C |
| 31 | Ennore | EN | proposed | C |
| 32 | Madhavaram | MD | proposed | C |
| 33 | Padiyanallur | PD | proposed | C |

Codes are unique, 2–3 characters, uppercase, and used in numbers such as `GIN-MN-2026-0163`.

## 3. Separate organisational units (not depots)

| Name | Code | `unit_type` | Evidence in prototype |
|---|---|---|---|
| TRS Chrompet | `TRS-CH` | `TRS` | "TRS Chrompet" in indent / DRN pick-lists |
| TRS Tondiarpet | `TRS-TD` | `TRS` | "TRS Tondiarpet" in indent / DRN pick-lists |
| Central Store | `CS` | `CENTRAL_STORE` | "Material CS", "Central Store", Purchase Indent |
| MIC Vehicle Unit | `MIC` | `MIC_VEHICLE_UNIT` | `IND-MIC-…`, "MIC Vehicle Unit", "At MIC" |

Tyre location phases "At TRS", "At MIC" and "In Transit" refer to these units or to the transit state between two units.

## 4. Columns of `org_units` (see schema for the full definition)

`id uuid PK`, `code text unique`, `name text unique`, `unit_type org_unit_type`, `short_name`, `address_text`, `sort_order`, `status master_status`, `row_version`, standard audit columns. `depots` adds `is_mock_code bool` and an optional `hub_org_unit_id` (see §9). No region/zone column.

## 5. Data rules

1. 33 `DEPOT` rows exist before any other seed data; every depot-scoped table references them.
2. Every depot has at least one Tyre IC and one Supervisor account in the demo data (full tiers below).
3. Deactivating a depot is a controlled soft-delete through the master workflow; historic records keep their depot.
4. Mock data is labelled as demonstration data; it does not represent actual MTC records (`application_settings.demo_data = true`, visible banner in non-production builds).

## 6. Demonstration tiers

| Tier | Depots | Population |
|---|---|---|
| **A — primary** | Mandaveli | Fully populated: 70 fleets, 535 tyres, one month of operations (see `stage2-mock-data-plan.md`) |
| **B — working sample** | Adyar, Thiruvanmiyur, Saidapet, Chrompet, Tambaram, Anna Nagar | ~20 fleets each, a working set of tyres, a smaller month of jobs, a few inter-depot transfers with Mandaveli |
| **C — baseline sample** | the remaining 26 depots | ~8 fleets each, opening tyre stock, a Tyre IC, a Supervisor and two Tyre Men, a handful of job cards so HO/AM depot-wise screens are non-empty |

TRS units, Central Store and MIC Vehicle Unit have stock and movement records sufficient to demonstrate dispatch, receipt and retreading.

## 7. How depots are used elsewhere

- `employees.org_unit_id` and RLS depot scope.
- `fleets.org_unit_id` (home depot), `tyres.owner_org_unit_id`, `tyre_current_state.location_org_unit_id`.
- `from_org_unit_id` / `to_org_unit_id` on indents, GIN, GRN, MRN, gate passes, retread batches.
- `folio_stock_params(org_unit_id, folio_id)` — min / max per depot.
- Document-number prefixes via `document_sequences(doc_type, org_unit_id, period)`.
- Maintenance Pending, dashboards and exports aggregate by depot.

## 8. Observed prototype employee-ID prefixes (not depot codes)

The prototype's Tyre Man Register gives every depot an **employee-ID prefix** (for example `AD-TM-01`, `TR-TIC-01`) and its fleet numbers use the same prefix (`AD-001`, `TR-001`). These are **separate from the mock depot codes** above (for example Thiruvanmiyur uses `TR` for employees but has mock code `TV`; Koyambedu `PM`; Madhavaram `MV`). Employee IDs are retained exactly as in the prototype (Stage 2.1 decision); document numbers use the mock depot code. The full table (depot → prefix → Tyre IC / Tyre Man headcount) is in `stage2.1-final-architecture-review.md` §5.1.

## 9. Depot hubs seen in the prototype (optional)

The HO "Allocate New Tyres" screen groups depots under five "hubs". The 33 depots are **28 allocation depots + the 5 hub depots themselves**. Names below are as printed in the prototype; the mapping of hub name to depot is inferred for two (Tondiarpet-I ↔ Tondiarpet-1, Central-I ↔ Central Depot).

| Hub (prototype label) | Member depots |
|---|---|
| Tondiarpet-I (EV) | Adyar, Ayanavaram, Vadapalani, Ambattur, Madhavaram, K.K. Nagar, Anna Nagar, T. Nagar, Mandaveli, Saidapet, Tambaram |
| Vyasarpadi (EV) | Thiruvanmiyur, Perambur, Tondiarpet-II |
| Poonamallee (EV) | Chrompet, Avadi, Iyyappanthangal, Ennore, Basin Bridge |
| Central-I (EV) | Adambakkam, Chrompet-II, Kundrathur, Padiyanallur, Kannagi Nagar |
| Perumbakkam (EV) | Kilambakkam, Anna Nagar East, Semmencheri, Koyambedu |

Adopting hubs is an optional enhancement (UQ-46); the column is nullable and nothing depends on it.

Note: the prototype prints some names slightly differently ("T.Nagar", "K.K.Nagar"); this document keeps your spelling ("T. Nagar", "K.K. Nagar").