// R-023
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fingerprintSource } from './ReportFingerprint.ts';
import type { KpiTask } from './KpiTask.ts';

const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const tasks: KpiTask[] = [
  { id: 'a', requested_at: '2026-11-01T01:00:00+00:00', status: '접수', category: '비품·자산' },
  { id: 'b', requested_at: '2026-10-31T15:00:00Z', completed_at: '2026-11-02T00:00:00Z', due_date: '2026-11-03', status: '완료', is_test: true },
];

test('[R-023] the source is the KST date plus eight fields per task in list order, missing fields as null', () => {
  assert.equal(
    fingerprintSource(tasks, '2026-11-09T14:59:59.999Z'),
    '{"date":"2026-11-09","tasks":[["a","2026-11-01T01:00:00+00:00",null,null,"접수","비품·자산",null,null],["b","2026-10-31T15:00:00Z","2026-11-02T00:00:00Z","2026-11-03","완료",null,null,true]]}',
  );
});

test('[R-023] the digest equals the one the legacy server computes for the same input (values taken from the legacy expression)', () => {
  assert.equal(sha(fingerprintSource(tasks, '2026-11-09T14:59:59.999Z')), '8cfed7de04871882a19b230e6d15bf9dbe7a582e8328884feea2cb581890454d');
  assert.equal(sha(fingerprintSource(tasks, '2026-11-09T15:00:00.000Z')), '65fb35e11a5493f26e1896fea107df8a15cf6b9c3c21ca8eb5c88e98aae0552b');
  assert.equal(sha(fingerprintSource([], '2026-11-09T00:00:00Z')), '62bf86f0df21e5c85e8542aa21c8aa5c29a5d9fd3df6c520a8baa1a3ff3b8a58');
});

test('[R-023] the fingerprint changes at KST midnight, not at UTC midnight', () => {
  const before = fingerprintSource(tasks, '2026-11-09T14:59:59.999Z');
  assert.equal(fingerprintSource(tasks, '2026-11-09T00:00:00Z'), before);
  assert.notEqual(fingerprintSource(tasks, '2026-11-09T15:00:00.000Z'), before);
});

test('[R-023] a changed status, a swapped order or a changed test flag changes the source; fields outside the eight do not', () => {
  const same = fingerprintSource(tasks, '2026-11-09T00:00:00Z');
  assert.notEqual(fingerprintSource([{ ...tasks[0], status: '대기' }, tasks[1]], '2026-11-09T00:00:00Z'), same);
  assert.notEqual(fingerprintSource([tasks[1], tasks[0]], '2026-11-09T00:00:00Z'), same);
  assert.notEqual(fingerprintSource([tasks[0], { ...tasks[1], is_test: false }], '2026-11-09T00:00:00Z'), same);
  assert.equal(fingerprintSource([{ ...tasks[0], title: '다른 제목' }, tasks[1]], '2026-11-09T00:00:00Z'), same);
});
