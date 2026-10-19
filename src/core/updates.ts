// Whether a newer release is out: the latest GitHub release of the app's repository against
// the running version. Nothing is downloaded; the user opens the release page.
import { APP_REPOSITORY } from '../shared/catalog.ts';
import type { UpdateInfo } from '../shared/types.ts';
import { isObject } from './files.ts';

export const LATEST_RELEASE_URL = `https://api.github.com/repos/${APP_REPOSITORY}/releases/latest`;
const RELEASE_PAGE = `https://github.com/${APP_REPOSITORY}/releases/`;
const VERSION = /^v?(\d+)\.(\d+)\.(\d+)$/;

const parts = (version: string): number[] | null => VERSION.exec(version)?.slice(1).map(Number) ?? null;

// Whether `candidate` is a later x.y.z than `current`; false for anything unparsable.
export function isNewer(candidate: string, current: string): boolean {
  const next = parts(candidate);
  const now = parts(current);
  if (!next || !now) return false;
  const index = next.findIndex((n, i) => n !== now[i]);
  return index !== -1 && (next[index] ?? 0) > (now[index] ?? 0);
}

// The release to tell about, or null when there is none newer. The page must belong to the
// app's repository: the link is opened in the user's browser.
export async function checkForUpdate(currentVersion: string, fetchJson: (url: string) => Promise<unknown>): Promise<UpdateInfo | null> {
  const release = await fetchJson(LATEST_RELEASE_URL);
  if (!isObject(release) || release.draft === true || release.prerelease === true) return null;
  const { tag_name: tag, html_url: url } = release;
  if (typeof tag !== 'string' || !isReleasePage(url)) return null;
  return isNewer(tag, currentVersion) ? { version: tag.replace(/^v/, ''), url } : null;
}

export const isReleasePage = (url: unknown): url is string => typeof url === 'string' && url.startsWith(RELEASE_PAGE);
