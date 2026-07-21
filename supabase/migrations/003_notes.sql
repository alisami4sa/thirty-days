-- Small notes between Ali and Hajar (no Auth)
-- Run in Supabase SQL Editor after 001_schema.sql

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.users(id) on delete cascade,
  to_user_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 200),
  created_at timestamptz not null default now(),
  constraint notes_different_users check (from_user_id <> to_user_id),
  constraint notes_fixed_users check (
    from_user_id in (
      'a1111111-1111-1111-1111-111111111111'::uuid,
      'b2222222-2222-2222-2222-222222222222'::uuid
    )
    and to_user_id in (
      'a1111111-1111-1111-1111-111111111111'::uuid,
      'b2222222-2222-2222-2222-222222222222'::uuid
    )
  )
);

create index if not exists idx_notes_to_created on public.notes(to_user_id, created_at desc);
create index if not exists idx_notes_from_created on public.notes(from_user_id, created_at desc);

alter table public.notes enable row level security;

drop policy if exists "notes_select" on public.notes;
create policy "notes_select" on public.notes for select using (true);

drop policy if exists "notes_insert" on public.notes;
create policy "notes_insert" on public.notes
  for insert with check (
    from_user_id in (
      'a1111111-1111-1111-1111-111111111111'::uuid,
      'b2222222-2222-2222-2222-222222222222'::uuid
    )
  );

drop policy if exists "notes_delete" on public.notes;
create policy "notes_delete" on public.notes
  for delete using (
    from_user_id in (
      'a1111111-1111-1111-1111-111111111111'::uuid,
      'b2222222-2222-2222-2222-222222222222'::uuid
    )
  );

do $$ begin
  alter publication supabase_realtime add table public.notes;
exception when duplicate_object then null;
end $$;
