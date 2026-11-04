import {test} from 'node:test';
import assert from 'node:assert/strict';
import {monthlyMetrics,monthlyDraft,classify,similarTasks,validateImprovement} from '../public/kpi-model.js';
const base={id:'1',title:'노트북 준비',category:'비품·자산',description:'입사자 장비',status:'완료',requested_at:'2026-10-31T15:00:00Z',completed_at:'2026-11-02T14:59:00Z',due_date:'2026-11-02'};
test('KST 월 경계·기한 날짜·분모·테스트·삭제·잘못된 시각·중앙값',()=>{
 const list=[base,{...base,id:'2',completed_at:'2026-11-02T15:00:00Z'},{...base,id:'3',due_date:''},{...base,id:'4',status:'진행 중',completed_at:null},{...base,id:'5',is_test:1},{...base,id:'6',deleted_at:'2026-11-03'},{...base,id:'7',completed_at:'2026-10-30T00:00:00Z'}];
 const m=monthlyMetrics(list,'2026-11','2026-11-04T00:00:00Z');assert.equal(m.received,5);assert.equal(m.completed,3);assert.equal(m.withDeadline,2);assert.equal(m.onTime,1);assert.equal(m.completionRate,50);assert.equal(m.excludedTests,1);assert.equal(m.invalid,1);assert.equal(m.dueTotal,4);assert.equal(m.dueMet,1);assert.equal(m.dueRate,25);assert.equal(m.noDeadlineCompleted,1);assert.equal(m.medianHours,(Date.parse(base.completed_at)-Date.parse(base.requested_at))/3600000);assert.match(monthlyDraft(m),/生成型AI|규칙 기반/);
 const empty=monthlyMetrics([],'2026-11');assert.equal(empty.completionRate,null);assert.equal(empty.averageHours,null);const invalidDeadline=monthlyMetrics([{...base,due_date:'2026-02-31'}],'2026-11');assert.equal(invalidDeadline.withDeadline,0);assert.equal(invalidDeadline.invalid,1);assert.throws(()=>monthlyMetrics([],'2026-13'),/조회 월/);
});
test('무료 자동 분류·유사도는 설정 분류를 존중하고 테스트 기록 제외',()=>{
 assert.equal(classify('입사자 노트북 준비',['시설','비품·자산']).category,'비품·자산');assert.equal(classify('불명확한 요청',['일반']).category,'일반');
 const result=similarTasks('노트북 준비 입사자 장비',[base,{...base,id:'2',is_test:true}]);assert.equal(result[0].id,'1');assert.equal(result.length,1);assert.ok(result[0].score>=90);
 assert.throws(()=>validateImprovement({title:'개선',feedback:'피드백',stage:'본인 실사용',status:'검증 완료'}),/검증 결과/);
});
