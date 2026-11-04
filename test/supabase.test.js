import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

test('배포 설정 누락 시 임시 디스크로 시작하지 않음',()=>{
 const result=spawnSync(process.execPath,['server.js'],{encoding:'utf8',env:{...process.env,NODE_ENV:'production',STORAGE_BACKEND:'local',ADMIN_PASSWORD:'test-admin',VIEWER_PASSWORD:'test-viewer'}});
 assert.notEqual(result.status,0);assert.match(result.stderr,/STORAGE_BACKEND=supabase/);
});

test('PostgreSQL RPC, 접근 권한, 트랜잭션 및 이력 보존',{skip:!process.env.ORBIT_PGLITE_PATH},async()=>{
 const {PGlite}=await import(process.env.ORBIT_PGLITE_PATH);
 const db=new PGlite();const savedFetch=globalThis.fetch;
 const saved={...process.env};
 try{
 await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
 const schema=readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8');
 await db.exec(schema);await db.exec(schema);
 const settingsSchema=readFileSync(new URL('../supabase/settings.sql',import.meta.url),'utf8');await db.exec(settingsSchema);await db.exec(settingsSchema);
 await db.exec('SET ROLE anon');
 await assert.rejects(db.query("SELECT public.orbit_api('list','{}'::jsonb)"),/permission denied/);
 await assert.rejects(db.query("SELECT public.orbit_settings('get','{}'::jsonb)"),/permission denied/);
 await db.exec('RESET ROLE');
 await db.exec('SET ROLE authenticated');
 await assert.rejects(db.query("SELECT public.orbit_api('list','{}'::jsonb)"),/permission denied/);
 await db.exec('RESET ROLE');
 await db.exec('SET ROLE service_role');
 process.env.SUPABASE_URL='https://test-project.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_test-server-key';
 globalThis.fetch=async(url,options)=>{const name=new URL(url).pathname.endsWith('/orbit_settings')?'orbit_settings':'orbit_api';assert.equal(options.headers.apikey,'sb_secret_test-server-key');assert.equal(options.headers.Authorization,undefined);const {action,payload}=JSON.parse(options.body);try{const result=await db.query('SELECT public.'+name+'($1,$2::jsonb) AS data',[action,JSON.stringify(payload)]);return Response.json(result.rows[0].data);}catch(e){return Response.json({code:e.code,message:e.message},{status:400});}};
 const {store}=await import('../supabase-store.js');
 assert.deepEqual(await store.list(),[]);
 assert.equal((await store.settings()).revision,0);
 await store.saveSettings({texts:{portalName:'테스트 포털'}},0);
 assert.equal((await store.settings()).values.texts.portalName,'테스트 포털');
 await assert.rejects(store.saveSettings({texts:{}},0),/다른 화면/);
 assert.equal((await store.settingsHistory()).length,1);

 const {id}=await store.create({title:'테스트 요청',requester:'홍길동',requested_at:'2026-11-03T01:00:00Z'});
 await store.status(id,'진행 중','');await store.note(id,'준비 완료');await store.status(id,'완료','');
 await assert.rejects(store.status(id,'진행 중',''),/재개하는 사유/);
 let task=await store.detail(id);assert.equal(task.status,'완료');assert.equal(task.events.length,4);assert.ok(task.completed_at);
 await store.status(id,'진행 중','추가 요청');task=await store.detail(id);assert.equal(task.completed_at,null);assert.equal(task.events.length,5);
 await assert.rejects(store.note('00000000-0000-0000-0000-000000000000','없음'),/찾을 수 없습니다/);
 await db.exec('RESET ROLE');
 await assert.rejects(db.exec('DELETE FROM orbit_private.settings_events'),/cannot be updated or deleted/);
 await assert.rejects(db.exec('DELETE FROM orbit_private.events'),/cannot be updated or deleted/);
 await assert.rejects(db.exec("UPDATE orbit_private.events SET detail='변조'"),/cannot be updated or deleted/);
 await db.exec("CREATE FUNCTION orbit_private.reject_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test write failure'; END; $$; CREATE TRIGGER test_reject BEFORE INSERT ON orbit_private.events FOR EACH ROW EXECUTE FUNCTION orbit_private.reject_event(); SET ROLE service_role;");
 await assert.rejects(store.status(id,'완료',''),/Supabase request failed/);
 assert.equal((await store.detail(id)).status,'진행 중'); // 이력 삽입 실패 시 상태도 롤백
 globalThis.fetch=async()=>Response.json({code:'PGRST202'},{status:404});await assert.rejects(store.settings(),e=>e.code==='SETTINGS_MIGRATION_REQUIRED');
 }finally{globalThis.fetch=savedFetch;for(const key of ['SUPABASE_URL','SUPABASE_SECRET_KEY']){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}await db.close();}
});
