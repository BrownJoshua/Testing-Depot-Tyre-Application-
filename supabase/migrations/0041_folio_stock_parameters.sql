-- 0041: D1 Live Tyre Stock parameters per folio (Minimum Stk, Maximum Stock, Backorder Qty, Weighted Average Rate) from the prototype sample.
create table public.folio_stock_params (
  folio_id      uuid primary key references public.tyre_folios (id),
  min_stock     int not null default 0 check (min_stock >= 0),
  max_stock     int not null default 0 check (max_stock >= 0),
  backorder_qty int not null default 0 check (backorder_qty >= 0),
  avg_rate      numeric(12,2) not null default 0 check (avg_rate >= 0)
);
insert into public.folio_stock_params (folio_id, min_stock, max_stock, backorder_qty, avg_rate)
select f.id, v.mn, v.mx, v.bo, v.rt from (values
  ('F7001', 2, 12, 0, 5880),
  ('F7004', 26, 156, 8, 7400),
  ('F7007', 1, 6, 1, 6000),
  ('F7011', 1, 6, 1, 6200),
  ('F7012', 1, 6, 1, 6200),
  ('F7013', 1, 6, 0, 5880),
  ('F7014', 11, 66, 5, 7400),
  ('F7015', 1, 6, 1, 7400),
  ('F7016', 1, 6, 0, 6800),
  ('F7017', 8, 48, 0, 6000),
  ('F7018', 1, 6, 0, 5200),
  ('F7019', 1, 6, 0, 8200),
  ('F7020', 1, 6, 1, 5880),
  ('F7021', 1, 6, 1, 6000),
  ('F7022', 1, 6, 0, 6800),
  ('F7023', 1, 6, 0, 6800),
  ('F7024', 1, 6, 0, 5200),
  ('F7025', 1, 6, 0, 5200),
  ('F7026', 1, 6, 0, 8200)
) as v(folio_no, mn, mx, bo, rt) join public.tyre_folios f on f.folio_no = v.folio_no;
alter table public.folio_stock_params enable row level security; alter table public.folio_stock_params force row level security;
grant select on public.folio_stock_params to authenticated;
create policy gate_active_user on public.folio_stock_params as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy read_all on public.folio_stock_params for select to authenticated using (true);
