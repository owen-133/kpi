// Records what the legacy PDF bundle (public/pdf/report-pdf.js) makes for fixed report records.
//
//   node web/scripts/record-legacy-pdf.ts            (from anywhere; needs poppler's pdftotext on PATH)
//
// Writes web/src/report/adapter/in/web/ui/pdf/legacyPdf.recorded.json: per case the input record, the page count
// and the `pdftotext -layout` text. createReportPdf.spec.ts compares the ported PDF against that recording, so this
// script is the only code that loads the legacy bundle. The cases below must equal the records of the spec; the spec
// fails when they drift.
// Exit codes: 0 recorded · 2 pdftotext missing.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { emptyMetrics } from '../src/report/adapter/in/web/ui/testing/fakeReportApi.ts';

const PORTAL_NAME = '피플팀 업무 포털';
const here = (relative: string): URL => new URL(relative, import.meta.url);

const base = {
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
const mixedDraft =
  '2026-11 총무 업무 처리현황\r\n\r\n\r\n# 큰 제목\r\n1) 첫째 항목\r\n\t탭으로 들여쓴 줄 😀 이모지\r\n\r\n※ 규칙 기반 자동 초안입니다.\r\n   공백만 앞에 둔 줄   \r\n## 둘째 제목\r\n' +
  'ABCDEFGHIJ '.repeat(80);
const cases: ReadonlyArray<readonly [string, unknown]> = [
  ['a long draft that breaks into several pages', { ...base, draft: longDraft, metrics: { ...base.metrics, raw_test_marker: 'RAW_METRICS_MUST_NOT_APPEAR' } }],
  ['every layout branch', { ...base, draft: mixedDraft, actor: '' }],
  ['an empty draft', { ...base, draft: '' }],
];

try {
  execFileSync('pdftotext', ['-v'], { stdio: 'ignore' });
} catch {
  console.error('record-legacy-pdf: pdftotext not on PATH. Install poppler (macOS: brew install poppler, Debian/Ubuntu: apt install poppler-utils)');
  process.exit(2);
}

type PdfMaker = (record: unknown, options: { fontBytes: Uint8Array; portalName: string }) => Promise<Uint8Array>;
const { createReportPdf } = (await import(here('../../public/pdf/report-pdf.js').href)) as { createReportPdf: PdfMaker };
const fontBytes = readFileSync(here('../public/fonts/NanumGothic-Regular.ttf'));
const dir = mkdtempSync(join(tmpdir(), 'orbit-legacy-pdf-'));
try {
  const recorded = [];
  for (const [name, record] of cases) {
    const bytes = await createReportPdf(record, { fontBytes, portalName: PORTAL_NAME });
    const path = join(dir, 'legacy.pdf');
    writeFileSync(path, bytes);
    const text = execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' });
    recorded.push({ name, portalName: PORTAL_NAME, record, pages: (await PDFDocument.load(bytes)).getPageCount(), text });
  }
  const out = here('../src/report/adapter/in/web/ui/pdf/legacyPdf.recorded.json');
  writeFileSync(out, JSON.stringify(recorded, null, 2) + '\n');
  console.log(`record-legacy-pdf: ${recorded.length} cases -> ${out.pathname}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
