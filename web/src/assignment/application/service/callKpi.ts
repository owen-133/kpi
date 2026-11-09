import { OrbitFunctionError } from '../../../shared/port/OrbitFunctions.ts';
import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import { KpiMigrationRequiredError, TaskRejectedError } from '../TaskRejectedError.ts';

const UNDEFINED_FUNCTION = '42883';

/**
 * One orbit_kpi call. The portal's own refusals (PT400 / PT404 / PT409) become TaskRejectedError, a missing function
 * becomes KpiMigrationRequiredError; every other failure passes through unchanged (the web adapter answers 503).
 */
export async function callKpi(orbit: OrbitFunctions, action: string, payload: unknown): Promise<unknown> {
  try {
    return await orbit.call('orbit_kpi', { action, payload });
  } catch (error) {
    if (error instanceof OrbitFunctionError) {
      if (error.code === 'PT400') throw new TaskRejectedError('invalid', error.message);
      if (error.code === 'PT404') throw new TaskRejectedError('not-found', error.message);
      if (error.code === 'PT409') throw new TaskRejectedError('conflict', error.message);
      if (error.code === UNDEFINED_FUNCTION) throw new KpiMigrationRequiredError();
    }
    throw error;
  }
}
