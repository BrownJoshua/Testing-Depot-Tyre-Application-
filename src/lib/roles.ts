import type { RoleCode } from './types';

export interface RoleInfo {
  label: string;
  home: string;
  scope: string;
  interface: string;
}

export const ROLE_INFO: Record<RoleCode, RoleInfo> = {
  HO:  { label: 'HO (Tech)',  home: '/ho',  scope: 'All 33 depots (read); master-data maker', interface: 'Desktop' },
  AM:  { label: 'AM (Tech)',  home: '/am',  scope: 'All depots (read); approves all HO master changes', interface: 'Desktop' },
  SUP: { label: 'Supervisor', home: '/sup', scope: 'Own depot; operational approver and monitor', interface: 'Desktop' },
  TIC: { label: 'Tyre IC',    home: '/tic', scope: 'Own depot; depot operations', interface: 'Desktop and mobile' },
  TM:  { label: 'Tyre Man',   home: '/tm',  scope: 'Own assigned jobs only', interface: 'Mobile only' },
};

export interface NavItem {
  label: string;
  /** the stage in which this screen is built - everything below is a labelled placeholder today */
  arrives: string;
  /** set once the screen exists; items without a path stay labelled placeholders */
  path?: string;
}

export const NAV: Record<RoleCode, NavItem[]> = {
  HO: [
    { label: 'Dashboard', arrives: 'Stage 7' },
    { label: 'Vendor Master', arrives: 'Stage 4', path: '/ho/vendors' },
    { label: 'Tyre Folio', arrives: 'Stage 4', path: '/ho/m/tyre-folio' },
    { label: 'Tyre sizes', arrives: 'Stage 4', path: '/ho/m/tyre-sizes' },
    { label: 'Tyre makes', arrives: 'Stage 4', path: '/ho/m/tyre-makes' },
    { label: 'Tyre models', arrives: 'Stage 4', path: '/ho/m/tyre-models' },
    { label: 'Fleet Type Master', arrives: 'Stage 5a', path: '/ho/m/fleet-types' },
    { label: 'Fleet Register', arrives: 'Stage 5a', path: '/ho/m/fleets' },
    { label: 'Maintenance jobs', arrives: 'Stage 5a', path: '/ho/m/maintenance-jobs' },
    { label: 'Other master data', arrives: 'Stage 4' },
    { label: 'My change requests', arrives: 'Stage 4', path: '/ho/requests' },
    { label: 'Purchase Indent', arrives: 'Stage 4' },
    { label: 'Allocation Requests', arrives: 'Stage 4' },
    { label: 'Maintenance Pending', arrives: 'Stage 4' },
    { label: 'Reports', arrives: 'Stage 7' },
  ],
  AM: [
    { label: 'Master change approvals', arrives: 'Stage 4', path: '/am/approvals' },
    { label: 'Operational approvals', arrives: 'Stage 4' },
    { label: 'Approval history', arrives: 'Stage 4', path: '/am/history' },
    { label: 'Vendor Master (read)', arrives: 'Stage 4', path: '/am/vendors' },
    { label: 'Tyre Folio (read)', arrives: 'Stage 4', path: '/am/m/tyre-folio' },
    { label: 'Tyre sizes (read)', arrives: 'Stage 4', path: '/am/m/tyre-sizes' },
    { label: 'Tyre makes (read)', arrives: 'Stage 4', path: '/am/m/tyre-makes' },
    { label: 'Tyre models (read)', arrives: 'Stage 4', path: '/am/m/tyre-models' },
    { label: 'Fleet Type Master (read)', arrives: 'Stage 5a', path: '/am/m/fleet-types' },
    { label: 'Fleet Register (read)', arrives: 'Stage 5a', path: '/am/m/fleets' },
    { label: 'Maintenance jobs (read)', arrives: 'Stage 5a', path: '/am/m/maintenance-jobs' },
    { label: 'Dashboard', arrives: 'Stage 7' },
  ],
  SUP: [
    { label: 'Approval queue', arrives: 'Stage 4 / 5b' },
    { label: 'Job Card Register (monitor)', arrives: 'Stage 5a' },
    { label: 'Log Sheet Complaints', arrives: 'Stage 5a' },
    { label: 'Fleet Register', arrives: 'Stage 5a', path: '/sup/m/fleets' },
    { label: 'Tyre Register', arrives: 'Stage 5b' },
  ],
  TIC: [
    { label: 'Dashboard', arrives: 'Stage 5a' },
    { label: 'Job Card Register', arrives: 'Stage 5a' },
    { label: 'Complaints', arrives: 'Stage 5a' },
    { label: 'Schedule Planner', arrives: 'Stage 5a' },
    { label: 'Fleet Register', arrives: 'Stage 5a', path: '/tic/m/fleets' },
    { label: 'Fleet Grouping', arrives: 'Stage 5a' },
    { label: 'Duty Posting', arrives: 'Stage 5a' },
    { label: 'Depot Indent / GIN / GRN', arrives: 'Stage 5b' },
    { label: 'WSR and Gate Pass', arrives: 'Stage 5b' },
    { label: 'Live Tyre Stock and Register', arrives: 'Stage 5b' },
  ],
  TM: [
    { label: 'My Jobs', arrives: 'Stage 6' },
    { label: 'Duty & Shift', arrives: 'Stage 6' },
    { label: 'My WSR', arrives: 'Stage 6' },
    { label: 'GRN', arrives: 'Stage 6' },
    { label: 'MRN', arrives: 'Stage 6' },
    { label: 'SRN', arrives: 'Stage 6' },
  ],
};
