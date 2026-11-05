import { count, eq, inArray } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { Request } from '../../../domain/Request.ts';
import { createRequestId } from '../../../domain/RequestId.ts';
import type { RequestId } from '../../../domain/RequestId.ts';
import type { RequestRepository } from '../../../application/port/out/RequestRepository.ts';
import { rowsToRequest, snapshotToRows } from './requestMapper.ts';
import type { RequestHistoryRow, RequestMemoRow, RequestRow } from './requestMapper.ts';
import { requestHistory, requestMemos, requests } from './schema.ts';

export type RequestDatabase = PgDatabase<PgQueryResultHKT>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function groupByRequestId<Row extends { requestId: string }>(rows: readonly Row[]): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const group = grouped.get(row.requestId);
    if (group === undefined) grouped.set(row.requestId, [row]);
    else group.push(row);
  }
  return grouped;
}

/** Stores one Request aggregate in requests, request_history and request_memos. */
export class DrizzleRequestRepository implements RequestRepository {
  private readonly database: RequestDatabase;

  constructor(database: RequestDatabase) {
    this.database = database;
  }

  nextId(): RequestId {
    return createRequestId(crypto.randomUUID());
  }

  async findById(id: RequestId): Promise<Request | null> {
    // A value that is not a UUID cannot be stored, so no such request exists.
    if (!UUID_PATTERN.test(id)) return null;
    const [requestRows, historyRows, memoRows] = await Promise.all([
      this.database.select().from(requests).where(eq(requests.id, id)),
      this.database.select().from(requestHistory).where(eq(requestHistory.requestId, id)),
      this.database.select().from(requestMemos).where(eq(requestMemos.requestId, id)),
    ]);
    const request = requestRows[0];
    if (request === undefined) return null;
    return rowsToRequest({ request, history: historyRows, memos: memoRows });
  }

  async findAll(): Promise<Request[]> {
    const requestRows = await this.database.select().from(requests);
    if (requestRows.length === 0) return [];
    const ids = requestRows.map((row) => row.id);
    const [historyRows, memoRows] = await Promise.all([
      this.database.select().from(requestHistory).where(inArray(requestHistory.requestId, ids)),
      this.database.select().from(requestMemos).where(inArray(requestMemos.requestId, ids)),
    ]);
    const historyById = groupByRequestId<RequestHistoryRow>(historyRows);
    const memosById = groupByRequestId<RequestMemoRow>(memoRows);
    const registeredAt = (row: RequestRow): number =>
      Math.min(...(historyById.get(row.id) ?? []).map((entry) => entry.changedAt.getTime()));
    return [...requestRows]
      .sort((left, right) => registeredAt(left) - registeredAt(right) || left.id.localeCompare(right.id))
      .map((request) =>
        rowsToRequest({
          request,
          history: historyById.get(request.id) ?? [],
          memos: memosById.get(request.id) ?? [],
        }),
      );
  }

  /** One transaction writes one aggregate: the request row plus the history and memo rows not stored yet. */
  async save(request: Request): Promise<void> {
    const rows = snapshotToRows(request.toSnapshot());
    await this.database.transaction(async (transaction) => {
      await transaction.insert(requests).values(rows.request).onConflictDoNothing();
      const [storedHistory] = await transaction
        .select({ total: count() })
        .from(requestHistory)
        .where(eq(requestHistory.requestId, rows.request.id));
      const [storedMemos] = await transaction
        .select({ total: count() })
        .from(requestMemos)
        .where(eq(requestMemos.requestId, rows.request.id));
      const newHistory = rows.history.slice(storedHistory.total);
      const newMemos = rows.memos.slice(storedMemos.total);
      if (newHistory.length > 0) await transaction.insert(requestHistory).values(newHistory);
      if (newMemos.length > 0) await transaction.insert(requestMemos).values(newMemos);
    });
  }
}
