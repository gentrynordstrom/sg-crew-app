"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mondayQuery, mondayUploadFile } from "@/lib/monday";
import { DRAWER_CLOSE } from "@/lib/monday-schema";
import {
  buildColumnValues,
  statusValue,
  dateValue,
  numberValue,
  longTextValue,
  formatMdy,
} from "@/lib/monday-values";

function parseNum(val: FormDataEntryValue | null): number {
  const n = parseFloat((val as string) ?? "");
  return isNaN(n) ? 0 : n;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns today's date as a UTC midnight Date (for DB queries). */
function todayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Returns a Prisma gte/lt range covering the full UTC calendar day of `d`.
 * Safer than exact equality against @db.Date columns when timezone drift
 * can cause a full-timestamp match to miss.
 */
function utcDayRange(d: Date): { gte: Date; lt: Date } {
  const ymd = d.toISOString().slice(0, 10);
  const start = new Date(ymd + "T00:00:00.000Z");
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { gte: start, lt: end };
}

/**
 * Find an unconsumed Patio handoff for the given patio bartender on a date.
 * Used by the Patio close form to pre-fill and validate.
 */
export async function findOpenPatioHandoff(
  patioBartenderId: string,
  shiftDate: Date
) {
  return prisma.patioHandoff.findFirst({
    where: {
      patioBartenderId,
      shiftDate: utcDayRange(shiftDate),
      patioCloseSubmitted: false,
    },
    include: { mainBartender: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Find unconsumed handoffs where this user is the Main bartender.
 * Used by Main close form to show Patio reconciliation section.
 */
export async function findActiveMainHandoffs(
  mainBartenderId: string,
  shiftDate: Date
) {
  return prisma.patioHandoff.findMany({
    where: {
      mainBartenderId,
      shiftDate: utcDayRange(shiftDate),
      consumedByMainClose: false,
    },
    include: { patioBartender: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Main bartender logs a cash handoff to the Patio bartender. */
export async function logPatioHandoff(fd: FormData) {
  const user = await requireRole(["HOSPITALITY", "ADMIN"]);

  const amount = parseNum(fd.get("amount"));
  const patioBartenderId = fd.get("patioBartenderId") as string;
  const shiftDate = fd.get("shiftDate") as string;

  if (!amount || amount <= 0) {
    throw new Error("Transfer amount must be greater than $0");
  }
  if (!patioBartenderId) {
    throw new Error("Patio bartender is required");
  }

  // Check for any unclosed prior handoff from this Main bartender today
  const today = todayDate();
  const prior = await prisma.patioHandoff.findFirst({
    where: {
      mainBartenderId: user.id,
      shiftDate: shiftDate ? new Date(shiftDate + "T00:00:00Z") : today,
      consumedByMainClose: false,
    },
  });
  if (prior) {
    throw new Error(
      `There's already an unclosed Patio handoff of $${prior.amountTransferred.toFixed(2)} from today. Close that one first.`
    );
  }

  await prisma.patioHandoff.create({
    data: {
      shiftDate: shiftDate ? new Date(shiftDate + "T00:00:00Z") : today,
      amountTransferred: amount,
      mainBartenderId: user.id,
      patioBartenderId,
    },
  });

  revalidatePath("/drawer-close");
}

// ─── Close submission ─────────────────────────────────────────────────────────

export async function createDrawerCloseEntry(fd: FormData) {
  const user = await requireRole(["HOSPITALITY", "ADMIN"]);

  const date = (fd.get("shiftDate") as string) ?? "";
  const drawerType = (fd.get("drawer") as string) ?? "";
  const bartender = (fd.get("bartender") as string) ?? "";
  const shiftType = (fd.get("shiftType") as string) ?? "";
  const posSales = parseNum(fd.get("posSales"));
  const cashSales = parseNum(fd.get("cashSales"));
  const tipsCreditCard = parseNum(fd.get("tipsCreditCard"));
  const payouts = parseNum(fd.get("payouts"));
  const closingCount = parseNum(fd.get("closingCount"));
  const notes = (fd.get("notes") as string) ?? "";

  const shiftDateObj = date ? new Date(date + "T00:00:00Z") : todayDate();

  let opening: number;
  let expectedCash: number;
  let transferredToPatio = 0;
  let returnedFromPatio = 0;
  let handoffNote = "";

  if (drawerType === "Main Bar") {
    opening = parseNum(fd.get("openingAmount")) || 500;

    // Check for any active Patio handoffs this Main bartender made today
    const handoffs = await findActiveMainHandoffs(user.id, shiftDateObj);
    for (const h of handoffs) {
      const returned = parseNum(fd.get(`handoffReturned_${h.id}`));
      transferredToPatio += h.amountTransferred;
      returnedFromPatio += returned;
      handoffNote += `Patio handoff: transferred $${h.amountTransferred.toFixed(2)}, returned $${returned.toFixed(2)} (${h.patioBartender.name}). `;

      // Mark handoff as consumed with the returned amount
      await prisma.patioHandoff.update({
        where: { id: h.id },
        data: {
          amountReturned: returned,
          consumedByMainClose: true,
        },
      });
    }

    // Main Expected: float + cash sales - payouts - transferred + returned
    expectedCash = opening + cashSales - payouts - transferredToPatio + returnedFromPatio;
  } else {
    // Patio Bar — require a logged handoff
    const handoff = await findOpenPatioHandoff(user.id, shiftDateObj);
    if (!handoff) {
      throw new Error(
        "No handoff logged for today. Ask the Main bartender to log the handoff before you close."
      );
    }
    opening = handoff.amountTransferred;
    const bankReturnedToMain = parseNum(fd.get("bankReturnedToMain"));

    // Patio Expected: bank from Main + cash sales - payouts - returned to Main
    expectedCash = opening + cashSales - payouts - bankReturnedToMain;
    handoffNote = `Opening bank from Main: $${opening.toFixed(2)}. Returned to Main: $${bankReturnedToMain.toFixed(2)}. `;

    // Mark handoff as patio-close-submitted with returned amount
    await prisma.patioHandoff.update({
      where: { id: handoff.id },
      data: {
        amountReturned: bankReturnedToMain,
        patioCloseSubmitted: true,
      },
    });
  }

  const variance = closingCount - expectedCash;
  const absVariance = Math.abs(variance);

  let varianceStatus: string;
  if (absVariance < 0.01) {
    varianceStatus = "Balanced";
  } else if (variance < 0) {
    varianceStatus = "Short";
  } else {
    varianceStatus = "Over";
  }

  // To Deposit:
  // Main: closing count - opening cash float
  // Patio: closing count - bank returned to main
  let toDeposit: number;
  if (drawerType === "Main Bar") {
    toDeposit = closingCount - opening;
  } else {
    const bankReturnedToMain = parseNum(fd.get("bankReturnedToMain"));
    toDeposit = closingCount - bankReturnedToMain;
  }

  const fullNotes = [handoffNote, notes].filter(Boolean).join("\n").trim();

  const columnValues = buildColumnValues({
    [DRAWER_CLOSE.columns.bartender.id]: bartender ? statusValue(bartender) : undefined,
    [DRAWER_CLOSE.columns.shiftDate.id]: date ? dateValue(date) : undefined,
    [DRAWER_CLOSE.columns.shiftType.id]: shiftType ? statusValue(shiftType) : undefined,
    [DRAWER_CLOSE.columns.drawer.id]: drawerType ? statusValue(drawerType) : undefined,
    [DRAWER_CLOSE.columns.openingAmount.id]: numberValue(opening),
    [DRAWER_CLOSE.columns.posSales.id]: numberValue(posSales),
    [DRAWER_CLOSE.columns.cashSales.id]: numberValue(cashSales),
    [DRAWER_CLOSE.columns.tipsCreditCard.id]: numberValue(tipsCreditCard),
    [DRAWER_CLOSE.columns.payouts.id]: numberValue(payouts),
    [DRAWER_CLOSE.columns.transferredToPatio.id]: numberValue(transferredToPatio),
    [DRAWER_CLOSE.columns.returnedFromPatio.id]: numberValue(returnedFromPatio),
    [DRAWER_CLOSE.columns.expectedCash.id]: numberValue(expectedCash),
    [DRAWER_CLOSE.columns.closingCount.id]: numberValue(closingCount),
    [DRAWER_CLOSE.columns.variance.id]: numberValue(variance),
    [DRAWER_CLOSE.columns.status.id]: statusValue(varianceStatus),
    [DRAWER_CLOSE.columns.toDeposit.id]: numberValue(Math.max(0, toDeposit)),
    [DRAWER_CLOSE.columns.notes.id]: fullNotes ? longTextValue(fullNotes) : undefined,
  });

  const itemName = `${bartender || user.name} - ${date ? formatMdy(date) : "Today"}`;
  const groupId = varianceStatus === "Balanced"
    ? DRAWER_CLOSE.groups.thisWeek
    : DRAWER_CLOSE.groups.needsReview;

  const result = await mondayQuery<{ create_item: { id: string } }>(
    `mutation ($boardId: ID!, $groupId: String!, $name: String!, $vals: JSON) {
       create_item(board_id: $boardId, group_id: $groupId, item_name: $name, column_values: $vals) { id }
     }`,
    {
      boardId: DRAWER_CLOSE.boardId,
      groupId,
      name: itemName,
      vals: JSON.stringify(columnValues),
    }
  );

  const newItemId = result.create_item.id;

  const posPhoto = fd.get("posPhoto") as File | null;
  if (posPhoto && posPhoto.size > 0) {
    await mondayUploadFile(newItemId, DRAWER_CLOSE.columns.posPhoto.id, posPhoto);
  }

  revalidatePath("/drawer-close");
  redirect("/drawer-close");
}

// ─── Admin deposit submission ─────────────────────────────────────────────────

export async function createDepositEntry(itemId: string, fd: FormData) {
  const user = await requireAdmin();

  const depositedAmount = parseNum(fd.get("deposited"));
  const toDeposit = parseNum(fd.get("toDeposit"));
  const depositDate = (fd.get("depositDate") as string) ?? "";
  const depositedBy = (fd.get("depositedBy") as string) ?? "";
  const notes = (fd.get("depositNotes") as string) ?? "";

  const depositVariance = depositedAmount - toDeposit;

  const firstName = user.name.split(" ")[0];
  const depositedByLabel = DRAWER_CLOSE.columns.depositedBy.labels.find(
    (l) => l.toLowerCase() === firstName.toLowerCase()
  ) ?? depositedBy ?? "Other";

  const columnValues = buildColumnValues({
    [DRAWER_CLOSE.columns.deposited.id]: numberValue(depositedAmount),
    [DRAWER_CLOSE.columns.depositDate.id]: depositDate ? dateValue(depositDate) : undefined,
    [DRAWER_CLOSE.columns.depositVariance.id]: numberValue(depositVariance),
    [DRAWER_CLOSE.columns.depositedBy.id]: statusValue(depositedByLabel),
    [DRAWER_CLOSE.columns.status.id]: statusValue("Deposited"),
    [DRAWER_CLOSE.columns.adminReviewNotes.id]: notes ? longTextValue(notes) : undefined,
  });

  await mondayQuery(
    `mutation ($itemId: ID!, $boardId: ID!, $vals: JSON!) {
       change_multiple_column_values(item_id: $itemId, board_id: $boardId, column_values: $vals) { id }
     }`,
    {
      itemId,
      boardId: DRAWER_CLOSE.boardId,
      vals: JSON.stringify(columnValues),
    }
  );

  const bankPhoto = fd.get("bankReceiptPhoto") as File | null;
  if (bankPhoto && bankPhoto.size > 0) {
    await mondayUploadFile(itemId, DRAWER_CLOSE.columns.bankReceiptPhoto.id, bankPhoto);
  }

  revalidatePath("/drawer-close");
  redirect("/drawer-close");
}
