import type { RequestEvent } from '../../../domain/RequestEvent.ts';
import type { DomainEventPublisher } from '../../../application/port/out/DomainEventPublisher.ts';

/** Remembers published events in order; there is no external subscriber yet. */
export class InMemoryDomainEventPublisher implements DomainEventPublisher {
  private readonly publishedEvents: RequestEvent[] = [];

  async publish(events: readonly RequestEvent[]): Promise<void> {
    this.publishedEvents.push(...events);
  }

  published(): readonly RequestEvent[] {
    return [...this.publishedEvents];
  }
}
