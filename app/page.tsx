import { requireActiveSession } from "@/lib/auth";
import { tilesForRole } from "@/lib/roles";
import { FeatureTile } from "@/components/FeatureTile";
import { RoleBadge } from "@/components/RoleBadge";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireActiveSession();
  const tiles = tilesForRole(user.role);

  return (
    <main className="min-h-screen bg-brand-foam px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Signed in as</p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-2xl font-bold text-brand-navy">
                {user.name}
              </h1>
              <RoleBadge role={user.role} />
            </div>
          </div>
          <SignOutButton />
        </header>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Your tools
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tiles.map((t) => (
              <FeatureTile
                key={t.feature}
                label={t.label}
                description={t.description}
                href={t.href}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
