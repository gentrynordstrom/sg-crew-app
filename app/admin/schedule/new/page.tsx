import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { EventForm } from "@/components/schedule/EventForm";

export const dynamic = "force-dynamic";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  await requireAdmin();

  const allUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const defaultDate =
    searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : undefined;

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
                New Event
              </h1>
            </div>
          </div>
          <SignOutButton />
        </header>

        <AdminNav />

        <div className="rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60 p-5 shadow-sm">
          <EventForm mode="create" allUsers={allUsers} defaultDate={defaultDate} />
        </div>
      </div>
    </main>
  );
}
