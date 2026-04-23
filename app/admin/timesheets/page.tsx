import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { TimesheetTable } from "@/components/admin/TimesheetTable";
import {
  defaultDateRange,
  endOfPayrollDay,
  startOfPayrollDay,
} from "@/lib/time";

export const dynamic = "force-dynamic";

function isYmd(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function AdminTimesheetsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  await requireAdmin();

  const defaults = defaultDateRange();
  const from = isYmd(searchParams.from) ? searchParams.from : defaults.from;
  const to = isYmd(searchParams.to) ? searchParams.to : defaults.to;

  const rows = await prisma.timeEntry.findMany({
    where: {
      clockInAt: {
        gte: startOfPayrollDay(from),
        lte: endOfPayrollDay(to),
      },
    },
    orderBy: [{ clockInAt: "desc" }],
    select: {
      id: true,
      clockInAt: true,
      clockOutAt: true,
      breakStartAt: true,
      breakEndAt: true,
      note: true,
      status: true,
      user: {
        select: { id: true, name: true, role: true, phone: true },
      },
    },
  });

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-6xl">
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
                Timesheets
              </h1>
              <p className="text-sm text-brand-cream-400">
                Review, correct, and lock shifts. Export CSV at the end of each
                pay period for upload to payroll.
              </p>
            </div>
          </div>
          <SignOutButton />
        </header>

        <AdminNav />

        <TimesheetTable rows={rows} from={from} to={to} />
      </div>
    </main>
  );
}
