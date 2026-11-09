// R-017
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertReportMonth, currentMonth, isFutureMonth } from './ReportMonth.ts';
import { InvalidMonthError } from './ReportErrors.ts';

test('[R-017] the current month is the KST month: 14:59:59Z on the last day is still that month, 15:00:00Z is the next', () => {
  assert.equal(currentMonth('2026-10-31T14:59:59.999Z'), '2026-10');
  assert.equal(currentMonth('2026-10-31T15:00:00.000Z'), '2026-11');
  assert.equal(currentMonth('2026-12-31T15:00:00Z'), '2027-01');
});

test('[R-017] the same month is not future; the next month and far years are', () => {
  const now = '2026-11-09T01:00:00Z';
  assert.equal(isFutureMonth('2026-11', now), false);
  assert.equal(isFutureMonth('2026-10', now), false);
  assert.equal(isFutureMonth('2026-12', now), true);
  assert.equal(isFutureMonth('9999-12', now), true);
  assert.equal(isFutureMonth('2027-01', '2026-12-31T14:59:59Z'), true);
  assert.equal(isFutureMonth('2027-01', '2026-12-31T15:00:00Z'), false);
});

test('[R-017] a month needs four digits, a dash and 01..12', () => {
  assertReportMonth('2026-01');
  assertReportMonth('2026-12');
  for (const bad of ['2026-00', '2026-13', '', '2026-1', ' 2026-11', '2026-11 ']) assert.throws(() => assertReportMonth(bad), InvalidMonthError);
});
