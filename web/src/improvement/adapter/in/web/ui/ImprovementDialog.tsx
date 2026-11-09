'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { usePortal } from '../../../../../portal/adapter/in/web/ui/PortalContext.tsx';
import { queryKeys } from '../../../../../portal/adapter/in/web/ui/queryKeys.ts';
import { IMPROVEMENT_FIELD_LIMIT, IMPROVEMENT_STAGES, IMPROVEMENT_STATUSES, type ImprovementValue } from '../../../../domain/ImprovementValue.ts';
import type { ImprovementHistoryEvent, ImprovementItem } from './ImprovementApi.ts';
import { loadImprovementHistory, saveImprovement } from './improvementFlow.ts';
import { NEW_IMPROVEMENT_DEFAULTS, historyChangeText, historyMeta, improvementDialogTitle } from './improvementView.ts';

const TEXT_INPUTS = [
  ['title', '개선 제목'],
  ['source', '피드백 출처 / 시연 대상'],
] as const;
const TEXT_AREAS = [
  ['feedback', '문제·요청·피드백 (개선 전)'],
  ['action', '개선 내용·조치 (개선 후)'],
  ['result', '검증 결과·전후 비교·근거 위치'],
] as const;

/** The body of #improvement-dialog (legacy edit()): a new record or the record whose id the dialog slot carries. */
export function ImprovementDialog() {
  const { session, state, apis, actions } = usePortal();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<ImprovementHistoryEvent[]>([]);

  // The row the user pressed, from the list the screen read (legacy: list.find(...)).
  const itemId = state.dialogs.improvement.itemId;
  const item = itemId ? queryClient.getQueryData<ImprovementItem[]>(queryKeys.improvements)?.find((x) => x.id === itemId) : undefined;
  const x: Partial<ImprovementValue> = item ?? NEW_IMPROVEMENT_DEFAULTS;
  const readonly = session.role !== 'admin';

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (readonly) return;
    setSaving(true);
    const value = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (!(await saveImprovement(apis.improvement, actions, item, value))) setSaving(false);
  };

  const showHistory = async () => {
    if (!item) return;
    const read = (id: string) =>
      queryClient.fetchQuery({ queryKey: queryKeys.improvementHistory(id), queryFn: () => apis.improvement.history(id), staleTime: 0 });
    const got = await loadImprovementHistory(read, actions, item.id);
    if (got !== null) setEvents(got);
  };

  return (
    <form id="improvement-form" onSubmit={submit}>
      <div className="dialog-head">
        <h2>{improvementDialogTitle(item)}</h2>
        <button type="button" className="close" data-close="improvement-dialog" aria-label="닫기" onClick={() => actions.close('improvement')}>
          ×
        </button>
      </div>
      <div className="form-grid">
        {TEXT_INPUTS.map(([k, label]) => (
          <label key={k}>
            {label}
            <input name={k} defaultValue={x[k] || ''} maxLength={IMPROVEMENT_FIELD_LIMIT} required={k === 'title'} readOnly={readonly} />
          </label>
        ))}
        <label>
          수행 단계
          <select name="stage" defaultValue={x.stage} disabled={readonly}>
            {IMPROVEMENT_STAGES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          상태
          <select name="status" defaultValue={x.status} disabled={readonly}>
            {IMPROVEMENT_STATUSES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      {TEXT_AREAS.map(([k, label]) => (
        <label key={k}>
          {label}
          <textarea name={k} rows={3} defaultValue={x[k] || ''} maxLength={IMPROVEMENT_FIELD_LIMIT} required={k === 'feedback'} readOnly={readonly} />
        </label>
      ))}
      <p className="muted tiny">검증 완료에는 검증 결과가 필수입니다. 공용 admin 계정의 수정 전후 내용과 시각을 보존합니다.</p>
      <div className="dialog-actions">
        {item ? (
          <button type="button" className="secondary" id="improvement-history" onClick={showHistory}>
            수정 이력
          </button>
        ) : null}
        {readonly ? null : (
          <button className="primary" type="submit" disabled={saving}>
            개선 기록 저장
          </button>
        )}
      </div>
      <div id="improvement-audit">
        {events.map((e, i) => (
          <div className="event" key={i}>
            <small>{historyMeta(e)}</small>
            <p>{historyChangeText(e)}</p>
          </div>
        ))}
      </div>
    </form>
  );
}
