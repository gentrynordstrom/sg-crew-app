import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RoleBadge } from "@/components/RoleBadge";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true },
  });

  return (
    <main className="min-h-screen bg-brand-foam px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-brand-navy">
            SG Crew
          </h1>
          <p className="mt-2 text-slate-600">Tap your name to sign in.</p>
        </header>

        {users.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
            No active crew members yet. Run <code>npm run db:seed</code> to
            create the bootstrap admin.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {users.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/login/${u.id}`}
                  className="flex min-h-touch items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-brand-sea hover:shadow active:scale-[0.99]"
                >
                  <span className="text-lg font-semibold text-brand-navy">
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
