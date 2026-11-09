import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { AssignTaskCommand, AssignTaskUseCase } from '../port/in/AssignTaskUseCase.ts';
import { callKpi } from './callKpi.ts';

export class AssignTaskService implements AssignTaskUseCase {
  private readonly orbit: OrbitFunctions;

  constructor(orbit: OrbitFunctions) {
    this.orbit = orbit;
  }

  async assign(command: AssignTaskCommand): Promise<{ readonly ok: true }> {
    await callKpi(this.orbit, 'assign', { id: command.taskId, assignee: command.assignee.value });
    return { ok: true };
  }
}
