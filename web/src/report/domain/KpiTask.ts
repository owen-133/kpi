// A task as the monthly figures see it: the list row merged with its KPI extras row (is_test, assignee ...).
export type KpiTask = {
  readonly id?: unknown;
  readonly title?: string;
  readonly description?: string;
  readonly requested_at?: string | null;
  readonly completed_at?: string | null;
  readonly due_date?: string | null;
  readonly status?: string;
  readonly category?: string | null;
  readonly deleted_at?: string | null;
  readonly is_test?: unknown;
};
