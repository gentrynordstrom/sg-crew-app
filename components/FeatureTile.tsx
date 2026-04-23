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
      className="flex min-h-[7rem] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-sea hover:shadow-md active:scale-[0.99]"
    >
      <div>
        <h2 className="text-lg font-semibold text-brand-navy">{label}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
    </Link>
  );
}
