import type { AutomationApi, AutomationSuggestion } from './AutomationApi.ts';

// The "자동 분류 · 유사 업무 찾기" box of the create dialog (legacy public/app.js, #automate-request). Pure flow.

export const EMPTY_TEXT_TOAST = '업무 제목이나 요청 내용을 먼저 입력하세요.';
export const APPLIED_TOAST = '추천 분류를 적용했습니다.';

export type AutomationDeps = {
  readonly api: AutomationApi;
  toast(message: string): void;
  /** Disables (true) or re-enables (false) the search button while the call runs. */
  setBusy(on: boolean): void;
};

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Title and description joined by one space. With nothing but blanks it toasts and calls nothing; a failed call toasts and returns null. */
export async function findSuggestions(form: { title: string; description: string }, deps: AutomationDeps): Promise<AutomationSuggestion | null> {
  const text = form.title + ' ' + form.description;
  if (!text.trim()) {
    deps.toast(EMPTY_TEXT_TOAST);
    return null;
  }
  deps.setBusy(true);
  try {
    return await deps.api.suggest(text);
  } catch (e) {
    deps.toast(messageOf(e));
    return null;
  } finally {
    deps.setBusy(false);
  }
}

/** "분류 적용": the category field takes the suggestion, then a toast. */
export function applySuggestion(category: string, setCategory: (category: string) => void, toast: (message: string) => void): void {
  setCategory(category);
  toast(APPLIED_TOAST);
}
