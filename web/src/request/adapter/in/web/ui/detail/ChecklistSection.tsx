'use client';
import styles from './checklist.module.css';
import {useState} from 'react';
import {checklistItems,type ChecklistChange} from '../../../../../domain/TaskChecklist.ts';
import type {RequestApi,TaskDetailView} from '../RequestApi.ts';
import type {DetailActions} from './detailFlow.ts';
export function ChecklistSection({task,editable,api,actions}:{task:TaskDetailView;editable:boolean;api:RequestApi;actions:DetailActions}) {
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [title,setTitle]=useState('');
 const items=checklistItems(task.description||'');
 const byLine=new Map(items.map(item=>[item.line,item]));
 async function save(change:ChecklistChange){
  if(busy)return;
  setBusy(true);setError('');
  try{
   await api.updateChecklist(task.id,{revision:task.edit_revision||0,change});
   await actions.refresh();
   await actions.openDetail(task.id);
   actions.toast('하위 업무 변경을 기록했습니다.');
  }catch(error){setError(error instanceof Error?error.message:String(error));}
  finally{setBusy(false);}
 }
 return <section aria-label="하위 업무" aria-busy={busy} className={styles.section}>
  <h3>상세 내용 · 하위 업무 {items.length?`(${items.filter(item=>item.done).length}/${items.length} 완료)`:''}</h3>
  <div className="description">{(task.description||'등록된 상세 내용이 없습니다.').split('\n').map((text,line)=>{
   const item=byLine.get(line);
   return item?<label className={styles.row} key={line}><input type="checkbox" checked={item.done} disabled={!editable||busy} aria-label={item.text+' 완료'} onChange={event=>void save({kind:'toggle',line,done:event.target.checked})}/><span>{item.text}</span><small>{item.done?'완료':'미완료'}</small></label>:<div key={line}>{text||'\u00a0'}</div>;
  })}</div>
  {editable?<form className={styles.form} onSubmit={event=>{event.preventDefault();void save({kind:'add',title});}}><label>하위 업무 추가<input value={title} onChange={event=>setTitle(event.target.value)} required maxLength={1000} placeholder="예: 계정 생성" disabled={busy}/></label><button type="submit" className="secondary" disabled={busy}>{busy?'저장 중…':'하위 업무 추가'}</button><p className="muted tiny">번호 목록은 개별 완료 체크를 지원합니다. 전체 업무 상태는 별도로 변경하세요.</p></form>:null}
  {error?<p role="alert">{error}</p>:null}
 </section>;
}
