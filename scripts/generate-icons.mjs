/**
 * generate-icons.mjs
 * Génère les icônes PWA LearnHub Djibouti en PNG pur (sans dépendances).
 * Fond bleu #2563EB + lettre "L" blanche + coins arrondis.
 *
 * Usage : node scripts/generate-icons.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'apps', 'web', 'public');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// ─── CRC32 ───────────────────────────────────────────────────────────────────
let _table;
function crc32(buf) {
  if (!_table) {
    _table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      _table[n] = c;
    }
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ _table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

// ─── PNG builder ─────────────────────────────────────────────────────────────
function buildPNG(size, pixelFn) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  const stride = 1 + size * 3;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelFn(x, y, size);
      const o = y * stride + 1 + x * 3;
      raw[o] = r; raw[o+1] = g; raw[o+2] = b;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG magic
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Pixel logic : fond bleu + coins arrondis + "L" blanche ──────────────────
function pixel(x, y, size) {
  const cr = Math.round(size * 0.20); // corner radius = 20%

  // Rounded corners (outside = transparent → white bg for non-maskable)
  const corners = [
    [cr, cr],
    [size - 1 - cr, cr],
    [cr, size - 1 - cr],
    [size - 1 - cr, size - 1 - cr],
  ];
  for (const [cx, cy] of corners) {
    if (x < cr || x > size - 1 - cr) {
      if (y < cr || y > size - 1 - cr) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist > cr) return [255, 255, 255]; // outside rounded rect
      }
    }
  }

  // Letter "L" in white
  const lw = Math.round(size * 0.13);         // stroke width
  const startX = Math.round(size * 0.30);     // left edge of vertical bar
  const topY   = Math.round(size * 0.20);     // top of vertical bar
  const botY   = Math.round(size * 0.78);     // bottom of both bars
  const endX   = Math.round(size * 0.72);     // right edge of horizontal bar

  const inVert = x >= startX && x < startX + lw && y >= topY && y <= botY;
  const inHoriz = x >= startX && x <= endX && y > botY - lw && y <= botY;

  if (inVert || inHoriz) return [255, 255, 255]; // white

  return [37, 99, 235]; // #2563EB blue
}

// ─── Generate all sizes ───────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });

for (const size of SIZES) {
  const buf = buildPNG(size, pixel);
  const out = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(out, buf);
  console.log(`✓ icon-${size}.png  (${(buf.length / 1024).toFixed(1)} KB)`);
}

console.log(`\n✅ ${SIZES.length} icônes PWA générées dans apps/web/public/`);
