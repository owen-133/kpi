import type { RequestId } from '../domain/RequestId.ts';

export class RequestNotFoundError extends Error {
  constructor(requestId: RequestId) {
    super(`request not found: ${requestId}`);
    this.name = 'RequestNotFoundError';
  }
}
