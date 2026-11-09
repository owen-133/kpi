import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { SettingsUseCases } from '../port/in/SettingsUseCases.ts';
import { GetSettingsService } from './GetSettingsService.ts';
import { ListSettingsHistoryService } from './ListSettingsHistoryService.ts';
import { SaveSettingsService } from './SaveSettingsService.ts';

/** `database` opens the database on first use, so building the use cases never connects. */
export function createSettingsUseCases(database: () => Promise<OrbitFunctions>): SettingsUseCases {
  return {
    getSettings: new GetSettingsService(database),
    saveSettings: new SaveSettingsService(database),
    listSettingsHistory: new ListSettingsHistoryService(database),
  };
}
