import { requireRole } from "@/lib/auth";
import { LogFormWrapper } from "@/components/logs/LogFormWrapper";
import { CruiseForm } from "@/components/logs/CruiseForm";
import { CRUISE } from "@/lib/monday-schema";

export const dynamic = "force-dynamic";

export default async function NewCruiseEntryPage() {
  const user = await requireRole(["CAPTAIN", "ADMIN"]);

  const today = new Date().toISOString().slice(0, 10);

  // Try to match the logged-in user's name to a captain label
  const captainLabels = CRUISE.columns.captain.labels as readonly string[];
  const defaultCaptain = captainLabels.find((l) =>
    l.toLowerCase().includes(user.name.split(" ")[0].toLowerCase())
  ) ?? "Other";

  return (
    <LogFormWrapper
      title="New Cruise Entry"
      backHref="/cruise-log"
      backLabel="Cruise Log"
    >
      <CruiseForm defaultCaptain={defaultCaptain} defaultDate={today} />
    </LogFormWrapper>
  );
}
