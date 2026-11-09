import { DraftTooLongError } from './ReportErrors.ts';

export const REPORT_DRAFT_LIMIT = 20000;

/**
 * The text to publish: the given draft, or the rule-based one when it is falsy, trimmed.
 * A whitespace-only draft is truthy, so it is published as an empty text (observed legacy behavior).
 * The limit counts UTF-16 code units after the trim.
 */
export function resolveReportDraft(given: unknown, ruleBasedDraft: () => string): string {
  const draft = String(given || ruleBasedDraft()).trim();
  if (draft.length > REPORT_DRAFT_LIMIT) throw new DraftTooLongError();
  return draft;
}
