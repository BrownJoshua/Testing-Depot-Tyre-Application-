-- 0005: roles, employees, login profiles, depot access, role capabilities.
-- STATUS: proposed in Stage 3 batch 2, NOT applied. Review and approve before running.
--
-- Design rules enforced here (stage2.1-employee-login-design.md):
--  * Role and depot live on EMPLOYEES, never on profiles; users cannot edit either.
--  * HO and AM have no depot; SUP, TIC, TM have exactly one depot, which must be a real depot.
--  * Employee codes are unique ignoring case, match the Employee-ID format, and never change.
--  * A login (profile) exists only for an employee; passwords live only in Supabase Auth.
-- No demo employees or users are created by this migration.

create table public.roles (
  code             public.role_code primary key,
  label            text    not null,
  description      text,
  is_depot_scoped  boolean not null
);
insert into public.roles (code, label, description, is_depot_scoped) values
  ('HO',  'HO (Tech)',  'Head Office master-data maker; reads all depots',                    false),
  ('AM',  'AM (Tech)',  'Approver of all HO master-data changes; reads all depots',           false),
  ('SUP', 'Supervisor', 'Operational approver and monitor for one depot',                     true),
  ('TIC', 'Tyre IC',    'Depot operational authority (desktop and mobile)',                   true),
  ('TM',  'Tyre Man',   'Executes assigned jobs (mobile only)',                               true);

create table public.employees (
  id                uuid primary key default gen_random_uuid(),
  employee_code     text not null,
  full_name         text not null,
  role_code         public.role_code not null references public.roles (code),
  org_unit_id       uuid references public.depots (org_unit_id),
  designation_label text,
  phone_demo        text,                                  -- fictional values only
  experience_years  numeric(4,1),
  date_of_joining   date,
  is_login_enabled  boolean not null default false,
  is_demo           boolean not null default true,
  status            public.master_status not null default 'ACTIVE',
  row_version       int  not null default 1,
  deactivated_at    timestamptz,
  deactivated_by    uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid,
  updated_by        uuid,
  constraint employees_code_format check (employee_code ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$'),
  constraint employees_depot_rule check (
        (role_code in ('HO', 'AM')        and org_unit_id is null)
     or (role_code in ('SUP', 'TIC', 'TM') and org_unit_id is not null))
);
create unique index employees_code_uk on public.employees (lower(employee_code));
create index employees_depot_role_idx on public.employees (org_unit_id, role_code);
-- The prototype shows exactly one Tyre IC per depot. Remove this index if that is not a business rule.
create unique index employees_one_active_tic_per_depot on public.employees (org_unit_id)
  where role_code = 'TIC' and status = 'ACTIVE';
create trigger employees_touch before update on public.employees
  for each row execute function app.set_updated_at();
create trigger employees_code_immutable before update on public.employees
  for each row execute function app.forbid_code_change();

create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete restrict,
  employee_id          uuid not null unique references public.employees (id),
  preferred_language   text not null default 'en' check (preferred_language in ('en', 'ta')),
  is_active            boolean not null default true,
  must_change_password boolean not null default false,
  last_login_at        timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function app.set_updated_at();

create table public.user_depot_access (       -- empty by default (UQ-18, optional)
  profile_id  uuid not null references public.profiles (id),
  org_unit_id uuid not null references public.depots (org_unit_id),
  granted_by  uuid references public.profiles (id),
  granted_at  timestamptz not null default now(),
  primary key (profile_id, org_unit_id)
);

create table public.role_capabilities (
  role_code    public.role_code not null references public.roles (code),
  capability   text    not null,
  is_enabled   boolean not null default true,
  is_resolved  boolean not null default true,   -- false = an open business question (UQ-nn)
  note         text,
  primary key (role_code, capability)
);

-- now that profiles exist, link the audit columns of org_units and employees
alter table public.org_units
  add constraint org_units_created_by_fk     foreign key (created_by)     references public.profiles (id),
  add constraint org_units_updated_by_fk     foreign key (updated_by)     references public.profiles (id),
  add constraint org_units_deactivated_by_fk foreign key (deactivated_by) references public.profiles (id);
alter table public.employees
  add constraint employees_created_by_fk     foreign key (created_by)     references public.profiles (id),
  add constraint employees_updated_by_fk     foreign key (updated_by)     references public.profiles (id),
  add constraint employees_deactivated_by_fk foreign key (deactivated_by) references public.profiles (id);

-- capability baseline (stage2-final-role-matrix.md section 7). is_enabled = false and
-- is_resolved = false mark answers still owed by the business; nothing is guessed.
insert into public.role_capabilities (role_code, capability, is_enabled, is_resolved, note) values
  ('HO','master.propose',true,true,null), ('AM','master.approve',true,true,null),
  ('HO','tyre.correct',true,true,'via master workflow; whitelist UQ-38'),
  ('HO','purchase_indent.create',true,true,null), ('AM','purchase_indent.approve',true,true,null),
  ('HO','allocation.create',true,true,null), ('AM','allocation.approve',true,true,null),
  ('SUP','airtype.request',true,true,null), ('TIC','airtype.request',true,true,null),
  ('HO','airtype.review',true,true,'UQ-07'), ('AM','airtype.approve',true,true,null),
  ('TIC','grouping.propose',true,true,null), ('SUP','grouping.approve',true,true,null),
  ('TIC','roster.propose',true,true,null), ('SUP','roster.approve',true,true,null),
  ('TIC','skill.request',true,true,null), ('SUP','skill.approve',true,true,null),
  ('TIC','indent.create',true,true,null), ('SUP','indent.approve',true,true,null),
  ('TIC','indent.accept_transfer',true,true,null),
  ('TIC','gin.create',true,true,null), ('SUP','gin.approve',true,true,null),
  ('TIC','gatepass.create',true,true,null), ('TIC','grn.receive',true,true,null),
  ('TIC','grn.receive_allocation',true,true,null),
  ('TIC','wsr.raise',true,true,null), ('TM','wsr.raise',true,true,null), ('TIC','wsr.issue',true,true,null),
  ('SUP','complaint.raise',true,true,null), ('TIC','complaint.raise',true,true,null), ('TM','complaint.raise',true,true,null),
  ('TIC','complaint.triage',true,true,null),
  ('TIC','job_card.create',true,true,null), ('TIC','job_card.assign',true,true,null),
  ('TIC','job.execute',true,true,null), ('TM','job.execute',true,true,null),
  ('TIC','job.onbehalf',true,true,null), ('TIC','job.final_inspect',true,true,'Tyre IC verifies (your decision)'),
  ('TIC','drn.create',true,true,null), ('TIC','ose.manage',true,true,null),
  ('TM','shift_change.request',true,true,null), ('TM','leave.request',true,true,null), ('TM','reschedule.request',true,true,null),
  -- open questions: disabled until answered
  ('SUP','job_card.create',false,false,'UQ-06 Supervisor rights in the Job Card Register'),
  ('SUP','job_card.assign',false,false,'UQ-06'),
  ('SUP','job.onbehalf',false,false,'UQ-06'),
  ('SUP','job.final_inspect',false,false,'UQ-06'),
  ('TIC','tools.manage',false,false,'UQ-39 Tools & Equipment register'),
  ('HO','central_receipt.post',false,false,'UQ-33 who operates Central Store receipt');
