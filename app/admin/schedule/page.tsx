import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { WeeklyCalendar } from "@/components/schedule/WeeklyCalendar";
import {
  mondayOfWeek,
  weekDays,
  weekRangeLabel,
  offsetWeek,
  todayYmd,
} from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  await requireAdmin();

  const today = todayYmd();
  const rawWeek = searchParams.week;
  const monday =
    rawWeek && /^\d{4}-\d{2}-\d{2}$/.test(rawWeek)
      ? mondayOfWeek(new Date(rawWeek + "T12:00:00Z"))
      : mondayOfWeek(new Date());

  const days = weekDays(monday);
  const weekStart = new Date(days[0] + "T00:00:00Z");
  const weekEnd = new Date(
    new Date(days[6] + "T00:00:00Z").getTime() + 86400000
  );

  const events = await prisma.scheduledEvent.findMany({
    where: { date: { gte: weekStart, lt: weekEnd } },
    include: {
      shifts: { include: { user: { select: { id: true, name: true, role: true } } } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const prevWeek = offsetWeek(monday, -1);
  const nextWeek = offsetWeek(monday, 1);

  const hasDrafts = events.some((e) => e.status === "DRAFT");

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Logo size={56} />
            <div>
              <Link
                href="/"
                className="text-sm text-brand-cream-400 underline-offset-4 hover:text-brand-cream-200 hover:underline"
              >
                ← Home
              </Link>
              <h1 className="mt-1 text-2xl font-semibold text-brand-cream-100">
                Schedule
              </h1>
              <p className="text-sm text-brand-cream-400">
                Build and publish the crew schedule.
              </p>
            </div>
          </div>
          <SignOutButton />
        </header>

        <AdminNav />

        {/* Week header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/schedule?week=${prevWeek}`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-cream-700/40 text-brand-cream-400 hover:border-brand-brass-400/60 hover:text-brand-brass-300"
            >
              ‹
            </Link>
            <span className="text-sm font-semibold text-brand-cream-200">
              {weekRangeLabel(monday)}
            </span>
            <Link
              href={`/admin/schedule?week=${nextWeek}`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-cream-700/40 text-brand-cream-400 hover:border-brand-brass-400/60 hover:text-brand-brass-300"
            >
              ›
            </Link>
            {monday !== mondayOfWeek(new Date()) && (
              <Link
                href="/admin/schedule"
                className="rounded-full border border-brand-cream-700/40 px-3 py-1 text-xs text-brand-cream-400 hover:border-brand-brass-400/60 hover:text-brand-brass-300"
              >
                Today
              </Link>
            )}
          </div>

          <div className="flex gap-2">
            <Link
              href="/admin/schedule/import"
              className="rounded-full border border-brand-cream-700/40 px-4 py-2 text-sm font-medium text-brand-cream-300 hover:border-brand-brass-400/60 hover:text-brand-brass-200"
            >
              Import cruises
            </Link>
            <Link
              href={`/admin/schedule/new?date=${today}`}
              className="inline-flex items-center rounded-full bg-brand-brass-400 px-4 py-2 text-sm font-semibold text-brand-moss-800 shadow-sm transition hover:bg-brand-brass-300"
            >
              + New event
            </Link>
          </div>
        </div>

        <WeeklyCalendar
          days={days}
          events={events}
          monday={monday}
          hasDrafts={hasDrafts}
        />
      </div>
    </main>
  );
}
