// The four work statuses in board order, and the display state each one maps to.

export const STATUS_ORDER = ['접수', '진행 중', '대기', '완료'] as const;
export type KnownStatus = (typeof STATUS_ORDER)[number];
export type TaskState = 'waiting' | 'working' | 'blocked' | 'idle';

const STATE_OF: Readonly<Record<KnownStatus, TaskState>> = {
  접수: 'waiting',
  '진행 중': 'working',
  대기: 'blocked',
  완료: 'idle',
};

const UNKNOWN_RANK = STATUS_ORDER.length;

// Position of a status in board order; unknown, empty or missing statuses come after 완료.
export function statusRank(status: string | null | undefined): number {
  const index = STATUS_ORDER.indexOf(status as KnownStatus);
  return index === -1 ? UNKNOWN_RANK : index;
}

export function compareStatus(a: string | null | undefined, b: string | null | undefined): number {
  return statusRank(a) - statusRank(b);
}

export function taskState(status: string | null | undefined): TaskState {
  return STATE_OF[status as KnownStatus] ?? 'idle';
}
