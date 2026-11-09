import type { BoardTask } from './BoardTask.ts';
import { STATUS_ORDER, type KnownStatus } from './taskStatus.ts';

export interface StatusCounts {
  readonly all: number;
  readonly byStatus: Readonly<Record<KnownStatus, number>>;
}

// Numbers on the status filter buttons: they count every task, whatever search or filter is active.
export function countByStatus(tasks: readonly BoardTask[]): StatusCounts {
  const byStatus = Object.fromEntries(STATUS_ORDER.map((status) => [status, tasks.filter((task) => task.status === status).length])) as Record<KnownStatus, number>;
  return { all: tasks.length, byStatus };
}
