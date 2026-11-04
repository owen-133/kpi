// Fixture: compliant inbound adapter.
import type { UseCase } from '../../../application/port/in/UseCase.ts';

export function handle(useCase: UseCase): string {
  return useCase.run().status;
}
