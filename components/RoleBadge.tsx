import type { Role } from "@prisma/client";
import { ROLE_BADGE_CLASSES, ROLE_LABELS } from "@/lib/roles";

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${ROLE_BADGE_CLASSES[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
