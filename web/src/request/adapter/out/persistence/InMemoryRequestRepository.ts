import { Request } from '../../../domain/Request.ts';
import type { RequestSnapshot } from '../../../domain/Request.ts';
import { createRequestId } from '../../../domain/RequestId.ts';
import type { RequestId } from '../../../domain/RequestId.ts';
import type { RequestRepository } from '../../../application/port/out/RequestRepository.ts';

function copySnapshot(snapshot: RequestSnapshot): RequestSnapshot {
  return {
    ...snapshot,
    memos: [...snapshot.memos],
    history: snapshot.history.map((entry) => ({ ...entry, changedAt: new Date(entry.changedAt) })),
  };
}

/** Keeps snapshots, not aggregates, so callers never share an instance with the store. */
export class InMemoryRequestRepository implements RequestRepository {
  private readonly snapshotsById = new Map<RequestId, RequestSnapshot>();
  private lastIssuedNumber = 0;

  nextId(): RequestId {
    this.lastIssuedNumber += 1;
    return createRequestId(`request-${this.lastIssuedNumber}`);
  }

  async findById(id: RequestId): Promise<Request | null> {
    const snapshot = this.snapshotsById.get(id);
    return snapshot === undefined ? null : Request.restore(copySnapshot(snapshot));
  }

  async save(request: Request): Promise<void> {
    this.snapshotsById.set(request.id, copySnapshot(request.toSnapshot()));
  }

  async findAll(): Promise<Request[]> {
    return [...this.snapshotsById.values()].map((snapshot) => Request.restore(copySnapshot(snapshot)));
  }
}
