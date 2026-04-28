# SG Crew App

A Next.js 14 PWA for Sainte Genevieve marine / hospitality crew. Phase 1 ships a name-picker + 4-digit PIN login, JWT sessions, role-based home screen, and an admin page to manage users.

See [`docs/phase-1-spec.md`](docs/phase-1-spec.md) for the full spec.

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Supabase Postgres (DB only — no Supabase Auth)
- Prisma ORM
- Custom auth: name + PIN, `bcryptjs`, JWT via `jose` (HS256), httpOnly cookie
- Deploy target: Vercel

## Prerequisites

- Node 20+
- npm
- A Supabase project (free tier works). Only the Postgres DB is used — Auth is not touched.

## Local setup

```bash
git clone git@github.com:gentrynordstrom/sg-crew-app.git
cd sg-crew-app
npm install
cp .env.example .env.local
# then edit .env.local — see the "Environment variables" section below
npm run db:push     # create / sync the users table
npm run db:seed     # create the bootstrap admin from env vars
npm run dev         # http://localhost:3000
```

Sign in as the bootstrap admin:

- **Name:** whatever `ADMIN_NAME` is set to (defaults to "Gentry Nordstrom")
- **PIN:** the last 4 digits of `ADMIN_PHONE`, or `ADMIN_PIN` if you set an override

## Environment variables

| Name                   | Required | Notes                                                                                          |
| ---------------------- | :------: | ---------------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | yes       | Supabase pooled connection string (`?pgbouncer=true`). Used by the app at runtime.             |
| `DIRECT_URL`                | yes       | Supabase direct connection string. Used by `prisma db push` / migrations.                      |
| `JWT_SECRET`                | yes       | 32+ char random string. Generate: `openssl rand -base64 48`.                                   |
| `NEXT_PUBLIC_APP_URL`       | yes       | `http://localhost:3000` locally; Vercel production URL in prod.                                |
| `MONDAY_API_KEY`            | yes       | Monday.com API token. Used for all log entries.                                                |
| `SUPABASE_URL`              | yes       | Supabase project URL (`https://<project>.supabase.co`). Used for file storage.                 |
| `SUPABASE_SERVICE_ROLE_KEY` | yes       | Supabase service role key. Used server-side for storage and presigned URL generation.           |
| `STARBOARD_API_TOKEN`       | sync only | Bearer token from Starboard Suite dashboard (1Password). Required for cruise event sync.        |
| `STARBOARD_SUBDOMAIN`       | sync only | Your Starboard subdomain (e.g. `sg`). Determines the API base URL.                             |
| `STARBOARD_SYNC_DAYS_AHEAD` | no        | Days ahead to sync (default: `60`). Controls the Starboard import window.                      |
| `CRON_SECRET`               | prod      | Random secret; Vercel sends it on cron invocations. Generate: `openssl rand -base64 32`.       |
| `NOTION_API_TOKEN`          | sync only | Notion integration token used to read SOP database/pages/blocks.                                |
| `NOTION_SOP_DATABASE_ID`    | sync only | Notion database ID containing SOP rows/pages to ingest.                                          |
| `NOTION_SYNC_CRON_SECRET`   | prod      | Secret used by Vercel cron `Authorization: Bearer ...` for `/api/sops/sync-notion`.            |
| `ADMIN_NAME`                | seed      | Bootstrap admin display name.                                                                  |
| `ADMIN_PHONE`                | seed      | 10-digit phone. PIN derived from last 4.                                                       |
| `ADMIN_PIN`                 | no        | Optional override. Must be 4 digits.                                                           |

`ADMIN_*` vars are only consumed by `prisma/seed.ts`. Safe to leave out of Vercel env if you never plan to reseed from prod.

## Scripts

| Script             | What it does                                                   |
| ------------------ | -------------------------------------------------------------- |
| `npm run dev`      | Next dev server                                                |
| `npm run build`    | `prisma generate` + `next build`                               |
| `npm start`        | Production server                                              |
| `npm run db:push`  | Sync Prisma schema to the DB (no migration file)               |
| `npm run db:seed`  | Create / update the bootstrap admin from env vars              |
| `npm run db:studio`| Open Prisma Studio                                             |

## Routes

| Path                | Access                       | Purpose                                                |
| ------------------- | ---------------------------- | ------------------------------------------------------ |
| `/login`            | public                       | Name picker — lists active users                       |
| `/login/[userId]`   | public                       | Custom on-screen PIN pad                               |
| `/api/auth/login`   | public (POST)                | Validates PIN, issues JWT cookie, handles rate limit   |
| `/api/auth/logout`  | any                          | Clears session cookie                                  |
| `/`                 | any authenticated + active   | Role-based feature tiles                               |
| `/sops`             | role-gated authenticated      | SOP list filtered by role access                       |
| `/sops/[slug]`      | role-gated authenticated      | SOP detail with cached Notion content                  |
| `/coming-soon`      | any authenticated + active   | Placeholder for Phase 2+ features                      |
| `/admin/users`      | `ADMIN` only                 | Add / edit / deactivate / unlock crew                  |
| `/admin/sops/import`| `ADMIN` only                 | Manual Notion SOP sync trigger                         |

## Auth model

- Login: user taps name → enters 4-digit PIN on a custom on-screen keypad → auto-submits → server issues a JWT in an httpOnly cookie (1-year expiry).
- Rate limit: 5 failed PINs = 15-minute lockout (per user, stored in DB).
- Middleware (`middleware.ts`) verifies JWT signature + expiry only — it runs in Edge runtime and cannot hit Prisma.
- `requireActiveSession()` in `lib/auth.ts` does a fresh Prisma lookup on every protected page render to check `isActive`. Deactivated users are kicked out on the next request.
- The PIN is always derived from the last 4 digits of the user's phone. Admin rotates a PIN by editing the phone in `/admin/users`.

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the repo in Vercel.
3. Paste required env vars into Vercel → Settings → Environment Variables, including database/auth values plus integration values (`MONDAY_API_KEY`, Starboard vars, Notion vars, and cron secrets). Set `NEXT_PUBLIC_APP_URL` to your production URL.
4. Deploy.
5. The first deploy uses whatever's in your Supabase DB. Seeding is done locally — run `npm run db:seed` against the production `DATABASE_URL` once, then the bootstrap admin exists forever.

## Regenerating placeholder PWA icons

The committed icons are auto-generated (navy square with "SG" wordmark). To regenerate:

```bash
node scripts/generate-icons.mjs
```

Swap in real branded PNGs at `public/icon-192.png` and `public/icon-512.png` when you have them.

## Phase 2 preview (not built)

- Monday GraphQL integration for Cruise / Cleaning / Maintenance / Transactions logs
- Receipt photo upload via Supabase Storage
- Time tracking
- Notion sync + SOP browser
- Chatbot with pgvector + Claude streaming

See [`docs/phase-1-spec.md`](docs/phase-1-spec.md) §10 for the full roadmap.
