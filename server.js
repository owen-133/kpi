import {editableFields} from './task-edit.js';
import {validDate,kstDate,monthlyMetrics,monthlyDraft,classify,similarTasks,validateImprovement,currentMonth} from './public/kpi-model.js';
import {defaults,normalizeSettings,validateSettings} from './public/settings-model.js';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { timingSafeEqual,createHash } from 'node:crypto';

const cloud=process.env.STORAGE_BACKEND==='supabase';
if((process.env.NODE_ENV==='production'||cloud)&&(!process.env.ADMIN_PASSWORD||!process.env.VIEWER_PASSWORD))throw Error('배포 시 관리자와 조회 비밀번호가 필요합니다.');
if(process.env.ADMIN_PASSWORD&&process.env.ADMIN_PASSWORD===process.env.VIEWER_PASSWORD)throw Error('관리자와 조회 비밀번호는 달라야 합니다.');
if(process.env.NODE_ENV==='production'&&!cloud)throw Error('무료 배포에는 STORAGE_BACKEND=supabase가 필요합니다.');
const {store}=await import(cloud?'./supabase-store.js':'./local-store.js');
const {kpi}=await import('./kpi-store.js');
async function taskSnapshot(){const list=await store.list();let extras=[];try{extras=await kpi('extras');}catch(e){if(e.code!=='KPI_MIGRATION_REQUIRED')throw e;}const byId=new Map(extras.map(e=>[e.task_id,e]));return list.map(t=>({...t,...byId.get(t.id)}));}
const reportFingerprint=list=>createHash('sha256').update(JSON.stringify({date:kstDate(new Date().toISOString()),tasks:list.map(t=>[t.id,t.requested_at,t.completed_at,t.due_date,t.status,t.category,t.deleted_at,t.is_test])})).digest('hex');
const statuses=['접수','진행 중','대기','완료'];
function safeEqual(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function role(req){if(!process.env.ADMIN_PASSWORD)return 'admin';const raw=req.headers.authorization||'';if(!raw.startsWith('Basic '))return null;const pair=Buffer.from(raw.slice(6),'base64').toString();const i=pair.indexOf(':');const user=pair.slice(0,i),pass=pair.slice(i+1);if(user==='admin'&&safeEqual(pass,process.env.ADMIN_PASSWORD))return 'admin';if(user==='viewer'&&process.env.VIEWER_PASSWORD&&safeEqual(pass,process.env.VIEWER_PASSWORD))return 'viewer';return null;}
const server=http.createServer(async(req,res)=>{
 const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/health'&&req.method==='GET')return send(200,{ok:true});
 const userRole=role(req);if(!userRole){res.writeHead(401,{'WWW-Authenticate':'Basic realm="Orbit Ops", charset="UTF-8"','Cache-Control':'no-store'});return res.end('로그인이 필요합니다.');}
 if(path.startsWith('/api/')){
 if(req.method!=='GET'&&userRole!=='admin')return send(403,{error:'조회 계정은 업무를 변경할 수 없습니다.'});
 if(req.method!=='GET'&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return send(403,{error:'허용되지 않은 요청입니다.'});
 let body={};if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1600000)return send(413,{error:'입력 내용이 너무 깁니다.'});}try{body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=='object')throw Error();}catch{return send(400,{error:'잘못된 입력입니다.'});}}
 if(path==='/api/settings'&&req.method==='GET'){try{const config=await store.settings();return send(200,{...config,values:normalizeSettings(config.values)});}catch(e){if(e.code==='SETTINGS_MIGRATION_REQUIRED')return send(200,{values:defaults,revision:0,available:false,message:e.message});throw e;}}
 if(path==='/api/settings/history'&&req.method==='GET'){if(userRole!=='admin')return send(403,{error:'관리자만 설정 이력을 볼 수 있습니다.'});return send(200,await store.settingsHistory());}
 if(path==='/api/settings'&&req.method==='POST'){if(!Number.isInteger(body.revision)||body.revision<0)return send(400,{error:'설정 버전을 확인하세요.'});return send(200,await store.saveSettings(validateSettings(body.values),body.revision));}
 if(path==='/api/session')return send(200,{role:userRole,shared:!!process.env.ADMIN_PASSWORD});
 if(['/api/trash','/api/lifecycle-history'].includes(path)&&req.method==='GET'){if(userRole!=='admin')return send(403,{error:'관리자만 휴지통과 삭제 이력을 볼 수 있습니다.'});return send(200,await (path==='/api/trash'?store.trash():store.lifecycleHistory()));}
 if(path==='/api/tasks'&&req.method==='GET')return send(200,await taskSnapshot());
 if(path==='/api/tasks'&&req.method==='POST'){
 const fields=['title','requester','department','channel','category','priority','requested_at','due_date','description'];const v={};for(const k of fields){v[k]=String(body[k]||'').trim();if(v[k].length>10000)return send(400,{error:'입력 길이를 확인하세요.'});}
 if(!v.title||!v.requester||!v.requested_at||!Number.isFinite(Date.parse(v.requested_at)))return send(400,{error:'제목, 요청자, 요청 시각을 확인하세요.'});
 if(v.due_date&&!validDate(v.due_date))return send(400,{error:'기한을 확인하세요.'});
 return send(201,await store.create(v));
 }
 if(path==='/api/kpi-status'&&req.method==='GET'){try{await kpi('extras');return send(200,{available:true});}catch(e){if(e.code==='KPI_MIGRATION_REQUIRED')return send(200,{available:false,message:e.message});throw e;}}
 if(path==='/api/automation'&&req.method==='POST'){const content=String(body.text||'').slice(0,20000);let config;try{config=await store.settings();}catch(e){if(e.code!=='SETTINGS_MIGRATION_REQUIRED')throw e;config={values:{}};}const categories=normalizeSettings(config.values).categories;return send(200,{classification:classify(content,categories),similar:similarTasks(content,await taskSnapshot()),method:'규칙·텍스트 유사도 기반 자동화 (생성형 AI 미사용)'});}
 if(path==='/api/improvements'&&req.method==='GET')return send(200,await kpi('improvements'));
 if(path==='/api/improvements'&&req.method==='POST'){let value;try{value=validateImprovement(body.value);}catch(e){return send(400,{error:e.message});}if(body.id&&(!Number.isInteger(body.revision)||body.revision<1))return send(400,{error:'개선 항목 버전을 확인하세요.'});return send(201,await kpi('improvement_save',{id:body.id,revision:body.revision,value}));}
 const ih=path.match(/^\/api\/improvements\/([^/]+)\/history$/);if(ih&&req.method==='GET')return send(200,await kpi('improvement_history',{id:ih[1]}));
 if(path==='/api/report-preview'&&req.method==='GET'){const list=await taskSnapshot();let metrics;try{metrics=monthlyMetrics(list,new URL(req.url,'http://localhost').searchParams.get('month'));}catch(e){return send(400,{error:e.message});}return send(200,{metrics,draft:monthlyDraft(metrics),fingerprint:reportFingerprint(list)});}
 if(path==='/api/reports'&&req.method==='GET')return send(200,await kpi('reports'));
 if(path==='/api/reports'&&req.method==='POST'){const month=String(body.month||'');const list=await taskSnapshot();if(body.fingerprint!==reportFingerprint(list))return send(409,{error:'집계 후 업무가 변경됐습니다. 새로 집계하고 발행하세요.'});let metrics;try{metrics=monthlyMetrics(list,month);}catch(e){return send(400,{error:e.message});}if(month>currentMonth())return send(400,{error:'미래 월 리포트는 발행할 수 없습니다.'});const draft=String(body.draft||monthlyDraft(metrics)).trim();if(draft.length>20000)return send(400,{error:'보고서는 20000자 이하로 입력하세요.'});return send(201,await kpi('report_save',{month,value:{metrics,draft,method:'담당자 검토 발행 · 규칙 기반 집계'}}));}
 const fileRoute=path.match(/^\/api\/tasks\/([^/]+)\/files(?:\/([^/]+))?$/);
 if(fileRoute){const id=fileRoute[1],file_id=fileRoute[2];
 if(req.method==='GET'&&file_id){const file=await kpi('file_get',{id,file_id});const buffer=Buffer.from(file.content,'base64');res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(file.name),'Content-Length':buffer.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(buffer);}
 if(req.method==='POST'&&file_id)return send(200,await kpi('file_delete',{id,file_id}));
 if(req.method==='POST'){const name=String(body.name||'').replace(/[\\/\r\n]/g,'_').slice(0,150),content=String(body.content||'');if(!/\.(pdf|png|jpe?g|webp|txt|csv|xlsx|docx)$/i.test(name)||!content||content.length>1398104||!/^[A-Za-z0-9+/]+=*$/.test(content))return send(400,{error:'지원 파일: PDF·이미지·TXT·CSV·XLSX·DOCX, 최대 1MB'});const buffer=Buffer.from(content,'base64');if(!buffer.length||buffer.length>1048576)return send(400,{error:'첨부파일은 1MB 이하여야 합니다.'});return send(201,await kpi('file_add',{id,name,content:buffer.toString('base64'),type:'application/octet-stream',size:buffer.length}));}}
 const testRoute=path.match(/^\/api\/tasks\/([^/]+)\/test-data$/);if(testRoute&&req.method==='POST'){if(typeof body.is_test!=='boolean')return send(400,{error:'데이터 구분을 확인하세요.'});return send(200,await kpi('mark_test',{id:testRoute[1],is_test:body.is_test}));}
 const assignRoute=path.match(/^\/api\/tasks\/([^/]+)\/assign$/);if(assignRoute&&req.method==='POST'){const assignee=String(body.assignee||'').trim();if(!assignee||assignee.length>100)return send(400,{error:'담당자를 1~100자로 입력하세요.'});return send(200,await kpi('assign',{id:assignRoute[1],assignee}));}
 const match=path.match(/^\/api\/tasks\/([^/]+)(?:\/(status|notes|delete|restore|purge|edit))?$/);
 if(match){const id=match[1];
 if(req.method==='GET'&&!match[2]){const task=await store.detail(id,userRole==='admin');if(!task)return send(404,{error:'업무를 찾을 수 없습니다.'});if(!task.deleted_at){try{task.kpi=await kpi('detail',{id});}catch(e){if(e.code!=='KPI_MIGRATION_REQUIRED')throw e;task.kpi={available:false,message:e.message,files:[]};}}return send(200,task);}
 if(req.method==='POST'&&match[2]==='edit'){const values={};for(const k of editableFields){if(typeof body.values?.[k]!=='string'||body.values[k].length>10000)return send(400,{error:'수정 항목을 확인하세요.'});values[k]=body.values[k].trim();}if(!values.title||!values.requester||!Number.isFinite(Date.parse(values.requested_at))||(values.due_date&&!validDate(values.due_date)))return send(400,{error:'업무명·요청자·요청 시각·기한을 확인하세요.'});const reason=String(body.reason||'').trim();if(!reason||reason.length>1000||!Number.isInteger(body.revision)||body.revision<0)return send(400,{error:'수정 사유와 버전을 확인하세요.'});return send(200,await store.edit(id,values,body.revision,reason));}
 if(req.method==='POST'&&['delete','restore','purge'].includes(match[2])){const reason=String(body.reason||'').trim();if(!reason||reason.length>1000)return send(400,{error:'사유를 1~1000자로 입력하세요.'});return send(200,await store.lifecycle(id,match[2],reason,String(body.confirmation||'')));}
 if(req.method==='POST'&&match[2]==='status'){if(!statuses.includes(body.status))return send(400,{error:'올바른 상태를 선택하세요.'});const reason=String(body.reason||'').trim();if(reason.length>10000)return send(400,{error:'사유가 너무 깁니다.'});return send(200,await store.status(id,body.status,reason));}
 if(req.method==='POST'&&match[2]==='notes'){const note=String(body.note||'').trim();if(!note||note.length>10000)return send(400,{error:'메모를 1~10000자로 입력하세요.'});return send(201,await store.note(id,note));}
 }return send(404,{error:'지원하지 않는 요청입니다.'});
 }
 if(req.method!=='GET')return send(405,{error:'지원하지 않는 요청입니다.'});
 const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/settings-model.js':'settings-model.js','/admin-settings.js':'admin-settings.js','/kpi-model.js':'kpi-model.js','/kpi-ui.js':'kpi-ui.js','/task-editor.js':'task-editor.js','/pdf/report-pdf.js':'pdf/report-pdf.js','/fonts/NanumGothic-Regular.ttf':'fonts/NanumGothic-Regular.ttf','/favicon.svg':'favicon.svg','/board/board.js':'board/board.js','/board/board.css':'board/board.css','/third-party-notices':'THIRD_PARTY_NOTICES.txt','/claude-board-license':'CLAUDE_BOARD_LICENSE.txt'};if(!files[path])return send(404,{error:'페이지를 찾을 수 없습니다.'});
 const data=readFileSync(new URL('./public/'+files[path],import.meta.url));res.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf'}[extname(files[path])],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'"});res.end(data);
 }catch(e){if(e.status)return send(e.status,{error:e.message});console.error('Request failed:',e.name);send(503,{error:'데이터 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'});}
});
server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log(`Orbit Ops listening on port ${process.env.PORT||3000}`));
