import type { Request } from '../../domain/Request.ts';
import { createRequestId } from '../../domain/RequestId.ts';
import type { RequestId } from '../../domain/RequestId.ts';
import type { RequestEvent } from '../../domain/RequestEvent.ts';
import type { DomainEventPublisher } from '../port/out/DomainEventPublisher.ts';
import type { RequestRepository } from '../port/out/RequestRepository.ts';

/** Test double for the RequestRepository port. */
export class InMemoryRequestRepository implements RequestRepository {
  readonly storedRequests = new Map<string, Request>();
  saveCount = 0;
  private nextNumber = 1;

  nextId(): RequestId {
    const id = createRequestId(`request-${this.nextNumber}`);
    this.nextNumber += 1;
    return id;
  }

  async findById(id: RequestId): Promise<Request | null> {
    return this.storedRequests.get(id) ?? null;
  }

  async save(request: Request): Promise<void> {
    this.saveCount += 1;
    this.storedRequests.set(request.id, request);
  }

  async findAll(): Promise<Request[]> {
    return [...this.storedRequests.values()];
  }
}

/** Test double for the DomainEventPublisher port. */
export class RecordingEventPublisher implements DomainEventPublisher {
  readonly publishedEvents: RequestEvent[] = [];

  async publish(events: readonly RequestEvent[]): Promise<void> {
    this.publishedEvents.push(...events);
  }
}
