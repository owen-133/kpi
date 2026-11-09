import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import { assertCanReadSettingsHistory } from '../../domain/SettingsAccess.ts';
import type { SettingsActor } from '../../domain/SettingsAccess.ts';
import type { ListSettingsHistoryQuery } from '../port/in/ListSettingsHistoryQuery.ts';
import { SettingsMigrationRequiredError } from '../port/in/SettingsMigrationRequiredError.ts';
import { isFunctionMissing } from './functionMissing.ts';

export class ListSettingsHistoryService implements ListSettingsHistoryQuery {
  private readonly database: () => Promise<OrbitFunctions>;

  constructor(database: () => Promise<OrbitFunctions>) {
    this.database = database;
  }

  async list(actor: SettingsActor): Promise<unknown> {
    assertCanReadSettingsHistory(actor);
    try {
      const functions = await this.database();
      return await functions.call('orbit_settings', { action: 'history', payload: {} });
    } catch (error) {
      if (isFunctionMissing(error)) throw new SettingsMigrationRequiredError();
      throw error;
    }
  }
}
