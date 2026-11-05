import type { RequestId } from '../domain/RequestId.ts';
import type { RequestStatus } from '../domain/RequestStatus.ts';

export type RequestView = {
  readonly id: RequestId;
  readonly title: string;
  readonly requester: string;
  readonly status: RequestStatus;
  readonly memos: readonly string[];
};
