import { requireRole } from "@/lib/auth";
import { LogFormWrapper } from "@/components/logs/LogFormWrapper";
import { TrainingForm } from "@/components/logs/TrainingForm";

export const dynamic = "force-dynamic";

export default async function NewTrainingEntryPage() {
  const user = await requireRole(["CAPTAIN", "ADMIN"]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <LogFormWrapper
      title="New Training Entry"
      backHref="/training-log"
      backLabel="Training Log"
    >
      <TrainingForm defaultDate={today} crewName={user.name} />
    </LogFormWrapper>
  );
}
