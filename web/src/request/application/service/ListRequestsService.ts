import type { ListRequestsQuery } from '../port/in/ListRequestsQuery.ts';
import type { RequestRepository } from '../port/out/RequestRepository.ts';
import type { RequestView } from '../RequestView.ts';

export class ListRequestsService implements ListRequestsQuery {
  private readonly requestRepository: RequestRepository;

  constructor(requestRepository: RequestRepository) {
    this.requestRepository = requestRepository;
  }

  async list(): Promise<RequestView[]> {
    const requests = await this.requestRepository.findAll();
    return requests.map((request) => {
      const snapshot = request.toSnapshot();
      return {
        id: snapshot.id,
        title: snapshot.title,
        requester: snapshot.requester,
        status: snapshot.status,
        memos: snapshot.memos,
      };
    });
  }
}
