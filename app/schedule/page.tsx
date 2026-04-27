import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  formatEventTime,
  formatWeekDayLabel,
  todayYmd,
} from "@/lib/schedule";
import { ROLE_LABELS } from "@/lib/roles";
import { startOfPayrollDay, endOfPayrollDay } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const user = await requireRole([
    "CAPTAIN",
    "DECKHAND",
    "MECHANIC",
    "HOSPITALITY",
    "NARRATOR",
    "ADMIN",
  ]);

  const today = todayYmd();
  // Show 7 days in the past and 30 days ahead
  const pastDate = new Date(Date.now() - 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  const futureDate = new Date(Date.now() + 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  const shifts = await prisma.scheduledShift.findMany({
    where: {
      userId: user.id,
      event: {
        status: { in: ["PUBLISHED", "DRAFT", "CANCELLED"] },
        date: {
          gte: new Date(pastDate + "T00:00:00Z"),
          lte: new Date(futureDate + "T23:59:59Z"),
        },
      },
    },
    include: {
      event: {
        include: {
          shifts: {
            include: { user: { select: { id: true, name: true, role: true } } },
          },
        },
      },
    },
    orderBy: [{ event: { date: "asc" } }, { event: { startTime: "asc" } }],
  });

  // Group by date
  const grouped = new Map<string, typeof shifts>();
  for (const s of shifts) {
    const ymd = s.event.date.toISOString().slice(0, 10);
    if (!grouped.has(ymd)) grouped.set(ymd, []);
    grouped.get(ymd)!.push(s);
  }

  const sortedDates = Array.from(grouped.keys()).sort();

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-xl">
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
                My Schedule
              </h1>
              <p className="text-sm text-brand-cream-400">
                Your upcoming shifts for the next 30 days.
              </p>
            </div>
          </div>
          <SignOutButton />
        </header>

        {sortedDates.length === 0 ? (
          <div className="rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60 px-6 py-10 text-center">
            <p className="text-brand-cream-300">No upcoming shifts scheduled.</p>
            <p className="mt-1 text-sm text-brand-cream-500">
              Check back after the schedule has been published.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((ymd) => {
              const dayShifts = grouped.get(ymd)!;
              const isPast = ymd < today;
              const isToday = ymd === today;

              return (
                <div key={ymd} className={isPast ? "opacity-60" : ""}>
                  {/* Day header */}
                  <div
                    className={`mb-2 flex items-center gap-2 rounded-lg px-3 py-2 ${
                      isToday
                        ? "bg-brand-brass-400 text-brand-moss-800"
                        : "bg-brand-moss-800/60 text-brand-cream-300"
                    }`}
                  >
                    <span className="font-semibold">
                      {formatWeekDayLabel(ymd)}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-brand-moss-800/30 px-2 py-0.5 text-xs font-semibold">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Shift cards */}
                  <div className="space-y-3">
                    {dayShifts.map((s) => {
                      const ev = s.event;
                      const color = EVENT_TYPE_COLORS[ev.eventType];
                      const isDraft = ev.status === "DRAFT";
                      const isCancelled = ev.status === "CANCELLED";
                      const otherCrew = ev.shifts
                        .filter((sh) => sh.userId !== user.id)
                        .map((sh) => sh.user.name);

                      return (
                        <div
                          key={s.id}
                          className={`rounded-xl px-4 py-4 ring-1 ${
                            isCancelled
                              ? "bg-gray-800/60 ring-gray-600/40 opacity-60"
                              : `${color} ${isDraft ? "opacity-70" : ""}`
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`font-semibold ${isCancelled ? "line-through text-gray-400" : ""}`}>
                                {ev.title}
                              </p>
                              <p className="mt-0.5 text-sm opacity-80">
                                {formatEventTime(s.shiftStart ?? ev.startTime)} –{" "}
                                {formatEventTime(s.shiftEnd ?? ev.endTime)}
                              </p>
                              {s.shiftStart &&
                                s.shiftStart.getTime() !== ev.startTime.getTime() && (
                                  <p className="mt-0.5 text-xs opacity-60">
                                    Event departs at {formatEventTime(ev.startTime)}
                                  </p>
                                )}
                              {s.roleForShift && s.roleForShift !== user.role && (
                                <p className="mt-1 text-xs font-medium opacity-80">
                                  Working as: {ROLE_LABELS[s.roleForShift]}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs font-medium">
                                {EVENT_TYPE_LABELS[ev.eventType]}
                              </span>
                              {isCancelled && (
                                <span className="rounded-full bg-red-900/60 px-2 py-0.5 text-[10px] font-medium text-red-300">
                                  Cancelled
                                </span>
                              )}
                              {isDraft && !isCancelled && (
                                <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-medium">
                                  Tentative
                                </span>
                              )}
                            </div>
                          </div>

                          {isCancelled && (
                            <p className="mt-2 text-xs text-red-400">
                              This shift has been cancelled. You are not expected to report.
                            </p>
                          )}

                          {ev.notes && !isCancelled && (
                            <p className="mt-2 text-sm opacity-75">
                              {ev.notes}
                            </p>
                          )}

                          {otherCrew.length > 0 && !isCancelled && (
                            <p className="mt-2 text-xs opacity-70">
                              With: {otherCrew.join(", ")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
