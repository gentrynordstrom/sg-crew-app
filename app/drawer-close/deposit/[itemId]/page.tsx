import { requireAdmin } from "@/lib/auth";
import { mondayQuery } from "@/lib/monday";
import { DRAWER_CLOSE } from "@/lib/monday-schema";
import { LogFormWrapper } from "@/components/logs/LogFormWrapper";
import { DrawerDepositForm } from "@/components/logs/DrawerDepositForm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface MondayItem {
  id: string;
  name: string;
  column_values: { id: string; text: string }[];
}

interface BoardResponse {
  items: MondayItem[];
}

export default async function DepositPage({
  params,
}: {
  params: { itemId: string };
}) {
  const user = await requireAdmin();

  const { itemId } = params;

  // Fetch item from Monday to get toDeposit amount and shift details
  const data = await mondayQuery<BoardResponse>(
    `query ($itemId: ID!) {
       items(ids: [$itemId]) {
         id name
         column_values(ids: [
           "${DRAWER_CLOSE.columns.toDeposit.id}",
           "${DRAWER_CLOSE.columns.shiftDate.id}",
           "${DRAWER_CLOSE.columns.bartender.id}",
           "${DRAWER_CLOSE.columns.drawer.id}",
           "${DRAWER_CLOSE.columns.variance.id}"
         ]) { id text }
       }
     }`,
    { itemId }
  );

  const item = data.items?.[0];
  if (!item) notFound();

  function col(id: string) {
    return item.column_values.find((c) => c.id === id)?.text ?? "";
  }

  const toDeposit = parseFloat(col(DRAWER_CLOSE.columns.toDeposit.id) || "0");
  const shiftName = item.name;
  const shiftDate = col(DRAWER_CLOSE.columns.shiftDate.id);
  const bartender = col(DRAWER_CLOSE.columns.bartender.id);
  const drawer = col(DRAWER_CLOSE.columns.drawer.id);
  const variance = col(DRAWER_CLOSE.columns.variance.id);

  const today = new Date().toISOString().slice(0, 10);

  const depositedByLabels = DRAWER_CLOSE.columns.depositedBy.labels as readonly string[];
  const firstName = user.name.split(" ")[0];
  const defaultDepositedBy =
    depositedByLabels.find((l) => l.toLowerCase() === firstName.toLowerCase()) ?? "";

  return (
    <LogFormWrapper
      title="Record Deposit"
      backHref="/drawer-close"
      backLabel="Drawer Close Log"
    >
      <div className="mb-5 rounded-xl bg-brand-moss-800/60 px-4 py-3 ring-1 ring-brand-cream-900/30 space-y-1">
        <p className="text-sm font-semibold text-brand-cream-200">{shiftName}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-brand-cream-400">
          {shiftDate && <span>{shiftDate}</span>}
          {bartender && <span>{bartender}</span>}
          {drawer && <span>{drawer}</span>}
          {variance && (
            <span className={parseFloat(variance) !== 0 ? "text-amber-300" : "text-emerald-300"}>
              Close variance: ${parseFloat(variance).toFixed(2)}
            </span>
          )}
        </div>
      </div>

      <DrawerDepositForm
        itemId={itemId}
        toDeposit={toDeposit}
        defaultDate={today}
        defaultDepositedBy={defaultDepositedBy}
      />
    </LogFormWrapper>
  );
}
