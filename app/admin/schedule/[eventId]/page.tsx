import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { EventForm } from "@/components/schedule/EventForm";
import type { StarboardMetadata } from "@/lib/starboard";
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

        {/* Synced from Starboard panel */}
        {event.sourceMetadata && (() => {
          const meta = event.sourceMetadata as unknown as StarboardMetadata;
          const seatsAvailable = meta.num_seats_available;
          const seatsStatus = meta.status;
          const lastSynced = meta.last_synced_at
            ? new Date(meta.last_synced_at).toLocaleString()
            : null;

          return (
            <div className="mt-4 rounded-xl border border-sky-500/30 bg-sky-900/10 px-4 py-4 text-sm">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-sky-300">Synced from Starboard Suite</span>
              </div>
              <dl className="space-y-1.5 text-brand-cream-300">
                {meta.event_type_name && (
                  <div className="flex gap-2">
                    <dt className="w-32 shrink-0 text-brand-cream-500">Event type</dt>
                    <dd className="text-brand-cream-200">{meta.event_type_name}</dd>
                  </div>
                )}
                <div className="flex gap-2">
                  <dt className="w-32 shrink-0 text-brand-cream-500">Seats / status</dt>
                  <dd className="text-brand-cream-200">
                    {seatsAvailable} seats available —{" "}
                    <span className={
                      seatsStatus === "Available"
                        ? "text-emerald-300"
                        : seatsStatus === "Full"
                        ? "text-red-300"
                        : "text-brand-brass-300"
                    }>
                      {seatsStatus}
                    </span>
                  </dd>
                </div>
                {meta.departure_location_name && (
                  <div className="flex gap-2">
                    <dt className="w-32 shrink-0 text-brand-cream-500">Departure</dt>
                    <dd className="text-brand-cream-200">{meta.departure_location_name}</dd>
                  </div>
                )}
                {meta.online_booking_url && (
                  <div className="flex gap-2">
                    <dt className="w-32 shrink-0 text-brand-cream-500">Booking URL</dt>
                    <dd>
                      <a
                        href={meta.online_booking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 underline underline-offset-2 hover:text-sky-300"
                      >
                        View on Starboard ↗
                      </a>
                    </dd>
                  </div>
                )}
                {lastSynced && (
                  <div className="flex gap-2">
                    <dt className="w-32 shrink-0 text-brand-cream-500">Last synced</dt>
                    <dd className="text-brand-cream-400">{lastSynced}</dd>
                  </div>
                )}
              </dl>
            </div>
          );
        })()}
      </div>
    </main>
  );
}
