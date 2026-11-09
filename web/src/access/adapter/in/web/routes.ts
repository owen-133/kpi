import type { AuthorizeRequestUseCase } from '../../../application/port/in/AuthorizeRequestUseCase.ts';
import { jsonResponse } from '../../../../shared/adapter/in/web/http.ts';
import type { RouteDefinition } from '../../../../shared/adapter/in/web/RouteRegistry.ts';

// Legacy server.js: `/health` answers GET before authentication; `/api/session` answers any method.
export function accessRoutes(authorize: AuthorizeRequestUseCase): readonly RouteDefinition[] {
  return [
    { method: 'GET', pattern: '/health', isPublic: true, handler: () => jsonResponse(200, { ok: true }) },
    { method: 'ANY', pattern: '/api/session', handler: (context) => jsonResponse(200, authorize.describeSession(context.role)) },
  ];
}
