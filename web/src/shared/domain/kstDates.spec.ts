// R-033
import test from 'node:test';
import assert from 'node:assert/strict';
import { InvalidRequestDateError, isValidDay, kstDayOf, requestTimestampFor, weekdayOfDay } from './kstDates.ts';

test('[R-033] a day input is stored as KST midnight and a precise time of the same day is kept', () => {
  assert.equal(requestTimestampFor('2026-11-05'), '2026-11-04T15:00:00.000Z');
  const precise = '2026-11-05T01:23:45.123Z';
  assert.equal(requestTimestampFor('2026-11-05', precise), precise);
  assert.equal(requestTimestampFor('2026-11-06', precise), '2026-11-05T15:00:00.000Z');
  assert.throws(() => requestTimestampFor('2026-02-31'), /요청일/);
});

test('[R-033] a previous timestamp of another KST day is replaced by midnight of the new day', () => {
  // 14:59Z is still the previous KST day, 15:00Z is already the next one
  assert.equal(requestTimestampFor('2026-11-02', '2026-11-01T14:59:00Z'), '2026-11-01T15:00:00.000Z');
  assert.equal(requestTimestampFor('2026-11-02', '2026-11-01T15:00:00Z'), '2026-11-01T15:00:00Z');
  assert.equal(requestTimestampFor('2026-11-01', '2026-11-01T14:59:00Z'), '2026-11-01T14:59:00Z');
});

test('[R-033] invalid days are rejected with the request-date error and never stored', () => {
  const bad = ['', '2026-2-3', '2026-13-01', '2026-00-10', '2026-04-31', '20261105', '2026-11-05T00:00:00Z', ' 2026-11-05', 'abc'];
  for (const day of bad) {
    assert.throws(() => requestTimestampFor(day), InvalidRequestDateError, `rejects ${JSON.stringify(day)}`);
  }
  assert.throws(() => requestTimestampFor(undefined as unknown as string), InvalidRequestDateError);
  assert.throws(() => requestTimestampFor(20261105 as unknown as string), InvalidRequestDateError);
});

test('[R-033] a leap day is valid only in a leap year', () => {
  assert.equal(isValidDay('2028-02-29'), true);
  assert.equal(isValidDay('2026-02-29'), false);
  assert.equal(requestTimestampFor('2028-02-29'), '2028-02-28T15:00:00.000Z');
});

test('[R-033] an empty or unparsable previous value is ignored', () => {
  assert.equal(requestTimestampFor('2026-11-05', ''), '2026-11-04T15:00:00.000Z');
  assert.equal(requestTimestampFor('2026-11-05', 'not a date'), '2026-11-04T15:00:00.000Z');
  assert.equal(requestTimestampFor('2026-11-05', null), '2026-11-04T15:00:00.000Z');
});

test('[R-033] kstDayOf maps instants to KST days across the 14:59Z / 15:00Z boundary', () => {
  assert.equal(kstDayOf('2026-11-01T14:59:59Z'), '2026-11-01');
  assert.equal(kstDayOf('2026-11-01T15:00:00Z'), '2026-11-02');
  assert.equal(kstDayOf('2026-12-31T15:00:00Z'), '2027-01-01');
  assert.equal(kstDayOf('2026-11-01'), '2026-11-01');
  assert.equal(kstDayOf(null), '');
  assert.equal(kstDayOf(undefined), '');
  assert.equal(kstDayOf(''), '');
  assert.equal(kstDayOf('garbage'), '');
});

test('[R-033] weekdayOfDay names the Korean weekday of a calendar day', () => {
  assert.equal(weekdayOfDay('2026-11-09'), '월');
  assert.equal(weekdayOfDay('2026-11-08'), '일');
  assert.equal(weekdayOfDay('2026-11-05'), '목');
  assert.throws(() => weekdayOfDay('2026-11-31'), InvalidRequestDateError);
});
