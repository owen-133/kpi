import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { ListTrashQuery } from '../port/in/ListTrashQuery.ts';

export class ListTrashService implements ListTrashQuery {
  private readonly functions: OrbitFunctions;

  constructor(functions: OrbitFunctions) {
    this.functions = functions;
  }

  list(): Promise<unknown> {
    return this.functions.call('orbit_lifecycle', { action: 'trash', payload: {} });
  }
}
