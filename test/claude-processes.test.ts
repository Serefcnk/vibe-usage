import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  endClaudeSession,
  findClaudeProcess,
  isSameProcess,
  openSessionsReader,
  parsePsProcesses,
  parseWindowsProcesses,
  parseWindowsStart,
  processStarted,
  resumingProcess,
  type LiveClaudeSession,
  type ProcessControl,
  type SystemProcess
} from '../src/core/claude-processes.ts';
import { tempDir } from './helpers/fixtures.ts';

const STARTED = 1_792_271_548_097;
// Windows file-time ticks of a start 420 ms before STARTED, as Claude Code records them.
const TICKS = '134367451476774134';

const live = (fields: Partial<LiveClaudeSession> = {}): LiveClaudeSession => ({
  pid: 4242,
  sessionId: 'session-1',
  listed: true,
  status: 'idle',
  statusSince: STARTED,
  startedAt: STARTED,
  procStart: TICKS,
  ...fields
});

function processes(started: ProcessControl['started']): ProcessControl & { ended: number[] } {
  const ended: number[] = [];
  // A process told to end is gone by the next look.
  return { isAlive: pid => !ended.includes(pid), started, end: pid => void ended.push(pid), ended };
}

// A profile folder whose sessions list the given entries and hold keys for the given pids.
async function profile(t: Parameters<typeof tempDir>[0], listed: Record<number, object>, keyed: number[] = []): Promise<string> {
  const dir = await tempDir(t, 'vibe-profile-');
  const sessions = path.join(dir, 'sessions');
  await fs.mkdir(sessions);
  for (const [pid, fields] of Object.entries(listed))
    await fs.writeFile(path.join(sessions, `${pid}.json`), JSON.stringify({ pid: Number(pid), ...fields }));
  for (const pid of keyed) await fs.writeFile(path.join(sessions, `${pid}.0123abcd.key`), 'key');
  return dir;
}

test('the running process of a session is read from the profile, the newest listed one', async t => {
  const dir = await profile(t, {
    1: { sessionId: 'session-1', startedAt: 10, status: 'busy', statusUpdatedAt: 11, procStart: TICKS },
    2: { sessionId: 'session-1', startedAt: 20, status: 'idle', updatedAt: 21 },
    3: { sessionId: 'session-1', startedAt: 30 },
    4: { sessionId: 'other', startedAt: 40 }
  });
  await fs.writeFile(path.join(dir, 'sessions', '5.json'), '{ not json');
  const alive = new Set([1, 2, 4]);
  const control = { isAlive: (pid: number) => alive.has(pid) };
  assert.deepEqual(await findClaudeProcess(dir, 'session-1', control), {
    kind: 'found',
    process: { pid: 2, sessionId: 'session-1', listed: true, status: 'idle', statusSince: 21, startedAt: 20, procStart: null }
  });
  alive.delete(2);
  const found = await findClaudeProcess(dir, 'session-1', control);
  assert.equal(found.kind === 'found' && found.process.procStart, TICKS);
  assert.deepEqual(await findClaudeProcess(path.join(dir, 'missing'), 'session-1', control), { kind: 'none' }, 'no sessions folder');
});

test('a child session, unlisted, is found by its key and the command that resumed it; another profile’s is not', async t => {
  const resumed: SystemProcess = {
    pid: 96040,
    at: STARTED,
    ticks: TICKS,
    command: '"C:\\bin\\claude.exe" --resume session-1 --model opus "Go on"'
  };
  const other: SystemProcess = { pid: 7, at: STARTED + 1, ticks: '2', command: 'claude.exe --resume session-10' };
  const elsewhere: SystemProcess = { pid: 8, at: STARTED + 2, ticks: '3', command: 'claude.exe --resume session-1' };
  const listed: string[] = [];
  const control = {
    isAlive: () => true,
    list: () => {
      listed.push('listed');
      return Promise.resolve([other, resumed, elsewhere]);
    }
  };
  const mine = await profile(t, {}, [96040, 7]);
  assert.deepEqual(await findClaudeProcess(mine, 'session-1', control), {
    kind: 'found',
    process: { pid: 96040, sessionId: 'session-1', listed: false, status: null, statusSince: 0, startedAt: STARTED, procStart: TICKS }
  });
  const theirs = await profile(t, {}, [8]);
  assert.equal((await findClaudeProcess(theirs, 'session-1', control)).kind, 'found', 'the one its key names');
  const neither = await profile(t, {}, []);
  listed.length = 0;
  assert.deepEqual(await findClaudeProcess(neither, 'session-1', control), { kind: 'none' }, 'no key: no process of this profile');
  assert.deepEqual(listed, [], 'and the system is not asked');
  const failing = { isAlive: () => true, list: () => Promise.reject(new Error('timed out')) };
  assert.deepEqual(await findClaudeProcess(mine, 'session-1', failing), { kind: 'unknown', reason: 'timed out' });
});

test('the sessions open in a profile are its interactive, listed processes that are still the ones recorded', async t => {
  const dir = await profile(t, {
    1: { sessionId: 'session-1', kind: 'interactive', cwd: '/work/app', startedAt: STARTED, procStart: TICKS, status: 'busy' },
    2: { sessionId: 'session-2', kind: 'interactive', cwd: '/work/web', startedAt: STARTED, status: 'idle' },
    3: { sessionId: 'session-3', kind: 'sdk-cli', cwd: '/work/app', startedAt: STARTED },
    4: { sessionId: 'session-4', kind: 'interactive', startedAt: STARTED },
    5: { sessionId: 'session-5', kind: 'interactive', cwd: '/work/app', startedAt: STARTED },
    // Left from before the system went down; its pid is another process's now.
    6: { sessionId: 'session-6', kind: 'interactive', cwd: '/work/app', startedAt: STARTED - 86_400_000 }
  });
  const asked: number[] = [];
  const read = openSessionsReader({
    isAlive: pid => pid !== 5,
    started: pid => {
      asked.push(pid);
      return Promise.resolve({ at: STARTED, ticks: pid === 1 ? TICKS : null });
    }
  });
  const open = await read(dir);
  assert.deepEqual(
    open.map(s => [s.sessionId, s.cwd, s.status]),
    [
      ['session-1', '/work/app', 'busy'],
      ['session-2', '/work/web', 'idle']
    ],
    'a run started by a program, one without a folder, one gone and one whose pid moved on are left out'
  );
  assert.deepEqual(asked.sort(), [1, 2, 6]);
  await read(dir);
  assert.deepEqual(asked.sort(), [1, 2, 6], 'each process is checked once');
  const failing = openSessionsReader({ isAlive: () => true, started: () => Promise.reject(new Error('timed out')) });
  await assert.rejects(failing(dir), /timed out/, 'not knowing is not "none open"');
  assert.deepEqual(await read(path.join(dir, 'missing')), [], 'no sessions folder');
});

test('only a process started to resume exactly that session counts', () => {
  const at = (command: string): SystemProcess => ({ pid: 1, at: 0, ticks: null, command });
  const find = (command: string) => resumingProcess([at(command)], 'abc-1');
  assert.ok(find('claude --resume abc-1'));
  assert.ok(find('claude -r "abc-1" --model opus'));
  assert.equal(find('claude --resume abc-10'), null);
  assert.equal(find('claude --resume xabc-1'), null);
  assert.equal(find('claude abc-1'), null, 'not resuming it');
  assert.equal(resumingProcess([at('claude --resume a.c')], 'a.c')?.pid, 1, 'ids are matched literally');
  assert.equal(resumingProcess([at('claude --resume abc')], 'a.c'), null);
});

test('the system’s answers are parsed as it prints them', () => {
  assert.deepEqual(parseWindowsStart(`${TICKS}\r\n`), { at: STARTED - 420, ticks: TICKS });
  assert.equal(parseWindowsStart(''), null);
  assert.deepEqual(parseWindowsProcesses(`12|${TICKS}|"C:\\bin\\claude.exe" --resume s-1 "a|b"\r\nnot a line\r\n`), [
    { pid: 12, at: STARTED - 420, ticks: TICKS, command: '"C:\\bin\\claude.exe" --resume s-1 "a|b"' }
  ]);
  assert.deepEqual(parsePsProcesses('  12 /usr/local/bin/claude --resume s-1\n 13 /bin/bash\n 14 claude\n'), [
    { pid: 12, command: '/usr/local/bin/claude --resume s-1' },
    { pid: 14, command: 'claude' }
  ]);
});

test('a process is the recorded one only on an exact start, or near it when no exact start was recorded', () => {
  assert.equal(isSameProcess(live(), { at: STARTED - 420, ticks: TICKS }), true);
  assert.equal(isSameProcess(live(), { at: STARTED, ticks: '134367451476774135' }), false, 'one tick off is another process');
  assert.equal(isSameProcess(live({ procStart: null }), { at: STARTED - 1500, ticks: TICKS }), true, 'near enough without procStart');
  assert.equal(isSameProcess(live({ procStart: null }), { at: STARTED - 2500, ticks: TICKS }), false);
  assert.equal(isSameProcess(live(), { at: STARTED - 420, ticks: null }), true, 'no system ticks to compare: near enough');
});

test('ending a process tells apart ended, gone, another process, and not knowing', async () => {
  const same = processes(() => Promise.resolve({ at: STARTED - 420, ticks: TICKS }));
  assert.equal(await endClaudeSession(live(), same), 'ended');
  assert.deepEqual(same.ended, [4242]);
  const reused = processes(() => Promise.resolve({ at: STARTED - 420, ticks: '1' }));
  assert.equal(await endClaudeSession(live(), reused), 'other');
  const gone = processes(() => Promise.resolve(null));
  assert.equal(await endClaudeSession(live(), gone), 'gone');
  const unknown = processes(() => Promise.reject(new Error('timed out')));
  assert.equal(await endClaudeSession(live(), unknown), 'unknown');
  assert.deepEqual([...reused.ended, ...gone.ended, ...unknown.ended], []);
});

test('the system reports when a process started, and that a pid is gone', async () => {
  const started = await processStarted(process.pid);
  assert.ok(started);
  assert.ok(Math.abs(started.at - (Date.now() - process.uptime() * 1000)) < 5000);
  if (process.platform === 'win32') assert.match(started.ticks ?? '', /^\d+$/);
  assert.equal(await processStarted(2 ** 30), null, 'no such process');
});

test('a process the system would not end, or that did not go, is not reported ended', async () => {
  const started = () => Promise.resolve({ at: STARTED - 420, ticks: TICKS });
  const refused: ProcessControl = {
    isAlive: () => true,
    started,
    end: () => {
      throw Object.assign(new Error('EPERM'), { code: 'EPERM' });
    }
  };
  assert.equal(await endClaudeSession(live(), refused), 'unknown', 'not permitted: still running');
  const lingering: ProcessControl = { isAlive: () => true, started, end: () => undefined };
  assert.equal(await endClaudeSession(live(), lingering), 'unknown', 'told to go, still there');
});
