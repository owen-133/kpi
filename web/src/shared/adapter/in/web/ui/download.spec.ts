import assert from 'node:assert/strict';
import { test } from 'node:test';
import { downloadBlob, downloadText, type DownloadPort } from './download.ts';

function fakePort() {
  const log: string[] = [];
  const blobs: Blob[] = [];
  const timers: Array<{ run: () => void; ms: number }> = [];
  const port: DownloadPort = {
    createObjectUrl(blob) {
      blobs.push(blob);
      log.push('create');
      return 'blob:fake-1';
    },
    click(url, filename) {
      log.push(`click ${url} ${filename}`);
    },
    revokeObjectUrl(url) {
      log.push(`revoke ${url}`);
    },
    later(run, ms) {
      timers.push({ run, ms });
    },
  };
  return { port, log, blobs, timers };
}

test('downloadBlob creates the url, clicks the anchor and revokes the url a second later, not before', () => {
  const f = fakePort();
  downloadBlob(f.port, '파일.csv', new Blob(['a']));
  assert.deepEqual(f.log, ['create', 'click blob:fake-1 파일.csv']);
  assert.equal(f.timers.length, 1);
  assert.equal(f.timers[0].ms, 1000);
  f.timers[0].run();
  assert.deepEqual(f.log, ['create', 'click blob:fake-1 파일.csv', 'revoke blob:fake-1']);
});

test('downloadText puts a byte order mark before the text and defaults to plain text', async () => {
  const f = fakePort();
  downloadText(f.port, 'a.txt', '내용');
  assert.equal(f.blobs[0].type, 'text/plain;charset=utf-8');
  // Blob.text() strips a leading mark, so the raw bytes are compared
  const bytes = [...new Uint8Array(await f.blobs[0].arrayBuffer())];
  assert.deepEqual(bytes.slice(0, 3), [0xef, 0xbb, 0xbf]);
  assert.deepEqual(bytes.slice(3), [...Buffer.from('내용', 'utf8')]);
});

test('downloadText keeps the given content type', () => {
  const f = fakePort();
  downloadText(f.port, 'a.csv', 'x', 'text/csv;charset=utf-8');
  assert.equal(f.blobs[0].type, 'text/csv;charset=utf-8');
});

test('downloadBlob adds nothing to the blob it is given', async () => {
  const f = fakePort();
  downloadBlob(f.port, 'a.pdf', new Blob(['%PDF'], { type: 'application/pdf' }));
  assert.equal(await f.blobs[0].text(), '%PDF');
  assert.equal(f.blobs[0].type, 'application/pdf');
});
