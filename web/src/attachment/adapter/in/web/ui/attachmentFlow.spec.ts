import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FakeAttachmentApi } from './testing/fakeAttachmentApi.ts';
import { dataUrlBase64 } from './fileReader.ts';
import { DELETE_CONFIRM, deleteAttachment, FILE_SIZE_MESSAGE, MAX_FILE_BYTES, uploadAttachment, type DeleteDeps, type UploadDeps } from './attachmentFlow.ts';

function setup(opts: { confirm?: boolean; read?: (file: { name: string; size: number }) => Promise<string> } = {}) {
  const api = new FakeAttachmentApi();
  const events: string[] = [];
  const toast = (message: string) => api.log.record('toast', [message]);
  const reload = async () => api.log.record('reload', []);
  const upload: UploadDeps<{ name: string; size: number }> = {
    api,
    toast,
    reload,
    readBase64: opts.read ?? (async (file) => {
      api.log.record('read', [file.name]);
      return 'QUJD';
    }),
    setDisabled: (on) => events.push(on ? 'disabled' : 'enabled'),
    clear: () => events.push('cleared'),
  };
  const asked: string[] = [];
  const remove: DeleteDeps = {
    api,
    toast,
    reload,
    confirm: (message) => {
      asked.push(message);
      return opts.confirm ?? true;
    },
  };
  return { api, events, asked, upload, remove };
}

test('the size limits are 1 byte and 1 MB', () => {
  assert.equal(MAX_FILE_BYTES, 1048576);
  assert.equal(FILE_SIZE_MESSAGE, '파일은 1바이트~1MB까지 가능합니다.');
});

test('a file reads, uploads with its name and base64 content, reloads and toasts in that order', async () => {
  const s = setup();
  assert.equal(await uploadAttachment('t1', { name: '견적서.pdf', size: 1000 }, s.upload), 'uploaded');
  assert.deepEqual(s.api.log.names(), ['read', 'upload', 'reload', 'toast']);
  assert.deepEqual(s.api.log.argsOf('upload'), [['t1', { name: '견적서.pdf', content: 'QUJD' }]]);
  assert.deepEqual(s.api.log.argsOf('toast'), [['첨부파일을 저장했습니다.']]);
  assert.deepEqual(s.events, ['disabled']);
});

test('no file chosen (the picker was cancelled) does nothing at all', async () => {
  const s = setup();
  assert.equal(await uploadAttachment('t1', undefined, s.upload), 'none');
  assert.deepEqual(s.api.log.names(), []);
  assert.deepEqual(s.events, []);
});

for (const [label, size, refused] of [
  ['an empty file', 0, true],
  ['one byte', 1, false],
  ['exactly 1 MB', 1048576, false],
  ['one byte over 1 MB', 1048577, true],
] as const) {
  test(`${label} is ${refused ? 'refused with the size message, the input is cleared and nothing is read or sent' : 'accepted'}`, async () => {
    const s = setup();
    const outcome = await uploadAttachment('t1', { name: 'a.txt', size }, s.upload);
    if (refused) {
      assert.equal(outcome, 'refused');
      assert.deepEqual(s.api.log.names(), ['toast']);
      assert.deepEqual(s.api.log.argsOf('toast'), [['파일은 1바이트~1MB까지 가능합니다.']]);
      assert.deepEqual(s.events, ['cleared']);
    } else {
      assert.equal(outcome, 'uploaded');
      assert.ok(s.api.log.names().includes('upload'));
    }
  });
}

test('a server refusal toasts its message, does not reload and enables the input again', async () => {
  const s = setup();
  s.api.log.failNext('upload', '업무당 첨부파일은 10개까지입니다.');
  assert.equal(await uploadAttachment('t1', { name: 'a.txt', size: 5 }, s.upload), 'failed');
  assert.deepEqual(s.api.log.names(), ['read', 'upload', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['업무당 첨부파일은 10개까지입니다.']]);
  assert.deepEqual(s.events, ['disabled', 'enabled']);
});

test('a read error without a message toasts the fixed text and sends nothing', async () => {
  const s = setup({ read: async () => Promise.reject({ type: 'error' }) });
  assert.equal(await uploadAttachment('t1', { name: 'a.txt', size: 5 }, s.upload), 'failed');
  assert.deepEqual(s.api.log.names(), ['toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['파일 업로드 실패']]);
  assert.deepEqual(s.events, ['disabled', 'enabled']);
});

test('the data URL keeps only the part after the first comma', () => {
  assert.equal(dataUrlBase64('data:text/plain;base64,QUJD'), 'QUJD');
  assert.equal(dataUrlBase64('data:application/octet-stream;base64,'), '');
});

test('deleting asks first, removes the file, reloads and stays silent on success (no toast)', async () => {
  const s = setup();
  assert.equal(await deleteAttachment('t1', 'f9', s.remove), 'done');
  assert.deepEqual(s.asked, [DELETE_CONFIRM]);
  assert.equal(DELETE_CONFIRM, '첨부파일을 삭제할까요? 삭제 사실은 업무 이력에 남습니다.');
  assert.deepEqual(s.api.log.argsOf('remove'), [['t1', 'f9']]);
  assert.deepEqual(s.api.log.names(), ['remove', 'reload']);
});

test('a declined delete confirmation removes nothing', async () => {
  const s = setup({ confirm: false });
  assert.equal(await deleteAttachment('t1', 'f9', s.remove), 'cancelled');
  assert.deepEqual(s.api.log.names(), []);
});

test('a failed delete toasts the message and does not reload', async () => {
  const s = setup();
  s.api.log.failNext('remove', '파일을 찾을 수 없습니다.');
  assert.equal(await deleteAttachment('t1', 'f9', s.remove), 'failed');
  assert.deepEqual(s.api.log.names(), ['remove', 'toast']);
  assert.deepEqual(s.api.log.argsOf('toast'), [['파일을 찾을 수 없습니다.']]);
});
