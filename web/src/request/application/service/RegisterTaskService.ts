import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { NewTaskValues } from '../../domain/TaskLimits.ts';
import type { RegisterTaskUseCase } from '../port/in/RegisterTaskUseCase.ts';

export class RegisterTaskService implements RegisterTaskUseCase {
  private readonly functions: OrbitFunctions;

  constructor(functions: OrbitFunctions) {
    this.functions = functions;
  }

  async register(values: NewTaskValues): Promise<{ readonly id: string }> {
    return (await this.functions.call('orbit_api', { action: 'create', payload: values })) as { id: string };
  }
}
