import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserForm } from "@/components/admin/UserForm";
import { UserTable } from "@/components/admin/UserTable";
import { SignOutButton } from "@/components/SignOutButton";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      lockedUntil: true,
    },
  });

  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-5xl">
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
              <h1 className="mt-1 text-2xl font-semibold text-brand-cream-100">
                User management
              </h1>
              <p className="text-sm text-brand-cream-400">
                Add crew, change roles, and deactivate accounts. Changing a phone
                number resets that user&apos;s PIN to the new last 4 digits.
              </p>
            </div>
          </div>
          <SignOutButton />
        </header>

        <section className="mb-10 rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60 p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-brand-cream-100">
            Add a new user
          </h2>
          <UserForm mode="create" />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-brand-cream-100">
            All users
          </h2>
          <UserTable users={users} currentAdminId={admin.id} />
        </section>
      </div>
    </main>
  );
}
