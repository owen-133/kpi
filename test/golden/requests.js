// Shared request corpus: the ordered requests the golden test and the HTTP parity harness (web/src/parity) send.
// Data only, plus three pure helpers that expand templates. A scenario is one fresh server/database:
//  { name, mode: 'secured' | 'open', golden: boolean, steps: Step[] }
// Step: { label, path, method?, user?, password?, headers?, body?, raw?, binary?, save?, expect? }
//  - `{{name}}` in path, header values, body strings and raw is replaced from the variables.
//    A body string that is exactly one `{{name}}` takes the variable's own value (so it keeps its type).
//  - save: { name: 'dotted.path' } stores that field of the JSON response as variable `name` for later steps.
//  - expect: { status } is a hint: the status the legacy portal is understood to answer (checked by the parity self-test).
//  - golden scenarios feed test/golden/legacy-portal.json; the others only feed the parity harness.
// Long (over ~16 KB) bodies are ASCII: server.js decodes each request chunk on its own, so a multibyte character split across chunks changes the length it checks.
// The char-* scenarios copy the request shapes of test/char-tasks.test.js and test/char-kpi.test.js, not their assertions.
import {currentMonth} from '../../public/kpi-model.js';
import {defaults} from '../../public/settings-model.js';

export const ADMIN='golden-admin',VIEWER='golden-viewer';
export const admin={user:'admin',password:ADMIN},viewer={user:'viewer',password:VIEWER};
export const ORIGIN='{{ORIGIN}}';
const GHOST='00000000-0000-4000-8000-000000000000';
// the Supabase-backed portal rejects ids that are not uuids with 400, so absent ids are uuids here
const MISSING='00000000-0000-4000-8000-000000000001';

const get=(label,path,o={})=>({label,path,...o});
const post=(label,path,body,o={})=>({label,path,method:'POST',body,...o});
const raw=(label,path,text,o={})=>({label,path,method:'POST',raw:text,...o});
const as=(who,steps)=>steps.map(s=>({...who,...s}));
const hint=(status,step)=>({...step,expect:{status}});

const TOKEN=/\{\{(\w+)\}\}/g,WHOLE=/^\{\{(\w+)\}\}$/;
function fill(value,vars){
 if(typeof value==='string'){
  const whole=value.match(WHOLE);
  if(whole){if(!(whole[1] in vars))throw Error('corpus variable not set: '+whole[1]);return vars[whole[1]];}
  return value.replace(TOKEN,(m,name)=>{if(!(name in vars))throw Error('corpus variable not set: '+name);return String(vars[name]);});
 }
 if(Array.isArray(value))return value.map(v=>fill(v,vars));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,fill(v,vars)]));
 return value;
}
// A step with every `{{name}}` filled in (throws on a name that was never set).
export function resolveStep(step,vars){const {save,expect,...rest}=step;return fill(rest,vars);}
// Stores the fields named by step.save from the parsed JSON response into vars (throws when a field is absent).
export function captureVars(step,parsed,vars){
 for(const [name,dotted] of Object.entries(step.save||{})){
  let at=parsed;
  for(const part of dotted.split('.'))at=at==null?undefined:at[part];
  if(at===undefined)throw Error(`step ${step.label}: response has no field ${dotted} to save as ${name}`);
  vars[name]=at;
 }
}
// Variables every scenario starts with (ORIGIN is added by the executor).
export function baseVars(){
 const m=currentMonth(),[y,mo]=m.split('-').map(Number);
 return {
  NOW:new Date().toISOString(),MONTH:m,
  PREV_MONTH:mo===1?`${y-1}-12`:`${y}-${String(mo-1).padStart(2,'0')}`,
  NEXT_MONTH:mo===12?`${y+1}-01`:`${y}-${String(mo+1).padStart(2,'0')}`,
 };
}

// ---- golden: secured (admin + viewer passwords) ----
const input={title:'신규 입사자 노트북 준비',requester:'홍길동',department:'인사팀',channel:'메신저',category:'비품·자산',priority:'높음',requested_at:'2026-11-03T01:00:00Z',due_date:'2026-11-05',description:'노트북 1대 준비'};
const securedSteps=[
 get('health','/health'),
 {label:'health-post',path:'/health',method:'POST'},
 get('auth-missing-page','/'),
 get('auth-missing-api','/api/tasks'),
 get('auth-wrong-password','/',{user:'admin',password:'nope'}),
 get('auth-unknown-user','/',{user:'other',password:ADMIN}),
 get('auth-bearer-scheme','/',{headers:{Authorization:'Bearer x'}}),
 ...[['index','/'],['app-js','/app.js'],['style-css','/style.css']].map(([name,path])=>get('static-'+name+'-admin',path,{...admin,binary:true})),
 get('static-index-viewer','/',{...viewer,binary:true}),
 ...as(admin,[
  get('page-not-found','/nope.html'),
  get('page-no-public-prefix','/public/index.html'),
  post('page-post-405','/',{}),
  {label:'page-delete-405',path:'/app.js',method:'DELETE'},
  get('api-unknown-get','/api/unknown'),
  {label:'api-tasks-put',path:'/api/tasks',method:'PUT'},
  get('session-admin','/api/session'),
 ]),
 get('session-viewer','/api/session',viewer),
 get('list-empty','/api/tasks',admin),
 ...as(admin,[
  post('create-full','/api/tasks',input,{save:{one:'id'}}),
  post('create-minimal-trimmed','/api/tasks',{title:'  최소 입력  ',requester:' 김철수 ',requested_at:'2026-11-03T02:00:00Z'},{save:{two:'id'}}),
  post('create-missing-title','/api/tasks',{requester:'a',requested_at:'2026-11-03T01:00:00Z'}),
  post('create-missing-requester','/api/tasks',{title:'a',requested_at:'2026-11-03T01:00:00Z'}),
  post('create-bad-requested-at','/api/tasks',{title:'a',requester:'b',requested_at:'not a date'}),
  post('create-bad-due-date','/api/tasks',{title:'a',requester:'b',requested_at:'2026-11-03T01:00:00Z',due_date:'11/05'}),
  post('create-too-long-field','/api/tasks',{title:'a'.repeat(10001),requester:'b',requested_at:'2026-11-03T01:00:00Z'}),
  raw('create-too-long-body','/api/tasks','{"title":"'+'a'.repeat(64100)+'"}'),
  raw('bad-json','/api/tasks','{not json'),
  raw('bad-json-array','/api/tasks','[1]'),
  raw('bad-json-empty-body','/api/tasks',''),
  raw('bad-json-status','/api/tasks/{{one}}/status','{'),
 ]),
 ...as(viewer,[
  post('viewer-create-403','/api/tasks',input),
  post('viewer-status-403','/api/tasks/{{one}}/status',{status:'진행 중'}),
  post('viewer-notes-403','/api/tasks/{{one}}/notes',{note:'x'}),
  {label:'viewer-put-403',path:'/api/tasks',method:'PUT'},
  get('viewer-list','/api/tasks'),
 ]),
 ...as(admin,[
  post('cross-origin-create-403','/api/tasks',input,{headers:{Origin:'http://evil.example'}}),
  post('cross-origin-status-403','/api/tasks/{{one}}/status',{status:'진행 중'},{headers:{Origin:'https://evil.example'}}),
  get('cross-origin-get-allowed','/api/session',{headers:{Origin:'http://evil.example'}}),
  post('same-origin-note','/api/tasks/{{two}}/notes',{note:'같은 출처 메모'},{headers:{Origin:ORIGIN}}),
  post('status-invalid','/api/tasks/{{one}}/status',{status:'없는상태'}),
  post('status-unknown-task','/api/tasks/'+GHOST+'/status',{status:'진행 중'}),
  post('status-to-in-progress','/api/tasks/{{one}}/status',{status:'진행 중'}),
  post('status-same-noop','/api/tasks/{{one}}/status',{status:'진행 중'}),
  post('note-add','/api/tasks/{{one}}/notes',{note:'장비 준비 및 계정 설정 완료'}),
  post('note-empty','/api/tasks/{{one}}/notes',{note:'  '}),
  post('note-too-long','/api/tasks/{{one}}/notes',{note:'a'.repeat(10001)}),
  post('note-unknown-task','/api/tasks/'+GHOST+'/notes',{note:'x'}),
  post('status-to-waiting','/api/tasks/{{one}}/status',{status:'대기',reason:'부품 대기'}),
  post('status-to-done','/api/tasks/{{one}}/status',{status:'완료'}),
  post('reopen-without-reason-400','/api/tasks/{{one}}/status',{status:'진행 중'}),
  post('reopen-reason-too-long','/api/tasks/{{one}}/status',{status:'진행 중',reason:'a'.repeat(10001)}),
  post('reopen-with-reason','/api/tasks/{{one}}/status',{status:'진행 중',reason:'추가 프로그램 설치 요청'}),
  get('detail-after-flow','/api/tasks/{{one}}'),
 ]),
 get('detail-second-task','/api/tasks/{{two}}',viewer),
 ...as(admin,[
  get('detail-unknown','/api/tasks/'+GHOST),
  get('detail-wrong-method-path','/api/tasks/{{one}}/status'),
  get('list-after-flow','/api/tasks'),
 ]),
];

// ---- golden: open (no passwords; local storage only, so the Supabase oracle cannot serve it) ----
const openSteps=[
 get('open-health','/health'),
 get('open-index','/',{binary:true}),
 get('open-session','/api/session'),
 post('open-create','/api/tasks',{title:'인증 없는 모드',requester:'테스터',requested_at:'2026-11-03T01:00:00Z'},{save:{made:'id'}}),
 post('open-status','/api/tasks/{{made}}/status',{status:'완료'}),
 get('open-list','/api/tasks'),
];

// ---- char-tasks: request shapes of test/char-tasks.test.js ----
const BODY_LIMIT=1600000;
const taskInput={title:'특성 업무',requester:'요청자',department:'총무',channel:'구두',category:'일반 총무',priority:'중',requested_at:'2026-11-01T01:00:00.000Z',due_date:'2026-11-03',description:'내용'};
function paddedCreate(size,over={}){
 const head=JSON.stringify({...taskInput,...over,pad:''}).slice(0,-2);
 return head+'x'.repeat(size-head.length-2)+'"}';
}
const assignPad=n=>'{"assignee":"한 사람","pad":"'+'x'.repeat(n-'{"assignee":"한 사람","pad":""}'.length)+'"}';
const edited={...taskInput,title:'수정된 업무',requester:'수정 요청자',description:'수정된 내용'};
const without=k=>{const v={...edited};delete v[k];return v;};
const edit=(label,body,status)=>hint(status,post(label,'/api/tasks/{{t3}}/edit',body));
const chars=[
 hint(201,post('ct-new-1','/api/tasks',taskInput,{save:{t1:'id'}})),
 hint(201,post('ct-new-2','/api/tasks',taskInput,{save:{t2:'id'}})),
 hint(201,post('ct-new-3','/api/tasks',taskInput,{save:{t3:'id'}})),
 // body-size limit
 hint(201,raw('ct-body-limit-minus-1','/api/tasks',paddedCreate(BODY_LIMIT-1))),
 hint(201,raw('ct-body-limit-exact','/api/tasks',paddedCreate(BODY_LIMIT))),
 hint(413,raw('ct-body-limit-plus-1','/api/tasks',paddedCreate(BODY_LIMIT+1))),
 hint(413,raw('ct-body-oversized-non-json','/api/tasks','x'.repeat(BODY_LIMIT+1))),
 hint(400,raw('ct-body-small-non-json','/api/tasks','x'.repeat(10))),
 hint(413,raw('ct-body-assign-over','/api/tasks/{{t1}}/assign',assignPad(BODY_LIMIT+1))),
 hint(200,raw('ct-body-assign-at','/api/tasks/{{t1}}/assign',assignPad(BODY_LIMIT))),
 hint(403,raw('ct-body-viewer-oversized','/api/tasks',paddedCreate(BODY_LIMIT+1),viewer)),
 hint(400,raw('ct-body-field-over-near-limit','/api/tasks',paddedCreate(BODY_LIMIT-1,{description:'a'.repeat(10001)}))),
 hint(201,post('ct-field-9999','/api/tasks',{...taskInput,description:'a'.repeat(9999)})),
 hint(201,post('ct-field-10000','/api/tasks',{...taskInput,description:'a'.repeat(10000)})),
 hint(400,post('ct-field-10001','/api/tasks',{...taskInput,description:'a'.repeat(10001)})),
 // assignee
 ...[1,99,100].map(n=>hint(200,post('ct-assign-len-'+n,'/api/tasks/{{t2}}/assign',{assignee:'가'.repeat(n)}))),
 hint(400,post('ct-assign-empty','/api/tasks/{{t2}}/assign',{assignee:''})),
 hint(400,post('ct-assign-101','/api/tasks/{{t2}}/assign',{assignee:'가'.repeat(101)})),
 hint(400,post('ct-assign-blank','/api/tasks/{{t2}}/assign',{assignee:'   '})),
 hint(400,post('ct-assign-newline-blank','/api/tasks/{{t2}}/assign',{assignee:'\n\t '})),
 hint(200,post('ct-assign-padded-100','/api/tasks/{{t2}}/assign',{assignee:'  '+'나'.repeat(100)+'  '})),
 hint(400,post('ct-assign-padded-101','/api/tasks/{{t2}}/assign',{assignee:' '+'나'.repeat(101)+' '})),
 hint(400,post('ct-assign-missing','/api/tasks/{{t2}}/assign',{})),
 hint(400,post('ct-assign-null','/api/tasks/{{t2}}/assign',{assignee:null})),
 hint(200,post('ct-assign-number','/api/tasks/{{t2}}/assign',{assignee:12345})),
 hint(200,post('ct-assign-emoji-50','/api/tasks/{{t2}}/assign',{assignee:'😀'.repeat(50)})),
 hint(400,post('ct-assign-emoji-51','/api/tasks/{{t2}}/assign',{assignee:'😀'.repeat(51)})),
 hint(200,post('ct-assign-named-1','/api/tasks/{{t2}}/assign',{assignee:'  김담당 '})),
 hint(200,post('ct-assign-named-2','/api/tasks/{{t2}}/assign',{assignee:'이담당'})),
 hint(404,post('ct-assign-unknown-task','/api/tasks/00000000-0000-0000-0000-000000000000/assign',{assignee:'x'})),
 hint(403,post('ct-assign-viewer','/api/tasks/{{t2}}/assign',{assignee:'x'},viewer)),
 get('ct-detail-after-assign','/api/tasks/{{t2}}'),
 // data flag
 hint(200,post('ct-testdata-true','/api/tasks/{{t1}}/test-data',{is_test:true})),
 get('ct-testdata-detail-true','/api/tasks/{{t1}}'),
 hint(200,post('ct-testdata-false','/api/tasks/{{t1}}/test-data',{is_test:false})),
 hint(200,post('ct-testdata-false-again','/api/tasks/{{t1}}/test-data',{is_test:false})),
 ...[['empty',{}],['string-true',{is_test:'true'}],['one',{is_test:1}],['zero',{is_test:0}],['null',{is_test:null}],['string-false',{is_test:'false'}],['array',{is_test:[true]}]]
  .map(([n,b])=>hint(400,post('ct-testdata-bad-'+n,'/api/tasks/{{t1}}/test-data',b))),
 hint(400,post('ct-testdata-ghost-bad','/api/tasks/00000000-0000-0000-0000-000000000000/test-data',{is_test:'yes'})),
 hint(404,post('ct-testdata-ghost-good','/api/tasks/00000000-0000-0000-0000-000000000000/test-data',{is_test:true})),
 hint(403,post('ct-testdata-viewer','/api/tasks/{{t1}}/test-data',{is_test:true},viewer)),
 get('ct-testdata-detail-after','/api/tasks/{{t1}}'),
 // edit
 hint(200,post('ct-edit-valid','/api/tasks/{{t3}}/edit',{values:edited,revision:0,reason:'  정정 사유  '})),
 get('ct-edit-detail','/api/tasks/{{t3}}'),
 hint(200,post('ct-edit-unchanged','/api/tasks/{{t3}}/edit',{values:edited,revision:1,reason:'변경 없음'})),
 edit('ct-edit-field-missing',{values:without('department'),revision:1,reason:'사유'},400),
 edit('ct-edit-field-number',{values:{...edited,priority:3},revision:1,reason:'사유'},400),
 edit('ct-edit-field-null',{values:{...edited,channel:null},revision:1,reason:'사유'},400),
 edit('ct-edit-field-10001',{values:{...edited,description:'a'.repeat(10001)},revision:1,reason:'사유'},400),
 edit('ct-edit-no-values',{revision:1,reason:'사유'},400),
 edit('ct-edit-empty-title',{values:{...edited,title:''},revision:1,reason:'사유'},400),
 edit('ct-edit-blank-title',{values:{...edited,title:'   '},revision:1,reason:'사유'},400),
 edit('ct-edit-empty-requester',{values:{...edited,requester:''},revision:1,reason:'사유'},400),
 edit('ct-edit-bad-requested-at',{values:{...edited,requested_at:'어제'},revision:1,reason:'사유'},400),
 edit('ct-edit-empty-requested-at',{values:{...edited,requested_at:''},revision:1,reason:'사유'},400),
 edit('ct-edit-due-not-a-day',{values:{...edited,due_date:'2026-02-31'},revision:1,reason:'사유'},400),
 edit('ct-edit-due-wrong-format',{values:{...edited,due_date:'2026/11/03'},revision:1,reason:'사유'},400),
 edit('ct-edit-reason-empty',{values:edited,revision:1,reason:''},400),
 edit('ct-edit-reason-blank',{values:edited,revision:1,reason:'   '},400),
 edit('ct-edit-reason-1001',{values:edited,revision:1,reason:'a'.repeat(1001)},400),
 edit('ct-edit-reason-missing',{values:edited,revision:1},400),
 ...[[-1,'-1'],[1.5,'1.5'],['0','string-0'],[null,'null']].map(([revision,n])=>edit('ct-edit-revision-'+n,{values:edited,revision,reason:'사유'},400)),
 edit('ct-edit-revision-missing',{values:edited,reason:'사유'},400),
 edit('ct-edit-reason-1',{values:{...edited,title:'하나'},revision:1,reason:'a'},200),
 edit('ct-edit-reason-1000',{values:{...edited,title:'최대'},revision:2,reason:'b'.repeat(1000)},200),
 edit('ct-edit-clear-optional',{values:{...edited,title:'비움',due_date:'',department:''},revision:3,reason:'사유'},200),
 edit('ct-edit-stale-revision',{values:{...edited,title:'낡음'},revision:0,reason:'사유'},409),
 hint(403,post('ct-edit-viewer','/api/tasks/{{t3}}/edit',{values:edited,revision:4,reason:'사유'},viewer)),
 hint(404,post('ct-edit-ghost','/api/tasks/00000000-0000-0000-0000-000000000000/edit',{values:edited,revision:0,reason:'사유'})),
 get('ct-edit-detail-final','/api/tasks/{{t3}}'),
 get('ct-list-final','/api/tasks'),
];

// ---- char-kpi: request shapes of test/char-kpi.test.js ----
const b64=bytes=>Buffer.alloc(bytes,65).toString('base64');
const file=(label,path,body,status,o={})=>hint(status,post(label,path,body,o));
const month=(label,m,status)=>hint(status,get(label,'/api/report-preview?month='+(m.startsWith('{{')?m:encodeURIComponent(m))));
const impValid={title:'기한 누락',stage:'MVP 구축',source:'팀장 시연',feedback:'기한 확인 어려움',action:'지표 추가',result:'',status:'접수'};
const imp=(label,value,status,extra={},o={})=>hint(status,post(label,'/api/improvements',{value,...extra},o));
const setting=(label,values,revision,status,o={})=>hint(status,post(label,'/api/settings',{values,revision},o));
const text=(key,value)=>({...defaults,texts:{...defaults.texts,[key]:value}});
const settingBad=[
 ['null',null],['array',[]],['script',{...defaults,script:'x'}],['unknown-text',text('noSuchText','a')],
 ['name-blank',text('portalName','   ')],['name-1001',text('portalName','가'.repeat(1001))],
 ['categories-empty',{...defaults,categories:[]}],['categories-31',{...defaults,categories:Array.from({length:31},(_,i)=>'분류'+i)}],
 ['category-51',{...defaults,categories:['가'.repeat(51)]}],['channel-empty',{...defaults,channels:['']}],['priorities-empty',{...defaults,priorities:[]}],
 ['categories-duplicate',{...defaults,categories:['같음','같음']}],['color-name',{...defaults,primaryColor:'red'}],['color-short',{...defaults,accentColor:'#fff'}],
 ['banner-string',{...defaults,showBanner:'yes'}],['logo-svg',{...defaults,logo:'data:image/svg+xml;base64,AAAA'}],
 ['logo-too-long',{...defaults,logo:'data:image/png;base64,'+'A'.repeat(280000-22+1)}],
];
const kpis=[
 hint(201,post('ck-new-1','/api/tasks',{title:'첨부 시험',requester:'직원',requested_at:'{{NOW}}'},{save:{k1:'id'}})),
 hint(201,post('ck-new-2','/api/tasks',{title:'다른 업무',requester:'직원',requested_at:'{{NOW}}'},{save:{k2:'id'}})),
 // attachments
 file('ck-file-empty','/api/tasks/{{k1}}/files',{name:'빈파일.txt',content:''},400),
 file('ck-file-zero-bytes','/api/tasks/{{k1}}/files',{name:'빈파일.txt',content:'A'},400),
 file('ck-file-1','/api/tasks/{{k1}}/files',{name:'size-1.txt',content:b64(1)},201,{save:{f1:'id'}}),
 file('ck-file-1mb','/api/tasks/{{k1}}/files',{name:'size-1048576.txt',content:b64(1048576)},201,{save:{f2:'id'}}),
 file('ck-file-over-1mb','/api/tasks/{{k1}}/files',{name:'over-1048577.txt',content:b64(1048577)},400),
 file('ck-file-b64-too-long','/api/tasks/{{k1}}/files',{name:'over.txt',content:b64(1048579)},400),
 file('ck-file-xlsx','/api/tasks/{{k1}}/files',{name:'표.xlsx',content:'QQ=='},201),
 file('ck-file-upper-png','/api/tasks/{{k1}}/files',{name:'대문자.PNG',content:'QQ=='},201),
 file('ck-file-exe','/api/tasks/{{k1}}/files',{name:'위험.exe',content:'QQ=='},400),
 file('ck-file-no-extension','/api/tasks/{{k1}}/files',{name:'확장자없음',content:'QQ=='},400),
 file('ck-file-bad-base64','/api/tasks/{{k1}}/files',{name:'글.txt',content:'QQ==!'},400),
 file('ck-file-space-in-base64','/api/tasks/{{k1}}/files',{name:'글.txt',content:'Q Q=='},400),
 file('ck-file-name-separators','/api/tasks/{{k1}}/files',{name:'a/b\\c.txt',content:'QQ=='},201),
 file('ck-file-name-150','/api/tasks/{{k1}}/files',{name:'x'.repeat(146)+'.txt',content:'QQ=='},201),
 file('ck-file-name-151','/api/tasks/{{k1}}/files',{name:'x'.repeat(147)+'.txt',content:'QQ=='},400),
 file('ck-file-unknown-task','/api/tasks/'+MISSING+'/files',{name:'a.txt',content:'QQ=='},404),
 file('ck-file-viewer','/api/tasks/{{k1}}/files',{name:'a.txt',content:'QQ=='},403,viewer),
 get('ck-file-get','/api/tasks/{{k1}}/files/{{f1}}',{binary:true}),
 hint(200,post('ck-file-delete','/api/tasks/{{k1}}/files/{{f2}}',{})),
 hint(404,post('ck-file-delete-missing','/api/tasks/{{k1}}/files/'+MISSING,{})),
 get('ck-file-detail','/api/tasks/{{k1}}'),
 // ten-file limit on the other task
 ...Array.from({length:10},(_,i)=>file('ck-ten-'+(i+1),'/api/tasks/{{k2}}/files',{name:`f${i+1}.txt`,content:'QQ=='},201)),
 file('ck-ten-11','/api/tasks/{{k2}}/files',{name:'f11.txt',content:'QQ=='},400),
 // report month parameter
 month('ck-month-jan','2026-01',200),month('ck-month-dec','2026-12',200),month('ck-month-current','{{MONTH}}',200),
 ...['2026-00','2026-13','2026-1','26-11','2026-11-01','2026-1x','2026/11','',' 2026-11'].map((m,i)=>month('ck-month-bad-'+(i+1),m,400)),
 hint(400,get('ck-month-missing','/api/report-preview')),
 month('ck-month-future-preview','9999-12',200),
 hint(200,get('ck-month-viewer','/api/report-preview?month={{MONTH}}',viewer)),
 // publishing
 hint(200,get('ck-publish-preview','/api/report-preview?month={{MONTH}}',{save:{fp:'fingerprint'}})),
 hint(201,post('ck-publish-current','/api/reports',{month:'{{MONTH}}',fingerprint:'{{fp}}',draft:'  검토한 문안  '})),
 hint(201,post('ck-publish-previous','/api/reports',{month:'{{PREV_MONTH}}',fingerprint:'{{fp}}',draft:'지난달'})),
 hint(400,post('ck-publish-next-month','/api/reports',{month:'{{NEXT_MONTH}}',fingerprint:'{{fp}}',draft:'미래'})),
 hint(400,post('ck-publish-far-future','/api/reports',{month:'9999-12',fingerprint:'{{fp}}',draft:'미래'})),
 hint(400,post('ck-publish-bad-month','/api/reports',{month:'2026-13',fingerprint:'{{fp}}',draft:'x'})),
 hint(400,post('ck-publish-empty-month','/api/reports',{month:'',fingerprint:'{{fp}}',draft:'x'})),
 hint(400,post('ck-publish-no-month','/api/reports',{fingerprint:'{{fp}}',draft:'x'})),
 hint(409,post('ck-publish-wrong-fingerprint','/api/reports',{month:'{{NEXT_MONTH}}',fingerprint:'0'.repeat(64),draft:'x'})),
 hint(409,post('ck-publish-no-fingerprint','/api/reports',{month:'{{MONTH}}',draft:'x'})),
 hint(201,post('ck-publish-20000','/api/reports',{month:'{{MONTH}}',fingerprint:'{{fp}}',draft:'a'.repeat(20000)})),
 hint(400,post('ck-publish-20001','/api/reports',{month:'{{MONTH}}',fingerprint:'{{fp}}',draft:'a'.repeat(20001)})),
 hint(201,post('ck-publish-padded','/api/reports',{month:'{{MONTH}}',fingerprint:'{{fp}}',draft:' '+'a'.repeat(20000)+'  '})),
 hint(201,post('ck-publish-default-draft','/api/reports',{month:'{{MONTH}}',fingerprint:'{{fp}}'})),
 hint(201,post('ck-publish-blank-draft','/api/reports',{month:'{{MONTH}}',fingerprint:'{{fp}}',draft:'   '})),
 hint(403,post('ck-publish-viewer','/api/reports',{month:'{{MONTH}}',fingerprint:'{{fp}}',draft:'x'},viewer)),
 get('ck-reports-list','/api/reports',viewer),
 // improvements
 ...[
  ['title-empty',{...impValid,title:''}],['title-blank',{...impValid,title:'   '}],['feedback-empty',{...impValid,feedback:''}],
  ['stage-unknown',{...impValid,stage:'알 수 없음'}],['status-unknown',{...impValid,status:'알 수 없음'}],
  ['done-without-result',{...impValid,status:'검증 완료',result:''}],['done-blank-result',{...impValid,status:'검증 완료',result:'   '}],
  ['title-5001',{...impValid,title:'a'.repeat(5001)}],['stage-5001',{...impValid,stage:'a'.repeat(5001)}],
 ].map(([n,v])=>imp('ck-imp-bad-'+n,v,400)),
 ...[['empty',{}],['null',{value:null}],['string',{value:'문자열'}],['array',{value:[]}]].map(([n,b])=>hint(400,post('ck-imp-value-'+n,'/api/improvements',b))),
 imp('ck-imp-action-5000',{...impValid,action:'a'.repeat(5000)},201),
 imp('ck-imp-action-padded',{...impValid,action:' '+'a'.repeat(5000)+'  '},201),
 imp('ck-imp-save',{...impValid,title:'  저장 시험  ',status:'검증 완료',result:'확인함',unknown:'버려짐'},201,{},{save:{i1:'id'}}),
 ...[[undefined,'missing'],[0,'0'],['1','string'],[1.5,'1.5'],[-1,'-1']].map(([revision,n])=>imp('ck-imp-revision-'+n,impValid,400,{id:'{{i1}}',...(revision===undefined?{}:{revision})})),
 imp('ck-imp-update',{...impValid,title:'버전 1'},201,{id:'{{i1}}',revision:1}),
 imp('ck-imp-unknown-id',impValid,404,{id:MISSING,revision:1}),
 imp('ck-imp-bad-value-wrong-revision',{...impValid,title:''},400,{id:'{{i1}}',revision:99}),
 imp('ck-imp-stale-revision',impValid,409,{id:'{{i1}}',revision:1}),
 get('ck-imp-list','/api/improvements'),
 get('ck-imp-history','/api/improvements/{{i1}}/history'),
 hint(200,get('ck-imp-history-unknown','/api/improvements/'+MISSING+'/history')),
 // settings (the database starts at revision 0; each accepted save adds one)
 get('ck-set-initial','/api/settings'),
 ...settingBad.map(([n,v])=>setting('ck-set-bad-'+n,v,0,400)),
 ...[[undefined,'missing'],[-1,'-1'],[1.5,'1.5'],['0','string']].map(([revision,n])=>hint(400,post('ck-set-revision-'+n,'/api/settings',{values:defaults,...(revision===undefined?{}:{revision})}))),
 setting('ck-set-bad-value-stale-revision',{...defaults,primaryColor:'red'},99,400),
 setting('ck-set-text-1000',text('portalName','가'.repeat(1000)),0,200),
 setting('ck-set-categories-30',{...defaults,categories:Array.from({length:30},(_,i)=>String(i).padStart(2,'0')+'가'.repeat(48))},1,200),
 setting('ck-set-logo-280000',{...defaults,logo:'data:image/png;base64,'+'A'.repeat(280000-22)},2,200),
 setting('ck-set-partial',{showBanner:false},3,200),
 setting('ck-set-trimmed',text('portalName','  우리 회사  '),4,200),
 setting('ck-set-stale',text('boardTitle','낡은 버전'),0,409),
 setting('ck-set-viewer',text('boardTitle','조회 계정 시도'),5,403,viewer),
 setting('ck-set-texts-array',{...defaults,texts:[]},5,200),
 get('ck-set-read-viewer','/api/settings',viewer),
 hint(403,get('ck-set-history-viewer','/api/settings/history',viewer)),
 get('ck-set-history','/api/settings/history'),
 get('ck-kpi-status','/api/kpi-status'),
];

export const scenarios=[
 {name:'secured',mode:'secured',golden:true,steps:securedSteps},
 {name:'open',mode:'open',golden:true,steps:openSteps},
 {name:'char-tasks',mode:'secured',golden:false,steps:as(admin,chars.map(s=>s.user?s:{...s}))},
 {name:'char-kpi',mode:'secured',golden:false,steps:as(admin,kpis)},
];
