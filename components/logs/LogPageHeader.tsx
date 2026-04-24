import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";

interface LogPageHeaderProps {
  title: string;
  description: string;
  newHref: string;
  newLabel?: string;
}

export function LogPageHeader({
  title,
  description,
  newHref,
  newLabel = "New Entry",
}: LogPageHeaderProps) {
  return (
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
            {title}
          </h1>
          <p className="text-sm text-brand-cream-400">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={newHref}
          className="rounded-xl bg-brand-brass-500 px-4 py-2 text-sm font-semibold text-brand-moss-900 transition hover:bg-brand-brass-400 active:scale-[0.97]"
        >
          + {newLabel}
        </Link>
        <SignOutButton />
      </div>
    </header>
  );
}
