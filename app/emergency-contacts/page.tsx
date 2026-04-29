import Link from "next/link";
import { requireActiveSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

const CONTACTS = [
  {
    name: "RiverQuest",
    phoneLabel: "815-693-2711",
    phoneHref: "tel:+18156932711",
  },
];

export default async function EmergencyContactsPage() {
  await requireActiveSession();

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-3xl">
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
              <h1 className="mt-1 text-2xl font-semibold text-brand-cream-100">Emergency Contacts</h1>
              <p className="text-sm text-brand-cream-400">
                Call this list first when an urgent situation happens.
              </p>
            </div>
          </div>
          <SignOutButton />
        </header>

        <section className="space-y-2">
          {CONTACTS.map((contact) => (
            <a
              key={contact.name}
              href={contact.phoneHref}
              className="flex items-center justify-between rounded-xl border border-brand-moss-500/40 bg-brand-moss-800/60 px-4 py-3 transition hover:border-brand-brass-400/40"
            >
              <span className="text-sm font-semibold text-brand-cream-100">{contact.name}</span>
              <span className="text-sm text-brand-brass-300">{contact.phoneLabel}</span>
            </a>
          ))}
        </section>
      </div>
    </main>
  );
}
