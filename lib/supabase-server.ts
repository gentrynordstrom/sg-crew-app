import "server-only";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  `https://${process.env.DATABASE_URL?.match(/postgres\.([a-z0-9]+):/)?.[1]}.supabase.co`;

function getClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local for dev and to Vercel → Settings → Environment Variables for production (same Supabase project as DATABASE_URL). Copy from Supabase → Project Settings → API → service_role (secret)."
    );
  }
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false },
  });
}

const BUCKET = "crew-media";

/**
 * Create a short-lived signed upload URL. The client uses this to PUT a file
 * directly to Supabase Storage without going through our Vercel function,
 * which bypasses the 4.5 MB serverless request-body limit.
 */
export async function createSignedUploadUrl(path: string) {
  const supabase = getClient();

  // Ensure the bucket exists (idempotent – safe to call on every upload)
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) throw new Error(error?.message ?? "Could not create upload URL");

  return { signedUrl: data.signedUrl, token: data.token, path };
}

/**
 * Download an object using the service role (works regardless of bucket public/private).
 */
export async function downloadStorageObject(path: string): Promise<Blob> {
  const supabase = getClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    throw new Error(error?.message ?? "Could not download file from storage");
  }
  return data;
}
