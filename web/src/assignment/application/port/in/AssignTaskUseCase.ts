import type { AssigneeName } from '../../../domain/AssigneeName.ts';

export type AssignTaskCommand = { readonly taskId: string; readonly assignee: AssigneeName };

export interface AssignTaskUseCase {
  assign(command: AssignTaskCommand): Promise<{ readonly ok: true }>;
}
