import { Request } from '../../domain/Request.ts';
import type { RequestId } from '../../domain/RequestId.ts';
import type { RegisterRequestCommand, RegisterRequestUseCase } from '../port/in/RegisterRequestUseCase.ts';
import type { DomainEventPublisher } from '../port/out/DomainEventPublisher.ts';
import type { RequestRepository } from '../port/out/RequestRepository.ts';

export class RegisterRequestService implements RegisterRequestUseCase {
  private readonly requestRepository: RequestRepository;
  private readonly eventPublisher: DomainEventPublisher;

  constructor(requestRepository: RequestRepository, eventPublisher: DomainEventPublisher) {
    this.requestRepository = requestRepository;
    this.eventPublisher = eventPublisher;
  }

  async register(command: RegisterRequestCommand): Promise<RequestId> {
    const request = Request.register({
      id: this.requestRepository.nextId(),
      title: command.title,
      requester: command.requester,
    });
    await this.requestRepository.save(request);
    await this.eventPublisher.publish(request.pullEvents());
    return request.id;
  }
}
