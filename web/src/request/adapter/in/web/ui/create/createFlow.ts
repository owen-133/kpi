import { requestTimestampFor } from '../../../../../../shared/domain/kstDates.ts';
import type { NewTaskBody, RequestApi } from '../RequestApi.ts';

// The create dialog's submit of public/app.js (#create-form onsubmit). Pure flow: the dialog passes the portal actions in.

export const NEW_TASK_TOAST = '새 업무가 등록되었습니다.';

/** The part of the portal actions this dialog uses. */
export type CreateActions = {
  toast(message: string): void;
  refresh(): Promise<void>;
  close(dialog: 'create'): void;
  openDetail(taskId: string): Promise<void>;
};

export type CreateDeps = {
  readonly api: Pick<RequestApi, 'createTask'>;
  readonly actions: CreateActions;
  /** Disables (true) or re-enables (false) the submit button while the flow runs. */
  setBusy(on: boolean): void;
};

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Every form field as typed; the request day becomes its stored timestamp. A day that does not exist throws. */
export function newTaskBody(form: FormData): NewTaskBody {
  const values = Object.fromEntries(form) as unknown as NewTaskBody;
  return { ...values, requested_at: requestTimestampFor(String(values.requested_at)) };
}

/** Builds the timestamp, posts, closes, refreshes, opens the new task, then toasts. A failure at any step toasts its message and stops. */
export async function submitNewTask(form: FormData, deps: CreateDeps): Promise<'created' | 'failed'> {
  deps.setBusy(true);
  try {
    const body = newTaskBody(form);
    const result = await deps.api.createTask(body);
    deps.actions.close('create');
    await deps.actions.refresh();
    await deps.actions.openDetail(result.id);
    deps.actions.toast(NEW_TASK_TOAST);
    return 'created';
  } catch (e) {
    deps.actions.toast(messageOf(e));
    return 'failed';
  } finally {
    deps.setBusy(false);
  }
}
