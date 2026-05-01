import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { mondayUploadFile } from "@/lib/monday";
import { createSignedReadUrl } from "@/lib/supabase-server";

export const runtime = "nodejs";

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

  // Fetch the file from Supabase Storage (server-to-server — no size limit)
  let readUrl: string;
  let fileRes: Response;
  try {
    readUrl = await createSignedReadUrl(supabasePath, 120);
    fileRes = await fetch(readUrl);
    if (!fileRes.ok) throw new Error(`Supabase fetch failed: ${fileRes.status}`);
  } catch (e) {
    return NextResponse.json(
      { error: `Could not fetch file from storage: ${e instanceof Error ? e.message : e}` },
      { status: 502 }
    );
  }

  // Convert to a File object for mondayUploadFile
  const blob = await fileRes.blob();
  const filename = supabasePath.split("/").pop() ?? "upload";
  const file = new File([blob], filename, { type: blob.type });

  try {
    await mondayUploadFile(itemId, columnId, file);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload to Monday failed";
    console.error("Monday file upload error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
