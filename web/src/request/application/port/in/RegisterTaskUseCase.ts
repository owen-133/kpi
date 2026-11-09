import type { NewTaskValues } from '../../../domain/TaskLimits.ts';

export interface RegisterTaskUseCase {
  register(values: NewTaskValues): Promise<{ readonly id: string }>;
}
