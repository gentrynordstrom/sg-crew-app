import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { fetchMondayItem } from "@/lib/monday-item";
import { DRAWER_CLOSE } from "@/lib/monday-schema";
import { LogFormWrapper } from "@/components/logs/LogFormWrapper";
import { LogDetailView } from "@/components/logs/LogDetailView";

export const dynamic = "force-dynamic";

export default async function DrawerCloseDetailPage({
  params,
}: {
  params: { itemId: string };
}) {
  await requireRole(["HOSPITALITY", "ADMIN"]);
  const item = await fetchMondayItem(params.itemId);
  if (!item) notFound();

  function col(id: string) {
    return item!.column_values.find((c) => c.id === id)?.text || null;
  }

  function money(id: string) {
    const v = col(id);
    if (!v) return null;
    const n = parseFloat(v);
    return isNaN(n) ? v : `$${n.toFixed(2)}`;
  }

  const fields = [
    { label: "Shift Date", value: col(DRAWER_CLOSE.columns.shiftDate.id) },
    { label: "Bartender", value: col(DRAWER_CLOSE.columns.bartender.id) },
    { label: "Drawer", value: col(DRAWER_CLOSE.columns.drawer.id) },
    { label: "Shift Type", value: col(DRAWER_CLOSE.columns.shiftType.id) },
    { label: "Status", value: col(DRAWER_CLOSE.columns.status.id) },
    { label: "Opening Cash", value: money(DRAWER_CLOSE.columns.openingAmount.id) },
    { label: "POS Sales", value: money(DRAWER_CLOSE.columns.posSales.id) },
    { label: "CC Sales", value: money(DRAWER_CLOSE.columns.creditCardSales.id) },
    { label: "Cash Sales", value: money(DRAWER_CLOSE.columns.cashSales.id) },
    { label: "Card Tips", value: money(DRAWER_CLOSE.columns.tipsCreditCard.id) },
    { label: "Other Payouts", value: money(DRAWER_CLOSE.columns.payouts.id) },
    { label: "Transferred to Patio", value: money(DRAWER_CLOSE.columns.transferredToPatio.id) },
    { label: "Returned from Patio", value: money(DRAWER_CLOSE.columns.returnedFromPatio.id) },
    { label: "Expected Cash", value: money(DRAWER_CLOSE.columns.expectedCash.id) },
    { label: "Closing Count", value: money(DRAWER_CLOSE.columns.closingCount.id) },
    { label: "Variance", value: money(DRAWER_CLOSE.columns.variance.id) },
    { label: "To Deposit", value: money(DRAWER_CLOSE.columns.toDeposit.id) },
    { label: "Deposited", value: money(DRAWER_CLOSE.columns.deposited.id) },
    { label: "Deposit Date", value: col(DRAWER_CLOSE.columns.depositDate.id) },
    { label: "Deposited By", value: col(DRAWER_CLOSE.columns.depositedBy.id) },
    { label: "Deposit Variance", value: money(DRAWER_CLOSE.columns.depositVariance.id) },
    { label: "Notes", value: col(DRAWER_CLOSE.columns.notes.id), wide: true },
    { label: "Admin Notes", value: col(DRAWER_CLOSE.columns.adminReviewNotes.id), wide: true },
  ];

  return (
    <LogFormWrapper title={item.name} backHref="/drawer-close" backLabel="Drawer Close Log">
      <LogDetailView title={item.name} fields={fields} assets={item.assets} />
    </LogFormWrapper>
  );
}
