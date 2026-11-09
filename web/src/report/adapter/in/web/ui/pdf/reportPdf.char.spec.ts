// R-024 end to end: a report published through the real routes is downloaded as an A4 PDF with a Korean font,
// named <month>_월간처리현황_<first 8 of the id>.pdf, split over pages numbered "n / total", carrying the text only.
// Page numbers and the absence of raw figures are read with pdftotext, so those cases run where ORBIT_PDF_CHECK is set.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { createContainer } from '../../../../../../config/container.ts';
import type { Container } from '../../../../../../config/container.ts';
import { pdfFilename } from '../reportFlow.ts';
import type { ReportRecordView } from '../ReportApi.ts';
import { createReportPdf } from './createReportPdf.ts';

const fontBytes = readFileSync(new URL('../../../../../../../public/fonts/NanumGothic-Regular.ttf', import.meta.url));
const ADMIN = 'admin-secret-1';
const auth = { Authorization: 'Basic ' + Buffer.from(`admin:${ADMIN}`).toString('base64'), 'Content-Type': 'application/json' };
const month = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 7);
const longDraft = `${month} 총무 업무 처리현황\n\n` + Array.from({ length: 110 }, (_, i) => `${i + 1}번째 검토 문안: 요청 등록부터 완료까지 처리 내용을 한글로 길게 적어 쪽이 나뉘는지 봅니다.`).join('\n');

let container: Container;
let record: ReportRecordView;
before(async () => {
  container = createContainer({ ADMIN_PASSWORD: ADMIN, VIEWER_PASSWORD: 'viewer-secret-2' }, { log: () => {} });
  const send = async (method: string, path: string, body?: unknown): Promise<any> =>
    (await container.pipeline.handle(new Request('http://portal.test' + path, { method, headers: auth, body: body === undefined ? undefined : JSON.stringify(body) }))).json();
  await send('POST', '/api/tasks', { title: '발행 업무', requester: '직원', requested_at: new Date().toISOString() });
  const preview = await send('GET', `/api/report-preview?month=${month}`);
  const published = await send('POST', '/api/reports', { month, fingerprint: preview.fingerprint, draft: longDraft });
  record = (await send('GET', '/api/reports')).find((r: ReportRecordView) => r.id === published.id);
});
after(async () => container.stop());

const make = (over: Partial<ReportRecordView> = {}) => createReportPdf({ ...record, ...over }, { fontBytes, portalName: '아이지넷' });

describe('R-024 downloading a published report as a PDF', () => {
  // R-024
  it('the file is named month, 월간처리현황 and the first eight characters of the report id', () => {
    assert.match(record.id, /^[0-9a-f-]{36}$/);
    assert.equal(pdfFilename(record), `${month}_월간처리현황_${record.id.slice(0, 8)}.pdf`);
  });
  // R-024
  it('a long draft becomes several A4 pages and the Korean font bytes are embedded in the file', async () => {
    const bytes = await make();
    const doc = await PDFDocument.load(bytes);
    assert.ok(doc.getPageCount() >= 3, 'pages: ' + doc.getPageCount());
    for (const page of doc.getPages()) assert.deepEqual([page.getWidth(), page.getHeight()], [595.28, 841.89]);
    assert.ok(bytes.length > 100_000, `the Korean font (${fontBytes.length} bytes) is part of the file: ${bytes.length}`);
    const short = await PDFDocument.load(await make({ draft: '한 줄 문안' }));
    assert.equal(short.getPageCount(), 1, 'a short draft stays on one page');
  });
  // R-024
  it('every page of a split document carries "current / total" and the figures of the report are not drawn, only the draft', { skip: !process.env.ORBIT_PDF_CHECK }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'orbit-pdf-'));
    try {
      const path = join(dir, 'report.pdf');
      writeFileSync(path, await make({ metrics: { ...record.metrics, raw_marker: 'RAW_FIGURE_MUST_NOT_APPEAR' } as never }));
      const total = (await PDFDocument.load(readFileSync(path))).getPageCount();
      const text = execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' });
      const pages = text.split('\f').filter((page) => page.trim() !== '');
      assert.equal(pages.length, total);
      pages.forEach((page, index) => assert.match(page, new RegExp(`${index + 1}\\s*/\\s*${total}`), `page ${index + 1}`));
      assert.match(text, /110번째 검토 문안/);
      assert.doesNotMatch(text, /RAW_FIGURE_MUST_NOT_APPEAR|raw_marker|completionRate|fingerprint/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
