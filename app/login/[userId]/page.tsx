import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PinPad } from "@/components/PinPad";

export const dynamic = "force-dynamic";

export default async function PinPage({
  params,
}: {
  params: { userId: string };
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, name: true, isActive: true },
  });

  if (!user || !user.isActive) notFound();

  return (
    <main className="min-h-screen bg-brand-foam px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <Link
            href="/login"
            className="text-sm text-slate-500 underline-offset-4 hover:underline"
          >
            ← All crew
          </Link>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <PinPad userId={user.id} userName={user.name} />
        </div>
      </div>
    </main>
  );
}
