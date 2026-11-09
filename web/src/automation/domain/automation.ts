// Rule-based suggestions for a new request: a category from keywords and similar existing tasks from text overlap.
// Rules are those of the legacy portal (Owen's public/kpi-model.js `classify` and `similarTasks`). No generative AI.

export const AUTOMATION_METHOD = '규칙·텍스트 유사도 기반 자동화 (생성형 AI 미사용)';

/** A task as the similarity search sees it: the stored task with its extras (test flag, assignee ...) laid over it. */
export type TaskSnapshot = {
  readonly id: string;
  readonly title: string;
  readonly description?: string | null;
  readonly status?: string;
  readonly deleted_at?: string | null;
  readonly is_test?: boolean | null;
} & Readonly<Record<string, unknown>>;

export type Classification = {
  readonly category: string;
  readonly method: string;
  readonly reason: string;
};

export type SimilarTask = {
  readonly id: string;
  readonly title: string;
  readonly status: string | undefined;
  readonly score: number;
};

const CLASSIFICATION_METHOD = '키워드 규칙';
const FALLBACK_CATEGORY = '기타';
const MIN_SCORE = 10;
const MAX_SIMILAR = 5;

// Keyword group -> names a configured category may contain. Groups are tried in this order.
const KEYWORD_GROUPS: ReadonlyArray<readonly [RegExp, readonly string[]]> = [
  [/노트북|마우스|모니터|키보드|자산|장비|PC/i, ['비품', '자산']],
  [/구매|지출|결제|견적|영수증|비용/, ['구매', '지출']],
  [/수리|시설|조명|냉난방|청소|회의실/, ['시설', '환경']],
  [/계약|갱신|임대/, ['계약']],
  [/복지|복리|경조|건강검진/, ['복리', '복지']],
];

export function classify(text: string, categories: readonly string[]): Classification {
  for (const [pattern, names] of KEYWORD_GROUPS) {
    if (!pattern.test(text)) continue;
    const category = categories.find((candidate) => names.some((name) => candidate.includes(name)));
    if (category !== undefined) {
      return { category, method: CLASSIFICATION_METHOD, reason: '요청 내용의 업무 키워드와 설정된 분류를 매칭했습니다.' };
    }
  }
  return { category: categories[0] || FALLBACK_CATEGORY, method: CLASSIFICATION_METHOD, reason: '명확한 키워드가 없어 기본 분류를 제안합니다. 직접 확인하세요.' };
}

// Whole words of 2+ characters plus every pair of neighbouring characters inside a word.
function tokens(text: string): Set<string> {
  const lowered = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ');
  const found = new Set(lowered.split(/\s+/).filter((token) => token.length > 1));
  for (const word of lowered.split(' ')) for (let i = 0; i < word.length - 1; i++) found.add(word.slice(i, i + 2));
  return found;
}

export function similarTasks(text: string, tasks: readonly TaskSnapshot[]): SimilarTask[] {
  const query = tokens(text);
  if (query.size === 0) return [];
  return tasks
    .filter((task) => !task.deleted_at && !task.is_test)
    .map((task) => {
      const other = tokens(`${task.title} ${task.description}`);
      const shared = [...query].filter((token) => other.has(token)).length;
      return { id: task.id, title: task.title, status: task.status, score: Math.round((shared / (query.size + other.size - shared || 1)) * 100) };
    })
    .filter((task) => task.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SIMILAR);
}

/** Lays each task's extras (matched by `task_id`) over the task. */
export function mergeExtras(tasks: readonly TaskSnapshot[], extras: ReadonlyArray<Readonly<Record<string, unknown>> & { readonly task_id?: unknown }>): TaskSnapshot[] {
  const byTask = new Map(extras.map((extra) => [extra.task_id, extra]));
  return tasks.map((task) => ({ ...task, ...byTask.get(task.id) }));
}
