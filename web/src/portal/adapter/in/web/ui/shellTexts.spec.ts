import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS } from '../../../../../settings/domain/PortalSettings.ts';
import {
  DEFAULT_SHELL_TEXTS,
  LIVE_BULLET,
  bootFailureText,
  colorVariables,
  documentTitle,
  navLabels,
  pageHeading,
  resolveSettings,
  shellTexts,
} from './shellTexts.ts';

const custom = (texts: Record<string, string>) => resolveSettings({ texts });

test('resolveSettings merges stored values over the defaults like normalizeSettings({})', () => {
  assert.deepEqual(resolveSettings({}).texts, DEFAULT_SETTINGS.texts);
  assert.equal(resolveSettings({ texts: { portalName: '내 포털' } }).texts.portalName, '내 포털');
  assert.equal(resolveSettings(undefined).primaryColor, DEFAULT_SETTINGS.primaryColor);
});

test('the legacy document title is the portal name plus the fixed suffix', () => {
  assert.equal(documentTitle(DEFAULT_SETTINGS.texts), '아이지넷 · 총무 업무 포털');
  assert.equal(documentTitle(custom({ portalName: 'X' }).texts), 'X · 총무 업무 포털');
});

test('default shell texts reproduce the static index.html texts', () => {
  const d = DEFAULT_SHELL_TEXTS;
  assert.equal(d.brandName, '아이지넷');
  assert.equal(d.brandSubtitle, '총무 업무 포털');
  assert.equal(d.logoLetter, 'AI');
  assert.equal(d.workspaceName, '아이지넷 워크스페이스');
  assert.equal(d.workspaceDescription, '총무 업무를 연결하는 공간');
  assert.equal(d.workspaceLabel, 'WORKSPACE');
  assert.equal(d.pageEyebrow, 'AIJINET · GENERAL AFFAIRS');
  assert.equal(d.footer, '아이지넷 · 요청부터 완료까지, 업무의 모든 순간을 기록합니다.');
  assert.equal(d.breadcrumbLabel, 'Workspace ');
  assert.equal(d.profileName, '아이지넷 총무');
  assert.equal(d.profileInitials, 'GA');
  assert.equal(d.newTaskButton, '＋ 새 업무 등록');
  assert.equal(d.liveLabel, LIVE_BULLET + '업무 워크스페이스');
  assert.equal(d.roleLabel, '업무 관리');
  assert.equal(d.createTitle, '새 업무 등록');
  assert.equal(d.createDescription, '구두·메신저로 받은 요청을 기록해 주세요.');
});

test('applying settings follows app.js applySettings: plain text replaces, live label loses its bullet, role picks the key', () => {
  const settings = custom({ liveLabel: '라이브', profileName: '나', newTaskLabel: '등록', createDescription: '설명', breadcrumbLabel: '경로', adminRole: 'A', viewerRole: 'V' });
  const admin = shellTexts(settings, 'admin');
  assert.equal(admin.liveLabel, '라이브');
  assert.equal(admin.profileName, '나');
  assert.equal(admin.newTaskButton, '＋ 등록');
  assert.equal(admin.createTitle, '등록');
  assert.equal(admin.createDescription, '설명');
  assert.equal(admin.breadcrumbLabel, '경로 ');
  assert.equal(admin.roleLabel, 'A');
  assert.equal(shellTexts(settings, 'viewer').roleLabel, 'V');
});

test('with the default settings applied the text is the default one, but the role label and live bullet differ from the static page', () => {
  const applied = shellTexts(resolveSettings({}), 'admin');
  assert.equal(applied.roleLabel, '총무 담당자 · 업무 관리');
  assert.equal(applied.liveLabel, '업무 워크스페이스');
});

test('navLabels reads <view>Menu for the four views', () => {
  assert.deepEqual(navLabels(custom({ overviewMenu: 'O', boardMenu: 'B', reportMenu: 'R', improvementsMenu: 'I' }).texts), {
    overview: 'O',
    board: 'B',
    report: 'R',
    improvements: 'I',
  });
  assert.deepEqual(navLabels(DEFAULT_SETTINGS.texts), { overview: 'Overview', board: '업무 보드', report: '업무 실적', improvements: '개선 이력' });
});

test('pageHeading returns breadcrumb, title and subtitle of the view as render() does', () => {
  const t = custom({ boardMenu: 'bm', boardTitle: 'bt', boardSubtitle: 'bs', improvementsMenu: 'im', improvementsTitle: 'it', improvementsSubtitle: 'is' }).texts;
  assert.deepEqual(pageHeading('board', t), ['bm', 'bt', 'bs']);
  assert.deepEqual(pageHeading('improvements', t), ['im', 'it', 'is']);
  assert.deepEqual(pageHeading('overview', DEFAULT_SETTINGS.texts), ['Overview', '좋은 하루예요, 총무 담당자님 ☀', '작은 요청부터 중요한 업무까지, 오늘의 흐름을 한눈에.']);
  assert.deepEqual(pageHeading('report', DEFAULT_SETTINGS.texts), ['업무 실적', '쌓인 기록이 업무의 성과로', '처리한 업무와 소요 시간을 데이터로 확인하세요.']);
});

test('colorVariables maps the four css variables to their settings keys in legacy order', () => {
  assert.deepEqual(colorVariables(resolveSettings({ primaryColor: '#111111', accentColor: '#222222', sidebarColor: '#333333', backgroundColor: '#444444' })), [
    ['--primary', '#111111'],
    ['--accent', '#222222'],
    ['--nav', '#333333'],
    ['--bg', '#444444'],
  ]);
});

test('a boot failure shows the legacy sentence with the error message', () => {
  assert.equal(bootFailureText('로그인이 필요합니다.'), '데이터를 불러오지 못했습니다. 로그인이 필요합니다.');
});
