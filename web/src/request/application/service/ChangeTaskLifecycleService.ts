import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { ChangeTaskLifecycleCommand, ChangeTaskLifecycleUseCase } from '../port/in/ChangeTaskLifecycleUseCase.ts';

export class ChangeTaskLifecycleService implements ChangeTaskLifecycleUseCase {
  private readonly functions: OrbitFunctions;

  constructor(functions: OrbitFunctions) {
    this.functions = functions;
  }

  // Which action is allowed in which state, and the purge title confirmation, live in orbit_lifecycle; this only forwards.
  change(command: ChangeTaskLifecycleCommand): Promise<unknown> {
    return this.functions.call('orbit_lifecycle', { action: command.action, payload: { id: command.id, reason: command.reason, confirmation: command.confirmation } });
  }
}
