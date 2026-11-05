begin;
alter table orbit_private.tasks add column if not exists edit_revision integer not null default 0;
create or replace function public.orbit_edit_task(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t orbit_private.tasks; v jsonb; changes jsonb:='{}'::jsonb; k text; previous jsonb; reason text;
begin
 select * into t from orbit_private.tasks where id=(payload->>'id')::uuid for update;
 if not found then raise sqlstate 'PT404' using message='업무를 찾을 수 없습니다.';end if;
 if t.deleted_at is not null then raise sqlstate 'PT409' using message='휴지통의 업무는 복원 후 수정하세요.';end if;
 if t.edit_revision is distinct from (payload->>'revision')::integer then raise sqlstate 'PT409' using message='다른 화면에서 업무가 수정됐습니다. 상세를 다시 열어 확인하세요.';end if;
 v:=payload->'values';reason:=btrim(coalesce(payload->>'reason',''));
 if reason='' or length(reason)>1000 then raise sqlstate 'PT400' using message='수정 사유를 1~1000자로 입력하세요.';end if;
 if coalesce(btrim(v->>'title'),'')='' or coalesce(btrim(v->>'requester'),'')='' or coalesce(v->>'requested_at','')='' then raise sqlstate 'PT400' using message='업무명, 요청자, 요청 시각이 필요합니다.';end if;
 if t.status='완료' and (v->>'requested_at')::timestamptz>t.completed_at then raise sqlstate 'PT400' using message='요청 시각은 완료 시각보다 늦을 수 없습니다.';end if;
 previous:=to_jsonb(t);
 foreach k in array array['title','requester','department','channel','category','priority','requested_at','due_date','description'] loop
  if k='requested_at' then
   if (v->>k)::timestamptz<>t.requested_at then changes:=changes||jsonb_build_object(k,jsonb_build_object('before',previous->k,'after',v->k));end if;
  elsif previous->>k is distinct from v->>k then changes:=changes||jsonb_build_object(k,jsonb_build_object('before',previous->k,'after',v->k));end if;
 end loop;
 if changes='{}'::jsonb then return jsonb_build_object('ok',true,'unchanged',true);end if;
 update orbit_private.tasks set title=v->>'title',requester=v->>'requester',department=v->>'department',channel=v->>'channel',category=v->>'category',priority=v->>'priority',requested_at=(v->>'requested_at')::timestamptz,due_date=v->>'due_date',description=v->>'description',updated_at=clock_timestamp(),edit_revision=edit_revision+1 where id=t.id;
 insert into orbit_private.events(task_id,actor,kind,detail) values(t.id,'admin','업무 정보 수정',jsonb_build_object('reason',reason,'changes',changes)::text);
 return jsonb_build_object('ok',true,'revision',t.edit_revision+1);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then raise sqlstate 'PT400' using message='업무 식별자 또는 시각을 확인하세요.';
end; $$;
revoke all on function public.orbit_edit_task(jsonb) from public,anon,authenticated;
grant execute on function public.orbit_edit_task(jsonb) to service_role;
commit;
