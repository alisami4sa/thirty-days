-- Seed: Ali & Hajar + Cycle 1 default challenges
-- Safe to re-run (upserts users, creates cycle only if none exists)

insert into public.users (id, display_name) values
  ('a1111111-1111-1111-1111-111111111111', 'Ali'),
  ('b2222222-2222-2222-2222-222222222222', 'Hajar')
on conflict (id) do update set display_name = excluded.display_name;

-- Create cycle 1 only when no active cycle exists
do $$
declare
  v_cycle_id uuid;
  v_start date := current_date;
  v_end date := current_date + 29;
begin
  if exists (select 1 from public.challenge_cycles where status = 'active') then
    raise notice 'Active cycle already exists — skipping seed cycle';
    return;
  end if;

  insert into public.challenge_cycles (name, start_date, end_date, status)
  values ('Cycle 1', v_start, v_end, 'active')
  returning id into v_cycle_id;

  insert into public.challenges (cycle_id, title, description, applies_to, metadata, sort_order, enabled)
  values
    (
      v_cycle_id,
      'No Sugar',
      'No added sugar for the day.',
      'both',
      '{}'::jsonb,
      1,
      true
    ),
    (
      v_cycle_id,
      'Gym',
      'Complete a gym workout.',
      'ali',
      '{}'::jsonb,
      2,
      true
    ),
    (
      v_cycle_id,
      'Protein Intake',
      'Hit your daily protein target.',
      'both',
      '{"protein_grams": {"ali": 175, "hajar": 90}}'::jsonb,
      3,
      true
    ),
    (
      v_cycle_id,
      '30 mins walk',
      'Walk for at least 30 minutes.',
      'both',
      '{}'::jsonb,
      4,
      true
    );

  raise notice 'Seeded Cycle 1 (%) from % to %', v_cycle_id, v_start, v_end;
end $$;
