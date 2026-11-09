import { CallLog } from '../../../../../../shared/adapter/in/web/ui/testing/CallLog.ts';
import type { ImprovementApi, ImprovementHistoryEvent, ImprovementItem, SaveImprovementBody } from '../ImprovementApi.ts';

export class FakeImprovementApi implements ImprovementApi {
  readonly log = new CallLog();
  items: ImprovementItem[] = [];
  events = new Map<string, ImprovementHistoryEvent[]>();
  nextId = 'new-improvement';

  async list(): Promise<ImprovementItem[]> {
    this.log.record('list', []);
    return structuredClone(this.items);
  }

  async history(id: string): Promise<ImprovementHistoryEvent[]> {
    this.log.record('history', [id]);
    return structuredClone(this.events.get(id) ?? []);
  }

  async save(body: SaveImprovementBody): Promise<{ readonly id: string }> {
    this.log.record('save', [body]);
    return { id: body.id ?? this.nextId };
  }
}
