// R-031 R-026 R-027
import test from 'node:test';
import assert from 'node:assert/strict';
import { EDITABLE_FIELDS, REASON_MAX_LENGTH, isReasonText, isRevision } from './TaskEdit.ts';
import { LIFECYCLE_ACTIONS, isLifecycleAction } from './TaskLifecycle.ts';

test('an edit touches the nine legacy fields in order and a reason holds up to 1000 characters', () => {
  assert.deepEqual([...EDITABLE_FIELDS], ['title', 'requester', 'department', 'channel', 'category', 'priority', 'requested_at', 'due_date', 'description']);
  assert.equal(REASON_MAX_LENGTH, 1000);
});

test('isReasonText accepts 1..1000 characters and refuses empty and 1001', () => {
  for (const [text, expected] of [['', false], ['a', true], ['a'.repeat(999), true], ['a'.repeat(1000), true], ['a'.repeat(1001), false]] as const) {
    assert.equal(isReasonText(text), expected, `length ${text.length}`);
  }
});

test('isRevision accepts non-negative integers only, not -1, 1.5, texts, null or undefined', () => {
  for (const [value, expected] of [[0, true], [1, true], [1000000, true], [-1, false], [1.5, false], ['0', false], [null, false], [undefined, false], [NaN, false], [Infinity, false], [true, false], [[0], false]] as const) {
    assert.equal(isRevision(value), expected, JSON.stringify(value) ?? 'undefined');
  }
});

test('the lifecycle actions are delete, restore and purge and nothing else passes', () => {
  assert.deepEqual([...LIFECYCLE_ACTIONS], ['delete', 'restore', 'purge']);
  for (const [value, expected] of [['delete', true], ['restore', true], ['purge', true], ['status', false], ['Delete', false], ['', false], [null, false], [1, false]] as const) {
    assert.equal(isLifecycleAction(value), expected, String(value));
  }
});
