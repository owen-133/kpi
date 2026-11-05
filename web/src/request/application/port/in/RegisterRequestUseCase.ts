import type { RequestId } from '../../../domain/RequestId.ts';

export type RegisterRequestCommand = {
  readonly title: string;
  readonly requester: string;
};

export interface RegisterRequestUseCase {
  register(command: RegisterRequestCommand): Promise<RequestId>;
}
