import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';

// Characterization (golden) test: pins what the legacy portal serves today.
// Rewrite the snapshot only on purpose: UPDATE_GOLDEN=1 npm test
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const goldenPath=join(root,'test','golden','legacy-portal.json');
const ADMIN='golden-admin',VIEWER='golden-viewer';
const HEADERS=['content-type','cache-control','www-authenticate','x-content-type-options','content-security-policy'];
const UUID=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const STAMP=/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g;

async function freePort(){const s=createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const {port}=s.address();s.close();await once(s,'close');return port;}

async function startServer(extraEnv){
 const port=await freePort(),dir=mkdtempSync(join(tmpdir(),'orbit-golden-'));
 const env={...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:dir,...extraEnv};
 for(const k of ['STORAGE_BACKEND','NODE_ENV','SUPABASE_URL'])delete env[k];
 if(!extraEnv.ADMIN_PASSWORD){delete env.ADMIN_PASSWORD;delete env.VIEWER_PASSWORD;}
 const child=spawn(process.execPath,['server.js'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
 await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('server failed to start');})]);
 const stop=async()=>{if(child.exitCode===null){const done=once(child,'exit');child.kill();await done;}rmSync(dir,{recursive:true,force:true});};
 return {base:'http://127.0.0.1:'+port,stop};
}

const basic=(u,p)=>'Basic '+Buffer.from(u+':'+p).toString('base64');
const admin={user:'admin',password:ADMIN},viewer={user:'viewer',password:VIEWER};

// Recorder: sends a request, stores a normalized entry under `label`, returns the raw parsed body.
// Placeholders: uuids -> <ID-n> by first appearance, generated timestamps -> <TS>.
function recorder(base){
 const ids=new Map(),snap={};
 const norm=text=>text.replace(UUID,m=>{if(!ids.has(m))ids.set(m,'<ID-'+(ids.size+1)+'>');return ids.get(m);}).replace(STAMP,'<TS>');
 const rec=async(label,{path,method='GET',user,password,headers={},body,raw,binary=false})=>{
  const h={...headers};
  if(user)h.Authorization=basic(user,password);
  const payload=raw!==undefined?raw:body!==undefined?JSON.stringify(body):undefined;
  if(payload!==undefined)h['Content-Type']='application/json';
  const res=await fetch(base+path,{method,headers:h,body:payload});
  const buf=Buffer.from(await res.arrayBuffer());
  const entry={request:norm(method+' '+path),status:res.status,headers:{}};
  for(const k of HEADERS){const v=res.headers.get(k);if(v!==null)entry.headers[k]=v;}
  let parsed;
  if(binary)Object.assign(entry,{bytes:buf.length,sha256:createHash('sha256').update(buf).digest('hex')});
  else{const text=buf.toString('utf8');try{parsed=JSON.parse(text);entry.json=JSON.parse(norm(text));}catch{entry.text=norm(text);}}
  if(label in snap)throw Error('duplicate label '+label);
  snap[label]=entry;
  return parsed;
 };
 return {rec,snap};
}

async function secured(){
 const srv=await startServer({ADMIN_PASSWORD:ADMIN,VIEWER_PASSWORD:VIEWER});
 try{
  const {rec,snap}=recorder(srv.base);
  await rec('health',{path:'/health'});
  await rec('health-post',{path:'/health',method:'POST'});
  await rec('auth-missing-page',{path:'/'});
  await rec('auth-missing-api',{path:'/api/tasks'});
  await rec('auth-wrong-password',{path:'/',user:'admin',password:'nope'});
  await rec('auth-unknown-user',{path:'/',user:'other',password:ADMIN});
  await rec('auth-bearer-scheme',{path:'/',headers:{Authorization:'Bearer x'}});
  for(const [name,path] of [['index','/'],['app-js','/app.js'],['style-css','/style.css']])await rec('static-'+name+'-admin',{path,...admin,binary:true});
  await rec('static-index-viewer',{path:'/',...viewer,binary:true});
  await rec('page-not-found',{path:'/nope.html',...admin});
  await rec('page-no-public-prefix',{path:'/public/index.html',...admin});
  await rec('page-post-405',{path:'/',method:'POST',body:{},...admin});
  await rec('page-delete-405',{path:'/app.js',method:'DELETE',...admin});
  await rec('api-unknown-get',{path:'/api/unknown',...admin});
  await rec('api-tasks-put',{path:'/api/tasks',method:'PUT',...admin});
  await rec('session-admin',{path:'/api/session',...admin});
  await rec('session-viewer',{path:'/api/session',...viewer});
  await rec('list-empty',{path:'/api/tasks',...admin});

  const input={title:'신규 입사자 노트북 준비',requester:'홍길동',department:'인사팀',channel:'메신저',category:'비품·자산',priority:'높음',requested_at:'2026-11-03T01:00:00Z',due_date:'2026-11-05',description:'노트북 1대 준비'};
  const one=await rec('create-full',{path:'/api/tasks',method:'POST',body:input,...admin});
  const two=await rec('create-minimal-trimmed',{path:'/api/tasks',method:'POST',body:{title:'  최소 입력  ',requester:' 김철수 ',requested_at:'2026-11-03T02:00:00Z'},...admin});
  const url='/api/tasks/'+one.id,url2='/api/tasks/'+two.id;
  await rec('create-missing-title',{path:'/api/tasks',method:'POST',body:{requester:'a',requested_at:'2026-11-03T01:00:00Z'},...admin});
  await rec('create-missing-requester',{path:'/api/tasks',method:'POST',body:{title:'a',requested_at:'2026-11-03T01:00:00Z'},...admin});
  await rec('create-bad-requested-at',{path:'/api/tasks',method:'POST',body:{title:'a',requester:'b',requested_at:'not a date'},...admin});
  await rec('create-bad-due-date',{path:'/api/tasks',method:'POST',body:{title:'a',requester:'b',requested_at:'2026-11-03T01:00:00Z',due_date:'11/05'},...admin});
  await rec('create-too-long-field',{path:'/api/tasks',method:'POST',body:{title:'a'.repeat(10001),requester:'b',requested_at:'2026-11-03T01:00:00Z'},...admin});
  await rec('create-too-long-body',{path:'/api/tasks',method:'POST',raw:'{"title":"'+'a'.repeat(64100)+'"}',...admin});
  await rec('bad-json',{path:'/api/tasks',method:'POST',raw:'{not json',...admin});
  await rec('bad-json-array',{path:'/api/tasks',method:'POST',raw:'[1]',...admin});
  await rec('bad-json-empty-body',{path:'/api/tasks',method:'POST',raw:'',...admin});
  await rec('bad-json-status',{path:url+'/status',method:'POST',raw:'{',...admin});

  await rec('viewer-create-403',{path:'/api/tasks',method:'POST',body:input,...viewer});
  await rec('viewer-status-403',{path:url+'/status',method:'POST',body:{status:'진행 중'},...viewer});
  await rec('viewer-notes-403',{path:url+'/notes',method:'POST',body:{note:'x'},...viewer});
  await rec('viewer-put-403',{path:'/api/tasks',method:'PUT',...viewer});
  await rec('viewer-list',{path:'/api/tasks',...viewer});
  await rec('cross-origin-create-403',{path:'/api/tasks',method:'POST',body:input,headers:{Origin:'http://evil.example'},...admin});
  await rec('cross-origin-status-403',{path:url+'/status',method:'POST',body:{status:'진행 중'},headers:{Origin:'https://evil.example'},...admin});
  await rec('cross-origin-get-allowed',{path:'/api/session',headers:{Origin:'http://evil.example'},...admin});
  await rec('same-origin-note',{path:url2+'/notes',method:'POST',body:{note:'같은 출처 메모'},headers:{Origin:srv.base},...admin});

  await rec('status-invalid',{path:url+'/status',method:'POST',body:{status:'없는상태'},...admin});
  await rec('status-unknown-task',{path:'/api/tasks/00000000-0000-4000-8000-000000000000/status',method:'POST',body:{status:'진행 중'},...admin});
  await rec('status-to-in-progress',{path:url+'/status',method:'POST',body:{status:'진행 중'},...admin});
  await rec('status-same-noop',{path:url+'/status',method:'POST',body:{status:'진행 중'},...admin});
  await rec('note-add',{path:url+'/notes',method:'POST',body:{note:'장비 준비 및 계정 설정 완료'},...admin});
  await rec('note-empty',{path:url+'/notes',method:'POST',body:{note:'  '},...admin});
  await rec('note-too-long',{path:url+'/notes',method:'POST',body:{note:'a'.repeat(10001)},...admin});
  await rec('note-unknown-task',{path:'/api/tasks/00000000-0000-4000-8000-000000000000/notes',method:'POST',body:{note:'x'},...admin});
  await rec('status-to-waiting',{path:url+'/status',method:'POST',body:{status:'대기',reason:'부품 대기'},...admin});
  await rec('status-to-done',{path:url+'/status',method:'POST',body:{status:'완료'},...admin});
  await rec('reopen-without-reason-400',{path:url+'/status',method:'POST',body:{status:'진행 중'},...admin});
  await rec('reopen-reason-too-long',{path:url+'/status',method:'POST',body:{status:'진행 중',reason:'a'.repeat(10001)},...admin});
  await rec('reopen-with-reason',{path:url+'/status',method:'POST',body:{status:'진행 중',reason:'추가 프로그램 설치 요청'},...admin});
  await rec('detail-after-flow',{path:url,...admin});
  await rec('detail-second-task',{path:url2,...viewer});
  await rec('detail-unknown',{path:'/api/tasks/00000000-0000-4000-8000-000000000000',...admin});
  await rec('detail-wrong-method-path',{path:url+'/status',...admin});
  await rec('list-after-flow',{path:'/api/tasks',...admin});
  return snap;
 }finally{await srv.stop();}
}

async function open(){
 const srv=await startServer({});
 try{
  const {rec,snap}=recorder(srv.base);
  await rec('open-health',{path:'/health'});
  await rec('open-index',{path:'/',binary:true});
  await rec('open-session',{path:'/api/session'});
  const made=await rec('open-create',{path:'/api/tasks',method:'POST',body:{title:'인증 없는 모드',requester:'테스터',requested_at:'2026-11-03T01:00:00Z'}});
  await rec('open-status',{path:'/api/tasks/'+made.id+'/status',method:'POST',body:{status:'완료'}});
  await rec('open-list',{path:'/api/tasks'});
  return snap;
 }finally{await srv.stop();}
}

function diffLines(expected,actual){
 const a=JSON.stringify(expected,null,1).split('\n'),b=JSON.stringify(actual,null,1).split('\n'),out=[];
 for(let i=0;i<Math.max(a.length,b.length)&&out.length<80;i++)if(a[i]!==b[i])out.push(`line ${i+1}\n  - golden: ${a[i]}\n  + actual: ${b[i]}`);
 return out.join('\n');
}

test('golden: legacy portal pages and API responses are unchanged',async()=>{
 const actual={secured:await secured(),open:await open()};
 if(process.env.UPDATE_GOLDEN==='1'){writeFileSync(goldenPath,JSON.stringify(actual,null,1)+'\n');return;}
 assert.ok(existsSync(goldenPath),'missing '+goldenPath+' (create it with UPDATE_GOLDEN=1)');
 const golden=JSON.parse(readFileSync(goldenPath,'utf8'));
 const changed=[];
 for(const group of new Set([...Object.keys(golden),...Object.keys(actual)])){
  for(const label of new Set([...Object.keys(golden[group]||{}),...Object.keys(actual[group]||{})])){
   const e=golden[group]?.[label],g=actual[group]?.[label];
   if(JSON.stringify(e)!==JSON.stringify(g))changed.push(`[${group}/${label}]\n${diffLines(e,g)}`);
  }
 }
 assert.equal(changed.length,0,`legacy portal output changed (${changed.length} responses). Intentional? rerun with UPDATE_GOLDEN=1\n\n${changed.join('\n\n')}`);
});
