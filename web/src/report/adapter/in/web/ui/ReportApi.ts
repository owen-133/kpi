import type { ApiClient } from '../../../../../shared/adapter/in/web/ui/apiClient.ts';
import type { MonthlyMetrics } from '../../../../domain/MonthlyMetrics.ts';

/** GET /api/report-preview?month=YYYY-MM */
export type ReportPreviewView = {
  readonly metrics: MonthlyMetrics;
  readonly draft: string;
  readonly fingerprint: string;
};

/** One row of GET /api/reports: the saved value (metrics, draft, method) with the row columns. */
export type ReportRecordView = {
  readonly id: string;
  readonly month: string;
  readonly actor: string;
  readonly created_at: string;
  readonly metrics: MonthlyMetrics;
  readonly draft: string;
  readonly method: string;
};

export type PublishReportBody = { readonly month: string; readonly fingerprint: string; readonly draft: string };

export interface ReportApi {
  preview(month: string): Promise<ReportPreviewView>;
  list(): Promise<ReportRecordView[]>;
  publish(body: PublishReportBody): Promise<{ readonly id: string }>;
}

export function createReportApi(client: ApiClient): ReportApi {
  return {
    // the legacy screen only sends months that matched /^\d{4}-(0[1-9]|1[0-2])$/, so the value is used as is
    preview: (month) => client.request<ReportPreviewView>('report-preview?month=' + month),
    list: () => client.request<ReportRecordView[]>('reports'),
    publish: (body) => client.request<{ id: string }>('reports', body),
  };
}
