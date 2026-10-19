import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { createInstaller, updateSupport, type UpdaterBackend } from '../src/core/updater.ts';
import type { UpdateInstall } from '../src/shared/types.ts';

function fakeBackend({ available = true, fail = false } = {}) {
  const calls = { checks: 0, downloads: 0, installs: [] as [boolean | undefined, boolean | undefined][] };
  let progress: ((progress: { percent: number }) => void) | undefined;
  let finishDownload: (() => void) | undefined;
  const backend: UpdaterBackend = {
    checkForUpdates: () => {
      calls.checks++;
      return fail
        ? Promise.reject(new Error('https://example.com/secret/path failed'))
        : Promise.resolve({ isUpdateAvailable: available, updateInfo: { version: '9.9.9' } });
    },
    downloadUpdate: () => {
      calls.downloads++;
      return new Promise(resolve => {
        finishDownload = () => {
          resolve([]);
        };
      });
    },
    quitAndInstall: (isSilent, isForceRunAfter) => {
      calls.installs.push([isSilent, isForceRunAfter]);
    },
    on: (_event, listener) => {
      progress = listener;
    }
  };
  return {
    backend,
    calls,
    progress: (percent: number) => progress?.(percent === -1 ? { percent: NaN } : { percent }),
    finish: () => finishDownload?.()
  };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('an update downloads only when asked, once, with progress, and installs only after it downloaded', async () => {
  const fake = fakeBackend();
  const seen: UpdateInstall[] = [];
  const installer = createInstaller(fake.backend, () => seen.push(installer.state()));
  assert.deepEqual(installer.state(), { state: 'ready' });
  installer.install();
  assert.equal(fake.calls.installs.length, 0, 'nothing to install yet');

  const first = installer.download();
  const second = installer.download();
  await settle();
  assert.equal(fake.calls.checks, 1, 'repeated clicks join the running download');
  assert.equal(fake.calls.downloads, 1);
  fake.progress(42.4);
  fake.progress(-1);
  fake.progress(250);
  assert.deepEqual(installer.state(), { state: 'downloading', percent: 100 });
  fake.finish();
  await Promise.all([first, second]);
  assert.deepEqual(installer.state(), { state: 'downloaded', version: '9.9.9' });
  assert.deepEqual(
    seen.map(s => (s.state === 'downloading' ? s.percent : s.state)),
    [0, 42, 100, 'downloaded']
  );
  await installer.download();
  assert.equal(fake.calls.checks, 1, 'a downloaded update is not fetched again');
  installer.install();
  assert.deepEqual(fake.calls.installs, [[false, true]]);
});

test('no newer release, or a failure, leaves the installer ready to try again', async () => {
  const none = fakeBackend({ available: false });
  const quiet = createInstaller(none.backend, () => undefined);
  await quiet.download();
  assert.deepEqual(quiet.state(), { state: 'ready' });
  assert.equal(none.calls.downloads, 0);

  const broken = fakeBackend({ fail: true });
  const failing = createInstaller(broken.backend, () => undefined);
  await failing.download();
  assert.deepEqual(failing.state(), { state: 'failed' }, 'the updater’s message is not passed on');
  await failing.download();
  assert.equal(broken.calls.checks, 2, 'a failed download can be retried');
  failing.install();
  assert.equal(broken.calls.installs.length, 0);
});

test('a copy that cannot update itself says why and never starts the updater', async () => {
  const installer = createInstaller('portable', () => assert.fail('no change'));
  await installer.download();
  installer.install();
  assert.deepEqual(installer.state(), { state: 'unsupported', reason: 'portable' });
});

test('an installed Windows copy and a Developer ID signed macOS app update themselves', async () => {
  const winExe = path.join('C:', 'Users', 'me', 'AppData', 'Local', 'Programs', 'vibe-usage', 'Vibe Usage.exe');
  const uninstaller = path.join(path.dirname(winExe), 'Uninstall Vibe Usage.exe');
  const installed = { packaged: true, execPath: winExe, platform: 'win32' as const, exists: (file: string) => file === uninstaller };
  assert.equal(await updateSupport({ ...installed, packaged: false }), 'unpackaged');
  assert.equal(await updateSupport(installed), null, 'signed or not: the checksums are checked, and a publisher once signed');
  assert.equal(await updateSupport({ ...installed, exists: () => false }), 'portable');
  const probe = { packaged: true, execPath: winExe };
  assert.equal(await updateSupport({ ...probe, platform: 'linux' }), 'platform');

  const macExe = '/Applications/Vibe Usage.app/Contents/MacOS/Vibe Usage';
  const bundles: string[] = [];
  const signedBy = (authority: string) => (bundle: string) => {
    bundles.push(bundle);
    return Promise.resolve(`Executable=${macExe}\nAuthority=${authority}\nAuthority=Apple Root CA\n`);
  };
  const mac = { packaged: true, platform: 'darwin' as const, execPath: macExe };
  assert.equal(await updateSupport({ ...mac, describeSignature: signedBy('Developer ID Application: Someone (TEAMID1234)') }), null);
  assert.equal(path.basename(bundles[0] ?? ''), 'Vibe Usage.app');
  assert.equal(await updateSupport({ ...mac, describeSignature: () => Promise.resolve('Signature=adhoc\n') }), 'unsigned');
  assert.equal(await updateSupport({ ...mac, describeSignature: () => Promise.reject(new Error('no codesign')) }), 'unsigned');
});
