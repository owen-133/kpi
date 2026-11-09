import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { TaskRecord } from '../../domain/TaskRecord.ts';
import type { ListTasksQuery } from '../port/in/ListTasksQuery.ts';
import { isKpiMissing } from './kpiAvailability.ts';

export class ListTasksService implements ListTasksQuery {
  private readonly functions: OrbitFunctions;

  constructor(functions: OrbitFunctions) {
    this.functions = functions;
  }

  async list(): Promise<readonly TaskRecord[]> {
    const tasks = (await this.functions.call('orbit_api', { action: 'list', payload: {} })) as TaskRecord[];
    const extras = await this.extras();
    const byTask = new Map(extras.map((row) => [row.task_id, row]));
    return tasks.map((task) => ({ ...task, ...byTask.get(task.id) }));
  }

  private async extras(): Promise<Array<Record<string, unknown>>> {
    try {
      return (await this.functions.call('orbit_kpi', { action: 'extras', payload: {} })) as Array<Record<string, unknown>>;
    } catch (error) {
      if (isKpiMissing(error)) return [];
      throw error;
    }
  }
}
