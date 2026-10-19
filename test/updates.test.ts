import assert from 'node:assert/strict';
import test from 'node:test';
import { checkForUpdate, isNewer, isReleasePage, LATEST_RELEASE_URL } from '../src/core/updates.ts';

test('versions compare part by part; anything unparsable is never newer', () => {
  assert.equal(isNewer('v0.2.0', '0.1.9'), true);
  assert.equal(isNewer('0.10.0', '0.9.9'), true);
  assert.equal(isNewer('1.0.0', '1.0.0'), false);
  assert.equal(isNewer('0.1.0', '0.1.1'), false);
  assert.equal(isNewer('v1.0.0-beta', '0.1.0'), false);
  assert.equal(isNewer('latest', '0.1.0'), false);
});

test('a newer published release of this repository is reported; anything else is not', async () => {
  const release = (fields: object) => (url: string) => {
    assert.equal(url, LATEST_RELEASE_URL);
    return Promise.resolve({ tag_name: 'v0.3.0', html_url: 'https://github.com/mustafacagri/vibe-usage/releases/tag/v0.3.0', ...fields });
  };
  assert.deepEqual(await checkForUpdate('0.1.1', release({})), {
    version: '0.3.0',
    url: 'https://github.com/mustafacagri/vibe-usage/releases/tag/v0.3.0'
  });
  assert.equal(await checkForUpdate('0.3.0', release({})), null, 'already up to date');
  assert.equal(await checkForUpdate('0.1.1', release({ prerelease: true })), null);
  assert.equal(await checkForUpdate('0.1.1', release({ html_url: 'https://evil.example/releases/tag/v0.3.0' })), null);
  assert.equal(await checkForUpdate('0.1.1', () => Promise.resolve('not json')), null);
  assert.equal(isReleasePage('https://github.com/mustafacagri/vibe-usage/releases/tag/v1.0.0'), true);
  assert.equal(isReleasePage('https://github.com/someone/else/releases/tag/v1.0.0'), false);
});
