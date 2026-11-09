-- 0032: the three sample Purchase Indents use PI-HO-2026-001..003, so the 2026 counter continues from 3.
insert into public.document_sequences (series_code, scope_key, period_key, last_value) values ('PI', '*', '2026', 3)
on conflict (series_code, scope_key, period_key) do update set last_value = greatest(public.document_sequences.last_value, 3);
