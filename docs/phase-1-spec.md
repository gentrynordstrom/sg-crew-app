SG Crew App — Phase 1 Spec
Repo: git@github.com:gentrynordstrom/sg-crew-app.git Owner: Gentry Nordstrom, Sainte Genevieve Phase goal: Ship a deployable Next.js PWA on Vercel with name+PIN login, role-based access, and an admin screen to manage users. No Monday/Notion integration yet — that's Phase 2+.

1. What "done" looks like for Phase 1
A Sainte Genevieve staff member can:

Visit the deployed Vercel URL on their phone
See a list of active crew names (optionally grouped by role)
Tap their name → 4-digit PIN pad appears
Enter their PIN (= last 4 of their phone number) → signed in
Land on a role-specific home screen with placeholder tiles for each feature (Cruise Log, Cleaning Log, Maintenance Log, Transactions, Time Tracking, SOPs, Chatbot)
Stay signed in indefinitely on that device until they tap Sign Out
Tap Sign Out to return to the name-picker screen
An admin (bootstrapped as Gentry Nordstrom with a preset PIN) can additionally:

Access /admin/users to see all users
Add a new user: name, phone number (last 4 becomes their PIN), role, active/inactive flag
Edit any existing user's name, phone, role, or active status
Deactivate a user (they disappear from the login list but their historical log entries remain intact)
That's the entire Phase 1 scope. Feature tiles are visible but their click destinations are /coming-soon placeholder routes.

2. Tech stack
Layer	Choice
Framework	Next.js 14 (App Router, TypeScript)
Styling	Tailwind CSS
Database	Supabase Postgres (database only — not using Supabase Auth)
Auth	Custom: name-picker + PIN, JWT session in httpOnly cookie
ORM	Prisma
Password hashing	bcryptjs (for PIN storage)
JWT library	jose (edge-runtime compatible)
Hosting	Vercel
Repo	GitHub: gentrynordstrom/sg-crew-app
PWA	next-pwa or manual service worker + manifest
Why not Supabase Auth: Supabase Auth assumes email-based identity. A name+PIN system with admin-managed users is simpler to implement ourselves than to twist Supabase Auth into. We still use Supabase for the Postgres database — just skipping their auth layer.

3. Role matrix (for reference — Phase 1 enforces the schema, Phase 2+ enforces per-feature access)
Feature	Captain	Deckhand	Mechanic	Admin
Captain's Cruise Log	read/write	—	—	read
Cleaning Log	read	read/write	—	read
Maintenance Log	read	read/write	read/write	read
Transactions/Receipts	read/write	read/write	read/write	read/write
Time tracking	own	own	own	all + export
SOPs	read	read	read	read + manage
Chatbot	yes	yes	yes	yes
Admin (user mgmt)	—	—	—	yes
4. Database schema (Phase 1)
prisma
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
  id             String    @id @default(cuid())
  fullName       String    @map("full_name")
  phoneNumber    String    @unique @map("phone_number") // full 10-digit phone, e.g. "5558675309"
  pinHash        String    @map("pin_hash") // bcrypt hash of last 4 digits
  role           Role
  isActive       Boolean   @default(true) @map("is_active")
  failedAttempts Int       @default(0) @map("failed_attempts")
  lockedUntil    DateTime? @map("locked_until")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@map("users")
}
5. Seed script
typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const bootstrapPhone = process.env.BOOTSTRAP_ADMIN_PHONE
  const bootstrapName = process.env.BOOTSTRAP_ADMIN_NAME ?? 'Gentry Nordstrom'

  if (!bootstrapPhone || bootstrapPhone.length !== 10) {
    throw new Error('BOOTSTRAP_ADMIN_PHONE must be set to a 10-digit number (digits only)')
  }

  const pin = bootstrapPhone.slice(-4)
  const pinHash = await bcrypt.hash(pin, 10)

  await prisma.user.upsert({
    where: { phoneNumber: bootstrapPhone },
    update: {},
    create: {
      fullName: bootstrapName,
      phoneNumber: bootstrapPhone,
      pinHash,
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log(`Bootstrap admin ready: ${bootstrapName}, PIN = last 4 of phone`)
}

main().finally(() => prisma.$disconnect())
Run once with npx prisma db seed after setting BOOTSTRAP_ADMIN_PHONE in .env.local.

6. Auth architecture
Session model
On successful login (name + PIN verified), server signs a JWT containing { userId, role }, expires in 1 year
JWT set as an httpOnly, secure, sameSite=lax cookie named sg_session
Middleware reads the cookie on every request, verifies signature, attaches user context
No refresh token complexity — 1-year expiry with manual sign-out
PIN security
PINs are only 4 digits, which is weak against online brute force. Mitigations:
Rate limit PIN attempts per user: 5 failures = 15-minute lockout
failedAttempts + lockedUntil columns track state in DB (stateless-friendly)
Log failed attempts for admin review (Phase 2 adds an admin view for this)
If admin needs to immediately cut off an active user, set isActive = false. Middleware checks isActive on every request, so the next request 401s them even with a valid JWT.
Why JWT in cookie instead of DB-backed sessions
Simpler, no DB read on every request for session validation, plays well with Vercel's edge runtime. Trade-off: can't revoke a session mid-flight without the isActive check. We add that check in middleware to cover the kill-switch case.

7. File structure
sg-crew-app/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # role-based home (feature tiles)
│   ├── login/
│   │   ├── page.tsx                # name-picker grid
│   │   └── [userId]/
│   │       └── page.tsx            # PIN pad for selected user
│   ├── coming-soon/
│   │   └── page.tsx                # placeholder for feature tiles
│   ├── admin/
│   │   └── users/
│   │       ├── page.tsx            # user list with add/edit
│   │       └── actions.ts          # server actions: createUser, updateUser, toggleActive
│   └── api/
│       └── auth/
│           ├── login/
│           │   └── route.ts        # POST: verify name+PIN, issue cookie
│           └── logout/
│               └── route.ts        # POST: clear cookie
├── components/
│   ├── NamePickerGrid.tsx
│   ├── PinPad.tsx
│   ├── FeatureTile.tsx
│   ├── RoleBadge.tsx
│   ├── SignOutButton.tsx
│   └── admin/
│       ├── UserTable.tsx
│       └── UserForm.tsx
├── lib/
│   ├── prisma.ts
│   ├── auth.ts                     # getSession(), requireAuth(), requireAdmin()
│   ├── jwt.ts                      # sign/verify helpers using jose
│   └── roles.ts                    # canAccess(role, feature) helper
├── middleware.ts                   # verify JWT, redirect unauth'd users
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── manifest.json
│   ├── icon-192.png
│   └── icon-512.png
├── .env.local.example
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
8. Auth flow (detailed)
Login
User visits any route → middleware checks for valid sg_session cookie
No valid session → redirect to /login
/login (server component) queries DB for all isActive = true users, renders a grid of tappable names (large touch targets, name + role badge)
User taps a name → navigates to /login/[userId]
/login/[userId] renders a 4-digit PIN pad (custom numeric keypad, not the OS keyboard)
On 4th digit entered, auto-submits to POST /api/auth/login with { userId, pin }
Server:
Loads user by ID, checks isActive and lockedUntil
If locked, return 423 with retry-after time
bcrypt.compare(pin, user.pinHash)
On success: reset failedAttempts to 0, sign JWT, set cookie, return 200
On failure: increment failedAttempts, set lockedUntil if >= 5, return 401 with remaining attempts
Client on 200 → router.push('/')
Client on 401 → show "Wrong PIN" + attempts remaining, clear PIN pad
Client on 423 → show "Too many attempts. Try again in X minutes." + return to name picker
Logout
POST /api/auth/logout → clear cookie → redirect to /login

Middleware sketch
typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { verifyJwt } from './lib/jwt'

const PUBLIC_ROUTES = ['/login', '/api/auth/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  const token = request.cookies.get('sg_session')?.value
  const session = token ? await verifyJwt(token) : null

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.png).*)'],
}
Admin route protection happens in the page component using requireAdmin() from lib/auth.ts — reads the JWT, checks role, redirects if not admin. Can't do role check in middleware cleanly because middleware runs in edge runtime with limited DB access.

9. Environment variables
# Supabase Postgres (from Supabase → Project Settings → Database → Connection string)
DATABASE_URL=postgresql://postgres.xxxx:[password]@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxxx:[password]@aws-0-region.pooler.supabase.com:5432/postgres

# JWT signing secret — generate with: openssl rand -base64 32
JWT_SECRET=<32+ char random string>

# Bootstrap admin (used only by the seed script)
BOOTSTRAP_ADMIN_NAME=Gentry Nordstrom
BOOTSTRAP_ADMIN_PHONE=<your 10-digit phone, digits only>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
For Vercel: same vars in the dashboard, update NEXT_PUBLIC_APP_URL to production URL, NODE_ENV=production.

10. Setup checklist (run in order)
A. Supabase project (database only)
Create a new Supabase project (name: sg-crew-app) at supabase.com
Pick a region close to Illinois (us-east-1 or us-east-2)
Set a strong DB password and save it somewhere you can find later
Wait ~2 minutes for provisioning
Project Settings → Database → Connection string
Copy the pooler URL (port 6543) → DATABASE_URL in .env.local
Copy the direct URL (port 5432) → DIRECT_URL in .env.local
Replace [YOUR-PASSWORD] in both with your actual DB password
No auth configuration needed — we're using Supabase as a Postgres host only
B. Local scaffold (Cursor does this)
npx create-next-app@latest sg-crew-app --typescript --tailwind --app --no-src-dir
Install deps: npm install @prisma/client bcryptjs jose
Install dev deps: npm install -D prisma @types/bcryptjs tsx
npx prisma init
Paste Prisma schema from section 4
Add seed config to package.json:
json
   "prisma": { "seed": "tsx prisma/seed.ts" }
Create prisma/seed.ts from section 5
Generate JWT secret: openssl rand -base64 32 → paste into .env.local
Set BOOTSTRAP_ADMIN_PHONE in .env.local
npx prisma db push (creates tables)
npx prisma db seed (creates the admin user)
Build out all files per section 7
C. Deploy
git remote add origin git@github.com:gentrynordstrom/sg-crew-app.git (if not already done)
git push -u origin main
Import the repo into Vercel
Paste all env vars from .env.local into Vercel project settings
Update NEXT_PUBLIC_APP_URL to the production URL
Deploy
Seed the production database: temporarily set your local DATABASE_URL to the prod URL, run npx prisma db seed, then revert. (Alternatively: create the bootstrap admin manually via a one-off script or psql — Cursor can suggest either.)
D. Smoke test
Visit the Vercel URL → redirects to /login
See Gentry Nordstrom in the list → tap name → enter last 4 of phone
Land on / → see all feature tiles + admin tile
Navigate to /admin/users → see yourself in the list
Add a test user (fake name, fake 10-digit phone, role = DECKHAND) → save
Open incognito window → visit URL → see both names in the list
Tap test user → enter last 4 of fake phone → land on / with role-appropriate tiles (no admin tile)
Sign out → verify redirect to /login
Back in admin window → deactivate test user → verify they disappear from login list
Try wrong PIN 5 times → verify lockout message appears
11. Cursor prompt (paste this into Cursor composer)
Use Claude Sonnet 4.5 or Claude Opus 4.7 in Cursor.

You are implementing Phase 1 of the SG Crew App, a Next.js 14 PWA for Sainte Genevieve marine/hospitality staff. Follow the spec in docs/phase-1-spec.md exactly.

Context:
- Repo: sg-crew-app
- Stack: Next.js 14 App Router, TypeScript, Tailwind, Supabase Postgres (DB only), Prisma
- Auth: custom name+PIN login. PIN = last 4 digits of user's phone number, bcrypt-hashed.
- Session: JWT in httpOnly cookie, 1-year expiry, signed with HS256 via jose
- Deploy target: Vercel
- Bootstrap admin: Gentry Nordstrom, created via seed script

Phase 1 scope (no more, no less):
1. Name-picker login screen (grid of active user names + role badges)
2. PIN pad screen (4-digit numeric, custom on-screen keypad)
3. JWT session in httpOnly cookie
4. Middleware route protection
5. User model with name, phone, pinHash, role (CAPTAIN/DECKHAND/MECHANIC/ADMIN), isActive, failedAttempts, lockedUntil
6. Rate limiting: 5 failed attempts = 15 min lockout
7. /admin/users page (admin-only) with add/edit/deactivate functionality
8. /api/auth/login and /api/auth/logout routes
9. / page with role-based feature tiles pointing to /coming-soon
10. /coming-soon placeholder page
11. Prisma seed script that creates the bootstrap admin from env vars
12. PWA manifest + icons

Do NOT build:
- Monday integration
- Notion integration
- Time tracking logic
- Chatbot
- Password reset (admin just edits the phone in /admin/users to change the PIN)
- Email or SMS notifications
- Any feature beyond the auth shell

Work in this order:
1. Scaffold the Next.js app and install deps (@prisma/client, bcryptjs, jose, prisma, @types/bcryptjs, tsx)
2. Set up Prisma schema and generate client
3. Write prisma/seed.ts and wire up package.json "prisma" → "seed"
4. Create lib/prisma.ts (singleton), lib/jwt.ts (sign/verify via jose), lib/auth.ts (getSession/requireAuth/requireAdmin), lib/roles.ts
5. Build middleware.ts for route protection
6. Build /login page (server component, lists active users)
7. Build /login/[userId] page with PinPad component (client component, custom numeric keypad)
8. Build /api/auth/login route handler with rate limiting and lockout logic
9. Build /api/auth/logout route handler
10. Build / page with role-based tile rendering (FeatureTile component)
11. Build /coming-soon placeholder
12. Build /admin/users page with UserTable + UserForm components and server actions (createUser, updateUser, toggleActive)
13. Add PWA manifest and icons (placeholder icons are fine — we'll replace later)
14. Write a README with local setup + deploy instructions

Implementation notes:
- PinPad must be a custom on-screen numeric keypad (buttons 0–9 + backspace), NOT the device keyboard. Large buttons for glove-friendly tapping.
- Name-picker shows full name and a role badge. Big touch targets, minimum 48px tall.
- Phone number input in admin form: accept any format, strip non-digits server-side, reject if not exactly 10 digits after stripping.
- PIN auto-submits after the 4th digit — no "submit" button.
- When an admin edits a user's phone number, recompute pinHash from the new last-4. When creating a user, derive the PIN from the last 4 automatically — no separate PIN field in the form.
- Use bcryptjs (pure JS) not bcrypt (native) to avoid Vercel build issues.
- Use jose (not jsonwebtoken) for JWT — it's edge-runtime compatible.
- The `isActive` check must happen in middleware on every request so deactivation kicks a user out immediately. This means middleware needs to read the user's isActive flag — decode the JWT for userId, then do a fast DB lookup (or cache — but for Phase 1 a fresh lookup per request is fine; we can optimize later).
- Middleware is Edge runtime — Prisma doesn't work in Edge directly. Two options: (a) do the isActive check in a server component helper that wraps every page instead of middleware, or (b) add an Edge-compatible fetch to a route handler that checks isActive. Go with (a) — a `requireActiveSession()` helper called from the root layout or page-level.
- Revise middleware plan accordingly: middleware only verifies JWT signature + expiry, and redirects unauth'd users to /login. The isActive check happens in a server-side helper called by the root layout.

After each major step, run `npm run build` to verify nothing broke. Commit after each working milestone with a clear message.

Questions? Stop and ask before guessing. Do not invent features not in this spec.
12. What Phase 2 will cover (preview — do not build yet)
Monday GraphQL integration for the four boards:
Captain's Cruise Log: 18397459741
Cleaning Log: 18397481492
Maintenance Log: 18397489685
Transactions/Receipts: 18397491329
Log list + entry creation screens per board
Receipt photo upload (Supabase Storage)
Time tracking (clock in/out, history, admin export)
Admin audit log of failed login attempts
13. What Phase 3+ will cover
Notion sync into Postgres + SOP browser
PDF upload + parsing for chatbot knowledge base
pgvector embeddings
Chatbot UI + streaming responses from Claude Sonnet 4.5
Appendix: Decisions made
Why name+PIN instead of Google OAuth or magic link: marina crew don't all have Google accounts or reliable email access. Name-picker plus 4-digit PIN on a phone is the lowest-friction login path. Matches the pattern already proven in the Chrysalis field tech PWA.
Why name picker instead of typing name or phone: typing on a phone in the field is friction; tapping a name is instant. Admin controls the list, so there's no real security loss from showing names.
Why bcrypt a 4-digit PIN: cheap defense against DB leak exposure. Combined with rate limiting, online brute force is capped at 5 attempts per user per 15 minutes.
Why not Supabase Auth: email-centric, doesn't fit a name+PIN flow. Still using Supabase as the Postgres host.
Why JWT in cookie instead of DB sessions: statelessness suits Vercel's edge; avoids DB lookups on every request for session validation. isActive check covers the kill-switch case.
Why 1-year session: crew use one personal phone, don't want to re-auth daily. Admin can deactivate a user to force them out.
Why seed script for bootstrap: no Supabase Auth means no DB triggers. Plain Prisma seed does the job.
Why admin-managed users instead of self-registration: small team, tight control, zero spam risk. Admin is already in the office adding people to payroll anyway.

