import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const dir = resolve(process.env.DATA_DIR || 'data'); mkdirSync(dir,{recursive:true});
const db = new DatabaseSync(resolve(dir,'orbit.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, title TEXT NOT NULL, requester TEXT NOT NULL, department TEXT NOT NULL, channel TEXT NOT NULL, category TEXT NOT NULL, priority TEXT NOT NULL, requested_at TEXT NOT NULL, due_date TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,task_id TEXT NOT NULL REFERENCES tasks(id),at TEXT NOT NULL, actor TEXT NOT NULL,kind TEXT NOT NULL,detail TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'Audit events cannot be updated'); END;
CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'Audit events cannot be deleted'); END;`);
const statuses=['접수','진행 중','대기','완료'];
function record(id,kind,detail){db.prepare('INSERT INTO events(task_id,at,actor,kind,detail) VALUES(?,?,?,?,?)').run(id,new Date().toISOString(),'총무 담당자',kind,detail);}
function safeEqual(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function role(req){if(!process.env.ADMIN_PASSWORD)return 'admin';const raw=req.headers.authorization||'';if(!raw.startsWith('Basic '))return null;const pair=Buffer.from(raw.slice(6),'base64').toString();const i=pair.indexOf(':');const user=pair.slice(0,i),pass=pair.slice(i+1);if(user==='admin'&&safeEqual(pass,process.env.ADMIN_PASSWORD))return 'admin';if(user==='viewer'&&process.env.VIEWER_PASSWORD&&safeEqual(pass,process.env.VIEWER_PASSWORD))return 'viewer';return null;}
const server=http.createServer(async(req,res)=>{
 const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/health'&&req.method==='GET')return send(200,{ok:true});
 const userRole=role(req);if(!userRole){res.writeHead(401,{'WWW-Authenticate':'Basic realm="Orbit Ops", charset="UTF-8"'});return res.end('로그인이 필요합니다.');}
 if(path.startsWith('/api/')){
 if(req.method!=='GET'&&userRole!=='admin')return send(403,{error:'조회 계정은 업무를 변경할 수 없습니다.'});
 if(req.method!=='GET'&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return send(403,{error:'허용되지 않은 요청입니다.'});
 let body={};if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>64000)return send(413,{error:'입력 내용이 너무 깁니다.'});}try{body=JSON.parse(raw);}catch{return send(400,{error:'잘못된 입력입니다.'});}}
 if(path==='/api/session')return send(200,{role:userRole,shared:!!process.env.ADMIN_PASSWORD});
 if(path==='/api/tasks'&&req.method==='GET')return send(200,db.prepare('SELECT * FROM tasks ORDER BY created_at DESC, rowid DESC').all());
 if(path==='/api/tasks'&&req.method==='POST'){
 const fields=['title','requester','department','channel','category','priority','requested_at','due_date','description'];const v={};for(const k of fields){v[k]=String(body[k]||'').trim();if(v[k].length>10000)return send(400,{error:'입력 길이를 확인하세요.'});}
 if(!v.title||!v.requester||!v.requested_at||!Number.isFinite(Date.parse(v.requested_at)))return send(400,{error:'제목, 요청자, 요청 시각을 확인하세요.'});
 if(v.due_date&&!/^\d{4}-\d{2}-\d{2}$/.test(v.due_date))return send(400,{error:'기한을 확인하세요.'});
 const id=randomUUID(),now=new Date().toISOString();db.exec('BEGIN');try{db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,...fields.map(k=>v[k]),'접수',now,now,null);record(id,'등록',JSON.stringify(v));db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return send(201,{id});
 }
 const match=path.match(/^\/api\/tasks\/([^/]+)(?:\/(status|notes))?$/);
 if(match){const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(match[1]);if(!task)return send(404,{error:'업무를 찾을 수 없습니다.'});
 if(req.method==='GET'&&!match[2])return send(200,{...task,events:db.prepare('SELECT * FROM events WHERE task_id=? ORDER BY id').all(task.id)});
 if(req.method==='POST'&&match[2]==='status'){if(!statuses.includes(body.status))return send(400,{error:'올바른 상태를 선택하세요.'});if(task.status===body.status)return send(200,{ok:true});const reason=String(body.reason||'').trim();if(task.status==='완료'&&!reason)return send(400,{error:'완료 업무를 재개하는 사유를 입력하세요.'});const now=new Date().toISOString();db.exec('BEGIN');try{db.prepare('UPDATE tasks SET status=?,updated_at=?,completed_at=? WHERE id=?').run(body.status,now,body.status==='완료'?now:null,task.id);record(task.id,'상태 변경',`${task.status} → ${body.status}${reason?' · '+reason:''}`);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return send(200,{ok:true});}
 if(req.method==='POST'&&match[2]==='notes'){const note=String(body.note||'').trim();if(!note||note.length>10000)return send(400,{error:'메모를 1~10000자로 입력하세요.'});record(task.id,'처리 메모',note);return send(201,{ok:true});}
 }return send(404,{error:'지원하지 않는 요청입니다.'});
 }
 if(req.method!=='GET')return send(405,{error:'지원하지 않는 요청입니다.'});
 const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};if(!files[path])return send(404,{error:'페이지를 찾을 수 없습니다.'});
 const data=readFileSync(new URL('./public/'+files[path],import.meta.url));res.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'}[extname(files[path])],'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'"});res.end(data);
 }catch(e){console.error(e.message);send(500,{error:'요청 처리에 실패했습니다.'});}
});
server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log(`Orbit Ops listening on port ${process.env.PORT||3000}`));
