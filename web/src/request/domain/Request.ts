import { InvalidRequestError } from './RequestError.ts';
import type { RequestEvent } from './RequestEvent.ts';
import { createRequestId } from './RequestId.ts';
import type { RequestId } from './RequestId.ts';
import { isFinishedStatus, isRequestStatus } from './RequestStatus.ts';
import type { RequestStatus } from './RequestStatus.ts';

export type RequestHistoryEntry = {
  readonly status: RequestStatus;
  readonly reason: string | null;
  readonly changedAt: Date;
};

export type RequestSnapshot = {
  readonly id: RequestId;
  readonly title: string;
  readonly requester: string;
  readonly status: RequestStatus;
  readonly memos: readonly string[];
  readonly history: readonly RequestHistoryEntry[];
};

export type RegisterRequestParams = {
  readonly id: RequestId;
  readonly title: string;
  readonly requester: string;
  readonly occurredAt?: Date;
};

function requireText(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InvalidRequestError(`${fieldName} must not be empty`);
  }
  return value.trim();
}

/** Aggregate root. Every state change goes through a method; there are no setters. */
export class Request {
  readonly #id: RequestId;
  readonly #title: string;
  readonly #requester: string;
  #status: RequestStatus;
  readonly #memos: string[];
  readonly #history: RequestHistoryEntry[];
  #pendingEvents: RequestEvent[];

  private constructor(
    id: RequestId,
    title: string,
    requester: string,
    status: RequestStatus,
    memos: string[],
    history: RequestHistoryEntry[],
    pendingEvents: RequestEvent[],
  ) {
    this.#id = id;
    this.#title = title;
    this.#requester = requester;
    this.#status = status;
    this.#memos = memos;
    this.#history = history;
    this.#pendingEvents = pendingEvents;
  }

  static register(params: RegisterRequestParams): Request {
    const id = createRequestId(params.id);
    const title = requireText(params.title, 'title');
    const requester = requireText(params.requester, 'requester');
    const occurredAt = params.occurredAt ?? new Date();
    return new Request(
      id,
      title,
      requester,
      'received',
      [],
      [{ status: 'received', reason: null, changedAt: occurredAt }],
      [{ type: 'RequestRegistered', requestId: id, title, requester, occurredAt }],
    );
  }

  static restore(snapshot: RequestSnapshot): Request {
    const id = createRequestId(snapshot.id);
    const title = requireText(snapshot.title, 'title');
    const requester = requireText(snapshot.requester, 'requester');
    if (!isRequestStatus(snapshot.status)) {
      throw new InvalidRequestError(`unknown status: ${String(snapshot.status)}`);
    }
    if (snapshot.history.length === 0) {
      throw new InvalidRequestError('history must not be empty');
    }
    const lastEntry = snapshot.history[snapshot.history.length - 1];
    if (lastEntry.status !== snapshot.status) {
      throw new InvalidRequestError('history last status must equal current status');
    }
    return new Request(
      id,
      title,
      requester,
      snapshot.status,
      [...snapshot.memos],
      snapshot.history.map((entry) => ({ ...entry })),
      [],
    );
  }

  get id(): RequestId {
    return this.#id;
  }

  get status(): RequestStatus {
    return this.#status;
  }

  changeStatus(newStatus: RequestStatus, reason?: string, occurredAt: Date = new Date()): void {
    if (!isRequestStatus(newStatus)) {
      throw new InvalidRequestError(`unknown status: ${String(newStatus)}`);
    }
    if (newStatus === this.#status) {
      throw new InvalidRequestError(`request is already ${newStatus}`);
    }
    const isReopening = isFinishedStatus(this.#status) && !isFinishedStatus(newStatus);
    const trimmedReason = reason === undefined ? null : reason.trim();
    if (isReopening && (trimmedReason === null || trimmedReason === '')) {
      throw new InvalidRequestError('reopening a finished request requires a reason');
    }
    const recordedReason = trimmedReason === '' ? null : trimmedReason;
    const previousStatus = this.#status;
    this.#status = newStatus;
    this.#history.push({ status: newStatus, reason: recordedReason, changedAt: occurredAt });
    this.#pendingEvents.push({
      type: 'RequestStatusChanged',
      requestId: this.#id,
      fromStatus: previousStatus,
      toStatus: newStatus,
      reason: recordedReason,
      occurredAt,
    });
  }

  addMemo(memo: string, occurredAt: Date = new Date()): void {
    const text = requireText(memo, 'memo');
    this.#memos.push(text);
    this.#pendingEvents.push({ type: 'RequestMemoAdded', requestId: this.#id, memo: text, occurredAt });
  }

  history(): readonly RequestHistoryEntry[] {
    return this.#history.map((entry) => ({ ...entry }));
  }

  /** Returns the events raised since the last call and forgets them, so each event is published once. */
  pullEvents(): readonly RequestEvent[] {
    const events = this.#pendingEvents;
    this.#pendingEvents = [];
    return events;
  }

  toSnapshot(): RequestSnapshot {
    return {
      id: this.#id,
      title: this.#title,
      requester: this.#requester,
      status: this.#status,
      memos: [...this.#memos],
      history: this.history(),
    };
  }
}
