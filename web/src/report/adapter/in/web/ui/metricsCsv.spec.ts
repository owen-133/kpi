import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyMetrics } from './testing/fakeReportApi.ts';
import { metricsCsv, metricsCsvFilename } from './metricsCsv.ts';

// Given the metrics of a month / When the CSV is made / Then it is the legacy two-column text: scalars only, CRLF, no quoting
test('the metrics CSV lists every scalar metric in server order and leaves the statuses and categories out', () => {
  const m = { ...emptyMetrics('2026-11'), received: 3, completionRate: 66.7, categories: { 문의: 2 } };
  const lines = metricsCsv(m).split('\r\n');
  assert.equal(lines[0], '지표,값');
  assert.deepEqual(lines.slice(1, 4), ['version,1.0', 'month,2026-11', 'generated_at,2026-11-09T00:00:00.000Z']);
  assert.ok(lines.includes('received,3'));
  assert.ok(lines.includes('completionRate,66.7'));
  assert.equal(lines.some((l) => l.startsWith('statuses') || l.startsWith('categories')), false);
  assert.equal(lines.length, 1 + 19);
});

test('a metric that has no target (null) is written as 산정대상없음, a zero as 0', () => {
  const lines = metricsCsv(emptyMetrics('2026-11')).split('\r\n');
  assert.ok(lines.includes('dueRate,산정대상없음'));
  assert.ok(lines.includes('averageHours,산정대상없음'));
  assert.ok(lines.includes('overdue,0'));
});

test('the CSV is not quoted and does not end with a line break (legacy join)', () => {
  const csv = metricsCsv({ ...emptyMetrics('2026-11'), month: 'a,"b' });
  assert.ok(csv.includes('\r\nmonth,a,"b\r\n'));
  assert.equal(csv.endsWith('\r\n'), false);
});

test('the file is named after the month that is selected', () => {
  assert.equal(metricsCsvFilename('2026-10'), '2026-10_지표.csv');
});
