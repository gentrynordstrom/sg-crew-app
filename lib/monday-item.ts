import "server-only";
import { mondayQuery } from "./monday";

export interface MondayColumnValue {
  id: string;
  text: string;
}

export interface MondayAsset {
  id: string;
  name: string;
  public_url: string;
  file_extension: string;
}

export interface MondayItemDetail {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
  assets: MondayAsset[];
}

interface ItemsResponse {
  items: MondayItemDetail[];
}

export async function fetchMondayItem(
  itemId: string
): Promise<MondayItemDetail | null> {
  try {
    const data = await mondayQuery<ItemsResponse>(
      `query ($ids: [ID!]) {
        items(ids: $ids) {
          id name
          column_values { id text }
          assets { id name public_url file_extension }
        }
      }`,
      { ids: [itemId] }
    );
    return data.items?.[0] ?? null;
  } catch (err) {
    console.error("Failed to fetch Monday item:", err);
    return null;
  }
}
