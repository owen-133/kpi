'use client';

import { useReducer } from 'react';
import { buildTasksCsv, tasksCsvFilename } from '../../../../../request/adapter/in/web/ui/tasksCsv.ts';
import { browserDownloadPort, downloadBlob } from '../../../../../shared/adapter/in/web/ui/download.ts';
import { todayKst } from '../../../../../shared/adapter/in/web/ui/format.ts';
import { usePortal } from '../../../../../portal/adapter/in/web/ui/PortalContext.tsx';
import { countByStatus } from '../../../../domain/statusCounts.ts';
import { emptyMessage, summaryLine } from './boardLabels.ts';
import { boardReducer, groupKey, initialBoardState, visibleGroups } from './boardState.ts';
import { BoardToolbar } from './BoardToolbar.tsx';
import { GroupCard } from './GroupCard.tsx';
import styles from './board.module.css';

const LOCAL_MODE_NOTICE = '로컬 개발 모드입니다. 팀장과 공유하기 전 관리자·조회 계정 비밀번호와 HTTPS를 설정해 주세요.';
const ADMIN_BADGE = '업무 관리';
const VIEWER_BADGE = '조회 전용';
const CSV_TYPE = 'text/csv;charset=utf-8';

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

// The business board: status buttons, search, grouping and date range over the shared task list.
export function BoardView() {
  const { tasks, session, texts, actions } = usePortal();
  const [state, dispatch] = useReducer(boardReducer, undefined, () => initialBoardState(new Date().toISOString()));
  const groups = visibleGroups(tasks, state);
  const taskCount = groups.reduce((sum, group) => sum + group.totalCount, 0);
  const line = summaryLine(groups.length, taskCount, state.groupBy, state.dateField);
  const message = emptyMessage(tasks.length, session.role, texts.newTaskLabel ?? '새 업무 등록');

  const open = (id: string): void => {
    actions.openDetail(id).catch((error: unknown) => actions.toast(messageOf(error)));
  };
  const exportCsv = (): void => {
    downloadBlob(browserDownloadPort(), tasksCsvFilename(todayKst()), new Blob([buildTasksCsv(tasks)], { type: CSV_TYPE }));
  };
  const refresh = (): void => {
    actions
      .reloadTasksQuietly()
      .then(() => dispatch({ type: 'clock', now: new Date().toISOString() }))
      .catch((error: unknown) => actions.toast(messageOf(error)));
  };

  return (
    <>
      {session.shared ? null : <div className="notice">{LOCAL_MODE_NOTICE}</div>}
      <section className={styles.board} aria-label="총무 업무 카드 보드">
        <div className={styles.head}>
          <div>
            <p className={styles.eyebrow}>{texts.cardEyebrow}</p>
            <h2 className={styles.title}>{texts.cardTitle}</h2>
            <span className={styles.lead}>{texts.cardDescription}</span>
          </div>
          <span className={styles.role}>{session.role === 'viewer' ? VIEWER_BADGE : ADMIN_BADGE}</span>
        </div>
        <BoardToolbar state={state} counts={countByStatus(tasks)} dispatch={dispatch} onExport={exportCsv} onRefresh={refresh} />
        <div className={styles.summary}>
          <span>{line.counts}</span>
          <small>{line.order}</small>
        </div>
        {groups.length === 0 ? (
          <div className={styles.empty}>
            <strong>{message.title}</strong>
            <p>{message.body}</p>
          </div>
        ) : (
          groups.map((group) => {
            const key = groupKey(state.groupBy, group.name);
            return (
              <GroupCard
                key={key}
                group={group}
                now={state.now}
                compact={state.compact}
                collapsed={state.collapsed.includes(key)}
                historyOpen={state.historyOpen.includes(key)}
                onToggle={() => dispatch({ type: 'toggleGroup', key })}
                onToggleHistory={() => dispatch({ type: 'toggleHistory', key })}
                onOpen={open}
              />
            );
          })
        )}
      </section>
    </>
  );
}
