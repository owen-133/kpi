export type KpiStatus = { readonly available: true } | { readonly available: false; readonly message: string };

export interface GetKpiStatusQuery {
  status(): Promise<KpiStatus>;
}
