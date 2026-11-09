import type { LifecycleAction } from '../../../domain/TaskLifecycle.ts';

/** `confirmation` is passed to the database as typed; only a purge compares it with the title. */
export type ChangeTaskLifecycleCommand = { readonly id: string; readonly action: LifecycleAction; readonly reason: string; readonly confirmation: string };

export interface ChangeTaskLifecycleUseCase {
  change(command: ChangeTaskLifecycleCommand): Promise<unknown>;
}
