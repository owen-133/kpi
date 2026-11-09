// R-030
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classify, mergeExtras, similarTasks, AUTOMATION_METHOD } from './automation.ts';
import type { TaskSnapshot } from './automation.ts';

const CATEGORIES = ['일반 총무', '고정업무', '비품·자산', '구매·지출', '시설·환경', '계약', '복리후생', '기타'];
const task = (id: string, title: string, over: Partial<TaskSnapshot> = {}): TaskSnapshot => ({ id, title, description: '', status: '접수', ...over });

describe('classification by keyword rules', () => {
  const cases: Array<[string, string]> = [
    ['노트북 지급 요청', '비품·자산'],
    ['모니터 교체', '비품·자산'],
    ['pc 설치', '비품·자산'],
    ['견적서 받아주세요', '구매·지출'],
    ['영수증 처리', '구매·지출'],
    ['회의실 조명 수리', '시설·환경'],
    ['임대 계약 갱신', '계약'],
    ['건강검진 안내', '복리후생'],
  ];
  for (const [text, category] of cases) {
    it(`puts "${text}" into ${category} and explains it by keywords`, () => {
      assert.deepEqual(classify(text, CATEGORIES), { category, method: '키워드 규칙', reason: '요청 내용의 업무 키워드와 설정된 분류를 매칭했습니다.' });
    });
  }

  it('uses the first category that contains a keyword name, in the order of the configured categories', () => {
    assert.equal(classify('구매 요청', ['기타', '지출 관리', '구매 관리']).category, '지출 관리');
  });
  it('checks the keyword groups in their fixed order (equipment before purchase)', () => {
    assert.equal(classify('노트북 구매 견적', CATEGORIES).category, '비품·자산');
  });
  it('falls on to the next keyword group when the matched group has no configured category', () => {
    assert.equal(classify('노트북 임대', ['일반 총무', '계약']).category, '계약');
  });
  it('suggests the first configured category, with a "check it yourself" reason, when no keyword matches', () => {
    assert.deepEqual(classify('안녕하세요', ['총무', '기타']), { category: '총무', method: '키워드 규칙', reason: '명확한 키워드가 없어 기본 분류를 제안합니다. 직접 확인하세요.' });
  });
  it('suggests 기타 when there are no categories at all', () => {
    assert.equal(classify('안녕하세요', []).category, '기타');
    assert.equal(classify('노트북', []).category, '기타');
  });
  it('falls back to the default when the keyword matches but no configured category fits', () => {
    assert.equal(classify('노트북', ['일반 총무']).category, '일반 총무');
  });
  it('matches the English keyword case-insensitively and the Korean ones literally', () => {
    assert.equal(classify('PC 점검', CATEGORIES).category, '비품·자산');
  });
});

describe('similar tasks', () => {
  it('returns nothing for an empty request text', () => {
    assert.deepEqual(similarTasks('', [task('a', '노트북 준비')]), []);
    assert.deepEqual(similarTasks('   ', [task('a', '노트북 준비')]), []);
    assert.deepEqual(similarTasks('!', [task('a', '노트북 준비')]), []);
  });
  it('scores by shared words and character pairs as a percentage of the union', () => {
    const [hit] = similarTasks('신규 입사자 노트북', [task('a', '신규 입사자 노트북')]);
    assert.deepEqual(hit, { id: 'a', title: '신규 입사자 노트북', status: '접수', score: 100 });
  });
  it('lists only tasks scoring 10 or more, best first, at most five', () => {
    const tasks = [
      task('low', '완전히 다른 이야기'),
      ...Array.from({ length: 7 }, (_, i) => task('t' + i, '노트북 지급 ' + 'x'.repeat(i))),
    ];
    const result = similarTasks('노트북 지급', tasks);
    assert.equal(result.length, 5);
    assert.ok(result.every((item) => item.score >= 10));
    assert.deepEqual(result.map((item) => item.score), [...result.map((item) => item.score)].sort((a, b) => b - a));
    assert.equal(result.some((item) => item.id === 'low'), false);
  });
  it('keeps the original order between equal scores', () => {
    const result = similarTasks('프린터 토너', [task('first', '프린터 토너'), task('second', '프린터 토너')]);
    assert.deepEqual(result.map((item) => item.id), ['first', 'second']);
  });
  it('leaves out deleted tasks and test records', () => {
    const tasks = [task('gone', '프린터 토너', { deleted_at: '2026-11-01T00:00:00Z' }), task('test', '프린터 토너', { is_test: true }), task('live', '프린터 토너')];
    assert.deepEqual(similarTasks('프린터 토너', tasks).map((item) => item.id), ['live']);
  });
  it('reads the description too, and a missing description counts as the word "null" (legacy quirk)', () => {
    assert.equal(similarTasks('토너 교체', [task('d', '문의', { description: '토너 교체 요청' })])[0].id, 'd');
    assert.equal(similarTasks('null', [task('n', '문의', { description: null })])[0].id, 'n');
  });
  it('ignores case and punctuation', () => {
    assert.equal(similarTasks('ABC-Report!!', [task('c', 'abc report')])[0].score, 100);
  });
  it('returns nothing for an empty task list', () => assert.deepEqual(similarTasks('노트북', []), []));
});

describe('task snapshot', () => {
  it('lays the extras of a task over the task, matched by task id', () => {
    const merged = mergeExtras([task('a', 'A'), task('b', 'B')], [{ task_id: 'b', is_test: true, assignee: '김' }]);
    assert.equal(merged[0].is_test, undefined);
    assert.equal(merged[1].is_test, true);
    assert.equal(merged[1].title, 'B');
  });
  it('passes a task through when it has no extras and keeps the list order', () => {
    assert.deepEqual(mergeExtras([task('a', 'A'), task('b', 'B')], []).map((t) => t.id), ['a', 'b']);
  });
  it('names the method of the suggestions', () => assert.equal(AUTOMATION_METHOD, '규칙·텍스트 유사도 기반 자동화 (생성형 AI 미사용)'));
});
