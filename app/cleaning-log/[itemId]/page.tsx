import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { fetchMondayItem } from "@/lib/monday-item";
import { CLEANING } from "@/lib/monday-schema";
import { LogFormWrapper } from "@/components/logs/LogFormWrapper";
import { LogDetailView } from "@/components/logs/LogDetailView";

export const dynamic = "force-dynamic";

export default async function CleaningDetailPage({
  params,
}: {
  params: { itemId: string };
}) {
  await requireRole(["CAPTAIN", "DECKHAND", "HOSPITALITY", "ADMIN"]);
  const item = await fetchMondayItem(params.itemId);
  if (!item) notFound();

  function col(id: string) {
    return item!.column_values.find((c) => c.id === id)?.text || null;
  }

  const fields = [
    { label: "Date", value: col(CLEANING.columns.date.id) },
    { label: "Crew Member", value: col(CLEANING.columns.crewMember.id) },
    { label: "Cleaning Type", value: col(CLEANING.columns.cleaningType.id) },
    { label: "Maintenance Needed?", value: col(CLEANING.columns.maintenanceNeeded.id) },
    { label: "Notes", value: col(CLEANING.columns.notes.id), wide: true },
  ];

  return (
    <LogFormWrapper title={item.name} backHref="/cleaning-log" backLabel="Cleaning Log">
      <LogDetailView title={item.name} fields={fields} assets={item.assets} />
    </LogFormWrapper>
  );
}
