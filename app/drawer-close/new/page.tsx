import { requireRole } from "@/lib/auth";
import { LogFormWrapper } from "@/components/logs/LogFormWrapper";
import { DrawerCloseForm } from "@/components/logs/DrawerCloseForm";
import { DRAWER_CLOSE } from "@/lib/monday-schema";
import {
  findOpenPatioHandoff,
  findActiveMainHandoffs,
} from "@/app/drawer-close/actions";

export const dynamic = "force-dynamic";

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export default async function NewDrawerClosePage() {
  const user = await requireRole(["HOSPITALITY", "ADMIN"]);

  const today = new Date().toISOString().slice(0, 10);
  const todayDate = todayUTC();

  const bartenderLabels = DRAWER_CLOSE.columns.bartender.labels as readonly string[];
  const defaultBartender =
    bartenderLabels.find((l) =>
      l.toLowerCase().includes(user.name.split(" ")[0].toLowerCase())
    ) ?? "";

  // Check for open Patio handoff (if this bartender is a patio closer today)
  const patioHandoffRaw = await findOpenPatioHandoff(user.id, todayDate);
  const patioHandoff = patioHandoffRaw
    ? {
        id: patioHandoffRaw.id,
        amountTransferred: patioHandoffRaw.amountTransferred,
        mainBartenderName: patioHandoffRaw.mainBartender.name,
      }
    : null;

  // Check for active handoffs this user made (if they are Main bartender today)
  const mainHandoffsRaw = await findActiveMainHandoffs(user.id, todayDate);
  const mainHandoffs = mainHandoffsRaw.map((h) => ({
    id: h.id,
    amountTransferred: h.amountTransferred,
    patioBartenderName: h.patioBartender.name,
  }));

  return (
    <LogFormWrapper
      title="Drawer Close"
      backHref="/drawer-close"
      backLabel="Drawer Close Log"
    >
      <DrawerCloseForm
        defaultBartender={defaultBartender}
        defaultDate={today}
        patioHandoff={patioHandoff}
        mainHandoffs={mainHandoffs}
      />
    </LogFormWrapper>
  );
}
