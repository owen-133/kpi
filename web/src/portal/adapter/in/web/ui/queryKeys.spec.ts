import assert from 'node:assert/strict';
import { test } from 'node:test';
import { queryKeys } from './queryKeys.ts';

test('the keys are the ones docs/architecture.md 「화면 구조 규칙」 lists', () => {
  assert.deepEqual(queryKeys.session, ['session']);
  assert.deepEqual(queryKeys.settings, ['settings']);
  assert.deepEqual(queryKeys.tasks, ['tasks']);
  assert.deepEqual(queryKeys.task('a'), ['task', 'a']);
  assert.deepEqual(queryKeys.trash, ['trash']);
  assert.deepEqual(queryKeys.reportPreview('2026-11'), ['report-preview', '2026-11']);
  assert.deepEqual(queryKeys.reports, ['reports']);
  assert.deepEqual(queryKeys.improvements, ['improvements']);
  assert.deepEqual(queryKeys.lifecycleHistory, ['lifecycle-history']);
  assert.deepEqual(queryKeys.settingsHistory, ['settings-history']);
  assert.deepEqual(queryKeys.improvementHistory('i1'), ['improvement-history', 'i1']);
});

test('keys with a parameter differ per parameter', () => {
  assert.notDeepEqual(queryKeys.task('a'), queryKeys.task('b'));
  assert.notDeepEqual(queryKeys.reportPreview('2026-10'), queryKeys.reportPreview('2026-11'));
});
