-- 0031: HO and AM have no depot, so app.actor() (depot staff only) cannot be used for the Purchase Indent functions. Fix forward.
create or replace function public.purchase_indent_create(p_type text, p_group text, p_source text, p_lines jsonb, p_remarks text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare v_no text; x jsonb;
begin
  if app.my_role() is distinct from 'HO' or not app.has_capability('purchase.raise') then raise exception 'only HO (Tech) may raise a Purchase Indent' using errcode = 'insufficient_privilege'; end if;
  if p_type not in ('Supplementary Indent', '(AWR) Indent', 'Emergency Indent') then raise exception 'choose the indent type'; end if;
  if p_group not in ('Tyre', 'Tube', 'Flap', 'Disc') then raise exception 'choose the folio group'; end if;
  if p_source not in ('Central Store', 'Depot Store', 'All') then raise exception 'choose the source'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'add at least one folio with a quantity'; end if;
  for x in select * from jsonb_array_elements(p_lines) loop
    if not exists (select 1 from public.tyre_folios where id = nullif(x ->> 'folio_id', '')::uuid and status = 'ACTIVE') then raise exception 'choose an active folio on every line'; end if;
    if coalesce((x ->> 'qty')::int, 0) < 1 then raise exception 'every quantity must be at least 1'; end if;
  end loop;
  v_no := app.next_doc_no('PI', null, app.business_today());
  insert into public.purchase_indents (indent_no, indent_type, folio_group, source, lines, remarks, requested_by) values (v_no, p_type, p_group, p_source, p_lines, nullif(btrim(p_remarks), ''), app.my_employee_id());
  return v_no;
end $$;

create or replace function public.purchase_indent_decide(p_indent uuid, p_issue boolean, p_remarks text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare i public.purchase_indents;
begin
  if app.my_role() is distinct from 'AM' or not app.has_capability('purchase.decide') then raise exception 'only AM (Tech) may issue or revert a Purchase Indent' using errcode = 'insufficient_privilege'; end if;
  select * into i from public.purchase_indents where id = p_indent for update;
  if not found then raise exception 'indent not found'; end if;
  if i.status <> 'PENDING_APPROVAL' then raise exception 'this indent is already %', i.status; end if;
  if not p_issue and length(btrim(coalesce(p_remarks, ''))) = 0 then raise exception 'say why the indent is reverted'; end if;
  update public.purchase_indents set status = case when p_issue then 'ISSUED' else 'REVERTED' end, decided_by = app.my_employee_id(), decided_at = now(), decision_remarks = nullif(btrim(p_remarks), '') where id = p_indent;
end $$;
