/**
 * Upload a file to a Monday.com item column via the /api/monday/upload route.
 * Called from client components AFTER the item has been created so the file
 * upload is decoupled from the main form submission.
 *
 * Returns null on success, or an error message string on failure.
 */
export async function uploadFileToMonday(
  itemId: string,
  columnId: string,
  file: File
): Promise<string | null> {
  if (file.size === 0) return null;

  const fd = new FormData();
  fd.append("itemId", itemId);
  fd.append("columnId", columnId);
  fd.append("file", file);

  try {
    const res = await fetch("/api/monday/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return (body as { error?: string }).error ?? `Upload failed (${res.status})`;
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Upload failed";
  }
}

/**
 * Upload multiple files to the same Monday column. Non-fatal: collects errors
 * but doesn't stop on the first failure so all files are attempted.
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
