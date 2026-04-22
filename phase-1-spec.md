SG Crew App — Phase 1 Spec
Repo: git@github.com:gentrynordstrom/sg-crew-app.git
Owner: Gentry Nordstrom, Sainte Genevieve
Phase goal: Ship a deployable Next.js PWA on Vercel with Google OAuth, role-based access, and an admin screen to assign roles. No Monday/Notion integration yet — that's Phase 2+.

1. What "done" looks like for Phase 1
A Sainte Genevieve staff member can:

Visit the deployed Vercel URL on their phone
Sign in via one of two methods:

Tap "Sign in with Google" and authenticate, OR
Enter their email, receive a magic link, tap it to sign in


Land on a /pending screen if they're a new user with no role assigned
Once promoted by an admin, land on a role-specific home screen with placeholder tiles for each feature (Cruise Log, Cleaning Log, Maintenance Log, Transactions, Time Tracking, SOPs, Chatbot)
Sign out

An admin (bootstrapped as gentry@stegenriverboat.com) can:

Access /admin/users to see all users
Assign or change a user's role from a dropdown: CAPTAIN, DECKHAND, MECHANIC, ADMIN, or revert to PENDING
Sign out

That's the entire Phase 1 scope. Feature tiles are visible but their click destinations can be /coming-soon placeholder routes.

2. Tech stack
LayerChoiceFrameworkNext.js 14 (App Router, TypeScript)StylingTailwind CSSDatabaseSupabase PostgresAuthSupabase Auth (Google OAuth + magic link email)ORMPrismaHostingVercelRepoGitHub: gentrynordstrom/sg-crew-appPWAnext-pwa or manual service worker + manifest

3. Role matrix (for reference — Phase 1 enforces the schema, Phase 2+ enforces per-feature access)
FeatureCaptainDeckhandMechanicAdminCaptain's Cruise Logread/write——readCleaning Logreadread/write—readMaintenance Logreadread/writeread/writereadTransactions/Receiptsread/writeread/writeread/writeread/writeTime trackingownownownall + exportSOPsreadreadreadread + manageChatbotyesyesyesyesAdmin (user mgmt)———yes

4. Database schema (Phase 1)
Prisma schema. Only one table needed for now — profiles backed by Supabase's auth.users.
prisma// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  PENDING
  CAPTAIN
  DECKHAND
  MECHANIC
  ADMIN
}

model Profile {
  id         String   @id @db.Uuid // matches auth.users.id
  email      String   @unique
  fullName   String?  @map("full_name")
  role       Role     @default(PENDING)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("profiles")
}
Trigger: on Supabase, create a trigger that inserts a row into public.profiles whenever a new user is created in auth.users. This way profiles are auto-created on first Google sign-in.
sql-- Run this in Supabase SQL editor AFTER prisma db push
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    case
      when new.email = 'gentry@stegenriverboat.com' then 'ADMIN'::public."Role"
      else 'PENDING'::public."Role"
    end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
This trigger also bootstraps gentry@stegenriverboat.com as ADMIN automatically on first sign-in — no separate seed script needed.

5. File structure
sg-crew-app/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # role-based home (feature tiles)
│   ├── login/
│   │   └── page.tsx                # Google sign-in button + magic link email form
│   ├── pending/
│   │   └── page.tsx                # "waiting for admin approval"
│   ├── coming-soon/
│   │   └── page.tsx                # placeholder for feature tiles
│   ├── admin/
│   │   └── users/
│   │       └── page.tsx            # admin-only user list + role assignment
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts            # Supabase OAuth callback handler
│   └── api/
│       └── admin/
│           └── set-role/
│               └── route.ts        # POST to update a user's role (admin-only)
├── components/
│   ├── FeatureTile.tsx
│   ├── RoleBadge.tsx
│   └── SignOutButton.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # browser client
│   │   ├── server.ts               # server client (cookies)
│   │   └── middleware.ts           # session refresh helper
│   ├── prisma.ts
│   ├── auth.ts                     # getCurrentProfile() helper
│   └── roles.ts                    # canAccess(role, feature) helper
├── middleware.ts                   # route protection + session refresh
├── prisma/
│   └── schema.prisma
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

6. Auth flow

User visits any protected route → middleware.ts checks for Supabase session
No session → redirect to /login
/login shows two options:

Google path: "Sign in with Google" button → Supabase OAuth flow → Google callback hits /auth/callback/route.ts → session cookies set
Magic link path: user enters email → Supabase sends one-time link → user taps link in email → link lands on /auth/callback/route.ts → session cookies set


Both paths create a row in auth.users on first login, which fires the trigger that creates a profiles row
Middleware refreshes session on every request
After callback, user redirected to /
/ reads the current user's profile from Postgres via Prisma:

role = PENDING → redirect to /pending
role = ADMIN → show admin tile + all feature tiles
any other role → show role-appropriate feature tiles


/admin/users route: middleware checks role = ADMIN, else 403


7. Route protection (middleware.ts)
typescript// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/auth/callback']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.png).*)'],
}
Admin-only check happens in the /admin/* page components and /api/admin/* routes, not middleware — middleware only verifies login, since we need Prisma to check the role.

8. Environment variables
Create .env.local.example with placeholders and .env.local with real values (gitignored):
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Prisma / Postgres (from Supabase -> Project Settings -> Database -> Connection String)
DATABASE_URL=postgresql://postgres.xxxx:[password]@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxxx:[password]@aws-0-region.pooler.supabase.com:5432/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
For Vercel, set these same vars in the dashboard, updating NEXT_PUBLIC_APP_URL to the production URL.

9. Setup checklist (run in order)
A. Supabase project

Create a new Supabase project (name: sg-crew-app)
Project Settings → Auth → Providers:

Enable Email provider → toggle "Enable email confirmations" OFF (magic link doesn't need confirmation) and "Enable magic link" ON
Enable Google provider → needs a Google Cloud OAuth client first (see step B)


Project Settings → Auth → Email Templates → customize the "Magic Link" template subject/body to match your brand (optional but nice — default works fine)
Copy the URL, anon key, and service role key into .env.local
Copy the Postgres connection strings (pooler + direct) into .env.local

B. Google Cloud OAuth credentials

Go to Google Cloud Console → create new project "sg-crew-app" (or reuse existing)
APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application
Authorized redirect URIs: add https://<supabase-project-ref>.supabase.co/auth/v1/callback
Copy client ID + secret back into Supabase Auth provider config

C. Local scaffold (Cursor does this)

npx create-next-app@latest sg-crew-app --typescript --tailwind --app --no-src-dir
Install deps: npm install @supabase/ssr @supabase/supabase-js @prisma/client
Install dev deps: npm install -D prisma
npx prisma init
Paste the Prisma schema from section 4
npx prisma db push (creates the profiles table)
Run the SQL trigger from section 4 in the Supabase SQL editor
Build out all files per section 5

D. Deploy

git remote add origin git@github.com:gentrynordstrom/sg-crew-app.git
git push -u origin main
Import the repo into Vercel
Paste all env vars from .env.local into Vercel project settings
Update NEXT_PUBLIC_APP_URL to the production URL
In Supabase Auth settings → Site URL + Redirect URLs → add the Vercel production URL and https://<vercel-url>/auth/callback
Deploy

E. Smoke test

Visit the Vercel URL → redirects to /login
Sign in with gentry@stegenriverboat.com via Google → trigger auto-promotes you to ADMIN
Land on / → see all feature tiles + admin tile
Navigate to /admin/users → see yourself in the list
Sign out from incognito → test magic link flow with a different email → check inbox, click link → land on /pending
From admin account, promote the test user → test user refreshes and sees appropriate tiles
Sign out → test Google sign-in with a different Google account → lands on /pending as expected


10. Cursor prompt (paste this into Cursor composer)
Use Claude Sonnet 4.5 or Claude Opus 4.7 in Cursor.
You are implementing Phase 1 of the SG Crew App, a Next.js 14 PWA for Sainte Genevieve marine/hospitality staff. Follow the spec in docs/phase-1-spec.md exactly.

Context:
- Repo: sg-crew-app
- Stack: Next.js 14 App Router, TypeScript, Tailwind, Supabase (Auth + Postgres), Prisma
- Deploy target: Vercel
- Bootstrap admin email: gentry@stegenriverboat.com

Phase 1 scope (no more, no less):
1. Supabase auth with TWO sign-in methods: Google OAuth AND magic link email
2. profiles table with Role enum (PENDING, CAPTAIN, DECKHAND, MECHANIC, ADMIN)
3. Middleware route protection
4. /login page with both "Sign in with Google" button AND magic link email form
5. /pending, /, /coming-soon, /admin/users pages
6. /api/admin/set-role endpoint (admin-only)
7. PWA manifest + icons
8. Feature tiles on / that link to /coming-soon for now

Do NOT build:
- Monday integration
- Notion integration
- Time tracking logic
- Chatbot
- Any feature beyond the auth shell

Work in this order:
1. Scaffold the Next.js app and install deps
2. Set up Prisma schema and generate client
3. Create Supabase client helpers (browser, server, middleware)
4. Build middleware.ts for route protection
5. Build /login page with both Google OAuth button and magic link email form (use signInWithOAuth for Google and signInWithOtp for magic link)
6. Build /auth/callback route handler — must handle both OAuth code exchange and magic link token verification
7. Build /pending page
8. Build / page with role-based tile rendering
9. Build /admin/users page
10. Build /api/admin/set-role route
11. Build /coming-soon placeholder
12. Add PWA manifest and icons
13. Write a README with setup instructions

After each step, run `npm run build` to verify nothing broke. Commit after each working milestone with a clear message.

Questions? Stop and ask before guessing. Do not invent features not in this spec.

11. What Phase 2 will cover (preview — do not build yet)

Monday GraphQL integration for the four boards:

Captain's Cruise Log: 18397459741
Cleaning Log: 18397481492
Maintenance Log: 18397489685
Transactions/Receipts: 18397491329


Log list + entry creation screens per board
Receipt photo upload (Supabase Storage)
Time tracking (clock in/out, history, admin export)

12. What Phase 3+ will cover

Notion sync into Postgres + SOP browser
PDF upload + parsing for chatbot knowledge base
pgvector embeddings
Chatbot UI + streaming responses from Claude Sonnet 4.5


Appendix: Decisions made

Why Google + magic link: covers staff who already live in Google Workspace as well as seasonal/transient crew who might not have a Google account. Magic link also means fewer "I forgot my password" messages — there is no password. Both methods write to the same auth.users table so roles and permissions don't care how a user signed in.
Why Supabase Auth instead of NextAuth: one vendor, tighter integration with the DB, RLS available later if needed.
Why the trigger instead of a seed script: atomic, idempotent, handles bootstrap admin on first sign-in with zero manual steps.
Why not enforce role-based route access in middleware: middleware runs in Edge runtime and can't use Prisma cleanly. Page-level checks are simpler and fast enough.
Why PENDING instead of auto-approving new signups: you don't want any stranger with a Google account to land inside the app.
Why Next.js API routes instead of a separate backend: Phase 1 has no long-running jobs. Monday webhooks and Notion cron come in Phase 2+ — can still stay in Next.js unless one specifically needs a worker.
