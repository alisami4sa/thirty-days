# Thirty Days

Private Progressive Web App for Ali & Hajar — a shared 30-day competitive challenge tracker. No login. Identity is picked once per device and stored in `localStorage` (+ cookie).

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Supabase Postgres + Realtime (no Auth)
- PWA via `@ducanh2912/next-pwa` (production) + Web Manifest / Apple touch icons
- Deploy: Vercel

Without Supabase env vars the app runs in **local demo mode** (data in `localStorage`) so you can try the UI immediately.

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
   - `supabase/seed.sql`
3. Confirm **Realtime** is enabled for `daily_checkins` (the migration adds it to the publication).
4. Copy Project URL + anon key into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_USER_ALI_ID=a1111111-1111-1111-1111-111111111111
NEXT_PUBLIC_USER_HAJAR_ID=b2222222-2222-2222-2222-222222222222
```

Seeded users (stable UUIDs):

| Name  | UUID                                   |
|-------|----------------------------------------|
| Ali   | `a1111111-1111-1111-1111-111111111111` |
| Hajar | `b2222222-2222-2222-2222-222222222222` |

Default Cycle 1 challenges:

1. **No Sugar** — both  
2. **Gym** — Ali only  
3. **Protein Intake** — Ali 175g / Hajar 90g  
4. **30 mins walk** — both  

RLS allows read for everyone with the anon key, and check-in writes only for those two user IDs. This is a personal app — keep the URL private.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Deploy on Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Add the same env vars as `.env.local`.
4. Deploy.

## iOS PWA (Add to Home Screen)

1. Open the Vercel URL in **Safari**.
2. Share → **Add to Home Screen**.
3. Launch from the home screen icon (standalone display, theme color `#f3ebe0`, apple-touch-icon included).

Service worker / offline shell is enabled in production builds.

## Using the app

| Screen   | Purpose |
|----------|---------|
| Who are you? | First visit — pick Ali or Hajar |
| Today    | Your challenges — Complete / Fail + success animation |
| Board    | Competitive table, streaks, completion %, day strip |
| History  | Browse any day in the cycle; past days editable while active |
| Settings | Edit challenges, start new cycle, switch user (confirmed) |

### Start a new 30-day cycle

1. Open **Settings**.
2. Edit the challenge list (title, who it applies to, protein targets, enable/disable).
3. Set a cycle name → **Start new cycle** → confirm.

The previous cycle is **archived** (check-in history kept). A new 30-day window starts from today with the challenge definitions you configured.

Optional SQL helper (ops): `select public.start_new_cycle('Cycle 2');`

## Scripts

```bash
npm run dev
npm run build
npm run start
node scripts/generate-icons.mjs
```

## Notes

- Client always sends the selected local user id when writing check-ins.
- Gym never appears as required for Hajar (`applies_to = ali`).
- Prefer `prefers-reduced-motion`: confetti and bursts are reduced/disabled.
