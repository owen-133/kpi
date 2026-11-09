import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS, TEXT_FIELDS } from '../../../../domain/PortalSettings.ts';
import type { SettingsEnvelope } from './SettingsApi.ts';
import {
  LOGO_READING_MESSAGE,
  RESET_CONFIRM_MESSAGE,
  SAVED_TOAST,
  loadHistory,
  openSettingsForm,
  pickLogo,
  readSettingsValues,
  resetSettings,
  saveSettings,
  type SettingsActions,
} from './settingsFlow.ts';
import { FakeSettingsApi } from './testing/fakeSettingsApi.ts';

class RecordingActions implements SettingsActions {
  readonly calls: Array<[string, ...unknown[]]> = [];
  toast(message: string): void {
    this.calls.push(['toast', message]);
  }
  applySettings(saved: SettingsEnvelope): void {
    this.calls.push(['applySettings', saved]);
  }
  close(dialog: 'settings'): void {
    this.calls.push(['close', dialog]);
  }
  names(): string[] {
    return this.calls.map((c) => c[0]);
  }
}

// What the form posts when nothing was edited.
function formOf(over: Record<string, string | null> = {}): FormData {
  const fd = new FormData();
  for (const [key, , value] of TEXT_FIELDS) fd.set('text_' + key, value);
  fd.set('categories', ' 가 \r\n\r\n나\n');
  fd.set('channels', '메신저');
  fd.set('priorities', '중\n상');
  fd.set('primaryColor', '#26324e');
  fd.set('accentColor', '#ff866f');
  fd.set('sidebarColor', '#192238');
  fd.set('backgroundColor', '#f5f6fb');
  fd.set('showBanner', 'on');
  for (const [key, value] of Object.entries(over)) {
    if (value === null) fd.delete(key);
    else fd.set(key, value);
  }
  return fd;
}

test('reading the form: lines are trimmed and empty ones dropped, the banner is its presence, the logo is the draft one', () => {
  const values = readSettingsValues(formOf({ showBanner: null }), 'data:image/png;base64,AAAA') as Record<string, unknown>;
  assert.deepEqual(values.categories, ['가', '나']);
  assert.deepEqual(values.priorities, ['중', '상']);
  assert.equal(values.showBanner, false);
  assert.equal(values.logo, 'data:image/png;base64,AAAA');
  assert.equal(values.primaryColor, '#26324e');
  assert.equal((values.texts as Record<string, string>).portalName, '아이지넷');
});

test('opening reads the settings and returns the normalized draft with the revision', async () => {
  const api = new FakeSettingsApi();
  api.envelope = { values: { texts: { portalName: '우리 회사' }, showBanner: false }, revision: 4, available: true };
  const actions = new RecordingActions();
  const form = await openSettingsForm(() => api.get(), actions);
  assert.equal(form?.revision, 4);
  assert.equal(form?.available, true);
  assert.equal(form?.draft.texts.portalName, '우리 회사');
  assert.equal(form?.draft.showBanner, false);
  assert.equal(form?.draft.categories.length, DEFAULT_SETTINGS.categories.length, 'missing keys come from the defaults');
  assert.deepEqual(actions.calls, [], 'a successful open toasts nothing and closes nothing');
});

test('an unavailable database is carried to the form with its message', async () => {
  const api = new FakeSettingsApi();
  api.envelope = { values: {}, revision: 0, available: false, message: 'DB 초기화가 필요합니다.' };
  const form = await openSettingsForm(() => api.get(), new RecordingActions());
  assert.equal(form?.available, false);
  assert.equal(form?.message, 'DB 초기화가 필요합니다.');
});

test('a failed read toasts its message and closes the dialog; no form is returned', async () => {
  const api = new FakeSettingsApi();
  api.log.failNext('get', '서버 오류');
  const actions = new RecordingActions();
  assert.equal(await openSettingsForm(() => api.get(), actions), null);
  assert.deepEqual(actions.calls, [['toast', '서버 오류'], ['close', 'settings']]);
});

test('saving validates, posts values with the opened revision, then applies, closes and toasts in that order', async () => {
  const api = new FakeSettingsApi();
  const actions = new RecordingActions();
  const error = await saveSettings({ api, actions, form: formOf({ text_portalName: ' 새 이름 ' }), logo: '', revision: 7, readingLogo: false });
  assert.equal(error, null);
  assert.deepEqual(api.log.names(), ['save']);
  const body = api.log.argsOf('save')[0]?.[0] as { values: { texts: Record<string, string>; categories: string[] }; revision: number };
  assert.equal(body.revision, 7);
  assert.equal(body.values.texts.portalName, '새 이름', 'validation trims texts before the post');
  assert.deepEqual(body.values.categories, ['가', '나']);
  assert.deepEqual(actions.names(), ['applySettings', 'close', 'toast']);
  assert.equal((actions.calls[0]?.[1] as SettingsEnvelope).revision, 8, 'apply gets the saved answer');
  assert.deepEqual(actions.calls[2], ['toast', SAVED_TOAST]);
  assert.equal(SAVED_TOAST, '관리자 설정이 저장되었습니다.');
});

test('a logo still being read refuses the save with its message and calls nothing', async () => {
  const api = new FakeSettingsApi();
  const actions = new RecordingActions();
  const error = await saveSettings({ api, actions, form: formOf(), logo: '', revision: 0, readingLogo: true });
  assert.equal(error, '로고 이미지를 읽는 중입니다. 잠시 후 저장하세요.');
  assert.equal(LOGO_READING_MESSAGE, error);
  assert.deepEqual(api.log.names(), []);
  assert.deepEqual(actions.calls, []);
});

test('an empty list is rejected by validation: the message comes back, nothing is posted, applied, closed or toasted', async () => {
  const api = new FakeSettingsApi();
  const actions = new RecordingActions();
  const error = await saveSettings({ api, actions, form: formOf({ categories: '' }), logo: '', revision: 0, readingLogo: false });
  assert.equal(error, '업무 분류은 1~30개, 항목별 1~50자로 입력하세요.');
  assert.deepEqual(api.log.names(), []);
  assert.deepEqual(actions.calls, []);
});

test('an invalid color, a duplicate item and an empty text each come back as the domain message without a post', async () => {
  const cases: Array<[Record<string, string>, string]> = [
    [{ primaryColor: 'red' }, '색상 형식을 확인하세요.'],
    [{ channels: '메신저\n메신저' }, '접수 경로에 중복 항목이 있습니다.'],
    [{ text_portalName: '   ' }, '포털 이름은 1~1000자로 입력하세요.'],
  ];
  for (const [over, message] of cases) {
    const api = new FakeSettingsApi();
    const actions = new RecordingActions();
    assert.equal(await saveSettings({ api, actions, form: formOf(over), logo: '', revision: 0, readingLogo: false }), message);
    assert.deepEqual(api.log.names(), []);
    assert.deepEqual(actions.calls, []);
  }
});

test('a rejected logo (not an image data URL) is a validation message', async () => {
  const api = new FakeSettingsApi();
  const error = await saveSettings({ api, actions: new RecordingActions(), form: formOf(), logo: 'http://x', revision: 0, readingLogo: false });
  assert.equal(error, '로고는 200KB 이하 PNG, JPEG, WebP 이미지를 사용하세요.');
  assert.deepEqual(api.log.names(), []);
});

test('a conflict answer from the server stays in the dialog: message returned, nothing applied, closed or toasted', async () => {
  const api = new FakeSettingsApi();
  api.log.failNext('save', '다른 관리자가 설정을 먼저 저장했습니다. 창을 다시 열어 확인하세요.');
  const actions = new RecordingActions();
  const error = await saveSettings({ api, actions, form: formOf(), logo: '', revision: 2, readingLogo: false });
  assert.equal(error, '다른 관리자가 설정을 먼저 저장했습니다. 창을 다시 열어 확인하세요.');
  assert.deepEqual(api.log.names(), ['save'], 'the post was made');
  assert.deepEqual(actions.calls, []);
});

const png = { name: 'logo.png', type: 'image/png', size: 1000 };
const okReaders = (calls: string[]) => ({
  readDataUrl: async () => (calls.push('read'), 'data:image/png;base64,AAAA'),
  checkImage: async () => void calls.push('check'),
});

test('a good file is read, checked as an image, and offered with its file name in the status', async () => {
  const calls: string[] = [];
  const choice = await pickLogo(png, okReaders(calls));
  assert.deepEqual(choice, { url: 'data:image/png;base64,AAAA', status: 'logo.png · 저장하면 적용됩니다.' });
  assert.deepEqual(calls, ['read', 'check']);
});

test('the 200KB border: 200*1024 bytes pass, one more is refused; a wrong type is refused; neither is read', async () => {
  const calls: string[] = [];
  assert.ok('url' in (await pickLogo({ ...png, size: 200 * 1024 }, okReaders(calls))));
  calls.length = 0;
  const message = '200KB 이하의 PNG·JPEG·WebP 파일을 선택하세요.';
  assert.deepEqual(await pickLogo({ ...png, size: 200 * 1024 + 1 }, okReaders(calls)), { error: message, clearInput: true });
  assert.deepEqual(await pickLogo({ ...png, type: 'image/svg+xml' }, okReaders(calls)), { error: message, clearInput: true });
  assert.deepEqual(await pickLogo({ ...png, type: 'image/gif' }, okReaders(calls)), { error: message, clearInput: true });
  assert.deepEqual(calls, [], 'refused files are neither read nor checked');
});

test('a file that cannot be read or is not an image gives that error and offers no logo', async () => {
  const unreadable = await pickLogo(png, {
    readDataUrl: async () => {
      throw new Error('파일을 읽지 못했습니다.');
    },
    checkImage: async () => {},
  });
  assert.deepEqual(unreadable, { error: '파일을 읽지 못했습니다.' });
  const checked: string[] = [];
  const broken = await pickLogo(png, {
    readDataUrl: async () => 'data:image/png;base64,AAAA',
    checkImage: async () => {
      checked.push('check');
      throw new Error('유효한 이미지 파일을 선택하세요.');
    },
  });
  assert.deepEqual(broken, { error: '유효한 이미지 파일을 선택하세요.' });
  assert.deepEqual(checked, ['check']);
});

test('reset asks first: yes gives a copy of the defaults, no gives nothing', () => {
  const asked: string[] = [];
  const yes = resetSettings((m) => (asked.push(m), true));
  assert.deepEqual(yes, DEFAULT_SETTINGS);
  assert.notEqual(yes, DEFAULT_SETTINGS, 'a copy, so the defaults stay untouched');
  assert.equal(resetSettings((m) => (asked.push(m), false)), null);
  assert.deepEqual(asked, [RESET_CONFIRM_MESSAGE, RESET_CONFIRM_MESSAGE]);
  assert.equal(RESET_CONFIRM_MESSAGE, '입력 중인 설정을 기본값으로 바꿀까요? 저장 전에는 다른 사용자에게 적용되지 않습니다.');
});

test('history comes back as entries, or the read error message', async () => {
  const api = new FakeSettingsApi();
  assert.deepEqual(await loadHistory(() => api.history()), { entries: [] });
  api.events = [{ at: '2026-05-01T00:30:00.000Z', actor: 'admin', before: {}, after: { texts: { portalName: 'A' } } }];
  const loaded = await loadHistory(() => api.history());
  assert.ok('entries' in loaded);
  assert.equal(loaded.entries[0]?.text, '포털 이름: 아이지넷 → A');
  api.log.failNext('history', '이력을 읽지 못했습니다.');
  assert.deepEqual(await loadHistory(() => api.history()), { error: '이력을 읽지 못했습니다.' });
});
