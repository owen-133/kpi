// Legacy server.js: GET and POST /api/improvements, GET /api/improvements/<id>/history.
// The id of the history route is the raw path segment, as the legacy regex captures it.
import { jsonResponse } from '../../../../shared/adapter/in/web/http.ts';
import type { RouteContext, RouteDefinition } from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import type { ImprovementUseCases } from '../../../application/port/in/ImprovementUseCases.ts';
import { toHttpError } from './errorStatus.ts';
import { saveBodySchema } from './schemas.ts';

async function translated<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw toHttpError(error);
  }
}

export function improvementRoutes(useCases: ImprovementUseCases): readonly RouteDefinition[] {
  return [
    { method: 'GET', pattern: '/api/improvements', handler: async () => jsonResponse(200, await translated(() => useCases.list.list())) },
    {
      method: 'POST',
      pattern: '/api/improvements',
      handler: async ({ body }: RouteContext) => {
        const command = saveBodySchema.parse(body);
        return jsonResponse(201, await translated(() => useCases.save.save(command)));
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/improvements\/([^/]+)\/history$/,
      handler: async ({ params }: RouteContext) => jsonResponse(200, await translated(() => useCases.history.history(params[0]))),
    },
  ];
}
