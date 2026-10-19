// Checks what the app assumes about the installed Claude Code against this computer: run it after
// Claude Code updates. Read-only: it reads the binary, the profiles' session lists, transcript
// tails and state files, and asks the system when processes started; it ends nothing, starts
// no Claude Code and prints no conversation text, address or token.
// Usage: node scripts/probe-claude.ts [--json]   Exit code 1 when an assumption no longer holds.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { processStarted, systemProcesses } from '../src/core/claude-processes.ts';
import { attemptSync, isObject, JSON_LINES_EXTENSION, readJsonSync, readTailSync, type JsonObject } from '../src/core/files.ts';
import { CLAUDE_RESUME_THRESHOLD_ENV, launchPlan, RESUME_WITHOUT_QUESTION } from '../src/core/launch.ts';
import { claudeProfile, claudeStateFile, CLAUDE_FILES } from '../src/providers/claude.ts';
import { findBinary } from '../src/providers/common.ts';
import { profileFolders } from '../src/providers/profiles.ts';
import { DURATION_MS } from '../src/shared/catalog.ts';
import {
  checkBinaryPins,
  checkProcessStarts,
  checkProfileState,
  checkRecordTypes,
  checkSessionEntries,
  checkSessionMarkers,
  checkSetupScreens,
  type Finding,
  type LiveProcess,
  type SessionEntry
} from './probe-claude-checks.ts';

const TAIL_BYTES = 512 * 1024;
const RECENT_MS = 14 * DURATION_MS.DAY;
const home = os.homedir();

// A file's JSON, undefined (not null) when it cannot be read, as the checks take it.
const readJson = (file: string): unknown => readJsonSync(file) ?? undefined;
const list = (dir: string): string[] => {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
};
// The Claude Code profiles the app finds, with the state file each keeps.
const profiles = (await profileFolders('claude', home)).map(dir => ({
  name: path.basename(dir),
  dir,
  state: claudeStateFile(claudeProfile(dir, home), home)
}));

// Whether the app starts the sessions it resumes with the resume dialog out of reach, asked of
// the real launch plan of a resumed session (nothing is started).
const plan = await launchPlan('claude', {
  account: {
    id: 'claude:probe',
    providerId: 'claude',
    configDir: path.join(home, '.claude'),
    configDirExplicit: true,
    primary: false,
    enabled: true
  },
  resume: '00000000-0000-4000-8000-000000000000'
}).catch(() => null);
const resumeHeldOff = plan?.env.set?.[CLAUDE_RESUME_THRESHOLD_ENV] === RESUME_WITHOUT_QUESTION;

const findings: Finding[] = [];
const binaryPath = await findBinary('claude').catch(() => null);
if (binaryPath) {
  const binary = fs.readFileSync(binaryPath).toString('latin1');
  findings.push(...checkSetupScreens(binary), ...checkBinaryPins(binary), ...checkSessionMarkers(process.env, binary));
} else findings.push({ level: 'fail', check: 'binary', detail: 'claude was not found' });

const entries: SessionEntry[] = [];
const keyFiles: string[] = [];
const live: LiveProcess[] = [];
const types = new Map<string, { count: number; untimed: number }>();
for (const profile of profiles) {
  for (const name of list(path.join(profile.dir, CLAUDE_FILES.sessions))) {
    if (name.endsWith('.key')) keyFiles.push(name);
    if (!name.endsWith('.json')) continue;
    const value = readJson(path.join(profile.dir, CLAUDE_FILES.sessions, name));
    // An unreadable entry of a process that has ended was cut short when it went down (a crash):
    // a leftover the app skips, not a change in Claude Code's format.
    const pid = Number.parseInt(name, 10);
    if (value === undefined && !systemProcesses.isAlive(pid)) continue;
    entries.push({ file: `${profile.name}/sessions/${name}`, value });
    const entry: JsonObject = isObject(value) ? value : {};
    if (typeof entry.pid === 'number' && systemProcesses.isAlive(entry.pid)) {
      const started = await processStarted(entry.pid);
      live.push({
        pid: entry.pid,
        procStart: typeof entry.procStart === 'string' ? entry.procStart : undefined,
        startedAt: typeof entry.startedAt === 'number' ? entry.startedAt : 0,
        osTicks: started?.ticks ?? null,
        osAt: started?.at ?? null
      });
    }
  }
  const projects = path.join(profile.dir, CLAUDE_FILES.projects);
  for (const project of list(projects))
    for (const name of list(path.join(projects, project)).filter(n => n.endsWith(JSON_LINES_EXTENSION))) {
      const file = path.join(projects, project, name);
      if (Date.now() - fs.statSync(file).mtimeMs > RECENT_MS) continue;
      // The first line of a tail may be cut; it is skipped.
      for (const line of readTailSync(file, TAIL_BYTES).split('\n').slice(1)) {
        if (!line.trim()) continue;
        const record = attemptSync((): unknown => JSON.parse(line));
        if (!isObject(record)) continue;
        const type = String(record.type);
        const seen = types.get(type) ?? { count: 0, untimed: 0 };
        seen.count++;
        if (!record.timestamp) seen.untimed++;
        types.set(type, seen);
      }
    }
  findings.push(...checkProfileState(profile.name, readJson(profile.state), { resumeHeldOff }));
}
findings.push(...checkSessionEntries(entries, keyFiles), ...checkProcessStarts(live), ...checkRecordTypes(types));

if (process.argv.includes('--json'))
  console.log(JSON.stringify({ binary: binaryPath ? path.basename(binaryPath) : null, findings }, null, 2));
else {
  const mark = { ok: '✔', warn: '⚠', fail: '✖' } as const;
  for (const f of findings) console.log(`${mark[f.level]} ${f.check}: ${f.detail}`);
}
process.exitCode = findings.some(f => f.level === 'fail') ? 1 : 0;
