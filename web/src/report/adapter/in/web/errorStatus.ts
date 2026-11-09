// Message-to-status mapping of the report routes (the legacy rpc/guard mapping):
//   InvalidMonthError, FutureMonthError, DraftTooLongError -> 400      StaleFingerprintError -> 409
//   database exception PT400 / PT404 / PT409 -> 400 / 404 / 409 with the exception message
//   anything else is rethrown and the guard answers the generic 503.
import { OrbitFunctionError } from '../../../../shared/port/OrbitFunctions.ts';
import { HttpError } from '../../../../shared/adapter/in/web/http.ts';
import { DraftTooLongError, FutureMonthError, InvalidMonthError } from '../../../domain/ReportErrors.ts';
import { StaleFingerprintError } from '../../../application/port/in/StaleFingerprintError.ts';

const DATABASE_STATUS: Record<string, number> = { PT400: 400, PT404: 404, PT409: 409 };

export function toHttpError(error: unknown): unknown {
  if (error instanceof StaleFingerprintError) return new HttpError(409, error.message);
  if (error instanceof InvalidMonthError || error instanceof FutureMonthError || error instanceof DraftTooLongError) return new HttpError(400, error.message);
  if (error instanceof OrbitFunctionError && error.code !== undefined && DATABASE_STATUS[error.code] !== undefined) {
    return new HttpError(DATABASE_STATUS[error.code], error.message);
  }
  return error;
}
