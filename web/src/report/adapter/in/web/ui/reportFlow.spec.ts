import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ReportRecordView } from './ReportApi.ts';
import {
  PUBLISH_CONFIRM_MESSAGE,
  changeReportMonth,
  downloadReportPdf,
  draftFilename,
  pdfFilename,
  publishReport,
  type PdfDeps,
  type ReportActions,
} from './reportFlow.ts';
import { emptyMetrics, FakeReportApi } from './testing/fakeReportApi.ts';

class RecordingActions implements ReportActions {
  readonly calls: string[] = [];
  toast(message: string): void {
    this.calls.push('toast:' + message);
  }
  render(): void {
    this.calls.push('render');
  }
  setReportMonth(month: string): void {
    this.calls.push('month:' + month);
  }
}

const body = { month: '2026-11', fingerprint: 'fp', draft: '검토한 문안' };

// Given the admin has pressed publish / When the confirmation is accepted / Then the three fields go out, then toast, then the screen is read again
test('publishing sends month, the fingerprint of the preview and the edited draft, then toasts and re-renders in the legacy order', async () => {
  const api = new FakeReportApi();
  const actions = new RecordingActions();
  const asked: string[] = [];
  const result = await publishReport(api, actions, (m) => (asked.push(m), true), body);
  assert.equal(result, 'published');
  assert.deepEqual(asked, [PUBLISH_CONFIRM_MESSAGE]);
  assert.equal(PUBLISH_CONFIRM_MESSAGE, '검토한 문안과 현재 집계값을 발행본으로 보존할까요? 발행 후에는 수정할 수 없습니다.');
  assert.deepEqual(api.log.argsOf('publish'), [[body]]);
  assert.deepEqual(actions.calls, ['toast:월간 리포트를 발행했습니다.', 'render']);
});

// Given the admin declines / Then nothing is sent and nothing moves
test('declining the confirmation sends nothing and neither toasts nor re-renders', async () => {
  const api = new FakeReportApi();
  const actions = new RecordingActions();
  assert.equal(await publishReport(api, actions, () => false, body), 'cancelled');
  assert.deepEqual(api.log.names(), []);
  assert.deepEqual(actions.calls, []);
});

// Given the server refuses (the tasks changed after the preview) / Then its message is toasted and the screen is not redrawn, so the button can be enabled again
test('a refused publish toasts the server message only and reports failure', async () => {
  const api = new FakeReportApi();
  api.log.failNext('publish', '집계 후 업무가 변경되었습니다. 지표를 다시 집계해 주세요.');
  const actions = new RecordingActions();
  assert.equal(await publishReport(api, actions, () => true, body), 'failed');
  assert.deepEqual(actions.calls, ['toast:집계 후 업무가 변경되었습니다. 지표를 다시 집계해 주세요.']);
});

// Given the month field changes / Then only a real month is taken; the screen reads again (preview and list)
test('a valid month is stored and the screen is drawn anew; the month field is checked before anything moves', () => {
  const actions = new RecordingActions();
  assert.equal(changeReportMonth(actions, '2026-10'), true);
  assert.deepEqual(actions.calls, ['month:2026-10', 'render']);
  for (const bad of ['', '2026-13', '2026-00', '26-10', '2026-1', '2026-10-01', ' 2026-10']) {
    const untouched = new RecordingActions();
    assert.equal(changeReportMonth(untouched, bad), false, bad);
    assert.deepEqual(untouched.calls, [], bad);
  }
  assert.equal(changeReportMonth(new RecordingActions(), '2026-12'), true);
  assert.equal(changeReportMonth(new RecordingActions(), '0001-01'), true);
});

const record: ReportRecordView = {
  id: 'abcdef12-3456',
  month: '2026-11',
  actor: 'admin',
  created_at: '2026-11-04T01:00:00Z',
  metrics: emptyMetrics('2026-11'),
  draft: '초안',
  method: 'rule',
};

function pdfDeps(over: Partial<PdfDeps> = {}): PdfDeps & { readonly saved: Array<[string, Uint8Array]>; readonly asked: unknown[] } {
  const saved: Array<[string, Uint8Array]> = [];
  const asked: unknown[] = [];
  return {
    saved,
    asked,
    portalName: '피플팀 업무 포털',
    createPdf: async (r, options) => (asked.push([r, options]), new Uint8Array([1, 2, 3])),
    save: (name, bytes) => void saved.push([name, bytes]),
    toast: () => undefined,
    ...over,
  };
}

test('the PDF is made from the published record with the portal name and saved as month_월간처리현황_first8ofId.pdf', async () => {
  const deps = pdfDeps();
  await downloadReportPdf(deps, record);
  assert.deepEqual(deps.asked, [[record, { portalName: '피플팀 업무 포털' }]]);
  assert.deepEqual(deps.saved, [['2026-11_월간처리현황_abcdef12.pdf', new Uint8Array([1, 2, 3])]]);
  assert.equal(pdfFilename(record), '2026-11_월간처리현황_abcdef12.pdf');
});

test('a failing PDF toasts the error message, or the fixed sentence when the error has none, and saves nothing', async () => {
  const toasts: string[] = [];
  const failing = pdfDeps({ toast: (m) => void toasts.push(m), createPdf: async () => Promise.reject(new Error('한글 글꼴을 불러오지 못했습니다. 다시 시도해 주세요.')) });
  await downloadReportPdf(failing, record);
  const empty = pdfDeps({ toast: (m) => void toasts.push(m), createPdf: async () => Promise.reject(new Error('')) });
  await downloadReportPdf(empty, record);
  assert.deepEqual(toasts, ['한글 글꼴을 불러오지 못했습니다. 다시 시도해 주세요.', 'PDF 생성에 실패했습니다. 다시 시도해 주세요.']);
  assert.deepEqual([failing.saved, empty.saved], [[], []]);
});

test('the draft file is named after the month', () => {
  assert.equal(draftFilename('2026-11'), '2026-11_보고서초안.txt');
});
