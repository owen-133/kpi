// Monthly operating figures (R-022). All day and month boundaries are KST. Ported from the legacy monthlyMetrics.
import { isValidDay, kstDayOf } from '../../shared/domain/kstDates.ts';
import type { KpiTask } from './KpiTask.ts';
import { assertReportMonth } from './ReportMonth.ts';

export const METRIC_VERSION = '1.0';
const STATUSES = ['접수', '진행 중', '대기', '완료'] as const;

export type MonthlyMetrics = {
  readonly version: string;
  readonly month: string;
  readonly generated_at: string;
  readonly excludedTests: number;
  readonly received: number;
  readonly completed: number;
  readonly completionRate: number | null;
  readonly onTime: number;
  readonly withDeadline: number;
  readonly noDeadlineCompleted: number;
  readonly dueRate: number | null;
  readonly dueMet: number;
  readonly dueTotal: number;
  readonly averageHours: number | null;
  readonly medianHours: number | null;
  readonly pending: number;
  readonly overdue: number;
  readonly noDeadline: number;
  readonly invalid: number;
  readonly statuses: Record<string, number>;
  readonly categories: Record<string, number>;
};

const parse = (value: unknown): number => (typeof value === 'string' ? Date.parse(value) : Number.NaN);
const ratio = (part: number, whole: number): number | null => (whole ? Math.round((part / whole) * 1000) / 10 : null);

function validCompletion(t: KpiTask): boolean {
  const completed = parse(t.completed_at);
  return t.status === '완료' && Number.isFinite(completed) && completed >= parse(t.requested_at);
}

/** Throws InvalidMonthError unless `month` is 'YYYY-MM'. Future months are fine: the preview allows them. */
export function monthlyMetrics(tasks: readonly KpiTask[], month: string, nowIso: string): MonthlyMetrics {
  assertReportMonth(month);
  const live = tasks.filter((t) => !t.deleted_at && !t.is_test);
  const today = kstDayOf(nowIso);
  const received = live.filter((t) => kstDayOf(t.requested_at).startsWith(month));
  const completed = live.filter((t) => validCompletion(t) && kstDayOf(t.completed_at).startsWith(month));
  const dueCompleted = completed.filter((t) => isValidDay(t.due_date));
  const onTime = dueCompleted.filter((t) => kstDayOf(t.completed_at) <= (t.due_date as string));
  const dueCohort = live.filter((t) => isValidDay(t.due_date) && t.due_date.startsWith(month) && t.due_date <= today);
  const dueMet = dueCohort.filter((t) => validCompletion(t) && kstDayOf(t.completed_at) <= (t.due_date as string));
  const hours = completed.map((t) => (parse(t.completed_at) - parse(t.requested_at)) / 3600000).sort((a, b) => a - b);
  const n = hours.length;
  const open = received.filter((t) => t.status !== '완료');
  return {
    version: METRIC_VERSION,
    month,
    generated_at: nowIso,
    excludedTests: tasks.filter((t) => !t.deleted_at && t.is_test).length,
    received: received.length,
    completed: completed.length,
    completionRate: ratio(onTime.length, dueCompleted.length),
    onTime: onTime.length,
    withDeadline: dueCompleted.length,
    noDeadlineCompleted: completed.filter((t) => !t.due_date).length,
    dueRate: ratio(dueMet.length, dueCohort.length),
    dueMet: dueMet.length,
    dueTotal: dueCohort.length,
    averageHours: n ? hours.reduce((a, b) => a + b, 0) / n : null,
    medianHours: n ? (hours[Math.floor(n / 2)] + hours[Math.floor((n - 1) / 2)]) / 2 : null,
    pending: open.length,
    overdue: open.filter((t) => t.due_date && t.due_date < today).length,
    noDeadline: received.filter((t) => !t.due_date).length,
    invalid: live.filter((t) => !kstDayOf(t.requested_at) || (t.due_date && !isValidDay(t.due_date)) || (t.status === '완료' && !validCompletion(t))).length,
    statuses: Object.fromEntries(STATUSES.map((s) => [s, received.filter((t) => t.status === s).length])),
    categories: Object.fromEntries([...new Set(received.map((t) => t.category || '미분류'))].map((c) => [c, received.filter((t) => (t.category || '미분류') === c).length])),
  };
}
