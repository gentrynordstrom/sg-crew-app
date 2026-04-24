import { requireRole } from "@/lib/auth";
import { LogFormWrapper } from "@/components/logs/LogFormWrapper";
import { CleaningForm } from "@/components/logs/CleaningForm";

export const dynamic = "force-dynamic";

export default async function NewCleaningEntryPage() {
  const user = await requireRole(["CAPTAIN", "DECKHAND", "HOSPITALITY", "ADMIN"]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <LogFormWrapper
      title="New Cleaning Entry"
      backHref="/cleaning-log"
      backLabel="Cleaning Log"
    >
      <CleaningForm defaultDate={today} crewName={user.name} />
    </LogFormWrapper>
  );
}
