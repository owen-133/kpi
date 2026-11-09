// The text a report fingerprint is the SHA-256 of: today's KST date and eight fields of every task, in list order.
// `undefined` fields become null (JSON.stringify), exactly as in the legacy server.
import { kstDayOf } from '../../shared/domain/kstDates.ts';
import type { KpiTask } from './KpiTask.ts';

export function fingerprintSource(tasks: readonly KpiTask[], nowIso: string): string {
  return JSON.stringify({
    date: kstDayOf(nowIso),
    tasks: tasks.map((t) => [t.id, t.requested_at, t.completed_at, t.due_date, t.status, t.category, t.deleted_at, t.is_test]),
  });
}
