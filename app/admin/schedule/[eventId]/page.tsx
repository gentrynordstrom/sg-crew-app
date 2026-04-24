import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { EventForm } from "@/components/schedule/EventForm";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  formatEventTime,
  formatWeekDayLabel,
  mondayOfWeek,
} from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: { eventId: string };
}) {
  await requireAdmin();

  const [event, allUsers] = await Promise.all([
    prisma.scheduledEvent.findUnique({
      where: { id: params.eventId },
      include: {
        shifts: {
          include: { user: { select: { id: true, name: true, role: true } } },
        },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!event) notFound();

  const dateYmd = event.date.toISOString().slice(0, 10);
  const weekMonday = mondayOfWeek(new Date(dateYmd + "T12:00:00Z"));
  const typeColor = EVENT_TYPE_COLORS[event.eventType];

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Logo size={56} />
            <div>
              <Link
                href={`/admin/schedule?week=${weekMonday}`}
                className="text-sm text-brand-cream-400 underline-offset-4 hover:text-brand-cream-200 hover:underline"
              >
                ← Schedule
              </Link>
              <h1 className="mt-1 text-2xl font-semibold text-brand-cream-100">
                Edit Event
              </h1>
            </div>
          </div>
          <SignOutButton />
        </header>

        <AdminNav />

        {/* Event summary card */}
        <div className={`mb-5 rounded-xl px-4 py-3 ring-1 ${typeColor}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{event.title}</p>
              <p className="text-sm opacity-80">
                {formatWeekDayLabel(dateYmd)} &nbsp;·&nbsp;{" "}
                {formatEventTime(event.startTime)} –{" "}
                {formatEventTime(event.endTime)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs font-medium">
                {EVENT_TYPE_LABELS[event.eventType]}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  event.status === "PUBLISHED"
                    ? "bg-emerald-900/40 text-emerald-100"
                    : event.status === "DRAFT"
                    ? "bg-brand-brass-700/40 text-brand-brass-100"
                    : "bg-red-900/40 text-red-100"
                }`}
              >
                {event.status}
              </span>
            </div>
          </div>
          {event.shifts.length > 0 && (
            <p className="mt-2 text-sm opacity-70">
              Crew: {event.shifts.map((s) => s.user.name).join(", ")}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60 p-5 shadow-sm">
          <EventForm mode="edit" event={event} allUsers={allUsers} />
        </div>
      </div>
    </main>
  );
}
