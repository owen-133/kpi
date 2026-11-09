'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { browserDownloadPort, downloadText } from '../../../../../shared/adapter/in/web/ui/download.ts';
import { usePortal } from '../../../../../portal/adapter/in/web/ui/PortalContext.tsx';
import { queryKeys } from '../../../../../portal/adapter/in/web/ui/queryKeys.ts';
import { IMPROVEMENT_STAGES } from '../../../../domain/ImprovementValue.ts';
import { IMPROVEMENT_CSV_FILENAME, improvementCsv } from './improvementCsv.ts';
import { filterByStage, improvementSubtitle } from './improvementView.ts';

/** The improvement screen (legacy renderImprovements): roadmap, stage filter, ledger rows, CSV. Read on every mount. */
export function ImprovementsView() {
  const { session, texts, apis, actions } = usePortal();
  const [stage, setStage] = useState('');
  // 'always': the screen is read again each time it mounts (render() after a save), never served from the last visit.
  const list = useQuery({ queryKey: queryKeys.improvements, queryFn: () => apis.improvement.list(), refetchOnMount: 'always' });

  // Legacy: the empty root stays empty while the list loads; a failed read shows the message in a notice.
  if (list.isError) {
    return (
      <div className="kpi-view-root">
        <div className="notice">{list.error.message}</div>
      </div>
    );
  }
  if (!list.isSuccess || list.isFetching) return <div className="kpi-view-root"></div>;

  const items = list.data;
  const shown = filterByStage(items, stage);
  return (
    <div className="kpi-view-root">
      <div className="roadmap">
        <article>
          <h3>01 · MVP 구축</h3>
          <p>
            접수·기한·중요도·상태·대시보드
            <br />
            근거: 시스템 시연과 구현 검증 결과
          </p>
        </article>
        <article>
          <h3>02 · 본인 실사용</h3>
          <p>
            실제 업무 등록·담당자 배정·처리 기록
            <br />
            근거: 지표 검증·피드백·개선 이력
          </p>
        </article>
        <article>
          <h3>03 · 정착 운영</h3>
          <p>
            월간 보고서 발행·지표 기반 개선
            <br />
            근거: 발행 이력과 개선 검증 결과
          </p>
        </article>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{texts.improvementLedgerTitle || '피드백 · 개선 이력 관리대장'}</h2>
            <p className="muted tiny">문제 발견 → 개선 → 검증 결과를 단계별로 기록합니다.</p>
          </div>
          {session.role === 'admin' ? (
            <button className="primary" id="new-improvement" onClick={() => actions.open('improvement')}>
              ＋ 개선 기록
            </button>
          ) : null}
        </div>
        <div className="toolbar">
          <select id="improvement-stage" aria-label="수행 단계" onChange={(e) => setStage(e.currentTarget.value)}>
            <option value="">전체 단계</option>
            {IMPROVEMENT_STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            className="secondary"
            id="improvement-export"
            onClick={() => downloadText(browserDownloadPort(), IMPROVEMENT_CSV_FILENAME, improvementCsv(items), 'text/csv;charset=utf-8')}
          >
            관리대장 CSV
          </button>
        </div>
        <div id="improvement-list">
          {shown.length ? (
            shown.map((x) => (
              <article className="task-row" key={x.id}>
                <button className="task-open" data-improvement={x.id} onClick={() => actions.open('improvement', { itemId: x.id })}>
                  <strong>{x.title}</strong>
                  <small>{improvementSubtitle(x)}</small>
                </button>
                <span className="badge">{x.status}</span>
              </article>
            ))
          ) : (
            <p className="empty">피드백이나 개선 결과를 기록해 보세요.</p>
          )}
        </div>
      </section>
    </div>
  );
}
