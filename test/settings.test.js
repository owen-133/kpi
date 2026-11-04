import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {defaults,validateSettings} from '../public/settings-model.js';

test('설정 입력 검증: 색상·이미지·중복·빈 항목·임의 필드 차단',()=>{
 assert.throws(()=>validateSettings({...defaults,categories:[]}),/업무 분류/);
 assert.throws(()=>validateSettings({...defaults,channels:['구두','구두']}),/중복/);
 assert.throws(()=>validateSettings({...defaults,primaryColor:'red;display:none'}),/색상/);
 assert.throws(()=>validateSettings({...defaults,logo:'data:image/svg+xml;base64,AAAA'}),/로고/);
 assert.throws(()=>validateSettings({...defaults,script:'alert(1)'}),/지원하지/);
 assert.equal(validateSettings({...defaults,texts:{...defaults.texts,portalName:'<img src=x onerror=alert(1)>'}}).texts.portalName,'<img src=x onerror=alert(1)>'); // 문자 그대로 렌더링
});

test('설정 API 권한·버전 충돌·이력과 재시작 후 공통 설정 보존',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'orbit-settings-'));let child;
 const start=async()=>{child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3202',DATA_DIR:dir,ADMIN_PASSWORD:'test-admin',VIEWER_PASSWORD:'test-viewer'},stdio:['ignore','pipe','pipe']});await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('server failed');})]);};
 const stop=async()=>{const ended=once(child,'exit');child.kill();await ended;};
 const request=async(path,body,viewer=false)=>{const r=await fetch('http://127.0.0.1:3202/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Basic '+Buffer.from(viewer?'viewer:test-viewer':'admin:test-admin').toString('base64')},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 try{await start();const initial=await request('settings');assert.equal(initial.data.revision,0);
 await request('tasks',{title:'기존 업무',requester:'담당자',category:'기존분류',requested_at:'2026-11-03T01:00:00Z'});
 const values={...defaults,texts:{...defaults.texts,portalName:'우리 회사 총무'},categories:['기타'],showBanner:false};
 assert.equal((await request('settings',{values,revision:0},true)).status,403);
 assert.equal((await request('settings/history',undefined,true)).status,403);
 assert.equal((await request('settings',{values,revision:0})).status,200);
 assert.equal((await request('settings',{values,revision:0})).status,409);
 assert.equal((await request('tasks')).data[0].category,'기존분류');
 const h=(await request('settings/history')).data;assert.equal(h.length,1);assert.equal(h[0].actor,'admin');assert.equal(h[0].after.texts.portalName,'우리 회사 총무');
 await stop();await start();assert.equal((await request('settings',undefined,true)).data.values.texts.portalName,'우리 회사 총무');
 }finally{if(child&&child.exitCode===null)await stop();rmSync(dir,{recursive:true,force:true});}
});
