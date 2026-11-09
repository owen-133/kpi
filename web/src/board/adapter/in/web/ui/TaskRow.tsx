'use client';

import type { BoardTask } from '../../../../domain/BoardTask.ts';
import { taskState } from '../../../../domain/taskStatus.ts';
import { displayTitle, dueLabel } from '../../../../domain/taskLabels.ts';
import { isOverdue, receiptText, rowMeta, rowStatus } from './boardLabels.ts';
import styles from './board.module.css';
import { StateIcon } from './icons.tsx';

// One task as a button that opens its detail. The compact form is the title alone.
export function TaskRow(p: { task: BoardTask; now: string; compact: boolean; onOpen: (id: string) => void }) {
  const { task } = p;
  const state = taskState(task.status);
  if (p.compact) {
    return (
      <button className={`${styles.compactRow} ${styles[state]}`} onClick={() => p.onOpen(task.id)}>
        {task.title}
      </button>
    );
  }
  const receipt = receiptText(task, p.now);
  return (
    <button className={`${styles.row} ${styles[state]}`} onClick={() => p.onOpen(task.id)}>
      <span className={styles.rowIcon}>
        <StateIcon state={state} />
      </span>
      <span className={styles.rowMain}>
        <strong>{displayTitle(task)}</strong>
        <span className={styles.rowMeta}>{rowMeta(task)}</span>
      </span>
      <span className={styles.rowSide}>
        <span className={styles.rowStatus}>{rowStatus(task)}</span>
        <small className={isOverdue(task, p.now) ? styles.overdue : undefined}>{dueLabel(task)}</small>
        {receipt !== '' ? <small>{receipt}</small> : null}
      </span>
    </button>
  );
}
