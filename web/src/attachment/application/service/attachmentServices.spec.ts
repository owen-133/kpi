// Given / When / Then specs of the attachment use cases over a fake OrbitFunctions port.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UploadAttachmentService } from './UploadAttachmentService.ts';
import { DownloadAttachmentService } from './DownloadAttachmentService.ts';
import { DeleteAttachmentService } from './DeleteAttachmentService.ts';
import { AttachmentRejectedError, KpiMigrationRequiredError } from '../port/in/AttachmentRejectedError.ts';
import { AttachmentUpload } from '../../domain/AttachmentUpload.ts';
import { OrbitFunctionError } from '../../../shared/port/OrbitFunctions.ts';
import type { OrbitFunctionArguments, OrbitFunctionName, OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';

class FakeOrbit implements OrbitFunctions {
  readonly calls: Array<{ name: OrbitFunctionName; args: OrbitFunctionArguments }> = [];
  private readonly outcome: () => unknown;
  constructor(outcome: () => unknown) {
    this.outcome = outcome;
  }
  async call(name: OrbitFunctionName, args: OrbitFunctionArguments): Promise<unknown> {
    this.calls.push({ name, args });
    return this.outcome();
  }
}
const failing = (message: string, code: string) => () => {
  throw new OrbitFunctionError(message, code);
};

describe('UploadAttachmentService [R-015]', () => {
  it('Given a task / When a file is uploaded / Then orbit_kpi file_add gets name, canonical content, octet-stream type and size, and the new id comes back', async () => {
    const orbit = new FakeOrbit(() => ({ id: 'file-1' }));
    const result = await new UploadAttachmentService(orbit).upload({ taskId: 't', upload: AttachmentUpload.from('a/b.txt', 'QQ') });
    assert.deepEqual(result, { id: 'file-1' });
    assert.deepEqual(orbit.calls, [
      { name: 'orbit_kpi', args: { action: 'file_add', payload: { id: 't', name: 'a_b.txt', content: 'QQ==', type: 'application/octet-stream', size: 1 } } },
    ]);
  });

  it('Given ten files already / When another is uploaded / Then the limit message of the database is a rejection (invalid)', async () => {
    const service = new UploadAttachmentService(new FakeOrbit(failing('업무당 첨부파일은 10개까지 가능합니다.', 'PT400')));
    await assert.rejects(
      service.upload({ taskId: 't', upload: AttachmentUpload.from('a.txt', 'QQ==') }),
      (e: unknown) => e instanceof AttachmentRejectedError && e.reason === 'invalid' && e.message === '업무당 첨부파일은 10개까지 가능합니다.',
    );
  });

  it('Given a missing task / When a file is uploaded / Then not-found; a malformed database answer is an error, not an id', async () => {
    await assert.rejects(
      new UploadAttachmentService(new FakeOrbit(failing('업무를 찾을 수 없습니다.', 'PT404'))).upload({ taskId: 't', upload: AttachmentUpload.from('a.txt', 'QQ==') }),
      (e: unknown) => e instanceof AttachmentRejectedError && e.reason === 'not-found',
    );
    await assert.rejects(
      new UploadAttachmentService(new FakeOrbit(() => ({}))).upload({ taskId: 't', upload: AttachmentUpload.from('a.txt', 'QQ==') }),
      /unexpected/,
    );
  });
});

describe('DownloadAttachmentService [R-015]', () => {
  it('Given a stored file / When it is downloaded / Then the name and the decoded bytes come back', async () => {
    const orbit = new FakeOrbit(() => ({ id: 'f', name: '견적서.pdf', content: 'QUJD' }));
    const file = await new DownloadAttachmentService(orbit).download({ taskId: 't', fileId: 'f' });
    assert.equal(file.name, '견적서.pdf');
    assert.deepEqual([...file.bytes], [65, 66, 67]);
    assert.deepEqual(orbit.calls[0].args, { action: 'file_get', payload: { id: 't', file_id: 'f' } });
  });

  it('Given a missing file / When it is downloaded / Then not-found with the database message; a malformed answer is an error', async () => {
    await assert.rejects(
      new DownloadAttachmentService(new FakeOrbit(failing('파일을 찾을 수 없습니다.', 'PT404'))).download({ taskId: 't', fileId: 'f' }),
      (e: unknown) => e instanceof AttachmentRejectedError && e.reason === 'not-found' && e.message === '파일을 찾을 수 없습니다.',
    );
    await assert.rejects(new DownloadAttachmentService(new FakeOrbit(() => ({ name: 5 }))).download({ taskId: 't', fileId: 'f' }), /unexpected/);
  });
});

describe('DeleteAttachmentService [R-015]', () => {
  it('Given a stored file / When it is deleted / Then orbit_kpi file_delete gets both ids and the result is ok', async () => {
    const orbit = new FakeOrbit(() => ({ ok: true }));
    assert.deepEqual(await new DeleteAttachmentService(orbit).delete({ taskId: 't', fileId: 'f' }), { ok: true });
    assert.deepEqual(orbit.calls[0].args, { action: 'file_delete', payload: { id: 't', file_id: 'f' } });
  });

  it('Given a missing file / When it is deleted / Then not-found; the missing-setup failure (42883) is its own error', async () => {
    await assert.rejects(
      new DeleteAttachmentService(new FakeOrbit(failing('파일을 찾을 수 없습니다.', 'PT404'))).delete({ taskId: 't', fileId: 'f' }),
      (e: unknown) => e instanceof AttachmentRejectedError && e.reason === 'not-found',
    );
    await assert.rejects(
      new DeleteAttachmentService(new FakeOrbit(failing('function does not exist', '42883'))).delete({ taskId: 't', fileId: 'f' }),
      KpiMigrationRequiredError,
    );
  });
});
