import type { RequestApi, StatusChangeBody, TaskDetailView } from '../RequestApi.ts';

// The detail dialog of public/app.js (`detail`): the status form, the memo form, the delete button and the edit button.
// Pure flow functions: the component hands in the portal actions, window.prompt and the button state.

export type DetailActions = {
  toast(message: string): void;
  refresh(): Promise<void>;
  close(dialog: 'detail'): void;
  open(dialog: 'edit', params: { taskId: string }): void;
  /** Reads the task anew and draws the detail again (the legacy `detail(id)`). */
  openDetail(taskId: string): Promise<void>;
};

export type DetailDeps = {
  readonly api: Pick<RequestApi, 'changeStatus' | 'addNote' | 'deleteTask'>;
  readonly actions: DetailActions;
  readonly prompt: (message: string, defaultValue?: string) => string | null;
  /** Disables (true) or enables (false) the pressed form button (the legacy `submit` helper). */
  readonly setBusy: (on: boolean) => void;
};

export const STATUS_TOAST = '상태 변경이 기록되었습니다.';
export const NOTE_TOAST = '처리 메모를 기록했습니다.';
export const DELETE_PROMPT = '업무를 휴지통으로 이동합니다. 삭제 사유를 입력하세요.';
export const DELETE_DEFAULT_REASON = '테스트 업무 정리';
export const DELETE_TOAST = '업무를 휴지통으로 이동했습니다.';

export type DetailOutcome = 'done' | 'cancelled' | 'failed';

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

// legacy `submit(form, action)`: the button is off while the action runs, an error becomes a toast, the button comes back
async function submit(deps: DetailDeps, action: () => Promise<void>): Promise<DetailOutcome> {
  deps.setBusy(true);
  try {
    await action();
    return 'done';
  } catch (error) {
    deps.actions.toast(messageOf(error));
    return 'failed';
  } finally {
    deps.setBusy(false);
  }
}

export function recordStatus(taskId: string, values: StatusChangeBody, deps: DetailDeps): Promise<DetailOutcome> {
  return submit(deps, async () => {
    await deps.api.changeStatus(taskId, values);
    deps.actions.close('detail');
    await deps.actions.refresh();
    deps.actions.toast(STATUS_TOAST);
  });
}

export function recordNote(taskId: string, note: string, deps: DetailDeps): Promise<DetailOutcome> {
  return submit(deps, async () => {
    await deps.api.addNote(taskId, note);
    await deps.actions.openDetail(taskId);
    deps.actions.toast(NOTE_TOAST);
  });
}

export async function deleteTask(taskId: string, deps: Omit<DetailDeps, 'setBusy'>): Promise<DetailOutcome> {
  const reason = deps.prompt(DELETE_PROMPT, DELETE_DEFAULT_REASON);
  if (reason === null) return 'cancelled';
  try {
    await deps.api.deleteTask(taskId, reason);
    deps.actions.close('detail');
    await deps.actions.refresh();
    deps.actions.toast(DELETE_TOAST);
    return 'done';
  } catch (error) {
    deps.actions.toast(messageOf(error));
    return 'failed';
  }
}

/** The edit dialog is another screen; it stacks above the detail. */
export function editTask(taskId: string, actions: Pick<DetailActions, 'open'>): void {
  actions.open('edit', { taskId });
}

/** A read that fails toasts and closes the dialog: the legacy dialog was only shown after its read. */
export async function readDetail(read: () => Promise<TaskDetailView>, actions: Pick<DetailActions, 'toast' | 'close'>): Promise<TaskDetailView | null> {
  try {
    return await read();
  } catch (error) {
    actions.toast(messageOf(error));
    actions.close('detail');
    return null;
  }
}
