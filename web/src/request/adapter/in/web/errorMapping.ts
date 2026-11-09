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
// Two routes have their own rows because the legacy store maps them differently from orbit_api / orbit_kpi:
//
//   POST /api/tasks/:id/edit            (store.edit -> orbit_edit_task)
//     PT400 / PT404 / PT409             400 / 404 / 409 {error: message}
//     42883 (PGRST202: not installed)   503 {error: '업무 수정 기능 DB 초기화가 필요합니다. supabase/edit.sql을 SQL Editor에서 실행하세요.'}
//     any other database failure        503 {error: '업무 수정 저장에 실패했습니다.'}   (not the generic text)
//   delete / restore / purge / trash / lifecycle-history  (rpc on orbit_lifecycle)
//     PT400 / PT404 / PT409             as the table above
//     42883 (PGRST202: not installed)   503 {error: '삭제 기능 DB 초기화가 필요합니다. supabase/deletion.sql을 SQL Editor에서 실행하세요.'}
//     any other database failure        generic 503, as above
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

const EDIT_NOT_INSTALLED = '업무 수정 기능 DB 초기화가 필요합니다. supabase/edit.sql을 SQL Editor에서 실행하세요.';
const EDIT_FAILED = '업무 수정 저장에 실패했습니다.';
const LIFECYCLE_NOT_INSTALLED = '삭제 기능 DB 초기화가 필요합니다. supabase/deletion.sql을 SQL Editor에서 실행하세요.';
const UNDEFINED_FUNCTION = '42883';

function portalFailure(error: unknown): HttpError | undefined {
  if (error instanceof OrbitFunctionError && error.code !== undefined && error.code in STATUS_OF_PORTAL_CODE) {
    return new HttpError(STATUS_OF_PORTAL_CODE[error.code], error.message);
  }
  return undefined;
}

/** Legacy `store.edit`: every database failure that is not a portal error is a 503 with a message of its own. */
export async function withEditErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const mapped = portalFailure(error);
    if (mapped !== undefined) throw mapped;
    if (error instanceof OrbitFunctionError) throw new HttpError(503, error.code === UNDEFINED_FUNCTION ? EDIT_NOT_INSTALLED : EDIT_FAILED);
    throw error;
  }
}

/** Legacy `rpc(..., 'orbit_lifecycle')`: like the shared mapping, plus the "not installed" 503. */
export async function withLifecycleErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await withLegacyErrors(run);
  } catch (error) {
    if (error instanceof OrbitFunctionError && error.code === UNDEFINED_FUNCTION) throw new HttpError(503, LIFECYCLE_NOT_INSTALLED);
    throw error;
  }
}
