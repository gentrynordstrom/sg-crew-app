import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { mondayUploadFile } from "@/lib/monday";

// Node.js runtime so we can handle large binary request bodies
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Require an active session
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Failed to parse upload" }, { status: 400 });
  }

  const itemId = formData.get("itemId") as string | null;
  const columnId = formData.get("columnId") as string | null;
  const file = formData.get("file") as File | null;

  if (!itemId || !columnId || !file || file.size === 0) {
    return NextResponse.json({ error: "Missing itemId, columnId, or file" }, { status: 400 });
  }

  try {
    await mondayUploadFile(itemId, columnId, file);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    console.error("Monday file upload error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
