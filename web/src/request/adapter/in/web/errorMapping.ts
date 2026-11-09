// Database failure -> HTTP answer, as supabase-store.js `rpc` decides it for orbit_api and orbit_kpi:
//
//   SQLSTATE  raise-exception text                      legacy answer            here
//   PT400     (any, e.g. 식별자 또는 시각 형식을 확인하세요.,  400 {error: message}     HttpError(400, message)
//             완료 업무를 재개하는 사유를 입력하세요.,
//             올바른 상태를 선택하세요., 메모를 1~10000자로 ...)
//   PT404     업무를 찾을 수 없습니다.                    404 {error: message}     HttpError(404, message)
//   PT409     (conflict texts)                           409 {error: message}     HttpError(409, message)
//   other     (22P02, 42883 outside the KPI case, ...)   Error('Supabase request    rethrown as it is: the pipeline
//                                                        failed') -> generic 503   answers the generic 503 and logs
//                                                                                  the error name only
//
// PostgREST carried the PT codes as `code`; PGlite and postgres-js carry them as the SQLSTATE of the raise, which
// OrbitFunctionError exposes unchanged. The generic 503 body never contains the database message.
import { OrbitFunctionError } from '../../../../shared/port/OrbitFunctions.ts';
import { HttpError } from '../../../../shared/adapter/in/web/http.ts';

const STATUS_OF_PORTAL_CODE: Readonly<Record<string, number>> = { PT400: 400, PT404: 404, PT409: 409 };

export async function withLegacyErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof OrbitFunctionError && error.code !== undefined && error.code in STATUS_OF_PORTAL_CODE) {
      throw new HttpError(STATUS_OF_PORTAL_CODE[error.code], error.message);
    }
    throw error;
  }
}
