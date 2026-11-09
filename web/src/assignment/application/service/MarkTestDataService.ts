import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { MarkTestDataCommand, MarkTestDataUseCase } from '../port/in/MarkTestDataUseCase.ts';
import { callKpi } from './callKpi.ts';

export class MarkTestDataService implements MarkTestDataUseCase {
  private readonly orbit: OrbitFunctions;

  constructor(orbit: OrbitFunctions) {
    this.orbit = orbit;
  }

  async mark(command: MarkTestDataCommand): Promise<{ readonly ok: true }> {
    await callKpi(this.orbit, 'mark_test', { id: command.taskId, is_test: command.isTest });
    return { ok: true };
  }
}
