'use client';

import type { Dispatch } from 'react';
import type { StatusCounts } from '../../../../domain/statusCounts.ts';
import { STATUS_ORDER, taskState } from '../../../../domain/taskStatus.ts';
import type { DateField, GroupBy } from '../../../../domain/groupTasks.ts';
import { ALL_STATUSES, type BoardAction, type BoardState } from './boardState.ts';
import { DATE_FIELD_OPTIONS, GROUP_BY_OPTIONS } from './boardLabels.ts';
import styles from './board.module.css';
import { StateIcon } from './icons.tsx';

type Props = { state: BoardState; counts: StatusCounts; dispatch: Dispatch<BoardAction>; onExport: () => void; onRefresh: () => void };

// Status buttons, search, grouping, display switches and the date basis with its range.
export function BoardToolbar(p: Props) {
  const { state, counts, dispatch } = p;
  return (
    <>
      <div className={styles.statusRow}>
        <button className={styles.pill} aria-pressed={state.status === ALL_STATUSES} onClick={() => dispatch({ type: 'status', status: ALL_STATUSES })}>
          {'전체 '}
          <b>{counts.all}</b>
        </button>
        {STATUS_ORDER.map((status) => (
          <button key={status} className={`${styles.pill} ${styles[taskState(status)]}`} aria-pressed={state.status === status} onClick={() => dispatch({ type: 'status', status })}>
            <span className={styles.pillIcon}>
              <StateIcon state={taskState(status)} />
            </span>
            {status}
            <b>{counts.byStatus[status]}</b>
          </button>
        ))}
      </div>
      <div className={styles.toolRow}>
        <input
          type="search"
          className={styles.search}
          aria-label="업무 검색"
          placeholder="업무·요청자·부서·내용 검색"
          value={state.query}
          onChange={(event) => dispatch({ type: 'query', query: event.target.value })}
        />
        <select className={styles.control} aria-label="카드 분류 기준" value={state.groupBy} onChange={(event) => dispatch({ type: 'groupBy', groupBy: event.target.value as GroupBy })}>
          {GROUP_BY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button className={styles.control} aria-pressed={state.compact} onClick={() => dispatch({ type: 'toggleCompact' })}>
          간략 보기
        </button>
        <button className={styles.control} onClick={p.onExport}>
          CSV 내보내기
        </button>
        <button className={styles.control} onClick={p.onRefresh}>
          새로고침
        </button>
      </div>
      <div className={styles.rangeRow}>
        <label className={styles.field}>
          <span>날짜 기준</span>
          <select className={styles.control} value={state.dateField} onChange={(event) => dispatch({ type: 'dateField', dateField: event.target.value as DateField })}>
            {DATE_FIELD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>시작일</span>
          <input type="date" className={styles.control} value={state.from} onChange={(event) => dispatch({ type: 'from', day: event.target.value })} />
        </label>
        <label className={styles.field}>
          <span>종료일</span>
          <input type="date" className={styles.control} value={state.to} onChange={(event) => dispatch({ type: 'to', day: event.target.value })} />
        </label>
        <button className={styles.control} onClick={() => dispatch({ type: 'resetRange' })}>
          기간 초기화
        </button>
      </div>
    </>
  );
}
