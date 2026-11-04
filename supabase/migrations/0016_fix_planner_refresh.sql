-- 0016: fix for public.planner_refresh from 0015. The column alias "n" clashed with the function's own variable "n"
-- (PostgreSQL error 42702), so the function never ran. Same behaviour, aliases and variable renamed.
create or replace function public.planner_refresh(p_from date, p_to date) returns int
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.create'); v_count int;
begin
  if p_from is null or p_to is null or p_to < p_from then raise exception 'choose a valid date range'; end if;
  if p_to - p_from > 62 then raise exception 'choose a range of at most 62 days'; end if;
  with grp as (
    select g.id as group_id, g.schedule_id, r.id as rev, r.first_schedule_date as first_date, s.every_n_days as step_days,
           s.uses_working_days as wd, s.effective_from as eff_from
    from public.fleet_groups g
    join public.fleet_group_revisions r on r.id = g.current_revision_id
    join public.maintenance_schedules s on s.id = g.schedule_id and s.status = 'ACTIVE'
    where g.org_unit_id = e.org_unit_id and g.status = 'ACTIVE'),
  days as (
    select grp.*, gs.day::date as due_day,
           case when grp.wd then (row_number() over (partition by grp.group_id order by gs.day) - 1)
                else (gs.day::date - grp.first_date) end as k
    from grp, generate_series(grp.first_date::timestamp, p_to::timestamp, interval '1 day') as gs(day)
    where not grp.wd or extract(dow from gs.day) <> 0),
  due as (select * from days where due_day >= p_from and due_day >= eff_from and k % step_days = 0)
  insert into public.schedule_instances (org_unit_id, schedule_id, group_id, fleet_id, due_date)
  select e.org_unit_id, due.schedule_id, due.group_id, m.fleet_id, due.due_day
  from due
  join public.fleet_group_revision_members m on m.revision_id = due.rev
  join public.fleets f on f.id = m.fleet_id and f.status = 'ACTIVE'
  on conflict (schedule_id, fleet_id, due_date) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function public.planner_refresh(date, date) from public, anon;
grant execute on function public.planner_refresh(date, date) to authenticated;
