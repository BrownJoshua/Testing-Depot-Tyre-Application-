# Workflow Documentation

> **Stage 2 update.** Superseded in part by `stage2-approval-workflows.md`. In particular: WF-01 now applies to **all** HO masters (Return → Reject with mandatory remarks; Deactivate/Reactivate are also requests); "AE" in every diagram means **AM (Tech)**; WF-06's final inspection is performed by the **Tyre IC** (Supervisor role open, UQ-06). Other workflows (WF-02 … WF-17) are retained as the operational baseline.

State diagrams use Mermaid (rendered by GitHub). Status names are the prototype's own. Tags such as `[INF]` mean the transition is inferred and needs your confirmation (see `business-rules.md`).

**Index**

| ID | Workflow | Actors |
|---|---|---|
| WF-01 | Master maker–checker | HO → AE |
| WF-02 | Purchase Indent | HO → AE |
| WF-03 | Allocation Request | HO → AE |
| WF-04 | Fleet air-type conversion | TIC/SUP → HO → AE |
| WF-05 | Fleet grouping and scheduled job generation | TIC → SUP |
| WF-06 | Job card lifecycle | TIC/SUP ↔ TM |
| WF-07 | Tyre Changing (Removal → Unsetting → Setting → Fitment) | TIC, TM |
| WF-08 | Air Inflation / Inspection / Rotation / Discout / Census rounds | TM |
| WF-09 | Complaint to job | TM/SUP/TIC |
| WF-10 | WSR (material request) | TM, TIC |
| WF-11 | Depot Indent → GIN → Gate Pass → GRN | TIC ↔ TIC, SUP |
| WF-12 | Retreading (TRS) cycle and "Goes To" | TIC, TRS |
| WF-13 | DRN | TIC |
| WF-14 | Premature Failure and Tyre Damage reports | TIC, TRS |
| WF-15 | Roster, skills, shift change, leave | TIC, SUP, TM |
| WF-16 | Reason suggestions from depots | Depot → HO |
| WF-17 | Notification flow | system |

---

## WF-01 Master maker–checker (Tyre Folio, Expected Life KM, Reject Reason, QC, Wear Pattern)

```mermaid
stateDiagram-v2
    [*] --> Draft: HO creates / edits
    Draft --> PendingApproval: HO "Send for Approval" (confirm)
    PendingApproval --> Approved: AE Approve
    PendingApproval --> Returned: AE Return (reason required)
    PendingApproval --> Draft: HO Withdraw (reason required)
    Returned --> Draft: HO edits
    Approved --> Published: System publishes to all depots
    Published --> Draft: HO edits a live record (creates a proposal) [INF]
```

- Every transition writes an audit-trail event (actor, role, time, reason).
- AE can act on one row or many selected rows at once.
- **Rebuild rule:** while a change is pending, the *live* record is untouched; the proposed values wait in the approval request and are applied only on Approve (master-prompt requirement; the prototype implies it).

## WF-02 Purchase Indent

```mermaid
stateDiagram-v2
    [*] --> PendingApproval: HO Raise Indent (Supplementary, AWR or Emergency)
    PendingApproval --> Issued: AE Approve
    PendingApproval --> Reverted: AE Revert (reason required)
    Reverted --> PendingApproval: HO Edit and resubmit
```

## WF-03 Allocation Request

```mermaid
stateDiagram-v2
    [*] --> Requested: HO allocates stock to depots (quantity per depot, at least one)
    Requested --> Approved: AE Approve ("goes to Central Store")
    Requested --> Rejected: AE Reject (reason required)
```
*Conf.: create/stock forms are not visible in the snapshot (C13).*

## WF-04 Fleet air-type conversion (Regular ↔ Nitrogen)

```mermaid
stateDiagram-v2
    [*] --> WithHO: TIC or SUP "Raise a conversion request" (fleets, convert-to, reason *)
    WithHO --> WithAE: HO Approve (HO can also Edit / Reject)
    WithHO --> Rejected: HO Reject
    WithAE --> Approved: AE Approve
    WithAE --> Returned: AE Return (reason required)
    Approved --> [*]: fleet Air Type changes; fleet joins matching air group [INF]
```

## WF-05 Fleet grouping and scheduled job generation

```mermaid
flowchart TD
    A[HO/AE: Schedule configured in Maintenance Configuration] --> B[TIC creates or edits Fleet Groups, enters Reason for change]
    B --> C{Supervisor decision}
    C -- Approve --> D[Group active; first schedule date set per group]
    C -- Return with reason --> B
    D --> E[Schedule Planner computes due dates per group]
    E --> F[Job cards generated: one per fleet; Census one Job ID per tyre; Rotation two Job IDs]
    F --> G[TIC assigns: Due date, Due shift, Tyre man]
    G --> H[Job Card lifecycle WF-06]
```
Withdraw (reason) is available to the TIC while pending.

## WF-06 Job card lifecycle

```mermaid
stateDiagram-v2
    [*] --> NotAssigned: created (Scheduled / Complaint / Reactive)
    NotAssigned --> Assigned: TIC or SUP assigns (date, shift, person)
    Assigned --> Assigned: Replace / Add person / Reschedule (reason)
    Assigned --> InProgress: Tyre man starts work
    InProgress --> OnHold: Hold (reason from Reason Master)
    OnHold --> InProgress: resume
    InProgress --> AwaitingWSR: material needed (tube/flap/disc) [INF]
    AwaitingWSR --> InProgress: WSR issued and GIN received
    InProgress --> AwaitingFinalInspection: all job IDs complete
    AwaitingFinalInspection --> Closed: Final inspection passed (QC checklist)
    AwaitingFinalInspection --> Rework: Final inspection failed
    Rework --> Assigned: re-assign (re-inspection can be assigned)
    NotAssigned --> Cancelled: Cancel (reason)
    Assigned --> Cancelled: Cancel (reason)
    Closed --> [*]
    Cancelled --> [*]
```
- TIC or SUP can enter the work **on behalf** of the tyre man (reason required).
- A held job cannot receive a new WSR until resumed.
- Fleet availability (In depot / Out / Breakdown / Held up) is tracked separately; Held up needs a reason.

## WF-07 Tyre Changing — four ordered Job IDs

```mermaid
flowchart LR
    R[1 Removal] --> U[2 Unsetting] --> S[3 Setting] --> F[4 Fitment]
    R -. "Removal Order created on completion" .-> RO[(Removal Order)]
    S -. "tube/flap/disc via WSR + auto GIN" .-> W[WSR / GIN]
    F -. "needs Setting done and GIN received" .-> FO[(Fitment Order)]
    RO --> G[TIC receives in GRN and chooses Goes To]
```

| Step | Who | Inputs | Result |
|---|---|---|---|
| Removal | assigned tyre man | Removed at, odometer, NSD at removal, tyre condition, photo | Tyre removed from position; Removal Order |
| Unsetting | assigned tyre man | tube/flap/disc disposition set by TIC (Live stock Good or Repair) | Tyre Unset; "stays in Repair (Ready for Transit)" |
| Setting | assigned tyre man | tyre from live stock (Good Unset), tube, flap, disc | Tyre Set (Live stock Good Set) |
| Fitment | assigned tyre man | fitment tyre (live stock Good Set), fitted at, pressure after fitment | Tyre on fleet; Fitment Order |

If no Set tyre is available: **"Set tyre not available"** raises a complaint and holds the job.

## WF-08 Rounds executed by the Tyre Man

```mermaid
flowchart TD
    A[My Jobs] --> B[Round list per job type and shift]
    B --> C[Open fleet job card]
    C --> D{Job type}
    D -- Air / Nitrogen --> E[Enter found PSI and inflated-to PSI per tyre; CIRT checklist; optional complaint]
    D -- Inspection --> F[Check tyres; raise Defect if any]
    D -- Rotation --> G[Enter odometer; swap FR-FL due tyre and partner]
    D -- Discout --> H[Enter odometer; powder applied]
    D -- Census --> I[NSD readings + wear pattern per tyre]
    E --> J[Save and next fleet]
    F --> J
    G --> J
    H --> J
    I --> J
    J --> K{All fleets done?}
    K -- no --> C
    K -- yes --> L[Job cards move to Awaiting final inspection]
    C -. Hold with reason .-> M[On Hold]
```
Pressure outside target −15 / +10 PSI is flagged as a PSI exception to the Tyre Incharge.

## WF-09 Complaint to job

```mermaid
stateDiagram-v2
    [*] --> New: raised by Tyre man (round), Supervisor (Log Sheet), Inspection, or TIC
    New --> Assigned: TIC "Review & assign" - Approve, choose Job, due date, shift, person
    New --> Rejected: TIC Reject
    Assigned --> Closed: linked job(s) closed
    note right of Assigned
      Complaint Master lists required jobs (Removal, Fitment,
      Setting, Unsetting, Air Inflation, ...). Inspection may come
      before work.
    end note
```
Sources: Air Inflation, Inspection, Log Sheet, Tyre Incharge. Suggested job codes come from the Complaint Master.

## WF-10 WSR (material request)

```mermaid
stateDiagram-v2
    [*] --> Requested: Tyre man or TIC raises WSR (tube / flap / disc by size)
    Requested --> Issued: TIC Accept and Issue (Item No per unit from live stock)
    Requested --> PartlyIssued: partial stock
    PartlyIssued --> Issued: balance issued [INF]
    Requested --> Rejected: TIC Reject (reason)
    Requested --> Cancelled: Cancel (reason)
    Issued --> [*]: WSR Issue GIN auto-created, no approval; tyre man Receive GIN
```

## WF-11 Depot Indent → GIN → Gate Pass → GRN (internal transfer)

```mermaid
sequenceDiagram
    participant A as Requesting depot (TIC)
    participant S1 as Supervisor
    participant B as Supplying depot (TIC)
    participant S2 as Supervisor (supplier)
    participant G as Security gate
    A->>A: Create Indent (Draft)
    A->>S1: Send for Approval
    S1-->>A: Approve / Revert (reason) / Reject (reason)
    A->>B: Indent Sent (appears as Internal Transfer Request: New)
    B-->>A: Reject (reason) or Accept
    B->>B: Accept & Create GIN (Draft)
    B->>S2: Send for Approval
    S2-->>B: Approve / Revert / Reject
    B->>G: Create Gate Pass (vehicle, driver)
    G->>G: Mark Exit (time, checked by)
    Note over B,A: GIN becomes In transit
    A->>A: Receive in GRN (accept/reject each tyre)
    Note over A: Indent: Partly received or Received
```
Indent statuses: Draft → Awaiting approval → (Reverted | Rejected | Sent) → New → Accepted → Partly issued / Issued → In transit → Partly received → Received; also Cancelled, Closed. GIN statuses: Draft → Awaiting approval → (Reverted | Rejected) | Approved → In transit → Received; Cancelled.

## WF-12 Retreading (TRS) cycle and "Goes To"

```mermaid
flowchart TD
    A[Tyre removed from fleet] --> B[Removal Order]
    B --> C[TIC receives removed tyre: Goes To]
    C --> D[Live stock]
    C --> E[Ready for Transit]
    C --> F[DRN]
    E --> G[TIC creates GIN to TRS - Retreading Unit, Supervisor approves]
    G --> H[Gate pass and exit; At TRS: Idle - In Production - Unfit - Condemn]
    H --> I[TRS returns retreaded tyres]
    I --> J[TIC GRN: Accept - Reject - Discrepancy reason; grade set]
    J --> K[Back to Live stock as Serviced / RT n]
    F --> L[DRN to TRS: Pending - Approved - Rejected]
```
MIC vehicle tyres follow a parallel path (issue to MIC, return as Returned unused or Fitted on road).

## WF-13 DRN

```mermaid
stateDiagram-v2
    [*] --> Draft: TIC Create DRN / Save Draft
    Draft --> Pending: Submit (confirm)
    Pending --> Approved: approver not shown (C6)
    Pending --> Rejected: approver not shown (C6)
```

## WF-14 Premature Failure and Tyre Damage reports

```mermaid
stateDiagram-v2
    state "Premature Failure" as PF {
        [*] --> RequestSentToDepot: TRS requests report
        RequestSentToDepot --> ReportRaised: TIC raises report
        ReportRaised --> PendingTRSIC: sent to TRS Incharge
        PendingTRSIC --> SentToTRS
        PendingTRSIC --> Returned
        SentToTRS --> SentToDepot: [INF]
    }
    state "Tyre Damage" as TD {
        [*] --> PendingApproval
        PendingApproval --> Approved
        PendingApproval --> Returned
        Approved --> ReportReceived: TIC Fill Report
    }
```
*Conf.: exact transitions and actors are only partly visible; the status vocabularies are from the data.*

## WF-15 Roster, skills, shift change and leave

```mermaid
flowchart TD
    subgraph Roster
      R1[TIC posts weekly roster in Duty Posting] --> R2{Supervisor}
      R2 -- Approve --> R3[Posted: visible to tyre men with approval stamp]
      R2 -- Return reason --> R1
    end
    subgraph Skills
      S1[TIC requests skill add for a tyre man] --> S2{Supervisor}
      S2 -- Approve --> S3[Skill added; improves Skill match]
      S2 -- Return reason --> S1
    end
    subgraph TyreManRequests
      T1[Tyre man: shift change / leave / prepone-postpone] --> T2[Pending approval - approver unconfirmed]
    end
```
Attendance and week-off arrive from HRMS (read-only).

## WF-16 Reason suggestions from depots

```mermaid
stateDiagram-v2
    [*] --> New: Depot enters a free-text reason (Hold / Reschedule / Replace / Missed / Send back)
    New --> Added: HO "Add to list" (sets Used for and Pauses schedule)
    New --> Rejected: HO Reject (reason)
```

## WF-17 Notifications

Triggers observed: job assigned, WSR issued/approved, fitment waits for Setting, new complaint, indent received, final inspection pending, rework, GIN/indent returned, approvals pending (sidebar badges). Each notification stores type, reference, details, sender, time and a link to open. Detailed trigger matrix is a Stage 2 deliverable.
