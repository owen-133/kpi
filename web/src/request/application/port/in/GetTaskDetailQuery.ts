import type { TaskDetail } from '../../../domain/TaskRecord.ts';

export interface GetTaskDetailQuery {
  /** `includeDeleted` lets an admin see a task that is in the trash. Resolves null when no such task exists. */
  detail(id: string, includeDeleted: boolean): Promise<TaskDetail | null>;
}
