import type { RequestStatus } from '../../../domain/RequestStatus.ts';

export const STATUS_LABELS: Record<RequestStatus, string> = {
  received: '접수',
  inProgress: '진행 중',
  done: '완료',
  rejected: '반려',
};
