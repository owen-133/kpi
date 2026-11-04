import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';

test('모든 상태 삭제·조회 차단·복원·제목 확인 후 영구 삭제 및 최소 감사 기록',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'orbit-deletion-'));const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3203',DATA_DIR:dir,ADMIN_PASSWORD:'test-admin',VIEWER_PASSWORD:'test-viewer'},stdio:['ignore','pipe','pipe']});
 const req=async(path,body,viewer=false)=>{const r=await fetch('http://127.0.0.1:3203/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Basic '+Buffer.from(viewer?'viewer:test-viewer':'admin:test-admin').toString('base64')},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 try{await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw Error('server failed');})]);
 for(const status of ['접수','진행 중','대기','완료']){const task=(await req('tasks',{title:'삭제 테스트 '+status,requester:'담당자',requested_at:'2026-11-03T01:00:00Z'})).data;const path='tasks/'+task.id;await req(path+'/status',{status});
 assert.equal((await req(path+'/delete',{reason:'테스트'},true)).status,403);
 assert.equal((await req(path+'/delete',{reason:''})).status,400);
 assert.equal((await req(path+'/purge',{reason:'테스트',confirmation:'삭제 테스트 '+status})).status,409);
 assert.equal((await req(path+'/delete',{reason:'테스트 정리'})).status,200);
 assert.equal((await req('tasks')).data.length,0);assert.equal((await req(path,undefined,true)).status,404);
 assert.equal((await req(path+'/status',{status:'진행 중'})).status,409);
 assert.equal((await req('trash',undefined,true)).status,403);assert.equal((await req('lifecycle-history',undefined,true)).status,403);
 assert.equal((await req(path+'/restore',{reason:'잘못 삭제'})).status,200);assert.equal((await req(path)).data.status,status);
 await req(path+'/delete',{reason:'테스트 정리'});
 assert.equal((await req(path+'/purge',{reason:'불필요한 테스트',confirmation:'다른 제목'})).status,400);
 assert.equal((await req(path+'/purge',{reason:'불필요한 테스트',confirmation:'삭제 테스트 '+status})).status,200);
 assert.equal((await req(path)).status,404);assert.equal((await req('trash')).data.length,0);
 const db=new DatabaseSync(join(dir,'orbit.sqlite'));assert.equal(db.prepare('SELECT count(*) AS n FROM events WHERE task_id=?').get(task.id).n,0);assert.equal(db.prepare('SELECT count(*) AS n FROM tasks WHERE id=?').get(task.id).n,0);assert.throws(()=>db.exec('DELETE FROM task_lifecycle_events'),/cannot be deleted/);db.close();
 }
 assert.equal((await req('lifecycle-history')).data.filter(e=>e.action==='purge').length,4);
 }finally{if(server.exitCode===null){const ended=once(server,'exit');server.kill();await ended;}rmSync(dir,{recursive:true,force:true});}
});
