import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { fetchMondayItem } from "@/lib/monday-item";
import { CRUISE } from "@/lib/monday-schema";
import { LogFormWrapper } from "@/components/logs/LogFormWrapper";
import { LogDetailView } from "@/components/logs/LogDetailView";

export const dynamic = "force-dynamic";

export default async function CruiseDetailPage({
  params,
}: {
  params: { itemId: string };
}) {
  await requireRole(["CAPTAIN", "ADMIN"]);
  const item = await fetchMondayItem(params.itemId);
  if (!item) notFound();

  function col(id: string) {
    return item!.column_values.find((c) => c.id === id)?.text || null;
  }

  const fields = [
    { label: "Outcome", value: col(CRUISE.columns.outcome.id) },
    { label: "Cruise Type", value: col(CRUISE.columns.cruiseType.id) },
    { label: "Captain", value: col(CRUISE.columns.captain.id) },
    { label: "Departure Time", value: col(CRUISE.columns.departureTime.id) },
    { label: "Return Docked", value: col(CRUISE.columns.returnTime.id) },
    { label: "Weather", value: col(CRUISE.columns.weather.id) },
    { label: "Wind", value: col(CRUISE.columns.wind.id) },
    { label: "Guests", value: col(CRUISE.columns.guests.id) },
    { label: "Crew", value: col(CRUISE.columns.crewCount.id) },
    { label: "Notes", value: col(CRUISE.columns.notes.id), wide: true },
  ];

  return (
    <LogFormWrapper title={item.name} backHref="/cruise-log" backLabel="Cruise Log">
      <LogDetailView title={item.name} fields={fields} assets={item.assets} />
    </LogFormWrapper>
  );
}
