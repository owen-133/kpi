import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { KpiStatusQuery, ListReportsQuery } from '../port/in/ReportUseCases.ts';

export class ListReportsService implements ListReportsQuery {
  private readonly orbit: () => Promise<OrbitFunctions>;

  constructor(orbit: () => Promise<OrbitFunctions>) {
    this.orbit = orbit;
  }

  async list(): Promise<unknown> {
    return (await this.orbit()).call('orbit_kpi', { action: 'reports', payload: {} });
  }
}

/** The KPI functions answer: available when the extras read succeeds. A failure is not swallowed. */
export class KpiStatusService implements KpiStatusQuery {
  private readonly orbit: () => Promise<OrbitFunctions>;

  constructor(orbit: () => Promise<OrbitFunctions>) {
    this.orbit = orbit;
  }

  async status(): Promise<{ readonly available: true }> {
    await (await this.orbit()).call('orbit_kpi', { action: 'extras', payload: {} });
    return { available: true };
  }
}
