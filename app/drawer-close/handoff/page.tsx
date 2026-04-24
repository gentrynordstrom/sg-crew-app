import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogFormWrapper } from "@/components/logs/LogFormWrapper";
import { PatioHandoffForm } from "@/components/logs/PatioHandoffForm";

export const dynamic = "force-dynamic";

export default async function PatioHandoffPage() {
  const user = await requireRole(["HOSPITALITY", "ADMIN"]);

  const today = new Date().toISOString().slice(0, 10);

  // List of other active HOSPITALITY/ADMIN users to pick from as the Patio bartender
  const otherUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["HOSPITALITY", "ADMIN"] },
      id: { not: user.id },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <LogFormWrapper
      title="Log Patio Handoff"
      backHref="/drawer-close"
      backLabel="Drawer Close Log"
    >
      <PatioHandoffForm defaultDate={today} otherUsers={otherUsers} />
    </LogFormWrapper>
  );
}
