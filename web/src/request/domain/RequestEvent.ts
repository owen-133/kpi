import type { RequestId } from './RequestId.ts';
import type { RequestStatus } from './RequestStatus.ts';

export type RequestRegistered = {
  readonly type: 'RequestRegistered';
  readonly requestId: RequestId;
  readonly title: string;
  readonly requester: string;
  readonly occurredAt: Date;
};

export type RequestStatusChanged = {
  readonly type: 'RequestStatusChanged';
  readonly requestId: RequestId;
  readonly fromStatus: RequestStatus;
  readonly toStatus: RequestStatus;
  readonly reason: string | null;
  readonly occurredAt: Date;
};

export type RequestMemoAdded = {
  readonly type: 'RequestMemoAdded';
  readonly requestId: RequestId;
  readonly memo: string;
  readonly occurredAt: Date;
};

export type RequestEvent = RequestRegistered | RequestStatusChanged | RequestMemoAdded;
