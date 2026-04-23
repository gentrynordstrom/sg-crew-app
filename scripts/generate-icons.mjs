// Minimal zero-dep PNG generator for placeholder PWA icons.
// Produces a solid navy square with a white "SG" wordmark drawn from a tiny
// 5x7 pixel font. Replace with real branded icons when available.
//
// Run: node scripts/generate-icons.mjs

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

// 5x7 bitmap font for the letters S and G.
// 1 = pixel on, 0 = pixel off. Rows top-to-bottom.
const FONT = {
  S: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  G: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
};

const BG = [0x0b, 0x23, 0x40]; // brand navy
const FG = [0xff, 0xff, 0xff];

function buildImage(size) {
  const pixels = new Uint8Array(size * size * 3);
  // fill background
  for (let i = 0; i < size * size; i++) {
    pixels[i * 3] = BG[0];
    pixels[i * 3 + 1] = BG[1];
    pixels[i * 3 + 2] = BG[2];
  }

  const letters = ["S", "G"];
  const charW = 5;
  const charH = 7;
  const spacing = 1;
  const totalW = letters.length * charW + (letters.length - 1) * spacing;
  const scale = Math.floor((size * 0.5) / Math.max(totalW, charH));
  const blockW = charW * scale;
  const blockH = charH * scale;
  const gap = spacing * scale;
  const pxW = letters.length * blockW + (letters.length - 1) * gap;
  const pxH = blockH;
  const startX = Math.floor((size - pxW) / 2);
  const startY = Math.floor((size - pxH) / 2);

  letters.forEach((ch, li) => {
    const glyph = FONT[ch];
    for (let y = 0; y < charH; y++) {
      for (let x = 0; x < charW; x++) {
        if (!glyph[y][x]) continue;
        const baseX = startX + li * (blockW + gap) + x * scale;
        const baseY = startY + y * scale;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = baseX + sx;
            const py = baseY + sy;
            const idx = (py * size + px) * 3;
            pixels[idx] = FG[0];
            pixels[idx + 1] = FG[1];
            pixels[idx + 2] = FG[2];
          }
        }
      }
    }
  });

  return pixels;
}

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(size, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Add filter byte (0 = None) at the start of each row
  const stride = size * 3;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1
    );
  }
  const idat = deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const pixels = buildImage(size);
  const png = encodePNG(size, pixels);
  const path = `public/icon-${size}.png`;
  writeFileSync(path, png);
  console.log(`wrote ${path} (${png.length} bytes)`);
}
