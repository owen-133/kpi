import { OrbitFunctionError } from '../../../../shared/port/OrbitFunctions.ts';
import { HttpError } from '../../../../shared/adapter/in/web/http.ts';
import { SettingsValidationError } from '../../../domain/PortalSettings.ts';
import { SettingsAccessDeniedError } from '../../../domain/SettingsAccess.ts';
import { SettingsMigrationRequiredError } from '../../../application/port/in/SettingsMigrationRequiredError.ts';

// Message-to-status mapping of the settings routes (legacy server.js `e.status` and supabase-store.js `rpc`):
//   invalid settings value           -> 400, the rule's own message
//   a caller who may not do this     -> 403, the rule's own message
//   database PT400 / PT404 / PT409   -> 400 / 404 / 409, the message the database function raised
//   settings function not installed  -> 503, the setup message (on read: 200 with `available: false`, see the use case)
//   any other error                  -> rethrown: the guard pipeline answers the generic 503 and logs only the error name
const DATABASE_STATUS: Readonly<Record<string, number>> = { PT400: 400, PT404: 404, PT409: 409 };

export function toHttpError(error: unknown): unknown {
  if (error instanceof SettingsValidationError) return new HttpError(400, error.message);
  if (error instanceof SettingsAccessDeniedError) return new HttpError(403, error.message);
  if (error instanceof SettingsMigrationRequiredError) return new HttpError(503, error.message);
  if (error instanceof OrbitFunctionError && error.code !== undefined && Object.hasOwn(DATABASE_STATUS, error.code)) {
    return new HttpError(DATABASE_STATUS[error.code], error.message);
  }
  return error;
}
