import Link from "next/link";
import { requireActiveSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function ComingSoonPage() {
  await requireActiveSession();

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-16">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <Logo size={96} />
        <h1 className="mt-6 text-3xl font-semibold text-brand-cream-100">
          Coming soon
        </h1>
        <p className="mt-3 text-brand-cream-300">
          This feature is still being built. Check back after Phase 2.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-touch items-center rounded-full bg-brand-brass-400 px-6 py-3 text-sm font-semibold text-brand-moss-800 shadow-sm transition hover:bg-brand-brass-300"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
