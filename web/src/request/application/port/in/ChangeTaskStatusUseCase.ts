import type { TaskStatus } from '../../../domain/TaskStatus.ts';

export type ChangeTaskStatusCommand = { readonly id: string; readonly status: TaskStatus; readonly reason: string };

export interface ChangeTaskStatusUseCase {
  change(command: ChangeTaskStatusCommand): Promise<unknown>;
}
