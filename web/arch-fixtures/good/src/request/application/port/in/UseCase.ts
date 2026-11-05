// Fixture: compliant inbound port.
import type { Good } from '../../../domain/Good.ts';

export interface UseCase {
  run(): Good;
}
