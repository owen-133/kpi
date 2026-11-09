import type { AssignmentApi } from './AssignmentApi.ts';

// The assignee and test-data parts of the detail extensions (legacy bindTaskExtensions in public/kpi-ui.js).
// Pure flow functions: the component hands in the browser pieces (confirm, the button state, the detail reload).

export const REAL_TO_TEST_CONFIRM = '테스트 업무로 변경해 지표에서 제외할까요?';
export const TEST_TO_REAL_CONFIRM = '실제 업무로 변경해 지표에 포함할까요?';
export const TEST_DATA_TOAST = '데이터 구분을 변경했습니다.';
export const ASSIGNED_TOAST = '담당자를 배정했습니다.';

export type AssignmentDeps = {
  readonly api: Pick<AssignmentApi, 'assign' | 'markTestData'>;
  readonly toast: (message: string) => void;
  /** Reads the detail anew and draws it again (the legacy `reload`). */
  readonly reload: () => Promise<void>;
  readonly confirm: (message: string) => boolean;
  /** Disables (true) or enables (false) the assign button. */
  readonly setBusy: (on: boolean) => void;
};

export type AssignmentOutcome = 'done' | 'cancelled' | 'failed';

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export async function toggleTestData(taskId: string, isTest: boolean, deps: AssignmentDeps): Promise<AssignmentOutcome> {
  if (!deps.confirm(isTest ? TEST_TO_REAL_CONFIRM : REAL_TO_TEST_CONFIRM)) return 'cancelled';
  try {
    await deps.api.markTestData(taskId, !isTest);
    await deps.reload();
    deps.toast(TEST_DATA_TOAST);
    return 'done';
  } catch (error) {
    deps.toast(messageOf(error));
    return 'failed';
  }
}

/** The button stays disabled after a success: the redrawn detail replaces it. */
export async function assignTo(taskId: string, assignee: string, deps: AssignmentDeps): Promise<AssignmentOutcome> {
  deps.setBusy(true);
  try {
    await deps.api.assign(taskId, assignee);
    await deps.reload();
    deps.toast(ASSIGNED_TOAST);
    return 'done';
  } catch (error) {
    deps.toast(messageOf(error));
    deps.setBusy(false);
    return 'failed';
  }
}
