import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { EditTaskCommand, EditTaskUseCase } from '../port/in/EditTaskUseCase.ts';

export class EditTaskService implements EditTaskUseCase {
  private readonly functions: OrbitFunctions;

  constructor(functions: OrbitFunctions) {
    this.functions = functions;
  }

  // The stale-revision, trash and change-set rules live in orbit_edit_task (no action argument); this only forwards.
  edit(command: EditTaskCommand): Promise<unknown> {
    return this.functions.call('orbit_edit_task', { payload: { id: command.id, values: command.values, revision: command.revision, reason: command.reason } });
  }
}
