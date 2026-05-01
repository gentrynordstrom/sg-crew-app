/**
 * Upload a file to a Monday.com item column.
 *
 * Flow (bypasses Vercel's 4.5 MB serverless body limit):
 *   1. GET /api/upload/presign → Supabase signed upload URL
 *   2. PUT file directly from browser to Supabase Storage CDN
 *   3. POST { itemId, columnId, supabasePath } to /api/monday/upload
 *      → server fetches file from Supabase → uploads to Monday
 *
 * Returns null on success, or an error message string on failure.
 */
export async function uploadFileToMonday(
  itemId: string,
  columnId: string,
  file: File
): Promise<string | null> {
  if (file.size === 0) return null;

  // ── Step 1: get a presigned Supabase upload URL ───────────────────────────
  let presignData: { signedUrl: string; path: string; token?: string };
  try {
    const presignRes = await fetch(
      `/api/upload/presign?filename=${encodeURIComponent(file.name)}`
    );
    if (!presignRes.ok) {
      const b = await presignRes.json().catch(() => ({}));
      return (b as { error?: string }).error ?? `Could not get upload URL (${presignRes.status})`;
    }
    presignData = await presignRes.json();
  } catch (e) {
    return e instanceof Error ? e.message : "Could not get upload URL";
  }

  // ── Step 2: PUT file directly from the browser to Supabase CDN ───────────
  // This request goes to supabase.co, NOT through our Vercel function,
  // so there is no 4.5 MB limit on it.
  try {
    const contentType = file.type || "application/octet-stream";
    const putHeaders: Record<string, string> = { "Content-Type": contentType };
    // Supabase signed upload URLs require this header on PUT (Storage API v3+).
    if (presignData.token) {
      putHeaders.Authorization = `Bearer ${presignData.token}`;
    }
    const putRes = await fetch(presignData.signedUrl, {
      method: "PUT",
      headers: putHeaders,
      body: file,
    });
    if (!putRes.ok) {
      const txt = await putRes.text().catch(() => `${putRes.status}`);
      return `Storage upload failed: ${txt}`;
    }
  } catch (e) {
    return e instanceof Error ? e.message : "Storage upload failed";
  }

  // ── Step 3: tell our server to move it from Supabase → Monday ─────────────
  try {
    const mondayRes = await fetch("/api/monday/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, columnId, supabasePath: presignData.path }),
    });
    if (!mondayRes.ok) {
      const b = await mondayRes.json().catch(() => ({}));
      return (b as { error?: string }).error ?? `Monday upload failed (${mondayRes.status})`;
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Monday upload failed";
  }
}

/**
 * Upload multiple files to the same Monday column. Collects but does not
 * throw errors — all files are attempted even if earlier ones fail.
 */
export async function uploadFilesToMonday(
  itemId: string,
  columnId: string,
  files: File[]
): Promise<string[]> {
  const errors: string[] = [];
  for (const file of files) {
    if (file.size === 0) continue;
    const err = await uploadFileToMonday(itemId, columnId, file);
    if (err) errors.push(err);
  }
  return errors;
}
