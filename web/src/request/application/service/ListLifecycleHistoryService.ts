import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { ListLifecycleHistoryQuery } from '../port/in/ListLifecycleHistoryQuery.ts';

export class ListLifecycleHistoryService implements ListLifecycleHistoryQuery {
  private readonly functions: OrbitFunctions;

  constructor(functions: OrbitFunctions) {
    this.functions = functions;
  }

  list(): Promise<unknown> {
    return this.functions.call('orbit_lifecycle', { action: 'history', payload: {} });
  }
}
