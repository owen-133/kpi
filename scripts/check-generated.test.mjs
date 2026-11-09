import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {cpSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const checker=join(root,'scripts','check-generated.mjs');
const runChecker=(...args)=>spawnSync(process.execPath,[checker,...args],{encoding:'utf8'});

test('committed supabase/upgrade.sql matches its generator',()=>{
  const r=runChecker();
  assert.equal(r.status,0,r.stdout+r.stderr);
  assert.match(r.stdout,/^upgrade\.sql: in sync$/m);
});

test('fixture: a changed source file makes the check fail',()=>{
  const copy=mkdtempSync(join(tmpdir(),'generated-fixture-'));
  try{
    cpSync(root,copy,{recursive:true,filter:src=>{
      const parts=relative(root,src).split(sep);
      return !parts.includes('.git')&&!parts.includes('node_modules');
    }});
    const edit=join(copy,'supabase','edit.sql');
    writeFileSync(edit,readFileSync(edit,'utf8')+'\n-- drift fixture\n');
    const r=runChecker('--root',copy);
    assert.equal(r.status,1,r.stdout+r.stderr);
    assert.match(r.stdout,/upgrade\.sql: DIFFERS/);
  }finally{
    rmSync(copy,{recursive:true,force:true});
  }
});
