interface StatusChipProps {
  label: string;
  variant?: "default" | "success" | "warning" | "danger" | "muted";
}

const variants: Record<NonNullable<StatusChipProps["variant"]>, string> = {
  default: "bg-brand-brass-700/40 text-brand-brass-200",
  success: "bg-emerald-900/50 text-emerald-200",
  warning: "bg-amber-900/50 text-amber-200",
  danger: "bg-red-900/50 text-red-200",
  muted: "bg-brand-moss-600/60 text-brand-cream-400",
};

export function StatusChip({ label, variant = "default" }: StatusChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-white/10 ${variants[variant]}`}
    >
      {label}
    </span>
  );
}
