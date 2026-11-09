'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { usePortal } from '../../../../../../portal/adapter/in/web/ui/PortalContext.tsx';
import { queryKeys } from '../../../../../../portal/adapter/in/web/ui/queryKeys.ts';
import type { TaskDetailView } from '../RequestApi.ts';
import { editFormModel, loadEditTask, saveEdit, type EditDeps, type SelectOption } from './editFlow.ts';

type TextField = 'title' | 'requester' | 'department' | 'due_date';

function TextInput(p: { name: TextField | 'requested_at'; label: string; required?: boolean; type?: string; value: string }) {
  return (
    <label>
      {p.label + (p.required ? ' *' : '')}
      <input name={p.name} type={p.type ?? 'text'} defaultValue={p.value} required={p.required} maxLength={p.name === 'title' ? 200 : 100} />
    </label>
  );
}

function Select(p: { name: string; label: string; options: readonly SelectOption[]; current: string | null | undefined }) {
  return (
    <label>
      {p.label}
      <select name={p.name} defaultValue={p.current ?? undefined}>
        {p.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * The body of #edit-task-dialog (legacy editTask). The detail dialog has just read the task into ['task', id]; the edit
 * form takes that held copy and reads only when it is opened without one (the legacy editor never read).
 */
export function EditTaskDialog() {
  const { state, values, apis, actions } = usePortal();
  const queryClient = useQueryClient();
  const taskId = state.dialogs.edit.taskId;
  const [task, setTask] = useState<TaskDetailView | null>(() => (taskId === undefined ? null : (queryClient.getQueryData<TaskDetailView>(queryKeys.task(taskId)) ?? null)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    if (task === null && taskId !== undefined) {
      const read = () => queryClient.fetchQuery({ queryKey: queryKeys.task(taskId), queryFn: () => apis.request.getTask(taskId) });
      void loadEditTask(read, actions).then((found) => {
        if (alive.current && found !== null) setTask(found);
      });
    }
    return () => {
      alive.current = false;
    };
  }, [task, taskId, queryClient, apis, actions]);

  useEffect(() => {
    if (error !== null) errorRef.current?.scrollIntoView({ block: 'nearest' });
  }, [error]);

  const model = useMemo(() => (task === null ? null : editFormModel(task, values)), [task, values]);

  if (task === null || model === null) return null;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields: Record<string, string> = {};
    for (const [name, value] of new FormData(event.currentTarget)) fields[name] = String(value);
    const deps: EditDeps = {
      api: apis.request,
      actions,
      setBusy: (on) => {
        if (alive.current) setBusy(on);
      },
      showError: (message) => {
        if (alive.current) setError(message);
      },
    };
    void saveEdit(task, fields, deps);
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="dialog-head">
        <div>
          <p className="eyebrow">EDIT REQUEST</p>
          <h2>업무 정보 수정</h2>
        </div>
        <button type="button" className="close" data-close="edit-task-dialog" aria-label="닫기" onClick={() => actions.close('edit')}>
          ×
        </button>
      </div>
      <p className="muted tiny">등록 시각·상태·완료 시각·배정·첨부는 유지됩니다. 변경한 항목과 수정 사유를 이력에 기록합니다. 기한·요청 시각 변경은 현재 지표에 반영되며 이미 발행한 보고서는 유지됩니다.</p>
      <TextInput name="title" label="업무명" required value={task.title || ''} />
      <div className="form-grid">
        <TextInput name="requester" label="요청자" required value={task.requester || ''} />
        <TextInput name="department" label="부서" value={task.department || ''} />
        <Select name="channel" label="접수 경로" options={model.channels} current={task.channel} />
        <Select name="category" label="업무 분류" options={model.categories} current={task.category} />
        <Select name="priority" label="중요도" options={model.priorities} current={task.priority} />
        <TextInput name="requested_at" label="요청일" required type="date" value={model.requestedDay} />
        <TextInput name="due_date" label="처리 기한" type="date" value={task.due_date || ''} />
      </div>
      <label>
        상세내용
        <textarea name="description" rows={5} maxLength={10000} defaultValue={task.description ?? ''} />
      </label>
      <label>
        수정 사유 *
        <textarea name="reason" rows={2} maxLength={1000} required placeholder="예: 요청자 오기 정정, 협의에 따른 기한 변경" />
      </label>
      <p id="edit-task-error" className="notice" role="alert" hidden={error === null} ref={errorRef}>
        {error}
      </p>
      <div className="dialog-actions">
        <button type="button" className="secondary" data-close="edit-task-dialog" onClick={() => actions.close('edit')}>
          취소
        </button>
        <button type="submit" className="primary" disabled={busy}>
          수정 저장
        </button>
      </div>
    </form>
  );
}
