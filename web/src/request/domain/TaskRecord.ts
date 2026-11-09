// A task as the database functions return it. The columns are the SQL functions' contract, so the record is passed
// through unchanged; only the id is relied on here.
export type TaskRecord = { readonly id: string } & Readonly<Record<string, unknown>>;

/** The KPI part of a task detail: the extras row plus files, or the "not installed" answer. */
export type TaskKpiDetail = Readonly<Record<string, unknown>>;

export type TaskDetail = TaskRecord & { readonly kpi?: TaskKpiDetail };
