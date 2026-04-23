import Link from "next/link";
import { requireActiveSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ComingSoonPage() {
  await requireActiveSession();

  return (
    <main className="min-h-screen bg-brand-foam px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-3xl font-bold text-brand-navy">Coming soon</h1>
        <p className="mt-3 text-slate-600">
          This feature is still being built. Check back after Phase 2.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex min-h-touch items-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-sea"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
