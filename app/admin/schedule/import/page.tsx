import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function ImportCruisesPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Logo size={56} />
            <div>
              <Link
                href="/admin/schedule"
                className="text-sm text-brand-cream-400 underline-offset-4 hover:text-brand-cream-200 hover:underline"
              >
                ← Schedule
              </Link>
              <h1 className="mt-1 text-2xl font-semibold text-brand-cream-100">
                Import from Starboard Suite
              </h1>
            </div>
          </div>
          <SignOutButton />
        </header>

        <AdminNav />

        {/* Status banner */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-brass-500/40 bg-brand-brass-900/20 px-4 py-4">
          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-brass-400" />
          <div>
            <p className="font-semibold text-brand-brass-200">
              Waiting for Starboard Suite API access
            </p>
            <p className="mt-1 text-sm text-brand-brass-300/80">
              API access has been requested. Once the credentials are received,
              this page will let you pull the cruise schedule directly into the
              app with one click.
            </p>
          </div>
        </div>

        {/* How it will work */}
        <div className="rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60 p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-brand-cream-100">
            How the integration will work
          </h2>
          <ol className="space-y-4 text-sm text-brand-cream-300">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-brass-700/50 text-xs font-bold text-brand-brass-200">
                1
              </span>
              <span>
                Select a date range and click <strong className="text-brand-cream-100">Import</strong>.
                The app will query Starboard Suite for all booked events in
                that range.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-brass-700/50 text-xs font-bold text-brand-brass-200">
                2
              </span>
              <span>
                Each cruise will be created as a new <strong className="text-brand-cream-100">DRAFT</strong>{" "}
                scheduled event with the title, date, and times pulled from
                Starboard Suite. Duplicate events (matching <code className="text-brand-brass-200">sourceId</code>)
                are skipped.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-brass-700/50 text-xs font-bold text-brand-brass-200">
                3
              </span>
              <span>
                Laura assigns crew to each imported cruise in the normal
                schedule view, then publishes the week.
              </span>
            </li>
          </ol>

          {/* Import button — disabled until API is wired */}
          <div className="mt-6">
            <button
              disabled
              className="inline-flex items-center gap-2 rounded-full bg-brand-brass-400 px-6 py-3 text-sm font-semibold text-brand-moss-800 opacity-40 cursor-not-allowed"
              title="Starboard Suite API access pending"
            >
              Import cruises
            </button>
            <p className="mt-2 text-xs text-brand-cream-500">
              This button will become active once{" "}
              <code className="text-brand-cream-400">STARBOARD_API_KEY</code> is
              set in the environment.
            </p>
          </div>
        </div>

        {/* Technical notes for when API access arrives */}
        <details className="mt-4 rounded-xl border border-brand-moss-500/30 bg-brand-moss-800/40 px-4 py-3 text-sm text-brand-cream-500">
          <summary className="cursor-pointer font-medium text-brand-cream-400">
            Developer notes (expand when API key arrives)
          </summary>
          <div className="mt-3 space-y-2 font-mono text-xs">
            <p>// 1. Add to .env.local + Vercel env vars:</p>
            <p className="text-brand-cream-300">STARBOARD_API_KEY=&quot;...&quot;</p>
            <p className="mt-2">// 2. Wire the import route handler at:</p>
            <p className="text-brand-cream-300">
              POST /api/schedule/import-starboard
            </p>
            <p className="mt-2">
              // 3. For each event from Starboard, call prisma.scheduledEvent.upsert
            </p>
            <p className="mt-1">
              // &#123; where: &#123; sourceId_sourceType: &#123; sourceId, sourceType: &quot;starboard&quot; &#125; &#125;, ... &#125;
            </p>
          </div>
        </details>
      </div>
    </main>
  );
}
