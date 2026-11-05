export const REQUEST_STATUSES = ['received', 'inProgress', 'done', 'rejected'] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === 'string' && (REQUEST_STATUSES as readonly string[]).includes(value);
}

export function isFinishedStatus(status: RequestStatus): boolean {
  return status === 'done' || status === 'rejected';
}
