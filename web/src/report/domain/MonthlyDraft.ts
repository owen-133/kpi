// The rule-based report text (R-023). Not generative AI. The wording is the legacy text, character for character.
import type { MonthlyMetrics } from './MonthlyMetrics.ts';

const rate = (n: number | null): string => (n === null ? '산정 대상 없음' : `${n}%`);
const hoursText = (n: number | null): string => (n === null ? '산정 대상 없음' : `${n.toFixed(1)}시간`);

export function monthlyDraft(m: MonthlyMetrics): string {
  return `${m.month} 총무 업무 처리현황\n\n1. 처리 현황\n요청 접수 ${m.received}건, 해당 월 완료 ${m.completed}건입니다. 접수 업무 중 현재 미완료 ${m.pending}건, 기한 초과 ${m.overdue}건입니다.\n\n2. 처리 지표\n완료 기준 기한 준수율 ${rate(m.completionRate)} (${m.onTime}/${m.withDeadline}건), 기한 도래 기준 준수율 ${rate(m.dueRate)} (${m.dueMet}/${m.dueTotal}건)입니다. 평균 경과시간 ${hoursText(m.averageHours)}, 중앙값 ${hoursText(m.medianHours)}입니다.\n\n3. 데이터 점검\n접수 업무 중 기한 미지정 ${m.noDeadline}건, 전체 업무 중 시각 검증 필요 ${m.invalid}건입니다. 완료 업무 중 기한 없는 ${m.noDeadlineCompleted}건은 완료 기준 준수율에서 제외했습니다.\n\n4. 다음 개선 과제\n${m.overdue ? '기한 초과 원인을 확인하고 담당자·협업 부서와 처리 계획을 정리합니다.' : '처리 지연 사례와 반복 요청을 점검하고 개선 이력에 남깁니다.'}\n\n※ 규칙 기반 자동 초안입니다. 담당자가 검토한 뒤 발행하세요. 시간은 주말·대기를 포함한 경과시간이며 실제 투입시간이 아닙니다. 지표 기준 v${m.version}, 집계 시점 ${m.generated_at}. 삭제 업무 제외, 현재 상태 기준 집계이므로 과거 월말 상태를 복원한 수치가 아닙니다.`;
}
