'use client';

import styles from './checklistBadge.module.css';
import { useLayoutEffect, useRef } from 'react';
import { todayKst } from '../../../../../../shared/adapter/in/web/ui/format.ts';
import { usePortal } from '../PortalContext.tsx';
import { completion, kpiStrip, pendingTasks, statCards, syncStatusText, taskRow, type RowView } from './overviewModel.ts';
import { useDashboardAutoRefresh } from './useDashboardAutoRefresh.ts';

const LOCAL_MODE_NOTICE = '로컬 개발 모드입니다. 팀장과 공유하기 전 관리자·조회 계정 비밀번호와 HTTPS를 설정해 주세요.';

/** The Overview: the markup of the legacy `render()` for view 'overview', in the same order and with the same text nodes. */
export function OverviewView() {
  const { session, values, texts, tasks, state, actions } = usePortal();
  useDashboardAutoRefresh();
  const barRef = useRef<HTMLDivElement>(null);
  const today = todayKst();
  const stats = statCards(tasks, texts, today);
  const kpi = kpiStrip(tasks, new Date().toISOString());
  const rows = pendingTasks(tasks).map((t) => taskRow(t, today));
  const done = completion(tasks);
  // D10: the bar width is set from script (the page's CSP has no inline style), before the first paint like the legacy line after innerHTML.
  useLayoutEffect(() => {
    if (barRef.current !== null) barRef.current.style.width = done.percent + '%';
  });
  const openDetail = (id: string) => {
    actions.openDetail(id).catch((e: unknown) => actions.toast(e instanceof Error ? e.message : String(e)));
  };
  return (
    <>
      {!session.shared ? <div className="notice">{LOCAL_MODE_NOTICE}</div> : null}
      {values.showBanner ? (
        <section className="hero">
          <p className="eyebrow">{texts.bannerEyebrow}</p>
          <h2 className="multiline">{texts.bannerTitle}</h2>
          <p>{texts.bannerDescription}</p>
        </section>
      ) : null}
      <div className="stats">
        {stats.map((s) => (
          <div className="stat" key={s.caption}>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
            <small>{s.caption}</small>
          </div>
        ))}
      </div>
      <section className="panel live-metrics">
        <div>
          <h3>이번 달 운영 지표</h3>
          <p className="muted tiny">
            {kpi.excluded}
            <br />
            <span id="sync-status" role="status">
              {syncStatusText(state.lastRefreshed)}
            </span>
          </p>
        </div>
        <span>
          접수 <b>{kpi.received}</b>
        </span>
        <span>
          완료 <b>{kpi.completed}</b>
        </span>
        <span>
          기한 준수 <b>{kpi.onTime}</b>
        </span>
        <span>
          평균 경과 <b>{kpi.average}</b>
        </span>
        <button className="text-button" data-go="report" onClick={() => actions.navigate('report')}>
          월간 보고서 →
        </button>
      </section>
      <div className="dashboard">
        <section className="panel">
          <h2>{texts.pendingTitle}</h2>
          <p className="muted tiny">{texts.pendingDescription}</p>
          {rows.length ? (
            rows.map((row) => <TaskRow key={row.id} row={row} onOpen={openDetail} />)
          ) : (
            <div className="empty">
              <strong>아직 처리할 업무가 없어요</strong>
              새 업무를 등록하고 첫 기록을 시작해 보세요.
            </div>
          )}
          <button className="text-button" data-go="board" onClick={() => actions.navigate('board')}>
            모든 업무 보기 →
          </button>
        </section>
        <section className="panel">
          <h2>{texts.completionTitle}</h2>
          <p className="muted tiny">현재 등록된 전체 업무 기준</p>
          <strong className="progress-number">{done.percent + '%'}</strong>
          <div className="progress">
            <div id="completion-bar" ref={barRef}></div>
          </div>
          <p className="muted tiny">{`실제 업무 ${done.real}건 중 ${done.done}건 완료`}</p>
          <hr className="divider" />
          <h2>{texts.recordTitle}</h2>
          <p className="muted">{texts.recordDescription}</p>
          <button className="text-button" data-go="report" onClick={() => actions.navigate('report')}>
            업무 실적 확인하기 →
          </button>
        </section>
      </div>
    </>
  );
}

function TaskRow(p: { row: RowView; onOpen: (id: string) => void }) {
  const { row } = p;
  return (
    <div className="task-row task-row--labeled">
      <span className="status-dot"></span>
      <button className="task-open" data-task={row.id} onClick={() => p.onOpen(row.id)}>
        <strong>{row.title}</strong>
        {row.checklistLabel ? <span className={styles.badge}>{row.checklistLabel}</span> : null}
        <small>{row.subtitle}</small>
      </button>
      <dl className="task-row-meta">
        <div>
          <dt>업무 상태</dt>
          <dd>
            <span className={row.statusClass}>{row.status}</span>
          </dd>
        </div>
        <div>
          <dt>처리 기한</dt>
          <dd>
            {row.due.kind === 'date' ? (
              <time dateTime={row.due.value} className={row.due.className}>
                {row.due.value}
              </time>
            ) : (
              <span className="badge">미지정</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
