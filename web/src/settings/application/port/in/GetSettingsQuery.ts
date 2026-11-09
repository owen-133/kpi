/** The settings as the portal shows them; `available: false` means the database has no settings function yet. */
export type SettingsView = {
  readonly values: unknown;
  readonly revision: number;
  readonly available: boolean;
  readonly message?: string;
};

export interface GetSettingsQuery {
  get(): Promise<SettingsView>;
}
