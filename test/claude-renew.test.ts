import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { renewClaudeSignIn, RENEW_ARGS, type RunProcess } from '../src/core/claude-renew.ts';
import { ProviderError } from '../src/core/errors.ts';
import { createService } from '../src/core/service.ts';
import type { FetchResult, ProviderAdapter } from '../src/providers/types.ts';
import type { Account } from '../src/shared/types.ts';
import { account, tempDir } from './helpers/fixtures.ts';

const NOW = Date.parse('2026-10-18T00:00:00.000Z');
const HOUR = 60 * 60 * 1000;

test('an expired sign-in is renewed by Claude Code itself, with its smallest request, in the account’s profile', async t => {
  const dir = await tempDir(t, 'vibe-renew-');
  const binary = path.join(dir, 'claude');
  await fs.writeFile(binary, '');
  process.env.VIBE_CLAUDE_BINARY = binary;
  t.after(() => {
    delete process.env.VIBE_CLAUDE_BINARY;
  });
  const second = account({ id: 'claude:b', configDir: path.join(dir, '.claude-2'), primary: false });
  let expiresAt = NOW - HOUR;
  let refreshToken: string | undefined = 'refresh';
  const runs: { binary: string; args: readonly string[]; cwd: unknown; profile: unknown }[] = [];
  const runProcess: RunProcess = (file, args, options) => {
    runs.push({ binary: file, args, cwd: options.cwd, profile: options.env?.CLAUDE_CONFIG_DIR });
    expiresAt = NOW + 8 * HOUR;
    return Promise.resolve();
  };
  const readCredentials = () => Promise.resolve({ claudeAiOauth: { accessToken: 'a', expiresAt, refreshToken } });
  const renew = (target: Account) => renewClaudeSignIn(target, { dataDir: dir, clock: () => NOW, runProcess, readCredentials });

  assert.equal(await renew(second), true);
  assert.deepEqual(runs, [{ binary, args: RENEW_ARGS, cwd: path.join(dir, 'renew'), profile: second.configDir }]);
  assert.ok(RENEW_ARGS.includes('--no-session-persistence') && RENEW_ARGS.includes('haiku'), 'nothing saved, the smallest model');

  expiresAt = NOW - HOUR;
  const unchanged: RunProcess = () => Promise.resolve();
  assert.equal(
    await renewClaudeSignIn(second, { dataDir: dir, clock: () => NOW, runProcess: unchanged, readCredentials }),
    false,
    'not renewed'
  );
  refreshToken = undefined;
  runs.length = 0;
  assert.equal(await renew(second), false, 'without a refresh token only signing in helps');
  assert.deepEqual(runs, []);
});

// Audit B, 04-renew-refresh-expiry: the real credentials file carries the refresh token's own
// expiry, some weeks after the sign-in; once it has passed, Claude Code was started for nothing.
test('a sign-in whose refresh token has itself expired is not renewed', async t => {
  const dir = await tempDir(t, 'vibe-renew-expired-');
  const binary = path.join(dir, 'claude');
  await fs.writeFile(binary, '');
  process.env.VIBE_CLAUDE_BINARY = binary;
  t.after(() => {
    delete process.env.VIBE_CLAUDE_BINARY;
  });
  const target = account({ id: 'claude:b', configDir: path.join(dir, '.claude-2'), primary: false });
  let refreshTokenExpiresAt: number | undefined = NOW - 24 * HOUR;
  let expiresAt = NOW - HOUR;
  let runs = 0;
  const runProcess: RunProcess = () => {
    runs++;
    expiresAt = NOW + 8 * HOUR;
    return Promise.resolve();
  };
  const readCredentials = () =>
    Promise.resolve({
      claudeAiOauth: {
        accessToken: 'a',
        refreshToken: 'r',
        expiresAt,
        ...(refreshTokenExpiresAt === undefined ? {} : { refreshTokenExpiresAt }),
        scopes: ['user:inference'],
        subscriptionType: 'pro'
      }
    });
  const renew = () => renewClaudeSignIn(target, { dataDir: dir, clock: () => NOW, runProcess, readCredentials });

  assert.equal(await renew(), false, 'expired a day ago: only signing in helps');
  assert.equal(runs, 0, 'Claude Code is not started');

  refreshTokenExpiresAt = NOW + 27 * 24 * HOUR;
  assert.equal(await renew(), true, 'still good for weeks');
  assert.equal(runs, 1);

  expiresAt = NOW - HOUR;
  refreshTokenExpiresAt = undefined;
  assert.equal(await renew(), true, 'an older file without the field is tried');
  assert.equal(runs, 2);
});

test('the service renews an expired sign-in beside the refresh, once in a while, and reads the account again', async t => {
  const dir = await tempDir(t, 'vibe-renew-service-');
  const settingsPath = path.join(dir, 'settings.json');
  const stored = (automation: object) => ({
    pinned: false,
    intervalSeconds: 120,
    ...automation,
    accounts: [{ ...account({ id: 'claude:b', configDir: path.resolve(dir, 'b'), primary: true }), configDirExplicit: true }]
  });
  let signedIn = false;
  const claude: ProviderAdapter = {
    id: 'claude',
    discover: () => Promise.resolve([]),
    fetch: (): Promise<FetchResult> =>
      signedIn
        ? Promise.resolve({ windows: [{ id: 'five_hour', remainingPercent: 100 }] })
        : Promise.reject(new ProviderError('auth_expired'))
  };
  let now = NOW;
  const renewals: string[] = [];
  // Each renewal waits until the test lets it finish, as a real one takes seconds.
  let finish: (renewed: boolean) => void = () => undefined;
  let changes = 0;
  const changed = new Promise<void>(resolve => {
    finish = renewed => {
      signedIn = renewed;
      resolve();
    };
  });
  const start = async (automation: object) => {
    await fs.writeFile(settingsPath, JSON.stringify(stored(automation)));
    return createService({
      settingsPath,
      providers: [claude],
      clock: () => now,
      onChange: () => {
        changes++;
      },
      renewSignIn: {
        claude: target => {
          renewals.push(target.id);
          return changed.then(() => signedIn);
        }
      }
    });
  };
  const status = (service: Awaited<ReturnType<typeof start>>) => service.snapshot().providers[0]?.accounts[0]?.status;

  const off = await start({ autoContinue: 'off' });
  await off.refresh();
  assert.deepEqual([status(off), renewals], ['auth_expired', []], 'nothing moves on its own: left to the user');

  const service = await start({ autoContinue: 'accounts' });
  await service.refresh();
  assert.deepEqual([status(service), renewals], ['auth_expired', ['claude:b']], 'the refresh does not wait for the renewal');
  await service.refresh();
  assert.equal(renewals.length, 1, 'one renewal at a time');
  finish(true);
  await changed;
  for (let tick = 0; tick < 20 && changes === 0; tick++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.deepEqual([status(service), changes], ['ok', 1], 'read again once renewed, and announced');

  signedIn = false;
  now += 10 * 60 * 1000;
  await service.refresh();
  assert.equal(renewals.length, 1, 'not again within half an hour');
  now += 21 * 60 * 1000;
  await service.refresh();
  assert.equal(renewals.length, 2, 'tried again later');

  // Opening sessions again on its own may take work home too, which needs the account read.
  const reopening = await start({ autoContinue: 'off', reopenAfterRestart: 'auto' });
  await reopening.refresh();
  assert.equal(renewals.length, 3, 'renewed for reopening after a restart as well');
});
