const base=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base||!key)throw Error('SUPABASE_URL과 SUPABASE_SECRET_KEY가 필요합니다.');
const url=new URL(base);
if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||!url.hostname.endsWith('.supabase.co'))throw Error('Supabase 프로젝트의 HTTPS URL을 사용하세요.');
const headers={'Content-Type':'application/json',apikey:key};
// New sb_secret keys are API keys, not JWT bearer tokens.
if(!key.startsWith('sb_secret_'))headers.Authorization=`Bearer ${key}`;
async function rpc(action,payload={}){
 const response=await fetch(new URL('/rest/v1/rpc/orbit_api',url),{method:'POST',headers,body:JSON.stringify({action,payload}),signal:AbortSignal.timeout(15000)});
 if(!response.ok){const e=await response.json().catch(()=>({}));const errors={PT400:400,PT404:404};if(errors[e.code])throw Object.assign(Error(e.message),{status:errors[e.code]});throw Error('Supabase request failed');}
 return response.json();
}
export const store={list:()=>rpc('list'),detail:id=>rpc('detail',{id}),create:task=>rpc('create',task),status:(id,status,reason)=>rpc('status',{id,status,reason}),note:(id,note)=>rpc('note',{id,note})};
