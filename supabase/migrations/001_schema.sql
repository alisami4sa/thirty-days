-- Thirty Days Challenge Tracker
-- Supabase Postgres + Realtime (no Auth)
-- Run in Supabase SQL Editor, or via migrations.

-- Extensions
create extension if not exists "pgcrypto";

-- Fixed user IDs (stable across environments)
-- Ali:   a1111111-1111-1111-1111-111111111111
-- Hajar: b2222222-2222-2222-2222-222222222222

create table if not exists public.users (
  id uuid primary key,
  display_name text not null check (display_name in ('Ali', 'Hajar')),
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('active', 'archived')) default 'active',
  created_at timestamptz not null default now(),
  constraint challenge_cycles_date_order check (end_date >= start_date)
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.challenge_cycles(id) on delete cascade,
  title text not null,
  description text not null default '',
  applies_to text not null check (applies_to in ('ali', 'hajar', 'both')) default 'both',
  metadata jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.challenge_cycles(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  status text not null check (status in ('completed', 'failed', 'pending')) default 'pending',
  updated_at timestamptz not null default now(),
  unique (challenge_id, user_id, date)
);

create index if not exists idx_challenges_cycle on public.challenges(cycle_id);
create index if not exists idx_checkins_cycle_date on public.daily_checkins(cycle_id, date);
create index if not exists idx_checkins_user_date on public.daily_checkins(user_id, date);
create index if not exists idx_cycles_status on public.challenge_cycles(status);

-- Only one active cycle at a time
create unique index if not exists idx_one_active_cycle
  on public.challenge_cycles(status)
  where status = 'active';

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists daily_checkins_updated_at on public.daily_checkins;
create trigger daily_checkins_updated_at
  before update on public.daily_checkins
  for each row execute function public.set_updated_at();

-- RLS: open read/write for anon (personal app, no auth).
-- Restrict by fixed user IDs on writes via check constraints / app logic.
alter table public.users enable row level security;
alter table public.challenge_cycles enable row level security;
alter table public.challenges enable row level security;
alter table public.daily_checkins enable row level security;

drop policy if exists "users_select" on public.users;
create policy "users_select" on public.users for select using (true);

drop policy if exists "cycles_all" on public.challenge_cycles;
create policy "cycles_all" on public.challenge_cycles for all using (true) with check (true);

drop policy if exists "challenges_all" on public.challenges;
create policy "challenges_all" on public.challenges for all using (true) with check (true);

drop policy if exists "checkins_select" on public.daily_checkins;
create policy "checkins_select" on public.daily_checkins for select using (true);

drop policy if exists "checkins_insert" on public.daily_checkins;
create policy "checkins_insert" on public.daily_checkins
  for insert with check (
    user_id in (
      'a1111111-1111-1111-1111-111111111111'::uuid,
      'b2222222-2222-2222-2222-222222222222'::uuid
    )
  );

drop policy if exists "checkins_update" on public.daily_checkins;
create policy "checkins_update" on public.daily_checkins
  for update using (
    user_id in (
      'a1111111-1111-1111-1111-111111111111'::uuid,
      'b2222222-2222-2222-2222-222222222222'::uuid
    )
  ) with check (
    user_id in (
      'a1111111-1111-1111-1111-111111111111'::uuid,
      'b2222222-2222-2222-2222-222222222222'::uuid
    )
  );

drop policy if exists "checkins_delete" on public.daily_checkins;
create policy "checkins_delete" on public.daily_checkins
  for delete using (
    user_id in (
      'a1111111-1111-1111-1111-111111111111'::uuid,
      'b2222222-2222-2222-2222-222222222222'::uuid
    )
  );

-- Realtime (ignore if already added)
do $$ begin
  alter publication supabase_realtime add table public.daily_checkins;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.challenges;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.challenge_cycles;
exception when duplicate_object then null;
end $$;
