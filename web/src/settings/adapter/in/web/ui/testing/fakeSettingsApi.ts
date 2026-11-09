import { CallLog } from '../../../../../../shared/adapter/in/web/ui/testing/CallLog.ts';
import type { SaveSettingsBody, SettingsApi, SettingsEnvelope, SettingsHistoryEvent } from '../SettingsApi.ts';

export class FakeSettingsApi implements SettingsApi {
  readonly log = new CallLog();
  envelope: SettingsEnvelope = { values: {}, revision: 0, available: true };
  events: SettingsHistoryEvent[] = [];

  async get(): Promise<SettingsEnvelope> {
    this.log.record('get', []);
    return structuredClone(this.envelope);
  }

  async history(): Promise<SettingsHistoryEvent[]> {
    this.log.record('history', []);
    return structuredClone(this.events);
  }

  /** Stores what was sent and moves the revision on, like the server. */
  async save(body: SaveSettingsBody): Promise<SettingsEnvelope> {
    this.log.record('save', [body]);
    this.envelope = { values: structuredClone(body.values), revision: body.revision + 1, available: true };
    return structuredClone(this.envelope);
  }
}
