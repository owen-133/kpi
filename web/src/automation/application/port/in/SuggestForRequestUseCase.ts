import type { Classification, SimilarTask } from '../../../domain/automation.ts';

export type AutomationSuggestion = {
  readonly classification: Classification;
  readonly similar: readonly SimilarTask[];
  readonly method: string;
};

export interface SuggestForRequestUseCase {
  /** `text` is the request text as typed (already cut to the length the suggestions look at). */
  suggest(text: string): Promise<AutomationSuggestion>;
}
