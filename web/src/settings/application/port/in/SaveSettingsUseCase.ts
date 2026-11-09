import type { SettingsActor } from '../../../domain/SettingsAccess.ts';

export type SaveSettingsCommand = {
  readonly actor: SettingsActor;
  /** The version the caller saw; a different stored version is a conflict. */
  readonly revision: number;
  /** Raw submitted values: validated by the use case. */
  readonly values: unknown;
};

export interface SaveSettingsUseCase {
  save(command: SaveSettingsCommand): Promise<unknown>;
}
