import "server-only";

const MONDAY_API = "https://api.monday.com/v2";
const API_VERSION = "2024-10";

function getToken(): string {
  const token = process.env.MONDAY_API_KEY ?? process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error("MONDAY_API_KEY is not set");
  return token;
}

export interface MondayError {
  message: string;
  locations?: { line: number; column: number }[];
}

export class MondayApiError extends Error {
  constructor(public errors: MondayError[]) {
    super(errors.map((e) => e.message).join("; "));
    this.name = "MondayApiError";
  }
}

export async function mondayQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      Authorization: getToken(),
      "Content-Type": "application/json",
      "API-Version": API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Monday API HTTP ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { data?: T; errors?: MondayError[] };
  if (json.errors?.length) throw new MondayApiError(json.errors);
  return json.data as T;
}

/**
 * Upload a file to a specific column on an existing Monday item.
 * Monday requires a multipart form with a `map` part and a `variables` part
 * per the GraphQL multipart request spec.
 */
export async function mondayUploadFile(
  itemId: string,
  columnId: string,
  file: File
): Promise<void> {
  const mutation = `
    mutation AddFile($file: File!, $itemId: ID!, $columnId: String!) {
      add_file_to_column(item_id: $itemId, column_id: $columnId, file: $file) {
        id
      }
    }
  `;

  const form = new FormData();
  form.append(
    "operations",
    JSON.stringify({
      query: mutation,
      variables: { file: null, itemId, columnId },
    })
  );
  form.append("map", JSON.stringify({ "0": ["variables.file"] }));
  form.append("0", file, file.name);

  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      Authorization: getToken(),
      "API-Version": API_VERSION,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Monday file upload HTTP ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { errors?: MondayError[] };
  if (json.errors?.length) throw new MondayApiError(json.errors);
}
