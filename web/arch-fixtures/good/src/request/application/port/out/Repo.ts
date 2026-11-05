// Fixture: compliant outbound port.
import type { Good } from '../../../domain/Good.ts';

export interface Repo {
  find(id: string): Good | null;
}
