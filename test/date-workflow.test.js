import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupsFor} from '../frontend/src/board/format.js';
import {requestDateValue} from '../public/task-dates.js';
import {normalizeSettings,registrationCategories} from '../public/settings-model.js';
test('[R-033] 기존 설정에도 고정업무를 제공하고 날짜 그룹은 KST 경계·기간·미완료를 구분',()=>{
 assert.ok(registrationCategories(normalizeSettings({categories:['사용자 분류']})).includes('고정업무'));
 const base={title:'날짜 검증',requester:'담당자',description:'',status:'접수',category:'일반',created_at:'2026-11-01T00:00:00Z'};
 const tasks=[{...base,id:'a',requested_at:'2026-11-01T14:59:00Z',completed_at:null},{...base,id:'b',requested_at:'2026-11-01T15:00:00Z',completed_at:'2026-11-03T00:00:00Z',status:'완료'}];
 const groups=groupsFor(tasks,{groupBy:'date',dateField:'requested_at'});assert.equal(groups[0].date,'2026-11-02');assert.equal(groups[1].date,'2026-11-01');assert.equal(groupsFor(tasks,{groupBy:'date',from:'2026-11-03',to:'2026-11-01'}).length,0);
 assert.equal(groupsFor(tasks,{groupBy:'date',dateField:'requested_at',from:'2026-11-02',to:'2026-11-02'})[0].sessions[0].id,'b');
 const completed=groupsFor(tasks,{groupBy:'date',dateField:'completed_at'});assert.equal(completed[1].name,'미완료');assert.equal(groupsFor(tasks,{groupBy:'date',from:'2030-01-01'}).length,0);
});

test('[R-033] 날짜 입력은 KST 자정으로 저장하고 기존 같은 날짜의 시각은 보존',()=>{
 assert.equal(requestDateValue('2026-11-05'),'2026-11-04T15:00:00.000Z');
 const precise='2026-11-05T01:23:45.123Z';assert.equal(requestDateValue('2026-11-05',precise),precise);assert.equal(requestDateValue('2026-11-06',precise),'2026-11-05T15:00:00.000Z');assert.throws(()=>requestDateValue('2026-02-31'),/요청일/);
});

test('[R-034] 완료 업무는 한국 완료일로 이동하고 재개 업무는 요청일로 돌아온다',()=>{
 const base={id:'done',title:'시설 확인',status:'완료',created_at:'2026-11-04T00:00:00Z',requested_at:'2026-11-04T15:00:00Z',completed_at:'2026-11-05T15:00:00Z'};
 const options={groupBy:'date',dateField:'activity'};
 assert.equal(groupsFor([base],options)[0].date,'2026-11-06');
 assert.equal(groupsFor([base],{...options,from:'2026-11-06',to:'2026-11-06'}).length,1);
 assert.equal(groupsFor([base],{...options,to:'2026-11-05'}).length,0);
 assert.equal(groupsFor([{...base,completed_at:'2026-11-05T14:59:59Z'}],options)[0].date,'2026-11-05');
 assert.equal(groupsFor([{...base,status:'진행 중'}],options)[0].date,'2026-11-05');
 assert.equal(groupsFor([{...base,completed_at:null}],options)[0].name,'완료일 미상');
 assert.equal(groupsFor([base],{...options,dateField:'requested_at'})[0].date,'2026-11-05');
 assert.equal(groupsFor([base],{...options,dateField:'created_at'})[0].date,'2026-11-04');
 assert.deepEqual(groupsFor([],options),[]);
});
