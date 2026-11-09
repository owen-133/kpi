import { CallLog } from '../../../../../../shared/adapter/in/web/ui/testing/CallLog.ts';
import type { AutomationApi, AutomationSuggestion } from '../AutomationApi.ts';

export class FakeAutomationApi implements AutomationApi {
  readonly log = new CallLog();
  suggestion: AutomationSuggestion = {
    classification: { category: '기타', method: '키워드 규칙', reason: '' },
    similar: [],
    method: '',
  };

  async suggest(text: string): Promise<AutomationSuggestion> {
    this.log.record('suggest', [text]);
    return structuredClone(this.suggestion);
  }
}
