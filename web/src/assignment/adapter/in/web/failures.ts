import { HttpError } from '../../../../shared/adapter/in/web/http.ts';
import { KpiMigrationRequiredError, TaskRejectedError } from '../../../application/TaskRejectedError.ts';

/**
 * Message-to-status mapping of this context's routes (the legacy server.js sends `{error: message}` with the status):
 *
 *   failure                                  status  message
 *   ---------------------------------------  ------  ------------------------------------------
 *   body schema refused (domain rule)        400     the rule's own message (assignee range, data flag)
 *   TaskRejectedError 'invalid'  (PT400)     400     database message (e.g. malformed id: 입력 형식을 확인하세요.)
 *   TaskRejectedError 'not-found' (PT404)    404     database message (업무를 찾을 수 없습니다.)
 *   TaskRejectedError 'conflict' (PT409)     409     database message
 *   KpiMigrationRequiredError (no function)  503     KPI 기능 DB 초기화가 필요합니다. ...
 *   anything else                            -       rethrown: the pipeline answers 503 and logs only the error name
 */
const STATUS: Record<TaskRejectedError['reason'], number> = { invalid: 400, 'not-found': 404, conflict: 409 };

export async function withHttpFailures(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof TaskRejectedError) throw new HttpError(STATUS[error.reason], error.message);
    if (error instanceof KpiMigrationRequiredError) throw new HttpError(503, error.message);
    throw error;
  }
}
