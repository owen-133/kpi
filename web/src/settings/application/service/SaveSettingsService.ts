import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import { validateSettings } from '../../domain/PortalSettings.ts';
import { assertCanChangeSettings } from '../../domain/SettingsAccess.ts';
import type { SaveSettingsCommand, SaveSettingsUseCase } from '../port/in/SaveSettingsUseCase.ts';
import { SettingsMigrationRequiredError } from '../port/in/SettingsMigrationRequiredError.ts';
import { isFunctionMissing } from './functionMissing.ts';

export class SaveSettingsService implements SaveSettingsUseCase {
  private readonly database: () => Promise<OrbitFunctions>;

  constructor(database: () => Promise<OrbitFunctions>) {
    this.database = database;
  }

  async save(command: SaveSettingsCommand): Promise<unknown> {
    assertCanChangeSettings(command.actor);
    const values = validateSettings(command.values);
    try {
      const functions = await this.database();
      return await functions.call('orbit_settings', { action: 'save', payload: { values, revision: command.revision } });
    } catch (error) {
      if (isFunctionMissing(error)) throw new SettingsMigrationRequiredError();
      throw error;
    }
  }
}
