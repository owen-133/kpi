import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {currentMonth,kstDate} from '../public/kpi-model.js';
test('배정·파일·실사용 구분·발행 스냅샷·개선 버전·권한과 삭제 연동',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'orbit-kpi-'));const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3204',DATA_DIR:dir,ADMIN_PASSWORD:'test-admin',VIEWER_PASSWORD:'test-viewer'},stdio:['ignore','pipe','pipe']});
 const req=async(path,body,viewer=false)=>{const r=await fetch('http://127.0.0.1:3204/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Basic '+Buffer.from(viewer?'viewer:test-viewer':'admin:test-admin').toString('base64')},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,headers:r.headers,data:r.headers.get('content-type')?.includes('json')?await r.json():await r.text()};};
 try{await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw Error('server failed');})]);
 const now=new Date().toISOString();const created=await req('tasks',{title:'신규 입사자 노트북',requester:'직원',category:'비품·자산',requested_at:now,due_date:kstDate(now)});const id=created.data.id,path='tasks/'+id;
 assert.equal((await req(path+'/assign',{assignee:'총무 담당'},true)).status,403);await req(path+'/assign',{assignee:'총무 담당'});const first=(await req(path)).data.kpi.assigned_at;await req(path+'/assign',{assignee:'다른 담당'});assert.equal((await req(path)).data.kpi.assigned_at,first);assert.equal((await req('tasks')).data[0].assignee,'다른 담당');
 assert.equal((await req(path+'/files',{name:'위험.html',content:'YWJj'})).status,400);const file=(await req(path+'/files',{name:'요청.txt',content:Buffer.from('요청 근거').toString('base64')})).data;
 const downloaded=await req(path+'/files/'+file.id,undefined,true);assert.equal(downloaded.data,'요청 근거');assert.match(downloaded.headers.get('content-disposition'),/attachment/);assert.equal((await req(path+'/files/'+file.id,{},true)).status,403);
 await req(path+'/status',{status:'완료'});let preview=(await req('report-preview?month='+currentMonth())).data;assert.equal(preview.metrics.completed,1);assert.equal(preview.metrics.completionRate,100);
 await req(path+'/test-data',{is_test:true});assert.equal((await req('report-preview?month='+currentMonth())).data.metrics.completed,0);
 assert.equal((await req('reports',{month:currentMonth(),fingerprint:preview.fingerprint,draft:'초안'})).status,409);await req(path+'/test-data',{is_test:false});preview=(await req('report-preview?month='+currentMonth())).data;
 assert.equal((await req('reports',{month:currentMonth(),fingerprint:preview.fingerprint},true)).status,403);assert.equal((await req('reports',{month:currentMonth(),fingerprint:preview.fingerprint,draft:'검토한 월간 보고서'})).status,201);assert.equal((await req('reports',undefined,true)).data[0].metrics.completed,1);
 const improvement={title:'기한 누락 개선',stage:'본인 실사용',source:'팀장 시연',feedback:'기한 확인 어려움',action:'지표 추가',result:'',status:'개선 중'};assert.equal((await req('improvements',{value:improvement},true)).status,403);const saved=(await req('improvements',{value:improvement})).data;const revised={...improvement,status:'검증 완료',result:'기한 미지정 지표 확인'};assert.equal((await req('improvements',{id:saved.id,revision:1,value:revised})).status,201);assert.equal((await req('improvements',{id:saved.id,revision:1,value:revised})).status,409);assert.equal((await req('improvements/'+saved.id+'/history')).data.length,2);
 const suggestions=(await req('automation',{text:'신규 입사자 노트북'})).data;assert.equal(suggestions.classification.category,'비품·자산');assert.equal(suggestions.similar[0].id,id);
 await req(path+'/delete',{reason:'테스트 정리'});await req(path+'/purge',{reason:'테스트 정리',confirmation:'신규 입사자 노트북'});assert.equal((await req(path+'/files/'+file.id)).status,404);const db=new DatabaseSync(join(dir,'orbit.sqlite'));assert.equal(db.prepare('SELECT count(*) AS n FROM task_files').get().n,0);assert.throws(()=>db.exec('DELETE FROM monthly_reports'),/cannot be deleted/);assert.throws(()=>db.exec('DELETE FROM improvement_events'),/cannot be deleted/);db.close();assert.equal((await req('reports')).data[0].metrics.completed,1);
 }finally{if(server.exitCode===null){const ended=once(server,'exit');server.kill();await ended;}rmSync(dir,{recursive:true,force:true});}
});
