import type { CallLog } from '../../../../../../../shared/adapter/in/web/ui/testing/CallLog.ts';
import type { DetailActions } from '../detailFlow.ts';

/** Portal actions that write into the same CallLog as the fake API, so a test sees one ordered line of calls. */
export function recordingDetailActions(log: CallLog, overrides: Partial<DetailActions> = {}): DetailActions {
  return {
    toast: (message) => log.record('toast', [message]),
    refresh: async () => log.record('refresh', []),
    close: (dialog) => log.record('close', [dialog]),
    open: (dialog, params) => log.record('open', [dialog, params]),
    openDetail: async (id) => log.record('openDetail', [id]),
    ...overrides,
  };
}
