import type { RouteDefinition } from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import type { RequestUseCases } from '../../../application/port/in/RequestUseCases.ts';
import { createHandlers } from './handlers.ts';

// Legacy server.js routes of the request context. The id segment is `[^/]+` like the legacy pattern; whether it is a
// uuid is decided by the database function (PT400), as before. Edit, delete, restore and purge are POST routes of the
// same family; the trash and the deletion history are administrator-only GET routes.
export function requestRoutes(useCases: RequestUseCases): readonly RouteDefinition[] {
  const handlers = createHandlers(useCases);
  return [
    { method: 'GET', pattern: '/api/tasks', handler: handlers.list },
    { method: 'POST', pattern: '/api/tasks', handler: handlers.create },
    { method: 'GET', pattern: /^\/api\/tasks\/([^/]+)$/, handler: handlers.detail },
    { method: 'POST', pattern: /^\/api\/tasks\/([^/]+)\/status$/, handler: handlers.changeStatus },
    { method: 'POST', pattern: /^\/api\/tasks\/([^/]+)\/notes$/, handler: handlers.addNote },
    { method: 'POST', pattern: /^\/api\/tasks\/([^/]+)\/edit$/, handler: handlers.edit },
    { method: 'POST', pattern: /^\/api\/tasks\/([^/]+)\/delete$/, handler: handlers.lifecycle('delete') },
    { method: 'POST', pattern: /^\/api\/tasks\/([^/]+)\/restore$/, handler: handlers.lifecycle('restore') },
    { method: 'POST', pattern: /^\/api\/tasks\/([^/]+)\/purge$/, handler: handlers.lifecycle('purge') },
    { method: 'GET', pattern: '/api/trash', handler: handlers.trash },
    { method: 'GET', pattern: '/api/lifecycle-history', handler: handlers.lifecycleHistory },
  ];
}
