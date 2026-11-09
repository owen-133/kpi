/** Raw request values: the use case validates them. */
export type SaveImprovementCommand = { readonly id?: unknown; readonly revision?: unknown; readonly value?: unknown };

export interface ListImprovementsQuery {
  list(): Promise<unknown>;
}

export interface SaveImprovementUseCase {
  /** Validates the value first, then the revision of an existing entry, then saves. Throws InvalidImprovementError. */
  save(command: SaveImprovementCommand): Promise<unknown>;
}

export interface ImprovementHistoryQuery {
  /** The audit rows of one entry, oldest first; an unknown id gives an empty list. */
  history(id: string): Promise<unknown>;
}

export type ImprovementUseCases = {
  readonly list: ListImprovementsQuery;
  readonly save: SaveImprovementUseCase;
  readonly history: ImprovementHistoryQuery;
};
