// R-035
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {UpdateChecklistService} from './UpdateChecklistService.ts';
import type {OrbitFunctions,OrbitFunctionName,OrbitFunctionArguments} from '../../../shared/port/OrbitFunctions.ts';
test('Given a checklist change / When saved / Then existing edit history and revision protection are used',async()=>{
 const calls:unknown[]=[];
 const task={id:'a',title:'입사',requester:'직원',description:'1. PC',edit_revision:3,requested_at:'2026-11-09T00:00:00Z'};
 const fake:OrbitFunctions={async call(name:OrbitFunctionName,args:OrbitFunctionArguments){calls.push({name,args});return name==='orbit_api'?task:{ok:true};}};
 await new UpdateChecklistService(fake).execute({id:'a',revision:3,change:{kind:'toggle',line:0,done:true}});
 assert.equal(calls.length,2);
 assert.deepEqual((calls[1] as any).args.payload.values.description,'1. [x] PC');
 assert.equal((calls[1] as any).args.payload.revision,3);
 assert.equal((calls[1] as any).args.payload.values.title,'입사');
 await assert.rejects(()=>new UpdateChecklistService(fake).execute({id:'a',revision:2,change:{kind:'add',title:'추가'}}),/다른/);
 const fail:OrbitFunctions={async call(){throw Error('DB unavailable');}};
 await assert.rejects(()=>new UpdateChecklistService(fail).execute({id:'a',revision:0,change:{kind:'add',title:'추가'}}),/DB unavailable/);
});
