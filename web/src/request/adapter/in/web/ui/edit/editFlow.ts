import { registrationCategories } from '../../../../../../shared/domain/categories.ts';
import { kstDayOf, requestTimestampFor } from '../../../../../../shared/domain/kstDates.ts';
import type { RequestApi, TaskDetailView, TaskEditValues } from '../RequestApi.ts';

// The edit dialog of public/task-editor.js (editTask). Pure flow functions: the component hands in the portal actions and
// the two small view hooks (button busy, error line), so the order of calls and the toasts can be tested with the fakes.

export type EditActions = {
  toast(message: string): void;
  refresh(): Promise<void>;
  close(dialog: 'edit'): void;
  openDetail(taskId: string): Promise<void>;
};

export type EditDeps = {
  readonly api: Pick<RequestApi, 'editTask'>;
  readonly actions: EditActions;
  /** Disables (true) or re-enables (false) the save button. */
  setBusy(on: boolean): void;
  /** Fills the dialog's #edit-task-error line (the legacy line is shown and never cleared again). */
  showError(message: string): void;
};

export type EditOutcome = 'saved' | 'unchanged' | 'bad-date' | 'failed';

export type SelectOption = { readonly value: string; readonly label: string };

export type EditChoices = {
  readonly channels: readonly string[];
  readonly categories: readonly string[];
  readonly priorities: readonly string[];
};

export type EditFormModel = {
  readonly requestedDay: string;
  readonly channels: readonly SelectOption[];
  readonly categories: readonly SelectOption[];
  readonly priorities: readonly SelectOption[];
};

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** The stored value first, then the configured list, each once; the stored value can be absent (undefined or null) and is then left out. */
export function selectOptions(current: string | null | undefined, list: readonly string[]): SelectOption[] {
  return [...new Set<string | null | undefined>([current, ...list])]
    .filter((x): x is string => x !== undefined && x !== null)
    .map((value) => ({ value, label: value || '미지정' }));
}

export function editFormModel(task: Pick<TaskDetailView, 'requested_at' | 'channel' | 'category' | 'priority'>, choices: EditChoices): EditFormModel {
  return {
    requestedDay: kstDayOf(task.requested_at),
    channels: selectOptions(task.channel, choices.channels),
    categories: selectOptions(task.category, registrationCategories(choices.categories)),
    priorities: selectOptions(task.priority, choices.priorities),
  };
}

/** Opening without a held task: a failed read toasts and leaves nothing open. */
export async function loadEditTask(read: () => Promise<TaskDetailView>, actions: Pick<EditActions, 'toast' | 'close'>): Promise<TaskDetailView | null> {
  try {
    return await read();
  } catch (error) {
    actions.toast(message(error));
    actions.close('edit');
    return null;
  }
}

/**
 * Submitting. A bad request day toasts and stops before the button is touched. A save closes the dialog, refreshes the tasks,
 * reads the detail again and only then toasts; any failure on that line (also after the save) goes to the error line.
 */
export async function saveEdit(task: Pick<TaskDetailView, 'id' | 'requested_at' | 'edit_revision'>, fields: Readonly<Record<string, string>>, deps: EditDeps): Promise<EditOutcome> {
  const { reason, ...rest } = fields;
  let values: TaskEditValues;
  try {
    values = { ...rest, requested_at: requestTimestampFor(rest.requested_at, task.requested_at) } as unknown as TaskEditValues;
  } catch (error) {
    deps.actions.toast(message(error));
    return 'bad-date';
  }
  deps.setBusy(true);
  try {
    const result = await deps.api.editTask(task.id, { values, reason, revision: task.edit_revision || 0 });
    deps.actions.close('edit');
    await deps.actions.refresh();
    await deps.actions.openDetail(task.id);
    deps.actions.toast(result.unchanged ? '변경된 항목이 없습니다.' : '업무 정보를 수정했습니다.');
    return result.unchanged ? 'unchanged' : 'saved';
  } catch (error) {
    deps.showError(message(error));
    return 'failed';
  } finally {
    deps.setBusy(false);
  }
}
