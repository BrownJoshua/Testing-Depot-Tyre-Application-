# D1 FRS coverage audit (2026-11-09)

Source: `Depot Tyre FRS D1.xlsx`, 584 requirement rows over 33 sheets, checked against `src/` and `supabase/migrations/` (up to 0025).
Status key: **Built** = the behaviour exists and works; **Partly** = a simpler or incomplete version exists; **Not built**; **Out of scope** = Central Store, TRS or Purchase side that has no counterpart in this demo.
This is a desk audit by reading the requirement summaries against the code. A row marked Built was not re-tested one by one.

## Totals

| Built | Partly | Not built | Out of scope | Rows |
|---|---|---|---|---|
| 142 | 186 | 241 | 15 | 584 |

## Per sheet

| Sheet | Built | Partly | Not built | Out of scope | Rows |
|---|---|---|---|---|---|
| Air_Inflation | 0 | 9 | 19 | 0 | 28 |
| Allocation_Requests | 0 | 0 | 3 | 3 | 6 |
| Census | 1 | 8 | 10 | 0 | 19 |
| Complaints | 24 | 8 | 12 | 0 | 44 |
| DRN | 0 | 0 | 4 | 0 | 4 |
| Depot_Tyre_Store_Menu | 2 | 7 | 1 | 0 | 10 |
| Duty_Posting | 5 | 3 | 0 | 0 | 8 |
| Fleet_Grouping | 2 | 10 | 9 | 0 | 21 |
| Fleet_Type_Master | 2 | 2 | 0 | 0 | 4 |
| GIN | 6 | 8 | 24 | 0 | 38 |
| GRN | 5 | 10 | 13 | 1 | 29 |
| Gate_Pass | 0 | 0 | 18 | 0 | 18 |
| HO_Tyre_Stock | 0 | 1 | 5 | 1 | 7 |
| Indent | 0 | 0 | 9 | 0 | 9 |
| Inspection | 0 | 8 | 9 | 0 | 17 |
| Internal_Transfer_Request | 0 | 0 | 2 | 0 | 2 |
| Job_Management | 47 | 38 | 32 | 0 | 117 |
| Live_Stock | 3 | 14 | 20 | 0 | 37 |
| MRN | 2 | 1 | 1 | 0 | 4 |
| Premature_Failure_Report | 0 | 0 | 5 | 2 | 7 |
| Purchase_Indent | 0 | 0 | 0 | 8 | 8 |
| Schedule_Chart | 4 | 3 | 2 | 0 | 9 |
| Scrap_Return_Note | 4 | 0 | 0 | 0 | 4 |
| Tyre_Changing | 10 | 19 | 4 | 0 | 33 |
| Tyre_Damage_Report | 0 | 0 | 5 | 0 | 5 |
| Tyre_Detailed_Master | 0 | 0 | 3 | 0 | 3 |
| Tyre_Discout | 3 | 7 | 5 | 0 | 15 |
| Tyre_Folio | 0 | 3 | 0 | 0 | 3 |
| Tyre_Register | 0 | 3 | 8 | 0 | 11 |
| Tyre_Rotation | 5 | 5 | 7 | 0 | 17 |
| Tyre_Setting | 8 | 8 | 5 | 0 | 21 |
| Tyre_Unsetting | 6 | 5 | 6 | 0 | 17 |
| WSR | 3 | 6 | 0 | 0 | 9 |

## Priority 1 - workflow-breaking (a role cannot finish the D1 workflow without it)

| ID | Status | Process | What is missing (from the requirement) |
|---|---|---|---|
| AI-009 | Not built | Air Inflation - schedule and round | The Depot Tyre IC shall open the Scheduled rounds view in Job Management. The system shall show the round cards and the  |
| AI-010 | Not built | Air Inflation - Tyre Man work | The Tyre Man shall open the Air Inflation round from My Jobs. The system shall show the round name, the date and shift,  |
| AI-011 | Not built | Air Inflation - Tyre Man work | The Tyre Man shall open the fleet. The system shall show the fleet number, the size, the air type and the Target PSI (HO |
| AI-012 | Not built | Air Inflation - Tyre Man work | The Tyre Man shall enter, for each of the six positions (FR, FL, RRI, RRO, RLI, RLO), the Present (found) PSI and the In |
| AI-013 | Not built | Air Inflation - Tyre Man work | The Tyre Man shall select the warning button on the tyre (or Raise a complaint on this fleet), choose the Complaint type |
| AI-014 | Not built | Air Inflation - Tyre Man work | The Tyre Man shall answer the Air Inflation Checklist and may add fleet Remarks. Answering No to "Vehicle parked on leve |
| AI-015 | Not built | Air Inflation - Tyre Man work | The Tyre Man shall select Save & next fleet. The system shall save the fleet, show "Fleet saved" and move the job card t |
| AI-016 | Not built | Air Inflation - Tyre Man work | The Tyre Man shall select Hold job, add Remarks. The system shall set the job On Hold and inform the Depot Tyre IC. |
| AI-017 | Not built | Air Inflation - Tyre Man work | The Tyre Man shall select Raise WSR. The system shall open the WSR with the job card and Job ID filled. |
| AI-018 | Not built | Air Inflation - Tyre Man work | The Tyre Man shall select Request Prepone / Postpone. The system shall send the request to the Depot Tyre IC. |
| AI-019 | Not built | Air Inflation - Tyre Man work | The Tyre Man shall be able to switch the app between English and Tamil. The system shall change all labels, buttons, sta |
| AI-022 | Not built | Air Inflation - Tyre IC actions | The Depot Tyre IC shall tick the fleets and select Final inspection - selected. The system shall show one checklist for  |
| AI-024 | Not built | Air Inflation - Tyre IC actions | The Depot Tyre IC shall open the month table of Air Inflation. The system shall show a group by day grid with the Sched. |
| AI-025 | Not built | Air Inflation - Tyre IC actions | The system shall keep the Present PSI, Inflated PSI, Target PSI and complaints of every tyre against the tyre and the fl |
| CEN-005 | Not built | Census - schedule and round | The Depot Tyre IC shall open the Scheduled rounds view. The system shall show the Census round card and the round pop-up |
| CEN-006 | Not built | Census - work on a fleet | The person doing the census shall open the Census round from My Jobs. The system shall show the round, the date and shif |
| CEN-007 | Not built | Census - work on a fleet | The person doing the census shall open the fleet. The system shall show the fleet, the registration number and size, the |
| CEN-008 | Not built | Census - work on a fleet | The person shall enter the NSD reading of every groove in one box. The system shall put a "-" between the readings and s |
| CEN-009 | Not built | Census - work on a fleet | The person shall select the Wear pattern of every tyre from the approved wear patterns. |
| CEN-010 | Not built | Census - work on a fleet | The person shall select the warning button on the tyre, choose the Complaint type, add Remarks and an optional Photo, an |
| CEN-011 | Not built | Census - work on a fleet | The person shall select Complete census. The system shall show "Census completed" and move the job card to Awaiting fina |
| CEN-012 | Not built | Census - work on a fleet | The system shall show the census sheet read only with the message "Being checked by someone else - read only until they  |
| CEN-013 | Not built | Census - work on a fleet | The person shall select Hold job, add Remarks. The system shall set the job On Hold. |
| CEN-016 | Not built | Census - Tyre IC actions | The Depot Tyre IC shall open the Census card of the month table. The system shall show Total due, Done and Pending and a |
| CM-024 | Not built | Raising a complaint (Tyre Man, Tyre IC,  | The Tyre Man shall select Set tyre not available in a Tyre Changing job. The system shall raise the complaint "Set tyre  |
| CM-037 | Not built | Notifications, permissions and exception | After each step the system shall inform the next person: the Depot Tyre IC when a complaint is raised, the Tyre Man when |
| GIN-003 | Not built | GIN screen | The GIN table shall list S.No, GIN No, GIN Date & Time, GIN Type, Request ID, From Depot / Unit, To Depot / Unit, Items, |
| GIN-004 | Not built | Create GIN | The GIN is made by the system or by the Depot Tyre IC against a request: Accept & Create GIN on an Internal Transfer Req |
| GIN-005 | Not built | Create GIN | The Depot Tyre IC shall select the Destination: Other depot, MIC or TRS (grouped list). The system shall change the fiel |
| GIN-006 | Not built | Create GIN | For the destination Other depot, the Depot Tyre IC shall select the Depot (for example Adyar Depot, Tambaram Depot) and  |
| GIN-007 | Not built | Create GIN | For the destination MIC Vehicle, the system shall list the Indent No of the indents received from the MIC Vehicle Unit. |
| GIN-008 | Not built | Create GIN | When an Indent No is selected, the system shall show the Indent items, one row for each line of the indent, with Item (T |
| GIN-009 | Not built | Create GIN | The Depot Tyre IC shall enter the Reason for the issue in a required text box. |
| GIN-010 | Not built | Create GIN | The system shall show the tyres available in the depot stock with Tyre No (MTC No), Folio ID, Size, Make, Grade and NSD, |
| GIN-011 | Not built | Create GIN | The Depot Tyre IC shall select Save as Draft or Send for Approval. Save as Draft shall store the GIN with the status Dra |
| GIN-012 | Not built | Create GIN | When the Depot Tyre IC selects Cancel, the system shall close the screen without saving. |
| GIN-013 | Not built | GIN actions and approval | The Depot Tyre IC shall select Edit, Send for Approval or Delete on a Draft GIN. Edit shall open the GIN for changes, Se |
| GIN-014 | Not built | GIN actions and approval | The Depot Tyre IC shall select Withdraw on a Awaiting approval GIN. The system shall ask "Are you sure?" and a Reason an |
| GIN-015 | Not built | GIN actions and approval | The Depot Supervisor shall open GIN Approvals. The system shall show the number of GINs waiting and a table with the sam |
| GIN-016 | Not built | GIN actions and approval | The Depot Supervisor shall select Approve. The system shall ask for a confirmation naming the GIN and, on confirm, make  |
| GIN-017 | Not built | GIN actions and approval | The Depot Supervisor shall select Revert or Reject and give a Reason. Revert shall send the GIN back to the Depot Tyre I |
| GIN-018 | Not built | GIN actions and approval | The Depot Tyre IC shall select Cancel on an Approved GIN whose gate pass is not yet issued. The system shall ask "Are yo |
| GIN-019 | Not built | GIN actions and approval | The Depot Tyre IC shall make the Gate Pass for an Approved GIN on the Gate Pass screen, with the Mode of Transport defin |
| GIN-020 | Not built | GIN created from other screens | The Depot Tyre IC shall select Accept & Create GIN on the Internal Transfer Request screen. The system shall open Create |
| GIN-024 | Not built | GIN status lifecycle and stock | The system shall move an Internal Transfer GIN through Draft, Awaiting approval, Approved, In transit and Received. It s |
| GIN-026 | Not built | GIN status lifecycle and stock | When the Depot Tyre IC issues the gate pass and the GIN is In transit, the system shall tell the receiving side: the oth |
| GIN-033 | Not built | Create GIN (TRS) | The Depot Tyre IC shall select Create GIN (TRS) on the Repair tab of Live Tyre Stock, select the TRS unit (TRS Chrompet  |
| GIN-034 | Not built | GIN Approvals | The Depot Supervisor shall open GIN Approvals as a separate screen. It shall list the Internal Transfer GINs and have Ap |
| GRN-006 | Not built | Receive tyres (TRS and other depot) | The Depot Tyre IC shall select Receive. The system shall open the Receive tyres screen with the sender (From), the TRS R |
| GRN-007 | Not built | Receive tyres (TRS and other depot) | The Depot Tyre IC shall enter the Received date & time, the actual date and time the goods reached the depot. |
| GRN-008 | Not built | Receive tyres (TRS and other depot) | The system shall show the tyre list with S.No, Tyre No, Size, Make, Grade, the date it was Sent to TRS (or sent by the o |
| GRN-009 | Not built | Receive tyres (TRS and other depot) | The Depot Tyre IC shall tick tyres and select Accept. The system shall mark every ticked tyre as Accepted. The Depot Tyr |
| GRN-010 | Not built | Receive tyres (TRS and other depot) | When the Depot Tyre IC selects Receive, the system shall check that the date and time is filled and that every tyre has  |
| GRN-011 | Not built | Receive tyres (TRS and other depot) | When the Depot Tyre IC selects Confirm, the system shall save the GRN, give it its GRN No, move the Accepted tyres into  |
| GRN-012 | Not built | Receive from MIC Vehicle | The Depot Tyre IC shall select + Receive from MIC. The system shall open the Receive from MIC Vehicle screen with Receiv |
| GRN-013 | Not built | Receive from MIC Vehicle | For each ticked tyre the Depot Tyre IC shall select Returned unused, or Fitted on road - removed tyre returned. For the  |
| GRN-014 | Not built | Receive from MIC Vehicle | When the Depot Tyre IC selects Receive, the system shall check the form and open the Review - GRN screen, and on Confirm |
| GRN-016 | Not built | GRN view, print and audit | The Depot Tyre IC shall select the clock icon. The system shall show every action on the GRN, newest first, with the per |
| GRN-018 | Not built | GRN status, permissions and exceptions | When only some of the tyres arrive, the system shall receive the tyres that arrived and keep the others on the Ready to  |
| GRN-020 | Not built | Create Gate Pass for approved GINs | The system shall let the Depot Tyre IC create the Gate Pass for an Approved GIN. When the gate pass is issued the GIN is |
| GRN-021 | Not built | GRN against an HO Allocation | The GRN screen shall list an approved HO Allocation Request that has a line for the depot as a row with Against = the Re |
| GP-001 | Not built | Gate Pass - purpose | The system shall allow material to leave or enter the depot only with a Gate Pass: Outward against an Internal Transfer  |
| GP-002 | Not built | Gate Pass screen | The Depot Tyre IC shall open Tyre Gate Pass. The system shall show the button + Create Gate Pass, the tabs All, Inward a |
| GP-003 | Not built | Gate Pass screen | The Gate Pass list shall have the columns S.No, Gate Pass No, Gate Pass Date & Time, Type (Inward or Outward), Source Re |
| GP-004 | Not built | Gate Pass screen | The Tab Inward shall list the gate passes of the type Inward and the tab Outward the gate passes of the type Outward. |
| GP-005 | Not built | Create Gate Pass | The Depot Tyre IC shall select + Create Gate Pass, or Create Gate Pass on a GIN. The system shall open Create Gate Pass  |
| GP-006 | Not built | Create Gate Pass | The Depot Tyre IC shall select the Movement type: Internal Transfer GIN (Outward), MRN (Outward), Goods Receipt Note (In |
| GP-007 | Not built | Create Gate Pass | The Depot Tyre IC shall select the Mode of Transport: Contract Vehicle, MTC Vehicle or In Person. Contract Vehicle: Vehi |
| GP-008 | Not built | Create Gate Pass | When the Depot Tyre IC selects Issue Gate Pass, the system shall check the required fields, make the gate pass, add it t |
| GP-009 | Not built | Exit, cancel and receipt | The Depot Tyre IC shall select Mark Exit on an Issued gate pass. The system shall ask "Are you sure?" with Exit date & t |
| GP-010 | Not built | Exit, cancel and receipt | The Depot Tyre IC shall select Cancel on an Issued gate pass whose vehicle has not gone. The system shall ask "Are you s |
| GP-011 | Not built | Exit, cancel and receipt | When the receiving side confirms the goods in its GRN, the system shall change the gate pass and the GIN to Received. |
| GP-012 | Not built | View, print and audit | The Depot Tyre IC shall select a Gate Pass No. The system shall show the Gate Pass in the same layout as Create Gate Pas |
| GP-013 | Not built | View, print and audit | The Depot Tyre IC shall select the clock icon. The system shall show every action on the gate pass, newest first, with t |
| GP-014 | Not built | Gate Pass status and permissions | The system shall move a gate pass through Issued, Exited and Received, or from Issued to Cancelled. |
| GP-015 | Not built | Gate Pass status and permissions | The system shall make the stock of the tyres on the gate pass follow the GIN, and show the tyres against the destination |
| GP-016 | Not built | Gate Pass status and permissions | The system shall give each role its own permissions. The Depot Tyre IC shall issue, cancel, mark the exit of and print g |
| GP-017 | Not built | GIN status and list update | When the Depot Tyre IC selects Issue Gate Pass, the system shall change the GIN to In transit and add the gate pass to t |
| GP-018 | Not built | Create and View layout | The system shall show the Create Gate Pass and the View Gate Pass in the same layout, with the summary and the detailed  |
| IND-001 | Not built | Indent screen | The Depot Tyre IC shall open Depot Indent under Depot Tyre Store. The system shall show the indents the depot has raised |
| IND-002 | Not built | Create Indent form | The Depot Tyre IC shall select + Create Indent. The system shall open Raise Depot Indent with Indent Type (filled by the |
| IND-003 | Not built | Material Type and Request To | When the Material Type is Tyre the system shall set the Indent Type to Internal Transfer and offer the Depots in Request |
| IND-004 | Not built | Item Details | The system shall show the Item Details with the columns S.No, Folio ID, Folio Name, Specification, Size, Construction Ty |
| IND-005 | Not built | Buttons | The Depot Tyre IC shall select Cancel, Save as Draft or Send for Approval. Send for Approval sends the indent to the Dep |
| IND-006 | Not built | Indent Details | When the Depot Tyre IC selects an Indent No, the system shall show Indent Details (Indent Type, Material Type, Indent No |
| IND-007 | Not built | Indent Approvals | The Depot Supervisor shall open Indent Approvals as a separate screen with Approve, Revert and Reject on each indent and |
| IND-008 | Not built | Size, Construction Type and Tube Type | The Depot Tyre IC shall select the Size. The system shall offer in Construction Type only the types that exist for that  |
| IND-009 | Not built | Item Details in the view | The Item Details of the Indent view shall show the same columns as the form (without MTC No) and Issued Qty. |
| INS-004 | Not built | Inspection - schedule and round | The Depot Tyre IC shall open the Scheduled rounds view in Job Management. The system shall show the round card and the r |
| INS-005 | Not built | Inspection - Tyre Man work | The Tyre Man shall open the Inspection round from My Jobs. The system shall show the round, the date and shift, the job  |
| INS-006 | Not built | Inspection - Tyre Man work | The Tyre Man shall open the fleet. The system shall show the fleet as a diagram with the six tyres (FRONT: FL, FR; REAR: |
| INS-007 | Not built | Inspection - Tyre Man work | The Tyre Man shall tap the tyre, choose the Complaint type, add Remarks and an optional Photo, and select Raise complain |
| INS-008 | Not built | Inspection - Tyre Man work | The Tyre Man shall select No issues - complete inspection (or complete the inspection after raising complaints). The sys |
| INS-009 | Not built | Inspection - Tyre Man work | The Tyre Man shall select Hold job, add Remarks. The system shall set the job On Hold and inform the Depot Tyre IC. |
| INS-010 | Not built | Inspection - Tyre Man work | The Tyre Man shall use Raise WSR for a part and Request Prepone / Postpone for a date change, in the same way as in ever |
| INS-013 | Not built | Inspection - Tyre IC actions | The Depot Tyre IC shall tick the fleets and select Final inspection - selected to pass them together. |
| INS-015 | Not built | Inspection - Tyre IC actions | The Depot Tyre IC shall open the month table of Inspection. The system shall show a group by day grid with Sched., On ti |
| ITR-001 | Not built | Internal Transfer Request screen | The Depot Tyre IC shall open Internal Transfer Issue (Internal Transfer Request) under Depot Tyre Store. The system shal |
| ITR-002 | Not built | Accept and Reject | The Depot Tyre IC shall select Accept & Create GIN, or Reject with a Reason. Accept opens Create GIN against the request |
| JM-019 | Not built | Publish to depots | As soon as the GM approves, the system shall publish the configuration to all depots. The status shall change from Appro |
| JM-020 | Not built | Publish to depots | On the Effective From date the system shall change the status from Published to Active and start applying the rule from  |
| JM-039 | Not built | Depot - Duty Posting and technician assi | When a Scheduled Work item is generated for a date, the system shall look in Duty Posting for a Tyre Man posted for the  |
| JM-040 | Not built | Depot - Duty Posting and technician assi | If a matching Tyre Man is found, the system shall map the Scheduled Work to that Tyre Man and store the Duty Posting ref |
| JM-042 | Not built | Depot - Duty Posting and technician assi | When a Tyre Man was mapped from Duty Posting, the system shall assign the Job Card to him automatically for the due date |
| JM-044 | Not built | Depot - Duty Posting and technician assi | If an auto-assigned Tyre Man is on leave or absent for the day, the Depot Tyre IC shall move his job cards to other Tyre |
| JM-048 | Not built | Traceability, IDs and permissions | After each step the system shall notify the next person: AE on Send for Approval; HO Technical on Send Back, Reject or f |
| JM-064 | Not built | Job Card Register - New Job Card - Next  | When the user selects a fleet the system shall show Next schedules: every schedule of that fleet with Schedule Code, Sch |
| JM-066 | Not built | Job Card Register - Assign screen | The assign screen shall show at the top the FC Due Date and the Chart III Due Date of the fleet side by side. Below them |
| JM-081 | Not built | Overdue schedules - HO notification | From the day after the due date the HO bell (HO Technical) shall show for every Schedule ID with overdue work: Schedule  |
| JM-093 | Not built | Complaint transfer to a schedule | The Tyre IC ticks one or more complaints in the Job Card Detail and selects Share Selected Complaint(s) to Schedule. The |
| JM-094 | Not built | Send to Other Unit | Send to Other Unit opens a pop-up with the Job Card / Fleet, the Current Status, the Original Due Date, the Job IDs and  |
| LS-009 | Not built | View of the tyres of a folio | The Depot Tyre IC shall select View on a folio row. The system shall list the tyres of the folio with Folio ID, Folio Na |
| LS-010 | Not built | Tyre pop-up | The Depot Tyre IC shall select a Tyre No in the View. The system shall open a pop-up with the folio card (Code, Name, Pa |
| LS-012 | Not built | Folio name pop-up | The Depot Tyre IC shall select a Folio Name in Live Tyre Stock. The system shall show the stock of the folio in the othe |
| LS-013 | Not built | Ledger | The Depot Tyre IC shall select Ledger on a folio row of Live Tyre Stock. The system shall show GIN / GRN / WSR, its Date |
| LS-015 | Not built | Tube, Flap and Disc | The system shall show Tube, Flap and Disc in the same screens as the tyre: Live Tyre Stock (Good and Repair tabs) and th |
| TC-015 | Not built | Tyre Changing - Tyre Man work | The Tyre Man shall select Set tyre not available when no set tyre is available at fitment. The system shall raise the co |
| TC-017 | Not built | Tyre Changing - Tyre Man work | The Tyre Man shall select Hold job and give Remarks. The system shall set the job On Hold. |
| TC-018 | Not built | Tyre Changing - Tyre Man work | The Tyre Man shall select Request Prepone / Postpone and give the Job, whether it is Prepone or Postpone, the New date a |
| TC-029 | Not built | Removal - Removal Reason, Wear Pattern,  | The Tyre Man shall enter the Removal Reason (the list of the job card), the Wear Pattern (the list approved by HO), the  |
| DIS-003 | Not built | Tyre Discout - due and job card | The Depot Tyre IC shall assign the duty tyre man, or the system shall assign him from Duty Posting where one is posted f |
| DIS-004 | Not built | Tyre Discout - Tyre Man work | The Tyre Man shall open the Discout job. The system shall show the job card, the fleet, the due date (and "overdue <n>d" |
| DIS-005 | Not built | Tyre Discout - Tyre Man work | The Tyre Man shall tick Powder applied, enter the Odometer (km) and select Start discout. The system shall open the disc |
| DIS-007 | Not built | Tyre Discout - Tyre Man work | The Tyre Man shall select Hold job, add Remarks. The system shall set the job On Hold. |
| DIS-011 | Not built | Tyre Discout - Tyre IC actions | The Depot Tyre IC shall open the Tyre Discout card of the month table. The system shall show Total due, Done and Pending |
| ROT-003 | Not built | Tyre Rotation - due and job card | The Depot Tyre IC shall assign the rotation duty tyre man, or the system shall assign him from Duty Posting where one is |
| ROT-004 | Not built | Tyre Rotation - Tyre Man work | The Tyre Man shall open the Tyre Rotation round from My Jobs and select the fleet. The system shall show the job card, t |
| ROT-005 | Not built | Tyre Rotation - Tyre Man work | The Tyre Man shall enter the Odometer (km) and select Start rotation. The system shall open the rotation form with a che |
| ROT-006 | Not built | Tyre Rotation - Tyre Man work | The Tyre Man shall choose Swapped (both moves ticked) or Not swapped (reason and photo mandatory) and select Complete ro |
| ROT-007 | Not built | Tyre Rotation - Tyre Man work | The Tyre Man shall select Hold job, add Remarks. The system shall set the job On Hold. |
| ROT-011 | Not built | Tyre Rotation - Tyre IC actions | The Depot Tyre IC shall open the Tyre Rotation card of the month table. The system shall show Total due, Done and Pendin |
| ROT-014 | Not built | Tyre Man app - Discout and Rotation job  | My Jobs of the Tyre Man shall show one row for the Discout schedule and one for the Rotation schedule of the month with  |
| TS-003 | Not built | Tyre Setting - creation | The Depot Tyre IC shall open Create Job Card with Job for = Live stock (no fleet), select the Job Tyre Setting (JOB-010) |
| TS-004 | Not built | Tyre Setting - creation | The system shall show the Job IDs list with one Setting Job ID (30 min, skill Tyre Fitment, First). The user shall enter |
| TS-009 | Not built | Tyre Setting - Tyre Man work | The Tyre Man shall select Hold job and give Remarks. The system shall set the job On Hold. |
| TS-010 | Not built | Tyre Setting - Tyre Man work | The Tyre Man shall select Request Prepone / Postpone. The system shall send a request to the Depot Tyre IC with the Job, |
| TU-003 | Not built | Tyre Unsetting - creation | The Depot Tyre IC shall open Create Job Card with Job for = Live stock (no fleet), select the Job Tyre Unsetting (JOB-01 |
| TU-004 | Not built | Tyre Unsetting - creation | The system shall show the Job IDs list with one Unsetting Job ID (25 min, skill Tyre Fitment, First). The user shall ent |
| TU-008 | Not built | Tyre Unsetting - Tyre Man work | The Tyre Man shall select Hold job and give Remarks. The system shall set the job On Hold. |
| TU-009 | Not built | Tyre Unsetting - Tyre Man work | The Tyre Man shall select Request Prepone / Postpone. The system shall send a request to the Depot Tyre IC with the Job, |
| WSR-002 | Partly | Accept and Reject | The Depot Tyre IC shall select Accept & Issue or Reject with a Reason. The Tyre IC approves the WSR; there is no Supervi |
| WSR-005 | Partly | One WSR for many job cards | The Tyre Man shall first select the Store the material is requested from: Depot Store, Depot Tyre Store, Depot RC Store, |

## Priority 2 - important (screens and reports the FRS expects)

| ID | Status | Process | What is missing (from the requirement) |
|---|---|---|---|
| AI-001 | Partly | Air Inflation - purpose | The system shall run Air Inflation as a Night-shift round in which one job card is made for each fleet and one Job ID fo |
| AI-002 | Not built | HO - PSI Norms | HO Technical shall open Maintenance Configuration -> PSI Norms. The system shall show the button + Add Norm, a Search bo |
| AI-003 | Not built | HO - PSI Norms | HO Technical shall select the Tyre Size (drop-down of the Tyre Size Master) and the Construction Type, enter Regular (PS |
| AI-004 | Not built | HO - PSI Norms | The Depot Tyre IC shall select Air Inflation Norms. The system shall open a read-only pop-up with the columns S.No, Tyre |
| AI-005 | Not built | Air type of the fleet | The Depot Tyre IC shall raise an air-type conversion request from Fleet Register, ticking one or more fleets, choosing C |
| AI-006 | Not built | Air type of the fleet | HO Technical shall Approve, Return or Reject the request first, and AE shall Approve, Return or Reject it next; Return s |
| AI-007 | Partly | Air Inflation - schedule and round | When the Depot Tyre IC assigns the Schedule ID, the system shall generate the Air Inflation round of the day: one job ca |
| AI-008 | Partly | Air Inflation - schedule and round | The Depot Tyre IC shall assign the tyre men to the round in Job Management or Schedule Planner, unless the system has al |
| AI-020 | Partly | Air Inflation - Tyre IC actions | The Depot Tyre IC or Supervisor shall select On behalf and enter the readings for the Tyre Man. The system shall save th |
| AI-021 | Partly | Air Inflation - Tyre IC actions | The Depot Tyre IC or Supervisor shall select Final inspection. The system shall open the checklist FIM-001 Air Inflation |
| AI-023 | Partly | Air Inflation - Tyre IC actions | The system shall show the fleet as missed and Overdue, and the Depot Tyre IC shall reschedule the missed fleets, the sel |
| AI-026 | Partly | Air Inflation - Tyre IC actions | The system shall move the job card through the statuses of T-DT-JM-070 (Draft, Assigned for Work, Final Inspection, Fina |
| AI-027 | Partly | Air Inflation - Tyre IC actions | The system shall give each role its own permissions: HO Technical manages the PSI norms (the AE sees them read only); th |
| AI-028 | Partly | Air Inflation - Schedule Chart | Air Inflation shall be charted per Schedule ID (one run, one group of fleets, one due date): the chart lists the fleets  |
| ALC-001 | Not built | Allocation Requests screen (HO) | HO Technical shall open Allocation Requests (menu Tyres). The system shall list S.No, Request No, Allocation Date & Time |
| ALC-003 | Not built | Allocate New Tyres | HO Technical shall select the Size and the Allocation Type (New Tyre Allocation, Additional Allocation, Re-allocation, E |
| ALC-004 | Not built | Withdraw, return and resend | HO Technical shall withdraw a Pending approval request with a reason (status Withdrawn). A request that AE Returned shal |
| CEN-001 | Partly | Census - purpose | The system shall run Census as a round in which one job card is made for every fleet of the depot and one Job ID for eac |
| CEN-002 | Partly | Census - schedule and round | When the Depot Tyre IC assigns the Schedule ID (T-DT-JM-079), the system shall generate the census round for all fleets  |
| CEN-003 | Partly | Census - schedule and round | The Depot Tyre IC shall assign the census to himself and, if he wants, one or more tyre men (the fleets are shared in tu |
| CEN-004 | Partly | Census - schedule and round | The Depot Tyre IC shall open My Jobs. The system shall show the job cards assigned to him (Census, inspections and work  |
| CEN-014 | Partly | Census - Tyre IC actions | The Depot Tyre IC or Supervisor shall select On behalf and enter the census sheet for the person. |
| CEN-015 | Partly | Census - Tyre IC actions | The Depot Tyre IC or Supervisor shall select Final inspection. The system shall open the checklist FIM-006 Census. |
| CEN-017 | Partly | Census - Tyre IC actions | The system shall move the job card through the statuses of T-DT-JM-070 (Draft, Assigned for Work, Final Inspection, Fina |
| CEN-018 | Partly | Census - Tyre IC actions | The system shall give each role its own permissions: the Depot Tyre IC does the census, enters work on behalf and inspec |
| CM-011 | Not built | HO - Wear Pattern Master | HO Technical shall open Wear Pattern Master. The system shall show the button + Create, a Search box (wear pattern or ID |
| CM-012 | Not built | HO - Wear Pattern Master | HO Technical shall select + Create. The system shall open a form with the single field Wear pattern and the buttons Canc |
| CM-013 | Not built | HO - Wear Pattern Master | HO Technical shall select Send for Approval. The system shall ask "Are you sure?" and, on confirm, send the pattern to A |
| CM-014 | Not built | HO - Wear Pattern Master | AE - HO Technical shall open the wear pattern waiting for approval and select Approve or Return. Approve shall ask "Are  |
| CM-015 | Not built | HO - Wear Pattern Master | HO Technical shall select View on a wear pattern. The system shall show the Pattern ID, Wear pattern, Status, Created by |
| CM-016 | Not built | HO - Tyre Complaint Master and Wear Patt | The system shall keep the link between Tyre Complaint Master and Wear Pattern Master in both directions: from a Wear com |
| CM-017 | Not built | HO - Tyre Complaint Master and Wear Patt | When a linked wear pattern is edited, returned or withdrawn, the system shall keep the link and the complaint types shal |
| CM-018 | Not built | HO - Tyre Complaint Master and Wear Patt | When a Wear complaint is raised, the system shall show the Wear pattern dropdown with only the wear patterns linked to t |
| CM-019 | Not built | HO - Tyre Complaint Master and Wear Patt | In the census form the system shall list all Approved wear patterns in the Wear pattern dropdown and save the pattern pi |
| DRN-001 | Not built | DRN List | The Depot Tyre IC shall open DRN under Depot Tyre Store. DRN is the warranty return: tyres whose Warranty Upto is not ov |
| DRN-002 | Not built | Create DRN | The Depot Tyre IC shall select + Create DRN. The system shall show DRN No (Generated on save), DRN Date, Issued By, From |
| DRN-003 | Not built | DRN from GRN | When the decision Goes To = DRN is selected in the GRN, the system shall open the DRN form with that tyre already ticked |
| DRN-004 | Not built | DRN view | When the Depot Tyre IC selects a DRN No, the system shall show DRN Details, the Tyre Details, the Workflow History and t |
| MNU-001 | Partly | Tyre Incharge menu | The Tyre Incharge menu shall show Dashboard, then the groups Maintenance (Job Card Register, Complaints, Schedule Planne |
| MNU-002 | Partly | Supervisor menu | The Supervisor menu shall show Job Card Register, Log Sheet Complaints, GIN Approvals, Indent Approvals, DRN Approvals a |
| MNU-003 | Partly | HO and AE menu | The HO menu is as in T-DT-JM-002; Tyre Stock has In Transit as a chip beside it. The AE menu shall show: HO Technical (T |
| DSH-001 | Partly | Dashboard - stock of the depot | The system shall show the cards Tyres tracked and, under Stock - Mandaveli Depot, Good (Set and Unset), Repair (Ready fo |
| DSH-002 | Partly | Dashboard - Tube, Flap and Disc | The system shall show a table Tube, Flap and Disc with Good, Set, Unset, Repair and Fitted. |
| DSH-003 | Partly | Dashboard - pending actions | The system shall list the work waiting for the Depot Tyre IC with a count and a link: GRN ready to receive (including ap |
| DSH-005 | Partly | Dashboard - status, grade and size | The system shall show the tyres of the depot By status (Fitted, Good, Repair, At TRS, At MIC, At Other Depots, In Transi |
| DSH-006 | Not built | Notifications | The Depot Tyre IC and the Supervisor shall open Notifications. The system shall list the notifications with S.No, Receiv |
| FG-002 | Partly | Fleet Grouping screen | The Depot Tyre IC shall open Fleet Grouping. The system shall show the number of fleets in the depot and one summary til |
| FG-003 | Partly | Fleet Grouping screen | The Fleet Grouping screen shall provide the + Create Group button and a Search box for the group name. The system shall  |
| FG-004 | Not built | Fleet Grouping screen | Each maintenance type block shall show a coverage line, for example 64 of 64 fleets grouped - All grouped, and a link su |
| FG-005 | Partly | Fleet Grouping screen | Each group card shall show the group name, its status, the number of fleets and tyres, the schedule line (the HO rule wi |
| FG-006 | Partly | Fleet Grouping screen | The Depot Tyre IC shall select View fleets. The system shall open the group read only with its name, maintenance type, n |
| FG-007 | Not built | Fleet Grouping screen | The Depot Tyre IC shall select the ungrouped link. The system shall list the fleets that are not in any group of that ma |
| FG-008 | Not built | Fleet Grouping screen | The Depot Tyre IC shall select Audit Trail. The system shall show the history of the group, newest first, with the curre |
| FG-009 | Partly | Create Group screen | The Depot Tyre IC shall select + Create Group. The system shall open the Create Group screen with Group ID, Group Name,  |
| FG-010 | Partly | Create Group screen | The Depot Tyre IC shall enter the Group Name, select Group for (Schedule Code or Job Code) and then the Schedule Code or |
| FG-011 | Not built | Create Group screen | The Depot Tyre IC shall filter the Fleet Register by Model type (BSIV, BS-III, Low Floor, AC, Deluxe) and Tyre size (7.5 |
| FG-012 | Partly | Create Group screen | A fleet shall belong to only one group of a maintenance type. When a fleet that is already in another group of the same  |
| FG-013 | Not built | Create Group screen | The group takes its Effective period and its Planning sequence from the Schedule ID of the Schedule Code it is for. The  |
| FG-014 | Partly | Create Group screen | The Depot Tyre IC shall enter the Reason for change and select Save. The system shall save the group after the required- |
| FG-015 | Not built | Create Group screen | When the Depot Tyre IC selects Cancel, the system shall close the screen without saving, after a warning if there are un |
| FG-016 | Not built | Edit groups board | The Depot Tyre IC shall select Edit groups on a maintenance type. The system shall open a board with one column for each |
| FG-017 | Not built | Edit groups board | The Depot Tyre IC shall select Save on the board. The system shall save the changed groups; they are used at once. |
| FG-018 | Partly | Use of groups in scheduling | The Schedule Engine shall use the Active groups to spread the due dates of the maintenance type: HO Schedule -> Depot Gr |
| FG-020 | Not built | Use of groups in scheduling | When a new grouping is saved, the system shall make the scheduled work generated after the save follow the new groups, a |
| FG-021 | Partly | Use of groups in scheduling | The system shall give each role its own permissions: the Depot Tyre IC shall create, edit and view groups; the Depot Sup |
| HS-001 | Partly | HO Tyre Stock - cards | The screen shall show six cards: Total Tyres, Central Store, Live stock, Fitted, TRS Stock and MIC Stock; In Transit sta |
| HS-002 | Not built | HO Tyre Stock - filters and views | The table shall have the views Summary and Detailed and the filters Region, Depot, Size, Folio, Construction Type, Tube  |
| HS-003 | Not built | HO Tyre Stock - Central Store | Summary: Stock by folio with Qty and Stock Value. Detailed: the new tyres of the Central Store, each with its MTC No: MT |
| HS-004 | Not built | HO Tyre Stock - Live stock | Depot Good and Repair stock only. Filters add Stock Status (Good, Repair); Summary columns Good, Repair and Total Qty. |
| HS-005 | Not built | HO Tyre Stock - Fitted | Summary columns Fitted and At Other Depots with their total; Detailed lists the fitted tyres and the tyres at other depo |
| HS-007 | Not built | HO Tyre Stock - MIC Stock | One row for every MIC vehicle: MIC Vehicle (M-31...), Registration No, Depot (name and code), Issued to MIC on, Days on  |
| INS-001 | Partly | Inspection - purpose | The system shall run Inspection as a visual-check round in the Night shift, in which one job card is made for each fleet |
| INS-002 | Partly | Inspection - schedule and round | When the Depot Tyre IC assigns the Schedule ID (T-DT-JM-079), the system shall generate the Inspection round of the day  |
| INS-003 | Partly | Inspection - schedule and round | The Depot Tyre IC shall assign the tyre men to the round in Job Management or Schedule Planner, unless the system has al |
| INS-011 | Partly | Inspection - Tyre IC actions | The Depot Tyre IC or Supervisor shall select On behalf and mark every tyre checked and raise a complaint for a defect. T |
| INS-012 | Partly | Inspection - Tyre IC actions | The Depot Tyre IC or Supervisor shall select Final inspection. The system shall open the checklist FIM-003 Inspection. |
| INS-014 | Partly | Inspection - Tyre IC actions | The system shall show the fleet as missed and Overdue, and the Depot Tyre IC shall reschedule it with a Reason. |
| INS-016 | Partly | Inspection - Tyre IC actions | The system shall move the job card through the statuses of T-DT-JM-070 (Draft, Assigned for Work, Final Inspection, Fina |
| INS-017 | Partly | Inspection - Tyre IC actions | The system shall give each role its own permissions: the Depot Tyre IC and the Supervisor assign, reschedule, enter work |
| JM-057 | Not built | HO - Maintenance Configuration - Skills  | The Skills tab shall list every job of the Job Code Master with S.No, Job Code, Job Name, Fleet Type, Required Skills (o |
| JM-077 | Not built | HO schedule form - Group Based configura | The basis Group Based has the section Group Configuration. The Group (Tyre) select lists all folios of the group, all se |
| JM-083 | Not built | Job Card Register - Fleet Tyre View | The icon Fleet Tyre View is in the header of the Job Card Register. It opens a pop-up that asks the Vehicle Source Type  |
| JM-084 | Not built | Job Card Register - Assign selected and  | Assign selected and Replace selected open a pop-up with Assignment Date, Shift, Due Date, Assign to myself (Tyre IC), th |
| JM-092 | Not built | Fleet Register View - Removal History an | At the end of View All two tables are shown: Removal History (S.No, Removal Order No, Job Card No, Removal Part (Tyre),  |
| JM-100 | Not built | Tyre Man decides tube, flap and disc sou | In the Tyre Man work pop-up, under the Setting Job ID, each of Tube, Flap and Disc shows what the Tyre IC chose (Reuse f |
| JM-101 | Not built | Scheduled rounds pop-ups: one column for | The round pop-up shows the header band (date, job cards, Job IDs, Tyre men), status chips (click a chip to filter the ro |
| JM-106 | Not built | Basic details on a tyre, tube, flap and  | The number is a link. The click opens a details card over the current screen, which stays as it is (an open form keeps i |
| JM-109 | Not built | Raise WSR for a Job ID (Tyre Man app) | Every open Job ID line of the work pop-up has a Raise WSR button that opens the WSR form with that Job ID selected (the  |
| JM-112 | Not built | HO - Final Inspection Master | HO Technical shall open Final Inspection Master. The system shall list the Final Inspection ID (FIM-nnn), Applies to (Jo |
| JM-113 | Not built | HO - Expected Life KM | HO Technical shall open Expected Life KM. The list has one row for each Tyre Size with the expected life KM of a New tyr |
| JM-114 | Not built | HO - Tyre Man Register | HO Technical shall open Tyre Man Register. The system shall list the Tyre Incharge and Tyre Men of all depots, read only |
| JM-115 | Not built | Depot - Outsource Employee | The Depot Tyre IC shall open Outsource Employee. The system shall list the outsource employees of the depot (OSE-nnn) an |
| JM-116 | Not built | HO - Initial Inspection Master | HO Technical shall open Initial Inspection Master. The system shall list the Initial Inspection ID (IIM-nnn), Applies to |
| JM-117 | Not built | Depot Tyre IC - Nail Removal | The Depot Tyre IC shall select Nail Removal, the button at the top of the Job Card Register beside Fleet Tyre View. The  |
| LS-001 | Partly | Depot Tyre Inventory - purpose | The system shall keep the stock of the depot in only two Inventory screens. Live Tyre Stock holds the tyres, tubes, flap |
| LS-002 | Partly | Inventory menu | The Depot Tyre IC shall open Inventory. The system shall show two screens: Live Tyre Stock and Tyre Register. Live Tyre  |
| LS-003 | Partly | Tyre location rule | The system shall place every tyre in exactly one status: Good (yard, ready to be used), Repair (yard, removed and Ready  |
| LS-004 | Partly | Live Tyre Stock - Good, Summary | The system shall list the Live stock as one row for each Folio ID with the columns S.No, Folio ID, Folio Name, Product G |
| LS-005 | Partly | Live Tyre Stock - Repair | The system shall show in the Repair tab the tyres (and the tubes, flaps and discs) that were removed from a fleet and ar |
| LS-006 | Partly | Tyre Register - Fitted | The system shall list the fitted stock in the Fitted tab as one row for each Folio ID with the columns S.No, Folio ID, F |
| LS-007 | Partly | Tyre Register - At TRS, At MIC and At Ot | The system shall list each of the tabs At TRS, At MIC and At Other Depots as one row for each Folio ID with the columns  |
| LS-008 | Partly | Folio rule | The system shall give a tyre its Folio ID from the Size, the Construction Type and the Tube Type. Make and Makers Model  |
| LS-011 | Partly | Warranty dates | The system shall show Manufactured Date and Warranty Upto next to the Purchase date in every tyre table. Warranty Upto = |
| LS-014 | Not built | History of fitted tyres | The Depot Tyre IC shall select History on a folio row of the Fitted tab of Tyre Register. The system shall show the move |
| LS-016 | Partly | How stock changes | The system shall change the status of the stock by itself: a WSR GIN takes the tyre out of Good; the end of the Fitment  |
| LS-017 | Partly | HO - Tyre Stock | HO Technical shall open Tyre Stock (the former Tyre Register). The system shall show for all depots, read only, the card |
| LS-018 | Partly | Permissions | The system shall give each role its own permissions. The Depot Tyre IC shall view the stock, export it and make the Crea |
| LS-019 | Not built | HO - In Transit | The system shall show HO Technical the In Transit chip beside Tyre Stock (there is no separate menu item In Transit) wit |
| LS-021 | Not built | Minimum and Maximum stock | The system shall show Minimum Stk and Maximum Stock for each folio. Maximum Stock is an entered value. |
| LS-023 | Partly | Fields of a tyre line | The system shall show every tyre line with Folio ID, Folio Name, Specification, MTC No, Manufacturer No, Make, Makers Mo |
| LS-024 | Partly | Live Tyre Stock - Good and Repair tabs | The system shall show Live Tyre Stock with two tabs. Good holds the tyres, tubes, flaps and discs that are fit for use.  |
| LS-025 | Not built | Good tab - Current Status (Set / Unset) | The system shall show a column Current Status after Status in the Detailed list of Good tyres, tubes, flaps and discs wi |
| LS-026 | Not built | Repair tab - Current Status and Create G | The system shall show Current Status (Set / Unset) for each tyre of the Repair tab, because a removed tyre is Set until  |
| LS-027 | Not built | Tube, Flap and Disc in Repair | The system shall list in Repair the tubes, flaps and discs whose Condition is Injured, with the fields of the Good list  |
| LS-028 | Not built | Detailed list - column order | The system shall show the columns of a tyre list in this order: S.No, Folio ID, Folio Name, Specification, Makers No, MT |
| LS-029 | Not built | HO - Stock by folio (folio based) | The system shall show the Stock by folio as one row for each Folio ID like the depot screens, and shall change it when t |
| LS-031 | Not built | TLDC of a new tyre | When the Depot Tyre IC selects the MTC No or TLDC of a new tyre, the system shall open the Tyre Life Details Card with A |
| LS-032 | Not built | Live Tyre Stock - tabs | The screen shall have the tabs Good and Repair. The tabs Tools and Equipment shall not be shown. Each of Good and Repair |
| LS-033 | Not built | Live Tyre Stock - Good Summary | The Summary shall list every folio of every product group in one table: S.No, Folio ID, Folio Name, Product Group, Speci |
| LS-034 | Not built | Live Tyre Stock - Good Detailed | The Detailed view shall list the tyres of the selected Product Group (Tyre, Tube, Flap, Disc) with all their fields. The |
| LS-035 | Not built | Live Tyre Stock - Repair | Repair shall have the same two views as Good with the product groups in one table. Summary: S.No, Folio ID, Folio Name,  |
| LS-036 | Not built | Live Tyre Stock - links with other scree | A tyre received with a GRN against an HO allocation shall be added to Good with Stock Status Good and Setting Status Uns |
| LS-037 | Not built | Live stock reduces when an Indent GIN is | When the Gate Pass is created the GIN becomes In transit and the tyres of that GIN leave the sender's Live Tyre Stock: t |
| PFR-001 | Not built | Premature Failure Reports screen | The Depot Tyre IC shall open Premature Failure Reports under Reports. The system shall show the tabs Reports and Request |
| PFR-002 | Not built | Report list | The system shall list S.No, Report No, Date, the tyre columns (MTC No, Manufacturer No, Folio ID, Folio Name, Specificat |
| PFR-003 | Not built | New Report - raised for a tyre | The Depot Tyre IC shall select + New Report and select the MTC Tyre No. The system shall fill Make / Pattern, Size / Con |
| PFR-004 | Not built | Fault | The system shall offer Fault On as Driver, Tyre Man, Manufacturer or No fault. When the fault is Driver or Tyre Man, the |
| PFR-007 | Not built | Report view | The system shall show the report as 13 points (position, skid depth, new / RT tyre, MTC tyre no / company, manufacturer  |
| SC-001 | Partly | Schedule Chart - cards | The screen shall be organised by the work of the depot: Today (the Air Inflation chart and the Inspection chart of the d |
| SC-002 | Not built | Schedule Chart - See Full List | See Full List shall open a pop-up with S.No, Fleet Number, Due Date, Done Date, Status and Action (View) for every fleet |
| SC-003 | Not built | Schedule Chart - View of a row | View shall show the fleet with the due and done date and its tyres (position, tyre no, size, last rotation date, last di |
| SC-007 | Partly | Schedule Chart - Air Inflation and Inspe | Every day the Depot Tyre IC shall make two Schedule IDs with Create Schedule ID: Air Inflation for one group of 35 fleet |
| SC-009 | Partly | Schedule Chart - Rotation and Discout fo | The chart is one card for the month; its due dates are spread over the month. The card shows the next due dates (date, n |
| DMG-001 | Not built | Tyre Damage Reports screen | The Depot Tyre IC shall open Tyre Damage Reports under Reports. The system shall list the report requests of TRS: Reques |
| DMG-002 | Not built | Request status | The system shall show the status Pending approval (TRS Incharge has not decided), Approved (the depot shall fill the rep |
| DMG-003 | Not built | Fill Report | The Depot Tyre IC shall select Fill Report. The system shall show Depot, Bus / Fleet No, Tyre No, Size, Type and Total k |
| DMG-004 | Not built | Submit Report | The Depot Tyre IC shall select Submit Report. The system shall set the status Report Received, remove the Fill Report bu |
| DMG-005 | Not built | Request view | The system shall show the request (Request No, Job Card No, Source, Request Reason, Injury, Requested By, Status, Return |
| TDM-001 | Not built | Tyre Detailed Master - screen | The screen shall list every column (field) a tyre can have, from the Tyre Detailed and Summary screens: S.No, Column ID  |
| TDM-002 | Not built | Tyre Detailed Master - Integration | Integration Yes means the value comes from a master of another module: Module (Stores, HRMS, Operations, Accounts, Purch |
| TDM-003 | Not built | Tyre Detailed Master - + Add Column | The form shall ask Column Name, Column Description, Integration, Input Field and (Integration Yes) Module, Module Master |
| DIS-006 | Partly | Tyre Discout - Tyre Man work | The Tyre Man shall tick both moves and select Complete discout. The system shall show "Discout completed" and move the j |
| DIS-008 | Partly | Tyre Discout - Tyre IC actions | The Depot Tyre IC or Supervisor shall select On behalf and enter the work for the Tyre Man. |
| DIS-009 | Partly | Tyre Discout - Tyre IC actions | The Depot Tyre IC or Supervisor shall select Final inspection. The system shall open the checklist FIM-005 Tyre Discout. |
| DIS-010 | Partly | Tyre Discout - Tyre IC actions | The system shall show the job card in red at the top until it is rescheduled or done, and the Depot Tyre IC can reschedu |
| DIS-012 | Partly | Tyre Discout - Tyre IC actions | The system shall move the job card through the statuses of T-DT-JM-070 (Draft, Assigned for Work, Final Inspection, Fina |
| DIS-013 | Partly | Tyre Discout - Tyre IC actions | The system shall give each role its own permissions: the Depot Tyre IC and the Supervisor assign, reschedule, enter work |
| DIS-014 | Partly | Tyre Discout - due date of a tyre | The due date of discout is tyre wise: 120 operated days or 10,000 km after the last discout date, whichever comes first. |
| REG-001 | Partly | Tyre Register - screen | The Depot Tyre IC shall open Tyre Register under Inventory. The system shall show the tabs Fitted, At TRS, At MIC and At |
| REG-002 | Partly | Fitted tab | The system shall show the Fitted tab with the switch Tyre, Tube, Flap and Disc and the Summary and Detailed views of the |
| REG-003 | Not built | At TRS tab | The system shall list the tyres at TRS as one row for each Folio ID with the columns Idle, In Production, Unfit, Condemn |
| REG-004 | Not built | At MIC tab | The system shall list the tyres on an MIC vehicle as one row for each Folio ID with the quantity At MIC Vehicle and the  |
| REG-005 | Not built | At Other Depots tab | The system shall list the tyres of the depot that are at other depots (At Other Depots) and the tyres of other depots th |
| REG-006 | Partly | Manufactured Date and Warranty Upto | Every tyre table that shows MTC No and Purchase date (Live Tyre Stock, Tyre Register, HO Tyre Stock Detailed) shall also |
| REG-007 | Not built | Tyre history popup: Ledger, Fleet Moveme | The popup of a tyre (tyre number link) has the folio details and three tables: Ledger (GIN / GRN / WSR No, Date & Time,  |
| REG-008 | Not built | Tube, flap and disc history | The item number (Fitted Tube / Flap / Disc, or in the Fleet Movement History) is a link that opens the history of that i |
| REG-009 | Not built | Tyre Correction Request - raise | The Depot Tyre IC shall select Correction Request on the tyre card. The system shall list the editable fields of the tyr |
| REG-010 | Not built | Tyre Correction Requests - HO list | HO Technical shall open Tyre Correction Requests in the menu. The system shall show the chips All, Pending, Approved and |
| REG-011 | Not built | Tyre Correction Request - approve or rej | HO Technical shall select View. The system shall show the Tyre No, Depot, Requested By, Date & Time, Status, the table F |
| ROT-008 | Partly | Tyre Rotation - Tyre IC actions | The Depot Tyre IC or Supervisor shall select On behalf and enter the work for the Tyre Man. |
| ROT-009 | Partly | Tyre Rotation - Tyre IC actions | The Depot Tyre IC or Supervisor shall select Final inspection. The system shall open the checklist FIM-004 Tyre Rotation |
| ROT-010 | Partly | Tyre Rotation - Tyre IC actions | The system shall keep the job card at the top of the list in red until it is rescheduled or done, and the Depot Tyre IC  |
| ROT-012 | Partly | Tyre Rotation - Tyre IC actions | The system shall move the job card through the statuses of T-DT-JM-070 (Draft, Assigned for Work, Final Inspection, Fina |
| ROT-013 | Partly | Tyre Rotation - Tyre IC actions | The system shall give each role its own permissions: the Depot Tyre IC and the Supervisor assign, reschedule, enter work |

## Priority 3 - secondary / cosmetic (columns, links, print, small rules)

| ID | Status | Process | What is missing (from the requirement) |
|---|---|---|---|
| CM-007 | Not built | HO - Tyre Complaint Master | For a Wear complaint type the system shall show Linked wear patterns, a multi-select list of the wear patterns that are  |
| CM-020 | Partly | Raising a complaint (Tyre Man, Tyre IC,  | A complaint shall be raised from four places: the Tyre Man app during Air Inflation, Inspection, Census or Tyre Changing |
| CM-022 | Partly | Raising a complaint (Tyre Man, Tyre IC,  | The Tyre Man shall select Other (see remarks) and type the complaint in his own words in Remarks when he cannot find the |
| CM-025 | Partly | Depot Tyre IC - Complaints screen | The Depot Tyre IC shall open Complaints. The system shall show four tiles - New (need review), Assigned, Closed and Tota |
| CM-027 | Partly | Depot Tyre IC - Complaints screen | The Depot Tyre IC shall select a Complaint ID. The system shall open the complaint read only with Complaint ID, Maintena |
| CM-028 | Partly | Depot Tyre IC - Complaints screen | The Depot Tyre IC shall select the clock icon. The system shall show the current status on top and then every action, ne |
| CM-036 | Partly | Complaint status lifecycle | The system shall keep complaint types Active or Inactive and wear patterns Draft, Pending approval, Approved or Returned |
| CM-039 | Partly | Notifications, permissions and exception | If a complaint type is deactivated after a complaint was raised with it, the system shall keep its type name on the comp |
| CM-042 | Partly | Complaints screen - Complaint ID, Compla | The list shall show Complaint ID (sequential, CMPID-nnnn, created when the complaint is raised), Complaint Code (fixed H |
| DP-002 | Partly | Duty Posting - Roster (month view) | The Roster tab shall list the whole depot staff: the Tyre Incharge (self), all Tyre Men and the Outsource employees, eac |
| DP-007 | Partly | Duty Posting - strength, groups and flee | The screen shall show three tiles: Tyre Man strength (Tyre Incharge, Tyre Men, Outsource employees and the total, from H |
| DP-008 | Partly | Duty Posting - coverage of the posted da | The Job posting tab shall show the active Schedule Codes and Job Codes on the left (with the required skills and, for a  |
| FT-003 | Partly | Fleet Type Master - wrong tyre size warn | When the size of the tyre fitted is not allowed for the Fleet Type of the fleet the fitment shall be allowed and a notif |
| FT-004 | Partly | Fleet Register - Fleet Type column | A Fleet Type column shall follow Model Type. |
| GIN-001 | Partly | GIN - purpose | The system shall record every issue of material out of the depot on a Goods Issue Note (GIN), so that each item that lea |
| GIN-002 | Partly | GIN screen | The Depot Tyre IC shall open GIN - Goods Issue Note. The system shall list the Indent GINs (the WSR GIN has its own scre |
| GIN-022 | Partly | GIN view, print and audit | The Depot Tyre IC shall select a GIN No. The system shall show the header GIN No, GIN Date & Time, Requested by, Receive |
| GIN-023 | Not built | GIN view, print and audit | The Depot Tyre IC shall select the clock icon. The system shall show every action on the GIN, newest first, with the per |
| GIN-025 | Partly | GIN status lifecycle and stock | The system shall take the tyres, tubes, flaps and discs of a GIN out of the depot stock and show them against the destin |
| GIN-027 | Partly | GIN status lifecycle and stock | The system shall give each role its own permissions. The Depot Tyre IC shall create, edit, send, withdraw, delete and ca |
| GIN-028 | Partly | GIN types and reference | The system shall use the Transfer No of the internal indent for an Internal Transfer GIN, and the WSR No for a WSR Issue |
| GIN-029 | Partly | Folio Id and specification | The system shall show the Folio Id of the item (tyre, tube, flap or disc), F + 4 digits for a tyre, and the Specificatio |
| GIN-030 | Not built | Reverted and Rejected GIN | The system shall show GINs with the status Reverted and Rejected in the GIN list and in the WSR GIN list. |
| GIN-038 | Partly | WSR GIN: Accepted Qty and Rejected Qty | The WSR GIN Summary shows Accepted Qty and Rejected Qty after Items. The Detailed table (View) shows Accepted Qty and Re |
| GRN-001 | Partly | GRN - purpose | The system shall record every receipt of material into the depot on a Goods Receipt Note (GRN), where the receiver enter |
| GRN-002 | Partly | GRN screen | The Depot Tyre IC shall open GRN - Goods Receipt Note. The system shall show the tiles Ready to receive, GRNs received ( |
| GRN-003 | Partly | GRN screen | The GRN list shall have the tabs All, Ready to receive, and Received, each with its count, a Search box (GRN No, Indent  |
| GRN-004 | Partly | GRN screen | The GRN table shall list S.No, From Depot / Unit, GRN No, GRN Date & Time, Source (the GIN, the TRS dispatch or the HO a |
| GRN-015 | Partly | GRN view, print and audit | The Depot Tyre IC shall select a GRN No. The system shall show the header and a table of Folio No, Folio Name, Specifica |
| GRN-017 | Partly | GRN status, permissions and exceptions | The system shall keep a GRN item Ready to receive until the Depot Tyre IC confirms the receipt, and then change it to Re |
| GRN-019 | Partly | GRN status, permissions and exceptions | The system shall give each role its own permissions. The Depot Tyre IC shall receive goods, enter the Accepted Qty and R |
| GRN-025 | Partly | GRN list: Issued Qty, Accepted Qty, Reje | The GRN list and the Material Return GRN list show Issued Qty, Accepted Qty and Rejected Qty for every GRN (Accepted Qty |
| GRN-027 | Partly | Material Return GRN list and item pop-up | The Material Return GRN list shall show S.No, GRN No, Source (the MRN No only, a link that opens the MRN pop-up), GRN Da |
| GRN-029 | Partly | Job Card No and Job ID links of the Mate | In the pop-ups of the Material Return GRN the Job Card No opens the Job Card Detail of that job card and the Job ID open |
| JM-001 | Partly | Process principle | The system shall keep five objects separate but linked: HO Schedule Code Master, Depot Grouping, Duty Posting, Scheduled |
| JM-002 | Partly | HO - Login and menu | HO Technical shall log in to the application. After successful login the system shall open the HO Technical menu and sho |
| JM-003 | Partly | HO - Schedule Code Master screen | HO Technical shall select Maintenance Configuration. The system shall open the screen with four tabs: Job Code Master, S |
| JM-010 | Partly | HO - Schedule Code Master actions | HO Technical shall select Audit Trail. The system shall open the history of the configuration, newest first, with the cu |
| JM-011 | Partly | HO - Schedule Code Master status lifecyc | The system shall move a schedule configuration through the statuses Draft, Pending approval, Approved, Published and Act |
| JM-012 | Partly | Approval - Schedule Code Master (AE / AM | AE - HO Technical shall open Schedule Approvals. The system shall list the configurations waiting at the AE stage with C |
| JM-013 | Partly | Approval - Schedule Code Master (AE / AM | AM - Technical & Corporate shall open the schedule configuration approval screen (Schedule Approvals). The system shall  |
| JM-014 | Partly | Approval - Schedule Code Master (AE / AM | GM - Technical & Corporate shall open the schedule configuration approval screen. The system shall list the configuratio |
| JM-015 | Partly | Approval - Schedule Code Master (AE / AM | Before acting, the approver shall open View to check the schedule rule, the Effective From date, the reason and the audi |
| JM-016 | Partly | Approval - Schedule Code Master (AE / AM | The approver shall select Approve. The system shall ask "Are you sure?" and, on Confirm, move the configuration to the n |
| JM-017 | Partly | Approval - Schedule Code Master (AE / AM | The approver shall select Send Back and enter Remarks. On Confirm the system shall send the configuration back to HO Tec |
| JM-018 | Partly | Approval - Schedule Code Master (AE / AM | The approver shall select Reject and enter Remarks. On Confirm the system shall close the configuration with the status  |
| JM-021 | Partly | Publish to depots | HO Technical shall be able to make an Active configuration Inactive. The system shall stop generating new due dates afte |
| JM-022 | Partly | Depot - Schedule Planner (Scheduled Work | The Depot Tyre IC shall log in to the application. The system shall open the depot menu with the groups Maintenance, Dep |
| JM-027 | Partly | System - Depot schedule generation | For each fleet or tyre the system shall calculate the due date from the published rule: the last done date plus the numb |
| JM-029 | Partly | System - Depot schedule generation | The Depot Tyre IC shall open the Scheduled Work view. The system shall list S.No, Maintenance type, Group, Fleets, Tyres |
| JM-031 | Partly | System - Depot schedule generation | The system shall move a Scheduled Work item through Generated, Job Card Generated, In Progress and Completed. It shall s |
| JM-032 | Partly | Depot - Grouping | When a depot has more fleets or tyres for a maintenance type than it can handle in a day, the Depot Tyre IC shall create |
| JM-033 | Partly | Depot - Grouping | The Depot Tyre IC shall select + Create Group. The system shall open the Create Group screen with Group ID (generated),  |
| JM-034 | Not built | Depot - Grouping | Every time a group is saved or changed, the system shall check that all applicable fleets or tyres of the maintenance ty |
| JM-035 | Not built | Depot - Grouping | The system shall keep a group Active from the day it is created. An Active group becomes Expired when a new grouping rep |
| JM-036 | Partly | Depot - Grouping | Where groups are used, the system shall distribute the scheduled work by the groups: HO Schedule -> Depot Group -> Due S |
| JM-038 | Partly | Depot - Duty Posting and technician assi | The system shall use the monthly Duty Posting already kept by the depot (Technician, Date, Shift, Assigned work / mainte |
| JM-045 | Partly | Traceability, IDs and permissions | The system shall keep on every scheduled Job Card the references Job Card ID, Scheduled Work ID, HO Schedule Code Master |
| JM-046 | Partly | Traceability, IDs and permissions | The system shall generate the record numbers: Configuration Id (with the version number), Scheduled Work ID, Group ID, J |
| JM-049 | Not built | Exception scenarios | If a depot has no published or active configuration for a maintenance type, the system shall show that type without a pu |
| JM-050 | Not built | Exception scenarios | When an approver sends back or rejects a configuration, the system shall stop the flow, record the remarks and notify th |
| JM-051 | Not built | Exception scenarios | When a new version becomes effective, the system shall apply the new rule to due dates from its Effective From date and  |
| JM-052 | Partly | Maintenance Pending (HO and AE) | The system shall show the same Pending Summary for all depots: the Maintenance type drop-down and a table with S.No, Dep |
| JM-059 | Partly | Schedule Planner - Scheduled Work (day s | Scheduled Work shall show one row for each day of the month (the summary view) with S.No, Date (with the day and a Today |
| JM-061 | Partly | Job Card Register - New Job Card (Fleet) | The New Job Card pop-up shall have the chips Fleet and Live stock (no fleet). For Fleet the fields are: Vehicle Source T |
| JM-062 | Partly | Job Card Register - New Job Card - Job T | The system shall list the Active complaints of the Tyre Complaint Master as a table with Select, Complaint Code, Complai |
| JM-065 | Partly | Job Card Register - Create and Create &  | The pop-up shall have three buttons: Cancel (closes without saving), Create and Create & Assign. Create saves the job ca |
| JM-067 | Partly | Job Card Register - Assign screen - Insp | The Inspection stage shall have: Employee Source (MTC Staff / Outsource Employees with the count, filtered by duty roste |
| JM-068 | Partly | Job Card Register - Assign screen - Work | The Work stage shall have the same fields as the Inspection stage without Assign to myself: Employee Source, Assignment  |
| JM-072 | Partly | Job card - complaints on the job card an | The job card shall keep the Complaint Category (Tyre) and, for every complaint, the Complaint ID, the Complaint Code of  |
| JM-075 | Partly | HO schedule form - Estimated Time per Fl | The form shall have the blocks Estimated Time per Fleet (Fleet Type: Small, Standard, Low Floor) and Estimated Time per  |
| JM-082 | Partly | Schedule Planner - structure | The tabs are Schedule Setup, Scheduled Work and Schedule Chart. Schedule Setup lists the HO schedules with View and Crea |
| JM-085 | Partly | Fleet Register (Tyre IC and Supervisor) | The screen shows the status cards All, Operation, Held Up, Breakdown, Depot Workshop Fleet, External Maintenance, Spare  |
| JM-087 | Partly | Job Card Detail - structure | Every job card shall have the same Job Card Detail: a top strip (Fleet Number, Register Number, Expected Done, Estimated |
| JM-099 | Partly | Tyre Register: Ledger and Fleet Movement | Fleet Movement History of a tyre lists the Removal Order and Fitment Order of the tyre and of its tube, flap and disc (F |
| JM-102 | Partly | One Job Card Detail format for every job | The Job Card Detail has one layout: strip (Fleet Number(s), Register Number, Expected Done with date, shift and Overdue  |
| JM-108 | Partly | WSR table of the Job Card Detail and Job | The WSR table of the Job Card Detail and of the Job pop-up has the fields of the WSR Request list: WSR No, WSR Date & Ti |
| MRN-003 | Not built | Reject Reason Master (HO) | HO Technical keeps the Reject Reason Master: Reason ID, Reject reason and Status (Draft, Pending approval, Approved) wit |
| MRN-004 | Partly | Requested By / Requested To instead of F | The screen is named "(MRN) Material Return Note - GRN" (it was Material Return GRN). The MRN is an internal move inside  |
| TC-004 | Partly | Tyre Changing - job card creation | For Live stock Good Set, the system shall list the Live stock Good Set tyres of the required size ("Tyre No - Make - Gra |
| TC-005 | Partly | Tyre Changing - job card creation | For Live stock Good Unset, the system shall list the Live stock Good Unset tyres of the required size. After the tyre is |
| TC-007 | Partly | Tyre Changing - job card creation | For No tyre available, the system shall tell the user that a Want of tyre is made for the size, HO (Technical) is inform |
| TC-008 | Partly | Tyre Changing - job card creation | The system shall show the Job IDs list with every step in work order, with its name, time, required skill and order: Rem |
| TC-009 | Partly | Tyre Changing - Tyre Man work | The Tyre Man shall open the assigned Tyre Changing job. The system shall show the job card, fleet with availability, pos |
| TC-010 | Partly | Tyre Changing - Tyre Man work | The Tyre Man shall select Start removal. The system shall open the Removal form: the tyre coming off (scanned), the Odom |
| TC-011 | Partly | Tyre Changing - Tyre Man work | The Tyre Man shall select Complete removal. The system shall close the Removal step and show "Removal completed" with th |
| TC-012 | Partly | Tyre Changing - Tyre Man work | When the Fitment step needs a tyre that is still being set and the Tyre Man selects Start fitment, the system shall show |
| TC-013 | Partly | Tyre Changing - Tyre Man work | The Tyre Man shall select Start fitment when the Fitment step is ready. The system shall open the Fitment form: the tyre |
| TC-014 | Partly | Tyre Changing - Tyre Man work | The Tyre Man shall select Complete fitment. The system shall show "Job card completed" with the removal (tyre and where  |
| TC-016 | Partly | Tyre Changing - Tyre Man work | The Tyre Man shall select Raise WSR when a part is needed. The system shall open the WSR with the job card and Job ID fi |
| TC-020 | Partly | Tyre Changing - Tyre IC actions | The Depot Tyre IC shall use the usual actions of Job Management on each step: Assign and Replace for the Job ID, Add ano |
| TC-022 | Partly | Tyre Changing - Tyre IC actions | When the job card is Completed, the system shall show what changed: the removed tyre moved to its yard place, the fitted |
| TC-025 | Partly | Tyre Changing - status, links and except | If a step cannot be done because the Tyre Man is on leave or absent, the Depot Tyre IC shall move the steps of that Tyre |
| TC-027 | Partly | Job card preview | The system shall open the job card preview with the Job Card No and a table of the Job IDs. Each Job ID row shows the Jo |
| TC-028 | Partly | Assign from the job card preview | The Depot Tyre IC shall assign each Job ID to an employee with Assign on its row, or tick several Job IDs and select Ass |
| TC-030 | Partly | Fitment and Setting documents | The Tyre Man app shall show the Fitment Order of the fleet on the Fitment Job ID and the WSR on the Setting Job ID. The  |
| TC-032 | Partly | Tyre Man app - Setting step of a Tyre Ch | The Tyre Man to whom the Setting Job ID of a Tyre Changing job card is assigned shall see the job card in My Jobs and op |
| TC-033 | Partly | Tyre Man app - My Jobs, Tyre Changing st | My Jobs shall show only the job cards assigned to the Tyre Man; there is no Upcoming list (an upcoming job is not known  |
| TF-001 | Partly | HO Tyre Folio - list | After Size the list shall show Locations (Central Store, MIC, Depot, TRS), Group (Tyre), Category (Spares or Accessory), |
| TF-002 | Partly | HO Tyre Folio - Add, Edit, View | The form and the view shall have the new fields: Group, Category (Spares, Accessory), UOM, HSN (default -), Expiry, Reco |
| TF-003 | Partly | HO Tyre Folio - Delete | Delete shall ask Are you sure? and remove the folio from the list. |
| TS-005 | Partly | Tyre Setting - Tyre Man work | The Tyre Man shall open the assigned Setting job. The system shall show the Job card, Fleet (or "No fleet" for a Live st |
| TS-006 | Partly | Tyre Setting - Tyre Man work | The Tyre Man shall select Start setting. The system shall open the Setting form with the tyre (scanned), the Tube, Flap  |
| TS-007 | Partly | Tyre Setting - Tyre Man work | The Tyre Man shall select Raise WSR for a part that is not given. The system shall open the WSR with the job card and Jo |
| TS-008 | Partly | Tyre Setting - Tyre Man work | The Tyre Man shall select Complete setting. The system shall close the Setting Job ID and show "Setting completed" with  |
| TS-012 | Partly | Tyre Setting - Tyre IC actions | The Depot Tyre IC shall use the usual actions of Job Management: Assign, Replace, Add another Tyre Man, Reschedule and A |
| TS-013 | Partly | Tyre Setting - Tyre IC actions | The Depot Tyre IC or Supervisor shall select Final inspection. The system shall open the checklist FIM-010 Tyre Setting: |
| TS-018 | Partly | Tyre Setting - tyres offered | The system shall offer in the Setting job card only the Unset tyres of the Good tab of Live Tyre Stock; the tube, flap a |
| TS-019 | Not built | Setting job without fitment (stock link) | When the job card is created the system shall reserve the Unset tyre, tube, flap and disc and show the tyre as Reserved  |
| TS-021 | Partly | Setting job in the app | The Tyre Man app shall show the Unset tyre of Live Tyre Stock (Good), the tube, flap and disc given by the Depot Tyre IC |
| TU-005 | Partly | Tyre Unsetting - Tyre Man work | The Tyre Man shall open the assigned Unsetting job. The system shall show the Job card, Fleet (or Yard - no fleet), the  |
| TU-006 | Partly | Tyre Unsetting - Tyre Man work | The Tyre Man shall select Start unsetting. The system shall open the Unsetting form with the tyre (scanned) and, for the |
| TU-007 | Partly | Tyre Unsetting - Tyre Man work | The Tyre Man shall select Complete unsetting. The system shall close the Unsetting Job ID and show "Unsetting completed" |
| TU-011 | Partly | Tyre Unsetting - Tyre IC actions | The Depot Tyre IC shall use the usual actions of Job Management: Assign, Replace, Add another Tyre Man, Reschedule and A |
| TU-012 | Partly | Tyre Unsetting - Tyre IC actions | The Depot Tyre IC or Supervisor shall select Final inspection. The system shall open the checklist FIM-011 Tyre Unsettin |
| TU-016 | Not built | Unsetting job - tyre offered | The system shall offer in the Unsetting job only the Set tyres of the Repair tab of Live Tyre Stock that are not fitted  |
| TU-017 | Not built | Unsetting job in the app | The Tyre Man app shall show a Set tyre of the Repair tab that is not fitted to a vehicle. The Tyre Man records the condi |
| WSR-003 | Partly | WSR detail: Size first, MTC No, items by | The WSR View (Detailed table) has S.No, Size, Folio ID, Folio Name, Specification, MTC No, Manufacturer No, Make, Makers |
| WSR-007 | Partly | WSR detail, statuses, many job cards, au | WSR Detailed table: S.No, Size, Folio ID, Folio Name, Specification, MTC No, Manufacturer No, Make, Makers Model, Constr |
| WSR-008 | Partly | Job Card No and Fleet No links of the WS | In the WSR Request list and in the WSR view the Job Card No opens the Job Card Detail of that job card and the Fleet No  |
| WSR-009 | Partly | WSR list: action buttons in fixed slots | The Action column of the WSR list has four fixed slots, in this order: Accept & Issue, Reject, Print, Audit Trail. A WSR |

## Top 25 build list (in this order)

1. **Tyre Man round work screens**: open a round from My Jobs, pick a fleet, enter readings per position (Air Inflation Present / Inflated PSI; Inspection tyre checks; Census NSD and wear pattern), Save and next fleet (AI-010..015, INS-005..008, CEN-006..011, T-DT-JM-080).
2. **Hold job** with remarks, and **Request Prepone / Postpone** from the Tyre Man, with Tyre IC approval (AI-016, AI-018, TC-017, TC-018, TS-009, TS-010, TU-008, TU-009, ROT-007, DIS-007).
3. **Rotation and Discout work form**: odometer, powder applied, Swapped or Not swapped (reason and photo mandatory), both moves ticked (ROT-004..006, DIS-004..006).
4. **Auto-assignment from Duty Posting** when a schedule card is made, and the leave / absent move (JM-039, JM-040, JM-042, JM-044, ROT-003, DIS-003).
5. **Notifications and the HO overdue bell** for the next person in every step (CM-037, DSH-006, JM-048, JM-081).
6. **Scheduled rounds view** (round cards, status chips, month day grid, Total due / Done) for Air Inflation, Inspection, Census, Rotation, Discout (AI-009, AI-024, CEN-005, CEN-016, INS-004, INS-015, ROT-011, DIS-011, SC-001..003).
7. **Final Inspection checklist** (Final Inspection Master FIM-nnn, HO master) and Final inspection - selected for several fleets (AI-021, AI-022, JM-112, TC-021).
8. **Depot Indent** (raise, Draft, send for approval, Supervisor approval, Item Details by folio) and **Internal Transfer Request** (IND-001..009, ITR-001..002).
9. **Indent GIN** with Supervisor approval (Draft, Awaiting approval, Reverted, Rejected, Approved, Cancelled) and its list (GIN-003..020, GIN-034).
10. **Gate Pass** (Issued, Exited, Received, Cancelled; GIN becomes In transit; sender stock reduces) (GP-001..018, GIN-024, LS-037).
11. **GRN receive for TRS, other depot and MIC** with Accept / Reject and reject reasons, partial receipt (GRN-006..014, GRN-018, GRN-020).
12. **Reject Reason Master** (HO, approved by AM) used in GRN and MRN (MRN-003).
13. **Tyre Man Setting, Unsetting and Fitment forms** (scan the tyre, parts given, odometer) and the Set tyre not available complaint (TC-010..015, TS-006..008, TU-006..007, CM-024).
14. **Live Tyre Stock screen**: Good and Repair tabs, Summary by folio and Detailed by product group, Current Status, ledger, folio view and tube / flap / disc lists (LS-004, LS-009..015, LS-024..029, LS-032..035).
15. **Tyre Register tabs** Fitted, At TRS, At MIC, At Other Depots with History; tyre history popup with Ledger, Fleet Movement History and Readings (REG-002..008, LS-014).
16. **Low-stock alert and Minimum / Maximum stock** on the folio and dashboard (DSH-004, LS-021).
17. **Fleet Grouping to D1** (per maintenance type, coverage line, Create Group with Model type filter, Edit groups board, ungrouped list, Audit Trail) and group-aware scheduling (FG-004..020).
18. **PSI Norms and air-type conversion requests** (HO master, Fleet Register request, HO then AE approval) (AI-002..006).
19. **Wear Pattern Master** (HO, AE approval) linked to the Wear complaint types and the census form (CM-011..019).
20. **Job card extras**: Next schedules for a fleet, FC / Chart III due dates in Assign, Create and Assign, Assign selected / Replace selected, Fleet Tyre View, Send to Other Unit, Share complaint to a schedule job card, Nail Removal (JM-061, JM-064, JM-066, JM-083, JM-084, JM-093, JM-094, JM-117).
21. **Setting and Unsetting job cards created on their own** (live stock, no fleet) (TS-003, TS-004, TU-003, TU-004).
22. **Skills, Tyre Man Register and Outsource Employee** (JM-057, JM-114, JM-115, DP-002) and Expected Life KM (JM-113).
23. **HO Tyre Stock** screen with Summary and Detailed views, filters and In Transit chip (HS-001..005, LS-019, DSH-005).
24. **Reports**: Premature Failure Report and Tyre Damage Report (PFR-001..004, PFR-007, DMG-001..005); **DRN** warranty return (DRN-001..004).
25. **Tyre Correction Request** (Tyre IC raises, HO approves) and the Tyre Detailed Master (REG-009..011, TDM-001..003).

Out of scope for this demo (no counterpart built): Central Store allocation and receipt (ALC-002, ALC-005, ALC-006), TRS dispatch (GRN-005, PFR-005, PFR-006, HS-006), Purchase Indent (PI-001..008).
