import { CallLog } from '../../../../../../shared/adapter/in/web/ui/testing/CallLog.ts';
import type { MonthlyMetrics } from '../../../../../domain/MonthlyMetrics.ts';
import type { PublishReportBody, ReportApi, ReportPreviewView, ReportRecordView } from '../ReportApi.ts';

export const emptyMetrics = (month: string): MonthlyMetrics => ({
  version: '1.0',
  month,
  generated_at: '2026-11-09T00:00:00.000Z',
  excludedTests: 0,
  received: 0,
  completed: 0,
  completionRate: null,
  onTime: 0,
  withDeadline: 0,
  noDeadlineCompleted: 0,
  dueRate: null,
  dueMet: 0,
  dueTotal: 0,
  averageHours: null,
  medianHours: null,
  pending: 0,
  overdue: 0,
  noDeadline: 0,
  invalid: 0,
  statuses: { 접수: 0, '진행 중': 0, 대기: 0, 완료: 0 },
  categories: {},
});

export class FakeReportApi implements ReportApi {
  readonly log = new CallLog();
  previews = new Map<string, ReportPreviewView>();
  records: ReportRecordView[] = [];
  nextId = 'new-report';

  async preview(month: string): Promise<ReportPreviewView> {
    this.log.record('preview', [month]);
    return structuredClone(this.previews.get(month) ?? { metrics: emptyMetrics(month), draft: '', fingerprint: 'fp-' + month });
  }

  async list(): Promise<ReportRecordView[]> {
    this.log.record('list', []);
    return structuredClone(this.records);
  }

  async publish(body: PublishReportBody): Promise<{ readonly id: string }> {
    this.log.record('publish', [body]);
    return { id: this.nextId };
  }
}
