import type { SettingsActor } from '../../../domain/SettingsAccess.ts';

export interface ListSettingsHistoryQuery {
  list(actor: SettingsActor): Promise<unknown>;
}
