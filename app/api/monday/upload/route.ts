import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { mondayUploadFile } from "@/lib/monday";
import { prepareFileForMondayUpload } from "@/lib/prepare-monday-upload";
import { downloadStorageObject } from "@/lib/supabase-server";

export const runtime = "nodejs";
/** Allow slow receipt uploads (Supabase → Vercel → Monday multipart). */
export const maxDuration = 60;

/**
 * POST { itemId, columnId, supabasePath }
 *
 * The browser uploads files directly to Supabase Storage (bypassing Vercel's
 * 4.5 MB request-body limit). Once the upload completes it calls this route
 * with just the storage path. We then fetch the file server-to-server
 * (Supabase → Vercel → Monday), which has no inbound size restriction.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { itemId?: string; columnId?: string; supabasePath?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { itemId, columnId, supabasePath } = body;
  if (!itemId || !columnId || !supabasePath) {
    return NextResponse.json({ error: "Missing itemId, columnId, or supabasePath" }, { status: 400 });
  }

  let blob: Blob;
  try {
    blob = await downloadStorageObject(supabasePath);
  } catch (e) {
    return NextResponse.json(
      { error: `Could not fetch file from storage: ${e instanceof Error ? e.message : e}` },
      { status: 502 }
    );
  }

  const filename = supabasePath.split("/").pop() ?? "upload";
  const lower = filename.toLowerCase();
  const mimeFromName =
    lower.endsWith(".pdf")
      ? "application/pdf"
      : lower.endsWith(".png")
        ? "image/png"
        : lower.endsWith(".gif")
          ? "image/gif"
          : lower.endsWith(".webp")
            ? "image/webp"
            : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
              ? "image/jpeg"
              : "application/octet-stream";
  let file: File;
  try {
    file = await prepareFileForMondayUpload(blob, filename, blob.type || mimeFromName);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    await mondayUploadFile(itemId, columnId, file);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload to Monday failed";
    console.error("Monday file upload error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
