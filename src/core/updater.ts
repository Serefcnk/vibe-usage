// Installing a newer release from inside the app, step by step at the user's request: look for
// it, download it (verified against the release's checksums by the updater), then restart into
// it. Nothing downloads or installs by itself. A copy that cannot replace itself (a portable zip,
// an unsigned macOS app, a development build) keeps the link to the release page.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { APP_NAME } from '../shared/catalog.ts';
import type { UpdateInstall, UpdateUnsupportedReason } from '../shared/types.ts';

// The parts of electron-updater's AppUpdater this module uses.
export interface UpdaterBackend {
  checkForUpdates(): Promise<{ isUpdateAvailable: boolean; updateInfo: { version: string } } | null>;
  downloadUpdate(): Promise<unknown>;
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
  on(event: 'download-progress', listener: (progress: { percent: number }) => void): unknown;
}

export interface Installer {
  state(): UpdateInstall;
  // Finds the newest release and downloads it; a second call while one runs joins it.
  download(): Promise<void>;
  // Restarts into the downloaded release; only once one was downloaded.
  install(): void;
}

export function createInstaller(backend: UpdaterBackend | UpdateUnsupportedReason, onChange: () => void): Installer {
  if (typeof backend === 'string') {
    const unsupported: UpdateInstall = { state: 'unsupported', reason: backend };
    return { state: () => unsupported, download: () => Promise.resolve(), install: () => undefined };
  }
  const updater = backend;
  let current: UpdateInstall = { state: 'ready' };
  let running: Promise<void> | null = null;
  const set = (next: UpdateInstall): void => {
    current = next;
    onChange();
  };
  updater.on('download-progress', ({ percent }) => {
    if (current.state === 'downloading' && Number.isFinite(percent))
      set({ state: 'downloading', percent: Math.max(0, Math.min(100, Math.round(percent))) });
  });

  async function run(): Promise<void> {
    set({ state: 'downloading', percent: 0 });
    try {
      const result = await updater.checkForUpdates();
      if (!result?.isUpdateAvailable) {
        set({ state: 'ready' });
        return;
      }
      await updater.downloadUpdate();
      set({ state: 'downloaded', version: result.updateInfo.version });
    } catch {
      // The updater's own message can carry URLs and paths; the user is told it failed.
      set({ state: 'failed' });
    }
  }

  return {
    state: () => structuredClone(current),
    download() {
      if (current.state === 'downloaded') return Promise.resolve();
      running ??= run().finally(() => {
        running = null;
      });
      return running;
    },
    install() {
      if (current.state === 'downloaded') updater.quitAndInstall(false, true);
    }
  };
}

const execFileAsync = promisify(execFile);

export interface SupportProbe {
  packaged: boolean;
  platform: NodeJS.Platform;
  execPath: string;
  exists?: (file: string) => boolean;
  readText?: (file: string) => string;
  // The `codesign -dv` description of the app bundle (it writes it to stderr).
  describeSignature?: (bundle: string) => Promise<string>;
}

const describeSignature = async (bundle: string): Promise<string> =>
  (await execFileAsync('/usr/bin/codesign', ['-dv', '--verbose=2', bundle], { encoding: 'utf8', timeout: 5000 })).stderr;

// Why this copy cannot update itself, or null when it can. The Windows installer puts its
// uninstaller beside the app; a portable zip has none. Only a signed build records its publisher
// in app-update.yml, and only then does the updater check an installer's signature as well as
// its checksum, so an unsigned copy does not install downloads. macOS only accepts an update to
// an app signed with a Developer ID.
export async function updateSupport({
  packaged,
  platform,
  execPath,
  exists = fs.existsSync,
  readText = file => fs.readFileSync(file, 'utf8'),
  describeSignature: describe = describeSignature
}: SupportProbe): Promise<UpdateUnsupportedReason | null> {
  if (!packaged) return 'unpackaged';
  if (platform === 'win32') {
    const dir = path.dirname(execPath);
    if (!exists(path.join(dir, `Uninstall ${APP_NAME}.exe`))) return 'portable';
    let config = '';
    try {
      config = readText(path.join(dir, 'resources', 'app-update.yml'));
    } catch {
      // No updater configuration: treated like an unsigned copy.
    }
    return /^publisherName:/m.test(config) ? null : 'unsigned';
  }
  if (platform === 'darwin') {
    // …/Vibe Usage.app/Contents/MacOS/Vibe Usage
    const bundle = path.resolve(execPath, '../../..');
    const signature = await describe(bundle).catch(() => '');
    return /^Authority=Developer ID Application:/m.test(signature) ? null : 'unsigned';
  }
  return 'platform';
}
