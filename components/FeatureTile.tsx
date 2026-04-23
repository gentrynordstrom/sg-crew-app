import Link from "next/link";

interface FeatureTileProps {
  label: string;
  description: string;
  href: string;
}

export function FeatureTile({ label, description, href }: FeatureTileProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-[7rem] flex-col justify-between rounded-2xl border border-brand-moss-500/40 bg-brand-moss-800/60 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-brass-400/60 hover:bg-brand-moss-800 hover:shadow-lg active:scale-[0.99]"
    >
      <div>
        <h2 className="text-lg font-semibold text-brand-cream-100 group-hover:text-brand-brass-200">
          {label}
        </h2>
        <p className="mt-1 text-sm text-brand-cream-400">{description}</p>
      </div>
    </Link>
  );
}
