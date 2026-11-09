'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { browserDownloadPort, downloadBlob, downloadText } from '../../../../../shared/adapter/in/web/ui/download.ts';
import { formatHours, formatPercent, formatWhen } from '../../../../../shared/adapter/in/web/ui/format.ts';
import { usePortal } from '../../../../../portal/adapter/in/web/ui/PortalContext.tsx';
import { queryKeys } from '../../../../../portal/adapter/in/web/ui/queryKeys.ts';
import { currentMonth } from '../../../../domain/ReportMonth.ts';
import type { MonthlyMetrics } from '../../../../domain/MonthlyMetrics.ts';
import { metricsCsv, metricsCsvFilename } from './metricsCsv.ts';
import type { ReportRecordView } from './ReportApi.ts';
import { changeReportMonth, downloadReportPdf, draftFilename, publishReport } from './reportFlow.ts';

function MetricCards({ m }: { m: MonthlyMetrics }) {
  return (
    <div className="stats">
      <div className="stat">
        <span>월간 요청 접수</span>
        <strong>{m.received}</strong>
        <small>요청받은 시각 기준</small>
      </div>
      <div className="stat">
        <span>월간 완료</span>
        <strong>{m.completed}</strong>
        <small>최종 완료 시각 기준</small>
      </div>
      <div className="stat">
        <span>완료 기준 기한 준수율</span>
        <strong>{formatPercent(m.completionRate)}</strong>
        <small>{`기한 내 ${m.onTime} / 기한 있는 완료 ${m.withDeadline}건`}</small>
      </div>
      <div className="stat">
        <span>평균 처리 경과시간</span>
        <strong className="metric-hours">{formatHours(m.averageHours)}</strong>
        <small>{`중앙값 ${formatHours(m.medianHours)}`}</small>
      </div>
    </div>
  );
}

/** The business results screen (legacy renderReports). Preview and list are read on every mount, the list only once the preview answered. */
export function ReportView() {
  const { session, texts, apis, actions, state } = usePortal();
  const month = state.reportMonth ?? currentMonth(new Date().toISOString());
  const [publishing, setPublishing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  // 'always' and staleTime 0: a screen drawn anew reads again, never from what the last visit left in the cache
  const preview = useQuery({
    queryKey: queryKeys.reportPreview(month),
    queryFn: () => apis.report.preview(month),
    refetchOnMount: 'always',
    staleTime: 0,
  });
  // Legacy reads the list after the preview and not at all when the preview failed.
  const reports = useQuery({
    queryKey: queryKeys.reports,
    queryFn: () => apis.report.list(),
    refetchOnMount: 'always',
    staleTime: 0,
    enabled: preview.isSuccess && !preview.isFetching,
  });

  // Legacy: a failed preview leaves only the message in the root.
  if (preview.isError) return <div className="kpi-view-root">{preview.error.message}</div>;
  if (!preview.isSuccess || preview.isFetching || reports.isPending || reports.isFetching) {
    return (
      <div className="kpi-view-root">
        <p className="muted">월간 지표를 집계하고 있습니다.</p>
      </div>
    );
  }

  const m = preview.data.metrics;
  const isAdmin = session.role === 'admin';
  const available = !reports.isError;
  const records: ReportRecordView[] = reports.isError ? [] : reports.data;
  const published = records.filter((r) => r.month === month);

  const publish = async () => {
    // the confirmation comes first: declining leaves the button as it was; an accepted one disables it until the screen is drawn anew
    const result = await publishReport(
      apis.report,
      actions,
      (message) => {
        const ok = window.confirm(message);
        if (ok) setPublishing(true);
        return ok;
      },
      { month, fingerprint: preview.data.fingerprint, draft: draftRef.current?.value ?? '' },
    );
    if (result === 'failed') setPublishing(false);
  };

  const pdf = async (record: ReportRecordView) => {
    setPdfBusy(record.id);
    await downloadReportPdf(
      {
        portalName: texts.portalName,
        createPdf: async (r, options) => (await import('./pdf/createReportPdf.ts')).createReportPdf(r, options),
        save: (name, bytes) => downloadBlob(browserDownloadPort(), name, new Blob([bytes as BlobPart], { type: 'application/pdf' })),
        toast: actions.toast,
      },
      record,
    );
    setPdfBusy(null);
  };

  return (
    <div className="kpi-view-root">
      <div className="toolbar">
        <label className="month-label">
          {'조회 월 '}
          <input id="report-month" type="month" defaultValue={month} aria-label="조회 월" onChange={(e) => changeReportMonth(actions, e.currentTarget.value)} />
        </label>
        <button className="secondary" id="report-refresh" onClick={() => actions.render()}>
          지표 새로 집계
        </button>
        <button
          className="secondary"
          id="metrics-csv"
          onClick={() => downloadText(browserDownloadPort(), metricsCsvFilename(month), metricsCsv(m), 'text/csv;charset=utf-8')}
        >
          지표 CSV
        </button>
      </div>
      {!available ? <div className="notice">{reports.error?.message}</div> : null}
      <MetricCards m={m} />
      <div className="dashboard">
        <section className="panel">
          <h2>{texts.kpiQualityTitle || '기한 도래 · 데이터 품질'}</h2>
          <div className="report-facts">
            <p>
              기한 도래 기준 준수율 <strong>{formatPercent(m.dueRate)}</strong>
              <small>{`기한 내 ${m.dueMet} / 선택월 중 오늘까지 기한이 도래한 ${m.dueTotal}건`}</small>
            </p>
            <p>
              선택월 접수 중 현재 미완료 <strong>{`${m.pending}건`}</strong>
            </p>
            <p>
              그중 현재 기한 초과 <strong>{`${m.overdue}건`}</strong>
            </p>
            <p>
              기한 미지정 접수 <strong>{`${m.noDeadline}건`}</strong>
            </p>
            <p>
              지표 제외 테스트 업무 <strong>{`${m.excludedTests}건`}</strong>
            </p>
            <p>
              전체 업무 시각 검증 필요 <strong>{`${m.invalid}건`}</strong>
            </p>
          </div>
        </section>
        <section className="panel">
          <h2>{texts.categoryReportTitle || '유형 · 상태별 접수 현황'}</h2>
          {Object.keys(m.categories).length ? (
            Object.entries(m.categories).map(([k, v]) => (
              <div className="report-bar" key={k}>
                <span>{k}</span>
                <strong>{`${v}건`}</strong>
              </div>
            ))
          ) : (
            <p className="muted">선택월 접수 업무가 없습니다.</p>
          )}
          <hr className="divider" />
          <div className="report-statuses">
            {Object.entries(m.statuses).map(([k, v]) => (
              <span className="badge" key={k}>{`${k} ${v}건`}</span>
            ))}
          </div>
        </section>
      </div>
      <details className="panel metric-definition">
        <summary>{`지표 산정 기준 · 해석 시 주의사항 (v${m.version})`}</summary>
        <p>
          한국 시간 기준으로 월을 구분합니다. 접수는 요청받은 시각, 완료는 현재 완료 상태인 업무의 최종 완료 시각 기준입니다. 준수는 완료 날짜가 기한 날짜 이내인 경우입니다. 기한 없는 완료 건은 완료 기준
          준수율의 분모에서 제외합니다. 대상이 없으면 0% 대신 —로 표시합니다.
        </p>
        <p>
          날짜만 입력한 새 요청은 선택일 00:00(한국 시간)을 기준으로 계산합니다. 소요시간은 요청부터 최종 완료까지 주말·대기를 포함한 달력 경과시간이며 실제 투입시간이 아닙니다. 완료가 요청보다 빠르거나 완료
          시각이 잘못된 업무는 완료 건수·시간·완료 기준 준수율에서 제외하고 검증 필요에 집계합니다. 잘못된 기한 날짜는 준수율 대상에서 제외합니다. 기한 도래 기준은 아직 미완료인 업무도 분모에 포함합니다.
          삭제 업무는 제외합니다. 현재 상태로 집계하므로 과거 월말 상태의 재현값이 아닙니다.
        </p>
        <p>
          발행은 버튼을 누른 시점의 요약 수치와 검토 문안을 보존합니다. 이후 업무가 바뀌어도 기존 발행본은 수정되지 않습니다. 보고서에 직접 쓴 개인정보·업무명은 해당 업무를 영구 삭제해도 발행본에
          남으므로 문안에 불필요한 개인정보를 넣지 마세요.
        </p>
      </details>
      <section className="panel report-draft">
        <div className="panel-head">
          <div>
            <h2>{texts.monthlyReportTitle || '월간 처리현황 리포트'}</h2>
            <p className="muted tiny">{`${texts.processingReportTitle || '처리 기록'} · 규칙 기반 자동 초안 · 생성형 AI 미사용 · 담당자 검토 후 발행`}</p>
          </div>
          <button
            className="secondary"
            id="draft-download"
            onClick={() => downloadText(browserDownloadPort(), draftFilename(month), draftRef.current?.value ?? '')}
          >
            초안 내려받기
          </button>
        </div>
        <textarea id="monthly-draft" rows={16} maxLength={20000} aria-label="월간 보고서 초안" readOnly={!isAdmin} defaultValue={preview.data.draft} ref={draftRef}></textarea>
        {isAdmin ? (
          <div className="dialog-actions">
            <button className="primary" id="publish-report" disabled={!available || publishing} onClick={() => void publish()}>
              검토 완료 · 리포트 발행
            </button>
          </div>
        ) : null}
      </section>
      <section className="panel published-reports">
        <h2>{texts.reportIssuanceTitle || '발행 이력'}</h2>
        <p className="muted tiny">발행본은 별도 버전으로 보존합니다. 같은 월도 다시 발행할 수 있습니다.</p>
        <div id="report-versions">
          {published.length ? (
            published.map((r) => (
              <article className="task-row" key={r.id}>
                <div className="task-open">
                  <strong>{`${r.month} 처리현황`}</strong>
                  <small>{`${formatWhen(r.created_at)} · ${r.actor || 'admin'}`}</small>
                </div>
                <button className="secondary" data-report-id={r.id} disabled={pdfBusy === r.id} onClick={() => void pdf(r)}>
                  {pdfBusy === r.id ? 'PDF 만드는 중…' : '발행본 내려받기'}
                </button>
              </article>
            ))
          ) : (
            <p className="muted">선택월의 발행본이 없습니다.</p>
          )}
        </div>
      </section>
    </div>
  );
}
