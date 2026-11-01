-- 0007: the five demonstration personas (one per role) as employee records.
-- STATUS: proposed in Stage 3, NOT applied. Review and approve before running.
--
-- * Employee IDs are retained from the prototype (HOT-0114, HOT-AE-021, SUP-2231, TIC-1147, TM-3092).
--   The prototype's AE (HOT-AE-021) is the AM (Tech) role in the rebuilt application.
-- * Names are FICTIONAL. Phone numbers use an invalid pattern. No Aadhaar, no real personal data.
-- * Every row is marked is_demo = true.
-- * This is a baseline load, like the depots in 0004. From now on employee records are changed only
--   through the HO -> AM master workflow (built in Stage 4).
-- * No login accounts are created here. Accounts are created afterwards by the administrator script
--   (supabase/admin/create-users.mjs), which reads these rows.

insert into public.employees
  (employee_code, full_name, role_code, org_unit_id, designation_label, phone_demo, is_login_enabled, is_demo)
values
  ('HOT-0114',   'Tharun Velmaran',   'HO',  null,
     'HO (Tech) - demonstration user',        '+91 00000 00001', true, true),
  ('HOT-AE-021', 'Madhura Kesavin',   'AM',  null,
     'AM (Tech) - demonstration user',        '+91 00000 00002', true, true),
  ('SUP-2231',   'Iniyan Pallavan',   'SUP', (select id from public.org_units where code = 'MN'),
     'Supervisor, Mandaveli - demonstration user', '+91 00000 00003', true, true),
  ('TIC-1147',   'Nandhini Arvindar', 'TIC', (select id from public.org_units where code = 'MN'),
     'Tyre IC, Mandaveli - demonstration user',    '+91 00000 00004', true, true),
  ('TM-3092',    'Kavinesh Murugar',  'TM',  (select id from public.org_units where code = 'MN'),
     'Tyre Man, Mandaveli - demonstration user',   '+91 00000 00005', true, true);
