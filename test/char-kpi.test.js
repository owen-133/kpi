import {describe,test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {currentMonth} from '../public/kpi-model.js';
import {defaults} from '../public/settings-model.js';

// Characterization test: pins what the KPI-area endpoints answer today (status + message).
// It describes current behavior, not desired behavior. Lines marked `todo:` look like defects;
// they are pinned so a change is noticed, and the product code is left alone.
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const ADMIN='char-admin',VIEWER='char-viewer';

async function freePort(){const s=createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const {port}=s.address();s.close();await once(s,'close');return port;}

// One real server on a free port with its own temp DATA_DIR and local (sqlite) storage.
async function startServer(){
 const port=await freePort(),dir=mkdtempSync(join(tmpdir(),'orbit-char-kpi-'));
 const env={...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:dir,ADMIN_PASSWORD:ADMIN,VIEWER_PASSWORD:VIEWER};
 for(const k of ['STORAGE_BACKEND','NODE_ENV','SUPABASE_URL'])delete env[k];
 const child=spawn(process.execPath,['server.js'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
 await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('server failed to start');})]);
 const stop=async()=>{if(child.exitCode===null){const done=once(child,'exit');child.kill();await done;}rmSync(dir,{recursive:true,force:true});};
 const req=async(path,body,viewer=false)=>{
  const r=await fetch(`http://127.0.0.1:${port}/api/${path}`,{method:body!==undefined?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Basic '+Buffer.from(viewer?`viewer:${VIEWER}`:`admin:${ADMIN}`).toString('base64')},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  return {status:r.status,data:await r.json()};
 };
 return {req,stop};
}
function withServer(){const ctx={};before(async()=>{Object.assign(ctx,await startServer());});after(async()=>{await ctx.stop();});return ctx;}
const newTask=async(ctx,title='첨부 시험')=>(await ctx.req('tasks',{title,requester:'직원',requested_at:new Date().toISOString()})).data.id;
const b64=bytes=>Buffer.alloc(bytes,65).toString('base64');
const detail=async(ctx,id)=>(await ctx.req('tasks/'+id)).data;

const MSG_FILE_KIND='지원 파일: PDF·이미지·TXT·CSV·XLSX·DOCX, 최대 1MB';
const MSG_FILE_SIZE='첨부파일은 1MB 이하여야 합니다.';
const MSG_FILE_COUNT='업무당 첨부파일은 10개까지 가능합니다.';
const MSG_MONTH='조회 월을 확인하세요.';

// R-015
describe('첨부파일 경계',()=>{
 const ctx=withServer();
 test('0바이트(빈 content)는 400 이고 종류·크기 안내 문구를 돌려준다',async()=>{
  const id=await newTask(ctx);const r=await ctx.req(`tasks/${id}/files`,{name:'빈파일.txt',content:''});
  assert.equal(r.status,400);assert.equal(r.data.error,MSG_FILE_KIND);
  assert.equal((await detail(ctx,id)).kpi.files.length,0);
 });
 test('base64 로 풀면 0바이트가 되는 content "A" 는 400 이고 1MB 초과 문구를 돌려준다',async()=>{
  // todo: the message says "over 1MB" for an empty decoded file (server.js:53 `!buffer.length` shares the size message)
  const id=await newTask(ctx);const r=await ctx.req(`tasks/${id}/files`,{name:'빈파일.txt',content:'A'});
  assert.equal(r.status,400);assert.equal(r.data.error,MSG_FILE_SIZE);
 });
 test('1바이트·1048575·1048576(정확히 1MB) 바이트는 201 로 받고 크기를 그대로 저장한다',async()=>{
  const id=await newTask(ctx);
  for(const size of [1,1048575,1048576]){
   const r=await ctx.req(`tasks/${id}/files`,{name:`size-${size}.txt`,content:b64(size)});
   assert.equal(r.status,201,`size ${size}`);assert.match(r.data.id,/^[0-9a-f-]{36}$/);
  }
  const files=(await detail(ctx,id)).kpi.files;
  assert.deepEqual(files.map(f=>[f.name,f.size]),[['size-1.txt',1],['size-1048575.txt',1048575],['size-1048576.txt',1048576]]);
 });
 test('1048577·1048578 바이트는 base64 길이가 한도(1398104자)와 같아 디코딩 크기 검사에서 400 이다',async()=>{
  const id=await newTask(ctx);
  for(const size of [1048577,1048578]){
   const content=b64(size);assert.equal(content.length,1398104);
   const r=await ctx.req(`tasks/${id}/files`,{name:`over-${size}.txt`,content});
   assert.equal(r.status,400,`size ${size}`);assert.equal(r.data.error,MSG_FILE_SIZE);
  }
  assert.equal((await detail(ctx,id)).kpi.files.length,0);
 });
 test('1048579 바이트는 base64 길이가 한도를 넘어 첫 검사에서 400 이고 종류·크기 안내 문구를 돌려준다',async()=>{
  const id=await newTask(ctx);const content=b64(1048579);assert.equal(content.length,1398108);
  const r=await ctx.req(`tasks/${id}/files`,{name:'over.txt',content});
  assert.equal(r.status,400);assert.equal(r.data.error,MSG_FILE_KIND);
 });
 test('허용 확장자 파일은 받고 허용하지 않는 확장자·base64 가 아닌 content 는 400 이다',async()=>{
  const id=await newTask(ctx);
  assert.equal((await ctx.req(`tasks/${id}/files`,{name:'표.xlsx',content:'QQ=='})).status,201);
  assert.equal((await ctx.req(`tasks/${id}/files`,{name:'대문자.PNG',content:'QQ=='})).status,201);
  for(const body of [{name:'위험.exe',content:'QQ=='},{name:'확장자없음',content:'QQ=='},{name:'글.txt',content:'QQ==!'},{name:'글.txt',content:'Q Q=='}]){
   const r=await ctx.req(`tasks/${id}/files`,body);
   assert.equal(r.status,400,JSON.stringify(body));assert.equal(r.data.error,MSG_FILE_KIND);
  }
  assert.equal((await detail(ctx,id)).kpi.files.length,2);
 });
 test('파일 이름의 경로 구분자는 밑줄로 바뀌어 저장되고 150자가 넘으면 확장자가 잘려 400 이다',async()=>{
  const id=await newTask(ctx);
  assert.equal((await ctx.req(`tasks/${id}/files`,{name:'a/b\\c.txt',content:'QQ=='})).status,201);
  const exact='x'.repeat(146)+'.txt';assert.equal(exact.length,150);
  assert.equal((await ctx.req(`tasks/${id}/files`,{name:exact,content:'QQ=='})).status,201);
  const over='x'.repeat(147)+'.txt';assert.equal(over.length,151);
  const r=await ctx.req(`tasks/${id}/files`,{name:over,content:'QQ=='});
  assert.equal(r.status,400);assert.equal(r.data.error,MSG_FILE_KIND);
  assert.deepEqual((await detail(ctx,id)).kpi.files.map(f=>f.name),['a_b_c.txt',exact]);
 });
 test('없는 업무에 올리면 404 이다',async()=>{
  const r=await ctx.req('tasks/no-such-task/files',{name:'a.txt',content:'QQ=='});
  assert.equal(r.status,404);assert.equal(r.data.error,'업무를 찾을 수 없습니다.');
 });
});

// R-015
describe('업무당 첨부 10개 한도와 이력 문장',()=>{
 const ctx=withServer();
 test('10번째는 201 이고 11번째는 400 이며 다른 업무는 영향을 받지 않는다',async()=>{
  const id=await newTask(ctx,'열 개 업무'),other=await newTask(ctx,'다른 업무');
  for(let i=1;i<=10;i++)assert.equal((await ctx.req(`tasks/${id}/files`,{name:`f${i}.txt`,content:'QQ=='})).status,201,`file ${i}`);
  const r=await ctx.req(`tasks/${id}/files`,{name:'f11.txt',content:'QQ=='});
  assert.equal(r.status,400);assert.equal(r.data.error,MSG_FILE_COUNT);
  assert.equal((await detail(ctx,id)).kpi.files.length,10);
  assert.equal((await ctx.req(`tasks/${other}/files`,{name:'f1.txt',content:'QQ=='})).status,201);
 });
 test('한 개를 지우면 다시 올릴 수 있고 11번째 시도는 이력에 남지 않는다',async()=>{
  const id=await newTask(ctx,'지우고 다시');
  for(let i=1;i<=10;i++)await ctx.req(`tasks/${id}/files`,{name:`f${i}.txt`,content:'QQ=='});
  await ctx.req(`tasks/${id}/files`,{name:'rejected.txt',content:'QQ=='});
  let task=await detail(ctx,id);assert.equal(task.events.some(e=>e.detail==='rejected.txt'),false);
  assert.equal((await ctx.req(`tasks/${id}/files/${task.kpi.files[0].id}`,{})).status,200);
  assert.equal((await ctx.req(`tasks/${id}/files`,{name:'again.txt',content:'QQ=='})).status,201);
  task=await detail(ctx,id);assert.equal(task.kpi.files.length,10);
 });
 test('올리면 이력에 "첨부파일 등록" 과 파일 이름이, 지우면 "첨부파일 삭제" 와 파일 이름이 총무 담당자 이름으로 남는다',async()=>{
  const id=await newTask(ctx,'이력 업무');
  const added=await ctx.req(`tasks/${id}/files`,{name:'견적서.pdf',content:'QQ=='});
  let events=(await detail(ctx,id)).events;
  assert.deepEqual(events.slice(-1).map(e=>[e.kind,e.detail,e.actor]),[['첨부파일 등록','견적서.pdf','총무 담당자']]);
  await ctx.req(`tasks/${id}/files/${added.data.id}`,{});
  events=(await detail(ctx,id)).events;
  assert.deepEqual(events.slice(-2).map(e=>[e.kind,e.detail]),[['첨부파일 등록','견적서.pdf'],['첨부파일 삭제','견적서.pdf']]);
 });
 test('없는 파일을 지우면 404 이고 이력은 늘지 않는다',async()=>{
  const id=await newTask(ctx,'없는 파일');const before=(await detail(ctx,id)).events.length;
  const r=await ctx.req(`tasks/${id}/files/no-such-file`,{});
  assert.equal(r.status,404);assert.equal(r.data.error,'파일을 찾을 수 없습니다.');
  assert.equal((await detail(ctx,id)).events.length,before);
 });
 test('조회 계정은 올릴 수 없고(403) 이력도 늘지 않는다',async()=>{
  const id=await newTask(ctx,'조회 계정');const before=(await detail(ctx,id)).events.length;
  const r=await ctx.req(`tasks/${id}/files`,{name:'a.txt',content:'QQ=='},true);
  assert.equal(r.status,403);assert.equal(r.data.error,'조회 계정은 업무를 변경할 수 없습니다.');
  assert.equal((await detail(ctx,id)).events.length,before);
 });
});

// R-022
describe('월 매개변수 검증',()=>{
 const ctx=withServer();
 test('YYYY-MM 형식이면 200 이고 지표와 초안에 그 월이 담긴다 (01 과 12 가 경계)',async()=>{
  for(const month of ['2026-01','2026-12',currentMonth()]){
   const r=await ctx.req('report-preview?month='+month);
   assert.equal(r.status,200,month);assert.equal(r.data.metrics.month,month);assert.ok(r.data.draft.startsWith(month),month);assert.match(r.data.fingerprint,/^[0-9a-f]{64}$/);
  }
 });
 test('형식이 어긋난 월(00·13·한 자리·두 자리 연도·일자 포함·문자·빈 값)은 400 이다',async()=>{
  for(const month of ['2026-00','2026-13','2026-1','26-11','2026-11-01','2026-1x','2026/11','',' 2026-11']){
   const r=await ctx.req('report-preview?month='+encodeURIComponent(month));
   assert.equal(r.status,400,JSON.stringify(month));assert.equal(r.data.error,MSG_MONTH);
  }
 });
 test('월 매개변수가 없으면 400 이다',async()=>{
  const r=await ctx.req('report-preview');assert.equal(r.status,400);assert.equal(r.data.error,MSG_MONTH);
 });
 test('미래 월도 집계(미리보기)는 200 이고 막는 것은 발행뿐이다',async()=>{
  const r=await ctx.req('report-preview?month=9999-12');assert.equal(r.status,200);assert.equal(r.data.metrics.received,0);
 });
 test('조회 계정도 미리보기는 읽을 수 있다',async()=>{
  assert.equal((await ctx.req('report-preview?month='+currentMonth(),undefined,true)).status,200);
 });
});

const nextMonth=m=>{const [y,mo]=m.split('-').map(Number);return mo===12?`${y+1}-01`:`${y}-${String(mo+1).padStart(2,'0')}`;};
const prevMonth=m=>{const [y,mo]=m.split('-').map(Number);return mo===1?`${y-1}-12`:`${y}-${String(mo-1).padStart(2,'0')}`;};

// R-023
describe('월간 보고서 발행',()=>{
 const ctx=withServer();
 const fingerprint=async()=>(await ctx.req('report-preview?month='+currentMonth())).data.fingerprint;
 const publish=async(body)=>ctx.req('reports',{fingerprint:await fingerprint(),...body});
 const count=async()=>(await ctx.req('reports')).data.length;
 before(async()=>{await newTask(ctx,'발행 시험 업무');});

 test('이번 달 발행은 201 이고 발행본이 문안·집계값·작성자와 함께 다시 읽힌다',async()=>{
  const month=currentMonth();const r=await publish({month,draft:'  검토한 문안  '});
  assert.equal(r.status,201);
  const saved=(await ctx.req('reports',undefined,true)).data.find(x=>x.id===r.data.id);
  assert.equal(saved.month,month);assert.equal(saved.draft,'검토한 문안');assert.equal(saved.actor,'admin');
  assert.equal(saved.method,'담당자 검토 발행 · 규칙 기반 집계');assert.equal(saved.metrics.month,month);assert.equal(saved.metrics.received,1);
 });
 test('지난 달 발행은 201 이다 (미래 월 거절과 짝)',async()=>{
  assert.equal((await publish({month:prevMonth(currentMonth()),draft:'지난달'})).status,201);
 });
 test('다음 달·먼 미래 월 발행은 400 이고 발행본이 늘지 않는다',async()=>{
  const before=await count();
  for(const month of [nextMonth(currentMonth()),'9999-12']){
   const r=await publish({month,draft:'미래'});
   assert.equal(r.status,400,month);assert.equal(r.data.error,'미래 월 리포트는 발행할 수 없습니다.');
  }
  assert.equal(await count(),before);
 });
 test('월이 형식에 어긋나거나 없으면 400 이다',async()=>{
  for(const body of [{month:'2026-13',draft:'x'},{month:'',draft:'x'},{draft:'x'}]){
   const r=await publish(body);assert.equal(r.status,400,JSON.stringify(body));assert.equal(r.data.error,MSG_MONTH);
  }
 });
 test('지문이 다르면 월 검사보다 먼저 409 로 막는다',async()=>{
  const r=await ctx.req('reports',{month:nextMonth(currentMonth()),fingerprint:'0'.repeat(64),draft:'x'});
  assert.equal(r.status,409);assert.equal(r.data.error,'집계 후 업무가 변경됐습니다. 새로 집계하고 발행하세요.');
  assert.equal((await ctx.req('reports',{month:currentMonth(),draft:'x'})).status,409);
 });
 test('문안 20000자는 201 이고 20001자는 400 이며 발행본이 늘지 않는다',async()=>{
  const month=currentMonth();
  const ok=await publish({month,draft:'가'.repeat(20000)});assert.equal(ok.status,201);
  const before=await count();
  const r=await publish({month,draft:'가'.repeat(20001)});
  assert.equal(r.status,400);assert.equal(r.data.error,'보고서는 20000자 이하로 입력하세요.');
  assert.equal(await count(),before);
  const saved=(await ctx.req('reports')).data.find(x=>x.id===ok.data.id);assert.equal(saved.draft.length,20000);
 });
 test('글자 수 검사는 앞뒤 공백을 지운 뒤에 한다 (공백 포함 20003자도 201)',async()=>{
  const r=await publish({month:currentMonth(),draft:' '+'가'.repeat(20000)+'  '});
  assert.equal(r.status,201);
  assert.equal((await ctx.req('reports')).data.find(x=>x.id===r.data.id).draft.length,20000);
 });
 test('문안을 생략하면 규칙 기반 초안이 발행된다',async()=>{
  const month=currentMonth();const preview=(await ctx.req('report-preview?month='+month)).data;
  const r=await ctx.req('reports',{month,fingerprint:preview.fingerprint});
  assert.equal(r.status,201);
  const stamp=text=>text.replace(/집계 시점 \S+?Z\./,'집계 시점 <TS>.');
  const draft=(await ctx.req('reports')).data.find(x=>x.id===r.data.id).draft;
  assert.ok(draft.startsWith(month+' 총무 업무 처리현황'));assert.equal(stamp(draft),stamp(preview.draft));
 });
 test('공백만 있는 문안은 빈 문안으로 발행된다',async()=>{
  // todo: whitespace-only draft is truthy so the rule-based fallback is skipped and an empty report is published (server.js:48)
  const r=await publish({month:currentMonth(),draft:'   '});
  assert.equal(r.status,201);
  assert.equal((await ctx.req('reports')).data.find(x=>x.id===r.data.id).draft,'');
 });
 test('같은 월을 다시 발행하면 별도 발행본이 쌓인다',async()=>{
  const month=currentMonth(),before=(await ctx.req('reports')).data.filter(x=>x.month===month).length;
  const a=await publish({month,draft:'첫 판'}),b=await publish({month,draft:'둘째 판'});
  assert.notEqual(a.data.id,b.data.id);
  assert.equal((await ctx.req('reports')).data.filter(x=>x.month===month).length,before+2);
 });
});

// R-025
describe('개선 관리대장 입력 검증',()=>{
 const ctx=withServer();
 const valid={title:'기한 누락',stage:'MVP 구축',source:'팀장 시연',feedback:'기한 확인 어려움',action:'지표 추가',result:'',status:'접수'};
 const save=(value,extra={})=>ctx.req('improvements',{value,...extra});
 const list=async()=>(await ctx.req('improvements')).data;

 test('필수 항목이 비었거나 단계·상태가 목록 밖이거나 검증 완료에 결과가 없으면 400 이고 대장이 늘지 않는다',async()=>{
  const cases=[
   [{...valid,title:''},'개선 제목과 피드백을 입력하세요.'],
   [{...valid,title:'   '},'개선 제목과 피드백을 입력하세요.'],
   [{...valid,feedback:''},'개선 제목과 피드백을 입력하세요.'],
   [{...valid,stage:'알 수 없음'},'단계와 상태를 확인하세요.'],
   [{...valid,status:'알 수 없음'},'단계와 상태를 확인하세요.'],
   [{...valid,status:'검증 완료',result:''},'검증 완료에는 검증 결과가 필요합니다.'],
   [{...valid,status:'검증 완료',result:'   '},'검증 완료에는 검증 결과가 필요합니다.'],
   [{...valid,title:'가'.repeat(5001)},'개선 내용은 항목별 5000자 이하로 입력하세요.'],
   [{...valid,stage:'가'.repeat(5001)},'개선 내용은 항목별 5000자 이하로 입력하세요.'],
  ];
  for(const [value,message] of cases){const r=await save(value);assert.equal(r.status,400,JSON.stringify(value).slice(0,80));assert.equal(r.data.error,message);}
  assert.equal((await list()).length,0);
 });
 test('value 가 없거나 객체가 아니면 400 이다',async()=>{
  for(const body of [{},{value:null},{value:'문자열'},{value:[]}]){
   const r=await ctx.req('improvements',body);assert.equal(r.status,400,JSON.stringify(body));assert.equal(r.data.error,'개선 제목과 피드백을 입력하세요.');
  }
 });
 test('항목은 5000자까지 201 이고 앞뒤 공백을 지운 뒤 센다',async()=>{
  assert.equal((await save({...valid,action:'가'.repeat(5000)})).status,201);
  assert.equal((await save({...valid,action:' '+'가'.repeat(5000)+'  '})).status,201);
  assert.ok((await list()).every(x=>x.action.length===5000));
 });
 test('올바른 항목은 201 로 저장되어 목록에 남고 수정 이력에 빈 이전 값과 새 값이 admin 으로 기록된다',async()=>{
  const r=await save({...valid,title:'  저장 시험  ',status:'검증 완료',result:'확인함',unknown:'버려짐'});
  assert.equal(r.status,201);
  const saved=(await list()).find(x=>x.id===r.data.id);
  assert.deepEqual({title:saved.title,stage:saved.stage,status:saved.status,result:saved.result,revision:saved.revision},{title:'저장 시험',stage:'MVP 구축',status:'검증 완료',result:'확인함',revision:1});
  assert.equal('unknown' in saved,false);
  const history=(await ctx.req(`improvements/${r.data.id}/history`)).data;
  assert.equal(history.length,1);assert.equal(history[0].actor,'admin');assert.deepEqual(history[0].before,{});assert.equal(history[0].after.title,'저장 시험');
 });
 test('id 가 있는데 버전이 없거나 0·문자열·소수면 400 이다',async()=>{
  const id=(await save(valid)).data.id;
  for(const revision of [undefined,0,'1',1.5,-1]){
   const r=await save(valid,{id,revision});
   assert.equal(r.status,400,String(revision));assert.equal(r.data.error,'개선 항목 버전을 확인하세요.');
  }
  assert.equal((await list()).find(x=>x.id===id).revision,1);
  assert.equal((await save({...valid,title:'버전 1'},{id,revision:1})).status,201);
 });
 test('없는 id 로 저장하면 404 이다',async()=>{
  const r=await save(valid,{id:'no-such-id',revision:1});
  assert.equal(r.status,404);assert.equal(r.data.error,'개선 항목을 찾을 수 없습니다.');
 });
 test('입력 검증은 버전 검사보다 먼저다 (잘못된 값 + 틀린 버전은 400)',async()=>{
  const id=(await save(valid)).data.id;
  const r=await save({...valid,title:''},{id,revision:99});
  assert.equal(r.status,400);assert.equal(r.data.error,'개선 제목과 피드백을 입력하세요.');
 });
 test('없는 id 의 수정 이력은 오류가 아니라 빈 목록이다',async()=>{
  const r=await ctx.req('improvements/no-such-id/history');assert.equal(r.status,200);assert.deepEqual(r.data,[]);
 });
});

// R-029
describe('관리자 설정 저장 검증',()=>{
 const ctx=withServer();
 const current=async()=>(await ctx.req('settings')).data;
 const save=async(values,revision)=>ctx.req('settings',{values,revision:revision??(await current()).revision});
 const text=(key,value)=>({...defaults,texts:{...defaults.texts,[key]:value}});
 const history=async()=>(await ctx.req('settings/history')).data;

 test('잘못된 값은 모두 400 이고 버전과 이력이 그대로다',async()=>{
  const cases=[
   [null,'설정 형식을 확인하세요.'],
   [[],'설정 형식을 확인하세요.'],
   [{...defaults,script:'x'},'지원하지 않는 설정입니다.'],
   [text('noSuchText','a'),'지원하지 않는 문구입니다.'],
   [text('portalName','   '),'포털 이름은 1~1000자로 입력하세요.'],
   [text('portalName','가'.repeat(1001)),'포털 이름은 1~1000자로 입력하세요.'],
   [{...defaults,categories:[]},'업무 분류은 1~30개, 항목별 1~50자로 입력하세요.'],
   [{...defaults,categories:Array.from({length:31},(_,i)=>'분류'+i)},'업무 분류은 1~30개, 항목별 1~50자로 입력하세요.'],
   [{...defaults,categories:['가'.repeat(51)]},'업무 분류은 1~30개, 항목별 1~50자로 입력하세요.'],
   [{...defaults,channels:['']},'접수 경로은 1~30개, 항목별 1~50자로 입력하세요.'],
   [{...defaults,priorities:[]},'우선순위은 1~30개, 항목별 1~50자로 입력하세요.'],
   [{...defaults,categories:['같음','같음']},'업무 분류에 중복 항목이 있습니다.'],
   [{...defaults,primaryColor:'red'},'색상 형식을 확인하세요.'],
   [{...defaults,accentColor:'#fff'},'색상 형식을 확인하세요.'],
   [{...defaults,showBanner:'yes'},'배너 표시 설정을 확인하세요.'],
   [{...defaults,logo:'data:image/svg+xml;base64,AAAA'},'로고는 200KB 이하 PNG, JPEG, WebP 이미지를 사용하세요.'],
   [{...defaults,logo:'data:image/png;base64,'+'A'.repeat(280000-22+1)},'로고는 200KB 이하 PNG, JPEG, WebP 이미지를 사용하세요.'],
  ];
  for(const [values,message] of cases){const r=await save(values);assert.equal(r.status,400,message+' '+JSON.stringify(values).slice(0,60));assert.equal(r.data.error,message);}
  assert.equal((await current()).revision,0);assert.deepEqual(await history(),[]);
 });
 test('버전이 없거나 음수·소수·문자열이면 400 이다',async()=>{
  for(const revision of [undefined,-1,1.5,'0']){
   const r=await ctx.req('settings',{values:defaults,revision});
   assert.equal(r.status,400,String(revision));assert.equal(r.data.error,'설정 버전을 확인하세요.');
  }
  assert.equal((await current()).revision,0);
 });
 test('입력 검증은 버전 충돌 검사보다 먼저다 (잘못된 값 + 낡은 버전은 409 가 아니라 400)',async()=>{
  const r=await save({...defaults,primaryColor:'red'},99);
  assert.equal(r.status,400);assert.equal(r.data.error,'색상 형식을 확인하세요.');
 });
 // R-028
 test('경계값(문구 1000자·선택 항목 30개·항목 50자·로고 280000자)은 모두 200 으로 저장되고 버전이 하나씩 오른다',async()=>{
  const longText='가'.repeat(1000);
  const r1=await save(text('portalName',longText));assert.equal(r1.status,200);assert.equal(r1.data.revision,1);assert.equal(r1.data.values.texts.portalName,longText);
  const many=Array.from({length:30},(_,i)=>String(i).padStart(2,'0')+'가'.repeat(48));
  const r2=await save({...defaults,categories:many});assert.equal(r2.status,200);assert.equal(r2.data.revision,2);assert.equal(r2.data.values.categories.length,30);assert.equal(r2.data.values.categories[0].length,50);
  const logo='data:image/png;base64,'+'A'.repeat(280000-22);assert.equal(logo.length,280000);
  const r3=await save({...defaults,logo});assert.equal(r3.status,200);assert.equal(r3.data.revision,3);
  assert.equal((await current()).revision,3);
 });
 test('저장하면 문구 앞뒤 공백이 지워지고 일부 항목만 보내면 나머지는 기본값으로 채워진다',async()=>{
  const r=await save({showBanner:false});
  assert.equal(r.status,200);assert.equal(r.data.values.showBanner,false);assert.deepEqual(r.data.values.categories,defaults.categories);assert.equal(r.data.values.texts.portalName,defaults.texts.portalName);
  const r2=await save(text('portalName','  우리 회사  '));assert.equal(r2.status,200);assert.equal(r2.data.values.texts.portalName,'우리 회사');
 });
 // R-028
 test('저장마다 변경 이력이 admin 으로 쌓이고 이력의 수정 후 값이 저장된 값이다',async()=>{
  const before=(await history()).length;const rev=(await current()).revision;
  const r=await save(text('boardTitle','이력 확인용 제목'));assert.equal(r.status,200);
  const h=await history();assert.equal(h.length,before+1);
  assert.equal(h[0].actor,'admin');assert.equal(h[0].after.texts.boardTitle,'이력 확인용 제목');assert.equal(h[0].before.texts.boardTitle,defaults.texts.boardTitle);
  assert.equal((await current()).revision,rev+1);
 });
 test('조회 계정은 저장할 수 없고(403) 읽기는 200 이며 버전과 이력이 그대로다',async()=>{
  const rev=(await current()).revision,count=(await history()).length;
  const w=await ctx.req('settings',{values:text('boardTitle','조회 계정 시도'),revision:rev},true);
  assert.equal(w.status,403);assert.equal(w.data.error,'조회 계정은 업무를 변경할 수 없습니다.');
  const read=await ctx.req('settings',undefined,true);assert.equal(read.status,200);assert.equal(read.data.revision,rev);assert.notEqual(read.data.values.texts.boardTitle,'조회 계정 시도');
  const h=await ctx.req('settings/history',undefined,true);assert.equal(h.status,403);assert.equal(h.data.error,'관리자만 설정 이력을 볼 수 있습니다.');
  assert.equal((await history()).length,count);
 });
 test('texts 가 배열이어도 200 으로 저장되어 기본 문구로 채워진다',async()=>{
  // todo: validateSettings accepts `texts: []` (normalizeSettings spreads it into an object), so the "문구 설정을 확인하세요." branch is unreachable
  const r=await save({...defaults,texts:[]});
  assert.equal(r.status,200);assert.deepEqual(r.data.values.texts,defaults.texts);
 });
});
