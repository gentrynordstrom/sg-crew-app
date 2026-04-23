import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PinPad } from "@/components/PinPad";
import { Logo } from "@/components/Logo";

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
    <main className="min-h-screen bg-brand-moss-700 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/login"
            className="text-sm text-brand-cream-400 underline-offset-4 hover:text-brand-cream-200 hover:underline"
          >
            ← All crew
          </Link>
          <Logo size={40} />
        </div>
        <div className="rounded-3xl border border-brand-moss-500/40 bg-brand-moss-800/60 p-6 shadow-xl">
          <PinPad userId={user.id} userName={user.name} />
        </div>
      </div>
    </main>
  );
}
