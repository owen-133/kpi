import {db,record,transaction} from './local-store.js';
import {randomUUID} from 'node:crypto';
db.exec(`CREATE TABLE IF NOT EXISTS task_extras(task_id TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,assignee TEXT NOT NULL DEFAULT '',assigned_at TEXT NOT NULL DEFAULT '',is_test INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS task_files(id TEXT PRIMARY KEY,task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,name TEXT NOT NULL,type TEXT NOT NULL,size INTEGER NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS improvements(id TEXT PRIMARY KEY,value TEXT NOT NULL,revision INTEGER NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS improvement_events(id INTEGER PRIMARY KEY AUTOINCREMENT,improvement_id TEXT NOT NULL,at TEXT NOT NULL,actor TEXT NOT NULL,before_value TEXT NOT NULL,after_value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS monthly_reports(id TEXT PRIMARY KEY,month TEXT NOT NULL,created_at TEXT NOT NULL,actor TEXT NOT NULL,value TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS improvement_events_no_delete BEFORE DELETE ON improvement_events BEGIN SELECT RAISE(ABORT,'Improvement audit cannot be deleted'); END;
CREATE TRIGGER IF NOT EXISTS improvement_events_no_update BEFORE UPDATE ON improvement_events BEGIN SELECT RAISE(ABORT,'Improvement audit cannot be updated'); END;
CREATE TRIGGER IF NOT EXISTS reports_no_delete BEFORE DELETE ON monthly_reports BEGIN SELECT RAISE(ABORT,'Published reports cannot be deleted'); END;
CREATE TRIGGER IF NOT EXISTS reports_no_update BEFORE UPDATE ON monthly_reports BEGIN SELECT RAISE(ABORT,'Published reports cannot be updated'); END;`);
if(!db.prepare('PRAGMA table_info(task_extras)').all().some(c=>c.name==='is_test'))db.exec('ALTER TABLE task_extras ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0');
const fail=(message,status=404)=>{throw Object.assign(Error(message),{status});};
const task=id=>{const t=db.prepare('SELECT * FROM tasks WHERE id=? AND deleted_at IS NULL').get(id);if(!t)fail('업무를 찾을 수 없습니다.');return t;};
const unpack=r=>r?{id:r.id,month:r.month,actor:r.actor,...JSON.parse(r.value),revision:r.revision,created_at:r.created_at,updated_at:r.updated_at}:null;
export async function kpi(action,p={}){
 if(action==='extras')return db.prepare('SELECT * FROM task_extras').all();
 if(action==='detail'){task(p.id);return {...db.prepare('SELECT * FROM task_extras WHERE task_id=?').get(p.id),files:db.prepare('SELECT id,name,type,size,created_at FROM task_files WHERE task_id=? ORDER BY created_at').all(p.id),available:true};}
 if(action==='mark_test')return transaction(()=>{task(p.id);db.prepare("INSERT INTO task_extras(task_id,assignee,assigned_at,is_test) VALUES(?,'','',?) ON CONFLICT(task_id) DO UPDATE SET is_test=excluded.is_test").run(p.id,p.is_test?1:0);record(p.id,'데이터 구분 변경',p.is_test?'테스트 업무 · 지표 제외':'실제 업무 · 지표 포함');return {ok:true};});
 if(action==='assign')return transaction(()=>{task(p.id);const old=db.prepare('SELECT * FROM task_extras WHERE task_id=?').get(p.id);const now=new Date().toISOString();db.prepare("INSERT INTO task_extras(task_id,assignee,assigned_at) VALUES(?,?,?) ON CONFLICT(task_id) DO UPDATE SET assignee=excluded.assignee,assigned_at=CASE WHEN task_extras.assigned_at='' THEN excluded.assigned_at ELSE task_extras.assigned_at END").run(p.id,p.assignee,now);record(p.id,'담당자 배정',`${old?.assignee||'미배정'} → ${p.assignee}`);return {ok:true};});
 if(action==='file_add')return transaction(()=>{task(p.id);if(db.prepare('SELECT count(*) AS n FROM task_files WHERE task_id=?').get(p.id).n>=10)fail('업무당 첨부파일은 10개까지 가능합니다.',400);const id=randomUUID();db.prepare('INSERT INTO task_files VALUES(?,?,?,?,?,?,?)').run(id,p.id,p.name,p.type,p.size,p.content,new Date().toISOString());record(p.id,'첨부파일 등록',p.name);return {id};});
 if(action==='file_get'){task(p.id);return db.prepare('SELECT * FROM task_files WHERE task_id=? AND id=?').get(p.id,p.file_id)||fail('파일을 찾을 수 없습니다.');}
 if(action==='file_delete')return transaction(()=>{task(p.id);const f=db.prepare('SELECT * FROM task_files WHERE task_id=? AND id=?').get(p.id,p.file_id);if(!f)fail('파일을 찾을 수 없습니다.');db.prepare('DELETE FROM task_files WHERE id=?').run(f.id);record(p.id,'첨부파일 삭제',f.name);return {ok:true};});
 if(action==='improvements')return db.prepare('SELECT * FROM improvements ORDER BY updated_at DESC').all().map(unpack);
 if(action==='improvement_history')return db.prepare('SELECT * FROM improvement_events WHERE improvement_id=? ORDER BY id').all(p.id).map(e=>({...e,before:JSON.parse(e.before_value),after:JSON.parse(e.after_value),before_value:undefined,after_value:undefined}));
 if(action==='improvement_save')return transaction(()=>{const old=p.id?db.prepare('SELECT * FROM improvements WHERE id=?').get(p.id):null;if(p.id&&!old)fail('개선 항목을 찾을 수 없습니다.');if(old&&old.revision!==p.revision)fail('다른 화면에서 수정됐습니다. 다시 불러오세요.',409);const id=old?.id||randomUUID(),now=new Date().toISOString(),revision=(old?.revision||0)+1,value=JSON.stringify(p.value);db.prepare('INSERT INTO improvements VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,revision=excluded.revision,updated_at=excluded.updated_at').run(id,value,revision,old?.created_at||now,now);db.prepare('INSERT INTO improvement_events(improvement_id,at,actor,before_value,after_value) VALUES(?,?,?,?,?)').run(id,now,'admin',old?.value||'{}',value);return {id};});
 if(action==='reports')return db.prepare('SELECT * FROM monthly_reports ORDER BY created_at DESC').all().map(unpack);
 if(action==='report_save'){const id=randomUUID();db.prepare('INSERT INTO monthly_reports VALUES(?,?,?,?,?)').run(id,p.month,new Date().toISOString(),'admin',JSON.stringify(p.value));return {id};}
 fail('지원하지 않는 KPI 작업입니다.',400);
}
