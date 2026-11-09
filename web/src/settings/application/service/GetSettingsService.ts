import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import { DEFAULT_SETTINGS, normalizeSettings } from '../../domain/PortalSettings.ts';
import type { GetSettingsQuery, SettingsView } from '../port/in/GetSettingsQuery.ts';
import { SettingsMigrationRequiredError } from '../port/in/SettingsMigrationRequiredError.ts';
import { isFunctionMissing } from './functionMissing.ts';

export class GetSettingsService implements GetSettingsQuery {
  private readonly database: () => Promise<OrbitFunctions>;

  constructor(database: () => Promise<OrbitFunctions>) {
    this.database = database;
  }

  async get(): Promise<SettingsView> {
    try {
      const functions = await this.database();
      const stored = (await functions.call('orbit_settings', { action: 'get', payload: {} })) as SettingsView;
      return { ...stored, values: normalizeSettings(stored.values) };
    } catch (error) {
      if (!isFunctionMissing(error)) throw error;
      return { values: DEFAULT_SETTINGS, revision: 0, available: false, message: new SettingsMigrationRequiredError().message };
    }
  }
}
