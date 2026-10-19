import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { comparable, replay } from './replay/harness.ts';

const TIMELINES = path.join(import.meta.dirname, 'fixtures', 'replay');

// Every timeline in the corpus replays as the rules say it should.
for (const timeline of fs.readdirSync(TIMELINES).sort())
  test(`replay: ${timeline}`, async () => {
    for (const { result, expected } of await replay(path.join(TIMELINES, timeline))) {
      const { actual, wanted } = comparable(result, expected);
      assert.deepEqual(actual, wanted, `${timeline}/${result.moment}${expected.note ? `: ${expected.note}` : ''}`);
    }
  });
