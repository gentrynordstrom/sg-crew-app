import { requireActiveSession } from "@/lib/auth";
import { tilesForRole } from "@/lib/roles";
import { FeatureTile } from "@/components/FeatureTile";
import { RoleBadge } from "@/components/RoleBadge";
import { SignOutButton } from "@/components/SignOutButton";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireActiveSession();
  const tiles = tilesForRole(user.role);

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo size={72} priority />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-cream-400">
                Signed in as
              </p>
              <div className="mt-1 flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-brand-cream-100">
                  {user.name}
                </h1>
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>
          <SignOutButton />
        </header>

        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-cream-400">
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
