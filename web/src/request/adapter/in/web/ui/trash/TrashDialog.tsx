'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePortal } from '../../../../../../portal/adapter/in/web/ui/PortalContext.tsx';
import { queryKeys } from '../../../../../../portal/adapter/in/web/ui/queryKeys.ts';
import { formatDateTime } from '../../../../../../shared/adapter/in/web/ui/format.ts';
import type { LifecycleEventView, TaskSummary } from '../RequestApi.ts';
import { loadTrash, openDeletedTask, runTrashAction, showDeletionHistory, type TrashDeps, type TrashReads } from './trashFlow.ts';

const ACTION_LABEL: Record<string, string> = { delete: '휴지통 이동', restore: '복원', purge: '영구 삭제' };

type Busy = { id: string; kind: 'restore' | 'purge' } | null;

/** The body of #trash-dialog (legacy openTrash). The shell mounts it anew at every open, so the list is read at every open. */
export function TrashDialog() {
  const { apis, actions } = usePortal();
  const queryClient = useQueryClient();
  const [list, setList] = useState<TaskSummary[] | null>(null);
  const [history, setHistory] = useState<LifecycleEventView[] | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const alive = useRef(true);

  const reads = useMemo<TrashReads>(
    () => ({
      trash: () => queryClient.fetchQuery({ queryKey: queryKeys.trash, queryFn: () => apis.request.listTrash(), staleTime: 0 }),
      history: () => queryClient.fetchQuery({ queryKey: queryKeys.lifecycleHistory, queryFn: () => apis.request.lifecycleHistory(), staleTime: 0 }),
    }),
    [queryClient, apis],
  );

  useEffect(() => {
    alive.current = true;
    void loadTrash(reads, actions).then((found) => {
      if (alive.current && found !== null) setList(found);
    });
    return () => {
      alive.current = false;
    };
  }, [reads, actions]);

  const act = (kind: 'restore' | 'purge', task: TaskSummary) => {
    const deps: TrashDeps = {
      api: apis.request,
      reads,
      actions,
      prompt: (message, defaultValue) => (defaultValue === undefined ? window.prompt(message) : window.prompt(message, defaultValue)),
      setBusy: (on) => {
        if (alive.current) setBusy(on ? { id: task.id, kind } : null);
      },
      show: (fresh) => {
        if (!alive.current) return;
        setList(fresh);
        setHistory(null);
        setBusy(null);
      },
    };
    void runTrashAction(kind, task, deps);
  };

  const showHistory = () => {
    void showDeletionHistory(reads, actions).then((events) => {
      if (alive.current && events !== null) setHistory(events);
    });
  };

  if (list === null) return null;
  return (
    <>
      <div className="dialog-head">
        <div>
          <p className="eyebrow">ADMIN TRASH</p>
          <h2>관리자 휴지통</h2>
        </div>
        <button type="button" className="close" data-close="trash-dialog" aria-label="닫기" onClick={() => actions.close('trash')}>
          ×
        </button>
      </div>
      <p className="muted tiny">
        삭제 업무는 목록·실적·CSV에서 제외됩니다. 복원하면 이전 상태와 이력이 돌아옵니다. 영구 삭제는 업무 내용과 처리 이력을 지우며 복구할 수 없습니다. 삭제 사실·시각·계정·사유의 최소 기록은 남습니다.
      </p>
      <div className="trash-list">
        {list.length ? (
          list.map((t) => (
            <article className="trash-row" key={t.id}>
              <button className="task-open" data-trash-detail={t.id} onClick={() => void openDeletedTask(actions, t.id)}>
                <strong>{t.title}</strong>
                <small>{`${t.requester} · ${t.status} · 삭제 ${formatDateTime(t.deleted_at)}`}</small>
              </button>
              <div className="trash-actions">
                <button className="secondary" data-restore={t.id} disabled={busy?.id === t.id && busy.kind === 'restore'} onClick={() => act('restore', t)}>
                  복원
                </button>
                <button className="danger" data-purge={t.id} disabled={busy?.id === t.id && busy.kind === 'purge'} onClick={() => act('purge', t)}>
                  영구 삭제
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="empty">휴지통이 비어 있습니다.</p>
        )}
      </div>
      <button type="button" className="text-button" id="deletion-history" onClick={showHistory}>
        삭제·복원 이력 보기
      </button>
      <div id="deletion-history-content">
        {history === null ? null : (
          <>
            <h3>최근 삭제·복원 이력</h3>
            {history.length ? (
              history.map((e, index) => (
                <div className="event" key={e.id ?? index}>
                  <small>{`${formatDateTime(e.at)} · ${e.actor}`}</small>
                  <strong>{`${ACTION_LABEL[e.action] ?? ''} · ${e.task_id.slice(0, 8)}`}</strong>
                  <p>{e.reason}</p>
                </div>
              ))
            ) : (
              <p className="muted">삭제 이력이 없습니다.</p>
            )}
          </>
        )}
      </div>
    </>
  );
}
