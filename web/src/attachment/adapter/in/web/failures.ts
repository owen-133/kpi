import { HttpError } from '../../../../shared/adapter/in/web/http.ts';
import { AttachmentRejectedError, KpiMigrationRequiredError } from '../../../application/port/in/AttachmentRejectedError.ts';

/**
 * Message-to-status mapping of this context's routes (the legacy server.js sends `{error: message}` with the status):
 *
 *   failure                                      status  message
 *   -------------------------------------------  ------  --------------------------------------------------
 *   upload body refused (domain rule)            400     지원 파일: PDF·이미지·TXT·CSV·XLSX·DOCX, 최대 1MB
 *                                                        or 첨부파일은 1MB 이하여야 합니다. (decoded size)
 *   AttachmentRejectedError 'invalid' (PT400)    400     database message (업무당 첨부파일은 10개까지 가능합니다.,
 *                                                        malformed id: 입력 형식을 확인하세요.)
 *   AttachmentRejectedError 'not-found' (PT404)  404     database message (업무를 찾을 수 없습니다. / 파일을 찾을 수 없습니다.)
 *   AttachmentRejectedError 'conflict' (PT409)   409     database message
 *   KpiMigrationRequiredError (no function)      503     KPI 기능 DB 초기화가 필요합니다. ...
 *   anything else                                -       rethrown: the pipeline answers 503 and logs only the error name
 */
const STATUS: Record<AttachmentRejectedError['reason'], number> = { invalid: 400, 'not-found': 404, conflict: 409 };

export async function withHttpFailures(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof AttachmentRejectedError) throw new HttpError(STATUS[error.reason], error.message);
    if (error instanceof KpiMigrationRequiredError) throw new HttpError(503, error.message);
    throw error;
  }
}
