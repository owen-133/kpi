import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { GetKpiStatusQuery, KpiStatus } from '../port/in/GetKpiStatusQuery.ts';
import { KpiMigrationRequiredError } from '../TaskRejectedError.ts';
import { callKpi } from './callKpi.ts';

export class GetKpiStatusService implements GetKpiStatusQuery {
  private readonly orbit: OrbitFunctions;

  constructor(orbit: OrbitFunctions) {
    this.orbit = orbit;
  }

  /** The KPI functions count as available when their extras can be read (the legacy probe). */
  async status(): Promise<KpiStatus> {
    try {
      await callKpi(this.orbit, 'extras', {});
      return { available: true };
    } catch (error) {
      if (error instanceof KpiMigrationRequiredError) return { available: false, message: error.message };
      throw error;
    }
  }
}
