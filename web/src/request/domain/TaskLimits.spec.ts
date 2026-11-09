// R-001 R-004
import test from 'node:test';
import assert from 'node:assert/strict';
import { FIELD_MAX_LENGTH, NEW_TASK_FIELDS, isParsableInstant } from './TaskLimits.ts';

test('a field holds up to 10000 characters and a new task has the nine legacy fields in order', () => {
  assert.equal(FIELD_MAX_LENGTH, 10000);
  assert.deepEqual([...NEW_TASK_FIELDS], ['title', 'requester', 'department', 'channel', 'category', 'priority', 'requested_at', 'due_date', 'description']);
});

test('isParsableInstant follows Date.parse: ISO texts pass, words and the empty text do not', () => {
  assert.equal(isParsableInstant('2026-11-03T01:00:00Z'), true);
  assert.equal(isParsableInstant('2026-11-03'), true);
  assert.equal(isParsableInstant('Nov 3 2026'), true);
  assert.equal(isParsableInstant('not a date'), false);
  assert.equal(isParsableInstant(''), false);
});
