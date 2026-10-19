// The invented accounts shown in the README media: two Claude Code accounts, two Codex ones and
// two Antigravity ones (Cursor reads one sign-in). Claude's personal 5-hour window is nearly
// spent, so Smart Launch recommends Codex; times are relative to `now`.
import type { Language } from '../../src/shared/i18n/index.ts';
import type { ModelCatalog, SessionSummary, SmartLaunchPreview } from '../../src/shared/ipc.ts';
import type { Account, MeasuredAccount, QuotaWindow, Settings, Snapshot } from '../../src/shared/types.ts';
import { DURATION_MS, PROVIDER_IDS } from '../../src/shared/catalog.ts';

const { MINUTE, HOUR, DAY } = DURATION_MS;

const ACCOUNTS: Account[] = [
  { id: 'claude:default', providerId: 'claude', label: 'Personal', configDir: '/Users/you/.claude', primary: true, enabled: true },
  { id: 'claude:work', providerId: 'claude', label: 'Work', configDir: '/Users/you/.claude-work', primary: false, enabled: true },
  { id: 'codex:default', providerId: 'codex', label: 'Personal', configDir: '/Users/you/.codex', primary: true, enabled: true },
  { id: 'codex:work', providerId: 'codex', label: 'Work', configDir: '/Users/you/.codex-work', primary: false, enabled: true },
  { id: 'cursor:default', providerId: 'cursor', labelKey: 'defaultAccount', primary: true, enabled: true },
  { id: 'antigravity:you', providerId: 'antigravity', label: 'you@example.com', email: 'you@example.com', primary: true, enabled: true },
  {
    id: 'antigravity:work',
    providerId: 'antigravity',
    label: 'you@work.example',
    email: 'you@work.example',
    primary: false,
    enabled: true
  }
];

export const PROJECT_DIR = '/Users/you/projects/acme-app';
export const MODELS: ModelCatalog = { claude: ['opus', 'sonnet'], codex: ['gpt-6-luna'], cursor: ['auto'], antigravity: [] };
export const SMART_LAUNCH: SmartLaunchPreview = {
  providerId: 'codex',
  verified: true,
  isFallback: false,
  headroomPercent: 58,
  model: 'gpt-6-luna'
};

// `view` changes how the window shows them (accounts side by side, the compact view).
export function snapshot(
  language: Language,
  now = Date.now(),
  view: Partial<Pick<Settings, 'compareAccounts' | 'compact'>> = {}
): Snapshot {
  const fetchedAt = new Date(now - 40 * 1000).toISOString();
  const fiveHours = { labelKey: 'labelNHours', labelParams: { n: 5 } } as const;
  const weekly = { labelKey: 'labelWeekly' } as const;
  const window = (id: string, remainingPercent: number, resetsIn: number, extra: Partial<QuotaWindow> = {}): QuotaWindow => ({
    id,
    usedPercent: 100 - remainingPercent,
    remainingPercent,
    resetsAt: new Date(now + resetsIn).toISOString(),
    ...extra
  });
  const measured = (id: string, plan: string | undefined, windows: QuotaWindow[]): MeasuredAccount => {
    const account = ACCOUNTS.find(a => a.id === id);
    if (!account) throw new Error(`unknown demo account ${id}`);
    return { ...account, status: 'ok', fetchedAt, windows, ...(plan && { plan }) };
  };
  return {
    refreshing: false,
    settings: {
      schemaVersion: 1,
      language,
      intervalSeconds: 120,
      pinned: false,
      notifications: true,
      compareAccounts: view.compareAccounts ?? false,
      autoContinue: 'off',
      returnToPrimary: 'ask',
      reopenAfterRestart: 'ask',
      compact: view.compact ?? false,
      checkUpdates: true,
      projectPreferences: [],
      lowQuotaPercent: 20,
      providerOrder: [...PROVIDER_IDS],
      preferredModels: {},
      dismissedAccountIds: [],
      accounts: ACCOUNTS
    },
    providers: [
      {
        id: 'claude',
        status: 'ok',
        fetchedAt,
        accounts: [
          measured('claude:default', 'max', [
            window('five_hour', 4, 1 * HOUR + 48 * MINUTE, fiveHours),
            window('seven_day', 46, 2.6 * DAY, weekly)
          ]),
          measured('claude:work', 'team', [
            window('five_hour', 81, 3 * HOUR + 5 * MINUTE, fiveHours),
            window('seven_day', 73, 5.2 * DAY, weekly)
          ])
        ]
      },
      {
        id: 'codex',
        status: 'ok',
        fetchedAt,
        accounts: [
          measured('codex:default', 'plus', [
            window('codex:primary', 72, 2 * HOUR + 14 * MINUTE, fiveHours),
            window('codex:secondary', 58, 4.4 * DAY, weekly)
          ]),
          measured('codex:work', 'pro', [
            window('codex:primary', 37, 41 * MINUTE, fiveHours),
            window('codex:secondary', 66, 2.1 * DAY, weekly)
          ])
        ]
      },
      {
        id: 'cursor',
        status: 'ok',
        fetchedAt,
        accounts: [
          measured('cursor:default', 'pro', [
            window('plan:auto', 64, 18.3 * DAY, { labelKey: 'labelAutoScope' }),
            window('plan:api', 91, 18.3 * DAY, { labelKey: 'labelApiScope' }),
            {
              id: 'plan:spend',
              usedPercent: null,
              remainingPercent: null,
              resetsAt: null,
              labelKey: 'labelIncludedSpend',
              section: 'details',
              amounts: { used: 820, limit: 2000, remaining: 1180 }
            }
          ])
        ]
      },
      {
        id: 'antigravity',
        status: 'ok',
        fetchedAt,
        accounts: [
          measured('antigravity:you', undefined, [
            window('gemini:5h', 95, 3 * HOUR + 30 * MINUTE, { ...fiveHours, scope: 'Gemini Models' }),
            window('gemini:weekly', 88, 5.1 * DAY, { ...weekly, scope: 'Gemini Models' }),
            window('partner:5h', 70, 1 * HOUR + 12 * MINUTE, { ...fiveHours, scope: 'Claude and GPT models' })
          ]),
          measured('antigravity:work', undefined, [
            window('gemini:5h', 54, 2 * HOUR + 5 * MINUTE, { ...fiveHours, scope: 'Gemini Models' }),
            window('gemini:weekly', 79, 3.4 * DAY, { ...weekly, scope: 'Gemini Models' }),
            window('partner:5h', 18, 48 * MINUTE, { ...fiveHours, scope: 'Claude and GPT models' })
          ])
        ]
      }
    ]
  };
}

export function sessions(now = Date.now()): SessionSummary[] {
  return [
    {
      id: 'csv-export',
      providerId: 'claude',
      title: 'Add CSV export to reports',
      updatedAt: now - 25 * MINUTE,
      turnCount: 38,
      model: 'claude-opus-5-5',
      sizeBytes: 4_100_000
    },
    {
      id: 'flaky-login',
      providerId: 'codex',
      title: 'Fix flaky login test',
      updatedAt: now - 3 * HOUR,
      turnCount: 12,
      model: 'gpt-6-luna',
      sizeBytes: 900_000
    }
  ];
}
