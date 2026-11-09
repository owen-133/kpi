// Display formats of the legacy portal (public/app.js, public/kpi-ui.js, public/task-editor.js). Outputs are part of the contract.
import { kstDayOf } from '../../../../domain/kstDates.ts';

const KST = 'Asia/Seoul';

// legacy `fmt`: KST date and minute, '—' when the value is missing
export function formatDateTime(value: string | null | undefined): string {
  return value
    ? new Date(value).toLocaleString('ko-KR', {
        timeZone: KST,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
}

// legacy `when`: KST date and time with seconds
export function formatWhen(value: string): string {
  return new Date(value).toLocaleString('ko-KR', { timeZone: KST });
}

// legacy `today()`: the KST calendar day as YYYY-MM-DD
export function todayKst(now: Date = new Date()): string {
  return kstDayOf(now.toISOString());
}

export const formatPercent = (value: number | null): string => (value === null ? '—' : value + '%');
export const formatHours = (value: number | null): string => (value === null ? '—' : value.toFixed(1) + '시간');
export const formatFileSize = (bytes: number): string => `${Math.ceil(bytes / 1024)}KB`;

// legacy `percent()`: share of finished work among the real (non-test) tasks
export function completionPercent(tasks: ReadonlyArray<{ readonly status?: string; readonly is_test?: unknown }>): number {
  const real = tasks.filter((t) => !t.is_test);
  return real.length ? Math.round((real.filter((t) => t.status === '완료').length / real.length) * 100) : 0;
}

export type TimelineEvent = { readonly kind: string; readonly detail: string };

const EDIT_FIELD_NAMES: Readonly<Record<string, string>> = {
  title: '업무명',
  requester: '요청자',
  department: '부서',
  channel: '접수 경로',
  category: '업무 분류',
  priority: '중요도',
  requested_at: '요청받은 시각',
  due_date: '처리 기한',
  description: '상세내용',
};

type EditDetail = { reason: string; changes: Record<string, { before: unknown; after: unknown }> };

// legacy `eventText` of public/task-editor.js
export function eventText(event: TimelineEvent): string {
  if (event.kind === '등록') return '업무가 접수되었습니다.';
  if (event.kind !== '업무 정보 수정') return event.detail;
  try {
    const data = JSON.parse(event.detail) as EditDetail;
    const value = (key: string, v: unknown): unknown => (key === 'requested_at' ? formatWhen(v as string) : v || '미지정');
    return (
      '수정 사유: ' +
      data.reason +
      '\n' +
      Object.entries(data.changes)
        .map(([k, c]) => `${EDIT_FIELD_NAMES[k] || k}: ${value(k, c.before)} → ${value(k, c.after)}`)
        .join('\n')
    );
  } catch {
    return event.detail;
  }
}
