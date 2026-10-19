import assert from 'node:assert/strict';
import test from 'node:test';
import { missingSigningCredentials, packagePlan } from '../scripts/package-config.ts';

test('an unsigned package never picks up a certificate on its own; macOS signs it ad hoc', () => {
  const env = { CSC_IDENTITY_AUTO_DISCOVERY: 'false' };
  const win = packagePlan('win', { signed: false, env: { CSC_LINK: 'present' } });
  const mac = packagePlan('mac', { signed: false, env: { CSC_LINK: '' } });
  assert.deepEqual([win.config, win.env], [{}, env]);
  assert.deepEqual([mac.config, mac.env], [{ mac: { identity: '-' } }, env]);
  // The workflow passes the credentials empty when unsigned; none may reach electron-builder.
  for (const name of ['CSC_LINK', 'CSC_KEY_PASSWORD', 'WIN_CSC_LINK', 'APPLE_ID', 'APPLE_API_KEY'])
    assert.ok(win.unset.includes(name) && mac.unset.includes(name), name);
  assert.deepEqual(packagePlan('win', { signed: true, env: { WIN_CSC_LINK: 'x', WIN_CSC_KEY_PASSWORD: 'y' } }).unset, []);
});

test('a signed package needs every credential, and fails before building without one', () => {
  assert.deepEqual(missingSigningCredentials('win', { WIN_CSC_LINK: 'x', WIN_CSC_KEY_PASSWORD: ' ' }), ['WIN_CSC_KEY_PASSWORD']);
  assert.throws(() => packagePlan('win', { signed: true, env: {} }), /WIN_CSC_LINK, WIN_CSC_KEY_PASSWORD; nothing was built/);
  assert.deepEqual(packagePlan('win', { signed: true, env: { WIN_CSC_LINK: 'x', WIN_CSC_KEY_PASSWORD: 'y' } }).config, {
    forceCodeSigning: true,
    win: { signExecutable: true }
  });

  const certificate = { CSC_LINK: 'x', CSC_KEY_PASSWORD: 'y' };
  assert.match(missingSigningCredentials('mac', certificate).join(), /APPLE_API_KEY \+ APPLE_API_KEY_ID \+ APPLE_API_ISSUER or APPLE_ID/);
  assert.throws(
    () => packagePlan('mac', { signed: true, env: { ...certificate, APPLE_ID: 'a', APPLE_TEAM_ID: 't' } }),
    /nothing was built/
  );
  for (const notarization of [
    { APPLE_API_KEY: 'k.p8', APPLE_API_KEY_ID: 'i', APPLE_API_ISSUER: 's' },
    { APPLE_ID: 'a', APPLE_APP_SPECIFIC_PASSWORD: 'p', APPLE_TEAM_ID: 't' }
  ])
    assert.deepEqual(packagePlan('mac', { signed: true, env: { ...certificate, ...notarization } }).config, {
      forceCodeSigning: true,
      mac: { hardenedRuntime: true, notarize: true }
    });
});

// Without an icon of its own (at least 512 px for the .icns) a package shows Electron's.
test('both packages use the app icon, large enough for macOS', async () => {
  const { readFile } = await import('node:fs/promises');
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
    build: Record<'win' | 'mac', { icon?: string }>;
  };
  assert.deepEqual([pkg.build.win.icon, pkg.build.mac.icon], ['assets/icon.png', 'assets/icon.png']);
  const icon = await readFile(new URL('../assets/icon.png', import.meta.url));
  assert.ok(Math.min(icon.readUInt32BE(16), icon.readUInt32BE(20)) >= 512);
});

// electron-builder deep-merges the plan over package.json; an identity left there would win.
test('package.json leaves the macOS identity to the plan, so a signed build finds its certificate', async () => {
  const { readFile } = await import('node:fs/promises');
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as { build: { mac: object } };
  assert.equal('identity' in pkg.build.mac, false);
});

// Published to npm, the package is the command-line front end: its command runs the built CLI,
// which starts as a script, and carries everything the CLI loads (the launchers included).
test('the npm package installs the vibe-usage command with what the CLI needs', async () => {
  const { readFile } = await import('node:fs/promises');
  const pkg: unknown = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(typeof pkg === 'object' && pkg !== null && 'bin' in pkg && 'files' in pkg && !('private' in pkg));
  assert.deepEqual(pkg.bin, { 'vibe-usage': 'build/cli.js' });
  assert.deepEqual(pkg.files, ['build/cli.js', 'build/core/', 'build/providers/', 'build/shared/', 'build/launchers/']);
  const cli = await readFile(new URL('../src/cli.ts', import.meta.url), 'utf8');
  assert.ok(cli.startsWith('#!/usr/bin/env node\n'), 'the command runs with node on macOS and Linux');
});
