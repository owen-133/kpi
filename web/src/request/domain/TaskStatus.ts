// The four statuses of a work request, in board order. The SQL function orbit_api('status') stays the authority that
// accepts or refuses a change; this file holds the vocabulary the web layer needs before it asks.
export const TASK_STATUSES = ['접수', '진행 중', '대기', '완료'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);
}

/** Leaving 완료 for another status. The database demands a reason for it; staying on 완료 is a no-op. */
export function isReopening(from: TaskStatus, to: TaskStatus): boolean {
  return from === '완료' && to !== '완료';
}
