import type { GetSettingsQuery } from './GetSettingsQuery.ts';
import type { ListSettingsHistoryQuery } from './ListSettingsHistoryQuery.ts';
import type { SaveSettingsUseCase } from './SaveSettingsUseCase.ts';

export type SettingsUseCases = {
  readonly getSettings: GetSettingsQuery;
  readonly saveSettings: SaveSettingsUseCase;
  readonly listSettingsHistory: ListSettingsHistoryQuery;
};
