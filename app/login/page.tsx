import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RoleBadge } from "@/components/RoleBadge";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true },
  });

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 flex flex-col items-center text-center">
          <Logo size={160} priority />
          <p className="mt-4 text-sm uppercase tracking-[0.2em] text-brand-cream-400">
            Crew App
          </p>
          <p className="mt-2 text-brand-cream-300">
            Tap your name to sign in.
          </p>
        </header>

        {users.length === 0 ? (
          <div className="rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60 p-6 text-center text-brand-cream-400">
            No active crew members yet. Run <code className="text-brand-brass-300">npm run db:seed</code>{" "}
            to create the bootstrap admin.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {users.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/login/${u.id}`}
                  className="flex min-h-touch items-center justify-between rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60 px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-brass-400/60 hover:bg-brand-moss-800 hover:shadow-lg active:scale-[0.99]"
                >
                  <span className="text-lg font-semibold text-brand-cream-200">
                    {u.name}
                  </span>
                  <RoleBadge role={u.role} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
