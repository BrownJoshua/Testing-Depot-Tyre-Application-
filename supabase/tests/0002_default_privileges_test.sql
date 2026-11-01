-- Test for migration 0002. Safe to run: everything happens inside a transaction that is rolled back.
-- Run in the Supabase SQL Editor AFTER 0002 has been applied.
-- Success = "Success. No rows returned".  Failure = an error naming the broken expectation.

begin;

create table public._t_default_priv (id int);
create sequence public._s_default_priv;
create function public._f_default_priv() returns int language sql as 'select 1';

do $$
begin
  assert not has_table_privilege('anon',          'public._t_default_priv', 'select'), 'anon can SELECT a new table';
  assert not has_table_privilege('authenticated', 'public._t_default_priv', 'select'), 'authenticated can SELECT a new table';
  assert not has_table_privilege('anon',          'public._t_default_priv', 'insert'), 'anon can INSERT into a new table';
  assert not has_table_privilege('authenticated', 'public._t_default_priv', 'insert'), 'authenticated can INSERT into a new table';
  assert not has_sequence_privilege('anon',          'public._s_default_priv', 'usage'), 'anon can use a new sequence';
  assert not has_sequence_privilege('authenticated', 'public._s_default_priv', 'usage'), 'authenticated can use a new sequence';
  assert not has_function_privilege('anon',          'public._f_default_priv()', 'execute'), 'anon can EXECUTE a new function';
  assert not has_function_privilege('authenticated', 'public._f_default_priv()', 'execute'), 'authenticated can EXECUTE a new function';
  assert has_table_privilege('service_role', 'public._t_default_priv', 'select'), 'service_role lost its default access (admin script would break)';
  assert not has_schema_privilege('anon', 'public', 'create'), 'anon can create objects in public';
  assert not has_schema_privilege('authenticated', 'public', 'create'), 'authenticated can create objects in public';
end $$;

rollback;
