import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { emptyMetrics } from '../testing/fakeReportApi.ts';
import type { ReportRecordView } from '../ReportApi.ts';
import { createReportPdf } from './createReportPdf.ts';

const fontBytes = readFileSync(new URL('../../../../../../../public/fonts/NanumGothic-Regular.ttf', import.meta.url));
// What the legacy bundle made for the same records, recorded by `node web/scripts/record-legacy-pdf.ts`
interface RecordedCase {
  name: string;
  portalName: string;
  record: unknown;
  pages: number;
  text: string;
}
const recordedCases = JSON.parse(readFileSync(new URL('./legacyPdf.recorded.json', import.meta.url), 'utf8')) as RecordedCase[];
const recordedFor = (name: string): RecordedCase => {
  const found = recordedCases.find((c) => c.name === name);
  assert.ok(found, `no recording for "${name}": run node web/scripts/record-legacy-pdf.ts`);
  return found;
};

const base: ReportRecordView = {
  id: 'published-1',
  month: '2026-11',
  created_at: '2026-11-04T01:00:00Z',
  actor: 'admin',
  metrics: { ...emptyMetrics('2026-11'), received: 7 },
  draft: '',
  method: 'rule',
};
const longDraft =
  '2026-11 총무 업무 처리현황\n\n1. 처리 현황\n한글 업무 내역이 정확하게 출력됩니다.\n\n2. 상세 검증\n' +
  Array.from({ length: 120 }, (_, i) => `${i + 1}번째 검증 문안: 요청 등록부터 완료까지 처리 내용을 살펴봅니다. 길이가 긴 문단도 여백 안에서 정돈되어야 합니다.`).join('\n') +
  '\n마지막 문안 확인';
// Every branch of the layout: numbered and markdown headings, a note line, a tab, a glyph the font lacks, CRLF, a title line to drop, blank runs
const mixedDraft =
  '2026-11 총무 업무 처리현황\r\n\r\n\r\n# 큰 제목\r\n1) 첫째 항목\r\n\t탭으로 들여쓴 줄 😀 이모지\r\n\r\n※ 규칙 기반 자동 초안입니다.\r\n   공백만 앞에 둔 줄   \r\n## 둘째 제목\r\n' +
  'ABCDEFGHIJ '.repeat(80);
const records: ReadonlyArray<readonly [string, ReportRecordView]> = [
  ['a long draft that breaks into several pages', { ...base, draft: longDraft, metrics: { ...base.metrics, raw_test_marker: 'RAW_METRICS_MUST_NOT_APPEAR' } as never }],
  ['every layout branch', { ...base, draft: mixedDraft, actor: '' }],
  ['an empty draft', { ...base, draft: '' }],
];
const make = (record: ReportRecordView, portalName = '피플팀 업무 포털') => createReportPdf(record, { fontBytes, portalName });
const pagesOf = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPages();

// Given a published record / When the PDF is made / Then it is a PDF of A4 pages, long text flows over pages
test('a long draft becomes a PDF of three or more A4 pages that carries the document properties', async () => {
  const bytes = await make(records[0][1]);
  assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), '%PDF-');
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();
  assert.ok(pages.length >= 3, 'pages: ' + pages.length);
  for (const p of pages) assert.deepEqual([p.getWidth(), p.getHeight()], [595.28, 841.89]);
  assert.equal(doc.getTitle(), '2026-11 총무 업무 처리현황');
  assert.equal(doc.getAuthor(), '피플팀 업무 포털');
  assert.equal(doc.getSubject(), '발행한 월간 업무 보고서');
  assert.equal(doc.getCreator(), '아이지넷 총무 업무 포털');
});

test('an empty draft still makes a one page PDF (the cover is always drawn)', async () => {
  assert.equal((await pagesOf(await make(records[2][1]))).length, 1);
});

test('without a portal name the author is the fallback 아이지넷', async () => {
  const bytes = await createReportPdf(base, { fontBytes });
  assert.equal((await PDFDocument.load(bytes)).getAuthor(), '아이지넷');
});

// Given the same record / When made by the legacy bundle (recorded) and by this port / Then the page counts are equal
for (const [name, record] of records) {
  test(`the recording holds the record of the case: ${name}`, () => {
    assert.deepEqual(JSON.parse(JSON.stringify(record)), recordedFor(name).record);
  });
  test(`the page count equals the legacy bundle's for ${name}`, async () => {
    const recorded = recordedFor(name);
    assert.ok(recorded.pages >= 1);
    assert.equal((await pagesOf(await make(record, recorded.portalName))).length, recorded.pages);
  });
}

// Text extraction needs poppler; ORBIT_PDF_CHECK is set by `eval "$(node scripts/env-for-tests.mjs)"`, which refuses to run without it
for (const [name, record] of records) {
  test(`pdftotext -layout of the PDF equals the legacy bundle's for ${name}`, { skip: !process.env.ORBIT_PDF_CHECK }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'orbit-pdf-'));
    try {
      const recorded = recordedFor(name);
      const path = join(dir, 'ported.pdf');
      writeFileSync(path, await make(record, recorded.portalName));
      const ported = execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' });
      assert.equal(ported, recorded.text);
      assert.match(ported, /\d+\s*\/\s*\d+/);
      assert.doesNotMatch(ported, /RAW_METRICS_MUST_NOT_APPEAR|raw_test_marker|발행 시점의 집계값/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('a glyph the font lacks is drawn as □ (the recorded legacy text carries the same substitution)', { skip: !process.env.ORBIT_PDF_CHECK }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'orbit-pdf-'));
  try {
    const path = join(dir, 'x.pdf');
    writeFileSync(path, await make(records[1][1]));
    assert.match(execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' }), /□ 이모지/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
