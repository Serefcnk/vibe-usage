// Regenerates the README media from the built UI and invented demo accounts: screenshots, and a
// walkthrough recorded frame by frame and encoded with ffmpeg (from PATH, or the FFMPEG variable).
// Usage: npm run media   Output: docs/media/
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { app, type BrowserWindow } from 'electron';
import { capture, isNumber, openFixtureWindow, quiet, ROOT, run, runFor, serveFixture, settle } from '../fixture-app.ts';
import { MODELS, PROJECT_DIR, sessions, SMART_LAUNCH, snapshot } from './demo.ts';

const OUT_DIR = path.join(ROOT, 'docs', 'media');
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const WIDTH = 430;
const HEIGHT = 860;
const SETTLE_MS = 600;
// Pause between captures; capturing itself takes about as long again.
const FRAME_GAP_MS = 40;
const GIF = { width: 480, fps: 12, colors: 128 };

serveFixture({ snapshot: () => snapshot('en'), models: MODELS, smartLaunch: SMART_LAUNCH, sessions, projectDir: PROJECT_DIR });

async function screenshot(win: BrowserWindow, name: string, height = HEIGHT): Promise<void> {
  win.setContentSize(WIDTH, height);
  await settle(SETTLE_MS);
  fs.writeFileSync(path.join(OUT_DIR, `${name}.png`), (await capture(win)).toPNG());
  win.setContentSize(WIDTH, HEIGHT);
}

// Clicks the element and waits for the window to settle.
const press = async (win: BrowserWindow, selector: string): Promise<void> => {
  await run(win, `document.querySelector(${JSON.stringify(selector)}).click()`);
  await quiet(win);
};

// Accounts side by side, switched on or off in Settings as a user would.
async function toggleCompare(win: BrowserWindow): Promise<void> {
  await press(win, '#settings-button');
  await press(win, '#compare-accounts');
  await run(win, "document.querySelector('#settings-dialog').close()");
  await quiet(win);
}

async function screenshots(win: BrowserWindow): Promise<void> {
  // Every account of each tool, side by side.
  await toggleCompare(win);
  await screenshot(win, 'main', await runFor(win, 'document.documentElement.scrollHeight', isNumber));
  await toggleCompare(win);
  // One line per account; the window is as tall as its rows.
  await press(win, '#compact-button');
  await screenshot(
    win,
    'compact',
    await runFor(win, "Math.ceil(document.querySelector('#providers').getBoundingClientRect().bottom) + 12", isNumber)
  );
  await press(win, '#compact-button');
  await press(win, '#smart-launch-btn');
  await screenshot(win, 'smart-launch');
  await run(win, "document.querySelector('#smart-launch-dialog').close()");
  // Handover with a session chosen and its brief previewed.
  await press(win, '#handover-btn');
  await run(
    win,
    "(() => { const select = document.querySelector('#handover-session-select'); select.value = 'csv-export'; select.dispatchEvent(new Event('change', { bubbles: true })); })()"
  );
  await quiet(win);
  await press(win, '#handover-preview-btn');
  await screenshot(
    win,
    'handover',
    await runFor(
      win,
      "(() => { const d = document.querySelector('#handover-dialog'); return window.innerHeight + Math.max(0, d.scrollHeight - d.clientHeight); })()",
      isNumber
    )
  );
  await run(win, "document.querySelector('#handover-dialog').close()");
  // Settings at its accounts: several of each tool, the primary marked.
  await press(win, '#settings-button');
  await run(
    win,
    "(() => { const dialog = document.querySelector('#settings-dialog'); const section = dialog.querySelector('.connected-accounts-section'); const top = dialog.querySelector('.dialog-top').getBoundingClientRect().bottom; dialog.scrollTop += section.getBoundingClientRect().top - top - 12; })()"
  );
  await screenshot(win, 'settings');
  // Next time Settings opens at its top, as the walkthrough expects.
  await run(win, "(() => { const dialog = document.querySelector('#settings-dialog'); dialog.scrollTop = 0; dialog.close(); })()");
  await quiet(win);
}

// Captures never include the system pointer, so the walkthrough draws one.
const POINTER = `(() => {
  const pointer = document.createElement('div');
  pointer.id = 'demo-pointer';
  pointer.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1 3.8 7.4-2.6 1.3-3.8-7.5L5 20z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  Object.assign(pointer.style, {
    position: 'fixed', left: '330px', top: '600px', zIndex: 2147483647, pointerEvents: 'none',
    transition: 'left .7s ease-in-out, top .7s ease-in-out, transform .12s', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.5))'
  });
  document.documentElement.append(pointer);
})()`;

function walkthroughSteps(win: BrowserWindow) {
  const js = (script: string) => run(win, script);
  const pointAt = async (selector: string) => {
    await js(`(() => {
      const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
      const pointer = document.getElementById('demo-pointer');
      pointer.style.left = box.left + box.width / 2 + 'px';
      pointer.style.top = box.top + box.height / 2 + 'px';
    })()`);
    await settle(850);
  };
  const click = async (selector: string) => {
    await pointAt(selector);
    await js(`document.getElementById('demo-pointer').style.transform = 'scale(.8)'`);
    await settle(130);
    await js(`document.getElementById('demo-pointer').style.transform = ''`);
    await js(`document.querySelector(${JSON.stringify(selector)}).click()`);
    await settle(250);
  };
  // Native select pop-ups are not captured; the choice is made as the change a user would cause.
  const choose = async (selector: string, value: string) => {
    await pointAt(selector);
    await js(`(() => {
      const select = document.querySelector(${JSON.stringify(selector)});
      select.value = ${JSON.stringify(value)};
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await settle(900);
  };
  const scrollTo = async (target: number, ms: number) => {
    await js(`(() => {
      const start = scrollY, began = performance.now();
      const step = time => {
        const k = Math.min(1, (time - began) / ${ms});
        const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        scrollTo(0, start + (${target} - start) * eased);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    })()`);
    await settle(ms + 150);
  };

  return async () => {
    await settle(1500);
    // Claude's personal 5-hour window is nearly spent; the work account still has room.
    const picker = (providerId: string) => `.provider[data-provider="${providerId}"] .account-picker`;
    await choose(picker('claude'), 'claude:work');
    await settle(800);
    await choose(picker('claude'), 'claude:default');
    await settle(500);
    await choose(picker('codex'), 'codex:work');
    await settle(900);
    await choose(picker('codex'), 'codex:default');
    await settle(400);
    // Every account at once: side by side, switched on in Settings.
    await click('#settings-button');
    await settle(700);
    await click('#compare-accounts');
    await settle(500);
    await js("document.querySelector('#settings-dialog').close()");
    await settle(900);
    await js(`document.getElementById('demo-pointer').style.top = '760px'`);
    await scrollTo(await runFor(win, 'document.documentElement.scrollHeight - innerHeight', isNumber), 3600);
    await settle(1200);
    await scrollTo(0, 1800);
    await settle(400);
    await click('#settings-button');
    await settle(400);
    await click('#compare-accounts');
    await js("document.querySelector('#settings-dialog').close()");
    await settle(600);
    // One line per account.
    await click('#compact-button');
    await settle(2200);
    await click('#compact-button');
    await settle(700);
    await click('#smart-launch-btn');
    await settle(2600);
    await click('#sl-cancel-btn');
    await settle(400);
    await click('#handover-btn');
    await settle(900);
    await choose('#handover-session-select', 'csv-export');
    await choose('#handover-to', 'codex');
    await settle(400);
    await pointAt('#handover-execute-btn');
    await settle(1800);
    await click('#handover-cancel-btn');
    await settle(1200);
  };
}

// Captures frames while the steps run and returns an ffmpeg concat list that keeps each frame
// on screen for as long as it really was.
async function record(win: BrowserWindow, framesDir: string, steps: () => Promise<void>): Promise<string> {
  const frames: { file: string; at: number }[] = [];
  const stop = new AbortController();
  const recorder = (async () => {
    while (!stop.signal.aborted) {
      const image = await win.webContents.capturePage();
      const file = path.join(framesDir, `${String(frames.length).padStart(5, '0')}.png`);
      fs.writeFileSync(file, image.toPNG());
      frames.push({ file, at: Date.now() });
      await settle(FRAME_GAP_MS);
    }
  })();
  await steps();
  stop.abort();
  await recorder;
  const last = frames.at(-1);
  if (!last) throw new Error('no frames were captured');
  const entries = frames.map(
    (frame, i) => `file '${frame.file}'\nduration ${(((frames[i + 1]?.at ?? frame.at) - frame.at) / 1000).toFixed(3)}`
  );
  // The concat demuxer needs the last file repeated to honour the last duration.
  const list = path.join(framesDir, 'frames.txt');
  fs.writeFileSync(list, [...entries, `file '${last.file}'`].join('\n'));
  return list;
}

function encode(list: string): void {
  const input = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list];
  execFileSync(FFMPEG, [
    ...input,
    '-vf',
    `fps=30,scale=${WIDTH * 2}:-2:flags=lanczos,format=yuv420p`,
    '-c:v',
    'libx264',
    '-crf',
    '22',
    '-preset',
    'slow',
    '-movflags',
    '+faststart',
    path.join(OUT_DIR, 'demo.mp4')
  ]);
  execFileSync(FFMPEG, [
    ...input,
    '-vf',
    `fps=${GIF.fps},scale=${GIF.width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=${GIF.colors}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
    path.join(OUT_DIR, 'demo.gif')
  ]);
}

function hasFfmpeg(): boolean {
  try {
    execFileSync(FFMPEG, ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  if (!hasFfmpeg()) throw new Error(`ffmpeg was not found (${FFMPEG}); install it or set FFMPEG to its path`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const win = await openFixtureWindow(WIDTH, HEIGHT);
  win.setContentSize(WIDTH, HEIGHT);
  await settle(SETTLE_MS);
  await screenshots(win);
  await run(win, POINTER);
  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-media-'));
  try {
    encode(await record(win, framesDir, walkthroughSteps(win)));
  } finally {
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
  console.log(`Media written to ${OUT_DIR}`);
}

// Closing windows must not quit before the encoder finished.
app.on('window-all-closed', () => undefined);
void app.whenReady().then(async () => {
  try {
    await main();
    app.exit(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    app.exit(1);
  }
});
