"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { mondayQuery } from "@/lib/monday";
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
): Promise<{ error: string } | { itemId: string }> {
  await requireRole(["CAPTAIN", "DECKHAND", "MECHANIC", "HOSPITALITY", "ADMIN"]);

  const date = (fd.get("date") as string) ?? "";
  const transactionName = (fd.get("transactionName") as string) ?? "";
  const currency = (fd.get("currency") as string) ?? "";
  const transactionType = (fd.get("transactionType") as string) ?? "";
  const person = (fd.get("person") as string) ?? "";
  const payeePayer = (fd.get("payeePayer") as string) ?? "";
  const category = (fd.get("category") as string) ?? "";
  const notes = (fd.get("notes") as string) ?? "";

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
    revalidatePath("/transactions");
    return { itemId: result.create_item.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save entry. Please try again." };
  }
}
