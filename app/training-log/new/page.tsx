import { requireRole } from "@/lib/auth";
import { dropdownLabelsFromSnapshot, fetchMondayBoardSnapshot } from "@/lib/monday-board";
import { LogFormWrapper } from "@/components/logs/LogFormWrapper";
import { TrainingForm } from "@/components/logs/TrainingForm";
import { TRAINING } from "@/lib/monday-schema";

export const dynamic = "force-dynamic";

export default async function NewTrainingEntryPage() {
  const user = await requireRole(["CAPTAIN", "ADMIN"]);
  const today = new Date().toISOString().slice(0, 10);

  let trainingTypeOptions: string[] = [];
  let trainingTypeLoadError: string | null = null;

  try {
    const snapshot = await fetchMondayBoardSnapshot(TRAINING.boardId);
    trainingTypeOptions = dropdownLabelsFromSnapshot(
      snapshot.columns,
      TRAINING.columns.trainingType.id
    );
    if (trainingTypeOptions.length === 0) {
      trainingTypeLoadError =
        "No training type options were returned from Monday. Check the dropdown column on the training board.";
    }
  } catch (e) {
    trainingTypeLoadError =
      e instanceof Error ? e.message : "Failed to load training type options from Monday.";
  }

  return (
    <LogFormWrapper
      title="New Training Entry"
      backHref="/training-log"
      backLabel="Training Log"
    >
      <TrainingForm
        defaultDate={today}
        crewName={user.name}
        trainingTypeOptions={trainingTypeOptions}
        trainingTypeLoadError={trainingTypeLoadError}
      />
    </LogFormWrapper>
  );
}
