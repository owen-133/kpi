import type { Role } from '../../../../../access/domain/Role.ts';
import type { ApiClient } from '../../../../../shared/adapter/in/web/ui/apiClient.ts';

/** GET /api/session */
export type SessionView = { readonly role: Role; readonly shared: boolean };

export interface PortalApi {
  session(): Promise<SessionView>;
}

export function createPortalApi(client: ApiClient): PortalApi {
  return {
    session: () => client.request<SessionView>('session'),
  };
}
