-- 0009: application settings, the adjustable demo date, and database-generated document numbers.
-- STATUS: proposed in Stage 3 batch 3, NOT applied. Review and approve before running.
--
-- Demo date (stage2.1-final-architecture-review.md section 4):
--   created_at / updated_at / audit "at" are ALWAYS the real clock.
--   Business dates (document dates, due dates, "today" on dashboards) use app.business_today(),
--   which returns the demo date while demo_mode is on and the real date otherwise.
-- Numbering (stage2.1-document-numbering.md): counters are locked rows, numbers are assigned by a trigger,
--   gapless, and the browser can never choose one. Formats come from the prototype; unconfirmed formats are
--   flagged is_confirmed = false and are usable only while demo_mode is on.

-- ---------------------------------------------------------------------------------------------
-- application_settings
-- ---------------------------------------------------------------------------------------------
create table public.application_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now()
);
create trigger application_settings_touch before update on public.application_settings
  for each row execute function app.set_updated_at();
create trigger audit_application_settings after insert or update or delete on public.application_settings
  for each row execute function app.audit_row();

insert into public.application_settings (key, value, description) values
  ('demo_mode',          'true'::jsonb,         'true = business dates follow demo_today; false = the real calendar date'),
  ('demo_today',         '"2026-09-20"'::jsonb, 'the demonstration "today" (the prototype uses 20 Sep 2026)'),
  ('psi_tolerance_low',  '15'::jsonb,           'found pressure below target minus this is flagged (PSI)'),
  ('psi_tolerance_high', '10'::jsonb,           'found pressure above target plus this is flagged (PSI)');

alter table public.application_settings enable row level security;
alter table public.application_settings force  row level security;
grant select on public.application_settings to authenticated;
create policy gate_active_user on public.application_settings as restrictive for all to authenticated
  using (app.is_active_user()) with check (app.is_active_user());
create policy read_all on public.application_settings for select to authenticated using (true);
-- no write policy: settings change only through admin_set_demo_date (below) or the administrator

-- ---------------------------------------------------------------------------------------------
-- business date and time
-- ---------------------------------------------------------------------------------------------
create function app.business_today() returns date
language sql stable security definer set search_path = '' as $$
  select case
           when coalesce((select (s.value #>> '{}')::boolean from public.application_settings s where s.key = 'demo_mode'), false)
           then (select (s.value #>> '{}')::date from public.application_settings s where s.key = 'demo_today')
           else (now() at time zone 'Asia/Kolkata')::date
         end
$$;

-- the business date combined with the real time of day (India time), as a timestamptz
create function app.business_now() returns timestamptz
language sql stable security definer set search_path = '' as $$
  select (app.business_today()::timestamp + (now() at time zone 'Asia/Kolkata')::time) at time zone 'Asia/Kolkata'
$$;

revoke all on function app.business_today(), app.business_now() from public, anon, authenticated;
grant execute on function app.business_today(), app.business_now() to authenticated;

-- what the front end reads once (it must never use the device clock for business logic)
create function public.get_business_today() returns date
language sql stable security definer set search_path = '' as $$
  select case when app.is_active_user() then app.business_today() end
$$;
revoke all on function public.get_business_today() from public, anon, authenticated;
grant execute on function public.get_business_today() to authenticated;

-- the ONLY way to move the demo date: administrator (service role) or the SQL Editor, never an application user
create function public.admin_set_demo_date(p_date date, p_demo_mode boolean default true, p_operator text default 'admin')
returns date language plpgsql security definer set search_path = '' as $$
begin
  if p_date is null then raise exception 'date is required'; end if;
  update public.application_settings set value = to_jsonb(p_date::text) where key = 'demo_today';
  update public.application_settings set value = to_jsonb(p_demo_mode)   where key = 'demo_mode';
  insert into public.admin_action_log (operator, command, target, outcome, detail)
  values (coalesce(p_operator, 'admin'), 'set-demo-date', p_date::text, 'OK', 'demo_mode=' || p_demo_mode);
  return app.business_today();
end $$;
revoke all on function public.admin_set_demo_date(date, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_set_demo_date(date, boolean, text) to service_role;

-- ---------------------------------------------------------------------------------------------
-- document numbering
-- ---------------------------------------------------------------------------------------------
create table public.document_number_series (
  series_code   text primary key,
  label         text not null,
  template      text not null,                                 -- tokens: {DEP} {YYYY} {YY} {MM} {DD} {SEQ}
  scope         text not null check (scope in ('GLOBAL', 'PER_UNIT')),
  reset_policy  text not null check (reset_policy in ('NEVER', 'YEARLY', 'MONTHLY', 'DAILY')),
  seq_width     smallint not null check (seq_width between 1 and 9),
  start_value   int not null default 1,
  is_active     boolean not null default true,
  is_confirmed  boolean not null,                              -- format seen in the prototype
  evidence_note text,
  question_ref  text
);

create table public.document_sequences (
  series_code text not null references public.document_number_series (series_code),
  scope_key   text not null,        -- the org unit ID (not its code, so a code change never restarts a counter) or '*'
  period_key  text not null,        -- 'ALL', '2026', '2609' or '260920'
  last_value  int  not null,
  primary key (series_code, scope_key, period_key)
);

alter table public.document_number_series enable row level security;  alter table public.document_number_series force row level security;
alter table public.document_sequences     enable row level security;  alter table public.document_sequences     force row level security;
-- deliberately NO grants and NO policies: not reachable from the browser at all

create function app.render_template(p_template text, p_org_unit uuid, p_date date, p_n int, p_width int)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v text := p_template; v_code text;
begin
  if v like '%{DEP}%' then
    select o.code into v_code from public.org_units o where o.id = p_org_unit;
    if v_code is null then raise exception 'this number format needs a depot or unit'; end if;
    v := replace(v, '{DEP}', v_code);
  end if;
  v := replace(v, '{YYYY}', to_char(p_date, 'YYYY'));
  v := replace(v, '{YY}',   to_char(p_date, 'YY'));
  v := replace(v, '{MM}',   to_char(p_date, 'MM'));
  v := replace(v, '{DD}',   to_char(p_date, 'DD'));
  v := replace(v, '{SEQ}',  lpad(p_n::text, p_width, '0'));
  return v;
end $$;

create function app.next_doc_no(p_series text, p_org_unit uuid, p_date date)
returns text language plpgsql security definer set search_path = '' as $$
declare s public.document_number_series; v_scope text; v_period text; v_n int; v_demo boolean;
begin
  select * into s from public.document_number_series where series_code = p_series and is_active;
  if not found then raise exception 'unknown or inactive number series %', p_series; end if;
  v_demo := coalesce((select (a.value #>> '{}')::boolean from public.application_settings a where a.key = 'demo_mode'), false);
  if not s.is_confirmed and not v_demo then
    raise exception 'number series % is not confirmed yet (%); it can be used only in demonstration mode', p_series, coalesce(s.question_ref, 'open question');
  end if;
  if s.scope = 'PER_UNIT' and p_org_unit is null then raise exception 'series % needs a depot or unit', p_series; end if;
  v_scope  := case s.scope when 'GLOBAL' then '*' else p_org_unit::text end;
  v_period := case s.reset_policy when 'NEVER' then 'ALL' when 'YEARLY' then to_char(p_date, 'YYYY')
                                  when 'MONTHLY' then to_char(p_date, 'YYMM') else to_char(p_date, 'YYMMDD') end;
  -- the upsert takes a row lock until the caller's transaction ends, so two sessions can never get the same value;
  -- a rolled-back document rolls its number back too, so numbers have no gaps
  insert into public.document_sequences (series_code, scope_key, period_key, last_value)
  values (p_series, v_scope, v_period, s.start_value)
  on conflict (series_code, scope_key, period_key)
  do update set last_value = public.document_sequences.last_value + 1
  returning last_value into v_n;
  return app.render_template(s.template, p_org_unit, p_date, v_n, s.seq_width);
end $$;

-- BEFORE INSERT trigger for numbered tables: the client's value (if any) is discarded.
-- Usage later:  create trigger ... before insert on public.gins for each row execute function app.assign_doc_no('GIN');
create function app.assign_doc_no() returns trigger
language plpgsql security definer set search_path = '' as $$
declare j jsonb := to_jsonb(new); v_unit uuid := nullif(j ->> 'org_unit_id', '')::uuid;
        v_date date := coalesce(nullif(j ->> 'document_date', '')::date, app.business_today());
begin
  new := jsonb_populate_record(new, jsonb_build_object('doc_no', app.next_doc_no(tg_argv[0], v_unit, v_date)));
  return new;
end $$;

revoke all on function app.render_template(text, uuid, date, int, int), app.next_doc_no(text, uuid, date), app.assign_doc_no()
  from public, anon, authenticated;

-- series from the prototype. is_confirmed = true means the FORMAT was seen; scope and reset are inferred (UQ-41, UQ-42).
insert into public.document_number_series (series_code, label, template, scope, reset_policy, seq_width, is_confirmed, evidence_note, question_ref) values
  ('GIN',    'Goods Issue Note',            'GIN-{DEP}-{YYYY}-{SEQ}',          'PER_UNIT', 'YEARLY',  4, true,  'GIN-MN-2026-0156; Central Store uses unit CS (GIN-CS-2026-0412)', null),
  ('IND',    'Indent',                      'IND-{DEP}-{YYYY}-{SEQ}',          'PER_UNIT', 'YEARLY',  4, true,  'IND-MN-2026-0025, IND-AD-2026-0039, IND-MIC-2026-0007', null),
  ('GRN',    'Goods Receipt Note',          'GRN-{DEP}-IN-{SEQ}',              'PER_UNIT', 'NEVER',   4, true,  'GRN-MN-IN-0041; no year in the format, so continuous (UQ-42)', 'UQ-42'),
  ('GP',     'Gate Pass',                   'GP-{DEP}-{SEQ}',                  'PER_UNIT', 'NEVER',   4, true,  'GP-MN-0072; no year in the format (UQ-42)', 'UQ-42'),
  ('MRN',    'Material Return Note',        'MRN-{DEP}-{SEQ}',                 'PER_UNIT', 'NEVER',   3, true,  'MRN-MN-004', 'UQ-42'),
  ('DRN',    'Discrepancy / warranty note', 'DRN-{DEP}-{SEQ}',                 'PER_UNIT', 'NEVER',   3, true,  'DRN-MN-003', 'UQ-42'),
  ('RO',     'Removal Order',               'RO-{DEP}-{YYYY}-{SEQ}',           'PER_UNIT', 'YEARLY',  4, true,  'RO-MN-2026-2902', null),
  ('FO',     'Fitment Order',               'FO-{DEP}-{YYYY}-{SEQ}',           'PER_UNIT', 'YEARLY',  4, true,  'FO-MN-2026-3012', null),
  ('PFR',    'Premature Failure Report',    'PFR-{DEP}-{YYYY}-{SEQ}',          'PER_UNIT', 'YEARLY',  3, true,  'PFR-MN-2026-001', null),
  ('RQ',     'Premature failure request',   'RQ-{YYYY}-{SEQ}',                 'GLOBAL',   'YEARLY',  3, true,  'RQ-2026-003; no depot code in the format (UQ-41)', 'UQ-41'),
  ('DR',     'Tyre damage request',         'DR-{YYYY}-{SEQ}',                 'GLOBAL',   'YEARLY',  3, true,  'DR-2026-001; no depot code in the format (UQ-41)', 'UQ-41'),
  ('PI',     'Purchase Indent',             'PI-HO-{YYYY}-{SEQ}',              'GLOBAL',   'YEARLY',  3, true,  'PI-HO-2026-001', null),
  ('AR',     'Allocation Request',          'AR-{SEQ}',                        'GLOBAL',   'NEVER',   3, true,  'AR-003; no year or unit in the format', null),
  ('JC_ST',  'Job card - Setting',          'JC-ST-{YY}{MM}-{DD}-{SEQ}',       'GLOBAL',   'DAILY',   2, true,  'JC-ST-2609-20-01; daily scope and depot scope inferred (UQ-41)', 'UQ-41'),
  ('JC_US',  'Job card - Unsetting',        'JC-US-{YY}{MM}-{DD}-{SEQ}',       'GLOBAL',   'DAILY',   2, true,  'JC-US-2609-20-01 (UQ-41)', 'UQ-41'),
  ('JC_CEN', 'Job card - Census',           'JC-CEN-{YY}{MM}-{DD}-{SEQ}',      'GLOBAL',   'DAILY',   3, true,  'JC-CEN-2609-20-001 (UQ-41)', 'UQ-41'),
  -- provisional: format or scope not settled; usable in demonstration mode only
  ('WSR',    'Material request (WSR)',      'WSR-{DEP}-{YY}{MM}-{SEQ}',        'PER_UNIT', 'MONTHLY', 4, false, 'three variants seen in the prototype', 'UQ-40'),
  ('JC',     'Job card',                    'JC-{SEQ}',                        'GLOBAL',   'NEVER',   4, false, 'JC-6063; one national counter or per depot is open', 'UQ-41'),
  ('JID',    'Job ID (task)',               'JID-{SEQ}',                       'GLOBAL',   'NEVER',   4, false, 'JID-4021', 'UQ-41'),
  ('CMPID',  'Complaint',                   'CMPID-{SEQ}',                     'GLOBAL',   'NEVER',   4, false, 'CMPID-0505', 'UQ-41'),
  ('SCHID',  'Schedule instance id',        'SCHID-{SEQ}',                     'GLOBAL',   'NEVER',   4, false, 'SCHID-4001', 'UQ-41'),
  ('SKR',    'Skill request',               'SKR-{SEQ}',                       'GLOBAL',   'NEVER',   3, false, 'SKR-003', 'UQ-41'),
  ('SCR',    'Shift change request',        'SCR-{SEQ}',                       'GLOBAL',   'NEVER',   3, false, 'SCR-018', 'UQ-41'),
  ('ICRN',   'ICRN (inward receipt)',       'ICRN-{DEP}-{YYYY}-{SEQ}',         'PER_UNIT', 'YEARLY',  4, false, 'ICRN-MN-2026-0230; meaning unknown, second style ICRN2601000000', 'UQ-36'),
  ('TRS_GIN','GIN from a TRS unit',         'TRS-GIN-{YY}{MM}-{SEQ}',          'GLOBAL',   'MONTHLY', 2, false, 'TRS-GIN-2609-01; no TRS unit code in the format', 'UQ-43');
