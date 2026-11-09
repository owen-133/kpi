import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS } from '../../../../domain/PortalSettings.ts';
import { historyEntries, settingsChangeText } from './settingsChanges.ts';

const withTexts = (texts: Record<string, string>) => ({ ...DEFAULT_SETTINGS, texts: { ...DEFAULT_SETTINGS.texts, ...texts } });

test('two equal settings read as 동일한 값 저장', () => {
  assert.equal(settingsChangeText(DEFAULT_SETTINGS, DEFAULT_SETTINGS), '동일한 값 저장');
});

test('a changed text is one line: label, before → after', () => {
  const text = settingsChangeText(DEFAULT_SETTINGS, withTexts({ portalName: '우리 회사' }));
  assert.equal(text, '포털 이름: 아이지넷 → 우리 회사');
});

test('text changes come before list, color and banner changes, each on its own line in the legacy order', () => {
  const after = { ...withTexts({ footer: '끝' }), categories: ['가', '나'], primaryColor: '#000000', showBanner: false };
  assert.deepEqual(settingsChangeText(DEFAULT_SETTINGS, after).split('\n'), [
    `하단 안내: ${DEFAULT_SETTINGS.texts.footer} → 끝`,
    `업무 분류: ${DEFAULT_SETTINGS.categories.join(', ')} → 가, 나`,
    '대표 색상: #26324e → #000000',
    '배너 표시: true → false',
  ]);
});

test('every list, color and banner key has its own label', () => {
  const after = {
    ...DEFAULT_SETTINGS,
    channels: ['a'],
    priorities: ['b'],
    accentColor: '#111111',
    sidebarColor: '#222222',
    backgroundColor: '#333333',
  };
  const labels = settingsChangeText(DEFAULT_SETTINGS, after)
    .split('\n')
    .map((line) => line.split(':')[0]);
  assert.deepEqual(labels, ['접수 경로', '우선순위', '강조 색상', '사이드바 색상', '배경 색상']);
});

test('a logo change adds the fixed line and never shows the image data', () => {
  assert.equal(settingsChangeText(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, logo: 'data:image/png;base64,AAAA' }), '로고 이미지 변경');
});

test('stored values are normalized before they are compared (missing keys fall back to the defaults)', () => {
  assert.equal(settingsChangeText({}, { texts: { portalName: '아이지넷' } }), '동일한 값 저장');
  assert.equal(settingsChangeText(null, { texts: { portalName: 'X' } }), '포털 이름: 아이지넷 → X');
});

test('history entries keep the server order and show KST time, actor and the change text', () => {
  const entries = historyEntries([
    { at: '2026-05-01T00:30:00.000Z', actor: 'admin', before: {}, after: { texts: { portalName: 'A' } } },
    { at: '2026-05-01T00:20:00.000Z', actor: 'admin', before: {}, after: {} },
  ]);
  assert.equal(entries.length, 2);
  assert.equal(entries[0]?.actor, 'admin');
  assert.match(entries[0]?.when ?? '', /2026\. 5\. 1\. 오전 9:30:00/);
  assert.equal(entries[0]?.text, '포털 이름: 아이지넷 → A');
  assert.equal(entries[1]?.text, '동일한 값 저장');
});

test('no events give no entries', () => {
  assert.deepEqual(historyEntries([]), []);
});
