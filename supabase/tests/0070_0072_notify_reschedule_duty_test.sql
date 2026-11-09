-- Test for migrations 0070-0072 (notifications, reschedule requests, assignment from Duty Posting). Rolled back.
begin;

create function public.t_as(who text) returns void language plpgsql as $$
declare v_sub text;
begin
  execute 'reset role';
  select p.id::text into v_sub from public.profiles p join public.employees e on e.id = p.employee_id
   where e.employee_code = case who when 'ho' then 'HOT-0114' when 'am' then 'HOT-AE-021' when 'sup' then 'SUP-2231' when 'tic' then 'TIC-1147' else 'TM-3092' end;
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_sub), true);
  execute 'set local role authenticated';
end $$;
grant execute on function public.t_as(text) to authenticated;

do $$
declare
  tic uuid; tm uuid; f1 uuid; ctype uuid; cmp uuid; card uuid; card2 uuid; n int; ok boolean; today date; req uuid; ty uuid; d date;
  sch uuid; run uuid; items uuid[]; r jsonb; v_old uuid;
begin
  select id into tic from public.employees where employee_code = 'TIC-1147';
  select id into tm from public.employees where employee_code = 'TM-3092';
  select id into f1 from public.fleets where fleet_no = 'J0264';
  select id into ctype from public.complaint_types where status = 'ACTIVE' order by complaint_code limit 1;
  select id into sch from public.maintenance_schedules where schedule_code = 'SCH001';
  today := app.business_today();

  -- complaint raised by the Tyre Man -> Tyre IC is notified
  select count(*) into n from public.notifications where recipient_id = tic and kind = 'COMPLAINT';
  perform public.t_as('tm');
  cmp := public.raise_complaint(f1, null, ctype, 'notify test');
  execute 'reset role';
  assert (select count(*) from public.notifications where recipient_id = tic and kind = 'COMPLAINT') = n + 1, 'the Tyre IC is told of the complaint';

  -- job card + inspection assigned -> the inspector is notified
  perform public.t_as('tic');
  card := public.job_card_create('COMPLAINT', f1, '{}', '{}', array[cmp]);
  perform public.job_card_assign_inspection(card, tm);
  perform public.t_as('tm');
  assert (select count(*) from public.notification_feed() where kind = 'INSPECTION' and read_at is null) >= 1, 'the Tyre Man is told of the inspection';
  assert public.notification_mark_read() >= 1, 'mark all read';
  assert (select count(*) from public.notification_feed() where read_at is null) = 0, 'nothing unread after marking';
  perform public.t_as('tic');
  assert (select count(*) from public.notifications) = (select count(*) from public.notifications where recipient_id = tic), 'a user sees only his own notifications';

  -- HO / AM overdue bell: a card whose due date has passed shows the day after
  perform public.t_as('tic');
  card2 := public.job_card_create('JOB_CODE', f1, array[(select id from public.tyres where fleet_id = f1 and stock_place = 'FITTED' limit 1)], array['JOB-001'], '{}', '[]', today - 3);
  perform public.t_as('ho');
  assert exists (select 1 from public.notification_feed() where kind = 'OVERDUE' and job_card_id = card2), 'HO bell lists the overdue card';
  perform public.t_as('tic');
  assert not exists (select 1 from public.notification_feed() where kind = 'OVERDUE'), 'the Tyre IC has no overdue bell';

  -- reschedule request: Tyre Man asks, Tyre IC decides
  perform public.t_as('tic'); perform public.job_card_assign_work(card2, array[tm], null, today + 1);
  perform public.t_as('tm');
  begin perform public.reschedule_request(card2, today + 3, ''); ok := false; exception when others then ok := true; end;
  assert ok, 'a reason is required';
  begin perform public.reschedule_request(card2, today + 1, 'same day'); ok := false; exception when others then ok := true; end;
  assert ok, 'a different date is required';
  req := public.reschedule_request(card2, today + 3, 'tyre not ready');
  begin perform public.reschedule_request(card2, today + 4, 'again'); ok := false; exception when others then ok := true; end;
  assert ok, 'only one pending request per card';
  begin perform public.reschedule_decide(req, true, null); ok := false; exception when others then ok := true; end;
  assert ok, 'a Tyre Man cannot decide';
  execute 'reset role';
  assert (select kind from public.reschedule_requests where id = req) = 'POSTPONE', 'later date is a postpone';
  assert exists (select 1 from public.notifications where recipient_id = tic and kind = 'RESCHEDULE'), 'the Tyre IC is told of the request';
  perform public.t_as('tic');
  begin perform public.reschedule_decide(req, false, ''); ok := false; exception when others then ok := true; end;
  assert ok, 'rejecting needs a reason';
  perform public.reschedule_decide(req, true, 'ok');
  execute 'reset role';
  assert (select expected_date from public.job_cards where id = card2) = today + 3, 'the card moved';
  assert (select count(*) from public.job_ids where job_card_id = card2 and due_date = today + 3) >= 1, 'the Job IDs moved';
  assert exists (select 1 from public.notifications where recipient_id = tm and kind = 'RESCHEDULE'), 'the Tyre Man is told of the decision';

  -- assignment from Duty Posting
  select h1.duty_date into d from public.hrms_roster h1 join public.hrms_roster h2 on h2.duty_date = h1.duty_date and h2.employee_id = tic and h2.kind = 'SHIFT'
   where h1.employee_id = tm and h1.kind = 'SHIFT' and h1.duty_date > today + 3 order by h1.duty_date limit 1;
  perform public.t_as('tic');
  assert (select count(*) from public.duty_posted_for(sch, null, d, null)) = 0, 'nobody posted yet';
  run := public.schedule_run_create(sch, d, d + 3, array[f1]);
  select array_agg(id) into items from public.schedule_items where run_id = run;
  begin perform public.schedule_assign_auto(run, items, d); ok := false; exception when others then ok := true; end;
  assert ok, 'auto-assign refuses when nobody is posted';
  perform public.duty_post(array[tm], sch, null, array[d]);
  assert (select count(*) from public.duty_posted_for(sch, null, d, null)) = 1, 'the posted Tyre Man is on duty';
  n := public.schedule_assign_auto(run, items, d);
  assert n >= 1, 'a card was made: ' || n;
  execute 'reset role';
  select j.id into v_old from public.job_ids j join public.job_cards c on c.id = j.job_card_id where c.schedule_run_id = run limit 1;
  assert exists (select 1 from public.job_id_assignees where job_id_ref = v_old and employee_id = tm), 'assigned to the posted Tyre Man';

  -- the posted Tyre Man is on leave that day: the work moves to another posted person
  update public.hrms_roster set kind = 'L', shift_id = null where employee_id = tm and duty_date = d;
  perform public.t_as('tic');
  perform public.duty_post(array[tic], sch, null, array[d]);
  r := public.duty_move_absent(d);
  assert (r ->> 'moved')::int >= 1, 'moved from the absent person: ' || r::text;
  execute 'reset role';
  assert exists (select 1 from public.job_id_assignees where job_id_ref = v_old and employee_id = tic), 'now assigned to the other posted person';
  assert not exists (select 1 from public.job_id_assignees where job_id_ref = v_old and employee_id = tm), 'the absent person is removed';

  raise notice 'PASS: 0070-0072';
end $$;

rollback;
