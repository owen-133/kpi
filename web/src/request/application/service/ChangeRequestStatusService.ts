import { RequestNotFoundError } from '../RequestNotFoundError.ts';
import type { ChangeRequestStatusCommand, ChangeRequestStatusUseCase } from '../port/in/ChangeRequestStatusUseCase.ts';
import type { DomainEventPublisher } from '../port/out/DomainEventPublisher.ts';
import type { RequestRepository } from '../port/out/RequestRepository.ts';

export class ChangeRequestStatusService implements ChangeRequestStatusUseCase {
  private readonly requestRepository: RequestRepository;
  private readonly eventPublisher: DomainEventPublisher;

  constructor(requestRepository: RequestRepository, eventPublisher: DomainEventPublisher) {
    this.requestRepository = requestRepository;
    this.eventPublisher = eventPublisher;
  }

  async changeStatus(command: ChangeRequestStatusCommand): Promise<void> {
    const request = await this.requestRepository.findById(command.id);
    if (request === null) {
      throw new RequestNotFoundError(command.id);
    }
    request.changeStatus(command.status, command.reason);
    await this.requestRepository.save(request);
    await this.eventPublisher.publish(request.pullEvents());
  }
}
