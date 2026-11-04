begin;
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
commit;
