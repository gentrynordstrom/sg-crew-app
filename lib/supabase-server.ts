import "server-only";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  `https://${process.env.DATABASE_URL?.match(/postgres\.([a-z0-9]+):/)?.[1]}.supabase.co`;

function getClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
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
 * Returns a short-lived signed read URL for a stored file.
 */
export async function createSignedReadUrl(path: string, expiresIn = 60) {
  const supabase = getClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Could not create signed read URL");
  }

  return data.signedUrl;
}
