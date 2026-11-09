// The PDF of a published monthly report: the portal part of the legacy bundle public/pdf/report-pdf.js (`createReportPdf`),
// on the npm packages pdf-lib and @pdf-lib/fontkit instead of the bundled copies. Loaded on click with import() (UI-DESIGN D11).
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export type ReportPdfRecord = { readonly month: string; readonly created_at: string; readonly actor?: string; readonly draft: string };
export type ReportPdfOptions = { readonly fontBytes?: Uint8Array | ArrayBuffer; readonly portalName?: string };

const FONT_URL = '/fonts/NanumGothic-Regular.ttf';
let fontRequest: Promise<ArrayBuffer> | null = null;

// legacy: fetched once per page; a failed fetch is forgotten so that the next click tries again
function loadFont(): Promise<ArrayBuffer> {
  fontRequest ??= fetch(FONT_URL)
    .then((response) => {
      if (!response.ok) throw new Error('한글 글꼴을 불러오지 못했습니다. 다시 시도해 주세요.');
      return response.arrayBuffer();
    })
    .catch((e: unknown) => {
      fontRequest = null;
      throw e;
    });
  return fontRequest;
}

const INK = rgb(0.13, 0.19, 0.29);
const MUTED = rgb(0.49, 0.55, 0.64);
const RULE = rgb(0.87, 0.9, 0.94);
const COVER_FILL = rgb(0.96, 0.97, 0.99);
const TITLE = '총무 업무 처리현황';
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 44;
const TEXT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export async function createReportPdf(record: ReportPdfRecord, options: ReportPdfOptions = {}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font: PDFFont = await pdf.embedFont(options.fontBytes ?? (await loadFont()), { subset: false });
  const known = new Set(font.getCharacterSet());
  // control characters go, tabs become four spaces, glyphs the font lacks become □
  const clean = (value: unknown): string =>
    Array.from(String(value ?? '').normalize('NFC'))
      .filter((ch) => ch === '\n' || ch === '\t' || ch.charCodeAt(0) >= 32)
      .map((ch) => (ch === '\n' || ch === '\t' || known.has(ch.codePointAt(0) as number) ? ch : '□'))
      .join('')
      .replaceAll('\t', '    ');
  const portal = clean(options.portalName || '아이지넷');
  const month = clean(record.month);
  const issued = new Date(record.created_at).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  pdf.setTitle(month + ' ' + TITLE);
  pdf.setAuthor(portal);
  pdf.setSubject('발행한 월간 업무 보고서');
  pdf.setCreator('아이지넷 총무 업무 포털');

  let page!: PDFPage;
  let y = 0;
  const text = (value: string, x: number, at: number, size = 10.3, color = INK): void => {
    page.drawText(clean(value), { x, y: at, size, font, color });
  };
  // greedy wrap by measured width; the last line is trimmed, an empty text still gives one line
  const wrap = (value: string, size: number, width = TEXT_WIDTH): string[] => {
    const lines: string[] = [];
    let line = '';
    for (const ch of clean(value)) {
      if (font.widthOfTextAtSize(line + ch, size) > width && line) {
        lines.push(line.trimEnd());
        line = ch.trimStart();
      } else line += ch;
    }
    if (line || !lines.length) lines.push(line.trimEnd());
    return lines;
  };
  const newPage = (cover = false): void => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    if (cover) {
      page.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - 154, width: TEXT_WIDTH, height: 112, color: COVER_FILL });
      let size = 10;
      while (font.widthOfTextAtSize(portal, size) > TEXT_WIDTH - 110 && size > 6) size -= 0.5;
      text(portal, MARGIN + 18, PAGE_HEIGHT - 69, size, MUTED);
      text('MONTHLY REPORT', PAGE_WIDTH - MARGIN - 114, PAGE_HEIGHT - 69, 8, MUTED);
      text(TITLE, MARGIN + 18, PAGE_HEIGHT - 106, 23);
      text(month + '  월간 보고서', MARGIN + 18, PAGE_HEIGHT - 135, 10, MUTED);
      y = PAGE_HEIGHT - 183;
      text('발행 ' + issued + ' (한국 시간)', MARGIN, y, 9, MUTED);
      text('발행자 ' + clean(record.actor || 'admin'), PAGE_WIDTH - MARGIN - 100, y, 9, MUTED);
      y -= 28;
    } else {
      text(month + ' · ' + TITLE, MARGIN, PAGE_HEIGHT - 44, 10, MUTED);
      page.drawLine({ start: { x: MARGIN, y: PAGE_HEIGHT - 56 }, end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 56 }, thickness: 0.6, color: RULE });
      y = PAGE_HEIGHT - 82;
    }
  };
  const room = (needed: number): void => {
    if (y - needed < 70) newPage();
  };

  newPage(true);
  const lines = clean(record.draft).split(/\r?\n/);
  // the draft's own title line and the blank lines after it are dropped: the cover shows the title
  if (lines[0]?.trim() === record.month + ' ' + TITLE) lines.shift();
  while (lines[0] === '') lines.shift();
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) {
      y -= 9;
      continue;
    }
    const heading = /^\s*\d+[.)]\s+/.test(line) || /^#{1,3}\s+/.test(line);
    const note = line.trimStart().startsWith('※');
    const size = heading ? 12 : note ? 8.4 : 10.3;
    const leading = heading ? 19 : note ? 13 : 17;
    if (heading) {
      room(65);
      y -= 8;
      page.drawRectangle({ x: MARGIN, y: y - 2, width: 3, height: 14, color: INK });
    }
    for (const part of wrap(line.replace(/^#{1,3}\s+/, ''), size, heading ? TEXT_WIDTH - 13 : TEXT_WIDTH)) {
      room(leading);
      text(part, MARGIN + (heading ? 12 : 0), y, size, note ? MUTED : INK);
      y -= leading;
    }
    if (heading) y -= 5;
  }
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: MARGIN, y: 49 }, end: { x: PAGE_WIDTH - MARGIN, y: 49 }, thickness: 0.6, color: RULE });
    p.drawText('내부 업무 보고서', { x: MARGIN, y: 32, size: 8, font, color: MUTED });
    const label = `${i + 1} / ${pages.length}`;
    p.drawText(label, { x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(label, 8), y: 32, size: 8, font, color: MUTED });
  });
  return pdf.save();
}
