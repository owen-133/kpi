-- 누적 업그레이드: 기존 업무를 삭제하지 않습니다. 재실행 가능합니다.
begin;
-- schema.sql

-- Supabase SQL Editor에서 실행. 기존 로컬 SQLite 데이터는 자동 복사하지 않습니다.
create schema if not exists orbit_private;
revoke all on schema orbit_private from public, anon, authenticated;
create table if not exists orbit_private.tasks (
 id uuid primary key default gen_random_uuid(), title text not null, requester text not null,
 department text not null default '', channel text not null default '', category text not null default '',
 priority text not null default '보통', requested_at timestamptz not null, due_date text not null default '',
 description text not null default '', status text not null default '접수' check(status in ('접수','진행 중','대기','완료')),
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(), completed_at timestamptz
);
create table if not exists orbit_private.events (
 id bigint generated always as identity primary key, task_id uuid not null references orbit_private.tasks(id),
 at timestamptz not null default clock_timestamp(), actor text not null default '총무 담당자', kind text not null, detail text not null
);
create index if not exists events_task_id on orbit_private.events(task_id,id);
alter table orbit_private.tasks enable row level security;
alter table orbit_private.events enable row level security;
create or replace function orbit_private.protect_events() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Audit events cannot be updated or deleted'; end; $$;
drop trigger if exists events_immutable on orbit_private.events;
create trigger events_immutable before update or delete on orbit_private.events for each row execute function orbit_private.protect_events();

create or replace function public.orbit_api(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t orbit_private.tasks; result jsonb; new_status text; reason text; note text;
begin
 if action='list' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) into result from orbit_private.tasks x; return result;
 elsif action='create' then
  if coalesce(btrim(payload->>'title'),'')='' or coalesce(btrim(payload->>'requester'),'')='' or coalesce(payload->>'requested_at','')='' then raise sqlstate 'PT400' using message='제목, 요청자, 요청 시각이 필요합니다.'; end if;
  insert into orbit_private.tasks(title,requester,department,channel,category,priority,requested_at,due_date,description)
  values(payload->>'title',payload->>'requester',coalesce(payload->>'department',''),coalesce(payload->>'channel',''),coalesce(payload->>'category',''),coalesce(payload->>'priority','보통'),(payload->>'requested_at')::timestamptz,coalesce(payload->>'due_date',''),coalesce(payload->>'description','')) returning * into t;
  insert into orbit_private.events(task_id,kind,detail) values(t.id,'등록',payload::text);
  return jsonb_build_object('id',t.id);
 end if;
 if action not in ('detail','status','note') then raise sqlstate 'PT400' using message='지원하지 않는 작업입니다.'; end if;
 select * into t from orbit_private.tasks where id=(payload->>'id')::uuid for update;
 if not found then
  if action='detail' then return null; end if;
  raise sqlstate 'PT404' using message='업무를 찾을 수 없습니다.';
 end if;
 if action='detail' then
  select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]'::jsonb) into result from orbit_private.events e where e.task_id=t.id;
  return to_jsonb(t)||jsonb_build_object('events',result);
 elsif action='status' then
  new_status:=payload->>'status'; reason:=btrim(coalesce(payload->>'reason',''));
  if new_status is null or new_status not in ('접수','진행 중','대기','완료') then raise sqlstate 'PT400' using message='올바른 상태를 선택하세요.'; end if;
  if new_status=t.status then return jsonb_build_object('ok',true); end if;
  if t.status='완료' and reason='' then raise sqlstate 'PT400' using message='완료 업무를 재개하는 사유를 입력하세요.'; end if;
  update orbit_private.tasks set status=new_status,updated_at=clock_timestamp(),completed_at=case when new_status='완료' then clock_timestamp() else null end where id=t.id;
  insert into orbit_private.events(task_id,kind,detail) values(t.id,'상태 변경',t.status||' → '||new_status||case when reason<>'' then ' · '||reason else '' end);
 elsif action='note' then
  note:=btrim(coalesce(payload->>'note','')); if note='' or length(note)>10000 then raise sqlstate 'PT400' using message='메모를 1~10000자로 입력하세요.'; end if;
  insert into orbit_private.events(task_id,kind,detail) values(t.id,'처리 메모',note);
 end if;
 return jsonb_build_object('ok',true);
 exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
  raise sqlstate 'PT400' using message='식별자 또는 시각 형식을 확인하세요.';
end; $$;
revoke all on function public.orbit_api(text,jsonb) from public,anon,authenticated;
grant execute on function public.orbit_api(text,jsonb) to service_role;
-- 서버의 service_role 키만 RPC 호출 가능. 브라우저에는 키를 전달하지 않습니다.



-- settings.sql

create table if not exists orbit_private.portal_settings (
 id integer primary key check(id=1), value jsonb not null default '{}'::jsonb,
 revision integer not null default 0
);
insert into orbit_private.portal_settings(id) values(1) on conflict do nothing;
create table if not exists orbit_private.settings_events (
 id bigint generated always as identity primary key, at timestamptz not null default clock_timestamp(),
 actor text not null default 'admin', before_value jsonb not null, after_value jsonb not null
);
alter table orbit_private.portal_settings enable row level security;
alter table orbit_private.settings_events enable row level security;
drop trigger if exists settings_events_immutable on orbit_private.settings_events;
create trigger settings_events_immutable before update or delete on orbit_private.settings_events for each row execute function orbit_private.protect_events();
create or replace function public.orbit_settings(action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s orbit_private.portal_settings; result jsonb;
begin
 if action='history' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc),'[]'::jsonb) into result from
   (select id,at,actor,before_value as before,after_value as after from orbit_private.settings_events order by id desc limit 30) x;
  return result;
 end if;
 if action not in ('get','save') then raise sqlstate 'PT400' using message='지원하지 않는 설정 작업입니다.'; end if;
 select * into s from orbit_private.portal_settings where id=1 for update;
 if action='get' then return jsonb_build_object('values',s.value,'revision',s.revision,'available',true); end if;
 if jsonb_typeof(payload->'values') is distinct from 'object' or jsonb_typeof(payload->'revision') is distinct from 'number' then
  raise sqlstate 'PT400' using message='설정 형식을 확인하세요.';
 end if;
 if (payload->>'revision')::integer<>s.revision then raise sqlstate 'PT409' using message='다른 화면에서 설정이 변경됐습니다. 다시 불러온 뒤 저장하세요.'; end if;
 insert into orbit_private.settings_events(before_value,after_value) values(s.value,payload->'values');
 update orbit_private.portal_settings set value=payload->'values',revision=s.revision+1 where id=1;
 return jsonb_build_object('values',payload->'values','revision',s.revision+1,'available',true);
end; $$;
revoke all on function public.orbit_settings(text,jsonb) from public,anon,authenticated;
grant execute on function public.orbit_settings(text,jsonb) to service_role;


-- deletion.sql

alter table orbit_private.tasks add column if not exists deleted_at timestamptz;
create table if not exists orbit_private.task_lifecycle_events (
 id bigint generated always as identity primary key, task_id uuid not null,
 at timestamptz not null default clock_timestamp(), actor text not null default 'admin', action text not null, reason text not null
);
alter table orbit_private.task_lifecycle_events enable row level security;
create or replace function orbit_private.protect_events() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_schema='orbit_private' and tg_table_name='events' and tg_op='DELETE' then
  if current_setting('orbit.purge_task',true)=old.task_id::text then return old; end if;
 end if;
 raise exception 'Audit events cannot be updated or deleted';
end; $$;
drop trigger if exists lifecycle_immutable on orbit_private.task_lifecycle_events;
create trigger lifecycle_immutable before update or delete on orbit_private.task_lifecycle_events for each row execute function orbit_private.protect_events();
create or replace function public.orbit_api(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t orbit_private.tasks; result jsonb; new_status text; reason text; note text;
begin
 if action='list' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) into result from orbit_private.tasks x where x.deleted_at is null; return result;
 elsif action='create' then
  if coalesce(btrim(payload->>'title'),'')='' or coalesce(btrim(payload->>'requester'),'')='' or coalesce(payload->>'requested_at','')='' then raise sqlstate 'PT400' using message='제목, 요청자, 요청 시각이 필요합니다.'; end if;
  insert into orbit_private.tasks(title,requester,department,channel,category,priority,requested_at,due_date,description)
  values(payload->>'title',payload->>'requester',coalesce(payload->>'department',''),coalesce(payload->>'channel',''),coalesce(payload->>'category',''),coalesce(payload->>'priority','보통'),(payload->>'requested_at')::timestamptz,coalesce(payload->>'due_date',''),coalesce(payload->>'description','')) returning * into t;
  insert into orbit_private.events(task_id,kind,detail) values(t.id,'등록',payload::text);
  return jsonb_build_object('id',t.id);
 end if;
 if action not in ('detail','status','note') then raise sqlstate 'PT400' using message='지원하지 않는 작업입니다.'; end if;
 select * into t from orbit_private.tasks where id=(payload->>'id')::uuid for update;
 if not found then
  if action='detail' then return null; end if;
  raise sqlstate 'PT404' using message='업무를 찾을 수 없습니다.';
 end if;
 if t.deleted_at is not null and (action<>'detail' or coalesce((payload->>'include_deleted')::boolean,false)=false) then raise sqlstate 'PT404' using message='업무를 찾을 수 없습니다.'; end if;
 if action='detail' then
  select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]'::jsonb) into result from orbit_private.events e where e.task_id=t.id;
  return to_jsonb(t)||jsonb_build_object('events',result);
 elsif action='status' then
  new_status:=payload->>'status'; reason:=btrim(coalesce(payload->>'reason',''));
  if new_status is null or new_status not in ('접수','진행 중','대기','완료') then raise sqlstate 'PT400' using message='올바른 상태를 선택하세요.'; end if;
  if new_status=t.status then return jsonb_build_object('ok',true); end if;
  if t.status='완료' and reason='' then raise sqlstate 'PT400' using message='완료 업무를 재개하는 사유를 입력하세요.'; end if;
  update orbit_private.tasks set status=new_status,updated_at=clock_timestamp(),completed_at=case when new_status='완료' then clock_timestamp() else null end where id=t.id;
  insert into orbit_private.events(task_id,kind,detail) values(t.id,'상태 변경',t.status||' → '||new_status||case when reason<>'' then ' · '||reason else '' end);
 elsif action='note' then
  note:=btrim(coalesce(payload->>'note','')); if note='' or length(note)>10000 then raise sqlstate 'PT400' using message='메모를 1~10000자로 입력하세요.'; end if;
  insert into orbit_private.events(task_id,kind,detail) values(t.id,'처리 메모',note);
 end if;
 return jsonb_build_object('ok',true);
 exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
  raise sqlstate 'PT400' using message='식별자 또는 시각 형식을 확인하세요.';
end; $$;
revoke all on function public.orbit_api(text,jsonb) from public,anon,authenticated;
grant execute on function public.orbit_api(text,jsonb) to service_role;

create or replace function public.orbit_lifecycle(action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t orbit_private.tasks; result jsonb; reason text; previous_setting text;
begin
 if action='trash' then select coalesce(jsonb_agg(to_jsonb(x) order by x.deleted_at desc),'[]'::jsonb) into result from orbit_private.tasks x where x.deleted_at is not null;return result; end if;
 if action='history' then select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc),'[]'::jsonb) into result from (select * from orbit_private.task_lifecycle_events order by id desc limit 100) x;return result; end if;
 if action not in ('delete','restore','purge') then raise sqlstate 'PT400' using message='지원하지 않는 작업입니다.';end if;
 reason:=btrim(coalesce(payload->>'reason',''));if reason='' or length(reason)>1000 then raise sqlstate 'PT400' using message='사유를 1~1000자로 입력하세요.';end if;
 select * into t from orbit_private.tasks where id=(payload->>'id')::uuid for update;
 if not found then raise sqlstate 'PT404' using message='업무를 찾을 수 없습니다.';end if;
 if action='delete' and t.deleted_at is not null then raise sqlstate 'PT409' using message='이미 휴지통에 있는 업무입니다.';end if;
 if action<>'delete' and t.deleted_at is null then raise sqlstate 'PT409' using message='휴지통의 업무만 복원·영구 삭제할 수 있습니다.';end if;
 if action='purge' and coalesce(payload->>'confirmation','')<>t.title then raise sqlstate 'PT400' using message='업무 제목을 정확히 입력하세요.';end if;
 insert into orbit_private.task_lifecycle_events(task_id,action,reason) values(t.id,action,reason);
 if action='purge' then
  previous_setting:=current_setting('orbit.purge_task',true);
  perform set_config('orbit.purge_task',t.id::text,true);
  delete from orbit_private.events where task_id=t.id;
  delete from orbit_private.tasks where id=t.id;
  perform set_config('orbit.purge_task',coalesce(previous_setting,''),true);
 else
  update orbit_private.tasks set deleted_at=case when action='delete' then clock_timestamp() else null end,updated_at=clock_timestamp() where id=t.id;
  insert into orbit_private.events(task_id,actor,kind,detail) values(t.id,'admin',case when action='delete' then '업무 삭제' else '업무 복원' end,reason);
 end if;
 return jsonb_build_object('ok',true);
 exception when invalid_text_representation then raise sqlstate 'PT400' using message='업무 식별자를 확인하세요.';
end; $$;
revoke all on function public.orbit_lifecycle(text,jsonb) from public,anon,authenticated;
grant execute on function public.orbit_lifecycle(text,jsonb) to service_role;


-- kpi.sql

create table if not exists orbit_private.task_extras(task_id uuid primary key references orbit_private.tasks(id) on delete cascade,assignee text not null default '',assigned_at timestamptz,is_test boolean not null default false);
create table if not exists orbit_private.task_files(id uuid primary key default gen_random_uuid(),task_id uuid not null references orbit_private.tasks(id) on delete cascade,name text not null,type text not null,size integer not null,content text not null,created_at timestamptz not null default clock_timestamp());
create table if not exists orbit_private.improvements(id uuid primary key default gen_random_uuid(),value jsonb not null,revision integer not null default 1,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp());
create table if not exists orbit_private.improvement_events(id bigint generated always as identity primary key,improvement_id uuid not null references orbit_private.improvements(id),at timestamptz not null default clock_timestamp(),actor text not null default 'admin',before_value jsonb not null,after_value jsonb not null);
create table if not exists orbit_private.monthly_reports(id uuid primary key default gen_random_uuid(),month text not null,created_at timestamptz not null default clock_timestamp(),actor text not null default 'admin',value jsonb not null);
alter table orbit_private.task_extras enable row level security;
alter table orbit_private.task_files enable row level security;
alter table orbit_private.improvements enable row level security;
alter table orbit_private.improvement_events enable row level security;
alter table orbit_private.monthly_reports enable row level security;
drop trigger if exists improvement_audit on orbit_private.improvement_events;
create trigger improvement_audit before update or delete on orbit_private.improvement_events for each row execute function orbit_private.protect_events();
drop trigger if exists report_immutable on orbit_private.monthly_reports;
create trigger report_immutable before update or delete on orbit_private.monthly_reports for each row execute function orbit_private.protect_events();

create or replace function public.orbit_kpi(action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t orbit_private.tasks; result jsonb; old orbit_private.improvements; file orbit_private.task_files; ident uuid; who text;
begin
 if action='extras' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from orbit_private.task_extras x;return result;end if;
 if action='improvements' then select coalesce(jsonb_agg(x.value||jsonb_build_object('id',x.id,'revision',x.revision,'created_at',x.created_at,'updated_at',x.updated_at) order by x.updated_at desc),'[]'::jsonb) into result from orbit_private.improvements x;return result;end if;
 if action='improvement_history' then select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'at',x.at,'actor',x.actor,'before',x.before_value,'after',x.after_value) order by x.id),'[]'::jsonb) into result from orbit_private.improvement_events x where improvement_id=(payload->>'id')::uuid;return result;end if;
 if action='improvement_save' then
  if coalesce(btrim(payload->'value'->>'title'),'')='' or coalesce(btrim(payload->'value'->>'feedback'),'')='' then raise sqlstate 'PT400' using message='개선 제목과 피드백이 필요합니다.';end if;
  if coalesce(payload->>'id','')<>'' then select * into old from orbit_private.improvements where id=(payload->>'id')::uuid for update;if not found then raise sqlstate 'PT404' using message='개선 항목을 찾을 수 없습니다.';end if;if old.revision<>(payload->>'revision')::integer then raise sqlstate 'PT409' using message='다른 화면에서 수정됐습니다. 다시 불러오세요.';end if;ident:=old.id;update orbit_private.improvements set value=payload->'value',revision=revision+1,updated_at=clock_timestamp() where id=ident;
  else insert into orbit_private.improvements(value) values(payload->'value') returning id into ident;end if;
  insert into orbit_private.improvement_events(improvement_id,before_value,after_value) values(ident,coalesce(old.value,'{}'::jsonb),payload->'value');return jsonb_build_object('id',ident);
 end if;
 if action='reports' then select coalesce(jsonb_agg(x.value||jsonb_build_object('id',x.id,'month',x.month,'actor',x.actor,'created_at',x.created_at) order by x.created_at desc),'[]'::jsonb) into result from orbit_private.monthly_reports x;return result;end if;
 if action='report_save' then insert into orbit_private.monthly_reports(month,value) values(payload->>'month',payload->'value') returning id into ident;return jsonb_build_object('id',ident);end if;
 if action not in ('detail','assign','mark_test','file_add','file_get','file_delete') then raise sqlstate 'PT400' using message='지원하지 않는 KPI 작업입니다.';end if;
 select * into t from orbit_private.tasks where id=(payload->>'id')::uuid and deleted_at is null for update;
 if not found then raise sqlstate 'PT404' using message='업무를 찾을 수 없습니다.';end if;
 if action='detail' then
  select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'type',x.type,'size',x.size,'created_at',x.created_at) order by x.created_at),'[]'::jsonb) into result from orbit_private.task_files x where task_id=t.id;
  return coalesce((select to_jsonb(x) from orbit_private.task_extras x where x.task_id=t.id),'{}'::jsonb)||jsonb_build_object('files',result,'available',true);
 elsif action='mark_test' then
  insert into orbit_private.task_extras(task_id,is_test) values(t.id,(payload->>'is_test')::boolean) on conflict(task_id) do update set is_test=excluded.is_test;
  insert into orbit_private.events(task_id,actor,kind,detail) values(t.id,'admin','데이터 구분 변경',case when (payload->>'is_test')::boolean then '테스트 업무 · 지표 제외' else '실제 업무 · 지표 포함' end);
 elsif action='assign' then
  who:=btrim(coalesce(payload->>'assignee',''));if who='' or length(who)>100 then raise sqlstate 'PT400' using message='담당자를 1~100자로 입력하세요.';end if;
  insert into orbit_private.task_extras(task_id,assignee,assigned_at) values(t.id,who,clock_timestamp()) on conflict(task_id) do update set assignee=excluded.assignee,assigned_at=coalesce(orbit_private.task_extras.assigned_at,excluded.assigned_at);
  insert into orbit_private.events(task_id,actor,kind,detail) values(t.id,'admin','담당자 배정',who);
 elsif action='file_add' then
  if (select count(*) from orbit_private.task_files where task_id=t.id)>=10 then raise sqlstate 'PT400' using message='업무당 첨부파일은 10개까지 가능합니다.';end if;
  if (payload->>'size')::integer>1048576 or (payload->>'size')::integer<1 then raise sqlstate 'PT400' using message='첨부파일은 1MB 이하여야 합니다.';end if;
  insert into orbit_private.task_files(task_id,name,type,size,content) values(t.id,payload->>'name',payload->>'type',(payload->>'size')::integer,payload->>'content') returning id into ident;
  insert into orbit_private.events(task_id,actor,kind,detail) values(t.id,'admin','첨부파일 등록',payload->>'name');return jsonb_build_object('id',ident);
 else
  select * into file from orbit_private.task_files where task_id=t.id and id=(payload->>'file_id')::uuid;
  if not found then raise sqlstate 'PT404' using message='파일을 찾을 수 없습니다.';end if;
  if action='file_get' then return to_jsonb(file);end if;
  delete from orbit_private.task_files where id=file.id;
  insert into orbit_private.events(task_id,actor,kind,detail) values(t.id,'admin','첨부파일 삭제',file.name);
 end if;
 return jsonb_build_object('ok',true);
exception when invalid_text_representation then raise sqlstate 'PT400' using message='입력 형식을 확인하세요.';
end; $$;
revoke all on function public.orbit_kpi(text,jsonb) from public,anon,authenticated;
grant execute on function public.orbit_kpi(text,jsonb) to service_role;

commit;
