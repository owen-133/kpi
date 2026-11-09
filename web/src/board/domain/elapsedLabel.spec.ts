// R-011
import test from 'node:test';
import assert from 'node:assert/strict';
import { elapsedSinceReceipt } from './elapsedLabel.ts';

const at = (iso: string) => iso;

test('[R-011] under a day the label shows hours and minutes', () => {
  // facts: "접수 후 2시간 50분"
  assert.equal(elapsedSinceReceipt(at('2026-11-08T15:00:00Z'), at('2026-11-08T17:50:00Z')), '접수 후 2시간 50분');
});

test('[R-011] from one day on the label shows days and hours', () => {
  // facts: "접수 후 3일 0시간", "접수 후 6일 1시간"
  assert.equal(elapsedSinceReceipt('2026-11-05T15:00:00Z', '2026-11-08T15:00:00Z'), '접수 후 3일 0시간');
  assert.equal(elapsedSinceReceipt('2026-11-03T00:00:00Z', '2026-11-09T01:30:00Z'), '접수 후 6일 1시간');
});

test('[R-011] the day boundary is exactly 24 hours', () => {
  assert.equal(elapsedSinceReceipt('2026-11-08T00:00:00Z', '2026-11-08T23:59:59Z'), '접수 후 23시간 59분');
  assert.equal(elapsedSinceReceipt('2026-11-08T00:00:00Z', '2026-11-09T00:00:00Z'), '접수 후 1일 0시간');
});

test('[R-011] under an hour the label shows minutes only, and zero is allowed', () => {
  assert.equal(elapsedSinceReceipt('2026-11-08T00:00:00Z', '2026-11-08T00:42:00Z'), '접수 후 42분');
  assert.equal(elapsedSinceReceipt('2026-11-08T00:00:00Z', '2026-11-08T00:00:00Z'), '접수 후 0분');
  assert.equal(elapsedSinceReceipt('2026-11-08T00:00:00Z', '2026-11-08T01:00:00Z'), '접수 후 1시간 0분');
});

test('[R-011] a missing, invalid or future receipt time gives an empty label instead of a wrong number', () => {
  assert.equal(elapsedSinceReceipt(null, '2026-11-08T00:00:00Z'), '');
  assert.equal(elapsedSinceReceipt(undefined, '2026-11-08T00:00:00Z'), '');
  assert.equal(elapsedSinceReceipt('garbage', '2026-11-08T00:00:00Z'), '');
  assert.equal(elapsedSinceReceipt('2026-11-08T00:00:00Z', 'garbage'), '');
  assert.equal(elapsedSinceReceipt('2026-11-09T00:00:00Z', '2026-11-08T00:00:00Z'), '');
});
