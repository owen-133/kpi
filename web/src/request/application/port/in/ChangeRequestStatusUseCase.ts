import type { RequestId } from '../../../domain/RequestId.ts';
import type { RequestStatus } from '../../../domain/RequestStatus.ts';

export type ChangeRequestStatusCommand = {
  readonly id: RequestId;
  readonly status: RequestStatus;
  readonly reason?: string;
};

export interface ChangeRequestStatusUseCase {
  changeStatus(command: ChangeRequestStatusCommand): Promise<void>;
}
