import type { Request } from '../../../domain/Request.ts';
import type { RequestId } from '../../../domain/RequestId.ts';

export interface RequestRepository {
  nextId(): RequestId;
  findById(id: RequestId): Promise<Request | null>;
  save(request: Request): Promise<void>;
  findAll(): Promise<Request[]>;
}
