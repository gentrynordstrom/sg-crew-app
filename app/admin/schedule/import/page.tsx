import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { ImportButton } from "@/components/schedule/ImportButton";
import type { StarboardMetadata } from "@/lib/starboard";

export const dynamic = "force-dynamic";

export default async function ImportCruisesPage() {
  await requireAdmin();

  // Find the most recently synced event to show a "Last synced" timestamp
  const lastSyncedEvent = await prisma.scheduledEvent.findFirst({
    where: { sourceType: "starboard" },
    orderBy: { updatedAt: "desc" },
    select: { sourceMetadata: true, updatedAt: true },
  });

  const lastSyncedAt = lastSyncedEvent
    ? (lastSyncedEvent.sourceMetadata as unknown as StarboardMetadata | null)?.last_synced_at
      ?? lastSyncedEvent.updatedAt.toISOString()
    : null;

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

        {/* Last synced status */}
        {lastSyncedAt ? (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-900/10 px-4 py-3">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            <p className="text-sm text-emerald-300">
              Last synced:{" "}
              <span className="font-medium text-emerald-200">
                {new Date(lastSyncedAt).toLocaleString()}
              </span>
            </p>
          </div>
        ) : (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-brass-500/40 bg-brand-brass-900/20 px-4 py-4">
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-brass-400" />
            <div>
              <p className="font-semibold text-brand-brass-200">
                No syncs yet
              </p>
              <p className="mt-1 text-sm text-brand-brass-300/80">
                Click the button below to pull cruise events from Starboard Suite
                into the schedule as draft events.
              </p>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60 p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-brand-cream-100">
            How the sync works
          </h2>
          <ol className="space-y-4 text-sm text-brand-cream-300">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-brass-700/50 text-xs font-bold text-brand-brass-200">
                1
              </span>
              <span>
                Click <strong className="text-brand-cream-100">Sync from Starboard Suite</strong>.
                The app fetches all cruise events for the next 60 days.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-brass-700/50 text-xs font-bold text-brand-brass-200">
                2
              </span>
              <span>
                New events appear as <strong className="text-brand-cream-100">DRAFT</strong> on
                the schedule. Existing synced events are updated (times, title) without
                losing crew assignments.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-brass-700/50 text-xs font-bold text-brand-brass-200">
                3
              </span>
              <span>
                Events cancelled in Starboard are marked{" "}
                <strong className="text-brand-cream-100">CANCELLED</strong> here.
                Crew assignments are preserved for payroll records.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-brass-700/50 text-xs font-bold text-brand-brass-200">
                4
              </span>
              <span>
                Assign crew to each imported cruise in the normal schedule view,
                then publish the week.
              </span>
            </li>
          </ol>

          <div className="mt-6">
            <ImportButton />
          </div>

          <p className="mt-3 text-xs text-brand-cream-500">
            This sync also runs automatically every 30 minutes via a Vercel cron job.
          </p>
        </div>
      </div>
    </main>
  );
}
