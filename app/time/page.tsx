import Link from "next/link";
import { requireActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { TimeClockCard } from "@/components/time/TimeClockCard";
import { ShiftHistory } from "@/components/time/ShiftHistory";

export const dynamic = "force-dynamic";

export default async function TimePage() {
  const user = await requireActiveSession();

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const shifts = await prisma.timeEntry.findMany({
    where: {
      userId: user.id,
      clockInAt: { gte: fourteenDaysAgo },
    },
    orderBy: { clockInAt: "desc" },
    select: {
      id: true,
      clockInAt: true,
      clockOutAt: true,
      breakStartAt: true,
      breakEndAt: true,
      note: true,
      status: true,
    },
  });

  const activeShift = shifts.find((s) => s.clockOutAt === null) ?? null;
  const finishedShifts = shifts.filter((s) => s.clockOutAt !== null);

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-2xl">
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
                Time Tracking
              </h1>
              <p className="text-sm text-brand-cream-400">
                Clock in when you start. Take a meal break. Clock out when
                you&apos;re done.
              </p>
            </div>
          </div>
          <SignOutButton />
        </header>

        <div className="mb-8">
          <TimeClockCard
            activeShift={
              activeShift
                ? {
                    id: activeShift.id,
                    clockInAt: activeShift.clockInAt.toISOString(),
                    breakStartAt:
                      activeShift.breakStartAt?.toISOString() ?? null,
                    breakEndAt: activeShift.breakEndAt?.toISOString() ?? null,
                  }
                : null
            }
          />
        </div>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-cream-400">
            Recent shifts (last 14 days)
          </h2>
          <ShiftHistory shifts={finishedShifts} />
        </section>
      </div>
    </main>
  );
}
