import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { KpiTask } from '../../domain/KpiTask.ts';

/** The task list merged with the KPI extras rows by task id (the extras win), like the legacy taskSnapshot. */
export async function loadTaskSnapshot(orbit: OrbitFunctions): Promise<KpiTask[]> {
  const list = (await orbit.call('orbit_api', { action: 'list', payload: {} })) as KpiTask[];
  const extras = (await orbit.call('orbit_kpi', { action: 'extras', payload: {} })) as Array<{ task_id: unknown }>;
  const byId = new Map(extras.map((e) => [e.task_id, e]));
  return list.map((t) => ({ ...t, ...byId.get(t.id) }));
}
