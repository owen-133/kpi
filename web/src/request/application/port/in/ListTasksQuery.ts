import type { TaskRecord } from '../../../domain/TaskRecord.ts';

/** Every task, newest first, each merged with its KPI extras (assignee, test flag) when the KPI functions exist. */
export interface ListTasksQuery {
  list(): Promise<readonly TaskRecord[]>;
}
