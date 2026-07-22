-- Gym photo proof + storage
-- Run in Supabase SQL Editor

alter table public.daily_checkins
  add column if not exists proof_url text;

-- Public bucket for proof images (personal app)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proofs',
  'proofs',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "proofs_public_read" on storage.objects;
create policy "proofs_public_read"
  on storage.objects for select
  using (bucket_id = 'proofs');

drop policy if exists "proofs_anon_upload" on storage.objects;
create policy "proofs_anon_upload"
  on storage.objects for insert
  with check (bucket_id = 'proofs');

drop policy if exists "proofs_anon_update" on storage.objects;
create policy "proofs_anon_update"
  on storage.objects for update
  using (bucket_id = 'proofs')
  with check (bucket_id = 'proofs');

drop policy if exists "proofs_anon_delete" on storage.objects;
create policy "proofs_anon_delete"
  on storage.objects for delete
  using (bucket_id = 'proofs');
