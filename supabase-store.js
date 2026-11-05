const base=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base||!key)throw Error('SUPABASE_URL과 SUPABASE_SECRET_KEY가 필요합니다.');
const url=new URL(base);
if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||!url.hostname.endsWith('.supabase.co'))throw Error('Supabase 프로젝트의 HTTPS URL을 사용하세요.');
const headers={'Content-Type':'application/json',apikey:key};
// New sb_secret keys are API keys, not JWT bearer tokens.
if(!key.startsWith('sb_secret_'))headers.Authorization=`Bearer ${key}`;
async function rpc(action,payload={},name='orbit_api'){
 const response=await fetch(new URL('/rest/v1/rpc/'+name,url),{method:'POST',headers,body:JSON.stringify({action,payload}),signal:AbortSignal.timeout(15000)});
 if(!response.ok){const e=await response.json().catch(()=>({}));if(name==='orbit_kpi'&&e.code==='PGRST202')throw Object.assign(Error('KPI 기능 DB 초기화가 필요합니다. supabase/kpi.sql을 SQL Editor에서 실행하세요.'),{status:503,code:'KPI_MIGRATION_REQUIRED'});if(name==='orbit_lifecycle'&&e.code==='PGRST202')throw Object.assign(Error('삭제 기능 DB 초기화가 필요합니다. supabase/deletion.sql을 SQL Editor에서 실행하세요.'),{status:503});if(name==='orbit_settings'&&e.code==='PGRST202')throw Object.assign(Error('관리자 설정 DB 초기화가 필요합니다. supabase/settings.sql을 SQL Editor에서 실행하세요.'),{status:503,code:'SETTINGS_MIGRATION_REQUIRED'});const errors={PT400:400,PT404:404,PT409:409};if(errors[e.code])throw Object.assign(Error(e.message),{status:errors[e.code]});throw Error('Supabase request failed');}
 return response.json();
}
export const store={edit:async(id,values,revision,reason)=>{const response=await fetch(new URL('/rest/v1/rpc/orbit_edit_task',url),{method:'POST',headers,body:JSON.stringify({payload:{id,values,revision,reason}}),signal:AbortSignal.timeout(15000)});if(!response.ok){const e=await response.json().catch(()=>({}));if(e.code==='PGRST202')throw Object.assign(Error('업무 수정 기능 DB 초기화가 필요합니다. supabase/edit.sql을 SQL Editor에서 실행하세요.'),{status:503});throw Object.assign(Error(['PT400','PT404','PT409'].includes(e.code)?e.message:'업무 수정 저장에 실패했습니다.'),{status:{PT400:400,PT404:404,PT409:409}[e.code]||503});}return response.json();},trash:()=>rpc('trash',{},'orbit_lifecycle'),lifecycleHistory:()=>rpc('history',{},'orbit_lifecycle'),lifecycle:(id,action,reason,confirmation)=>rpc(action,{id,reason,confirmation},'orbit_lifecycle'),settings:()=>rpc('get',{},'orbit_settings'),settingsHistory:()=>rpc('history',{},'orbit_settings'),saveSettings:(values,revision)=>rpc('save',{values,revision},'orbit_settings'),list:()=>rpc('list'),detail:(id,includeDeleted=false)=>rpc('detail',{id,include_deleted:includeDeleted}),create:task=>rpc('create',task),status:(id,status,reason)=>rpc('status',{id,status,reason}),note:(id,note)=>rpc('note',{id,note})};
export {rpc};
