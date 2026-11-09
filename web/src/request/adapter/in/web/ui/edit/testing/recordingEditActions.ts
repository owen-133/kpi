import type { CallLog } from '../../../../../../../shared/adapter/in/web/ui/testing/CallLog.ts';
import type { EditActions } from '../editFlow.ts';

/** Portal actions that write into the same CallLog as the fake API, so a test sees one ordered line of calls. */
export function recordingEditActions(log: CallLog, overrides: Partial<EditActions> = {}): EditActions {
  return {
    toast: (message) => log.record('toast', [message]),
    refresh: async () => log.record('refresh', []),
    close: (dialog) => log.record('close', [dialog]),
    openDetail: async (id) => log.record('openDetail', [id]),
    ...overrides,
  };
}
