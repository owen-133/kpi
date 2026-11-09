// Legacy server.js: GET /api/kpi-status, GET /api/report-preview, GET and POST /api/reports.
// Writes by a viewer never get here: the guard answers 403 for every non-GET first.
import { jsonResponse } from '../../../../shared/adapter/in/web/http.ts';
import type { RouteContext, RouteDefinition } from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import type { ReportUseCases } from '../../../application/port/in/ReportUseCases.ts';
import { toHttpError } from './errorStatus.ts';
import { previewQuerySchema, publishBodySchema } from './schemas.ts';

async function translated<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw toHttpError(error);
  }
}

export function reportRoutes(useCases: ReportUseCases): readonly RouteDefinition[] {
  return [
    { method: 'GET', pattern: '/api/kpi-status', handler: async () => jsonResponse(200, await translated(() => useCases.kpiStatus.status())) },
    {
      method: 'GET',
      pattern: '/api/report-preview',
      handler: async ({ url }: RouteContext) => {
        const { month } = previewQuerySchema.parse({ month: url.searchParams.get('month') });
        return jsonResponse(200, await translated(() => useCases.preview.preview(month)));
      },
    },
    { method: 'GET', pattern: '/api/reports', handler: async () => jsonResponse(200, await translated(() => useCases.list.list())) },
    {
      method: 'POST',
      pattern: '/api/reports',
      handler: async ({ body }: RouteContext) => {
        const command = publishBodySchema.parse(body);
        return jsonResponse(201, await translated(() => useCases.publish.publish(command)));
      },
    },
  ];
}
