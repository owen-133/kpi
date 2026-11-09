import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {scenarios,resolveStep,captureVars,baseVars,ADMIN,VIEWER} from './golden/requests.js';

// Characterization (golden) test, two tiers:
//  behavior: status, headers and API bodies the legacy portal serves (test/golden/legacy-portal.json)
//  assets:   sha256 and length of every file under public/ (test/golden/legacy-assets.json)
// Rewrite a snapshot only on purpose: UPDATE_GOLDEN=behavior | assets | 1 (both) npm test
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const goldenPath=join(root,'test','golden','legacy-portal.json');
const assetsPath=join(root,'test','golden','legacy-assets.json');
const mode=process.env.UPDATE_GOLDEN;
const updateBehavior=mode==='1'||mode==='behavior',updateAssets=mode==='1'||mode==='assets';
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

// Recorder: sends a request, stores a normalized entry under `label`, returns the raw parsed body.
// Placeholders: uuids -> <ID-n> by first appearance, generated timestamps -> <TS>.
function recorder(base,served){
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
  if(binary)served[label]={path,buf};
  else{const text=buf.toString('utf8');try{parsed=JSON.parse(text);entry.json=JSON.parse(norm(text));}catch{entry.text=norm(text);}}
  if(label in snap)throw Error('duplicate label '+label);
  snap[label]=entry;
  return parsed;
 };
 return {rec,snap};
}

// Runs one corpus scenario against a fresh server; `{{ORIGIN}}` is that server's own base URL.
async function play(scenario,served){
 const srv=await startServer(scenario.mode==='secured'?{ADMIN_PASSWORD:ADMIN,VIEWER_PASSWORD:VIEWER}:{});
 try{
  const {rec,snap}=recorder(srv.base,served);
  const vars={...baseVars(),ORIGIN:srv.base};
  for(const step of scenario.steps){
   const {label,...request}=resolveStep(step,vars);
   captureVars(step,await rec(label,request),vars);
  }
  return snap;
 }finally{await srv.stop();}
}

function diffLines(expected,actual){
 const a=JSON.stringify(expected,null,1).split('\n'),b=JSON.stringify(actual,null,1).split('\n'),out=[];
 for(let i=0;i<Math.max(a.length,b.length)&&out.length<80;i++)if(a[i]!==b[i])out.push(`line ${i+1}\n  - golden: ${a[i]}\n  + actual: ${b[i]}`);
 return out.join('\n');
}

// Both tests share one server run: behavior snapshot plus the bytes served for the static-asset labels.
let captured;
const capture=()=>captured??=(async()=>{const served={};const actual={};for(const scenario of scenarios.filter(s=>s.golden))actual[scenario.name]=await play(scenario,served);return {actual,served};})();

const sha=buf=>createHash('sha256').update(buf).digest('hex');
// tracked files plus untracked-but-not-ignored ones, so a new file under public/ is seen before it is staged
function publicFiles(){
 const out=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','public'],{cwd:root,encoding:'utf8'});
 return [...new Set(out.split('\n').filter(Boolean))].sort();
}
// served path of the static-asset labels -> file on disk
const SERVED_FILE={'/':'public/index.html','/app.js':'public/app.js','/style.css':'public/style.css'};

test('golden: legacy behavior is unchanged',async()=>{
 const {actual}=await capture();
 if(updateBehavior){writeFileSync(goldenPath,JSON.stringify(actual,null,1)+'\n');return;}
 assert.ok(existsSync(goldenPath),'missing '+goldenPath+' (create it with UPDATE_GOLDEN=behavior)');
 const golden=JSON.parse(readFileSync(goldenPath,'utf8'));
 const changed=[];
 for(const group of new Set([...Object.keys(golden),...Object.keys(actual)])){
  for(const label of new Set([...Object.keys(golden[group]||{}),...Object.keys(actual[group]||{})])){
   const e=golden[group]?.[label],g=actual[group]?.[label];
   if(JSON.stringify(e)!==JSON.stringify(g))changed.push(`[${group}/${label}]\n${diffLines(e,g)}`);
  }
 }
 assert.equal(changed.length,0,`legacy portal behavior changed (${changed.length} responses). Intentional? rerun with UPDATE_GOLDEN=behavior\n\n${changed.join('\n\n')}`);
});

test('golden: legacy assets are unchanged',async()=>{
 const {served}=await capture();
 const actual={},unreadable=[];
 for(const file of publicFiles()){
  if(!existsSync(join(root,file))){unreadable.push(file);continue;}
  const buf=readFileSync(join(root,file));
  actual[file]={bytes:buf.length,sha256:sha(buf)};
 }
 // what the server sends for the pinned labels must be the file on disk
 const mismatched=[];
 for(const [label,{path,buf}] of Object.entries(served)){
  const file=SERVED_FILE[path];
  if(!file)throw Error(`no disk file mapped for served path ${path} (label ${label})`);
  if(!actual[file]||sha(buf)!==actual[file].sha256)mismatched.push(`${label}: GET ${path} is not the bytes of ${file} (served ${buf.length} bytes sha256 ${sha(buf)})`);
 }
 assert.equal(unreadable.length,0,'tracked public files missing on disk: '+unreadable.join(', '));
 assert.equal(mismatched.length,0,'server serves something other than the file on disk\n'+mismatched.join('\n'));
 if(updateAssets){writeFileSync(assetsPath,JSON.stringify(actual,null,1)+'\n');return;}
 assert.ok(existsSync(assetsPath),'missing '+assetsPath+' (create it with UPDATE_GOLDEN=assets)');
 const golden=JSON.parse(readFileSync(assetsPath,'utf8')),problems=[];
 for(const file of new Set([...Object.keys(golden),...Object.keys(actual)])){
  const e=golden[file],g=actual[file];
  if(!e)problems.push(`${file}: NEW file under public/ (${g.bytes} bytes sha256 ${g.sha256}) - add it deliberately with UPDATE_GOLDEN=assets`);
  else if(!g)problems.push(`${file}: pinned but no longer under public/ (was ${e.bytes} bytes sha256 ${e.sha256})`);
  else if(e.sha256!==g.sha256||e.bytes!==g.bytes)problems.push(`${file}: changed\n  - golden: ${e.bytes} bytes sha256 ${e.sha256}\n  + actual: ${g.bytes} bytes sha256 ${g.sha256}`);
 }
 assert.equal(problems.length,0,`public assets changed (${problems.length} files). Intentional? rerun with UPDATE_GOLDEN=assets\n\n${problems.join('\n')}`);
});
