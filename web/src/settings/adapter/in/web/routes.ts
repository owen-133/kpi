import { z } from 'zod';
import { HttpError, jsonResponse } from '../../../../shared/adapter/in/web/http.ts';
import type { RouteDefinition } from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import { isSettingsRevision } from '../../../domain/PortalSettings.ts';
import type { SettingsUseCases } from '../../../application/port/in/SettingsUseCases.ts';
import { toHttpError } from './settingsErrors.ts';

// Legacy order of the save route: revision shape first (400), then the values (400, domain rules), then the database (409 ...).
const saveBody = z.object({
  revision: z.custom<number>(isSettingsRevision, { error: '설정 버전을 확인하세요.' }),
  // a missing `values` is for the domain to refuse with its own message
  values: z.unknown().optional(),
});

async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw toHttpError(error);
  }
}

/** The viewer is refused writes by the guard pipeline already; the use cases check the actor again. */
export function settingsRoutes(useCases: SettingsUseCases): readonly RouteDefinition[] {
  return [
    { method: 'GET', pattern: '/api/settings', handler: async () => jsonResponse(200, await guarded(() => useCases.getSettings.get())) },
    {
      method: 'GET',
      pattern: '/api/settings/history',
      handler: async (context) => jsonResponse(200, await guarded(() => useCases.listSettingsHistory.list(context.role))),
    },
    {
      method: 'POST',
      pattern: '/api/settings',
      handler: async (context) => {
        const parsed = saveBody.safeParse(context.body);
        if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
        const { revision, values } = parsed.data;
        return jsonResponse(200, await guarded(() => useCases.saveSettings.save({ actor: context.role, revision, values })));
      },
    },
  ];
}
