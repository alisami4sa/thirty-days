-- Optional: helper to start a new 30-day cycle from SQL
-- Prefer using the in-app Settings flow; this is for ops/debug.

create or replace function public.start_new_cycle(
  p_name text default null,
  p_start_date date default current_date
)
returns uuid
language plpgsql
as $$
declare
  v_old_id uuid;
  v_new_id uuid;
  v_name text;
  r record;
begin
  select id into v_old_id
  from public.challenge_cycles
  where status = 'active'
  limit 1;

  if v_old_id is not null then
    update public.challenge_cycles
    set status = 'archived'
    where id = v_old_id;
  end if;

  v_name := coalesce(p_name, 'Cycle ' || to_char(now(), 'YYYY-MM-DD'));

  insert into public.challenge_cycles (name, start_date, end_date, status)
  values (v_name, p_start_date, p_start_date + 29, 'active')
  returning id into v_new_id;

  -- Copy enabled challenges from previous cycle if present
  if v_old_id is not null then
    for r in
      select title, description, applies_to, metadata, sort_order, enabled
      from public.challenges
      where cycle_id = v_old_id and enabled = true
      order by sort_order
    loop
      insert into public.challenges (cycle_id, title, description, applies_to, metadata, sort_order, enabled)
      values (v_new_id, r.title, r.description, r.applies_to, r.metadata, r.sort_order, r.enabled);
    end loop;
  end if;

  return v_new_id;
end;
$$;
