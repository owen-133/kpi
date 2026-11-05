import { createRequestId } from '../../../domain/RequestId.ts';
import { isRequestStatus } from '../../../domain/RequestStatus.ts';
import type { RequestStatus } from '../../../domain/RequestStatus.ts';
import type { ChangeRequestStatusUseCase } from '../../../application/port/in/ChangeRequestStatusUseCase.ts';
import type { ListRequestsQuery } from '../../../application/port/in/ListRequestsQuery.ts';
import type { RegisterRequestUseCase } from '../../../application/port/in/RegisterRequestUseCase.ts';

export type RequestUseCases = {
  readonly registerRequest: RegisterRequestUseCase;
  readonly changeRequestStatus: ChangeRequestStatusUseCase;
  readonly listRequests: ListRequestsQuery;
};

export type RequestListItem = {
  readonly id: string;
  readonly title: string;
  readonly requester: string;
  readonly status: RequestStatus;
  readonly memos: readonly string[];
};

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new InvalidInputError(`${fieldName} must be text`);
  }
  return value;
}

export async function registerRequestHandler(
  useCases: RequestUseCases,
  input: { readonly title: unknown; readonly requester: unknown },
): Promise<{ readonly id: string }> {
  const id = await useCases.registerRequest.register({
    title: requireString(input.title, 'title'),
    requester: requireString(input.requester, 'requester'),
  });
  return { id };
}

export async function changeRequestStatusHandler(
  useCases: RequestUseCases,
  input: { readonly id: unknown; readonly status: unknown; readonly reason?: unknown },
): Promise<{ readonly id: string; readonly status: RequestStatus }> {
  const id = createRequestId(requireString(input.id, 'id'));
  if (!isRequestStatus(input.status)) {
    throw new InvalidInputError(`unknown status: ${String(input.status)}`);
  }
  const reason = input.reason === undefined || input.reason === null ? undefined : requireString(input.reason, 'reason');
  await useCases.changeRequestStatus.changeStatus({ id, status: input.status, reason });
  return { id, status: input.status };
}

export async function listRequestsHandler(useCases: RequestUseCases): Promise<RequestListItem[]> {
  const views = await useCases.listRequests.list();
  return views.map((view) => ({
    id: view.id,
    title: view.title,
    requester: view.requester,
    status: view.status,
    memos: [...view.memos],
  }));
}
