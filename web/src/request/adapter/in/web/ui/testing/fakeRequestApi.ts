import { CallLog } from '../../../../../../shared/adapter/in/web/ui/testing/CallLog.ts';
import type {
  EditTaskBody,
  EditTaskResult,
  LifecycleEventView,
  LifecycleResult,
  NewTaskBody,
  RequestApi,
  StatusChangeBody,
  TaskDetailView,
  TaskSummary,
} from '../RequestApi.ts';

export class FakeRequestApi implements RequestApi {
  readonly log = new CallLog();
  tasks: TaskSummary[] = [];
  trash: TaskSummary[] = [];
  details = new Map<string, TaskDetailView>();
  history: LifecycleEventView[] = [];
  nextId = 'new-task';
  editResult: EditTaskResult = { ok: true, revision: 1 };

  async listTasks(): Promise<TaskSummary[]> {
    this.log.record('listTasks', []);
    return structuredClone(this.tasks);
  }

  async getTask(id: string): Promise<TaskDetailView> {
    this.log.record('getTask', [id]);
    const detail = this.details.get(id);
    if (!detail) throw new Error('업무를 찾을 수 없습니다.');
    return structuredClone(detail);
  }

  async createTask(body: NewTaskBody): Promise<{ readonly id: string }> {
    this.log.record('createTask', [body]);
    return { id: this.nextId };
  }

  async changeStatus(id: string, body: StatusChangeBody): Promise<unknown> {
    this.log.record('changeStatus', [id, body]);
    return { ok: true };
  }

  async addNote(id: string, note: string): Promise<unknown> {
    this.log.record('addNote', [id, note]);
    return { ok: true };
  }

  async editTask(id: string, body: EditTaskBody): Promise<EditTaskResult> {
    this.log.record('editTask', [id, body]);
    return { ...this.editResult };
  }

  async deleteTask(id: string, reason: string): Promise<LifecycleResult> {
    this.log.record('deleteTask', [id, reason]);
    return { ok: true };
  }

  async restoreTask(id: string, reason: string): Promise<LifecycleResult> {
    this.log.record('restoreTask', [id, reason]);
    return { ok: true };
  }

  async purgeTask(id: string, reason: string, confirmation: string): Promise<LifecycleResult> {
    this.log.record('purgeTask', [id, reason, confirmation]);
    return { ok: true };
  }

  async listTrash(): Promise<TaskSummary[]> {
    this.log.record('listTrash', []);
    return structuredClone(this.trash);
  }

  async lifecycleHistory(): Promise<LifecycleEventView[]> {
    this.log.record('lifecycleHistory', []);
    return structuredClone(this.history);
  }
}
