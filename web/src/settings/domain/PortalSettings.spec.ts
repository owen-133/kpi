// R-029 R-028
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, TEXT_FIELDS, SettingsValidationError, normalizeSettings, validateSettings, isSettingsRevision } from './PortalSettings.ts';

const text = (key: string, value: unknown) => ({ ...DEFAULT_SETTINGS, texts: { ...DEFAULT_SETTINGS.texts, [key]: value } });
const rejects = (input: unknown, message: string) =>
  assert.throws(() => validateSettings(input), (error: unknown) => error instanceof SettingsValidationError && error.message === message, message);

describe('settings validation: the 17 invalid values pinned by the characterization test', () => {
  const LIST = (label: string) => `${label}은 1~30개, 항목별 1~50자로 입력하세요.`;
  const cases: Array<[string, unknown, string]> = [
    ['null', null, '설정 형식을 확인하세요.'],
    ['array', [], '설정 형식을 확인하세요.'],
    ['string', 'x', '설정 형식을 확인하세요.'],
    ['unknown setting', { ...DEFAULT_SETTINGS, script: 'x' }, '지원하지 않는 설정입니다.'],
    ['unknown text', text('noSuchText', 'a'), '지원하지 않는 문구입니다.'],
    ['blank name', text('portalName', '   '), '포털 이름은 1~1000자로 입력하세요.'],
    ['name 1001', text('portalName', '가'.repeat(1001)), '포털 이름은 1~1000자로 입력하세요.'],
    ['text not a string', text('portalName', 7), '포털 이름은 1~1000자로 입력하세요.'],
    ['categories empty', { ...DEFAULT_SETTINGS, categories: [] }, LIST('업무 분류')],
    ['categories 31', { ...DEFAULT_SETTINGS, categories: Array.from({ length: 31 }, (_, i) => '분류' + i) }, LIST('업무 분류')],
    ['category 51 chars', { ...DEFAULT_SETTINGS, categories: ['가'.repeat(51)] }, LIST('업무 분류')],
    ['channel empty text', { ...DEFAULT_SETTINGS, channels: [''] }, LIST('접수 경로')],
    ['channel blank text', { ...DEFAULT_SETTINGS, channels: ['  '] }, LIST('접수 경로')],
    ['channel not a string', { ...DEFAULT_SETTINGS, channels: [3] }, LIST('접수 경로')],
    ['priorities empty', { ...DEFAULT_SETTINGS, priorities: [] }, LIST('우선순위')],
    ['priorities not an array', { ...DEFAULT_SETTINGS, priorities: 'x' }, LIST('우선순위')],
    ['categories duplicate', { ...DEFAULT_SETTINGS, categories: ['같음', '같음'] }, '업무 분류에 중복 항목이 있습니다.'],
    ['duplicate after trim', { ...DEFAULT_SETTINGS, channels: ['구두', ' 구두 '] }, '접수 경로에 중복 항목이 있습니다.'],
    ['color name', { ...DEFAULT_SETTINGS, primaryColor: 'red' }, '색상 형식을 확인하세요.'],
    ['color short', { ...DEFAULT_SETTINGS, accentColor: '#fff' }, '색상 형식을 확인하세요.'],
    ['color injection', { ...DEFAULT_SETTINGS, primaryColor: 'red;display:none' }, '색상 형식을 확인하세요.'],
    ['color 7 digits', { ...DEFAULT_SETTINGS, sidebarColor: '#1234567' }, '색상 형식을 확인하세요.'],
    ['color not a string', { ...DEFAULT_SETTINGS, backgroundColor: 123456 }, '색상 형식을 확인하세요.'],
    ['banner string', { ...DEFAULT_SETTINGS, showBanner: 'yes' }, '배너 표시 설정을 확인하세요.'],
    ['logo svg', { ...DEFAULT_SETTINGS, logo: 'data:image/svg+xml;base64,AAAA' }, '로고는 200KB 이하 PNG, JPEG, WebP 이미지를 사용하세요.'],
    ['logo http url', { ...DEFAULT_SETTINGS, logo: 'http://x.example/a.png' }, '로고는 200KB 이하 PNG, JPEG, WebP 이미지를 사용하세요.'],
    ['logo not a string', { ...DEFAULT_SETTINGS, logo: 5 }, '로고는 200KB 이하 PNG, JPEG, WebP 이미지를 사용하세요.'],
    ['logo 280001', { ...DEFAULT_SETTINGS, logo: 'data:image/png;base64,' + 'A'.repeat(280000 - 22 + 1) }, '로고는 200KB 이하 PNG, JPEG, WebP 이미지를 사용하세요.'],
  ];
  for (const [name, input, message] of cases) it(`rejects ${name} with its exact message`, () => rejects(input, message));

  it('rejects a string for texts because its characters become unknown text keys', () => rejects({ ...DEFAULT_SETTINGS, texts: 'ab' }, '지원하지 않는 문구입니다.'));
  it('checks the keys before the values (unknown key wins over a bad color)', () => rejects({ primaryColor: 'red', script: 1 }, '지원하지 않는 설정입니다.'));
});

describe('settings validation: boundaries that are accepted', () => {
  it('accepts a 1000 character text and keeps it', () => {
    assert.equal(validateSettings(text('portalName', '가'.repeat(1000))).texts.portalName.length, 1000);
  });
  it('measures the text length before trimming (1001 with outer spaces is refused, 1000 + spaces is not trimmed first)', () => {
    rejects(text('portalName', ' ' + '가'.repeat(1000)), '포털 이름은 1~1000자로 입력하세요.');
  });
  it('accepts 30 items of 50 characters', () => {
    const many = Array.from({ length: 30 }, (_, i) => String(i).padStart(2, '0') + '가'.repeat(48));
    const result = validateSettings({ ...DEFAULT_SETTINGS, categories: many });
    assert.equal(result.categories.length, 30);
    assert.equal(result.categories[0].length, 50);
  });
  it('accepts a logo of exactly 280000 characters and an empty logo', () => {
    const logo = 'data:image/png;base64,' + 'A'.repeat(280000 - 22);
    assert.equal(logo.length, 280000);
    assert.equal(validateSettings({ ...DEFAULT_SETTINGS, logo }).logo.length, 280000);
    assert.equal(validateSettings({ ...DEFAULT_SETTINGS, logo: '' }).logo, '');
  });
  it('accepts png, jpeg and webp data urls and upper case hex colors', () => {
    for (const kind of ['png', 'jpeg', 'webp']) assert.equal(validateSettings({ ...DEFAULT_SETTINGS, logo: `data:image/${kind};base64,QQ==` }).logo, `data:image/${kind};base64,QQ==`);
    assert.equal(validateSettings({ ...DEFAULT_SETTINGS, primaryColor: '#AABBCC' }).primaryColor, '#AABBCC');
  });
  it('fills a partial update from the defaults', () => {
    const result = validateSettings({ showBanner: false });
    assert.equal(result.showBanner, false);
    assert.deepEqual(result.categories, DEFAULT_SETTINGS.categories);
    assert.deepEqual(result.texts, DEFAULT_SETTINGS.texts);
  });
  it('accepts an empty object and returns exactly the defaults', () => assert.deepEqual(validateSettings({}), DEFAULT_SETTINGS));
  it('trims texts and list items', () => {
    const result = validateSettings({ ...text('portalName', '  우리 회사  '), channels: [' 구두 ', '전화'] });
    assert.equal(result.texts.portalName, '우리 회사');
    assert.deepEqual(result.channels, ['구두', '전화']);
  });
  it('lets markup through as plain text (it is rendered as text, never as HTML)', () => {
    assert.equal(validateSettings(text('portalName', '<img src=x onerror=alert(1)>')).texts.portalName, '<img src=x onerror=alert(1)>');
  });
  it('accepts texts as an array and fills the default texts (legacy quirk pinned by the characterization test)', () => {
    assert.deepEqual(validateSettings({ ...DEFAULT_SETTINGS, texts: [] }).texts, DEFAULT_SETTINGS.texts);
  });
  it('does not change its input', () => {
    const input = { ...DEFAULT_SETTINGS, categories: [' 가 '] };
    validateSettings(input);
    assert.deepEqual(input.categories, [' 가 ']);
  });
});

describe('normalization of stored settings', () => {
  it('fills missing values from the defaults', () => assert.deepEqual(normalizeSettings({}), DEFAULT_SETTINGS));
  it('replaces the retired brand texts by the current defaults', () => {
    const result = normalizeSettings({ texts: { portalName: 'orbit.ops', brandSubtitle: 'GENERAL AFFAIRS', logoLetter: 'o', workspaceName: 'MY WORKSPACE', profileName: '총무 워크스페이스', pageEyebrow: 'ORBIT OPS · GENERAL AFFAIRS' } });
    assert.deepEqual(result.texts, DEFAULT_SETTINGS.texts);
  });
  it('rewrites orbit ops spellings inside a text (case and separators ignored)', () => {
    const result = normalizeSettings({ texts: { footer: 'Orbit_Ops 와 orbit - ops 그리고 ORBITOPS' } });
    assert.equal(result.texts.footer, '아이지넷 와 아이지넷 그리고 아이지넷');
  });
  it('keeps a stored text that is not a string untouched', () => assert.equal(normalizeSettings({ texts: { footer: 5 } }).texts.footer, 5));
  it('declares every text field once with a default', () => {
    assert.equal(new Set(TEXT_FIELDS.map(([key]) => key)).size, TEXT_FIELDS.length);
    assert.equal(Object.keys(DEFAULT_SETTINGS.texts).length, TEXT_FIELDS.length);
  });
});

describe('settings revision', () => {
  it('accepts non-negative integers', () => {
    for (const value of [0, 1, 41]) assert.equal(isSettingsRevision(value), true, String(value));
  });
  it('refuses missing, negative, fractional, text, null, NaN and Infinity', () => {
    for (const value of [undefined, -1, 1.5, '0', null, Number.NaN, Number.POSITIVE_INFINITY, true, [0]]) assert.equal(isSettingsRevision(value), false, String(value));
  });
});
