import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSignedUploadUrl } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename") ?? "upload";
  const ext = filename.includes(".") ? filename.split(".").pop() : "bin";

  // Unique path: logs/<userId>/<timestamp>.<ext>
  const path = `logs/${session.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const result = await createSignedUploadUrl(path);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create upload URL" },
      { status: 500 }
    );
  }
}
