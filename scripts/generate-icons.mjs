// Generate PWA icons + in-app logo from the reversed brand logo at
// public/logo-reversed.png (cream linework on deep moss-green). The source
// has the correct brand context already (#303820 background, #e8e8d8 mark),
// so we just trim the bleed, pad, and export at the sizes we need.
//
// Outputs:
//   public/logo.png         — 1024px tall, full-bleed reversed mark for in-app use
//   public/icon-192.png     — 192x192 maskable PWA icon
//   public/icon-512.png     — 512x512 maskable PWA icon
//   public/apple-icon.png   — 180x180 apple touch icon
//   public/favicon.png      — 32x32 favicon
//
// Run: node scripts/generate-icons.mjs

import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SOURCE = "public/logo-reversed.png";

// Brand palette (kept in sync with tailwind.config.ts)
const MOSS = { r: 48, g: 56, b: 32 }; // #303820

async function main() {
  await mkdir("public", { recursive: true });

  // 1. Publish the reversed logo as-is (it's already brand-correct) at a
  //    max height of 1024px for crisp in-app rendering.
  await sharp(SOURCE)
    .resize({ height: 1024, withoutEnlargement: true })
    .png()
    .toFile("public/logo.png");
  console.log("wrote public/logo.png");

  // 2. Trim the moss bleed so we can recomposite on a solid square with
  //    consistent padding across icon sizes. Trim against the background
  //    color, not transparent pixels.
  const trimmed = await sharp(SOURCE)
    .trim({ background: { ...MOSS, alpha: 1 }, threshold: 10 })
    .toBuffer();

  async function makeSquare(size, padPct, outPath) {
    const padding = Math.round(size * padPct);
    const inner = size - padding * 2;
    const fitted = await sharp(trimmed)
      .resize(inner, inner, {
        fit: "inside",
        background: { ...MOSS, alpha: 1 },
      })
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 3,
        background: MOSS,
      },
    })
      .composite([{ input: fitted, gravity: "center" }])
      .png()
      .toFile(outPath);
    console.log(`wrote ${outPath}`);
  }

  // Android maskable spec reserves the outer 10% as bleed; target a safe
  // zone of ~80% with 10-12% padding so the whole mark stays inside.
  await makeSquare(192, 0.1, "public/icon-192.png");
  await makeSquare(512, 0.1, "public/icon-512.png");
  await makeSquare(180, 0.08, "public/apple-icon.png");
  await makeSquare(32, 0.04, "public/favicon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
