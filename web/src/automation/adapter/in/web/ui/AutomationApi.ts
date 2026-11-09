import type { ApiClient } from '../../../../../shared/adapter/in/web/ui/apiClient.ts';
import type { Classification, SimilarTask } from '../../../../domain/automation.ts';

/** POST /api/automation */
export type AutomationSuggestion = {
  readonly classification: Classification;
  readonly similar: readonly SimilarTask[];
  readonly method: string;
};

export interface AutomationApi {
  suggest(text: string): Promise<AutomationSuggestion>;
}

export function createAutomationApi(client: ApiClient): AutomationApi {
  return {
    suggest: (text) => client.request<AutomationSuggestion>('automation', { text }),
  };
}
