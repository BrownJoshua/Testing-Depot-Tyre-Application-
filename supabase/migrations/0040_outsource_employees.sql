-- 0040: D1 Outsource Employee register (labour-contractor staff, kept by the Tyre IC, identified by phone and Aadhaar).
create table public.outsource_employees (
  id              uuid primary key default gen_random_uuid(),
  employee_no     text not null unique,                     -- OSE-001
  org_unit_id     uuid not null references public.depots (org_unit_id),
  full_name       text not null check (length(btrim(full_name)) > 1),
  work_order_type text not null check (work_order_type in ('CONTRACTOR', 'DIRECT')),
  contractor_name text,
  phone           text not null check (phone ~ '^[0-9]{10}$'),
  aadhaar_no      text not null check (aadhaar_no ~ '^[0-9]{4} [0-9]{4} [0-9]{4}$'),   -- demo values only
  address         text,
  qualification   text,
  skills          text,
  status          text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  removed_reason  text,
  created_by      uuid references public.employees (id),
  created_at      timestamptz not null default now(),
  constraint ose_contractor_named check (work_order_type <> 'CONTRACTOR' or length(btrim(coalesce(contractor_name, ''))) > 0),
  constraint ose_removed_has_reason check (status = 'ACTIVE' or length(btrim(coalesce(removed_reason, ''))) > 0)
);
create index outsource_depot_idx on public.outsource_employees (org_unit_id, status);
create trigger audit_outsource after insert or update or delete on public.outsource_employees for each row execute function app.audit_row();

insert into public.document_number_series (series_code, label, template, scope, reset_policy, seq_width, start_value, is_confirmed, evidence_note)
values ('OSE', 'Outsource employee', 'OSE-{SEQ}', 'GLOBAL', 'NEVER', 3, 7, true, 'OSE-001..006 are D1 samples');

insert into public.outsource_employees (employee_no, org_unit_id, full_name, work_order_type, contractor_name, phone, aadhaar_no, address, qualification, skills)
select v.no, (select id from public.org_units where code = 'MN'), v.n, v.t, v.c, v.p, v.a, v.ad, v.q, v.s from (values
  ('OSE-001', 'R. Dhanush',     'CONTRACTOR', 'Sri Balaji Manpower Services', '9439595000', '1005 2364 5000', '12 Anna Nagar, Chennai',            'ITI — Automobile',            'Air Inflation'),
  ('OSE-002', 'S. Vignesh',     'CONTRACTOR', 'Sri Balaji Manpower Services', '9439919679', '1005 2793 8889', '45 Velachery Main Rd, Chennai',      'Diploma — Mechanical Engg',   'Tyre Rotation, Wheel Balancing'),
  ('OSE-003', 'K. Arunkumar',   'CONTRACTOR', 'Sri Balaji Manpower Services', '9440244358', '1005 3223 2778', '7 Kamarajar St, Mandaveli, Chennai', '12th Std',                    'Tyre Fitment'),
  ('OSE-004', 'M. Balamurugan', 'DIRECT',     null,                           '9440569037', '1005 3652 6667', '88 T.Nagar, Chennai',               'ITI — Tyre & Rubber Tech',    'Wheel Balancing, Nail Removal'),
  ('OSE-005', 'P. Yuvaraj',     'DIRECT',     null,                           '9440893716', '1005 4082 0556', '23 Perambur High Rd, Chennai',      'Diploma — Automobile Engg',   'Tyre Fitment, Retreading'),
  ('OSE-006', 'T. Gopal',       'DIRECT',     null,                           '9441218395', '1005 4511 4445', '56 Adyar, Chennai',                 'ITI — Automobile',            'Nail Removal, Wheel Alignment')
) as v(no, n, t, c, p, a, ad, q, s)
where exists (select 1 from public.org_units where code = 'MN');

create function public.outsource_add(p_name text, p_type text, p_contractor text, p_phone text, p_aadhaar text, p_address text, p_qualification text, p_skills text)
returns text language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('ose.manage'); v_no text;
begin
  v_no := app.next_doc_no('OSE', null, app.business_today());
  insert into public.outsource_employees (employee_no, org_unit_id, full_name, work_order_type, contractor_name, phone, aadhaar_no, address, qualification, skills, created_by)
  values (v_no, e.org_unit_id, btrim(p_name), p_type, nullif(btrim(p_contractor), ''), btrim(p_phone), btrim(p_aadhaar), nullif(btrim(p_address), ''), nullif(btrim(p_qualification), ''), nullif(btrim(p_skills), ''), e.id);
  return v_no;
end $$;

create function public.outsource_remove(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('ose.manage');
begin
  update public.outsource_employees set status = 'INACTIVE', removed_reason = btrim(p_reason) where id = p_id and org_unit_id = e.org_unit_id and status = 'ACTIVE';
  if not found then raise exception 'active outsource employee not found in your depot'; end if;
end $$;

revoke all on function public.outsource_add(text, text, text, text, text, text, text, text), public.outsource_remove(uuid, text) from public, anon;
grant execute on function public.outsource_add(text, text, text, text, text, text, text, text), public.outsource_remove(uuid, text) to authenticated;
alter table public.outsource_employees enable row level security; alter table public.outsource_employees force row level security;
grant select on public.outsource_employees to authenticated;
create policy gate_active_user on public.outsource_employees as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy read_depot on public.outsource_employees for select to authenticated using (org_unit_id in (select app.my_visible_depot_ids()) and app.my_role() <> 'TM');
