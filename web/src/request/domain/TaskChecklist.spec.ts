// R-035
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {changeChecklist,checklistItems} from './TaskChecklist.ts';
test('하위 업무 체크는 번호 목록과 본문을 보존하고 추가·완료·해제를 지원한다',()=>{
 const text='입사 준비\n1. 편지\n2. PC 셋팅\n별도 안내';
 assert.equal(checklistItems(text).length,2);
 const done=changeChecklist(text,{kind:'toggle',line:2,done:true});
 assert.equal(done.description,'입사 준비\n1. 편지\n2. [x] PC 셋팅\n별도 안내');
 assert.equal(checklistItems(done.description)[1].done,true);
 assert.match(changeChecklist(done.description,{kind:'toggle',line:2,done:false}).description,/2\. \[ \] PC/);
 assert.equal(changeChecklist('',{kind:'add',title:' 계정 생성 '}).description,'- [ ] 계정 생성');
 assert.equal(checklistItems('').length,0);
 assert.throws(()=>changeChecklist(text,{kind:'toggle',line:0,done:true}));
 for(const title of ['', 'a\nb','a'.repeat(1001)]) assert.throws(()=>changeChecklist('',{kind:'add',title}));
 assert.throws(()=>changeChecklist('a'.repeat(10000),{kind:'add',title:'추가'}));
});
