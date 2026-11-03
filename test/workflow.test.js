import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';

test('접수, 변경 이력, 완료 재개 사유, 조회 권한, 재시작 후 보존',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'orbit-test-'));let child;
 const start=async()=>{child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3199',DATA_DIR:dir,ADMIN_PASSWORD:'test-admin',VIEWER_PASSWORD:'test-viewer'},stdio:['ignore','pipe','pipe']});await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('server failed');})]);};
 const stop=async()=>{const done=once(child,'exit');child.kill();await done;};
 const req=async(path,body,user='admin',password='test-admin')=>{const r=await fetch('http://127.0.0.1:3199'+path,{method:body?'POST':'GET',headers:{Authorization:'Basic '+Buffer.from(user+':'+password).toString('base64'),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 try{await start();assert.equal((await fetch('http://127.0.0.1:3199/')).status,401);
 assert.equal((await req('/api/tasks')).data.length,0);
 assert.equal((await req('/api/tasks',{title:'잘못된 입력'})).status,400);
 const created=await req('/api/tasks',{title:'신규 입사자 노트북 준비',requester:'홍길동',department:'인사팀',channel:'메신저',category:'비품·자산',priority:'높음',requested_at:'2026-11-03T01:00:00Z',due_date:'2026-11-05',description:'노트북 1대 준비'});assert.equal(created.status,201);const url='/api/tasks/'+created.data.id;
 assert.equal((await req(url+'/status',{status:'진행 중'},'viewer','test-viewer')).status,403);
 assert.equal((await req(url+'/status',{status:'진행 중'})).status,200);
 assert.equal((await req(url+'/notes',{note:'장비 준비 및 계정 설정 완료'})).status,201);
 await req(url+'/status',{status:'완료'});assert.equal((await req(url+'/status',{status:'진행 중'})).status,400);
 assert.equal((await req(url+'/status',{status:'진행 중',reason:'추가 프로그램 설치 요청'})).status,200);
 const before=(await req(url)).data;assert.equal(before.events.length,5);assert.equal(before.status,'진행 중');assert.equal(before.completed_at,null);assert.match(before.events.at(-1).detail,/추가 프로그램/);
 const db=new DatabaseSync(join(dir,'orbit.sqlite'));assert.throws(()=>db.exec('DELETE FROM events'),/cannot be deleted/);assert.throws(()=>db.exec("UPDATE events SET detail='tamper'"),/cannot be updated/);db.close();
 await stop();await start();const after=(await req(url,undefined,'viewer','test-viewer')).data;assert.equal(after.events.length,5);assert.equal(after.title,before.title);
 const page=await fetch('http://127.0.0.1:3199/',{headers:{Authorization:'Basic '+Buffer.from('admin:test-admin').toString('base64')}});assert.match(await page.text(),/새 업무 등록/);
 }finally{if(child&&child.exitCode===null)await stop();rmSync(dir,{recursive:true,force:true});}
});
