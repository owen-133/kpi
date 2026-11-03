import http from 'node:http';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { timingSafeEqual } from 'node:crypto';

const cloud=process.env.STORAGE_BACKEND==='supabase';
if((process.env.NODE_ENV==='production'||cloud)&&(!process.env.ADMIN_PASSWORD||!process.env.VIEWER_PASSWORD))throw Error('배포 시 관리자와 조회 비밀번호가 필요합니다.');
if(process.env.ADMIN_PASSWORD&&process.env.ADMIN_PASSWORD===process.env.VIEWER_PASSWORD)throw Error('관리자와 조회 비밀번호는 달라야 합니다.');
if(process.env.NODE_ENV==='production'&&!cloud)throw Error('무료 배포에는 STORAGE_BACKEND=supabase가 필요합니다.');
const {store}=await import(cloud?'./supabase-store.js':'./local-store.js');
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
 let body={};if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>64000)return send(413,{error:'입력 내용이 너무 깁니다.'});}try{body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=='object')throw Error();}catch{return send(400,{error:'잘못된 입력입니다.'});}}
 if(path==='/api/session')return send(200,{role:userRole,shared:!!process.env.ADMIN_PASSWORD});
 if(path==='/api/tasks'&&req.method==='GET')return send(200,await store.list());
 if(path==='/api/tasks'&&req.method==='POST'){
 const fields=['title','requester','department','channel','category','priority','requested_at','due_date','description'];const v={};for(const k of fields){v[k]=String(body[k]||'').trim();if(v[k].length>10000)return send(400,{error:'입력 길이를 확인하세요.'});}
 if(!v.title||!v.requester||!v.requested_at||!Number.isFinite(Date.parse(v.requested_at)))return send(400,{error:'제목, 요청자, 요청 시각을 확인하세요.'});
 if(v.due_date&&!/^\d{4}-\d{2}-\d{2}$/.test(v.due_date))return send(400,{error:'기한을 확인하세요.'});
 return send(201,await store.create(v));
 }
 const match=path.match(/^\/api\/tasks\/([^/]+)(?:\/(status|notes))?$/);
 if(match){const id=match[1];
 if(req.method==='GET'&&!match[2]){const task=await store.detail(id);return task?send(200,task):send(404,{error:'업무를 찾을 수 없습니다.'});}
 if(req.method==='POST'&&match[2]==='status'){if(!statuses.includes(body.status))return send(400,{error:'올바른 상태를 선택하세요.'});const reason=String(body.reason||'').trim();if(reason.length>10000)return send(400,{error:'사유가 너무 깁니다.'});return send(200,await store.status(id,body.status,reason));}
 if(req.method==='POST'&&match[2]==='notes'){const note=String(body.note||'').trim();if(!note||note.length>10000)return send(400,{error:'메모를 1~10000자로 입력하세요.'});return send(201,await store.note(id,note));}
 }return send(404,{error:'지원하지 않는 요청입니다.'});
 }
 if(req.method!=='GET')return send(405,{error:'지원하지 않는 요청입니다.'});
 const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};if(!files[path])return send(404,{error:'페이지를 찾을 수 없습니다.'});
 const data=readFileSync(new URL('./public/'+files[path],import.meta.url));res.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'}[extname(files[path])],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'"});res.end(data);
 }catch(e){if(e.status)return send(e.status,{error:e.message});console.error('Request failed:',e.name);send(503,{error:'데이터 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'});}
});
server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log(`Orbit Ops listening on port ${process.env.PORT||3000}`));
