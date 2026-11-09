import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import { assertEditableRevision, validateImprovement } from '../../domain/ImprovementValue.ts';
import type {
  ImprovementHistoryQuery,
  ImprovementUseCases,
  ListImprovementsQuery,
  SaveImprovementCommand,
  SaveImprovementUseCase,
} from '../port/in/ImprovementUseCases.ts';

type Database = () => Promise<OrbitFunctions>;

export class ListImprovementsService implements ListImprovementsQuery {
  private readonly orbit: Database;

  constructor(orbit: Database) {
    this.orbit = orbit;
  }

  async list(): Promise<unknown> {
    return (await this.orbit()).call('orbit_kpi', { action: 'improvements', payload: {} });
  }
}

export class SaveImprovementService implements SaveImprovementUseCase {
  private readonly orbit: Database;

  constructor(orbit: Database) {
    this.orbit = orbit;
  }

  async save(command: SaveImprovementCommand): Promise<unknown> {
    const value = validateImprovement(command.value);
    if (command.id) assertEditableRevision(command.revision);
    const payload = { id: command.id, revision: command.revision, value };
    return (await this.orbit()).call('orbit_kpi', { action: 'improvement_save', payload });
  }
}

export class ImprovementHistoryService implements ImprovementHistoryQuery {
  private readonly orbit: Database;

  constructor(orbit: Database) {
    this.orbit = orbit;
  }

  async history(id: string): Promise<unknown> {
    return (await this.orbit()).call('orbit_kpi', { action: 'improvement_history', payload: { id } });
  }
}

/** Composition helper for config/container.ts: every improvement use case over one database accessor. */
export function createImprovementUseCases(orbit: Database): ImprovementUseCases {
  return { list: new ListImprovementsService(orbit), save: new SaveImprovementService(orbit), history: new ImprovementHistoryService(orbit) };
}
