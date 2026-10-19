import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { createQuotaWatch } from '../src/core/glance.ts';
import { chooseSuccessor, selectProvider } from '../src/core/selection.ts';
import { createService } from '../src/core/service.ts';
import {
  backupPath,
  defaultSettings,
  inQuietHours,
  projectPreference,
  saveSettings,
  validateConfigDir,
  validateSettings
} from '../src/core/settings.ts';
import { pathKey } from '../src/core/files.ts';
import type { ProviderAdapter } from '../src/providers/types.ts';
import type { Account, MeasuredAccount, Snapshot } from '../src/shared/types.ts';
import { account, measuredAccount, quotaWindow, tempDir } from './helpers/fixtures.ts';
import { PROVIDER_IDS } from '../src/shared/catalog.ts';

test('versioned settings migrate legacy documents and validate workflow preferences', () => {
  const s = validateSettings({
    pinned: false,
    intervalSeconds: 120,
    accounts: [],
    projectPreferences: [{ projectDir: path.resolve('project'), tool: 'codex', model: 'gpt-6-sol', autoContinue: 'off' }],
    lowQuotaPercent: 17,
    quietHours: { start: '22:00', end: '07:00' }
  });
  assert.equal(s.schemaVersion, 1);
  assert.equal(s.projectPreferences[0]?.autoContinue, 'off');
  const dir = path.resolve('p');
  for (const patch of [
    { schemaVersion: 2 },
    { schemaVersion: 0 },
    { lowQuotaPercent: 101 },
    { lowQuotaPercent: 0 },
    { lowQuotaPercent: 12.5 },
    { quietHours: { start: '25:00', end: '07:00' } },
    { quietHours: { start: '07:00', end: '07:00' } },
    { quietHours: { start: '7:00', end: '08:00' } },
    { projectPreferences: [{ projectDir: 'relative' }] },
    { projectPreferences: [{ projectDir: dir, model: 'gpt-6-sol' }] },
    { projectPreferences: [{ projectDir: dir, tool: 'antigravity', model: 'x' }] },
    { projectPreferences: [{ projectDir: dir, autoContinue: 'always' }] },
    { projectPreferences: [{ projectDir: dir }, { projectDir: dir }] }
  ])
    assert.throws(() => validateSettings({ ...defaultSettings(), ...patch }), Error, `${JSON.stringify(patch)} is rejected`);
  assert.equal(
    validateSettings({ ...defaultSettings(), projectPreferences: [{ projectDir: dir }] }).projectPreferences[0]?.autoContinue,
    'inherit'
  );
  assert.equal(validateSettings({ ...s, quietHours: null }).quietHours, undefined, 'null turns quiet hours off');
});

test('quiet hours include their start, exclude their end and may run past midnight', () => {
  const at = (time: string) => new Date(`2026-10-17T${time}:00`);
  const overnight = { start: '22:00', end: '07:00' };
  assert.deepEqual(
    ['21:59', '22:00', '23:59', '00:00', '06:59', '07:00', '12:00'].map(time => inQuietHours(overnight, at(time))),
    [false, true, true, true, true, false, false]
  );
  const lunch = { start: '12:00', end: '13:30' };
  assert.deepEqual(
    ['11:59', '12:00', '13:29', '13:30'].map(time => inQuietHours(lunch, at(time))),
    [false, true, true, false]
  );
  assert.equal(inQuietHours(undefined, at('03:00')), false);
});

test('a project preference is found by its folder, case-insensitively on Windows and macOS', () => {
  assert.equal(pathKey('C:\\Work\\App', 'win32'), pathKey('c:\\work\\app', 'win32'));
  assert.equal(pathKey('/Users/me/App', 'darwin'), pathKey('/users/me/app', 'darwin'));
  assert.notEqual(pathKey('/home/me/App', 'linux'), pathKey('/home/me/app', 'linux'));
  const settings = { projectPreferences: [{ projectDir: path.resolve('work/app'), autoContinue: 'off' as const }] };
  assert.equal(projectPreference(settings, path.resolve('work/app') + path.sep)?.autoContinue, 'off');
  assert.equal(projectPreference(settings, path.resolve('work/other')), null);
});

const window = (remaining: number) => quotaWindow({ id: 'w', remainingPercent: remaining, usedPercent: 100 - remaining });

test('the low line follows the user’s setting', () => {
  const fetchedAt = new Date().toISOString();
  const state = (remaining: number, lowQuotaPercent: number): Snapshot => ({
    refreshing: false,
    settings: { ...defaultSettings(), lowQuotaPercent },
    providers: [{ id: 'claude', status: 'ok', accounts: [measuredAccount({ fetchedAt, windows: [window(remaining)] })] }]
  });
  const watch = createQuotaWatch();
  assert.deepEqual(watch(state(40, 30)), []);
  assert.deepEqual(
    watch(state(25, 30)).map(a => a.kind),
    ['low'],
    '25% is low under a 30% line'
  );
  const strict = createQuotaWatch();
  strict(state(40, 10));
  assert.deepEqual(strict(state(25, 10)), [], 'but not under a 10% line');
});

test('a project’s tool and account narrow the choice and never stand in for verified quota', () => {
  const now = Date.now();
  const fetchedAt = new Date(now).toISOString();
  const claudeA = account({ id: 'claude:a', primary: true });
  const claudeB = account({ id: 'claude:b', primary: false });
  const codex = account({ id: 'codex:a', providerId: 'codex', primary: true });
  const read = (base: Account, remaining: number): MeasuredAccount => measuredAccount({ ...base, fetchedAt, windows: [window(remaining)] });
  const state = (readings: MeasuredAccount[]): Snapshot => ({
    refreshing: false,
    settings: { ...defaultSettings(), providerOrder: [...PROVIDER_IDS], accounts: [claudeA, claudeB, codex] },
    providers: (['claude', 'codex'] as const).map(id => ({ id, status: 'ok', accounts: readings.filter(r => r.providerId === id) }))
  });
  const roomy = state([read(claudeA, 80), read(claudeB, 80), read(codex, 80)]);
  assert.equal(selectProvider(roomy, { now, prefer: { tool: 'codex' } }).providerId, 'codex');
  assert.equal(selectProvider(roomy, { now, prefer: { tool: 'claude', accountId: 'claude:b' } }).account?.id, 'claude:b');
  assert.equal(
    selectProvider(roomy, { now, prefer: { tool: 'claude', accountId: 'claude:removed' } }).account?.id,
    'claude:a',
    'a removed account no longer narrows'
  );
  const codexOut = state([read(claudeA, 80), read(codex, 2)]);
  const choice = selectProvider(codexOut, { now, prefer: { tool: 'codex' } });
  assert.deepEqual([choice.providerId, choice.verified], ['codex', false], 'the preferred tool without quota is not swapped for another');
  const bOut = state([read(claudeA, 80), read(claudeB, 2), read(codex, 80)]);
  assert.equal(selectProvider(bOut, { now, prefer: { tool: 'claude', accountId: 'claude:b' } }).verified, false);

  const aOut = state([read(claudeA, 0), read(claudeB, 80), read(codex, 80)]);
  assert.equal(
    chooseSuccessor(aOut, claudeA, 'tools', { now, prefer: { tool: 'claude', accountId: 'claude:a' } })?.account?.id,
    'claude:b',
    'when the preferred account runs out, its tool’s other accounts take over'
  );
  const claudeOut = state([read(claudeA, 0), read(claudeB, 2), read(codex, 80)]);
  assert.equal(chooseSuccessor(claudeOut, claudeA, 'tools', { now, prefer: { tool: 'codex' } })?.providerId, 'codex');
});

test('corrupt settings recover from a private good backup while preserving the corrupt file', async t => {
  const file = path.join(await tempDir(t, 'vibe-recovery-'), 'settings.json');
  await saveSettings(file, defaultSettings());
  await saveSettings(file, { ...defaultSettings(), pinned: true });
  await fs.writeFile(file, '{broken');
  const service = await createService({ settingsPath: file, providers: [] });
  assert.equal(service.snapshot().settingsNotice, 'recovered');
  assert.equal(service.snapshot().settings.pinned, false);
  assert.equal(await fs.readFile(file, 'utf8'), '{broken');
  await service.updateSettings({ pinned: true });
  assert.equal(
    (await fs.readdir(path.dirname(file))).some(n => n.startsWith('settings.json.damaged-')),
    true
  );
  assert.equal(service.snapshot().settingsNotice, 'recovered', 'shown until the user dismisses it');
  assert.equal(service.dismissSettingsNotice().settingsNotice, undefined);
  if (process.platform !== 'win32') assert.equal((await fs.stat(backupPath(file))).mode & 0o777, 0o600);
});

test('unrecoverable and future settings stay operable without discovery overwrites', async t => {
  const file = path.join(await tempDir(t, 'vibe-recovery-'), 'settings.json');
  await fs.writeFile(file, '{broken');
  const found = account({ id: 'claude:found' });
  const discovering: ProviderAdapter = {
    id: 'claude',
    discover: () => Promise.resolve([found]),
    fetch: () => Promise.reject(new Error('not read in this test'))
  };
  const service = await createService({ settingsPath: file, providers: [discovering] });
  assert.equal(service.snapshot().settingsNotice, 'unrecoverable');
  assert.deepEqual(
    service.snapshot().settings.accounts.map(a => a.id),
    ['claude:found'],
    'discovered accounts are shown in memory'
  );
  assert.equal(await fs.readFile(file, 'utf8'), '{broken', 'and not written over the damaged file');
  await assert.rejects(service.updateSettings({ pinned: true }), /settings_locked/);
  await service.resetSettings();
  assert.equal(service.snapshot().settingsNotice, undefined);
  assert.equal((await fs.readdir(path.dirname(file))).filter(n => n.startsWith('settings.json.damaged-')).length, 1);
  await fs.writeFile(file, JSON.stringify({ ...defaultSettings(), schemaVersion: 99 }));
  const future = await createService({ settingsPath: file, providers: [] });
  assert.equal(future.snapshot().settingsNotice, 'future');
  await assert.rejects(future.resetSettings());
  await assert.rejects(future.importSettings(defaultSettings()));
  await assert.rejects(saveSettings(file, defaultSettings()));
  assert.equal((JSON.parse(await fs.readFile(file, 'utf8')) as { schemaVersion: number }).schemaVersion, 99);
});

test('settings export without the window place and import only as a complete valid document', async t => {
  const file = path.join(await tempDir(t, 'vibe-import-'), 'settings.json');
  const service = await createService({ settingsPath: file, providers: [] });
  const place = { x: 10, y: 10, width: 430, height: 800 };
  await service.updateSettings({ window: place, lowQuotaPercent: 30 });
  const exported = service.exportSettings();
  assert.equal('window' in exported, false);
  assert.equal(exported.schemaVersion, 1);
  await service.updateSettings({ lowQuotaPercent: 10 });
  await service.importSettings({ ...structuredClone(exported), window: { x: 0, y: 0, width: 999, height: 999 } });
  assert.equal(service.snapshot().settings.lowQuotaPercent, 30);
  assert.deepEqual(service.snapshot().settings.window, place, 'this screen’s window place is kept');
  for (const document of [
    null,
    'text',
    { ...exported, token: 'x' },
    { ...exported, schemaVersion: 2 },
    { ...exported, intervalSeconds: 1 }
  ])
    await assert.rejects(service.importSettings(document));
  assert.equal(service.snapshot().settings.lowQuotaPercent, 30, 'a rejected import changes nothing');
});

test('settings that cannot be read, start with a byte order mark, or back up a newer version are handled', async t => {
  const dir = await tempDir(t, 'vibe-settings-edge-');
  // A folder where the file belongs cannot be read: the app still starts, and a reset moves it aside.
  const folder = path.join(dir, 'folder', 'settings.json');
  await fs.mkdir(folder, { recursive: true });
  const blocked = await createService({ settingsPath: folder, providers: [] });
  assert.equal(blocked.snapshot().settingsNotice, 'unrecoverable');
  await assert.rejects(blocked.updateSettings({ pinned: true }), /settings_locked/);
  await blocked.resetSettings();
  assert.equal((await fs.stat(folder)).isFile(), true);
  assert.equal((await fs.readdir(path.dirname(folder))).filter(n => n.startsWith('settings.json.damaged-')).length, 1);

  // A byte order mark (PowerShell 5, Notepad) is not damage.
  const bom = path.join(dir, 'bom', 'settings.json');
  await fs.mkdir(path.dirname(bom));
  await fs.writeFile(bom, `\uFEFF${JSON.stringify({ ...defaultSettings(), intervalSeconds: 300 })}`);
  const marked = await createService({ settingsPath: bom, providers: [] });
  assert.equal(marked.snapshot().settingsNotice, undefined);
  assert.equal(marked.snapshot().settings.intervalSeconds, 300);

  // A damaged file whose backup a newer version wrote: locked as newer, and the backup is kept.
  const newer = path.join(dir, 'newer', 'settings.json');
  await fs.mkdir(path.dirname(newer));
  const future = JSON.stringify({ ...defaultSettings(), schemaVersion: 99 });
  await fs.writeFile(backupPath(newer), future);
  await fs.writeFile(newer, '{broken');
  const locked = await createService({ settingsPath: newer, providers: [] });
  assert.equal(locked.snapshot().settingsNotice, 'future');
  await assert.rejects(locked.updateSettings({ pinned: true }));
  assert.equal(await fs.readFile(backupPath(newer), 'utf8'), future);
  // A valid file saved over keeps a newer version's backup rather than replacing it.
  await saveSettings(newer, defaultSettings());
  await saveSettings(newer, { ...defaultSettings(), pinned: true });
  assert.equal(await fs.readFile(backupPath(newer), 'utf8'), future);
});

test('a folder path names its drive on Windows', () => {
  assert.throws(() => validateConfigDir(String.raw`\Repo`, 'win32'), /invalid_path/);
  assert.throws(() => validateConfigDir('/Repo', 'win32'), /invalid_path/);
  if (process.platform === 'win32') assert.equal(validateConfigDir(String.raw`C:\Repo`, 'win32'), String.raw`C:\Repo`);
  if (process.platform !== 'win32') assert.equal(validateConfigDir('/home/me/repo', 'linux'), '/home/me/repo');
});
