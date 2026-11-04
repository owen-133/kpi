import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createReportPdf} from '../public/pdf/report-pdf.js';

test('PDF: 한글·A4·원시 집계값 제외·긴 문안 페이지 나눔',{skip:!process.env.ORBIT_PDF_CHECK},async()=>{
 const dir=mkdtempSync(join(tmpdir(),'orbit-pdf-'));
 try{
 const record={id:'published-1',month:'2026-11',created_at:'2026-11-04T01:00:00Z',actor:'admin',metrics:{raw_test_marker:'RAW_METRICS_MUST_NOT_APPEAR'},draft:'2026-11 총무 업무 처리현황\n\n1. 처리 현황\n한글 업무 내역이 정확하게 출력됩니다.\n\n2. 상세 검증\n'+Array.from({length:120},(_,i)=>`${i+1}번째 검증 문안: 요청 등록부터 완료까지 처리 내용을 살펴봅니다. 길이가 긴 문단도 여백 안에서 정돈되어야 합니다.`).join('\n')+'\n마지막 문안 확인'};
 const bytes=await createReportPdf(record,{fontBytes:readFileSync(new URL('../public/fonts/NanumGothic-Regular.ttf',import.meta.url)),portalName:'피플팀 업무 포털'});
 assert.equal(Buffer.from(bytes).subarray(0,5).toString(),'%PDF-');const path=join(dir,'report.pdf');writeFileSync(path,bytes);
 const info=execFileSync('pdfinfo',[path],{encoding:'utf8'});assert.match(info,/A4/);assert.ok(Number(info.match(/Pages:\s+(\d+)/)[1])>=3);
 const content=execFileSync('pdftotext',['-layout',path,'-'],{encoding:'utf8'});assert.match(content,/한글 업무 내역이 정확하게 출력됩니다/);assert.match(content,/마지막 문안 확인/);assert.doesNotMatch(content,/발행 시점의 집계값|RAW_METRICS_MUST_NOT_APPEAR|raw_test_marker/);assert.match(content,/1\s*\/\s*\d/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
