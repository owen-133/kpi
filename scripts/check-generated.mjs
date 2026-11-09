// Verifies that committed generated files match what their generators produce.
// Copies the working tree to a temp directory, runs the generators THERE and
// compares the results byte for byte with the files in the real tree.
//
// Usage: node scripts/check-generated.mjs [--root <dir>]
//   supabase/upgrade.sql  <- node scripts/build-upgrade.js
//   --root <dir> tree to check (default: the repo containing this script)
// Exit: 0 all in sync, 1 something differs, 2 usage/setup error.
import {spawnSync} from 'node:child_process';
import {cpSync,existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const USAGE='usage: node scripts/check-generated.mjs [--root <dir>]';
class SetupError extends Error{}

function parseArgs(argv){
  const opts={root:resolve(fileURLToPath(new URL('..',import.meta.url)))};
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--root'){
      if(!argv[i+1])throw new SetupError('--root needs a directory\n'+USAGE);
      opts.root=resolve(argv[++i]);
    }else throw new SetupError('unknown argument: '+argv[i]+'\n'+USAGE);
  }
  return opts;
}

// Skipped when copying: VCS data, installed dependencies, the root-level graft index.
function copyFilter(root){
  return src=>{
    const rel=relative(root,src);
    if(rel==='')return true;
    const parts=rel.split(sep);
    return !parts.includes('.git')&&!parts.includes('node_modules')&&rel!=='graft';
  };
}

function run(cmd,args,cwd){
  const r=spawnSync(cmd,args,{cwd,encoding:'utf8',maxBuffer:256*1024*1024});
  if(r.error||r.status!==0){
    throw new SetupError('command failed: '+cmd+' '+args.join(' ')+' (exit '+(r.status??r.error?.code)+')\n'+(r.stdout||'')+(r.stderr||'')+(r.error?String(r.error):''));
  }
}

function firstDifferingLine(a,b){
  const n=Math.min(a.length,b.length);
  let i=0;
  while(i<n&&a[i]===b[i])i++;
  let line=1;
  for(let k=0;k<i;k++)if(a[k]===10)line++;
  return line;
}

// Returns one result line and whether the pair is in sync. `committed`/`generated` are absolute paths.
function compareFile(label,committed,generated){
  const a=existsSync(committed)?readFileSync(committed):null;
  const b=existsSync(generated)?readFileSync(generated):null;
  if(a===null)return {ok:false,line:label+': DIFFERS (not committed, generator produced it)'};
  if(b===null)return {ok:false,line:label+': DIFFERS (committed, generator did not produce it)'};
  if(a.equals(b))return {ok:true,line:label+': in sync'};
  return {ok:false,line:label+': DIFFERS (first differing line '+firstDifferingLine(a,b)+')'};
}

function check(opts){
  const {root}=opts;
  if(!existsSync(join(root,'scripts','build-upgrade.js')))throw new SetupError('not a repo root (scripts/build-upgrade.js missing): '+root);
  const tmp=mkdtempSync(join(tmpdir(),'check-generated-'));
  try{
    cpSync(root,tmp,{recursive:true,filter:copyFilter(root)});
    // A generator that silently writes nothing must not pass on the copied file.
    rmSync(join(tmp,'supabase','upgrade.sql'),{force:true});
    run(process.execPath,['scripts/build-upgrade.js'],tmp);
    const results=[compareFile('upgrade.sql',join(root,'supabase','upgrade.sql'),join(tmp,'supabase','upgrade.sql'))];
    for(const r of results)console.log(r.line);
    return results.every(r=>r.ok)?0:1;
  }finally{
    rmSync(tmp,{recursive:true,force:true});
  }
}

try{
  process.exitCode=check(parseArgs(process.argv.slice(2)));
}catch(err){
  if(!(err instanceof SetupError))throw err;
  console.error('check-generated: '+err.message);
  process.exitCode=2;
}
