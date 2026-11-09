// R-028 R-029
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_PASSWORD, VIEWER_PASSWORD } from '../../../../parity/credentials.ts';
import { startNextCandidate } from '../../../../parity/nextCandidate.ts';
import { DEFAULT_SETTINGS } from '../../../domain/PortalSettings.ts';
import { DEFAULT_CATEGORIES } from '../../../../shared/domain/categories.ts';

const ORIGIN = 'http://settings.test';
const basic = (user: string, password: string): string => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
const logged: string[] = [];
const sessionPromise = startNextCandidate({ log: (line) => logged.push(line) });
after(async () => (await sessionPromise).stop?.());

async function ask(path: string, who: 'admin' | 'viewer', body?: unknown): Promise<{ status: number; data: any }> {
  const response = await (await sessionPromise).handle(
    new Request(ORIGIN + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: who === 'admin' ? basic('admin', ADMIN_PASSWORD) : basic('viewer', VIEWER_PASSWORD), 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  return { status: response.status, data: await response.json() };
}
const withText = (key: string, value: string) => ({ ...DEFAULT_SETTINGS, texts: { ...DEFAULT_SETTINGS.texts, [key]: value } });
const current = async () => (await ask('/api/settings', 'admin')).data;
const history = async () => (await ask('/api/settings/history', 'admin')).data as Array<any>;

describe('An administrator manages the portal settings, one scenario in order', () => {
  it('starts from the defaults at version 0 with no history', async () => {
    const first = await ask('/api/settings', 'admin');
    assert.equal(first.status, 200);
    assert.deepEqual(first.data, { values: DEFAULT_SETTINGS, revision: 0, available: true });
    assert.deepEqual(await history(), []);
  });

  it('keeps the shared category defaults and the settings defaults identical', () => assert.deepEqual([...DEFAULT_CATEGORIES], [...DEFAULT_SETTINGS.categories]));

  it('refuses every invalid value with its own message and leaves version and history alone', async () => {
    const cases: Array<[unknown, string]> = [
      [null, '설정 형식을 확인하세요.'],
      [{ ...DEFAULT_SETTINGS, script: 'x' }, '지원하지 않는 설정입니다.'],
      [withText('noSuchText', 'a'), '지원하지 않는 문구입니다.'],
      [withText('portalName', '가'.repeat(1001)), '포털 이름은 1~1000자로 입력하세요.'],
      [{ ...DEFAULT_SETTINGS, categories: Array.from({ length: 31 }, (_, i) => '분류' + i) }, '업무 분류은 1~30개, 항목별 1~50자로 입력하세요.'],
      [{ ...DEFAULT_SETTINGS, categories: ['같음', '같음'] }, '업무 분류에 중복 항목이 있습니다.'],
      [{ ...DEFAULT_SETTINGS, accentColor: '#fff' }, '색상 형식을 확인하세요.'],
      [{ ...DEFAULT_SETTINGS, showBanner: 'yes' }, '배너 표시 설정을 확인하세요.'],
      [{ ...DEFAULT_SETTINGS, logo: 'data:image/svg+xml;base64,PHN2Zz48c2NyaXB0Pg==' }, '로고는 200KB 이하 PNG, JPEG, WebP 이미지를 사용하세요.'],
      [{ ...DEFAULT_SETTINGS, logo: 'data:image/png;base64,' + 'A'.repeat(280000 - 22 + 1) }, '로고는 200KB 이하 PNG, JPEG, WebP 이미지를 사용하세요.'],
    ];
    for (const [values, message] of cases) {
      const result = await ask('/api/settings', 'admin', { values, revision: 0 });
      assert.deepEqual([result.status, result.data], [400, { error: message }], message);
    }
    assert.equal((await current()).revision, 0);
    assert.deepEqual(await history(), []);
  });

  it('refuses a missing, negative, fractional, text or null version before looking at the values', async () => {
    for (const revision of [undefined, -1, 1.5, '0', null]) {
      const result = await ask('/api/settings', 'admin', { values: { ...DEFAULT_SETTINGS, primaryColor: 'red' }, revision });
      assert.deepEqual([result.status, result.data], [400, { error: '설정 버전을 확인하세요.' }], String(revision));
    }
  });

  it('answers a bad value with 400, not 409, even when the version is stale', async () => {
    const result = await ask('/api/settings', 'admin', { values: { ...DEFAULT_SETTINGS, primaryColor: 'red' }, revision: 99 });
    assert.deepEqual([result.status, result.data], [400, { error: '색상 형식을 확인하세요.' }]);
  });

  it('answers a missing values field with the format message', async () => {
    const result = await ask('/api/settings', 'admin', { revision: 0 });
    assert.deepEqual([result.status, result.data], [400, { error: '설정 형식을 확인하세요.' }]);
  });

  it('saves the boundary values (1000 character text, 30 items of 50 characters, 280000 character logo) one version at a time', async () => {
    const longText = '가'.repeat(1000);
    const many = Array.from({ length: 30 }, (_, i) => String(i).padStart(2, '0') + '가'.repeat(48));
    const logo = 'data:image/png;base64,' + 'A'.repeat(280000 - 22);
    const one = await ask('/api/settings', 'admin', { values: withText('portalName', longText), revision: 0 });
    assert.equal(one.status, 200);
    assert.equal(one.data.revision, 1);
    assert.equal(one.data.values.texts.portalName, longText);
    const two = await ask('/api/settings', 'admin', { values: { ...DEFAULT_SETTINGS, categories: many }, revision: 1 });
    assert.equal(two.data.revision, 2);
    assert.equal(two.data.values.categories[0].length, 50);
    const three = await ask('/api/settings', 'admin', { values: { ...DEFAULT_SETTINGS, logo }, revision: 2 });
    assert.equal(three.status, 200);
    assert.equal(three.data.revision, 3);
    assert.equal((await current()).revision, 3);
  });

  it('fills a partial update from the defaults and trims texts', async () => {
    const partial = await ask('/api/settings', 'admin', { values: { showBanner: false }, revision: 3 });
    assert.equal(partial.status, 200);
    assert.equal(partial.data.values.showBanner, false);
    assert.deepEqual(partial.data.values.categories, DEFAULT_SETTINGS.categories);
    const trimmed = await ask('/api/settings', 'admin', { values: withText('portalName', '  우리 회사  '), revision: 4 });
    assert.equal(trimmed.data.values.texts.portalName, '우리 회사');
  });

  it('reports a stale version as 409 with the conflict message and keeps the stored version', async () => {
    const stale = await ask('/api/settings', 'admin', { values: withText('boardTitle', '낡은 버전'), revision: 0 });
    assert.deepEqual([stale.status, stale.data], [409, { error: '다른 화면에서 설정이 변경됐습니다. 다시 불러온 뒤 저장하세요.' }]);
    assert.equal((await current()).revision, 5);
  });

  it('lets a viewer read the settings but not save them or read the history, and nothing changes', async () => {
    const count = (await history()).length;
    const write = await ask('/api/settings', 'viewer', { values: withText('boardTitle', '조회 계정 시도'), revision: 5 });
    assert.deepEqual([write.status, write.data], [403, { error: '조회 계정은 업무를 변경할 수 없습니다.' }]);
    const read = await ask('/api/settings', 'viewer');
    assert.equal(read.status, 200);
    assert.equal(read.data.revision, 5);
    assert.notEqual(read.data.values.texts.boardTitle, '조회 계정 시도');
    const viewerHistory = await ask('/api/settings/history', 'viewer');
    assert.deepEqual([viewerHistory.status, viewerHistory.data], [403, { error: '관리자만 설정 이력을 볼 수 있습니다.' }]);
    assert.equal((await history()).length, count);
  });

  it('records every save in the history as admin, newest first, with the values before and after', async () => {
    const entries = await history();
    assert.equal(entries.length, 5);
    assert.ok(entries.every((entry) => entry.actor === 'admin'));
    assert.equal(entries[0].after.texts.portalName, '우리 회사');
    assert.equal(entries[0].before.showBanner, false);
    assert.equal(entries[4].before.showBanner, undefined);
  });

  it('does not write values or request details to the log when the database raises an unexpected error', async () => {
    const marker = 'MARKER-홍길동-010-1234-5678';
    // revision 3000000000 passes the integer rule but overflows the database integer: an unexpected database error
    const result = await ask('/api/settings', 'admin', { values: withText('footer', marker), revision: 3_000_000_000 });
    assert.equal(result.status, 503);
    assert.deepEqual(result.data, { error: '데이터 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    assert.ok(logged.length > 0, 'the failure is logged');
    assert.ok(logged.every((line) => !line.includes(marker) && !line.includes('3000000000')), logged.join('\n'));
    assert.match(logged[0], /^Request failed: route=\/api\/settings status=503 error=/);
  });

  it('refuses other methods on the settings paths like any unknown route', async () => {
    const response = await (await sessionPromise).handle(
      new Request(ORIGIN + '/api/settings/history', { method: 'POST', headers: { Authorization: basic('admin', ADMIN_PASSWORD) }, body: '{}' }),
    );
    assert.equal(response.status, 404);
  });
});
