// Renders the app icons from their source, assets/icon.svg, in a hidden window. The SVG is
// drawn onto a canvas of the exact pixel size, so the display's scaling does not change the
// result. The tray draws its own ring (src/core/tray-icon.ts).
// Usage: npm run icons
import fs from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { ROOT, runFor } from './fixture-app.ts';

const SOURCE = path.join(ROOT, 'assets', 'icon.svg');
const FULL_VIEW_BOX = 'viewBox="0 0 1024 1024"';
const ICONS = [
  // macOS: the whole grid, margin included; its .icns needs 512 px at 2x.
  { file: 'icon.png', size: 1024, viewBox: FULL_VIEW_BOX },
  // Windows shows icons edge to edge, so the rounded square fills it.
  { file: 'icon-windows.png', size: 512, viewBox: 'viewBox="96 96 832 832"' }
];
const PNG_DATA_URL = 'data:image/png;base64,';

const isPngDataUrl = (value: unknown): value is string => typeof value === 'string' && value.startsWith(PNG_DATA_URL);

async function main(): Promise<void> {
  const source = fs.readFileSync(SOURCE, 'utf8');
  if (!source.includes(FULL_VIEW_BOX)) throw new Error(`${SOURCE} must keep ${FULL_VIEW_BOX}`);
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html;charset=utf-8,<!doctype html><meta charset="utf-8">');
  for (const { file, size, viewBox } of ICONS)
    await render(win, source.replace(FULL_VIEW_BOX, viewBox), size, path.join(ROOT, 'assets', file));
  win.destroy();
}

async function render(win: BrowserWindow, svg: string, size: number, output: string): Promise<void> {
  const png = await runFor(
    win,
    `new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = ${size};
        canvas.getContext('2d').drawImage(image, 0, 0, ${size}, ${size});
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = () => reject(new Error('the SVG did not load'));
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(${JSON.stringify(svg)});
    })`,
    isPngDataUrl
  );
  fs.writeFileSync(output, Buffer.from(png.slice(PNG_DATA_URL.length), 'base64'));
  console.log(`Icon written to ${output}`);
}

void app.whenReady().then(async () => {
  try {
    await main();
    app.exit(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    app.exit(1);
  }
});
