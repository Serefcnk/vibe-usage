import type { WindowInput } from '../core/model.ts';
import type { ProviderId } from '../shared/catalog.ts';
import type { Account, QuotaWindow } from '../shared/types.ts';

export interface FetchResult {
  windows: WindowInput[];
  plan?: string;
  // The e-mail the account is signed in with, as the tool recorded it on this device.
  signedInAs?: string;
  // The source answered and reports no limits for the account.
  status?: 'no_limits_reported';
}

// What a response parser returns: windows already normalized.
export interface ParsedQuota extends FetchResult {
  windows: QuotaWindow[];
}

export type DiscoveredAccount = Omit<Account, 'origin'>;

// One quota source. `discover` lists the accounts present on this device; `fetch` reads one
// account's quota and throws a ProviderError when it cannot.
export interface ProviderAdapter {
  readonly id: ProviderId;
  // The longest one read may take, from the adapter's own time limits; the service waits that
  // long before it gives the read up. Without it, the service's default.
  readonly fetchTimeoutMs?: number;
  discover(): Promise<DiscoveredAccount[]>;
  fetch(account: Account): Promise<FetchResult>;
}
