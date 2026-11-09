import type { ApiClient } from '../../../../../shared/adapter/in/web/ui/apiClient.ts';

/** KPI columns merged into every row of GET /api/tasks (absent while the KPI tables are not installed). */
type TaskExtras = {
  readonly assignee?: string;
  readonly assigned_at?: string | null;
  readonly is_test?: boolean;
};

/** A task row of GET /api/tasks, GET /api/trash (with `deleted_at`) and the base of the detail. Times are UTC ISO text. */
export type TaskSummary = TaskExtras & {
  readonly id: string;
  readonly title: string;
  readonly requester: string;
  readonly department: string;
  readonly channel: string;
  readonly category: string;
  readonly priority: string;
  readonly requested_at: string;
  readonly due_date: string;
  readonly description: string;
  readonly status: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly completed_at: string | null;
  readonly deleted_at?: string | null;
  readonly edit_revision?: number;
};

export type TaskEventView = {
  readonly id?: number;
  readonly at: string;
  readonly actor: string;
  readonly kind: string;
  readonly detail: string;
};

export type TaskFileView = {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly created_at: string;
};

/** The `kpi` part of a task detail: the extras row with the files, or the "tables not installed" answer. */
export type TaskKpiView = {
  readonly available: boolean;
  readonly message?: string;
  readonly files: readonly TaskFileView[];
  readonly assignee?: string;
  readonly assigned_at?: string | null;
  readonly is_test?: boolean;
};

/** GET /api/tasks/<id> */
export type TaskDetailView = TaskSummary & {
  readonly events: readonly TaskEventView[];
  readonly kpi?: TaskKpiView;
};

/** The registration form as the legacy portal sends it (`requested_at` is already the stored timestamp). */
export type NewTaskBody = {
  readonly title: string;
  readonly requester: string;
  readonly department?: string;
  readonly channel?: string;
  readonly category?: string;
  readonly priority?: string;
  readonly requested_at: string;
  readonly due_date?: string;
  readonly description?: string;
};

/** `reason` is present only when the form shows the reopen field. */
export type StatusChangeBody = { readonly status: string; readonly reason?: string };

export type TaskEditValues = {
  readonly title: string;
  readonly requester: string;
  readonly department: string;
  readonly channel: string;
  readonly category: string;
  readonly priority: string;
  readonly requested_at: string;
  readonly due_date: string;
  readonly description: string;
};

export type EditTaskBody = { readonly values: TaskEditValues; readonly reason: string; readonly revision: number };

/** POST .../edit answers `{ok, revision}` or `{ok, unchanged}`. */
export type EditTaskResult = { readonly ok: true; readonly revision?: number; readonly unchanged?: true };

export type LifecycleResult = Readonly<Record<string, unknown>>;

/** One row of GET /api/lifecycle-history. */
export type LifecycleEventView = {
  readonly id?: number;
  readonly at: string;
  readonly actor: string;
  readonly action: 'delete' | 'restore' | 'purge';
  readonly task_id: string;
  readonly reason: string;
};

export interface RequestApi {
  listTasks(): Promise<TaskSummary[]>;
  getTask(id: string): Promise<TaskDetailView>;
  createTask(body: NewTaskBody): Promise<{ readonly id: string }>;
  changeStatus(id: string, body: StatusChangeBody): Promise<unknown>;
  addNote(id: string, note: string): Promise<unknown>;
  editTask(id: string, body: EditTaskBody): Promise<EditTaskResult>;
  deleteTask(id: string, reason: string): Promise<LifecycleResult>;
  restoreTask(id: string, reason: string): Promise<LifecycleResult>;
  purgeTask(id: string, reason: string, confirmation: string): Promise<LifecycleResult>;
  listTrash(): Promise<TaskSummary[]>;
  lifecycleHistory(): Promise<LifecycleEventView[]>;
}

export function createRequestApi(client: ApiClient): RequestApi {
  return {
    listTasks: () => client.request<TaskSummary[]>('tasks'),
    getTask: (id) => client.request<TaskDetailView>('tasks/' + id),
    createTask: (body) => client.request<{ id: string }>('tasks', body),
    changeStatus: (id, body) => client.request(`tasks/${id}/status`, body),
    addNote: (id, note) => client.request(`tasks/${id}/notes`, { note }),
    editTask: (id, body) => client.request<EditTaskResult>('tasks/' + id + '/edit', body),
    deleteTask: (id, reason) => client.request<LifecycleResult>(`tasks/${id}/delete`, { reason }),
    // the legacy trash dialog sends `confirmation` ('' for a restore) with both
    restoreTask: (id, reason) => client.request<LifecycleResult>(`tasks/${id}/restore`, { reason, confirmation: '' }),
    purgeTask: (id, reason, confirmation) => client.request<LifecycleResult>(`tasks/${id}/purge`, { reason, confirmation }),
    listTrash: () => client.request<TaskSummary[]>('trash'),
    lifecycleHistory: () => client.request<LifecycleEventView[]>('lifecycle-history'),
  };
}
