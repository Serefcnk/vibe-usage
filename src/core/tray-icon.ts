// The tray icon as a ring that fills with the quota left, drawn here and encoded as PNG so
// that it needs no image library and looks the same on every platform.
import zlib from 'node:zlib';
import { LOW_QUOTA_PERCENT } from '../shared/catalog.ts';

type Rgba = readonly [number, number, number, number];

const AMPLE_PERCENT = 50;
const COLORS = {
  ample: [34, 197, 94, 255],
  some: [245, 158, 11, 255],
  low: [239, 68, 68, 255],
  track: [128, 128, 128, 150],
  unknown: [148, 163, 184, 255]
} as const satisfies Record<string, Rgba>;
// Ring geometry as fractions of the icon size.
const OUTER_RADIUS = 0.47;
const RING_WIDTH = 0.2;
// The unknown state is a small dot in the middle of an empty ring.
const DOT_RADIUS = 0.12;
// Each pixel is sampled SUPERSAMPLE² times for smooth edges.
const SUPERSAMPLE = 4;

// Red at or below the user's low line, green well above it, amber between.
export const quotaColor = (percent: number, lowPercent = LOW_QUOTA_PERCENT): Rgba =>
  percent <= lowPercent ? COLORS.low : percent > Math.max(AMPLE_PERCENT, lowPercent) ? COLORS.ample : COLORS.some;

// What covers the point (x, y) in a unit square: the filled arc, the track, the dot or nothing.
function paint(x: number, y: number, percent: number | null, fill: Rgba): Rgba | null {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const distance = Math.hypot(dx, dy);
  if (percent === null && distance <= DOT_RADIUS) return COLORS.unknown;
  if (distance > OUTER_RADIUS || distance < OUTER_RADIUS - RING_WIDTH) return null;
  if (percent === null) return COLORS.track;
  // Clockwise from twelve o'clock.
  const turn = (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1;
  return turn * 100 < percent ? fill : COLORS.track;
}

// Straight (non-premultiplied) RGBA pixels, row by row.
export function ringPixels(size: number, percent: number | null, lowPercent = LOW_QUOTA_PERCENT): Buffer {
  const clamped = percent === null ? null : Math.min(Math.max(percent, 0), 100);
  const fill = quotaColor(clamped ?? 0, lowPercent);
  const pixels = Buffer.alloc(size * size * 4);
  const samples = SUPERSAMPLE * SUPERSAMPLE;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let [r, g, b, a] = [0, 0, 0, 0];
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const color = paint((px + (sx + 0.5) / SUPERSAMPLE) / size, (py + (sy + 0.5) / SUPERSAMPLE) / size, clamped, fill);
          if (!color) continue;
          // Colors are averaged weighted by their alpha, so edges do not darken.
          r += color[0] * color[3];
          g += color[1] * color[3];
          b += color[2] * color[3];
          a += color[3];
        }
      }
      const offset = (py * size + px) * 4;
      if (a) pixels.set([Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round(a / samples)], offset);
    }
  }
  return pixels;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body));
  return Buffer.concat([length, body, crc]);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const BIT_DEPTH = 8;
const COLOR_TYPE_RGBA = 6;
const FILTER_NONE = 0;

function encodePng(size: number, pixels: Buffer): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([BIT_DEPTH, COLOR_TYPE_RGBA, 0, 0, 0], 8);
  // Every row starts with its filter type.
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = FILTER_NONE;
    pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([PNG_SIGNATURE, chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

// The icon at each pixel density the tray may ask for.
export const ringIcon = (size: number, percent: number | null, lowPercent = LOW_QUOTA_PERCENT): Buffer =>
  encodePng(size, ringPixels(size, percent, lowPercent));
