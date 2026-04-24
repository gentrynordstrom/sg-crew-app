import { requireRole } from "@/lib/auth";
import { LogFormWrapper } from "@/components/logs/LogFormWrapper";
import { MaintenanceForm } from "@/components/logs/MaintenanceForm";

export const dynamic = "force-dynamic";

export default async function NewMaintenanceEntryPage() {
  const user = await requireRole(["CAPTAIN", "DECKHAND", "MECHANIC", "ADMIN"]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <LogFormWrapper
      title="New Maintenance Entry"
      backHref="/maintenance-log"
      backLabel="Maintenance Log"
    >
      <MaintenanceForm defaultDate={today} crewName={user.name} />
    </LogFormWrapper>
  );
}
