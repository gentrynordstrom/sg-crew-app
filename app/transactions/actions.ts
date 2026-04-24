"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { mondayQuery, mondayUploadFile } from "@/lib/monday";
import { TRANSACTIONS } from "@/lib/monday-schema";
import {
  buildColumnValues,
  statusValue,
  textValue,
  dateValue,
  longTextValue,
  dropdownValue,
  formatMdy,
} from "@/lib/monday-values";

export async function createTransactionEntry(
  fd: FormData
): Promise<{ error: string } | undefined> {
  await requireRole(["CAPTAIN", "DECKHAND", "MECHANIC", "HOSPITALITY", "ADMIN"]);

  const date = (fd.get("date") as string) ?? "";
  const transactionName = (fd.get("transactionName") as string) ?? "";
  const currency = (fd.get("currency") as string) ?? "";
  const transactionType = (fd.get("transactionType") as string) ?? "";
  const person = (fd.get("person") as string) ?? "";
  const payeePayer = (fd.get("payeePayer") as string) ?? "";
  const category = (fd.get("category") as string) ?? "";
  const notes = (fd.get("notes") as string) ?? "";

  // Item name: "<Transaction Name> - MM/DD/YYYY" or fallback
  const itemName = transactionName && date
    ? `${transactionName} - ${formatMdy(date)}`
    : transactionName || (date ? formatMdy(date) : "Transaction");

  const columnValues = buildColumnValues({
    [TRANSACTIONS.columns.date.id]: date ? dateValue(date) : undefined,
    [TRANSACTIONS.columns.transactionName.id]: transactionName ? textValue(transactionName) : undefined,
    [TRANSACTIONS.columns.currency.id]: currency ? dropdownValue([currency]) : undefined,
    [TRANSACTIONS.columns.transactionType.id]: transactionType ? dropdownValue([transactionType]) : undefined,
    [TRANSACTIONS.columns.person.id]: person ? dropdownValue([person]) : undefined,
    [TRANSACTIONS.columns.payeePayer.id]: payeePayer ? textValue(payeePayer) : undefined,
    [TRANSACTIONS.columns.category.id]: category ? statusValue(category) : undefined,
    [TRANSACTIONS.columns.notes.id]: notes ? longTextValue(notes) : undefined,
  });

  let newItemId: string;
  try {
    const result = await mondayQuery<{ create_item: { id: string } }>(
      `mutation ($boardId: ID!, $groupId: String!, $name: String!, $vals: JSON) {
         create_item(board_id: $boardId, group_id: $groupId, item_name: $name, column_values: $vals) { id }
       }`,
      {
        boardId: TRANSACTIONS.boardId,
        groupId: TRANSACTIONS.groupId,
        name: itemName,
        vals: JSON.stringify(columnValues),
      }
    );
    newItemId = result.create_item.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save entry. Please try again." };
  }

  const receipts = fd.getAll("receipts") as File[];
  for (const receipt of receipts) {
    if (receipt.size > 0) {
      try { await mondayUploadFile(newItemId, TRANSACTIONS.columns.receipts.id, receipt); } catch { /* non-fatal */ }
    }
  }

  revalidatePath("/transactions");
  redirect("/transactions");
}
