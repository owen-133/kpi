import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupsFor,taskState,urgent} from '../frontend/src/board/format.js';
const tasks=[
 {id:'1',title:'노트북 준비',requester:'김담당',department:'개발팀',description:'신규 입사',category:'비품',status:'완료',created_at:'2026-11-01'},
 {id:'2',title:'회의실 수리',requester:'박담당',department:'인사팀',description:'조명 교체',category:'시설',status:'진행 중',created_at:'2026-11-02'},
 {id:'3',title:'마우스 구매',requester:'김담당',department:'개발팀',description:'장비 교체',category:'비품',status:'접수',created_at:'2026-11-03'},
];
test('원본 대표 상태 우선순위로 분류하고 완료 기록도 유지',()=>{const g=groupsFor(tasks);assert.equal(g[0].name,'비품');assert.equal(urgent(g[0]),'waiting');assert.deepEqual(g[0].sessions.map(t=>t.id),['3','1']);assert.equal(taskState('완료'),'idle');});
test('검색과 상태를 함께 적용하고 부서별로 재분류',()=>{const g=groupsFor(tasks,{query:'교체',status:'진행 중',groupBy:'department'});assert.equal(g.length,1);assert.equal(g[0].name,'인사팀');assert.equal(g[0].sessions[0].id,'2');assert.deepEqual(groupsFor(tasks,{query:'없는 내용'}),[]);});
