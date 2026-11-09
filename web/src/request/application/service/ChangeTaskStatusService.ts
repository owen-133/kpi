import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { ChangeTaskStatusCommand, ChangeTaskStatusUseCase } from '../port/in/ChangeTaskStatusUseCase.ts';

export class ChangeTaskStatusService implements ChangeTaskStatusUseCase {
  private readonly functions: OrbitFunctions;

  constructor(functions: OrbitFunctions) {
    this.functions = functions;
  }

  // The reopen-needs-a-reason rule and the no-op on the same status live in orbit_api('status'); this only forwards.
  change(command: ChangeTaskStatusCommand): Promise<unknown> {
    return this.functions.call('orbit_api', { action: 'status', payload: { id: command.id, status: command.status, reason: command.reason } });
  }
}
