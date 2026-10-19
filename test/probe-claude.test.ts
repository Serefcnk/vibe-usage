import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BINARY_PINS,
  checkBinaryPins,
  checkProcessStarts,
  checkProfileState,
  checkRecordTypes,
  checkSessionEntries,
  checkSessionMarkers,
  checkSetupScreens,
  KNOWN_SETUP_SCREENS,
  setupScreens
} from '../scripts/probe-claude-checks.ts';
import { CLAUDE_SESSION_ENV_KEYS } from '../src/shared/catalog.ts';

const levels = (findings: { level: string }[]) => findings.map(f => f.level);
// A binary's setup code as Claude Code minifies it: each screen imported and destructured.
const setupCode = (names: readonly string[]) =>
  `x={onboardingShown:!1,onboardingSkippedSignIn:!1};${names.map((name, i) => `import("c${i}.js").then(({${name}:f})=>e(f))`).join(';')}`;

test('the setup screens are read from the binary, and a new one fails the probe', () => {
  assert.deepEqual(setupScreens(setupCode(KNOWN_SETUP_SCREENS)), KNOWN_SETUP_SCREENS);
  assert.deepEqual(levels(checkSetupScreens(setupCode(KNOWN_SETUP_SCREENS))), ['ok']);
  const added = checkSetupScreens(setupCode([...KNOWN_SETUP_SCREENS.slice(0, 3), 'SurveyDialog', ...KNOWN_SETUP_SCREENS.slice(3)]));
  assert.equal(added[0]?.level, 'fail');
  assert.match(added.map(f => f.detail).join(), /SurveyDialog/);
  assert.deepEqual(levels(checkSetupScreens(setupCode(KNOWN_SETUP_SCREENS.slice(1)))), ['ok', 'warn'], 'a removed screen only warns');
  assert.deepEqual(levels(checkSetupScreens('no setup code here')), ['fail']);
});

test('every pinned text must still be in the binary', () => {
  const all = BINARY_PINS.map(([text]) => text).join(' ');
  assert.ok(checkBinaryPins(all).every(f => f.level === 'ok'));
  const without = all.replace('resumeReturnDismissed', '');
  assert.deepEqual(
    checkBinaryPins(without)
      .filter(f => f.level === 'fail')
      .map(f => f.detail.slice(0, 23)),
    ['"resumeReturnDismissed"']
  );
});

test('a session marker Claude Code sets that the app does not strip fails the probe', () => {
  const binary = CLAUDE_SESSION_ENV_KEYS.join(' ');
  const inClaude = {
    CLAUDECODE: '1',
    CLAUDE_CODE_SESSION_ID: 'x',
    CLAUDE_CODE_USE_BEDROCK: '1',
    CLAUDE_CODE_RESUME_THRESHOLD_MINUTES: '1',
    PATH: 'p'
  };
  assert.deepEqual(levels(checkSessionMarkers(inClaude, binary)), ['ok'], 'user configuration is not a marker');
  const added = checkSessionMarkers({ ...inClaude, CLAUDE_CODE_PARENT_TASK: 'x' }, binary);
  assert.deepEqual(levels(added), ['fail']);
  assert.match(added[0]?.detail ?? '', /CLAUDE_CODE_PARENT_TASK/);
  assert.deepEqual(levels(checkSessionMarkers({}, binary.replace('CLAUDE_CODE_MESSAGING_TOKEN', ''))), ['warn', 'ok']);
});

test('session list entries, key files and process starts are checked as the app reads them', () => {
  const entry = { pid: 1, sessionId: 's', startedAt: 1, procStart: '134365044628810621', status: 'idle', entrypoint: 'cli' };
  assert.deepEqual(levels(checkSessionEntries([{ file: 'a', value: entry }], ['1.3e0a15188666f947e2f921a5722df6fd.key'])), ['ok']);
  const odd = checkSessionEntries(
    [
      { file: 'a', value: { ...entry, status: 'thinking', entrypoint: 'sdk-rs' } },
      { file: 'b', value: { ...entry, pid: '1' } }
    ],
    ['1.json.key']
  );
  assert.deepEqual(levels(odd), ['fail', 'warn', 'warn', 'warn', 'ok']);

  const exact = { pid: 1, procStart: '100', startedAt: 1_000_400, osTicks: '100', osAt: 1_000_000 };
  assert.deepEqual(levels(checkProcessStarts([exact])), ['ok']);
  assert.deepEqual(levels(checkProcessStarts([{ ...exact, procStart: '101' }])), ['fail', 'ok'], 'one tick off is another process');
  assert.deepEqual(levels(checkProcessStarts([{ ...exact, startedAt: 1_009_000 }])), ['warn', 'ok']);
});

test('transcript record types: new ones warn, untimed messages fail', () => {
  const seen = new Map([
    ['user', { count: 3, untimed: 0 }],
    ['assistant', { count: 3, untimed: 0 }],
    ['atis-latch', { count: 2, untimed: 2 }]
  ]);
  assert.deepEqual(levels(checkRecordTypes(seen)), ['ok']);
  assert.deepEqual(levels(checkRecordTypes(new Map([...seen, ['hologram', { count: 1, untimed: 0 }]]))), ['warn']);
  assert.deepEqual(levels(checkRecordTypes(new Map([...seen, ['user', { count: 3, untimed: 1 }]]))), ['ok', 'fail']);
});

test('a profile that would ask a question at an unattended start is reported', () => {
  const ready = { hasCompletedOnboarding: true, cachedGrowthBookFeatures: {} };
  assert.deepEqual(levels(checkProfileState('p', ready)), ['ok', 'ok']);
  const resumeDialog = { ...ready, cachedGrowthBookFeatures: { tengu_gleaming_fair_reuse: true } };
  assert.deepEqual(levels(checkProfileState('p', resumeDialog)), ['fail', 'ok'], 'on, and the app does not hold it off');
  assert.deepEqual(levels(checkProfileState('p', resumeDialog, { resumeHeldOff: true })), ['ok', 'ok', 'ok']);
  assert.deepEqual(levels(checkProfileState('p', { ...resumeDialog, resumeReturnDismissed: true })), ['ok', 'ok']);
  const chrome = { ...ready, cachedGrowthBookFeatures: { tengu_chrome_auto_enable: true } };
  assert.deepEqual(levels(checkProfileState('p', chrome)), ['warn', 'ok']);
  assert.deepEqual(levels(checkProfileState('p', { ...chrome, claudeInChromeDefaultEnabled: false })), ['ok', 'ok']);
  assert.deepEqual(levels(checkProfileState('p', { cachedGrowthBookFeatures: {} })), ['warn', 'ok']);
  assert.deepEqual(levels(checkProfileState('p', undefined)), ['warn']);
});
