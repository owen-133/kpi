import type { ApiClient } from '../../../../../shared/adapter/in/web/ui/apiClient.ts';
import type { ImprovementValue } from '../../../../domain/ImprovementValue.ts';

/** One row of GET /api/improvements: the saved fields with the row columns. */
export type ImprovementItem = ImprovementValue & {
  readonly id: string;
  readonly revision: number;
  readonly created_at: string;
  readonly updated_at: string;
};

/** One row of GET /api/improvements/<id>/history. */
export type ImprovementHistoryEvent = {
  readonly id?: string;
  readonly at: string;
  readonly actor: string;
  readonly before: Partial<ImprovementValue>;
  readonly after: Partial<ImprovementValue>;
};

/** `id` and `revision` are absent for a new entry (the JSON body then leaves them out). */
export type SaveImprovementBody = {
  readonly id?: string;
  readonly revision?: number;
  readonly value: Readonly<Record<string, string>>;
};

export interface ImprovementApi {
  list(): Promise<ImprovementItem[]>;
  history(id: string): Promise<ImprovementHistoryEvent[]>;
  save(body: SaveImprovementBody): Promise<{ readonly id: string }>;
}

export function createImprovementApi(client: ApiClient): ImprovementApi {
  return {
    list: () => client.request<ImprovementItem[]>('improvements'),
    history: (id) => client.request<ImprovementHistoryEvent[]>('improvements/' + id + '/history'),
    save: (body) => client.request<{ id: string }>('improvements', body),
  };
}
