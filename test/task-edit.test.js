import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('업무 수정: 모든 상태·권한·원본시각 보존·감사·충돌·유효성·삭제 업무 차단',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'orbit-edit-'));const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3206',DATA_DIR:dir,ADMIN_PASSWORD:'test-admin',VIEWER_PASSWORD:'test-viewer'},stdio:['ignore','pipe','pipe']});
 const req=async(path,body,viewer=false)=>{const r=await fetch('http://127.0.0.1:3206/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Basic '+Buffer.from(viewer?'viewer:test-viewer':'admin:test-admin').toString('base64')},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 const original={title:'원래 업무',requester:'원래 요청자',department:'원래 부서',channel:'구두',category:'일반 총무',priority:'중',requested_at:'2026-11-01T01:00:00.123Z',due_date:'2026-11-03',description:'원래 내용'};
 try{await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw Error('server failed');})]);
 for(const status of ['접수','진행 중','대기','완료']){const id=(await req('tasks',original)).data.id,path='tasks/'+id;await req(path+'/status',{status});const before=(await req(path)).data;const values={...original,title:'수정 업무',requester:'변경 요청자',department:'변경 부서',channel:'이메일',category:'비품·자산',priority:'상',requested_at:'2026-11-02T00:00:00Z',due_date:'2026-12-01',description:'변경 상세'};
 assert.equal((await req(path+'/edit',{values,revision:0,reason:'정정'},true)).status,403);assert.equal((await req(path+'/edit',{values,revision:0,reason:''})).status,400);
 assert.equal((await req(path+'/edit',{values:{...values,due_date:'2026-02-31'},revision:0,reason:'정정'})).status,400);
 assert.equal((await req(path+'/edit',{values,revision:0,reason:'협의에 따른 정정'})).status,200);const after=(await req(path)).data;assert.equal(after.requester,'변경 요청자');assert.equal(after.status,status);assert.equal(after.created_at,before.created_at);assert.equal(after.completed_at,before.completed_at);assert.equal(after.edit_revision,1);assert.equal(JSON.parse(after.events.at(-1).detail).changes.requester.before,original.requester);assert.equal(after.events.at(-1).actor,'admin');
 assert.equal((await req(path+'/edit',{values,revision:0,reason:'충돌'})).status,409);assert.equal((await req(path+'/edit',{values,revision:1,reason:'변경 없음'})).data.unchanged,true);
 if(status==='완료')assert.equal((await req(path+'/edit',{values:{...values,requested_at:'2099-01-01T00:00:00Z'},revision:1,reason:'검증'})).status,400);
 await req(path+'/delete',{reason:'테스트'});assert.equal((await req(path+'/edit',{values,revision:1,reason:'정정'})).status,409);
 }
 }finally{if(server.exitCode===null){const ended=once(server,'exit');server.kill();await ended;}rmSync(dir,{recursive:true,force:true});}
});
