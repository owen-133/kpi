import { z } from 'zod';
import { HttpError, jsonResponse } from '../../../../shared/adapter/in/web/http.ts';
import type { RouteDefinition } from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import { OrbitFunctionError } from '../../../../shared/port/OrbitFunctions.ts';
import type { AutomationUseCases } from '../../../application/port/in/AutomationUseCases.ts';

const MAX_TEXT_LENGTH = 20000;

// Legacy: `String(body.text||'').slice(0,20000)` -- a missing, empty or falsy text is the empty text, anything else is its text form.
const automationBody = z.object({
  text: z.unknown().optional().transform((value) => String(value || '').slice(0, MAX_TEXT_LENGTH)),
});

// Message-to-status mapping (legacy supabase-store.js `rpc`): database PT400 / PT404 / PT409 -> 400 / 404 / 409 with the
// function's own message; anything else is rethrown and the guard pipeline answers the generic 503 (logging only the error name).
const DATABASE_STATUS: Readonly<Record<string, number>> = { PT400: 400, PT404: 404, PT409: 409 };

function toHttpError(error: unknown): unknown {
  if (error instanceof OrbitFunctionError && error.code !== undefined && Object.hasOwn(DATABASE_STATUS, error.code)) {
    return new HttpError(DATABASE_STATUS[error.code], error.message);
  }
  return error;
}

export function automationRoutes(useCases: AutomationUseCases): readonly RouteDefinition[] {
  return [
    {
      method: 'POST',
      pattern: '/api/automation',
      handler: async (context) => {
        const { text } = automationBody.parse(context.body);
        try {
          return jsonResponse(200, await useCases.suggestForRequest.suggest(text));
        } catch (error) {
          throw toHttpError(error);
        }
      },
    },
  ];
}
