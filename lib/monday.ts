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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableMondayUploadError(message: string): boolean {
  const m = message.toLowerCase();
  if (m.includes("413") || m.includes("payload too large")) return false;
  return (
    m.includes("503") ||
    m.includes("502") ||
    m.includes("504") ||
    m.includes("429") ||
    m.includes("upstream connect") ||
    m.includes("connection termination") ||
    m.includes("reset before headers") ||
    m.includes("econnreset") ||
    m.includes("etimedout") ||
    m.includes("fetch failed") ||
    m.includes("network error")
  );
}

/**
 * Upload a file to a specific column on an existing Monday item.
 * Monday requires a multipart form with a `map` part and a `variables` part
 * per the GraphQL multipart request spec.
 *
 * Retries on transient gateway/network failures (503 from Envoy/proxies is common).
 */
export async function mondayUploadFile(
  itemId: string,
  columnId: string,
  file: File
): Promise<void> {
  const maxAttempts = 4;
  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mondayUploadFileOnce(itemId, columnId, file);
      return;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      const retry =
        attempt < maxAttempts && isRetryableMondayUploadError(lastErr.message);
      if (!retry) throw lastErr;
      await sleep(Math.min(8000, 600 * 2 ** attempt));
    }
  }

  throw lastErr ?? new Error("Monday file upload failed");
}

async function mondayUploadFileOnce(
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

  let res: Response;
  try {
    res = await fetch(MONDAY_API, {
      method: "POST",
      headers: {
        Authorization: getToken(),
        "API-Version": API_VERSION,
      },
      body: form,
      cache: "no-store",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Monday file upload network error: ${msg}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Monday file upload HTTP ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { errors?: MondayError[] };
  if (json.errors?.length) throw new MondayApiError(json.errors);
}
