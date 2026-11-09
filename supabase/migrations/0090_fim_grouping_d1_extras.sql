-- 0090: top-25 items 7, 17, 20
--   7  Final Inspection Master (FIM-nnn, HO master approved by AM) used as the checklist of the Final Inspection;
--      Final inspection - selected (several cards at once)
--   17 Fleet Grouping to D1: a group is saved and Active at once (no approval), a fleet is in one group per schedule,
--      the Edit groups board saves all groups in one go
--   20 Replace selected (reassign the Tyre Men of assigned schedule cards)

-- ---------------------------------------------------------------------------------------------
-- 7. Final Inspection Master
-- ---------------------------------------------------------------------------------------------
create table public.fim_checklists (
  id              uuid primary key default gen_random_uuid(),
  fim_code        text not null unique check (fim_code ~ '^FIM-[0-9]{3}$'),
  title           text not null check (length(btrim(title)) between 3 and 60),
  applies_codes   text[] not null check (cardinality(applies_codes) between 1 and 12),      -- Schedule Codes (SCH001) and Job Codes (JOB-008)
  checklist_items text[] not null check (cardinality(checklist_items) between 1 and 20),
  status          public.master_status not null default 'ACTIVE',
  row_version     int not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger audit_fim_checklists after insert or update or delete on public.fim_checklists for each row execute function app.audit_row();
create trigger fim_checklists_touch before update on public.fim_checklists for each row execute function app.set_updated_at();
insert into public.fim_checklists (fim_code, title, applies_codes, checklist_items) values
  ('FIM-001', 'Air Inflation',  '{SCH001}', '{"PSI within norm on all tyres","No air leak at the valve"}'),
  ('FIM-002', 'Nitrogen Inflation', '{SCH002}', '{"PSI within norm on all tyres","No air leak at the valve"}'),
  ('FIM-003', 'Inspection',     '{SCH003}', '{"All tyres checked","Every defect raised as a complaint"}'),
  ('FIM-004', 'Tyre Rotation',  '{SCH004}', '{"Tyres in the new positions","Wheel nuts tightened to torque"}'),
  ('FIM-005', 'Tyre Discout',   '{SCH005}', '{"Same tube, flap and disc refitted","Powder applied"}'),
  ('FIM-006', 'Census',         '{SCH007}', '{"NSD recorded for all grooves","Tyre numbers match the fleet","Wear pattern selected for every tyre"}'),
  ('FIM-007', 'Tyre Changing',  '{JOB-008,JOB-009,JOB-010,JOB-011}', '{"Removed tyre moved to the yard","Fitted tyre number matches the job card","Wheel nuts tightened to torque","PSI within norm"}');

create function app.fim_list(p text, p_key text) returns text[] language sql immutable set search_path = '' as $$
  select array_remove(regexp_split_to_array(btrim(coalesce(p, '')), E'\\s*[\\n,]\\s*'), '')
$$;
create function app.validate_fim(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare c text;
begin
  perform app.check_keys(p, array['fim_code', 'title', 'applies_codes', 'checklist_items']);
  if p ? 'fim_code' and (p ->> 'fim_code') !~ '^FIM-[0-9]{3}$' then raise exception 'Final Inspection ID must look like FIM-008'; end if;
  if p ? 'fim_code' and exists (select 1 from public.fim_checklists where fim_code = p ->> 'fim_code') then raise exception '% already exists', p ->> 'fim_code'; end if;
  if p ? 'title' and length(btrim(coalesce(p ->> 'title', ''))) < 3 then raise exception 'the title is required'; end if;
  if p ? 'applies_codes' then
    if cardinality(app.fim_list(p ->> 'applies_codes', 'x')) = 0 then raise exception 'give the Schedule Code or Job Code it applies to'; end if;
    foreach c in array app.fim_list(p ->> 'applies_codes', 'x') loop
      if not exists (select 1 from public.maintenance_schedules where schedule_code = c) and not exists (select 1 from public.maintenance_jobs where job_code = c) then
        raise exception '% is not a Schedule Code or a Job Code', c; end if;
    end loop;
  end if;
  if p ? 'checklist_items' and cardinality(array_remove(regexp_split_to_array(btrim(coalesce(p ->> 'checklist_items', '')), E'\\s*\\n\\s*'), '')) = 0 then raise exception 'add at least one checklist item'; end if;
end $$;
create function app.apply_fim(p_request uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r public.master_change_requests := app.request_row(p_request, 'final_inspection_master'); p jsonb := r.proposed_payload; v_items text[]; v_codes text[];
begin
  perform app.validate_fim(p);
  if p ? 'checklist_items' then v_items := array_remove(regexp_split_to_array(btrim(p ->> 'checklist_items'), E'\\s*\\n\\s*'), ''); end if;
  if p ? 'applies_codes' then v_codes := app.fim_list(p ->> 'applies_codes', 'x'); end if;
  if r.action = 'CREATE' then
    if not (p ? 'fim_code' and p ? 'title' and p ? 'applies_codes' and p ? 'checklist_items') then raise exception 'a new checklist needs an ID, a title, the codes it applies to and its items'; end if;
    insert into public.fim_checklists (id, fim_code, title, applies_codes, checklist_items) values (r.target_id, p ->> 'fim_code', btrim(p ->> 'title'), v_codes, v_items);
  else
    if not exists (select 1 from public.fim_checklists where id = r.target_id) then raise exception 'checklist not found'; end if;
    update public.fim_checklists set status = case r.action when 'DEACTIVATE' then 'INACTIVE'::public.master_status when 'REACTIVATE' then 'ACTIVE'::public.master_status else status end,
      title = case when p ? 'title' then btrim(p ->> 'title') else title end, applies_codes = coalesce(v_codes, applies_codes),
      checklist_items = coalesce(v_items, checklist_items), row_version = row_version + 1 where id = r.target_id;
  end if;
end $$;
revoke all on function app.fim_list(text, text), app.validate_fim(jsonb), app.apply_fim(uuid) from public, anon, authenticated;
insert into public.master_entity_registry (entity_type, label, target_table, validate_function, apply_function, is_enabled)
values ('final_inspection_master', 'Final Inspection Master', 'fim_checklists', 'validate_fim', 'apply_fim', true);

alter table public.fim_checklists enable row level security; alter table public.fim_checklists force row level security;
grant select on public.fim_checklists to authenticated;
create policy gate_active_user on public.fim_checklists as restrictive for all to authenticated using (app.is_active_user()) with check (app.is_active_user());
create policy read_all_active on public.fim_checklists for select to authenticated using (true);

-- the answers of the checklist are kept with the Final Inspection
alter table public.final_inspections add column checklist jsonb;

drop function public.final_inspection(uuid, text, text, uuid[]);
-- p_checklist: [{"item": text, "pass": boolean}]; a Pass result needs every item passed
create function public.final_inspection(p_card uuid, p_result text, p_remarks text default null, p_rework_jobs uuid[] default '{}', p_checklist jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job.final_inspect'); c public.job_cards; j public.job_ids; v_new uuid; w uuid; x uuid; i jsonb;
begin
  select * into c from public.job_cards where id = p_card and org_unit_id = e.org_unit_id for update;
  if not found then raise exception 'job card not found in your depot'; end if;
  if c.status not in ('FINAL_INSPECTION', 'FINAL_INSPECTION_FAILED') then raise exception 'the job card is %, not at final inspection', c.status; end if;
  if p_result not in ('PASS', 'FAIL', 'REWORK') then raise exception 'result must be PASS, FAIL or REWORK'; end if;
  if p_result <> 'PASS' and length(btrim(coalesce(p_remarks, ''))) = 0 then raise exception 'please say what is wrong (remarks are required for Fail and Rework)'; end if;
  if p_checklist is not null then
    if jsonb_typeof(p_checklist) <> 'array' then raise exception 'the checklist must be a list'; end if;
    for i in select * from jsonb_array_elements(p_checklist) loop
      if not (i ? 'item' and i ? 'pass') then raise exception 'every checklist line needs an item and a pass / fail'; end if;
      if p_result = 'PASS' and not (i ->> 'pass')::boolean then raise exception 'cannot pass the job card: "%" is marked Fail', i ->> 'item'; end if;
    end loop;
  end if;
  insert into public.final_inspections (job_card_id, inspector_id, result, remarks, checklist) values (p_card, e.id, p_result, nullif(btrim(p_remarks), ''), p_checklist);
  if p_result = 'PASS' then
    update public.job_cards set status = 'COMPLETED', completed_at = now() where id = p_card;
    update public.complaints set state = 'CLOSED' where job_card_id = p_card and state = 'APPROVED';
  elsif p_result = 'FAIL' then
    update public.job_cards set status = 'FINAL_INSPECTION_FAILED' where id = p_card;
  else
    if coalesce(cardinality(p_rework_jobs), 0) = 0 then raise exception 'choose the Job IDs to redo'; end if;
    foreach x in array p_rework_jobs loop
      select * into j from public.job_ids where id = x and job_card_id = p_card and status = 'DONE';
      if not found then raise exception 'a rework Job ID must be a done Job ID of this card'; end if;
      v_new := app.new_job_id(p_card, j.job_code_id, j.tyre_id, j.fleet_id, j.complaint_id, j.org_unit_id, j.id);
      update public.job_ids set status = 'ASSIGNED', due_date = c.expected_date, due_shift_id = c.expected_shift_id where id = v_new;
      for w in select employee_id from public.job_id_assignees where job_id_ref = j.id loop
        insert into public.job_id_assignees (job_id_ref, employee_id) values (v_new, w);
      end loop;
    end loop;
    update public.job_cards set status = 'ASSIGNED_FOR_WORK' where id = p_card;
    perform app.recompute_card_minutes(p_card);
  end if;
  perform app.log_event(p_card, null, 'FINAL_INSPECTION_' || p_result, e.id, p_remarks);
end $$;

-- Final inspection - selected: Pass or Fail several cards with one checklist
create function public.final_inspection_selected(p_cards uuid[], p_result text, p_remarks text default null, p_checklist jsonb default null) returns int
language plpgsql security definer set search_path = '' as $$
declare c uuid; n int := 0;
begin
  if p_result not in ('PASS', 'FAIL') then raise exception 'selected cards can be passed or failed (use the card for Rework)'; end if;
  if coalesce(cardinality(p_cards), 0) = 0 then raise exception 'choose at least one job card'; end if;
  foreach c in array p_cards loop perform public.final_inspection(c, p_result, p_remarks, '{}', p_checklist); n := n + 1; end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 17. Fleet Grouping to D1
-- ---------------------------------------------------------------------------------------------
-- set the members of one group: a fleet leaves its other group of the same schedule, the group gets a new current revision
create function app.group_set_members(p_group uuid, p_fleets uuid[], p_reason text, p_actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.fleet_groups; og record; v_rev uuid; v_keep uuid[];
begin
  select * into g from public.fleet_groups where id = p_group for update;
  -- fleets leave their other groups of this schedule
  for og in select fg.* from public.fleet_groups fg where fg.org_unit_id = g.org_unit_id and fg.schedule_id = g.schedule_id and fg.id <> g.id and fg.status = 'ACTIVE' loop
    select coalesce(array_agg(m.fleet_id), '{}') into v_keep from public.fleet_group_revision_members m
     where m.revision_id = og.current_revision_id and m.fleet_id <> all (coalesce(p_fleets, '{}'));
    if og.current_revision_id is not null and cardinality(v_keep) <> (select count(*) from public.fleet_group_revision_members where revision_id = og.current_revision_id) then
      update public.fleet_group_revisions set status = 'SUPERSEDED' where id = og.current_revision_id;
      v_rev := gen_random_uuid();
      insert into public.fleet_group_revisions (id, group_id, org_unit_id, revision_no, status, reason_for_change, first_schedule_date, proposed_by, decided_by, decided_at)
      values (v_rev, og.id, og.org_unit_id, (select max(revision_no) + 1 from public.fleet_group_revisions where group_id = og.id), 'APPROVED',
              'Fleets moved to ' || g.group_name, app.business_today(), p_actor, p_actor, now());
      insert into public.fleet_group_revision_members (revision_id, fleet_id) select v_rev, unnest(v_keep);
      update public.fleet_groups set current_revision_id = v_rev where id = og.id;
    end if;
  end loop;
  if g.current_revision_id is not null then update public.fleet_group_revisions set status = 'SUPERSEDED' where id = g.current_revision_id; end if;
  v_rev := gen_random_uuid();
  insert into public.fleet_group_revisions (id, group_id, org_unit_id, revision_no, status, reason_for_change, first_schedule_date, proposed_by, decided_by, decided_at)
  values (v_rev, g.id, g.org_unit_id, coalesce((select max(revision_no) from public.fleet_group_revisions where group_id = g.id), 0) + 1, 'APPROVED',
          btrim(p_reason), app.business_today(), p_actor, p_actor, now());
  insert into public.fleet_group_revision_members (revision_id, fleet_id) select v_rev, unnest(coalesce(p_fleets, '{}'));
  update public.fleet_groups set current_revision_id = v_rev where id = g.id;
end $$;

-- Create Group (p_group null) or edit one group; saved and Active at once
create function public.group_save(p_schedule uuid, p_group uuid, p_name text, p_fleets uuid[], p_reason text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('grouping.propose'); g public.fleet_groups; v_fleets uuid[]; v_n int;
begin
  if not exists (select 1 from public.maintenance_schedules where id = p_schedule and status = 'ACTIVE') then raise exception 'unknown or inactive schedule'; end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'please give a reason for the change'; end if;
  select array_agg(distinct x) into v_fleets from unnest(coalesce(p_fleets, '{}')) as x;
  if v_fleets is null then raise exception 'choose at least one fleet'; end if;
  select count(*) into v_n from public.fleets where id = any (v_fleets) and org_unit_id = e.org_unit_id and status = 'ACTIVE';
  if v_n <> cardinality(v_fleets) then raise exception 'every fleet must be an active fleet of your depot'; end if;
  if p_group is null then
    if length(btrim(coalesce(p_name, ''))) = 0 then raise exception 'please name the group'; end if;
    begin
      insert into public.fleet_groups (org_unit_id, schedule_id, group_name) values (e.org_unit_id, p_schedule, btrim(p_name)) returning * into g;
    exception when unique_violation then raise exception 'a group named "%" already exists for this schedule', p_name; end;
  else
    select * into g from public.fleet_groups where id = p_group and org_unit_id = e.org_unit_id and schedule_id = p_schedule;
    if not found then raise exception 'group not found in your depot'; end if;
  end if;
  perform app.group_set_members(g.id, v_fleets, p_reason, e.id);
  return g.id;
end $$;

-- Edit groups board: p_assign = {"<group id>": ["<fleet id>", ...], ...}; fleets in no list are ungrouped
create function public.group_board_save(p_schedule uuid, p_assign jsonb, p_reason text) returns int
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('grouping.propose'); k text; v_fleets uuid[]; n int := 0; g public.fleet_groups; v_all uuid[];
begin
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'please give a reason for the change'; end if;
  if p_assign is null or jsonb_typeof(p_assign) <> 'object' then raise exception 'the board is empty'; end if;
  for k in select jsonb_object_keys(p_assign) loop
    select * into g from public.fleet_groups where id = k::uuid and org_unit_id = e.org_unit_id and schedule_id = p_schedule and status = 'ACTIVE';
    if not found then raise exception 'a group on the board is not a group of this schedule in your depot'; end if;
    select coalesce(array_agg(distinct x::uuid), '{}') into v_fleets from jsonb_array_elements_text(p_assign -> k) x;
    if exists (select 1 from unnest(v_fleets) f where f not in (select id from public.fleets where org_unit_id = e.org_unit_id and status = 'ACTIVE')) then
      raise exception 'every fleet must be an active fleet of your depot'; end if;
    if v_all && v_fleets then raise exception 'a fleet is in two groups on the board'; end if;
    v_all := coalesce(v_all, '{}') || v_fleets;
  end loop;
  for k in select jsonb_object_keys(p_assign) loop
    select coalesce(array_agg(distinct x::uuid), '{}') into v_fleets from jsonb_array_elements_text(p_assign -> k) x;
    perform app.group_set_members(k::uuid, v_fleets, p_reason, e.id); n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 20. Replace selected: give the not-yet-started Job IDs of assigned schedule cards to other Tyre Men
-- ---------------------------------------------------------------------------------------------
create function public.schedule_replace(p_items uuid[], p_employees uuid[]) returns int
language plpgsql security definer set search_path = '' as $$
declare e public.employees := app.actor('job_card.assign'); i public.schedule_items; j record; w uuid; n int := 0; v_cards uuid[] := '{}';
begin
  if coalesce(cardinality(p_employees), 0) = 0 or cardinality(p_employees) > 3 then raise exception 'choose one to three Tyre Men'; end if;
  if (select count(*) from public.employees where id = any (p_employees) and org_unit_id = e.org_unit_id and status = 'ACTIVE' and role_code in ('TM', 'TIC')) <> cardinality(p_employees) then
    raise exception 'every person must be an active Tyre Man or Tyre IC of your depot'; end if;
  for i in select * from public.schedule_items where id = any (p_items) and org_unit_id = e.org_unit_id loop
    continue when i.job_card_id is null or i.job_card_id = any (v_cards);
    v_cards := v_cards || i.job_card_id;
    if not exists (select 1 from public.job_cards where id = i.job_card_id and status = 'ASSIGNED_FOR_WORK') then continue; end if;
    for j in select id from public.job_ids where job_card_id = i.job_card_id and status = 'ASSIGNED' loop
      delete from public.job_id_assignees where job_id_ref = j.id;
      foreach w in array p_employees loop insert into public.job_id_assignees (job_id_ref, employee_id) values (j.id, w); end loop;
      n := n + 1;
    end loop;
    perform app.log_event(i.job_card_id, null, 'REPLACED_TECHNICIAN', e.id);
  end loop;
  if n = 0 then raise exception 'nothing to replace: the chosen rows have no assigned work that has not started'; end if;
  return n;
end $$;

revoke all on function app.group_set_members(uuid, uuid[], text, uuid) from public, anon, authenticated;
revoke all on function public.final_inspection(uuid, text, text, uuid[], jsonb), public.final_inspection_selected(uuid[], text, text, jsonb), public.group_save(uuid, uuid, text, uuid[], text),
  public.group_board_save(uuid, jsonb, text), public.schedule_replace(uuid[], uuid[]) from public, anon;
grant execute on function public.final_inspection(uuid, text, text, uuid[], jsonb), public.final_inspection_selected(uuid[], text, text, jsonb), public.group_save(uuid, uuid, text, uuid[], text),
  public.group_board_save(uuid, jsonb, text), public.schedule_replace(uuid[], uuid[]) to authenticated;
