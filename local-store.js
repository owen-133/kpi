import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
const dir = resolve(process.env.DATA_DIR || 'data'); mkdirSync(dir,{recursive:true});
const db = new DatabaseSync(resolve(dir,'orbit.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, title TEXT NOT NULL, requester TEXT NOT NULL, department TEXT NOT NULL, channel TEXT NOT NULL, category TEXT NOT NULL, priority TEXT NOT NULL, requested_at TEXT NOT NULL, due_date TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,task_id TEXT NOT NULL REFERENCES tasks(id),at TEXT NOT NULL, actor TEXT NOT NULL,kind TEXT NOT NULL,detail TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'Audit events cannot be updated'); END;
CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'Audit events cannot be deleted'); END;`);

db.exec(`CREATE TABLE IF NOT EXISTS portal_settings(id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL, revision INTEGER NOT NULL);
INSERT OR IGNORE INTO portal_settings VALUES(1,'{}',0);
CREATE TABLE IF NOT EXISTS settings_events(id INTEGER PRIMARY KEY AUTOINCREMENT,at TEXT NOT NULL,actor TEXT NOT NULL,before_value TEXT NOT NULL,after_value TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS settings_events_no_update BEFORE UPDATE ON settings_events BEGIN SELECT RAISE(ABORT,'Settings audit cannot be updated'); END;
CREATE TRIGGER IF NOT EXISTS settings_events_no_delete BEFORE DELETE ON settings_events BEGIN SELECT RAISE(ABORT,'Settings audit cannot be deleted'); END;`);
function record(id,kind,detail){db.prepare('INSERT INTO events(task_id,at,actor,kind,detail) VALUES(?,?,?,?,?)').run(id,new Date().toISOString(),'총무 담당자',kind,detail);}
function transaction(fn){db.exec('BEGIN');try{const value=fn();db.exec('COMMIT');return value;}catch(e){db.exec('ROLLBACK');throw e;}}
export const store={
 settings:()=>{const r=db.prepare('SELECT * FROM portal_settings WHERE id=1').get();return {values:JSON.parse(r.value),revision:r.revision,available:true};},
 settingsHistory:()=>db.prepare('SELECT * FROM settings_events ORDER BY id DESC LIMIT 30').all().map(e=>({...e,before:JSON.parse(e.before_value),after:JSON.parse(e.after_value),before_value:undefined,after_value:undefined})),
 saveSettings:(values,revision)=>transaction(()=>{const r=db.prepare('SELECT * FROM portal_settings WHERE id=1').get();if(r.revision!==revision)throw Object.assign(Error('다른 화면에서 설정이 변경됐습니다. 다시 불러온 뒤 저장하세요.'),{status:409});const value=JSON.stringify(values);db.prepare('INSERT INTO settings_events(at,actor,before_value,after_value) VALUES(?,?,?,?)').run(new Date().toISOString(),'admin',r.value,value);db.prepare('UPDATE portal_settings SET value=?,revision=? WHERE id=1').run(value,revision+1);return {values,revision:revision+1,available:true};}),
 list:()=>db.prepare('SELECT * FROM tasks ORDER BY created_at DESC, rowid DESC').all(),
 detail:(id)=>{const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(id);return task?{...task,events:db.prepare('SELECT * FROM events WHERE task_id=? ORDER BY id').all(id)}:null;},
 create:(v)=>transaction(()=>{const id=randomUUID(),now=new Date().toISOString();db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,...['title','requester','department','channel','category','priority','requested_at','due_date','description'].map(k=>v[k]),'접수',now,now,null);record(id,'등록',JSON.stringify(v));return {id};}),
 status:(id,status,reason)=>transaction(()=>{const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(id);if(!task)throw Object.assign(Error('업무를 찾을 수 없습니다.'),{status:404});if(task.status===status)return {ok:true};if(task.status==='완료'&&!reason)throw Object.assign(Error('완료 업무를 재개하는 사유를 입력하세요.'),{status:400});const now=new Date().toISOString();db.prepare('UPDATE tasks SET status=?,updated_at=?,completed_at=? WHERE id=?').run(status,now,status==='완료'?now:null,id);record(id,'상태 변경',`${task.status} → ${status}${reason?' · '+reason:''}`);return {ok:true};}),
 note:(id,note)=>transaction(()=>{if(!db.prepare('SELECT id FROM tasks WHERE id=?').get(id))throw Object.assign(Error('업무를 찾을 수 없습니다.'),{status:404});record(id,'처리 메모',note);return {ok:true};})
};
