import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { claudeBackgroundTasks } from '../src/core/sessions.ts';
import { tempDir } from './helpers/fixtures.ts';

const line = (record: object) => `${JSON.stringify(record)}\n`;
const call = (id: string, input: object) =>
  line({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name: 'Bash', input }] } });
const result = (useId: string, taskId: string, at: string) =>
  line({
    type: 'user',
    timestamp: at,
    toolUseResult: { backgroundTaskId: taskId },
    message: {
      content: [
        {
          type: 'tool_result',
          tool_use_id: useId,
          content: `Command running in background with ID: ${taskId}. Output is being written to: C:\\tmp\\tasks\\${taskId}.output. You will be notified.`
        }
      ]
    }
  });
const stop = (name: string, input: object) =>
  line({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'x', name, input }] } });
const notified = (taskId: string) =>
  line({
    type: 'attachment',
    attachment: { type: 'queued_command', prompt: `<task-notification>\n<task-id>${taskId}</task-id>\n</task-notification>` }
  });

test('background commands are followed as the transcript grows, across reads', async t => {
  const file = path.join(await tempDir(t, 'vibe-tasks-'), 'session.jsonl');
  await fs.writeFile(
    file,
    line({ type: 'user', message: { content: 'go' } }) + call('use-1', { command: 'npm test', run_in_background: true })
  );
  assert.deepEqual(await claudeBackgroundTasks(file), [], 'called, not yet started');
  // The result lands in a later read than its call; half a line is not read yet.
  const half = result('use-1', 'b1', '2026-10-17T12:00:00.000Z');
  await fs.appendFile(file, half.slice(0, 40));
  assert.deepEqual(await claudeBackgroundTasks(file), []);
  await fs.appendFile(file, half.slice(40) + call('use-2', { description: 'Build it', command: 'npm run build', run_in_background: true }));
  await fs.appendFile(file, result('use-2', 'b2', '2026-10-17T12:01:00.000Z') + call('use-3', { command: 'ls' }));
  assert.deepEqual(await claudeBackgroundTasks(file), [
    { id: 'b1', command: 'npm test', outputFile: 'C:\\tmp\\tasks\\b1.output', startedAt: Date.parse('2026-10-17T12:00:00.000Z') },
    { id: 'b2', command: 'Build it', outputFile: 'C:\\tmp\\tasks\\b2.output', startedAt: Date.parse('2026-10-17T12:01:00.000Z') }
  ]);
  await fs.appendFile(file, notified('b1'));
  assert.deepEqual(
    (await claudeBackgroundTasks(file)).map(task => task.id),
    ['b2'],
    'notified as finished'
  );
  await fs.appendFile(file, stop('TaskStop', { task_id: 'b2' }));
  assert.deepEqual(await claudeBackgroundTasks(file), [], 'stopped with TaskStop');
});

test('a command Claude Code moved to the background when it ran past its time is followed with its text', async t => {
  const file = path.join(await tempDir(t, 'vibe-tasks-moved-'), 'session.jsonl');
  // Many commands answered in the foreground before it; their texts are let go, the newest kept.
  const earlier = Array.from({ length: 80 }, (_, i) => call(`use-${i}`, { command: `echo ${i}`, timeout: 1000 })).join('');
  await fs.writeFile(file, earlier + call('use-slow', { description: 'Full build', command: 'npm run build', timeout: 300_000 }));
  assert.deepEqual(await claudeBackgroundTasks(file), [], 'in the foreground so far');
  await fs.appendFile(
    file,
    line({
      type: 'user',
      timestamp: '2026-10-17T12:05:00.000Z',
      toolUseResult: { backgroundTaskId: 'b9', timedOutAfterMs: 300_000 },
      message: {
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'use-slow',
            content:
              'Command did not complete within its 300s timeout and was moved to the background (ID: b9). Output is being written to: C:\\tmp\\tasks\\b9.output. You will be notified when it completes.'
          }
        ]
      }
    })
  );
  assert.deepEqual(await claudeBackgroundTasks(file), [
    { id: 'b9', command: 'Full build', outputFile: 'C:\\tmp\\tasks\\b9.output', startedAt: Date.parse('2026-10-17T12:05:00.000Z') }
  ]);
});

test('KillShell ends a command too, and a transcript that shrank or was replaced is read again', async t => {
  const dir = await tempDir(t, 'vibe-tasks-again-');
  const file = path.join(dir, 'session.jsonl');
  const started = call('use-1', { command: 'npm start', run_in_background: true }) + result('use-1', 'b1', '2026-10-17T12:00:00.000Z');
  await fs.writeFile(file, started + stop('KillShell', { shell_id: 'b1' }));
  assert.deepEqual(await claudeBackgroundTasks(file), []);
  await fs.writeFile(file, started);
  assert.deepEqual(
    (await claudeBackgroundTasks(file)).map(task => task.id),
    ['b1'],
    'shrank: read from the start'
  );
  const other = path.join(dir, 'other.jsonl');
  await fs.writeFile(other, started + started + started);
  await fs.rm(file);
  await fs.rename(other, file);
  assert.deepEqual(
    (await claudeBackgroundTasks(file)).map(task => task.id),
    ['b1'],
    'replaced by a longer file: read from the start'
  );
  await assert.rejects(claudeBackgroundTasks(path.join(dir, 'missing.jsonl')));
});
