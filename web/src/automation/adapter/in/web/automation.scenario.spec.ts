// R-030
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_PASSWORD, VIEWER_PASSWORD } from '../../../../parity/legacyOracle.ts';
import { startNextCandidate } from '../../../../parity/nextCandidate.ts';

const ORIGIN = 'http://automation.test';
const basic = (user: string, password: string): string => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
const sessionPromise = startNextCandidate();
after(async () => (await sessionPromise).stop?.());

async function ask(path: string, method: string, who: 'admin' | 'viewer' | 'nobody', body?: unknown): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (who !== 'nobody') headers.Authorization = who === 'admin' ? basic('admin', ADMIN_PASSWORD) : basic('viewer', VIEWER_PASSWORD);
  const response = await (await sessionPromise).handle(new Request(ORIGIN + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
  const text = await response.text();
  return { status: response.status, data: text.startsWith('{') || text.startsWith('[') ? JSON.parse(text) : text };
}
const suggest = (text: unknown) => ask('/api/automation', 'POST', 'admin', { text });

async function seedTask(title: string, description: string, markTest = false): Promise<string> {
  const database = await (await sessionPromise).container.orbitFunctions();
  const created = (await database.call('orbit_api', {
    action: 'create',
    payload: { title, requester: '요청자', department: '', channel: '', category: '', priority: '', requested_at: '2026-11-03T01:00:00Z', due_date: '', description },
  })) as { id: string };
  if (markTest) await database.call('orbit_kpi', { action: 'mark_test', payload: { id: created.id, is_test: true } });
  return created.id;
}

describe('A staff member asks for suggestions while registering a request', () => {
  it('gets a category by keyword from the default categories and no similar tasks on an empty portal', async () => {
    const result = await suggest('신규 입사자 노트북 준비');
    assert.deepEqual(result, {
      status: 200,
      data: {
        classification: { category: '비품·자산', method: '키워드 규칙', reason: '요청 내용의 업무 키워드와 설정된 분류를 매칭했습니다.' },
        similar: [],
        method: '규칙·텍스트 유사도 기반 자동화 (생성형 AI 미사용)',
      },
    });
  });

  it('gets the first category and a "check it yourself" reason when nothing matches', async () => {
    const { data } = await suggest('안녕하세요');
    assert.deepEqual(data.classification, { category: '일반 총무', method: '키워드 규칙', reason: '명확한 키워드가 없어 기본 분류를 제안합니다. 직접 확인하세요.' });
  });

  it('treats a missing, empty or non-text body text as the empty text', async () => {
    for (const text of [undefined, '', null, 0, false]) {
      const { status, data } = await suggest(text);
      assert.equal(status, 200, String(text));
      assert.deepEqual([data.classification.category, data.similar], ['일반 총무', []], String(text));
    }
  });

  it('sees similar stored tasks best first but not test records or deleted ones, and respects the configured categories', async () => {
    const id = await seedTask('신규 입사자 노트북', '노트북 1대');
    await seedTask('신규 입사자 노트북 테스트', '노트북', true);
    const saved = await ask('/api/settings', 'POST', 'admin', { values: { categories: ['사내 자산', '기타'] }, revision: 0 });
    assert.equal(saved.status, 200);
    const { data } = await suggest('신규 입사자 노트북');
    assert.equal(data.classification.category, '사내 자산');
    assert.deepEqual(data.similar.map((item: any) => item.id), [id]);
    assert.equal(data.similar[0].status, '접수');
    assert.ok(data.similar[0].score >= 10 && data.similar[0].score <= 100);
  });

  it('only looks at the first 20000 characters of the text', async () => {
    // a keyword after position 20000 is cut off; the same keyword at position 19990 is seen
    const filler = (n: number) => 'a'.repeat(n);
    assert.equal((await suggest(filler(20000) + ' 노트북')).data.classification.reason.startsWith('명확한'), true);
    assert.equal((await suggest(filler(19990) + ' 노트북')).data.classification.reason.startsWith('요청 내용'), true);
  });

  it('is open to a read-only account only through the guard: a viewer cannot post, so gets 403', async () => {
    const result = await ask('/api/automation', 'POST', 'viewer', { text: '노트북' });
    assert.deepEqual([result.status, result.data], [403, { error: '조회 계정은 업무를 변경할 수 없습니다.' }]);
  });

  it('requires a login and knows only POST', async () => {
    assert.equal((await ask('/api/automation', 'POST', 'nobody', { text: 'x' })).status, 401);
    assert.deepEqual((await ask('/api/automation', 'GET', 'admin')).data, { error: '지원하지 않는 요청입니다.' });
  });
});
