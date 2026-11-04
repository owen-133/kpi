import type { RequestEvent } from '../../../domain/RequestEvent.ts';

export interface DomainEventPublisher {
  publish(events: readonly RequestEvent[]): Promise<void>;
}
