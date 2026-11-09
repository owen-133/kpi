// Writes of the report screen as plain async flows (UI-DESIGN D6): the month field, publishing, and the PDF download.
// The component hands in the typed api and the few portal actions it needs.
import { assertReportMonth } from '../../../../domain/ReportMonth.ts';
import type { ReportApi, ReportRecordView } from './ReportApi.ts';

export type ReportActions = {
  toast(message: string): void;
  render(): void;
  setReportMonth(month: string): void;
};

export const PUBLISH_CONFIRM_MESSAGE = '검토한 문안과 현재 집계값을 발행본으로 보존할까요? 발행 후에는 수정할 수 없습니다.';
const PDF_FAILED_MESSAGE = 'PDF 생성에 실패했습니다. 다시 시도해 주세요.';

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export const draftFilename = (month: string): string => month + '_보고서초안.txt';
export const pdfFilename = (record: Pick<ReportRecordView, 'month' | 'id'>): string => record.month + '_월간처리현황_' + record.id.slice(0, 8) + '.pdf';

/**
 * The month field changed. A value that is not a month is ignored (false). Otherwise the month is kept and the screen is
 * drawn anew, which reads the preview and the list again (legacy: renderReports(root)).
 */
export function changeReportMonth(actions: Pick<ReportActions, 'render' | 'setReportMonth'>, value: string): boolean {
  try {
    assertReportMonth(value);
  } catch {
    return false;
  }
  actions.setReportMonth(value);
  actions.render();
  return true;
}

export type PublishResult = 'published' | 'cancelled' | 'failed';

/**
 * The publish button. Declined confirmation: nothing happens. Accepted: POST with the fingerprint of the preview and the
 * edited draft, then toast, then the screen is read again (render). A refusal toasts the server's message only; 'failed'
 * tells the caller to enable the button again.
 */
export async function publishReport(
  api: Pick<ReportApi, 'publish'>,
  actions: Pick<ReportActions, 'toast' | 'render'>,
  confirm: (message: string) => boolean,
  body: { readonly month: string; readonly fingerprint: string; readonly draft: string },
): Promise<PublishResult> {
  if (!confirm(PUBLISH_CONFIRM_MESSAGE)) return 'cancelled';
  try {
    await api.publish({ month: body.month, fingerprint: body.fingerprint, draft: body.draft });
  } catch (e) {
    actions.toast(messageOf(e));
    return 'failed';
  }
  actions.toast('월간 리포트를 발행했습니다.');
  actions.render();
  return 'published';
}

export type PdfDeps = {
  readonly portalName: string | undefined;
  createPdf(record: ReportRecordView, options: { portalName: string | undefined }): Promise<Uint8Array>;
  save(filename: string, bytes: Uint8Array): void;
  toast(message: string): void;
};

/** The "발행본 내려받기" button. Never throws: a failure is toasted (legacy: e.message || the fixed sentence). */
export async function downloadReportPdf(deps: PdfDeps, record: ReportRecordView): Promise<void> {
  try {
    const bytes = await deps.createPdf(record, { portalName: deps.portalName });
    deps.save(pdfFilename(record), bytes);
  } catch (e) {
    deps.toast(messageOf(e) || PDF_FAILED_MESSAGE);
  }
}
