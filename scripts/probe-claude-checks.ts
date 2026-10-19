// What the app assumes about the installed Claude Code, as checks over data read from this
// computer. Each assumption was verified against Claude Code 2.1.302; a failed check means an
// upgrade changed something the app relies on (see scripts/probe-claude.ts). Nothing here reads
// conversation text, e-mail addresses or tokens: only names, types, counts and times.
import { CLAUDE_SESSION_STATUSES } from '../src/core/claude-processes.ts';
import { CLAUDE_SESSION_ENV_KEYS } from '../src/shared/catalog.ts';

export type Level = 'ok' | 'warn' | 'fail';

export interface Finding {
  level: Level;
  check: string;
  detail: string;
}

const finding = (level: Level, check: string, detail: string): Finding => ({ level, check, detail });

// The screens Claude Code may show before a session starts, in the order its code names them. A
// screen not in this list could put a question in front of a session the app starts unattended.
export const KNOWN_SETUP_SCREENS = [
  'Onboarding',
  'TrustDialog',
  'ClaudeMdExternalIncludesDialog',
  'GroveDialog',
  'ProTrialStartScreen',
  'PowerupDiscoveryStep',
  'ApproveApiKey',
  'BypassPermissionsModeDialog',
  'DevChannelsDialog',
  'ClaudeInChromeOnboarding',
  'ChromeAutoEnableDialog',
  // Shown after ApproveApiKey, only for Bedrock and Vertex accounts; its code comes last.
  'ThirdPartyModelUpgradeDialog'
];
// Where the setup screens are listed: the result Claude Code fills while it shows them.
const SETUP_ANCHOR = 'onboardingShown:!1,onboardingSkippedSignIn:!1';
const SETUP_REGION_CHARS = 14_000;

// Text in the binary the app's logic depends on, and why.
export const BINARY_PINS: readonly (readonly [string, string])[] = [
  ['CLAUDE_CODE_RESUME_THRESHOLD_MINUTES', 'the resume dialog can be held off for sessions the app starts'],
  ['CLAUDE_CODE_RESUME_TOKEN_THRESHOLD', 'the resume dialog is shown above a token count'],
  ['"compact","continue","dismiss","never","cancelled"', 'the resume dialog asks this question'],
  ['resumeReturnDismissed', 'the user can turn the resume dialog off'],
  ['Config lock compromised', 'the state file is written under a proper-lockfile lock'],
  ['.oauth_refresh.lock', 'sign-in renewal is serialized across Claude Code processes'],
  ["The server's headline pick", 'is_active marks the headline usage row, not eligibility'],
  ['tengu_chrome_auto_enable', 'the Claude in Chrome offer is behind this flag'],
  ['claudeInChromeDefaultEnabled', 'a recorded Chrome decision skips the offer'],
  ['Permission mode downgraded to default', 'bypassPermissions without consent is downgraded'],
  ['bypassPermissionsModeAccepted', 'consent to bypassPermissions is recorded here'],
  ['hasCompletedClaudeInChromeOnboarding', 'the Chrome onboarding screen is skipped once completed'],
  ['hasClaudeMdExternalIncludesApproved', 'the CLAUDE.md includes dialog is skipped once approved']
];

// Transcript record types seen in real transcripts; those without a timestamp are listed so
// that "last written" logic never relies on them.
export const KNOWN_RECORD_TYPES = new Set([
  'user',
  'assistant',
  'system',
  'attachment',
  'summary',
  'api-request',
  'api-request-blob',
  'api-request-shape',
  'queue-operation',
  'pr-link',
  'file-history-snapshot',
  'file-history-delta',
  'permission-mode',
  'mode',
  'atis-latch',
  'isolation-latch',
  'last-prompt',
  'cost-state',
  'ai-title',
  'relocated',
  'worktree-state'
]);

export const KNOWN_SESSION_STATUSES: ReadonlySet<string> = new Set(CLAUDE_SESSION_STATUSES);
export const KNOWN_ENTRYPOINTS = new Set(['cli', 'sdk-cli']);
// Variables a user sets to configure Claude Code; never session markers.
// (The app sets CLAUDE_CODE_RESUME_THRESHOLD_MINUTES itself for the sessions it resumes.)
const USER_CONFIG_PREFIXES = [
  'CLAUDE_CODE_USE_',
  'CLAUDE_CODE_MAX_',
  'CLAUDE_CODE_DISABLE_',
  'CLAUDE_CODE_ENABLE_',
  'CLAUDE_CODE_RESUME_',
  'CLAUDE_CONFIG_DIR'
];

export function setupScreens(binary: string): string[] {
  const start = binary.indexOf(SETUP_ANCHOR);
  if (start < 0) return [];
  const region = binary.slice(start, start + SETUP_REGION_CHARS);
  const names = [...region.matchAll(/\{((?:[A-Z][A-Za-z]*)?(?:Dialog|Screen|Onboarding|Step|ApiKey)):[A-Za-z_$]+\}/g)].map(m => m[1] ?? '');
  return [...new Set(names)];
}

export function checkSetupScreens(binary: string): Finding[] {
  const found = setupScreens(binary);
  if (!found.length) return [finding('fail', 'setup screens', 'the list of setup screens was not found in the binary')];
  const unknown = found.filter(name => !KNOWN_SETUP_SCREENS.includes(name));
  const missing = KNOWN_SETUP_SCREENS.filter(name => !found.includes(name));
  const known = found.filter(name => KNOWN_SETUP_SCREENS.includes(name));
  const ordered = known.every((name, i) => i === 0 || KNOWN_SETUP_SCREENS.indexOf(name) > KNOWN_SETUP_SCREENS.indexOf(known[i - 1] ?? ''));
  return [
    unknown.length
      ? finding('fail', 'setup screens', `new screen(s) that may ask a question at an unattended start: ${unknown.join(', ')}`)
      : finding('ok', 'setup screens', `${found.length} known screens`),
    ...(missing.length ? [finding('warn', 'setup screens', `no longer found: ${missing.join(', ')}`)] : []),
    ...(ordered ? [] : [finding('warn', 'setup screens', `order changed: ${known.join(' → ')}`)])
  ];
}

export function checkBinaryPins(binary: string): Finding[] {
  return BINARY_PINS.map(([text, why]) =>
    binary.includes(text) ? finding('ok', 'binary', why) : finding('fail', 'binary', `"${text}" is gone; the app assumes ${why}`)
  );
}

// Every marker the app strips must still be one Claude Code sets, and a marker Claude Code set in
// this environment that the app does not strip would make a launched tool a child session.
export function checkSessionMarkers(env: Readonly<Record<string, string | undefined>>, binary: string): Finding[] {
  const out: Finding[] = [];
  const stale = CLAUDE_SESSION_ENV_KEYS.filter(name => name !== 'TRACEPARENT' && name !== 'AI_AGENT' && !binary.includes(name));
  if (stale.length) out.push(finding('warn', 'session markers', `stripped but no longer in the binary: ${stale.join(', ')}`));
  const runningUnderClaude = env.CLAUDECODE !== undefined;
  const inherited = Object.keys(env).filter(
    name =>
      /^(CLAUDECODE|CLAUDE_CODE_|CLAUDE_PID$|CLAUDE_EFFORT$)/.test(name) &&
      !CLAUDE_SESSION_ENV_KEYS.includes(name) &&
      !USER_CONFIG_PREFIXES.some(prefix => name.startsWith(prefix))
  );
  if (inherited.length)
    out.push(
      finding('fail', 'session markers', `set by Claude Code here but not stripped from launched tools: ${inherited.sort().join(', ')}`)
    );
  else
    out.push(
      finding(
        'ok',
        'session markers',
        runningUnderClaude ? 'every marker in this environment is stripped' : 'not running under Claude Code: nothing to compare'
      )
    );
  return out;
}

export interface SessionEntry {
  file: string;
  value: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

// Claude Code's sessions/<pid>.json: the fields the app reads, with their types and values.
export function checkSessionEntries(entries: readonly SessionEntry[], keyFiles: readonly string[]): Finding[] {
  const out: Finding[] = [];
  const statuses = new Set<string>();
  const entrypoints = new Set<string>();
  for (const { file, value } of entries) {
    if (!isRecord(value)) {
      out.push(finding('fail', 'sessions', `${file}: not an object`));
      continue;
    }
    const wrong = [
      typeof value.pid === 'number' ? '' : 'pid',
      typeof value.sessionId === 'string' ? '' : 'sessionId',
      typeof value.startedAt === 'number' ? '' : 'startedAt',
      value.procStart === undefined || (typeof value.procStart === 'string' && /^\d+$/.test(value.procStart)) ? '' : 'procStart'
    ].filter(Boolean);
    if (wrong.length) out.push(finding('fail', 'sessions', `${file}: unexpected ${wrong.join(', ')}`));
    if (typeof value.status === 'string') statuses.add(value.status);
    if (typeof value.entrypoint === 'string') entrypoints.add(value.entrypoint);
  }
  const newStatuses = [...statuses].filter(s => !KNOWN_SESSION_STATUSES.has(s));
  const newEntrypoints = [...entrypoints].filter(e => !KNOWN_ENTRYPOINTS.has(e));
  if (newStatuses.length)
    out.push(finding('warn', 'sessions', `new status value(s): ${newStatuses.join(', ')} (waiting() treats them as busy)`));
  if (newEntrypoints.length)
    out.push(finding('warn', 'sessions', `new entrypoint(s): ${newEntrypoints.join(', ')} (headless detection looks for "sdk-")`));
  const badKeys = keyFiles.filter(name => !/^\d+\.[0-9a-f]{16,}\.key$/.test(name));
  if (badKeys.length) out.push(finding('warn', 'sessions', `key files not named <pid>.<hash>.key: ${badKeys.length}`));
  out.push(finding('ok', 'sessions', `${entries.length} entries, ${keyFiles.length} key files read`));
  return out;
}

export interface LiveProcess {
  pid: number;
  procStart: string | undefined;
  startedAt: number;
  // The system's own start time: Windows FileTime ticks, and ms since the epoch.
  osTicks: string | null;
  osAt: number | null;
}

// The app ends a process only when its recorded start matches the system's exactly (procStart),
// and otherwise within a few seconds (startedAt).
export function checkProcessStarts(processes: readonly LiveProcess[]): Finding[] {
  const out: Finding[] = [];
  for (const p of processes) {
    if (p.osAt === null) continue;
    if (p.procStart !== undefined && p.osTicks !== null && p.procStart !== p.osTicks)
      out.push(finding('fail', 'process start', `pid ${p.pid}: procStart differs from the system's start time`));
    const lag = p.startedAt - p.osAt;
    if (lag < -1000 || lag > 5000) out.push(finding('warn', 'process start', `pid ${p.pid}: startedAt is ${lag} ms from the system's`));
  }
  out.push(finding('ok', 'process start', `${processes.length} live process(es) compared`));
  return out;
}

export function checkRecordTypes(types: ReadonlyMap<string, { count: number; untimed: number }>): Finding[] {
  const unknown = [...types.keys()].filter(type => !KNOWN_RECORD_TYPES.has(type));
  const untimedMessages = ['user', 'assistant'].filter(type => (types.get(type)?.untimed ?? 0) > 0);
  return [
    unknown.length
      ? finding('warn', 'transcripts', `new record type(s): ${unknown.sort().join(', ')}`)
      : finding('ok', 'transcripts', `${types.size} record types, all known`),
    ...(untimedMessages.length
      ? [finding('fail', 'transcripts', `${untimedMessages.join(', ')} records without a timestamp (stop and last-written logic need it)`)]
      : [])
  ];
}

// A profile's state file: what could put a question in front of a session started unattended.
// `resumeHeldOff`: the app starts the sessions it resumes with the resume dialog out of reach.
export function checkProfileState(profile: string, state: unknown, { resumeHeldOff = false } = {}): Finding[] {
  if (!isRecord(state)) return [finding('warn', 'profile', `${profile}: state file not readable`)];
  const flags = isRecord(state.cachedGrowthBookFeatures) ? state.cachedGrowthBookFeatures : {};
  const out: Finding[] = [];
  if (state.hasCompletedOnboarding !== true) out.push(finding('warn', 'profile', `${profile}: first-run onboarding not completed`));
  if ((flags.tengu_gleaming_fair === true || flags.tengu_gleaming_fair_reuse === true) && state.resumeReturnDismissed !== true)
    out.push(
      resumeHeldOff
        ? finding('ok', 'profile', `${profile}: the resume dialog is on here; sessions the app resumes hold it off`)
        : finding(
            'fail',
            'profile',
            `${profile}: the resume dialog is on and the app does not hold it off (a long, idle session resumed here asks compact/continue)`
          )
    );
  if (flags.tengu_chrome_auto_enable === true && state.claudeInChromeDefaultEnabled === undefined)
    out.push(finding('warn', 'profile', `${profile}: the Claude in Chrome offer can appear (no Chrome decision recorded)`));
  if (state.bypassPermissionsModeAccepted !== true)
    out.push(finding('ok', 'profile', `${profile}: bypassPermissions not consented (a bypass session must not be moved here)`));
  if (out.every(f => f.level === 'ok')) out.push(finding('ok', 'profile', `${profile}: no question expected at an unattended start`));
  return out;
}
