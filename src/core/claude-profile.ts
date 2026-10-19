// Getting a Claude Code profile ready for a session the app starts in it.
//
// Some answers Claude Code asks for belong to the user, not to the signed-in account: whether
// a folder is trusted, the first-run setup (theme, onboarding) and the notices already seen.
// Each profile keeps its own copy, so a profile used only to sign in would stop a moved
// session at the first-run setup. At launch, what another of the user's profiles already
// answered is carried into the profile being started, so the session goes on by itself.
//
// This happens at launch, for the one folder being opened, rather than by copying between
// profiles in the background: only a launch knows what the profile is about to need, and the
// state file is written under Claude Code's own lock, so a running session's changes are kept.
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CLAUDE_FILES, claudeStateFile } from '../providers/claude.ts';
import type { Account } from '../shared/types.ts';
import { systemErrorCode } from './errors.ts';
import { isObject, readJson, writeFileAtomic, type JsonObject } from './files.ts';

// What Claude Code writes for a folder it has not opened before.
const NEW_PROJECT = {
  allowedTools: [],
  mcpContextUris: [],
  mcpServers: {},
  enabledMcpjsonServers: [],
  disabledMcpjsonServers: [],
  hasClaudeMdExternalIncludesApproved: false,
  hasClaudeMdExternalIncludesWarningShown: false
};

// The user's own answers in the state file: first-run setups done (Claude Code's own and those of
// later features, such as Claude in Chrome) and notices seen. Account facts (subscription,
// usage, caches) are not among them, nor is what a feature was set to: a choice that opens a
// browser or changes what Claude Code may do is made in each profile, not copied.
const CHOICES: ReadonlySet<string> = new Set(['lastOnboardingVersion', 'lastReleaseNotesSeen']);
const isAcknowledgment = (key: string): boolean =>
  CHOICES.has(key) || /^hasCompleted([A-Z]\w*)?Onboarding$/.test(key) || /^hasSeen[A-Z]/.test(key);
// Questions Claude Code asks at a start unless a choice is recorded, answered the quiet way: a
// session the app starts may run unattended, and the user turns the feature on where they want it.
const QUIET_CHOICES: Readonly<Record<string, boolean>> = { claudeInChromeDefaultEnabled: false };
// What a project entry records about its CLAUDE.md includes; asked again where neither is set.
const INCLUDE_ANSWERS = ['hasClaudeMdExternalIncludesApproved', 'hasClaudeMdExternalIncludesWarningShown'] as const;

// Claude Code's lock on its state file is a folder next to it, refreshed while held; one left
// behind longer than this is stale.
const LOCK_STALE_MS = 10_000;
const LOCK_WAIT_MS = 5_000;
const LOCK_RETRY_MS = 100;

// Claude Code keys projects by absolute path with forward slashes.
const projectKey = (dir: string): string => path.resolve(dir).replaceAll('\\', '/');

const projectsOf = (state: unknown): JsonObject => (isObject(state) && isObject(state.projects) ? state.projects : {});

// The entry that trusts `dir`: its own, or the nearest folder's above it, as Claude Code reads it.
function trustingEntry(state: unknown, dir: string): JsonObject | null {
  const projects = projectsOf(state);
  for (let current = path.resolve(dir); ; current = path.dirname(current)) {
    const project = projects[projectKey(current)];
    if (isObject(project) && project.hasTrustDialogAccepted === true) return project;
    if (path.dirname(current) === current) return null;
  }
}
const isTrusted = (state: unknown, dir: string): boolean => trustingEntry(state, dir) !== null;

async function withStateLock(file: string, task: () => Promise<void>): Promise<void> {
  const lock = `${file}.lock`;
  for (const deadline = Date.now() + LOCK_WAIT_MS; ;) {
    try {
      await fsp.mkdir(lock);
      break;
    } catch (error) {
      if (systemErrorCode(error) !== 'EEXIST') throw error;
      const held = await fsp.stat(lock).catch(() => null);
      if (held && Date.now() - held.mtimeMs > LOCK_STALE_MS) await fsp.rm(lock, { recursive: true, force: true });
      else if (Date.now() > deadline) throw new Error('state file is locked', { cause: error });
      else await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_MS));
    }
  }
  try {
    await task();
  } finally {
    await fsp.rm(lock, { recursive: true, force: true });
  }
}

// What `state` lacks that the other profiles' states answer for `dir`.
function missingAnswers(state: JsonObject, others: readonly unknown[], dir: string): JsonObject {
  const answers: JsonObject = {};
  // A question asked again only where it was not answered yet, also in a profile set up before
  // the question existed; what a profile answered itself stays.
  for (const other of others)
    if (isObject(other))
      for (const [key, value] of Object.entries(other))
        if (isAcknowledgment(key) && state[key] === undefined && answers[key] === undefined) answers[key] = value;
  for (const [key, value] of Object.entries(QUIET_CHOICES)) if (state[key] === undefined) answers[key] = value;
  if (!isTrusted(state, dir) && others.some(other => isTrusted(other, dir))) {
    const projects = projectsOf(state);
    const key = projectKey(dir);
    const entry = isObject(projects[key]) ? projects[key] : NEW_PROJECT;
    // The includes question is about this folder's own CLAUDE.md: only an answer given for this
    // very folder comes along, never a parent's (trust is inherited from above; consent is not).
    const own = others.map(other => projectsOf(other)[key]).find(isObject);
    const includes = own
      ? Object.fromEntries(INCLUDE_ANSWERS.filter(name => typeof own[name] === 'boolean').map(name => [name, own[name]]))
      : {};
    answers.projects = { ...projects, [key]: { ...entry, ...includes, hasTrustDialogAccepted: true } };
  }
  return answers;
}

// The theme lives in the profile's settings; it is set only where none was chosen.
async function carryTheme(account: Account, others: readonly Account[]): Promise<void> {
  if (!account.configDir) return;
  const file = path.join(account.configDir, CLAUDE_FILES.settings);
  const settings = await readJson(file);
  if (isObject(settings) && settings.theme !== undefined) return;
  for (const other of others) {
    const theirs = other.configDir ? await readJson(path.join(other.configDir, CLAUDE_FILES.settings)) : null;
    if (!isObject(theirs) || typeof theirs.theme !== 'string') continue;
    await writeFileAtomic(file, `${JSON.stringify({ ...(isObject(settings) ? settings : {}), theme: theirs.theme }, null, 2)}\n`);
    return;
  }
}

// Carries the user's answers from their other Claude Code profiles into `account`'s, for a
// session about to start in `dir`. A profile that was never signed in is left alone.
export async function prepareClaudeProfile(
  account: Account,
  accounts: readonly Account[],
  dir: string,
  home = os.homedir()
): Promise<void> {
  const file = claudeStateFile(account, home);
  if (!isObject(await readJson(file))) return;
  const others = accounts.filter(a => a.providerId === 'claude' && a.enabled && a.id !== account.id);
  const states = await Promise.all(others.map(other => readJson(claudeStateFile(other, home))));
  await carryTheme(account, others);
  await withStateLock(file, async () => {
    // Read under the lock, so nothing Claude Code wrote meanwhile is lost.
    const state = await readJson(file);
    if (!isObject(state)) return;
    const answers = missingAnswers(state, states, dir);
    if (Object.keys(answers).length) await writeFileAtomic(file, JSON.stringify({ ...state, ...answers }, null, 2));
  });
}
