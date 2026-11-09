// Message-to-status mapping of the improvement routes (the legacy rpc/guard mapping):
//   InvalidImprovementError -> 400 with its message
//   database exception PT400 / PT404 / PT409 -> 400 / 404 / 409 with the exception message
//   anything else is rethrown and the guard answers the generic 503.
import { OrbitFunctionError } from '../../../../shared/port/OrbitFunctions.ts';
import { HttpError } from '../../../../shared/adapter/in/web/http.ts';
import { InvalidImprovementError } from '../../../domain/ImprovementValue.ts';

const DATABASE_STATUS: Record<string, number> = { PT400: 400, PT404: 404, PT409: 409 };

export function toHttpError(error: unknown): unknown {
  if (error instanceof InvalidImprovementError) return new HttpError(400, error.message);
  if (error instanceof OrbitFunctionError && error.code !== undefined && DATABASE_STATUS[error.code] !== undefined) {
    return new HttpError(DATABASE_STATUS[error.code], error.message);
  }
  return error;
}
