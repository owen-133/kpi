import type { LifecycleEventView, RequestApi, TaskSummary } from '../RequestApi.ts';

// The trash dialog of public/app.js (openTrash). Pure flow functions: the component hands in the reads, the portal actions
// and window.prompt, so the order of calls and the toasts can be tested with the fakes.

export type TrashActions = {
  toast(message: string): void;
  refresh(): Promise<void>;
  close(dialog: 'trash'): void;
  openDetail(taskId: string): Promise<void>;
};

/** The two reads of the dialog; each runs when the dialog opens or the button is pressed (docs/architecture.md 「화면 구조 규칙」, trash and lifecycle-history). */
export type TrashReads = {
  trash(): Promise<TaskSummary[]>;
  history(): Promise<LifecycleEventView[]>;
};

export type Prompter = (message: string, defaultValue?: string) => string | null;

export type TrashDeps = {
  readonly api: Pick<RequestApi, 'restoreTask' | 'purgeTask'>;
  readonly reads: TrashReads;
  readonly actions: TrashActions;
  readonly prompt: Prompter;
  /** Disables (true) or re-enables (false) the pressed row buttons. */
  setBusy(on: boolean): void;
  /** Shows a freshly read list; the legacy openTrash drew the whole dialog again, which also emptied the history. */
  show(list: TaskSummary[]): void;
};

export type TrashOutcome = 'done' | 'cancelled' | 'mismatch' | 'failed';

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Opening: a failed read toasts and leaves nothing open, like the legacy dialog that was only shown after the read. */
export async function loadTrash(reads: TrashReads, actions: Pick<TrashActions, 'toast' | 'close'>): Promise<TaskSummary[] | null> {
  try {
    return await reads.trash();
  } catch (error) {
    actions.toast(message(error));
    actions.close('trash');
    return null;
  }
}

export async function showDeletionHistory(reads: TrashReads, actions: Pick<TrashActions, 'toast'>): Promise<LifecycleEventView[] | null> {
  try {
    return await reads.history();
  } catch (error) {
    actions.toast(message(error));
    return null;
  }
}

export async function openDeletedTask(actions: Pick<TrashActions, 'toast' | 'openDetail'>, taskId: string): Promise<void> {
  try {
    await actions.openDetail(taskId);
  } catch (error) {
    actions.toast(message(error));
  }
}

/** Restore or purge one row. The prompts come first; any cancelled prompt ends silently, a wrong title toasts. */
export async function runTrashAction(kind: 'restore' | 'purge', task: Pick<TaskSummary, 'id' | 'title'>, deps: TrashDeps): Promise<TrashOutcome> {
  let confirmation = '';
  if (kind === 'purge') {
    const typed = deps.prompt('영구 삭제하면 복구할 수 없습니다. 확인하려면 아래 업무 제목을 정확히 입력하세요.\n' + task.title);
    if (typed === null) return 'cancelled';
    if (typed !== task.title) {
      deps.actions.toast('업무 제목이 일치하지 않습니다.');
      return 'mismatch';
    }
    confirmation = typed;
  }
  const reason = deps.prompt(
    kind === 'purge' ? '영구 삭제 사유를 입력하세요.' : '복원 사유를 입력하세요.',
    kind === 'purge' ? '테스트 데이터 영구 삭제' : '업무 복원',
  );
  if (reason === null) return 'cancelled';
  deps.setBusy(true);
  try {
    if (kind === 'purge') await deps.api.purgeTask(task.id, reason, confirmation);
    else await deps.api.restoreTask(task.id, reason);
    await deps.actions.refresh();
    deps.show(await deps.reads.trash());
    deps.actions.toast(kind === 'purge' ? '업무와 처리 이력을 영구 삭제했습니다.' : '업무를 복원했습니다.');
    return 'done';
  } catch (error) {
    deps.setBusy(false);
    deps.actions.toast(message(error));
    return 'failed';
  }
}
