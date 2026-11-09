import type { ApiClient } from '../../../../../shared/adapter/in/web/ui/apiClient.ts';

/** GET and POST /api/settings. `values` is whatever is stored: the screen runs it through `normalizeSettings`. */
export type SettingsEnvelope = {
  readonly values: unknown;
  readonly revision: number;
  readonly available: boolean;
  readonly message?: string;
};

/** One row of GET /api/settings/history; before and after are stored settings the screen normalizes. */
export type SettingsHistoryEvent = {
  readonly at: string;
  readonly actor: string;
  readonly before: unknown;
  readonly after: unknown;
};

export type SaveSettingsBody = { readonly values: unknown; readonly revision: number };

export interface SettingsApi {
  get(): Promise<SettingsEnvelope>;
  history(): Promise<SettingsHistoryEvent[]>;
  save(body: SaveSettingsBody): Promise<SettingsEnvelope>;
}

export function createSettingsApi(client: ApiClient): SettingsApi {
  return {
    get: () => client.request<SettingsEnvelope>('settings'),
    history: () => client.request<SettingsHistoryEvent[]>('settings/history'),
    save: (body) => client.request<SettingsEnvelope>('settings', body),
  };
}
