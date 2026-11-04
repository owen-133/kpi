import { ChangeRequestStatusService } from '../request/application/service/ChangeRequestStatusService.ts';
import { ListRequestsService } from '../request/application/service/ListRequestsService.ts';
import { RegisterRequestService } from '../request/application/service/RegisterRequestService.ts';
import type { ChangeRequestStatusUseCase } from '../request/application/port/in/ChangeRequestStatusUseCase.ts';
import type { ListRequestsQuery } from '../request/application/port/in/ListRequestsQuery.ts';
import type { RegisterRequestUseCase } from '../request/application/port/in/RegisterRequestUseCase.ts';
import { InMemoryDomainEventPublisher } from '../request/adapter/out/persistence/InMemoryDomainEventPublisher.ts';
import { InMemoryRequestRepository } from '../request/adapter/out/persistence/InMemoryRequestRepository.ts';

export type Container = {
  readonly registerRequest: RegisterRequestUseCase;
  readonly changeRequestStatus: ChangeRequestStatusUseCase;
  readonly listRequests: ListRequestsQuery;
};

const CONTAINER_KEY = 'orbit-ops.container';

/** Builds a fresh container with its own empty in-memory adapters. */
export function createContainer(): Container {
  const requestRepository = new InMemoryRequestRepository();
  const eventPublisher = new InMemoryDomainEventPublisher();
  return {
    registerRequest: new RegisterRequestService(requestRepository, eventPublisher),
    changeRequestStatus: new ChangeRequestStatusService(requestRepository, eventPublisher),
    listRequests: new ListRequestsService(requestRepository),
  };
}

/** One container per process; kept on globalThis so Next dev reloads keep the data. */
export function getContainer(): Container {
  const holder = globalThis as unknown as Record<string, Container | undefined>;
  const existing = holder[CONTAINER_KEY];
  if (existing !== undefined) return existing;
  const created = createContainer();
  holder[CONTAINER_KEY] = created;
  return created;
}
