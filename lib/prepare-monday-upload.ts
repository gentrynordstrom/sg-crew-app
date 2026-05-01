import "server-only";

import sharp from "sharp";

/**
 * Monday GraphQL multipart uploads reject large bodies (HTTP 413). Stay
 * comfortably under their limit for the whole request (file + form overhead).
 */
const TARGET_MAX_BYTES = 3 * 1024 * 1024;

function mb(n: number): string {
  return (n / 1024 / 1024).toFixed(1);
}

/**
 * Shrink images (receipt photos) and reject oversized PDFs/non-images with a
 * clear message. Output images as JPEG for predictable size.
 */
export async function prepareFileForMondayUpload(
  blob: Blob,
  filename: string,
  mime: string
): Promise<File> {
  const buf = Buffer.from(await blob.arrayBuffer());
  const lower = filename.toLowerCase();
  const isPdf = mime === "application/pdf" || lower.endsWith(".pdf");

  if (isPdf) {
    if (buf.length <= TARGET_MAX_BYTES) {
      return new File([new Uint8Array(buf)], filename, { type: "application/pdf" });
    }
    throw new Error(
      `PDF is too large (${mb(buf.length)} MB). Monday limits attachment size — use a file under ~${Math.round(TARGET_MAX_BYTES / 1024 / 1024)} MB or take a photo instead.`
    );
  }

  const isImage =
    mime.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(filename);

  if (!isImage) {
    if (buf.length <= TARGET_MAX_BYTES) {
      return new File([new Uint8Array(buf)], filename, { type: mime || "application/octet-stream" });
    }
    throw new Error(
      `File is too large (${mb(buf.length)} MB). Maximum ~${Math.round(TARGET_MAX_BYTES / 1024 / 1024)} MB for Monday uploads.`
    );
  }

  const baseName = filename.replace(/\.[^.]+$/, "") || "receipt";
  const outName = `${baseName}.jpg`;

  try {
    let maxSide = 2200;
    let quality = 82;

    for (let round = 0; round < 14; round++) {
      const outBuf = await sharp(buf, { failOn: "none" })
        .rotate()
        .resize({
          width: maxSide,
          height: maxSide,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();

      if (outBuf.length <= TARGET_MAX_BYTES) {
        return new File([new Uint8Array(outBuf)], outName, { type: "image/jpeg" });
      }

      if (quality > 55) quality -= 6;
      else maxSide = Math.max(640, Math.floor(maxSide * 0.82));
    }

    throw new Error(
      "Could not compress this image enough for Monday. Try a photo with lower resolution or fewer megapixels."
    );
  } catch (e) {
    if (e instanceof Error && e.message.includes("compress")) throw e;
    if (buf.length <= TARGET_MAX_BYTES) {
      return new File([new Uint8Array(buf)], filename, { type: mime });
    }
    throw new Error(
      `Could not process image (${e instanceof Error ? e.message : String(e)}). Try JPG or PNG under ~${Math.round(TARGET_MAX_BYTES / 1024 / 1024)} MB.`
    );
  }
}
