// Writes test/fixtures/replay/overnight-2026-10-18: the night of 2026-10-17/18 as the app's
// records and the transcripts tell it, with synthetic ids, names and texts. Four sessions
// stopped on Main at its limit and moved to Spare, spent Spare's window too, and should have gone
// back to Main when its window reset at 03:00; the real run brought none back. expected.json
// is written from the rules, and the moments where the real run differed say so in their note.
//
//   node test/replay/timelines/overnight-2026-10-18.ts
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '..', '..', 'fixtures', 'replay', 'overnight-2026-10-18');
fs.rmSync(OUT, { recursive: true, force: true });

type Json = Record<string, unknown>;
type Key = 'widget' | 'worktree' | 'app' | 'skills';
type Profile = '.claude' | '.claude-secondary';
interface Session {
  id: string;
  project: string;
  cwd: string;
  pid: number;
  pidSpare: number;
  pidBack: number;
}

const MAIN = {
  id: 'claude:main',
  providerId: 'claude',
  label: 'Main',
  configDir: '<home>/.claude',
  configDirExplicit: false,
  primary: true,
  enabled: true
};
const SPARE = {
  id: 'claude:spare',
  providerId: 'claude',
  label: 'Spare',
  configDir: '<home>/.claude-secondary',
  configDirExplicit: true,
  primary: false,
  enabled: true
};

// The four sessions that stopped on Main that night, in the order they stopped.
const KEYS: readonly Key[] = ['widget', 'worktree', 'app', 'skills'];
const S: Record<Key, Session> = {
  widget: {
    id: '9f6a0000-0000-4000-8000-000000000001',
    project: 'C--work-widget',
    cwd: 'C:\\work\\widget',
    pid: 4101,
    pidSpare: 5201,
    pidBack: 6301
  },
  worktree: {
    id: '1aae0000-0000-4000-8000-000000000002',
    project: 'C--work-app--claude-worktrees-task',
    cwd: 'C:\\work\\app\\.claude\\worktrees\\task',
    pid: 4102,
    pidSpare: 5202,
    pidBack: 6302
  },
  app: {
    id: 'e3d50000-0000-4000-8000-000000000003',
    project: 'C--work-app',
    cwd: 'C:\\work\\app',
    pid: 4103,
    pidSpare: 5203,
    pidBack: 6303
  },
  skills: {
    id: '2cb40000-0000-4000-8000-000000000004',
    project: 'C--work-skills',
    cwd: 'C:\\work\\skills',
    pid: 4104,
    pidSpare: 5204,
    pidBack: 6304
  }
};
// When each stopped on Main (the transcripts' own times), and when the app moved it.
const STOPS: Record<Key, string> = {
  widget: '2026-10-18T00:25:30.683Z',
  worktree: '2026-10-18T00:34:19.875Z',
  app: '2026-10-18T00:40:51.506Z',
  skills: '2026-10-18T00:45:39.805Z'
};
const MOVES: Record<Key, string> = {
  widget: '2026-10-18T00:27:05.000Z',
  worktree: '2026-10-18T00:34:55.000Z',
  app: '2026-10-18T00:41:03.000Z',
  skills: '2026-10-18T00:45:44.000Z'
};
// On Spare they ran until its five-hour window was spent at 01:12.
const SPARE_STOP = '2026-10-18T01:12:20.000Z';
const MAIN_RESET = '2026-10-18T03:00:00.000Z';
const SPARE_RESET = '2026-10-18T05:00:00.000Z';
const MAIN_START = '2026-10-17T20:00:00.000Z';

const ms = (iso: string): number => Date.parse(iso);
const plus = (iso: string, seconds: number): string => new Date(ms(iso) + seconds * 1000).toISOString();

const base = (s: Session, timestamp: string): Json => ({
  isSidechain: false,
  entrypoint: 'cli',
  cwd: s.cwd,
  sessionId: s.id,
  version: '2.1.302',
  timestamp
});
const user = (s: Session, timestamp: string): Json => ({
  ...base(s, timestamp),
  type: 'user',
  permissionMode: 'auto',
  message: { role: 'user', content: '[text]' }
});
const reply = (s: Session, timestamp: string): Json => ({
  ...base(s, timestamp),
  type: 'assistant',
  message: { role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{ type: 'text', text: '[text]' }] }
});
// The stop at the limit, as Claude Code 2.1.302 writes it: the synthetic error, then its own
// word that it holds the session for the reset, then the turn's duration.
const limit = (s: Session, timestamp: string, resets: string): Json[] => [
  {
    ...base(s, timestamp),
    type: 'assistant',
    isApiErrorMessage: true,
    error: 'rate_limit',
    apiError: 'usage_limit_reached',
    message: {
      role: 'assistant',
      model: '<synthetic>',
      content: [{ type: 'text', text: `You've hit your session limit · resets ${resets} (UTC)` }]
    }
  },
  {
    ...base(s, plus(timestamp, 0.004)),
    type: 'system',
    subtype: 'informational',
    isMeta: false,
    level: 'notice',
    content: `Usage limit reached · continuing automatically at ${resets} · esc to cancel`
  },
  { ...base(s, plus(timestamp, 0.015)), type: 'system', subtype: 'turn_duration', isMeta: false, durationMs: 120000, messageCount: 400 }
];

// What each transcript held at each stage.
const working = (s: Session, at: string): Json[] => [user(s, plus(at, -600)), reply(s, plus(at, -300)), user(s, plus(at, -120))];
const stoppedOnMain = (key: Key): Json[] => {
  const s = S[key];
  return [
    user(s, plus(STOPS[key], -400)),
    reply(s, plus(STOPS[key], -200)),
    user(s, plus(STOPS[key], -60)),
    ...limit(s, STOPS[key], '6am')
  ];
};
// The copy Spare resumed: the stop, the prompt to go on, work, then Spare's own limit.
const resumedOnSpare = (key: Key, upTo: string): Json[] => {
  const s = S[key];
  const records = [...stoppedOnMain(key), user(s, plus(MOVES[key], 6)), reply(s, plus(MOVES[key], 90))];
  if (ms(upTo) >= ms(SPARE_STOP)) records.push(user(s, plus(SPARE_STOP, -200)), ...limit(s, SPARE_STOP, '8am'));
  else records.push(user(s, plus(upTo, -30)));
  // While Claude Code holds the widget session, a background task's notice is queued and taken:
  // a user record with no reply, as the real transcript shows. The session is still cut off.
  if (key === 'widget' && ms(upTo) >= ms(SPARE_STOP)) {
    const notice =
      '<task-notification>\n<task-id>b1a2c3d4e</task-id>\n<status>completed</status>\n<summary>[summary]</summary>\n</task-notification>';
    records.push(
      { type: 'queue-operation', operation: 'enqueue', timestamp: plus(SPARE_STOP, 25), sessionId: s.id, content: notice },
      { type: 'queue-operation', operation: 'dequeue', timestamp: plus(SPARE_STOP, 25.01), sessionId: s.id },
      { ...user(s, plus(SPARE_STOP, 25.02)), message: { role: 'user', content: notice } }
    );
  }
  return records;
};
const backOnMain = (key: Key, at: string): Json[] => [
  ...resumedOnSpare(key, SPARE_STOP),
  user(S[key], plus(at, 5)),
  reply(S[key], plus(at, 60))
];

const registry = (s: Session, pid: number, startedAt: string, status: 'busy' | 'idle', updatedAt: string): Json => ({
  pid,
  sessionId: s.id,
  cwd: s.cwd,
  startedAt: ms(startedAt),
  version: '2.1.302',
  kind: 'interactive',
  entrypoint: 'cli',
  pidDomain: 'win32:developer',
  status,
  updatedAt: ms(updatedAt),
  statusUpdatedAt: ms(updatedAt)
});

const windows = {
  main: (used: number, resetsAt: string): Json[] => [
    {
      id: 'five_hour',
      usedPercent: used,
      remainingPercent: 100 - used,
      resetsAt,
      labelKey: 'labelNHours',
      labelParams: { n: 5 },
      durationMinutes: 300,
      active: true
    },
    // A team plan: no weekly limit, only a model-scoped weekly row the server reports inactive.
    {
      id: 'limit:weekly_scoped:6489664b94f0',
      usedPercent: 0,
      remainingPercent: 100,
      resetsAt: '2026-10-25T12:59:59.000Z',
      labelKey: 'labelWeekly',
      durationMinutes: 10080,
      scope: 'Fable',
      active: false
    }
  ],
  spare: (used: number, resetsAt: string, weekly: number): Json[] => [
    {
      id: 'five_hour',
      usedPercent: used,
      remainingPercent: 100 - used,
      resetsAt,
      labelKey: 'labelNHours',
      labelParams: { n: 5 },
      durationMinutes: 300,
      active: used >= weekly
    },
    {
      id: 'seven_day',
      usedPercent: weekly,
      remainingPercent: 100 - weekly,
      resetsAt: '2026-10-18T13:59:59.000Z',
      labelKey: 'labelWeekly',
      durationMinutes: 10080,
      active: weekly > used
    }
  ]
};

const snapshot = (main: Json[], spare: Json[]): Json => ({
  settings: { autoContinue: 'accounts', returnToPrimary: 'auto', lowQuotaPercent: 20, accounts: [MAIN, SPARE] },
  providers: [
    {
      id: 'claude',
      status: 'ok',
      accounts: [
        { ...MAIN, status: 'ok', fetchedAt: '<clock>', plan: 'team', windows: main },
        { ...SPARE, status: 'ok', fetchedAt: '<clock>', plan: 'pro', windows: spare }
      ]
    }
  ]
});

interface Moment {
  snapshot: Json;
  transcripts: Partial<Record<Profile, Partial<Record<Key, Json[]>>>>;
  registries: Partial<Record<Profile, Json[]>>;
  alive: number[];
  expected: Json;
}

const lastTimestamp = (records: Json[]): string => {
  for (const record of [...records].reverse()) if (typeof record.timestamp === 'string') return record.timestamp;
  throw new Error('a transcript without a timestamp');
};

function moment(name: string, clock: string, { snapshot: snap, transcripts, registries, alive, expected }: Moment): void {
  const dir = path.join(OUT, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'clock.txt'), `${clock}\n`);
  fs.writeFileSync(path.join(dir, 'snapshot.json'), `${JSON.stringify(snap, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'processes.json'), `${JSON.stringify({ alive, system: [] })}\n`);
  const mtimes: Record<string, string> = {};
  for (const [profile, sessions] of Object.entries(transcripts))
    for (const [key, records] of Object.entries(sessions) as [Key, Json[]][]) {
      const s = S[key];
      const file = path.join(dir, 'transcripts', profile, s.project, `${s.id}.tail.jsonl`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, `${records.map(r => JSON.stringify(r)).join('\n')}\n`);
      mtimes[`${profile}/${s.project}/${s.id}`] = lastTimestamp(records);
    }
  fs.writeFileSync(path.join(dir, 'mtimes.json'), `${JSON.stringify(mtimes, null, 2)}\n`);
  for (const [profile, entries] of Object.entries(registries))
    for (const entry of entries) {
      const file = path.join(dir, 'sessions', profile, `${String(entry.pid)}.json`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, `${JSON.stringify(entry, null, 2)}\n`);
    }
  fs.writeFileSync(path.join(dir, 'expected.json'), `${JSON.stringify(expected, null, 2)}\n`);
}

const start = (key: Key, from: string, to: string, prompt: 'resume' | 'none'): Json => ({ sessionId: S[key].id, from, to, prompt });
const all = (make: (key: Key) => Json[]): Record<Key, Json[]> => ({
  widget: make('widget'),
  worktree: make('worktree'),
  app: make('app'),
  skills: make('skills')
});

// 00:27 — Main's five hours are spent (reset at 03:00); the widget session stopped at 00:25 and
// Claude Code holds it for the reset. Spare has room. The other three still work on Main.
{
  const clock = '2026-10-18T00:27:00.000Z';
  moment('01-widget-stops', clock, {
    snapshot: snapshot(windows.main(100, MAIN_RESET), windows.spare(13, SPARE_RESET, 67)),
    transcripts: {
      '.claude': {
        widget: stoppedOnMain('widget'),
        worktree: working(S.worktree, clock),
        app: working(S.app, clock),
        skills: working(S.skills, clock)
      }
    },
    registries: {
      '.claude': [
        registry(S.widget, S.widget.pid, MAIN_START, 'idle', STOPS.widget),
        registry(S.worktree, S.worktree.pid, MAIN_START, 'busy', clock),
        registry(S.app, S.app.pid, MAIN_START, 'busy', clock),
        registry(S.skills, S.skills.pid, MAIN_START, 'busy', clock)
      ]
    },
    alive: [S.widget.pid, S.worktree.pid, S.app.pid, S.skills.pid],
    expected: {
      note: 'Main stopped the widget session at its limit while the other three still work; Spare has room and continuation is on for accounts: the stopped one moves to Spare and is told to go on, the busy ones stay (as the real run did).',
      starts: [start('widget', 'claude:main', 'claude:spare', 'resume')],
      notices: ['continued'],
      cards: []
    }
  });
}

// 00:35 — the worktree session stopped at 00:34. The widget session goes on in Spare.
{
  const clock = '2026-10-18T00:35:00.000Z';
  moment('02-worktree-stops', clock, {
    snapshot: snapshot(windows.main(100, MAIN_RESET), windows.spare(19, SPARE_RESET, 68)),
    transcripts: {
      '.claude': {
        widget: stoppedOnMain('widget'),
        worktree: stoppedOnMain('worktree'),
        app: working(S.app, clock),
        skills: working(S.skills, clock)
      },
      '.claude-secondary': { widget: resumedOnSpare('widget', clock) }
    },
    registries: {
      '.claude': [
        registry(S.worktree, S.worktree.pid, MAIN_START, 'idle', STOPS.worktree),
        registry(S.app, S.app.pid, MAIN_START, 'busy', clock),
        registry(S.skills, S.skills.pid, MAIN_START, 'busy', clock)
      ],
      '.claude-secondary': [registry(S.widget, S.widget.pidSpare, MOVES.widget, 'busy', clock)]
    },
    alive: [S.widget.pidSpare, S.worktree.pid, S.app.pid, S.skills.pid],
    expected: {
      note: 'The worktree session stopped next and moves the same way; the widget session, already on Spare and busy, is left alone.',
      starts: [start('worktree', 'claude:main', 'claude:spare', 'resume')],
      notices: ['continued'],
      cards: []
    }
  });
}

// 00:41:30 — the app session stopped at 00:40.
{
  const clock = '2026-10-18T00:41:30.000Z';
  moment('03-app-stops', clock, {
    snapshot: snapshot(windows.main(100, MAIN_RESET), windows.spare(36, SPARE_RESET, 70)),
    transcripts: {
      '.claude': {
        widget: stoppedOnMain('widget'),
        worktree: stoppedOnMain('worktree'),
        app: stoppedOnMain('app'),
        skills: working(S.skills, clock)
      },
      '.claude-secondary': { widget: resumedOnSpare('widget', clock), worktree: resumedOnSpare('worktree', clock) }
    },
    registries: {
      '.claude': [registry(S.app, S.app.pid, MAIN_START, 'idle', STOPS.app), registry(S.skills, S.skills.pid, MAIN_START, 'busy', clock)],
      '.claude-secondary': [
        registry(S.widget, S.widget.pidSpare, MOVES.widget, 'busy', clock),
        registry(S.worktree, S.worktree.pidSpare, MOVES.worktree, 'busy', clock)
      ]
    },
    alive: [S.widget.pidSpare, S.worktree.pidSpare, S.app.pid, S.skills.pid],
    expected: {
      note: 'The app session stopped and moves.',
      starts: [start('app', 'claude:main', 'claude:spare', 'resume')],
      notices: ['continued'],
      cards: []
    }
  });
}

// 00:46 — the skills session stopped at 00:45. All four are now on Spare.
{
  const clock = '2026-10-18T00:46:00.000Z';
  moment('04-skills-stops', clock, {
    snapshot: snapshot(windows.main(100, MAIN_RESET), windows.spare(56, SPARE_RESET, 73)),
    transcripts: {
      '.claude': all(stoppedOnMain),
      '.claude-secondary': {
        widget: resumedOnSpare('widget', clock),
        worktree: resumedOnSpare('worktree', clock),
        app: resumedOnSpare('app', clock)
      }
    },
    registries: {
      '.claude': [registry(S.skills, S.skills.pid, MAIN_START, 'idle', STOPS.skills)],
      '.claude-secondary': [
        registry(S.widget, S.widget.pidSpare, MOVES.widget, 'busy', clock),
        registry(S.worktree, S.worktree.pidSpare, MOVES.worktree, 'busy', clock),
        registry(S.app, S.app.pidSpare, MOVES.app, 'busy', clock)
      ]
    },
    alive: [S.widget.pidSpare, S.worktree.pidSpare, S.app.pidSpare, S.skills.pid],
    expected: {
      note: 'The skills session stopped and moves: all four work on Spare now.',
      starts: [start('skills', 'claude:main', 'claude:spare', 'resume')],
      notices: ['continued'],
      cards: []
    }
  });
}

// 01:15 — Spare's five hours are spent too (reset at 05:00); the four stopped there at 01:12 and
// Claude Code holds them. Main is still spent until 03:00: nobody can take them.
const allStoppedOnSpare = (): Record<Key, Json[]> => all(key => resumedOnSpare(key, SPARE_STOP));
const spareRegistries = (status: 'busy' | 'idle'): Json[] =>
  KEYS.map(key => registry(S[key], S[key].pidSpare, MOVES[key], status, SPARE_STOP));
{
  const clock = '2026-10-18T01:15:00.000Z';
  moment('05-spare-stops', clock, {
    snapshot: snapshot(windows.main(100, MAIN_RESET), windows.spare(100, SPARE_RESET, 80)),
    transcripts: { '.claude': all(stoppedOnMain), '.claude-secondary': allStoppedOnSpare() },
    registries: { '.claude-secondary': spareRegistries('idle') },
    alive: KEYS.map(key => S[key].pidSpare),
    expected: {
      note: 'All four stopped on Spare at its limit; Main has no room until 03:00 and there is no other account: each is stranded, told once, with no card (no target has quota). The real run saw none of this: the moved sessions had been started with Claude Code’s child-session marker and saved nothing (fixed in e6d1ef6).',
      starts: [],
      notices: ['stranded', 'stranded', 'stranded', 'stranded'],
      cards: []
    }
  });
}

// 03:05 — Main's window reset at 03:00. The four copies on Spare have been cut off and quiet since
// 01:12, their processes idle: they go back to Main and are told to go on.
{
  const clock = '2026-10-18T03:05:00.000Z';
  moment('06-main-resets', clock, {
    snapshot: snapshot(windows.main(0, '2026-10-18T08:00:00.000Z'), windows.spare(100, SPARE_RESET, 80)),
    transcripts: { '.claude': all(stoppedOnMain), '.claude-secondary': allStoppedOnSpare() },
    registries: { '.claude-secondary': spareRegistries('idle') },
    alive: KEYS.map(key => S[key].pidSpare),
    expected: {
      note: 'Main has room again and returns are automatic; each copy on Spare was cut off there and has been quiet for two hours, so each goes back to Main with the prompt to go on — the widget one too, whose held process took a queued notice (a user record, no reply) after its stop. The real run returned nothing: Main’s team plan reports no weekly limit (seven_day: null), which was read as an unknown quota (fixed in 429f70b), and the copies on Spare were unsaved.',
      starts: KEYS.map(key => start(key, 'claude:spare', 'claude:main', 'resume')),
      notices: ['returned', 'returned', 'returned', 'returned'],
      cards: []
    }
  });
}

// 03:10 — back on Main, all four were picked up and work; the Spare processes are gone.
{
  const clock = '2026-10-18T03:10:00.000Z';
  const back = '2026-10-18T03:05:10.000Z';
  moment('07-back-on-main', clock, {
    snapshot: snapshot(windows.main(6, '2026-10-18T08:00:00.000Z'), windows.spare(100, SPARE_RESET, 80)),
    transcripts: { '.claude': all(key => backOnMain(key, back)), '.claude-secondary': allStoppedOnSpare() },
    registries: { '.claude': KEYS.map(key => registry(S[key], S[key].pidBack, back, 'busy', clock)) },
    alive: KEYS.map(key => S[key].pidBack),
    expected: {
      note: 'Picked up on Main and working again: nothing more to do, and nothing is moved twice.',
      starts: [],
      notices: [],
      cards: []
    }
  });
}

console.log(`written: ${OUT}`);
