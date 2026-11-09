import type { MonthlyMetrics } from '../../../domain/MonthlyMetrics.ts';

export type ReportPreview = { readonly metrics: MonthlyMetrics; readonly draft: string; readonly fingerprint: string };

/** Raw request values: the use case applies the legacy coercions, so it receives them untouched. */
export type PublishReportCommand = { readonly month?: unknown; readonly fingerprint?: unknown; readonly draft?: unknown };

export interface PreviewReportQuery {
  /** `month` is the query value, null when absent. Throws InvalidMonthError for anything but 'YYYY-MM'. */
  preview(month: string | null): Promise<ReportPreview>;
}

export interface PublishReportUseCase {
  /** Checks, in this order: fingerprint (StaleFingerprintError), month shape, future month, draft length. */
  publish(command: PublishReportCommand): Promise<unknown>;
}

export interface ListReportsQuery {
  list(): Promise<unknown>;
}

export interface KpiStatusQuery {
  status(): Promise<{ readonly available: true }>;
}

export type ReportUseCases = {
  readonly preview: PreviewReportQuery;
  readonly publish: PublishReportUseCase;
  readonly list: ListReportsQuery;
  readonly kpiStatus: KpiStatusQuery;
};
