import type { RequestView } from '../../RequestView.ts';

export interface ListRequestsQuery {
  list(): Promise<RequestView[]>;
}
