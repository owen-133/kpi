import type { NewTaskValues } from '../../../domain/TaskLimits.ts';

/** `values` are the nine trimmed fields; `revision` is the edit revision the screen read; `reason` is trimmed. */
export type EditTaskCommand = { readonly id: string; readonly values: NewTaskValues; readonly revision: number; readonly reason: string };

export interface EditTaskUseCase {
  edit(command: EditTaskCommand): Promise<unknown>;
}
