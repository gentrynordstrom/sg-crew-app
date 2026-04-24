/**
 * Shared wrapper for log entry forms.
 * Provides the page chrome (header + back link) and a card container.
 */
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";

interface LogFormWrapperProps {
  title: string;
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
}

export function LogFormWrapper({
  title,
  backHref,
  backLabel,
  children,
}: LogFormWrapperProps) {
  return (
    <main className="min-h-screen bg-brand-moss-700 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Logo size={56} />
            <div>
              <Link
                href={backHref}
                className="text-sm text-brand-cream-400 underline-offset-4 hover:text-brand-cream-200 hover:underline"
              >
                ← {backLabel}
              </Link>
              <h1 className="mt-1 text-2xl font-semibold text-brand-cream-100">
                {title}
              </h1>
            </div>
          </div>
          <SignOutButton />
        </header>

        <div className="rounded-2xl bg-brand-moss-600/50 p-6 ring-1 ring-brand-cream-900/30">
          {children}
        </div>
      </div>
    </main>
  );
}
