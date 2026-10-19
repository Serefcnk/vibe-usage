import assert from 'node:assert/strict';
import test from 'node:test';
import zlib from 'node:zlib';
import { defaultSettings } from '../src/core/settings.ts';
import { trayTool } from '../src/core/glance.ts';
import { quotaColor, ringIcon, ringPixels } from '../src/core/tray-icon.ts';
import type { Snapshot } from '../src/shared/types.ts';
import { measuredAccount, quotaWindow } from './helpers/fixtures.ts';

const SIZE = 32;
const pixel = (pixels: Buffer, x: number, y: number): number[] => [...pixels.subarray((y * SIZE + x) * 4, (y * SIZE + x) * 4 + 4)];

test('the ring fills clockwise from twelve with the quota left, in its colour', () => {
  const half = ringPixels(SIZE, 50);
  const ringTop = 1;
  assert.deepEqual(pixel(half, SIZE / 2 + 1, ringTop + 1).slice(0, 3), [...quotaColor(50).slice(0, 3)], 'right of twelve is filled');
  assert.notDeepEqual(pixel(half, SIZE / 2 - 2, SIZE - 3).slice(0, 3), [...quotaColor(50).slice(0, 3)], 'the left half is track');
  assert.equal(pixel(half, 0, 0)[3], 0, 'corners stay transparent');
  assert.equal(pixel(half, SIZE / 2, SIZE / 2)[3], 0, 'the middle stays transparent');
  assert.equal(pixel(ringPixels(SIZE, null), SIZE / 2, SIZE / 2)[3], 255, 'unknown quota shows a dot');
  assert.deepEqual(
    [quotaColor(80), quotaColor(30), quotaColor(10)].map(c => c[0]),
    [34, 245, 239]
  );
  // At the user's line of 40%, 30% is low (red) and 45% is above it but not ample (amber).
  assert.deepEqual(
    [quotaColor(30, 40), quotaColor(45, 40), quotaColor(70, 60)].map(c => c[0]),
    [239, 245, 34]
  );
  assert.deepEqual(
    pixel(ringPixels(SIZE, 30, 40), SIZE / 2 + 1, 2).slice(0, 3),
    [...quotaColor(30, 40).slice(0, 3)],
    'the ring is drawn at that line'
  );
});

test('the icon is a valid PNG of the requested size', () => {
  const png = ringIcon(SIZE, 70);
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(png.readUInt32BE(16), SIZE);
  assert.equal(png.readUInt32BE(20), SIZE);
  // The image data inflates to one filter byte plus the RGBA pixels per row.
  const idat = png.indexOf('IDAT');
  const data = png.subarray(idat + 4, idat + 4 + png.readUInt32BE(idat - 4));
  assert.equal(zlib.inflateSync(data).length, SIZE * (SIZE * 4 + 1));
});

test('the tray shows the first tool of the home order that has accounts', () => {
  const state: Snapshot = {
    refreshing: false,
    settings: { ...defaultSettings(), homeOrder: ['cursor', 'codex', 'claude'] },
    providers: [
      { id: 'cursor', status: 'unavailable', accounts: [] },
      {
        id: 'codex',
        status: 'ok',
        accounts: [
          measuredAccount({
            id: 'codex:a',
            providerId: 'codex',
            windows: [quotaWindow({ id: 'w', remainingPercent: 30, usedPercent: 70 })]
          }),
          measuredAccount({
            id: 'codex:b',
            providerId: 'codex',
            windows: [quotaWindow({ id: 'w', remainingPercent: 64, usedPercent: 36 })]
          })
        ]
      },
      { id: 'claude', status: 'ok', accounts: [measuredAccount({ status: 'auth_expired' })] }
    ]
  };
  assert.deepEqual(trayTool(state), { providerId: 'codex', percent: 64 });
  assert.deepEqual(trayTool({ ...state, settings: { ...state.settings, homeOrder: ['claude'] } }), { providerId: 'claude', percent: null });
  assert.equal(trayTool({ ...state, providers: [] }), null);
});
