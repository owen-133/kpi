import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';

const ALLOWLIST_PATH='test/legacy-files.json';

// Legacy areas: flat root JS modules, public/**, supabase/*.sql, frontend/src/**.
export function isLegacyPath(p){
 return /^[^/]+\.(js|mjs)$/.test(p)||p.startsWith('public/')||/^supabase\/[^/]+\.sql$/.test(p)||p.startsWith('frontend/src/');
}

export function unlistedViolations(files,allowed){
 const ok=new Set(allowed);
 return files.filter(f=>isLegacyPath(f)&&!ok.has(f)).map(f=>
  `${f}: new legacy file. New behavior belongs in the hexagonal web/src/<context>/ `+
  `(scaffold: node web/scripts/new-usecase.ts <context> <UseCase>; see AGENTS.md). `+
  `If a legacy file is truly needed, add it to ${ALLOWLIST_PATH} in a commit whose message starts with "legacy-files:".`);
}

export function staleViolations(files,allowed){
 const present=new Set(files);
 return allowed.filter(f=>!present.has(f)).map(f=>`${f}: listed in ${ALLOWLIST_PATH} but no longer exists; remove the stale entry.`);
}

// Tracked or untracked-but-not-ignored files that exist on disk (a deleted tracked file is not "present").
function repoFiles(){
 const out=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8',maxBuffer:64*1024*1024});
 return out.split('\0').filter(Boolean).filter(existsSync);
}

// Binary files (fonts) have no meaningful line count: null.
function lineCount(p){
 const buf=readFileSync(p);
 if(buf.includes(0))return null;
 const text=buf.toString('utf8');
 return text===''?0:text.split('\n').length-(text.endsWith('\n')?1:0);
}

function git(args){return execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}

function hasOriginMain(){
 try{git(['log','-1','--format=%H']);git(['rev-parse','--verify','origin/main']);return true;}catch{return false;}
}

export function largestLegacy(files,count=10){
 return files.filter(isLegacyPath).map(f=>({file:f,lines:lineCount(f)})).filter(r=>r.lines!==null).sort((a,b)=>b.lines-a.lines||a.file.localeCompare(b.file)).slice(0,count);
}

// Report-only: net added lines per legacy file vs origin/main (never fails).
function growthVsOriginMain(files){
 const rows=[];
 for(const f of files.filter(isLegacyPath)){
  const stat=git(['diff','--numstat','origin/main','--',f]);
  if(!stat)continue;
  const [added,removed]=stat.split('\t');
  if(added==='-')continue;
  rows.push({file:f,added:Number(added),removed:Number(removed),net:Number(added)-Number(removed)});
 }
 return rows.sort((a,b)=>b.net-a.net);
}

function table(rows,columns){
 return [columns.join('\t'),...rows.map(r=>columns.map(c=>r[c]).join('\t'))].join('\n');
}

const allowed=JSON.parse(readFileSync(ALLOWLIST_PATH,'utf8')).files;

test('legacy boundary: every tracked legacy source file is in test/legacy-files.json',()=>{
 const v=unlistedViolations(repoFiles(),allowed);
 assert.deepEqual(v,[],'\n'+v.join('\n'));
});

test('legacy boundary: allowlist has no stale entry',()=>{
 const v=staleViolations(repoFiles(),allowed);
 assert.deepEqual(v,[],'\n'+v.join('\n'));
});

test('legacy boundary: allowlist is sorted and unique',()=>{
 assert.deepEqual(allowed,[...new Set(allowed)].sort());
});

test('legacy boundary: report-only size and growth diagnostics',()=>{
 const files=repoFiles();
 console.log('# largest 10 legacy files by line count\n'+table(largestLegacy(files),['file','lines']));
 if(!hasOriginMain()){console.log('# growth vs origin/main: skipped (git history or origin/main unavailable)');return;}
 const rows=growthVsOriginMain(files);
 console.log('# legacy line growth vs origin/main (report-only, never blocks)\n'+(rows.length?table(rows,['file','added','removed','net']):'(no change in legacy files)'));
});

test('fixture: an extra legacy file is reported by name, with guidance',()=>{
 const v=unlistedViolations(['server.js','newthing.js','public/new.js','web/src/x.ts'],['server.js']);
 assert.equal(v.length,2);
 assert.match(v[0],/^newthing\.js: /);
 assert.match(v[1],/^public\/new\.js: /);
 assert.match(v[0],/web\/src\/<context>\//);
 assert.match(v[0],/legacy-files:/);
});

test('fixture: files outside the legacy areas are never flagged',()=>{
 const files=['web/src/a.ts','tools/x.js','scripts/y.mjs','test/z.test.js','frontend/vite.config.js','supabase/notes/readme.md','docs/a.md'];
 assert.deepEqual(unlistedViolations(files,[]),[]);
});

test('fixture: a stale allowlist entry is reported by name',()=>{
 const v=staleViolations(['server.js'],['server.js','gone.js']);
 assert.equal(v.length,1);
 assert.match(v[0],/^gone\.js: /);
});

test('fixture: a compliant list yields no violation',()=>{
 const files=['server.js','public/app.js','web/src/a.ts'];
 assert.deepEqual(unlistedViolations(files,['server.js','public/app.js']),[]);
 assert.deepEqual(staleViolations(files,['server.js','public/app.js']),[]);
});
