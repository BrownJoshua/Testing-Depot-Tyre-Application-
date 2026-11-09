-- 0026: a Rework Job ID (new Job ID of the same Job Code and tyre) has no Removal / Fitment Order of its own.
-- The tyre movement was already made by the first Job ID, so the hook must do nothing when there is no order.
create or replace function app.on_change_job_done(p_job uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare j public.job_ids; v_code text; today date := app.business_today(); o public.fleet_orders;
begin
  select * into j from public.job_ids where id = p_job;
  select job_code into v_code from public.maintenance_jobs where id = j.job_code_id;
  if v_code not in ('JOB-008', 'JOB-009', 'JOB-010', 'JOB-011') then return; end if;
  if v_code = 'JOB-008' then
    select * into o from public.fleet_orders where job_id_ref = p_job and part = 'TYRE';
    if found then
      update public.tyres set stock_place = 'IN_TRANSIT', transit_status = 'IN_TRANSIT', fleet_id = null, fitted_position = null, removal_date = today, removal_reason = o.reason where id = j.tyre_id;
      update public.mrns set ready = true where job_id_ref = p_job;
    end if;
  elsif v_code = 'JOB-011' then
    update public.tyres set setting_status = 'UNSET' where id = j.tyre_id;
  elsif v_code = 'JOB-010' then
    update public.tyres set setting_status = 'SET' where id = j.tyre_id;
    update public.stock_items set stock_place = 'FITTED', tyre_id = j.tyre_id where id in (select item_id from public.fleet_orders where job_id_ref = p_job and order_type = 'FITMENT' and item_id is not null);
  elsif v_code = 'JOB-009' then
    select * into o from public.fleet_orders where job_id_ref = p_job and part = 'TYRE' and order_type = 'FITMENT';
    if found then
      update public.tyres set stock_place = 'FITTED', fleet_id = o.fleet_id, fitted_position = o.position, fitted_date = today, transit_status = null, stock_category = null where id = j.tyre_id;
    end if;
  end if;
  update public.fleet_orders set status = 'DONE', done_at = now(), done_by = j.done_by where job_id_ref = p_job;
end $$;
