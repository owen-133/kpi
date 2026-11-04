import { Request } from '../../../domain/Request.ts';
import type { RequestHistoryEntry, RequestSnapshot } from '../../../domain/Request.ts';
import { createRequestId } from '../../../domain/RequestId.ts';
import { isRequestStatus } from '../../../domain/RequestStatus.ts';
import { InvalidRequestError } from '../../../domain/RequestError.ts';
import type { requestHistory, requestMemos, requests } from './schema.ts';

export type RequestRow = typeof requests.$inferSelect;
export type RequestHistoryRow = typeof requestHistory.$inferSelect;
export type RequestMemoRow = typeof requestMemos.$inferSelect;

export type RequestRows = {
  readonly request: RequestRow;
  readonly history: readonly RequestHistoryRow[];
  readonly memos: readonly RequestMemoRow[];
};

export function snapshotToRows(snapshot: RequestSnapshot): RequestRows {
  return {
    request: { id: snapshot.id, title: snapshot.title, requester: snapshot.requester },
    history: snapshot.history.map((entry, seq) => ({
      requestId: snapshot.id,
      seq,
      status: entry.status,
      reason: entry.reason,
      changedAt: entry.changedAt,
    })),
    memos: snapshot.memos.map((content, seq) => ({ requestId: snapshot.id, seq, content })),
  };
}

function bySeq(left: { seq: number }, right: { seq: number }): number {
  return left.seq - right.seq;
}

export function rowsToRequest(rows: RequestRows): Request {
  const history: RequestHistoryEntry[] = [...rows.history].sort(bySeq).map((row) => {
    if (!isRequestStatus(row.status)) {
      throw new InvalidRequestError(`unknown status in storage: ${row.status}`);
    }
    return { status: row.status, reason: row.reason, changedAt: row.changedAt };
  });
  const lastEntry = history[history.length - 1];
  if (lastEntry === undefined) {
    throw new InvalidRequestError(`request ${rows.request.id} has no history rows`);
  }
  return Request.restore({
    id: createRequestId(rows.request.id),
    title: rows.request.title,
    requester: rows.request.requester,
    status: lastEntry.status,
    memos: [...rows.memos].sort(bySeq).map((row) => row.content),
    history,
  });
}
