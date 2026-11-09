import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { TaskDetail, TaskKpiDetail } from '../../domain/TaskRecord.ts';
import type { GetTaskDetailQuery } from '../port/in/GetTaskDetailQuery.ts';
import { KPI_MIGRATION_MESSAGE, isKpiMissing } from './kpiAvailability.ts';

export { KPI_MIGRATION_MESSAGE };

export class GetTaskDetailService implements GetTaskDetailQuery {
  private readonly functions: OrbitFunctions;

  constructor(functions: OrbitFunctions) {
    this.functions = functions;
  }

  async detail(id: string, includeDeleted: boolean): Promise<TaskDetail | null> {
    const task = (await this.functions.call('orbit_api', { action: 'detail', payload: { id, include_deleted: includeDeleted } })) as TaskDetail | null;
    if (task === null) return null;
    if (task.deleted_at) return task;
    return { ...task, kpi: await this.kpi(id) };
  }

  private async kpi(id: string): Promise<TaskKpiDetail> {
    try {
      return (await this.functions.call('orbit_kpi', { action: 'detail', payload: { id } })) as TaskKpiDetail;
    } catch (error) {
      if (isKpiMissing(error)) return { available: false, message: KPI_MIGRATION_MESSAGE, files: [] };
      throw error;
    }
  }
}
