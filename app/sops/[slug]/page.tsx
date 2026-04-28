import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { SopBlockRenderer } from "@/components/sops/SopBlockRenderer";

export const dynamic = "force-dynamic";

export default async function SopDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const user = await requireActiveSession();

  const doc = await prisma.sopDocument.findFirst({
    where: {
      slug: params.slug,
      status: "ACTIVE",
      OR: [{ roleAccess: { some: { role: user.role } } }, { roleAccess: { none: {} } }],
    },
    include: {
      blocks: {
        orderBy: [{ orderIndex: "asc" }],
        select: {
          id: true,
          type: true,
          depth: true,
          payload: true,
        },
      },
    },
  });

  if (!doc) notFound();

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Logo size={56} />
            <div>
              <Link
                href="/sops"
                className="text-sm text-brand-cream-400 underline-offset-4 hover:text-brand-cream-200 hover:underline"
              >
                ← SOPs
              </Link>
              <h1 className="mt-1 text-2xl font-semibold text-brand-cream-100">{doc.title}</h1>
              <p className="text-xs text-brand-cream-500">
                Last synced {doc.lastSyncedAt ? doc.lastSyncedAt.toLocaleString() : "unknown"}
              </p>
            </div>
          </div>
          <SignOutButton />
        </header>

        <article className="rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60 p-5">
          {doc.summary && <p className="mb-4 text-sm text-brand-cream-300">{doc.summary}</p>}
          <SopBlockRenderer
            blocks={doc.blocks.map((b) => ({
              id: b.id,
              type: b.type,
              depth: b.depth,
              payload: b.payload,
            }))}
          />
          {doc.notionUrl && (
            <p className="mt-6 text-xs text-brand-cream-500">
              Source:{" "}
              <a
                href={doc.notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-brass-300 underline underline-offset-2"
              >
                Open in Notion
              </a>
            </p>
          )}
        </article>
      </div>
    </main>
  );
}
