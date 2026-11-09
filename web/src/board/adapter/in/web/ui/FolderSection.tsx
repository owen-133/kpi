'use client';

import type { BoardTask } from '../../../../domain/BoardTask.ts';
import { isUrgent, representativeState, splitCompleted, type TaskGroup } from '../../../../domain/groupTasks.ts';
import { taskState } from '../../../../domain/taskStatus.ts';
import { collapsedSummary, groupSummary } from './boardLabels.ts';
import styles from './board.module.css';
import { ChevronIcon, FolderIcon } from './icons.tsx';
import { TaskRow } from './TaskRow.tsx';

type Props = {
  group: TaskGroup;
  now: string;
  compact: boolean;
  collapsed: boolean;
  historyOpen: boolean;
  onToggle: () => void;
  onToggleHistory: () => void;
  onOpen: (id: string) => void;
};

// One group: a header that folds it, the open tasks, and a switch for the completed history.
export function FolderSection(p: Props) {
  const { group } = p;
  const first: BoardTask | undefined = group.tasks[0];
  const state = representativeState(group);
  const { open, completed } = splitCompleted(group);
  return (
    <div className={`${styles.card} ${styles[state]} ${isUrgent(group) ? styles.urgent : ''}`}>
      <button className={styles.cardHeader} aria-expanded={!p.collapsed} onClick={p.onToggle}>
        <span className={styles.chevron}>
          <ChevronIcon open={!p.collapsed} />
        </span>
        <span className={styles.folder}>
          <FolderIcon />
        </span>
        <span className={styles.cardTitles}>
          <span className={styles.cardName}>{group.name}</span>
          <span className={styles.cardSub}>{p.collapsed && first !== undefined ? collapsedSummary(first) : groupSummary(group)}</span>
        </span>
        {' '}
        <span className={styles.chips}>
          {group.statusCounts.map((entry) => (
            <span key={entry.status} className={`${styles.chip} ${styles[taskState(entry.status)]}`}>
              <i />
              {entry.count}
            </span>
          ))}
        </span>
      </button>
      {p.collapsed ? null : p.compact ? (
        <div className={styles.rows}>
          {group.tasks.map((task) => (
            <TaskRow key={task.id} task={task} now={p.now} compact onOpen={p.onOpen} />
          ))}
        </div>
      ) : (
        <div className={styles.rows}>
          {open.map((task) => (
            <TaskRow key={task.id} task={task} now={p.now} compact={false} onOpen={p.onOpen} />
          ))}
          {completed.length > 0 ? (
            <>
              <button className={styles.history} aria-expanded={p.historyOpen} onClick={p.onToggleHistory}>
                <span>{`${p.historyOpen ? '▾' : '▸'} 완료 업무 ${completed.length}건`}</span>
                <span>이력 보기</span>
              </button>
              {p.historyOpen
                ? completed.map((task) => <TaskRow key={task.id} task={task} now={p.now} compact={false} onOpen={p.onOpen} />)
                : null}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
