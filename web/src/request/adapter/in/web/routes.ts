import type { RouteDefinition } from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import type { RequestUseCases } from '../../../application/port/in/RequestUseCases.ts';
import { createHandlers } from './handlers.ts';

// Legacy server.js routes of the request context. The id segment is `[^/]+` like the legacy pattern; whether it is a
// uuid is decided by the database function (PT400), as before. The edit/delete/restore/purge/trash routes of the same
// path family are added here by a later chunk.
export function requestRoutes(useCases: RequestUseCases): readonly RouteDefinition[] {
  const handlers = createHandlers(useCases);
  return [
    { method: 'GET', pattern: '/api/tasks', handler: handlers.list },
    { method: 'POST', pattern: '/api/tasks', handler: handlers.create },
    { method: 'GET', pattern: /^\/api\/tasks\/([^/]+)$/, handler: handlers.detail },
    { method: 'POST', pattern: /^\/api\/tasks\/([^/]+)\/status$/, handler: handlers.changeStatus },
    { method: 'POST', pattern: /^\/api\/tasks\/([^/]+)\/notes$/, handler: handlers.addNote },
  ];
}
