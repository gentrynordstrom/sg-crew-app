import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { fetchMondayItem } from "@/lib/monday-item";
import { MAINTENANCE } from "@/lib/monday-schema";
import { LogFormWrapper } from "@/components/logs/LogFormWrapper";
import { LogDetailView } from "@/components/logs/LogDetailView";

export const dynamic = "force-dynamic";

export default async function MaintenanceDetailPage({
  params,
}: {
  params: { itemId: string };
}) {
  await requireRole(["CAPTAIN", "DECKHAND", "MECHANIC", "ADMIN"]);
  const item = await fetchMondayItem(params.itemId);
  if (!item) notFound();

  function col(id: string) {
    return item!.column_values.find((c) => c.id === id)?.text || null;
  }

  const fields = [
    { label: "Date", value: col(MAINTENANCE.columns.date.id) },
    { label: "Crew Member", value: col(MAINTENANCE.columns.crewMember.id) },
    { label: "Maintenance Type", value: col(MAINTENANCE.columns.maintenanceType.id) },
    { label: "Resolved?", value: col(MAINTENANCE.columns.resolved.id) },
    { label: "Notes / Description", value: col(MAINTENANCE.columns.notes.id), wide: true },
  ];

  return (
    <LogFormWrapper title={item.name} backHref="/maintenance-log" backLabel="Maintenance Log">
      <LogDetailView title={item.name} fields={fields} assets={item.assets} />
    </LogFormWrapper>
  );
}
