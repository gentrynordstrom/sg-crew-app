import Link from "next/link";
import { requireActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function SopsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const user = await requireActiveSession();
  const q = (searchParams.q ?? "").trim();

  const docs = await prisma.sopDocument.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ roleAccess: { some: { role: user.role } } }, { roleAccess: { none: {} } }],
      ...(q
        ? {
            AND: [
              {
                OR: [
                  { title: { contains: q, mode: "insensitive" as const } },
                  { summary: { contains: q, mode: "insensitive" as const } },
                ],
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      updatedAt: true,
    },
    orderBy: [{ title: "asc" }],
  });

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
              <h1 className="mt-1 text-2xl font-semibold text-brand-cream-100">SOPs</h1>
              <p className="text-sm text-brand-cream-400">
                Search and open the procedures available for your role.
              </p>
            </div>
          </div>
          <SignOutButton />
        </header>

        <form className="mb-4">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search SOPs…"
            className="w-full rounded-xl bg-brand-moss-800/70 px-4 py-3 text-sm text-brand-cream-100 ring-1 ring-brand-cream-900/40 focus:outline-none focus:ring-2 focus:ring-brand-brass-400"
          />
        </form>

        {docs.length === 0 ? (
          <div className="rounded-xl border border-brand-moss-500/40 bg-brand-moss-800/60 p-5 text-sm text-brand-cream-400">
            {q ? "No SOPs matched your search." : "No SOPs are available for your role yet."}
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <Link
                key={doc.id}
                href={`/sops/${doc.slug}`}
                className="block rounded-xl border border-brand-moss-500/40 bg-brand-moss-800/60 px-4 py-3 transition hover:border-brand-brass-400/40"
              >
                <p className="text-sm font-semibold text-brand-cream-100">{doc.title}</p>
                {doc.summary && <p className="mt-1 text-xs text-brand-cream-400">{doc.summary}</p>}
                <p className="mt-1 text-[11px] text-brand-cream-500">
                  Updated {doc.updatedAt.toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
