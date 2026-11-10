// R-035
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createContainer} from '../../../../config/container.ts';
test('하위 업무 완료·추가·해제는 이력에 남고 조회 계정·충돌·삭제 업무를 차단한다',async()=>{
 const container=createContainer({ADMIN_PASSWORD:'a',VIEWER_PASSWORD:'v'},{log:()=>{}});
 async function send(method:string,path:string,body?:unknown,viewer=false){
  const response=await container.pipeline.handle(new Request('http://portal.test/api/'+path,{method,headers:{Authorization:'Basic '+Buffer.from(viewer?'viewer:v':'admin:a').toString('base64'),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}));
  return {status:response.status,body:await response.json()};
 }
 try{
 const created=await send('POST','tasks',{title:'입사 셋팅',requester:'직원',requested_at:'2026-11-09T00:00:00Z',description:'안내\n1. 편지\n2. PC'});assert.equal(created.status,201);
 const path='tasks/'+created.body.id;
 const change={revision:0,change:{kind:'toggle',line:2,done:true}};
 assert.equal((await send('POST',path+'/checklist',change,true)).status,403);
 for(const body of [{},{revision:-1,change:{kind:'add',title:'추가'}},{revision:0,change:{kind:'toggle',line:1,done:'true'}},{revision:0,change:{kind:'delete'}}]) assert.equal((await send('POST',path+'/checklist',body)).status,400);
 assert.equal((await send('POST',path+'/checklist',{revision:0,change:{kind:'toggle',line:0,done:true}})).status,400);
 assert.equal((await send('POST',path+'/checklist',change)).status,200);
 let task=(await send('GET',path)).body;assert.equal(task.description,'안내\n1. 편지\n2. [x] PC');assert.equal(task.status,'접수');assert.ok(task.events.some((e:any)=>e.detail.includes('하위 업무 완료')));
 assert.equal((await send('POST',path+'/checklist',change)).status,409);
 assert.equal((await send('POST',path+'/checklist',{revision:1,change:{kind:'add',title:'계정 생성'}})).status,200);
 assert.equal((await send('POST',path+'/checklist',{revision:2,change:{kind:'toggle',line:2,done:false}})).status,200);
 task=(await send('GET',path)).body;assert.match(task.description,/2\. \[ \] PC/);assert.match(task.description,/- \[ \] 계정 생성/);
 assert.equal((await send('POST',path+'/checklist',{revision:3,change:{kind:'add',title:''}})).status,400);
 await send('POST',path+'/delete',{reason:'정리'});
 assert.equal((await send('POST',path+'/checklist',{revision:3,change:{kind:'add',title:'추가'}})).status,404);
 }finally{await container.stop();}
});
