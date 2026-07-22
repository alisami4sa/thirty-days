# Thirty Days

Personal Progressive Web App — a shared 30-day competitive challenge tracker for two people. No login. Identity is picked once per device and stored in `localStorage` (+ cookie).

> Keep the production URL private. Client uses a publishable Supabase key with RLS; this is a personal app, not a multi-tenant product.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Supabase Postgres + Realtime + Storage (no Auth)
- PWA via `@ducanh2912/next-pwa` (production) + Web Manifest / Apple touch icons
- Deploy: Vercel

Without Supabase env vars the app runs in **local demo mode** (data in `localStorage`).

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Supabase (no Auth)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run, in order:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_start_new_cycle.sql`
   - `supabase/migrations/003_notes.sql`
   - `supabase/migrations/004_proofs.sql` (Gym photo storage)
   - `supabase/seed.sql`
3. Confirm **Realtime** for `daily_checkins` / `notes`.
4. Copy Project URL + publishable (or anon) key into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
NEXT_PUBLIC_USER_ALI_ID=a1111111-1111-1111-1111-111111111111
NEXT_PUBLIC_USER_HAJAR_ID=b2222222-2222-2222-2222-222222222222
```

Default challenges: No Sugar (both), Gym (user A + photo proof), Protein (per-user targets), Walk (both).

### 3. Run / deploy

```bash
npm run dev
```

Vercel: import the GitHub repo, add the same env vars, deploy.

## Features

- Today check-ins with sticky next-up actions
- Competitive board, streaks, %
- History (past days lock after midnight)
- Partner notes + in-app popup / optional notifications
- Gym photo proof
- CSV export + weekly summary (Settings)
- Live sync status on Today

## iOS PWA

Safari → Share → **Add to Home Screen**. Enable note alerts in Settings if you want banners.

## New cycle

Settings → edit challenges → **Start new cycle** (archives previous; history kept).
