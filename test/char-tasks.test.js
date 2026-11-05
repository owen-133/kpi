import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';

// Characterization tests: pin what the task endpoints answer today (status + message)
// for the body-size limit, assignee length, the test-data flag and the edit endpoint.
// They describe current behavior; they do not say the behavior is ideal.
// Real server on a free port, temp DATA_DIR, local SQLite storage.
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const ADMIN='char-admin',VIEWER='char-viewer';
const BODY_LIMIT=1600000,FIELD_LIMIT=10000,ASSIGNEE_LIMIT=100,REASON_LIMIT=1000;
const MSG={
 tooLong:'입력 내용이 너무 깁니다.',
 badJson:'잘못된 입력입니다.',
 fieldLength:'입력 길이를 확인하세요.',
 assignee:'담당자를 1~100자로 입력하세요.',
 dataFlag:'데이터 구분을 확인하세요.',
 editField:'수정 항목을 확인하세요.',
 editRequired:'업무명·요청자·요청 시각·기한을 확인하세요.',
 editReason:'수정 사유와 버전을 확인하세요.',
 notFound:'업무를 찾을 수 없습니다.',
 viewer:'조회 계정은 업무를 변경할 수 없습니다.',
};

async function freePort(){const s=createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const {port}=s.address();s.close();await once(s,'close');return port;}

let child,dir,base;
before(async()=>{
 const port=await freePort();dir=mkdtempSync(join(tmpdir(),'orbit-char-tasks-'));
 const env={...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:dir,ADMIN_PASSWORD:ADMIN,VIEWER_PASSWORD:VIEWER};
 for(const k of ['STORAGE_BACKEND','NODE_ENV','SUPABASE_URL'])delete env[k];
 child=spawn(process.execPath,['server.js'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
 await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('server failed to start');})]);
 base='http://127.0.0.1:'+port;
});
after(async()=>{
 if(child&&child.exitCode===null){const done=once(child,'exit');child.kill();await done;}
 if(dir)rmSync(dir,{recursive:true,force:true});
});

const auth=(u,p)=>'Basic '+Buffer.from(u+':'+p).toString('base64');
// api(path, body) -> {status, data}. A string body is sent as-is (raw), an object as JSON.
async function api(path,body,{viewer=false}={}){
 const headers={Authorization:viewer?auth('viewer',VIEWER):auth('admin',ADMIN)};
 const init={method:body===undefined?'GET':'POST',headers};
 if(body!==undefined){headers['Content-Type']='application/json';init.body=typeof body==='string'?body:JSON.stringify(body);}
 const res=await fetch(base+path,init);
 return {status:res.status,data:await res.json()};
}
const taskInput={title:'특성 업무',requester:'요청자',department:'총무',channel:'구두',category:'일반 총무',priority:'중',requested_at:'2026-11-01T01:00:00.000Z',due_date:'2026-11-03',description:'내용'};
async function newTask(){const r=await api('/api/tasks',taskInput);assert.equal(r.status,201);return r.data.id;}
const events=async id=>(await api('/api/tasks/'+id)).data.events;
const lastEvent=async(id,kind)=>(await events(id)).filter(e=>e.kind===kind).at(-1);
// A valid create body padded with an ignored `pad` key so its total length is exactly `size` chars.
function paddedCreate(size,over={}){
 const head=JSON.stringify({...taskInput,...over,pad:''}).slice(0,-2);
 const pad='x'.repeat(size-head.length-2);
 const text=head+pad+'"}';
 assert.equal(text.length,size);JSON.parse(text);
 return text;
}

// R-001
test('[R-001] POST body of exactly 1600000 chars is still accepted (201), 1599999 too',async()=>{
 for(const size of [BODY_LIMIT-1,BODY_LIMIT]){
  const r=await api('/api/tasks',paddedCreate(size));
  assert.equal(r.status,201,'size '+size);assert.ok(r.data.id);
 }
});

test('[R-001] POST body of 1600001 chars is rejected with 413 and the too-long message',async()=>{
 const r=await api('/api/tasks',paddedCreate(BODY_LIMIT+1));
 assert.equal(r.status,413);assert.deepEqual(r.data,{error:MSG.tooLong});
});

test('[R-001] 413 is decided before the JSON is parsed: oversized non-JSON gets 413, small non-JSON gets 400',async()=>{
 const big=await api('/api/tasks','x'.repeat(BODY_LIMIT+1));
 assert.equal(big.status,413);assert.equal(big.data.error,MSG.tooLong);
 const small=await api('/api/tasks','x'.repeat(10));
 assert.equal(small.status,400);assert.equal(small.data.error,MSG.badJson);
});

test('[R-001] the limit is not specific to task creation: assign also answers 413 above it and works at it',async()=>{
 const id=await newTask();
 const pad=n=>'{"assignee":"한 사람","pad":"'+'x'.repeat(n-'{"assignee":"한 사람","pad":""}'.length)+'"}';
 const over=await api('/api/tasks/'+id+'/assign',pad(BODY_LIMIT+1));
 assert.equal(over.status,413);assert.equal(over.data.error,MSG.tooLong);
 const at=await api('/api/tasks/'+id+'/assign',pad(BODY_LIMIT));
 assert.equal(at.status,200);assert.deepEqual(at.data,{ok:true});
});

test('[R-001] a viewer sending an oversized body gets 403, not 413 (permission is checked before the body is read)',async()=>{
 const r=await api('/api/tasks',paddedCreate(BODY_LIMIT+1),{viewer:true});
 assert.equal(r.status,403);assert.equal(r.data.error,MSG.viewer);
});

test('[R-001] a body just under the limit with a 10001-char field gets the field-length 400, not 413',async()=>{
 const r=await api('/api/tasks',paddedCreate(BODY_LIMIT-1,{description:'a'.repeat(FIELD_LIMIT+1)}));
 assert.equal(r.status,400);assert.deepEqual(r.data,{error:MSG.fieldLength});
});

test('[R-001] field length boundary on create: 9999 and 10000 chars are accepted, 10001 gets 400',async()=>{
 for(const n of [FIELD_LIMIT-1,FIELD_LIMIT]){
  const r=await api('/api/tasks',{...taskInput,description:'a'.repeat(n)});
  assert.equal(r.status,201,'length '+n);
 }
 const over=await api('/api/tasks',{...taskInput,description:'a'.repeat(FIELD_LIMIT+1)});
 assert.equal(over.status,400);assert.equal(over.data.error,MSG.fieldLength);
});

// R-020
test('[R-020] assignee boundary: 1, 99, 100 chars are accepted with 200; empty and 101 chars get 400 with the range message',async()=>{
 const id=await newTask();
 for(const n of [1,ASSIGNEE_LIMIT-1,ASSIGNEE_LIMIT]){
  const r=await api('/api/tasks/'+id+'/assign',{assignee:'가'.repeat(n)});
  assert.equal(r.status,200,'length '+n);assert.deepEqual(r.data,{ok:true});
 }
 const before=(await api('/api/tasks')).data.find(t=>t.id===id).assignee;
 assert.equal(before,'가'.repeat(ASSIGNEE_LIMIT));
 for(const bad of ['','가'.repeat(ASSIGNEE_LIMIT+1)]){
  const r=await api('/api/tasks/'+id+'/assign',{assignee:bad});
  assert.equal(r.status,400,'length '+bad.length);assert.deepEqual(r.data,{error:MSG.assignee});
 }
 const after=(await api('/api/tasks')).data.find(t=>t.id===id).assignee;
 assert.equal(after,before,'rejected assignments leave the stored assignee untouched');
});

test('[R-020] assignee is trimmed before the length check: whitespace-only is empty (400), 100 chars padded with spaces is accepted',async()=>{
 const id=await newTask();
 for(const blank of ['   ','\n\t ']){
  const r=await api('/api/tasks/'+id+'/assign',{assignee:blank});
  assert.equal(r.status,400);assert.equal(r.data.error,MSG.assignee);
 }
 const padded=await api('/api/tasks/'+id+'/assign',{assignee:'  '+'나'.repeat(ASSIGNEE_LIMIT)+'  '});
 assert.equal(padded.status,200);
 assert.equal((await api('/api/tasks')).data.find(t=>t.id===id).assignee,'나'.repeat(ASSIGNEE_LIMIT));
 const over=await api('/api/tasks/'+id+'/assign',{assignee:' '+'나'.repeat(ASSIGNEE_LIMIT+1)+' '});
 assert.equal(over.status,400);
});

test('[R-020] a missing or non-string assignee is treated as empty: missing and null get 400; a number is stringified and accepted',async()=>{
 const id=await newTask();
 for(const body of [{},{assignee:null}]){
  const r=await api('/api/tasks/'+id+'/assign',body);
  assert.equal(r.status,400);assert.equal(r.data.error,MSG.assignee);
 }
 const num=await api('/api/tasks/'+id+'/assign',{assignee:12345});
 assert.equal(num.status,200);
 assert.equal((await api('/api/tasks')).data.find(t=>t.id===id).assignee,'12345');
});

test('[R-020] assignee length counts UTF-16 units: 50 emoji (100 units) is accepted, 51 emoji gets 400',async()=>{
 const id=await newTask();
 const ok=await api('/api/tasks/'+id+'/assign',{assignee:'😀'.repeat(ASSIGNEE_LIMIT/2)});
 assert.equal(ok.status,200);
 const over=await api('/api/tasks/'+id+'/assign',{assignee:'😀'.repeat(ASSIGNEE_LIMIT/2+1)});
 assert.equal(over.status,400);assert.equal(over.data.error,MSG.assignee);
});

test('[R-020] assigning writes a history row "미배정 → name" first, then "old → new"; unknown task is 404; viewer is 403',async()=>{
 const id=await newTask();
 await api('/api/tasks/'+id+'/assign',{assignee:'  김담당 '});
 await api('/api/tasks/'+id+'/assign',{assignee:'이담당'});
 const rows=(await events(id)).filter(e=>e.kind==='담당자 배정');
 assert.deepEqual(rows.map(e=>e.detail),['미배정 → 김담당','김담당 → 이담당']);
 const missing=await api('/api/tasks/00000000-0000-0000-0000-000000000000/assign',{assignee:'x'});
 assert.equal(missing.status,404);assert.equal(missing.data.error,MSG.notFound);
 const v=await api('/api/tasks/'+id+'/assign',{assignee:'x'},{viewer:true});
 assert.equal(v.status,403);assert.equal(v.data.error,MSG.viewer);
});

// R-021
test('[R-021] flipping the data flag records the history sentence for each direction and the list shows the flag',async()=>{
 const id=await newTask();
 const toTest=await api('/api/tasks/'+id+'/test-data',{is_test:true});
 assert.equal(toTest.status,200);assert.deepEqual(toTest.data,{ok:true});
 assert.equal((await lastEvent(id,'데이터 구분 변경')).detail,'테스트 업무 · 지표 제외');
 assert.equal((await api('/api/tasks')).data.find(t=>t.id===id).is_test,1);
 const toReal=await api('/api/tasks/'+id+'/test-data',{is_test:false});
 assert.equal(toReal.status,200);
 assert.equal((await lastEvent(id,'데이터 구분 변경')).detail,'실제 업무 · 지표 포함');
 assert.equal((await api('/api/tasks')).data.find(t=>t.id===id).is_test,0);
 assert.equal((await events(id)).filter(e=>e.kind==='데이터 구분 변경').length,2);
});

test('[R-021] a non-boolean data flag gets 400 and writes no history; the real booleans still work',async()=>{
 const id=await newTask();
 const bad=[{},{is_test:'true'},{is_test:1},{is_test:0},{is_test:null},{is_test:'false'},{is_test:[true]}];
 for(const body of bad){
  const r=await api('/api/tasks/'+id+'/test-data',body);
  assert.equal(r.status,400,JSON.stringify(body));assert.deepEqual(r.data,{error:MSG.dataFlag});
 }
 assert.equal((await events(id)).filter(e=>e.kind==='데이터 구분 변경').length,0);
 assert.equal((await api('/api/tasks/'+id+'/test-data',{is_test:false})).status,200);
});

test('[R-021] the flag is checked before the task is looked up: bad value on an unknown id is 400, good value is 404; viewer is 403',async()=>{
 const ghost='/api/tasks/00000000-0000-0000-0000-000000000000/test-data';
 const bad=await api(ghost,{is_test:'yes'});
 assert.equal(bad.status,400);assert.equal(bad.data.error,MSG.dataFlag);
 const good=await api(ghost,{is_test:true});
 assert.equal(good.status,404);assert.equal(good.data.error,MSG.notFound);
 const id=await newTask();
 const v=await api('/api/tasks/'+id+'/test-data',{is_test:true},{viewer:true});
 assert.equal(v.status,403);assert.equal(v.data.error,MSG.viewer);
});

test('[R-021] setting the same flag value again still writes a history row (no change detection)',async()=>{
 // todo: finding - a repeat of the current value adds a "데이터 구분 변경" row although nothing changed.
 const id=await newTask();
 await api('/api/tasks/'+id+'/test-data',{is_test:false});
 await api('/api/tasks/'+id+'/test-data',{is_test:false});
 const rows=(await events(id)).filter(e=>e.kind==='데이터 구분 변경');
 assert.deepEqual(rows.map(e=>e.detail),['실제 업무 · 지표 포함','실제 업무 · 지표 포함']);
});

// R-031
async function editable(){const id=await newTask();return {id,path:'/api/tasks/'+id+'/edit'};}
const edited={...taskInput,title:'수정된 업무',requester:'수정 요청자',description:'수정된 내용'};

test('[R-031] a valid edit answers 200 with the next revision and writes one audit row with reason, before/after and actor admin',async()=>{
 const {id,path}=await editable();
 const r=await api(path,{values:edited,revision:0,reason:'  정정 사유  '});
 assert.equal(r.status,200);assert.deepEqual(r.data,{ok:true,revision:1});
 const row=await lastEvent(id,'업무 정보 수정');
 assert.equal(row.actor,'admin');
 assert.deepEqual(JSON.parse(row.detail),{reason:'정정 사유',changes:{
  title:{before:taskInput.title,after:'수정된 업무'},
  requester:{before:taskInput.requester,after:'수정 요청자'},
  description:{before:taskInput.description,after:'수정된 내용'},
 }});
 const task=(await api('/api/tasks/'+id)).data;
 assert.equal(task.title,'수정된 업무');assert.equal(task.edit_revision,1);assert.equal(task.status,'접수');
});

test('[R-031] an edit that changes nothing answers unchanged and adds no history row or revision',async()=>{
 const {id,path}=await editable();
 const r=await api(path,{values:taskInput,revision:0,reason:'변경 없음'});
 assert.equal(r.status,200);assert.deepEqual(r.data,{ok:true,unchanged:true});
 assert.equal((await events(id)).filter(e=>e.kind==='업무 정보 수정').length,0);
 assert.equal((await api('/api/tasks/'+id)).data.edit_revision,0);
});

test('[R-031] an edit with a missing, non-string or 10001-char field gets 400 with the field message; a 10000-char field is accepted',async()=>{
 const {id,path}=await editable();
 const without=k=>{const v={...edited};delete v[k];return v;};
 const cases=[
  ['field missing',without('department')],
  ['field is a number',{...edited,priority:3}],
  ['field is null',{...edited,channel:null}],
  ['field 10001 chars',{...edited,description:'a'.repeat(FIELD_LIMIT+1)}],
 ];
 for(const [name,values] of cases){
  const r=await api(path,{values,revision:0,reason:'사유'});
  assert.equal(r.status,400,name);assert.deepEqual(r.data,{error:MSG.editField},name);
 }
 const noValues=await api(path,{revision:0,reason:'사유'});
 assert.equal(noValues.status,400);assert.equal(noValues.data.error,MSG.editField);
 assert.equal((await api('/api/tasks/'+id)).data.edit_revision,0,'rejected edits leave the revision untouched');
 const ok=await api(path,{values:{...edited,description:'a'.repeat(FIELD_LIMIT)},revision:0,reason:'사유'});
 assert.equal(ok.status,200);
});

test('[R-031] an edit with empty title/requester, a bad requested_at or a non-calendar due date gets 400; an empty due date and empty department are accepted',async()=>{
 const {path}=await editable();
 const cases=[
  ['empty title',{...edited,title:''}],
  ['whitespace-only title',{...edited,title:'   '}],
  ['empty requester',{...edited,requester:''}],
  ['unparseable requested_at',{...edited,requested_at:'어제'}],
  ['empty requested_at',{...edited,requested_at:''}],
  ['due date not a real calendar day',{...edited,due_date:'2026-02-31'}],
  ['due date wrong format',{...edited,due_date:'2026/11/03'}],
 ];
 for(const [name,values] of cases){
  const r=await api(path,{values,revision:0,reason:'사유'});
  assert.equal(r.status,400,name);assert.deepEqual(r.data,{error:MSG.editRequired},name);
 }
 const ok=await api(path,{values:{...edited,due_date:'',department:''},revision:0,reason:'사유'});
 assert.equal(ok.status,200);assert.deepEqual(ok.data,{ok:true,revision:1});
});

test('[R-031] reason boundary: empty, whitespace-only and 1001 chars get 400; 1 and 1000 chars are accepted and stored in the audit row',async()=>{
 const {id,path}=await editable();
 for(const reason of ['','   ','a'.repeat(REASON_LIMIT+1)]){
  const r=await api(path,{values:edited,revision:0,reason});
  assert.equal(r.status,400,'reason length '+reason.length);assert.deepEqual(r.data,{error:MSG.editReason});
 }
 const missing=await api(path,{values:edited,revision:0});
 assert.equal(missing.status,400);assert.equal(missing.data.error,MSG.editReason);
 const one=await api(path,{values:{...edited,title:'하나'},revision:0,reason:'a'});
 assert.deepEqual(one.data,{ok:true,revision:1});
 const max=await api(path,{values:{...edited,title:'최대'},revision:1,reason:'b'.repeat(REASON_LIMIT)});
 assert.deepEqual(max.data,{ok:true,revision:2});
 assert.equal(JSON.parse((await lastEvent(id,'업무 정보 수정')).detail).reason.length,REASON_LIMIT);
});

test('[R-031] revision must be a non-negative integer: -1, 1.5, "0" and missing get 400; 0 is accepted',async()=>{
 const {path}=await editable();
 for(const revision of [-1,1.5,'0',null,undefined]){
  const r=await api(path,{values:edited,revision,reason:'사유'});
  assert.equal(r.status,400,'revision '+JSON.stringify(revision));assert.deepEqual(r.data,{error:MSG.editReason});
 }
 assert.equal((await api(path,{values:edited,revision:0,reason:'사유'})).status,200);
});

test('[R-031] edit by a viewer is 403 and writes nothing; edit of an unknown id is 404',async()=>{
 const {id,path}=await editable();
 const v=await api(path,{values:edited,revision:0,reason:'사유'},{viewer:true});
 assert.equal(v.status,403);assert.equal(v.data.error,MSG.viewer);
 assert.equal((await api('/api/tasks/'+id)).data.title,taskInput.title);
 const ghost=await api('/api/tasks/00000000-0000-0000-0000-000000000000/edit',{values:edited,revision:0,reason:'사유'});
 assert.equal(ghost.status,404);assert.equal(ghost.data.error,MSG.notFound);
});
