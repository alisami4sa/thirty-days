import { createRequire } from "module";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a = 255] = paint(x, y, size);
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function paintMark(x, y, size, { pad = 0 } = {}) {
  const bg = [243, 235, 224];
  const ink = [28, 43, 36];
  const accent = [196, 92, 38];
  const ox = pad;
  const oy = pad;
  const s = size - pad * 2;
  const nx = (x - ox) / s;
  const ny = (y - oy) / s;
  if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return [...bg, 255];

  // rounded square feel via soft vignette edge
  const edge = Math.min(nx, ny, 1 - nx, 1 - ny);
  if (edge < 0.04) return [...bg, 255];

  // vertical bar
  const bar = nx > 0.28 && nx < 0.42 && ny > 0.22 && ny < 0.78;
  // top arm of "T" / day mark
  const arm = nx > 0.28 && nx < 0.72 && ny > 0.22 && ny < 0.36;
  // accent tick
  const tick = nx > 0.55 && nx < 0.74 && ny > 0.52 && ny < 0.66;

  if (bar || arm) return [...ink, 255];
  if (tick) return [...accent, 255];
  return [...bg, 255];
}

const sizes = [
  ["icon-192.png", 192, 0],
  ["icon-512.png", 512, 0],
  ["icon-512-maskable.png", 512, 64],
  ["apple-touch-icon.png", 180, 0],
];

for (const [name, size, pad] of sizes) {
  const buf = png(size, (x, y, s) => paintMark(x, y, s, { pad }));
  writeFileSync(join(outDir, name), buf);
  console.log("wrote", name);
}
