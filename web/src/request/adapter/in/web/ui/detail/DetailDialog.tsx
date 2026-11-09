'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { AssignmentSection } from '../../../../../../assignment/adapter/in/web/ui/AssignmentSection.tsx';
import { AttachmentSection } from '../../../../../../attachment/adapter/in/web/ui/AttachmentSection.tsx';
import { usePortal } from '../../../../../../portal/adapter/in/web/ui/PortalContext.tsx';
import { queryKeys } from '../../../../../../portal/adapter/in/web/ui/queryKeys.ts';
import { eventText, formatDateTime } from '../../../../../../shared/adapter/in/web/ui/format.ts';
import type { StatusChangeBody, TaskDetailView } from '../RequestApi.ts';
import { deleteTask, editTask, readDetail, recordNote, recordStatus, type DetailDeps } from './detailFlow.ts';
import { badgeClass, detailMeta, extensionKind, isEditable, STATUSES, timelineEvents } from './detailModel.ts';

/**
 * The body of #detail-dialog (legacy `detail`). `actions.openDetail` reads the task anew into the cache and opens the
 * dialog; this body draws what it finds there, and a later `openDetail` (after a memo, assignment, file ...) mounts it anew.
 */
export function DetailDialog() {
  const { apis, actions, session, state } = usePortal();
  const queryClient = useQueryClient();
  const taskId = state.dialogs.detail.taskId;
  const [task, setTask] = useState<TaskDetailView | null>(() =>
    taskId === undefined ? null : (queryClient.getQueryData<TaskDetailView>(queryKeys.task(taskId)) ?? null),
  );
  const [busy, setBusy] = useState<'status' | 'note' | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    // Opened without a read (cache emptied): read here, a failure closes the dialog.
    if (task === null && taskId !== undefined) {
      void readDetail(() => queryClient.fetchQuery({ queryKey: queryKeys.task(taskId), queryFn: () => apis.request.getTask(taskId), staleTime: 0 }), actions).then(
        (found) => {
          if (alive.current && found !== null) setTask(found);
        },
      );
    }
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount: the shell mounts a new body at every open
  }, []);

  if (task === null) return <div id="detail-content" />;

  const editable = isEditable(session.role, task);
  const reload = () => actions.openDetail(task.id);
  const deps = (which: 'status' | 'note'): DetailDeps => ({
    api: apis.request,
    actions,
    prompt: (message, defaultValue) => (defaultValue === undefined ? window.prompt(message) : window.prompt(message, defaultValue)),
    setBusy: (on) => {
      if (alive.current) setBusy(on ? which : null);
    },
  });
  const extensions = extensionKind(task);
  const kpi = task.kpi;
  return (
    <div id="detail-content">
      <div className="dialog-head">
        <div>
          <p className="eyebrow">REQUEST DETAIL</p>
          <h2>{task.title}</h2>
        </div>
        <button className="close" data-close="detail-dialog" aria-label="닫기" onClick={() => actions.close('detail')}>
          ×
        </button>
      </div>
      {editable ? (
        <div className="dialog-actions">
          <button type="button" className="secondary" id="edit-task" onClick={() => editTask(task.id, actions)}>
            업무 수정
          </button>
        </div>
      ) : null}
      <div className="detail-meta">
        {detailMeta(task).map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            {value}
          </div>
        ))}
      </div>
      <p className="description">{task.description || '등록된 상세 내용이 없습니다.'}</p>
      {editable ? (
        <>
          <form
            id="status-form"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const values: StatusChangeBody = data.has('reason')
                ? { status: String(data.get('status')), reason: String(data.get('reason')) }
                : { status: String(data.get('status')) };
              void recordStatus(task.id, values, deps('status'));
            }}
          >
            <div className="state-actions">
              <select name="status" aria-label="업무 상태" defaultValue={task.status}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <button className="primary" disabled={busy === 'status'}>
                상태 변경
              </button>
            </div>
            {task.status === '완료' ? <input name="reason" placeholder="재개 시 사유를 입력하세요" maxLength={1000} aria-label="업무 재개 사유" /> : null}
          </form>
          <hr className="divider" />
          <form
            id="note-form"
            onSubmit={(event) => {
              event.preventDefault();
              void recordNote(task.id, String(new FormData(event.currentTarget).get('note')), deps('note'));
            }}
          >
            <label>
              처리 메모
              <textarea name="note" required maxLength={10000} rows={3} placeholder="진행 내용이나 처리 결과를 남겨 주세요." />
            </label>
            <div className="dialog-actions">
              <button className="secondary" disabled={busy === 'note'}>
                메모 남기기
              </button>
            </div>
          </form>
        </>
      ) : (
        <p>
          <span className={badgeClass(task.status)}>{task.status}</span>
        </p>
      )}
      {editable ? (
        <div className="dialog-actions">
          <button type="button" className="danger" id="delete-task" onClick={() => void deleteTask(task.id, deps('status'))}>
            업무 삭제
          </button>
        </div>
      ) : null}
      <div id="task-extensions">
        {extensions === 'deleted' ? (
          <p className="muted tiny">휴지통에서는 배정·첨부파일을 변경할 수 없습니다.</p>
        ) : extensions === 'unavailable' ? (
          <div className="notice">{kpi?.message || 'KPI 기능 DB 초기화가 필요합니다.'}</div>
        ) : (
          <>
            <hr className="divider" />
            <h3>담당자 · 첨부파일</h3>
            <AssignmentSection
              taskId={task.id}
              data={{ isTest: Boolean(kpi?.is_test), assignedAt: kpi?.assigned_at, assignee: kpi?.assignee }}
              editable={session.role === 'admin'}
              reload={reload}
            />
            <AttachmentSection taskId={task.id} files={kpi?.files ?? []} editable={session.role === 'admin'} reload={reload} />
          </>
        )}
      </div>
      <hr className="divider" />
      <h3>업무 이력</h3>
      <p className="muted tiny">등록 및 변경 시각은 서버에서 자동 기록합니다.</p>
      <div className="timeline">
        {timelineEvents(task.events).map((e, index) => (
          <div className="event" key={e.id ?? index}>
            <small>{`${formatDateTime(e.at)} · ${e.actor}`}</small>
            <strong>{e.kind}</strong>
            <p>{eventText(e)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
