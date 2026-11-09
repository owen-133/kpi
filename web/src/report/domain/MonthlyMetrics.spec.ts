// R-022
import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyMetrics } from './MonthlyMetrics.ts';
import { monthlyDraft } from './MonthlyDraft.ts';
import { InvalidMonthError } from './ReportErrors.ts';
import type { KpiTask } from './KpiTask.ts';

const base: KpiTask = { id: '1', title: '노트북 준비', category: '비품·자산', description: '입사자 장비', status: '완료', requested_at: '2026-10-31T15:00:00Z', completed_at: '2026-11-02T14:59:00Z', due_date: '2026-11-02' };
const NOW = '2026-11-04T00:00:00Z';

test('[R-022] KST month boundaries, due dates, denominators, tests, deleted, bad times and the median (legacy kpi-model case)', () => {
  const list: KpiTask[] = [
    base,
    { ...base, id: '2', completed_at: '2026-11-02T15:00:00Z' },
    { ...base, id: '3', due_date: '' },
    { ...base, id: '4', status: '진행 중', completed_at: null },
    { ...base, id: '5', is_test: 1 },
    { ...base, id: '6', deleted_at: '2026-11-03' },
    { ...base, id: '7', completed_at: '2026-10-30T00:00:00Z' },
  ];
  const m = monthlyMetrics(list, '2026-11', NOW);
  assert.deepEqual(
    [m.received, m.completed, m.withDeadline, m.onTime, m.completionRate, m.excludedTests, m.invalid, m.dueTotal, m.dueMet, m.dueRate, m.noDeadlineCompleted],
    [5, 3, 2, 1, 50, 1, 1, 4, 1, 25, 1],
  );
  assert.equal(m.medianHours, (Date.parse(base.completed_at as string) - Date.parse(base.requested_at as string)) / 3600000);
  assert.equal(m.generated_at, NOW);
  assert.match(monthlyDraft(m), /규칙 기반/);
});

test('[R-022] no tasks gives null rates and hours; an impossible due date counts as invalid, not as a deadline', () => {
  const empty = monthlyMetrics([], '2026-11', NOW);
  assert.equal(empty.completionRate, null);
  assert.equal(empty.dueRate, null);
  assert.equal(empty.averageHours, null);
  assert.equal(empty.medianHours, null);
  const impossible = monthlyMetrics([{ ...base, due_date: '2026-02-31' }], '2026-11', NOW);
  assert.equal(impossible.withDeadline, 0);
  assert.equal(impossible.invalid, 1);
});

test('[R-022] a task requested at 14:59:59Z is in its KST month and one at 15:00:00Z on the last day belongs to the next month', () => {
  const lastSecond = { ...base, id: 'a', status: '접수', completed_at: null, requested_at: '2026-10-31T14:59:59Z' };
  const nextMonth = { ...base, id: 'b', status: '접수', completed_at: null, requested_at: '2026-10-31T15:00:00Z' };
  assert.equal(monthlyMetrics([lastSecond, nextMonth], '2026-10', NOW).received, 1);
  assert.equal(monthlyMetrics([lastSecond, nextMonth], '2026-11', NOW).received, 1);
});

test('[R-022] a completion earlier than the request is invalid and not counted as completed', () => {
  const m = monthlyMetrics([{ ...base, completed_at: '2026-10-30T00:00:00Z' }], '2026-10', NOW);
  assert.equal(m.completed, 0);
  assert.equal(m.invalid, 1);
});

test('[R-022] only YYYY-MM with month 01..12 is accepted; future months compute', () => {
  for (const ok of ['2026-01', '2026-12', '9999-12']) assert.equal(monthlyMetrics([], ok, NOW).month, ok);
  for (const bad of ['2026-00', '2026-13', '2026-1', '26-11', '2026-11-01', '2026-1x', '2026/11', '', ' 2026-11', '2026-11\n', 'null']) {
    assert.throws(() => monthlyMetrics([], bad, NOW), (error) => error instanceof InvalidMonthError && error.message === '조회 월을 확인하세요.', JSON.stringify(bad));
  }
});

test('[R-022] overdue counts open received tasks whose due day is before today (equal day is not overdue)', () => {
  const open = (id: string, due: string): KpiTask => ({ ...base, id, status: '접수', completed_at: null, due_date: due });
  const m = monthlyMetrics([open('a', '2026-11-03'), open('b', '2026-11-04'), open('c', '')], '2026-11', NOW);
  assert.equal(m.overdue, 1);
  assert.equal(m.noDeadline, 1);
  assert.equal(m.pending, 3);
});

test('[R-022] tasks without a category are counted as 미분류 and every status key is present', () => {
  const m = monthlyMetrics([{ ...base, category: null }], '2026-11', NOW);
  assert.deepEqual(m.categories, { 미분류: 1 });
  assert.deepEqual(Object.keys(m.statuses), ['접수', '진행 중', '대기', '완료']);
});

test('[R-023] the rule-based draft names the month and says "no target" for empty rates', () => {
  const draft = monthlyDraft(monthlyMetrics([], '2026-11', NOW));
  assert.ok(draft.startsWith('2026-11 총무 업무 처리현황'));
  assert.match(draft, /완료 기준 기한 준수율 산정 대상 없음 \(0\/0건\)/);
  assert.match(draft, /집계 시점 2026-11-04T00:00:00Z\./);
  assert.match(draft, /처리 지연 사례와 반복 요청을 점검하고 개선 이력에 남깁니다\./);
});
