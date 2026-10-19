// Evidence about the Claude Code process running a session, from what Claude Code and the
// system keep about it.
//
// A Claude Code process that saves its session lists itself in <profile>/sessions/<pid>.json,
// with its session id, what it is doing and when it started, from startup on. A process begun
// as a child session (the markers in CLAUDE_SESSION_ENV_KEYS) lists nothing and saves nothing:
// it leaves only <profile>/sessions/<pid>.<hash>.key, the key of its messaging socket, which
// every process writes. That key is what ties a process to a profile.
//
// A process not listed is looked for among the system's processes, by the `--resume <session>`
// it was started with, among the pids the profile holds a key for. The list file can outlive
// its process and a pid can be reused, so a process is ended only after its start time matches
// the one recorded: exactly, where Claude Code recorded the system's own (`procStart`, Windows
// file-time ticks), else to within a second or two.
//
// Asking the system can fail (a timeout under load, say). That is not the same as "no such
// process": a caller gets `unknown` and acts on nothing until it can tell.
import { execFile } from 'node:child_process';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { CLAUDE_FILES } from '../providers/claude.ts';
import { windowsPowerShell } from '../providers/common.ts';
import { systemErrorCode } from './errors.ts';
import { isOneOf } from '../shared/catalog.ts';
import { isObject, readJson, type JsonObject } from './files.ts';

const execFileAsync = promisify(execFile);
const QUERY_TIMEOUT_MS = 10_000;
// Windows records process start times in 100 ns ticks since 1601.
const TICKS_PER_MS = 10_000;
const UNIX_EPOCH_TICKS = 116_444_736_000_000_000n;
// Without `procStart`: how far the recorded start may be from the process's own, for the two
// to be one process.
const SAME_START_MS = 2_000;
const LIST_ENTRY = /^(\d+)\.json$/;
const KEY_ENTRY = /^(\d+)\.[0-9a-f]+\.key$/;
// A pid or Windows file-time ticks, as the system prints them and Claude Code records a start.
const DIGITS = /^\d+$/;
// What a listed Claude Code process says it is doing (pinned by the corpus contract). `waiting`
// is a session Claude Code holds at the usage limit until the reset (2.1.302, seen 2026-10-18);
// such a session counts as stopped by its transcript, not by this.
export const CLAUDE_SESSION_STATUSES = ['busy', 'idle', 'shell', 'waiting'] as const;
export type ClaudeSessionStatus = (typeof CLAUDE_SESSION_STATUSES)[number];

export interface LiveClaudeSession {
  pid: number;
  sessionId: string;
  // Listed in the profile's sessions, so it saves its session as it goes. A child session
  // does not: its conversation lives in its memory only.
  listed: boolean;
  // `busy` while a turn runs, `idle` once it waits for the user; null when not listed, or
  // when it says something this version does not know.
  status: ClaudeSessionStatus | null;
  statusSince: number;
  startedAt: number;
  // The system's start time as Claude Code recorded it, when it did.
  procStart: string | null;
}

// When a process started: in ms since the epoch, and as Windows file-time ticks where known.
export interface ProcessStart {
  at: number;
  ticks: string | null;
}

// A process the system runs, with the command line that started it.
export interface SystemProcess extends ProcessStart {
  pid: number;
  command: string;
}

// What a lookup established. `unknown` is not "none": the system could not be asked.
export type ProcessLookup = { kind: 'found'; process: LiveClaudeSession } | { kind: 'none' } | { kind: 'unknown'; reason: string };

// What ending a process came to.
export type ProcessEnd = 'ended' | 'gone' | 'other' | 'unknown';

export interface ProcessControl {
  isAlive: (pid: number) => boolean;
  // The process's start, null when it has none (gone); throws when the system cannot say.
  started: (pid: number) => Promise<ProcessStart | null>;
  end: (pid: number) => void;
  // The running Claude Code processes; throws when the system cannot say.
  list?: () => Promise<SystemProcess[]>;
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return systemErrorCode(error) === 'EPERM';
  }
}

const ticksToMs = (ticks: string): number => Number((BigInt(ticks) - UNIX_EPOCH_TICKS) / BigInt(TICKS_PER_MS));

async function powershell(script: string): Promise<string> {
  const { stdout } = await execFileAsync(windowsPowerShell(), ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    timeout: QUERY_TIMEOUT_MS,
    windowsHide: true
  });
  return stdout;
}

// A process start as `Get-Process` prints it (`StartTime.ToFileTimeUtc()`), null for none.
export function parseWindowsStart(stdout: string): ProcessStart | null {
  const ticks = stdout.trim();
  return DIGITS.test(ticks) ? { at: ticksToMs(ticks), ticks } : null;
}

// Processes as the Windows query prints them: `pid|ticks|command line` per line.
export function parseWindowsProcesses(stdout: string): SystemProcess[] {
  return stdout.split(/\r?\n/).flatMap(line => {
    const [pid, ticks, ...command] = line.split('|');
    if (!pid || !ticks || !DIGITS.test(pid) || !DIGITS.test(ticks)) return [];
    return [{ pid: Number(pid), at: ticksToMs(ticks), ticks, command: command.join('|') }];
  });
}

// Claude Code processes as `ps -eo pid=,args=` prints them, without their start (looked up
// one by one).
export function parsePsProcesses(stdout: string): { pid: number; command: string }[] {
  return stdout.split('\n').flatMap(line => {
    const match = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (!match?.[1] || !match[2] || !/(^|[\\/\s])claude(\s|$)/.test(match[2])) return [];
    return [{ pid: Number(match[1]), command: match[2] }];
  });
}

// When the process started, as the system reports it: null for a process that is gone. A
// system that cannot answer throws.
export async function processStarted(pid: number): Promise<ProcessStart | null> {
  if (process.platform === 'win32') {
    const script = `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($p) { $p.StartTime.ToFileTimeUtc() } else { 'gone' }`;
    const stdout = await powershell(script);
    if (stdout.trim() === 'gone') return null;
    const started = parseWindowsStart(stdout);
    if (!started) throw new Error(`unexpected process start: ${stdout.trim().slice(0, 40)}`);
    return started;
  }
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync('ps', ['-o', 'lstart=', '-p', String(pid)], { encoding: 'utf8', timeout: QUERY_TIMEOUT_MS }));
  } catch (error) {
    // `ps` exits 1 for a pid it does not know.
    if (systemErrorCode(error) === 1) return null;
    throw error;
  }
  if (!stdout.trim()) return null;
  const at = Date.parse(stdout.trim());
  if (!Number.isFinite(at)) throw new Error('unexpected process start');
  return { at, ticks: null };
}

// The running Claude Code processes and their command lines. The start time comes from the
// same source as `processStarted`, so the two compare exactly (CIM's creation date is coarser).
async function claudeProcesses(): Promise<SystemProcess[]> {
  if (process.platform === 'win32') {
    const script =
      "Get-CimInstance Win32_Process -Filter \"Name='claude.exe'\" | ForEach-Object { $started = (Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue).StartTime; if ($started) { '{0}|{1}|{2}' -f $_.ProcessId, $started.ToFileTimeUtc(), $_.CommandLine } }";
    return parseWindowsProcesses(await powershell(script));
  }
  const { stdout } = await execFileAsync('ps', ['-eo', 'pid=,args='], { encoding: 'utf8', timeout: QUERY_TIMEOUT_MS });
  const found: SystemProcess[] = [];
  for (const { pid, command } of parsePsProcesses(stdout)) {
    const started = await processStarted(pid);
    if (started) found.push({ pid, ...started, command });
  }
  return found;
}

// The newest process started to resume `sessionId`.
export function resumingProcess(processes: readonly SystemProcess[], sessionId: string): SystemProcess | null {
  const resume = new RegExp(`(^|\\s)(--resume|-r)\\s+"?${RegExp.escape(sessionId)}"?(\\s|$)`);
  return [...processes].filter(p => resume.test(p.command)).sort((a, b) => b.at - a.at)[0] ?? null;
}

export const systemProcesses: ProcessControl = {
  isAlive,
  started: processStarted,
  list: claudeProcesses,
  end: pid => {
    try {
      process.kill(pid);
    } catch (error) {
      // Gone already is fine; a refusal (another user's process, an elevated one) is not.
      if (systemErrorCode(error) !== 'ESRCH') throw error;
    }
  }
};

// How long a process gets to go after being told to.
const END_WAIT_MS = 2_000;
const END_POLL_MS = 100;

const number = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

// The pids the profile's processes list under, and the pids it holds a key for.
async function profilePids(configDir: string): Promise<{ listed: Map<number, string>; keyed: Set<number> }> {
  const dir = path.join(configDir, CLAUDE_FILES.sessions);
  const names = await fsp.readdir(dir).catch(() => []);
  const listed = new Map<number, string>();
  const keyed = new Set<number>();
  for (const name of names) {
    const entry = LIST_ENTRY.exec(name);
    if (entry?.[1]) listed.set(Number(entry[1]), path.join(dir, name));
    const key = KEY_ENTRY.exec(name);
    if (key?.[1]) keyed.add(Number(key[1]));
  }
  return { listed, keyed };
}

// A process as its entry in the profile's session list describes it.
function listedSession(pid: number, sessionId: string, entry: JsonObject): LiveClaudeSession {
  return {
    pid,
    sessionId,
    listed: true,
    status: isOneOf(CLAUDE_SESSION_STATUSES, entry.status) ? entry.status : null,
    statusSince: number(entry.statusUpdatedAt) || number(entry.updatedAt),
    startedAt: number(entry.startedAt),
    procStart: typeof entry.procStart === 'string' && DIGITS.test(entry.procStart) ? entry.procStart : null
  };
}

// An interactive session a profile's Claude Code process runs and saves as it goes.
export interface OpenClaudeSession extends LiveClaudeSession {
  // Where the process runs.
  cwd: string;
}

// Reads the interactive sessions a profile's processes run now, as they list themselves. Child
// sessions (unlisted, unsaved) and runs started by a program are left out: neither can be
// reopened. A list entry outlives a process that ended with the system, and its pid can belong
// to another process by now, so each process's start is checked against the system's, once
// (a system that cannot say throws, and is asked again next time).
export function openSessionsReader(
  processes: Pick<ProcessControl, 'isAlive' | 'started'> = systemProcesses
): (configDir: string) => Promise<OpenClaudeSession[]> {
  const checked = new Map<string, boolean>();
  return async configDir => {
    const { listed } = await profilePids(configDir);
    const open: OpenClaudeSession[] = [];
    for (const [pid, file] of listed) {
      const entry = await readJson(file);
      if (!isObject(entry) || entry.kind !== 'interactive' || typeof entry.sessionId !== 'string' || typeof entry.cwd !== 'string')
        continue;
      if (!processes.isAlive(pid)) continue;
      const session: OpenClaudeSession = { ...listedSession(pid, entry.sessionId, entry), cwd: entry.cwd };
      const id = `${pid}:${session.startedAt}:${session.procStart ?? ''}`;
      let same = checked.get(id);
      if (same === undefined) {
        const started = await processes.started(pid);
        same = started !== null && isSameProcess(session, started);
        checked.set(id, same);
      }
      if (same) open.push(session);
    }
    return open;
  };
}

// The running process of `sessionId` in the profile: the newest listed one, else the newest
// started to resume it among the processes the profile holds a key for.
export async function findClaudeProcess(
  configDir: string,
  sessionId: string,
  processes: Pick<ProcessControl, 'isAlive' | 'list'> = systemProcesses
): Promise<ProcessLookup> {
  const { listed, keyed } = await profilePids(configDir);
  const live: LiveClaudeSession[] = [];
  for (const [pid, file] of listed) {
    const entry = await readJson(file);
    if (!isObject(entry) || entry.sessionId !== sessionId || !processes.isAlive(pid)) continue;
    live.push(listedSession(pid, sessionId, entry));
  }
  const newest = live.sort((a, b) => b.startedAt - a.startedAt)[0];
  if (newest) return { kind: 'found', process: newest };
  // A key without a list entry is a child session's: unlisted, unsaved, but this profile's.
  const unlisted = [...keyed].filter(pid => !listed.has(pid) && processes.isAlive(pid));
  if (!unlisted.length || !processes.list) return { kind: 'none' };
  let all: SystemProcess[];
  try {
    all = await processes.list();
  } catch (error) {
    return { kind: 'unknown', reason: error instanceof Error ? error.message : String(error) };
  }
  const resuming = resumingProcess(
    all.filter(p => unlisted.includes(p.pid)),
    sessionId
  );
  return resuming
    ? {
        kind: 'found',
        process: {
          pid: resuming.pid,
          sessionId,
          listed: false,
          status: null,
          statusSince: 0,
          startedAt: resuming.at,
          procStart: resuming.ticks
        }
      }
    : { kind: 'none' };
}

// Whether the system's process is the one Claude Code recorded. Recorded ticks are compared
// exactly: a mismatch is another process, never a near miss.
export function isSameProcess(live: LiveClaudeSession, started: ProcessStart): boolean {
  if (live.procStart !== null && started.ticks !== null) return live.procStart === started.ticks;
  return Math.abs(started.at - live.startedAt) <= SAME_START_MS;
}

// Ends the session's process: `gone` when no process has its pid any more, `other` when the pid
// now belongs to another process, `unknown` when the system could not say, or would not do it,
// or the process did not go. Only `ended` means the process is no more.
export async function endClaudeSession(live: LiveClaudeSession, processes: ProcessControl = systemProcesses): Promise<ProcessEnd> {
  let started: ProcessStart | null;
  try {
    started = await processes.started(live.pid);
  } catch {
    return 'unknown';
  }
  if (!started) return 'gone';
  if (!isSameProcess(live, started)) return 'other';
  try {
    processes.end(live.pid);
  } catch {
    return 'unknown';
  }
  for (const deadline = Date.now() + END_WAIT_MS; processes.isAlive(live.pid);) {
    if (Date.now() >= deadline) return 'unknown';
    await new Promise(resolve => setTimeout(resolve, END_POLL_MS));
  }
  return 'ended';
}
