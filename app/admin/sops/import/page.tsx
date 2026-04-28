import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { SopSyncButton } from "@/components/sops/SopSyncButton";

export const dynamic = "force-dynamic";

export default async function SopImportPage() {
  await requireAdmin();

  const last = await prisma.sopDocument.findFirst({
    where: { sourceType: "notion" },
    orderBy: { lastSyncedAt: "desc" },
    select: { lastSyncedAt: true },
  });

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
                ← Admin
              </Link>
              <h1 className="mt-1 text-2xl font-semibold text-brand-cream-100">
                Import SOPs from Notion
              </h1>
            </div>
          </div>
          <SignOutButton />
        </header>

        <AdminNav />

        <div className="rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60 p-5">
          <p className="mb-2 text-sm text-brand-cream-300">
            Pull SOP documents from your configured Notion database, cache them in SG Crew,
            and enforce app role access.
          </p>
          <p className="mb-4 text-xs text-brand-cream-500">
            Last synced: {last?.lastSyncedAt ? last.lastSyncedAt.toLocaleString() : "Never"}
          </p>

          <SopSyncButton />
        </div>
      </div>
    </main>
  );
}
