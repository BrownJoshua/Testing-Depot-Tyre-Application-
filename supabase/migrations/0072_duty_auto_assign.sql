-- 0072: assign work from Duty Posting.
--   duty_posted_for       who is posted to a Schedule Code / Job Code on a day AND really on duty (own roster says SHIFT, shift matches)
--   schedule_assign_auto  Assign Technician with the posted people
--   duty_move_absent      a posted person who is on weekly off / leave on the due date is replaced by another posted person on duty

create function public.duty_posted_for(p_schedule uuid, p_job_code uuid, p_date date, p_shift uuid default null) returns table (employee_id uuid)
language sql stable security invoker set search_path = '' as $$
  select distinct p.employee_id
    from public.duty_postings p
    join public.hrms_roster r on r.employee_id = p.employee_id and r.duty_date = p.duty_date and r.kind = 'SHIFT'
   where p.duty_date = p_date
     and p.schedule_id is not distinct from p_schedule and p.job_code_id is not distinct from p_job_code
     and (p_shift is null or r.shift_id = p_shift) and (p.shift_id is null or p.shift_id = r.shift_id)
$$;

create function public.schedule_assign_auto(p_run uuid, p_items uuid[], p_due date default null, p_shift uuid default null, p_remarks text default null) returns int
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.assign'); r public.schedule_runs; v_due date; v_emps uuid[];
begin
  select * into r from public.schedule_runs where id = p_run and org_unit_id = e.org_unit_id;
  if not found then raise exception 'Schedule ID not found in your depot'; end if;
  if p_items is null or cardinality(p_items) = 0 then raise exception 'select at least one chart row'; end if;
  v_due := coalesce(p_due, greatest((select min(due_date) from public.schedule_items where id = any (p_items)), app.business_today()));
  select array_agg(distinct p.employee_id) into v_emps
    from public.duty_postings p join public.hrms_roster h on h.employee_id = p.employee_id and h.duty_date = p.duty_date and h.kind = 'SHIFT'
   where p.org_unit_id = e.org_unit_id and p.duty_date = v_due and p.schedule_id = r.schedule_id
     and (p_shift is null or h.shift_id = p_shift) and (p.shift_id is null or p.shift_id = h.shift_id);
  if v_emps is null then raise exception 'nobody posted to this schedule is on duty on % (post people in Duty Posting, or choose the Tyre Men yourself)', v_due; end if;
  return public.schedule_assign(p_run, p_items, v_emps, v_due, p_shift, coalesce(nullif(btrim(p_remarks), ''), 'Assigned from Duty Posting'));
end $$;

-- p_date: due date to look at. Returns {"moved": n, "unresolved": n}
create function public.duty_move_absent(p_date date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.assign'); a record; v_new uuid; v_moved int := 0; v_unres int := 0; v_sched uuid;
begin
  for a in select j.id as job, j.job_card_id, j.job_code_id, j.due_shift_id, x.employee_id
             from public.job_ids j join public.job_id_assignees x on x.job_id_ref = j.id
             join public.hrms_roster h on h.employee_id = x.employee_id and h.duty_date = p_date and h.kind <> 'SHIFT'
            where j.org_unit_id = e.org_unit_id and j.status = 'ASSIGNED' and j.due_date = p_date loop
    select r.schedule_id into v_sched from public.job_cards c join public.schedule_runs r on r.id = c.schedule_run_id where c.id = a.job_card_id;
    select p.employee_id into v_new
      from public.duty_postings p join public.hrms_roster h on h.employee_id = p.employee_id and h.duty_date = p.duty_date and h.kind = 'SHIFT'
     where p.org_unit_id = e.org_unit_id and p.duty_date = p_date
       and ((v_sched is not null and p.schedule_id = v_sched) or p.job_code_id = a.job_code_id)
       and (a.due_shift_id is null or h.shift_id = a.due_shift_id)
       and not exists (select 1 from public.job_id_assignees z where z.job_id_ref = a.job and z.employee_id = p.employee_id)
     order by (select count(*) from public.job_id_assignees z join public.job_ids q on q.id = z.job_id_ref where z.employee_id = p.employee_id and q.status in ('ASSIGNED', 'STARTED') and q.due_date = p_date), p.employee_id
     limit 1;
    if v_new is null then v_unres := v_unres + 1; continue; end if;
    delete from public.job_id_assignees where job_id_ref = a.job and employee_id = a.employee_id;
    insert into public.job_id_assignees (job_id_ref, employee_id) values (a.job, v_new);
    perform app.log_event(a.job_card_id, a.job, 'MOVED_FROM_ABSENT', e.id, 'assignee was off duty on ' || p_date);
    v_moved := v_moved + 1;
  end loop;
  return jsonb_build_object('moved', v_moved, 'unresolved', v_unres);
end $$;

revoke all on function public.duty_posted_for(uuid, uuid, date, uuid), public.schedule_assign_auto(uuid, uuid[], date, uuid, text), public.duty_move_absent(date) from public, anon;
grant execute on function public.duty_posted_for(uuid, uuid, date, uuid), public.schedule_assign_auto(uuid, uuid[], date, uuid, text), public.duty_move_absent(date) to authenticated;
