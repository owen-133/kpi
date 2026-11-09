import type { CallLog } from '../../../../../../../shared/adapter/in/web/ui/testing/CallLog.ts';
import type { TrashActions } from '../trashFlow.ts';

/** Portal actions that write into the same CallLog as the fake API, so a test sees one ordered line of calls. */
export function recordingTrashActions(log: CallLog, overrides: Partial<TrashActions> = {}): TrashActions {
  return {
    toast: (message) => log.record('toast', [message]),
    refresh: async () => log.record('refresh', []),
    close: (dialog) => log.record('close', [dialog]),
    openDetail: async (id) => log.record('openDetail', [id]),
    ...overrides,
  };
}

/** A scripted window.prompt: answers in order and records every question with its default. */
export function scriptedPrompt(answers: Array<string | null>): { prompt: (message: string, defaultValue?: string) => string | null; asked: Array<{ message: string; defaultValue?: string }> } {
  const asked: Array<{ message: string; defaultValue?: string }> = [];
  const queue = [...answers];
  return {
    asked,
    prompt: (message, defaultValue) => {
      asked.push({ message, defaultValue });
      if (queue.length === 0) throw new Error('unexpected prompt: ' + message);
      return queue.shift() as string | null;
    },
  };
}
