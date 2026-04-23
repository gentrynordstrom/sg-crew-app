# SG Crew App — Phase 1 Spec

**Repo:** `git@github.com:gentrynordstrom/sg-crew-app.git`
**Owner:** Gentry Nordstrom, Sainte Genevieve
**Phase goal:** Ship a deployable Next.js PWA on Vercel with a custom name + 4-digit PIN login, JWT sessions, role-based home screen, and an admin page to add/edit/deactivate crew. No Monday / Notion integration yet — that's Phase 2+.

---

## 1. What "done" looks like for Phase 1

A Sainte Genevieve staff member can:

1. Visit the deployed Vercel URL on their phone
2. Tap their name from a grid of active crew
3. Enter their 4-digit PIN on a custom on-screen numeric keypad (NOT the device keyboard)
4. Auto-submit after the 4th digit → land on a role-specific home screen with feature tiles (Cruise Log, Cleaning Log, Maintenance Log, Transactions, Time Tracking, SOPs, Chatbot)
5. Tap any tile → land on `/coming-soon`
6. Sign out

An admin (bootstrapped as Gentry Nordstrom via seed) can:

1. Access `/admin/users`
2. Add a new crew member by name + phone + role (the PIN is always the last 4 digits of the phone — no separate PIN field)
3. Edit a user's name, phone, or role. Changing the phone automatically resets that user's PIN to the new last 4 digits and clears any failed-attempt lockout.
4. Deactivate / reactivate a user (deactivated users are kicked out on the next request)
5. Unlock a user who tripped the 5-attempt lockout
6. Sign out

That's the entire Phase 1 scope. Feature tiles exist, but click destinations are `/coming-soon` placeholders.

---

## 2. Tech stack

| Layer       | Choice                                                  |
| ----------- | ------------------------------------------------------- |
| Framework   | Next.js 14 (App Router, TypeScript)                     |
| Styling     | Tailwind CSS                                            |
| Database    | Supabase Postgres (DB only — no Supabase Auth)          |
| Auth        | Custom name + PIN, bcryptjs-hashed, JWT session cookie  |
| JWT library | `jose` (Edge-runtime compatible, HS256)                 |
| ORM         | Prisma                                                  |
| Hosting     | Vercel                                                  |
| PWA         | `public/manifest.json` + PNG icons                      |

---

## 3. Role matrix (Phase 1 enforces schema + tile visibility; per-feature access is Phase 2+)

| Feature                   | Captain  | Deckhand  | Mechanic  | Admin |
| ------------------------- | -------- | --------- | --------- | ----- |
| Captain's Cruise Log      | tile     | —         | —         | tile  |
| Cleaning Log              | tile     | tile      | —         | tile  |
| Maintenance Log           | tile     | tile      | tile      | tile  |
| Transactions / Receipts   | tile     | tile      | tile      | tile  |
| Time Tracking             | tile     | tile      | tile      | tile  |
| SOPs                      | tile     | tile      | tile      | tile  |
| Chatbot                   | tile     | tile      | tile      | tile  |
| Admin (user management)   | —        | —         | —         | tile  |

---

## 4. Database schema (Phase 1)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  CAPTAIN
  DECKHAND
  MECHANIC
  ADMIN
}

model User {
  id              String    @id @default(cuid())
  name            String
  phone           String    @unique
  pinHash         String    @map("pin_hash")
  role            Role
  isActive        Boolean   @default(true) @map("is_active")
  failedAttempts  Int       @default(0) @map("failed_attempts")
  lockedUntil     DateTime? @map("locked_until")
  lastLoginAt     DateTime? @map("last_login_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@index([isActive])
  @@map("users")
}
```

The bootstrap admin is created by `prisma/seed.ts` from `ADMIN_NAME`, `ADMIN_PHONE`, and optional `ADMIN_PIN` env vars. No Supabase SQL trigger needed — there's no `auth.users` table involved.

---

## 5. File structure

```
sg-crew-app/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                              # role-based home (feature tiles)
│   ├── login/
│   │   ├── page.tsx                          # name picker (active users)
│   │   └── [userId]/page.tsx                 # PIN pad
│   ├── coming-soon/page.tsx                  # placeholder
│   ├── admin/
│   │   └── users/
│   │       ├── page.tsx                      # admin-only user CRUD screen
│   │       └── actions.ts                    # server actions
│   └── api/
│       └── auth/
│           ├── login/route.ts                # POST: validate PIN, issue JWT cookie
│           └── logout/route.ts               # POST/GET: clear cookie
├── components/
│   ├── FeatureTile.tsx
│   ├── PinPad.tsx                            # custom on-screen numeric keypad
│   ├── RoleBadge.tsx
│   ├── SignOutButton.tsx
│   └── admin/
│       ├── UserForm.tsx
│       └── UserTable.tsx
├── lib/
│   ├── auth.ts                               # getSession / requireActiveSession / requireAdmin
│   ├── jwt.ts                                # sign / verify via jose
│   ├── phone.ts                              # normalize / validate / derive PIN
│   ├── prisma.ts                             # singleton
│   └── roles.ts                              # tile definitions, role → tiles map
├── middleware.ts                             # JWT verify only (Edge-safe)
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                               # bootstrap admin from env vars
├── public/
│   ├── manifest.json
│   ├── icon-192.png
│   └── icon-512.png
├── scripts/
│   └── generate-icons.mjs                    # regenerate placeholder icons
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
└── README.md
```

---

## 6. Auth flow

1. User visits any protected route → `middleware.ts` checks for the `sg_session` cookie, verifies the JWT signature + expiry with `jose`, redirects to `/login` if missing/invalid.
2. `/login` server component fetches all `isActive` users and renders a grid of name buttons with role badges. Large touch targets (min 48px tall).
3. User taps a name → `/login/[userId]` renders the custom `<PinPad />` client component (buttons 0–9 + backspace, no device keyboard).
4. PIN auto-submits after the 4th digit via `POST /api/auth/login`.
5. `/api/auth/login` (Node runtime):
   - 400 if payload is malformed
   - 401 "Incorrect PIN." for unknown user / inactive user / wrong PIN (generic error message so you can't enumerate)
   - 423 if `lockedUntil > now`
   - On failed PIN: increment `failedAttempts`. If it hits 5, set `lockedUntil = now + 15min` and zero out `failedAttempts`.
   - On success: zero counters, set `lastLoginAt`, sign a JWT (HS256, 1-year expiry) and set it in an httpOnly, `SameSite=Lax`, `Secure` (in production) cookie named `sg_session`.
6. Home page (`/`) calls `requireActiveSession()` which:
   - Decodes the JWT
   - Does a fresh Prisma lookup on the user by id
   - Redirects to `/login` if the user is missing or `isActive === false`
   This is the canonical active-session check, called from every protected page. Middleware alone can't do it because Prisma doesn't run in the Edge runtime.
7. `/admin/users` uses `requireAdmin()` which extends the above with a `role === "ADMIN"` check.
8. Logout hits `/api/auth/logout` → clears the cookie → redirect to `/login`.

---

## 7. Rate limiting / lockout

- 5 consecutive failed PINs = 15-minute lockout.
- Lockout is per-user, stored on `users.locked_until`.
- Admin can clear a lockout from `/admin/users` via the "Unlock" button.
- Deactivating then reactivating a user also clears the counter.

---

## 8. Environment variables

See `.env.example`:

```
DATABASE_URL=postgresql://postgres.xxxx:[password]@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxxx:[password]@aws-0-region.pooler.supabase.com:5432/postgres

JWT_SECRET=<32+ char random string; openssl rand -base64 48>

ADMIN_NAME=Gentry Nordstrom
ADMIN_PHONE=5551234567
# Optional override; if set, must be exactly 4 digits
# ADMIN_PIN=1234

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

On Vercel, set the same vars in the project settings; update `NEXT_PUBLIC_APP_URL` to the production URL.

---

## 9. Setup checklist

### A. Supabase (DB only — no Auth)
1. Create a Supabase project.
2. Project Settings → Database → Connection String → copy pooler + direct URLs into `.env.local`.
3. No trigger, no Auth setup, no Google Cloud OAuth. This phase does not touch `auth.users`.

### B. Local
```bash
npm install
cp .env.example .env.local   # fill in real values
npm run db:push              # creates the users table
npm run db:seed              # creates the bootstrap admin
npm run dev                  # http://localhost:3000
```

### C. Deploy (Vercel)
1. `git push` to GitHub.
2. Import repo in Vercel.
3. Paste env vars into Vercel project settings, update `NEXT_PUBLIC_APP_URL` to the production URL.
4. Deploy. Seed runs locally (it's not a build step) — the `users` row persists in Supabase.

### D. Smoke test
1. Visit the Vercel URL → redirects to `/login`.
2. Sign in as "Gentry Nordstrom" using the last 4 of `ADMIN_PHONE` (or `ADMIN_PIN` if you set one).
3. Land on `/` → see all feature tiles + Admin tile.
4. Go to `/admin/users`. Create a test CAPTAIN / DECKHAND / MECHANIC user.
5. Sign out. Sign in as the test user. Confirm role-appropriate tile set.
6. Try 5 wrong PINs on any user → lockout kicks in with a 423 message.
7. As admin, unlock them.
8. Deactivate them, verify they're kicked to `/login` on next request.

---

## 10. What Phase 2+ will cover (do not build yet)

- Monday GraphQL integration for:
  - Captain's Cruise Log: `18397459741`
  - Cleaning Log: `18397481492`
  - Maintenance Log: `18397489685`
  - Transactions / Receipts: `18397491329`
- Log list + entry creation per board
- Receipt photo upload (Supabase Storage)
- Time tracking (clock in / out, history, admin export)
- Notion sync + SOP browser
- Chatbot with pgvector embeddings + Claude streaming

---

## Appendix: Decisions made

- **Why custom name + PIN instead of Google / magic link:** crew includes seasonal / transient staff without Google accounts and no reliable email access on the dock. A name-picker + 4-digit PIN optimized for glove-friendly tapping is the right fit for the environment.
- **Why derive the PIN from the last 4 of the phone:** zero new secrets to remember. Captains already know crew phone numbers. Admin rotates a PIN by updating the phone in `/admin/users`.
- **Why `bcryptjs` (pure JS) instead of `bcrypt` (native):** avoids native-build failures on Vercel.
- **Why `jose` instead of `jsonwebtoken`:** `jose` runs in the Edge runtime, so middleware can verify the JWT without a DB hit.
- **Why the active-user check runs in a server helper (not middleware):** Prisma doesn't work in the Edge runtime. `requireActiveSession()` in `lib/auth.ts` does a fresh `users.isActive` lookup on every protected request. We can swap in a short-TTL cache later if latency becomes an issue.
- **Why 5 / 15 for the lockout thresholds:** typical best-practice for low-sensitivity PIN-based auth. Tunable via constants in `app/api/auth/login/route.ts`.
- **Why 1-year JWT expiry:** crew rarely sign out. We rely on deactivation + the `isActive` check to kick compromised accounts — not on short-lived tokens.
