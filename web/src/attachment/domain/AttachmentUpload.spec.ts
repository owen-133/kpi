import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AttachmentUpload,
  InvalidAttachmentError,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_FILES_PER_TASK,
  MAX_BASE64_LENGTH,
  TOO_LARGE_MESSAGE,
  UNSUPPORTED_MESSAGE,
  decodeAttachmentContent,
  isAllowedAttachmentName,
} from './AttachmentUpload.ts';

const b64 = (bytes: number): string => Buffer.alloc(bytes, 65).toString('base64');
const rejection = (message: string) => (e: unknown) => e instanceof InvalidAttachmentError && e.message === message;

describe('AttachmentUpload [R-015]', () => {
  it('states the legacy limits and messages', () => {
    assert.equal(MAX_ATTACHMENT_BYTES, 1048576);
    assert.equal(MAX_ATTACHMENT_FILES_PER_TASK, 10);
    assert.equal(MAX_BASE64_LENGTH, 1398104);
    assert.equal(UNSUPPORTED_MESSAGE, '지원 파일: PDF·이미지·TXT·CSV·XLSX·DOCX, 최대 1MB');
    assert.equal(TOO_LARGE_MESSAGE, '첨부파일은 1MB 이하여야 합니다.');
  });

  it('accepts 1, 1048575 and 1048576 bytes and keeps the size', () => {
    for (const size of [1, 1048575, 1048576]) {
      const upload = AttachmentUpload.from(`size-${size}.txt`, b64(size));
      assert.equal(upload.size, size);
      assert.equal(upload.content, b64(size));
    }
  });

  it('rejects 1048577 bytes with the size message and an over-long base64 text with the support message', () => {
    assert.throws(() => AttachmentUpload.from('over.txt', b64(1048577)), rejection(TOO_LARGE_MESSAGE));
    assert.equal(b64(1048577).length, MAX_BASE64_LENGTH);
    assert.throws(() => AttachmentUpload.from('over.txt', b64(1048579)), rejection(UNSUPPORTED_MESSAGE));
  });

  it('rejects content that decodes to zero bytes with the size message and empty content with the support message', () => {
    assert.throws(() => AttachmentUpload.from('a.txt', 'A'), rejection(TOO_LARGE_MESSAGE));
    assert.throws(() => AttachmentUpload.from('a.txt', ''), rejection(UNSUPPORTED_MESSAGE));
    assert.throws(() => AttachmentUpload.from('a.txt', undefined), rejection(UNSUPPORTED_MESSAGE));
  });

  it('rejects content with characters outside the base64 alphabet, spaces and padding in the middle', () => {
    for (const content of ['QQ==!', 'Q Q==', 'QQ==\n', '=QQ', 'Q=Q']) {
      assert.throws(() => AttachmentUpload.from('a.txt', content), rejection(UNSUPPORTED_MESSAGE), JSON.stringify(content));
    }
  });

  it('allows the nine extensions in any case and refuses others, including a name with no extension', () => {
    for (const ext of ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'csv', 'xlsx', 'docx', 'PNG', 'DocX']) {
      assert.equal(isAllowedAttachmentName(`file.${ext}`), true, ext);
    }
    for (const name of ['위험.exe', '확장자없음', 'a.html', 'a.txt.exe', 'a.pdfx', '.png.', '']) {
      assert.equal(isAllowedAttachmentName(name), false, name);
    }
    assert.throws(() => AttachmentUpload.from('위험.exe', 'QQ=='), rejection(UNSUPPORTED_MESSAGE));
  });

  it('replaces separators and line breaks with an underscore and cuts the name to 150 characters', () => {
    assert.equal(AttachmentUpload.from('a/b\\c.txt', 'QQ==').name, 'a_b_c.txt');
    assert.equal(AttachmentUpload.from('a\r\nb.txt', 'QQ==').name, 'a__b.txt');
    const exact = 'x'.repeat(146) + '.txt';
    assert.equal(AttachmentUpload.from(exact, 'QQ==').name, exact);
    assert.throws(() => AttachmentUpload.from('x'.repeat(147) + '.txt', 'QQ=='), rejection(UNSUPPORTED_MESSAGE));
  });

  it('coerces a missing name to empty and stores the canonical base64 of the decoded bytes', () => {
    assert.throws(() => AttachmentUpload.from(undefined, 'QQ=='), rejection(UNSUPPORTED_MESSAGE));
    assert.equal(AttachmentUpload.from('a.txt', 'QQ').content, 'QQ==');
    assert.equal(AttachmentUpload.from('a.txt', 'QR==').content, 'QQ==');
  });

  it('decodes stored content back to bytes', () => {
    assert.deepEqual([...decodeAttachmentContent('QUJD')], [65, 66, 67]);
  });
});
