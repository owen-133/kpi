import { CallLog } from '../../../../../../shared/adapter/in/web/ui/testing/CallLog.ts';
import { createAttachmentApi, type AttachmentApi, type UploadBody } from '../AttachmentApi.ts';

export class FakeAttachmentApi implements AttachmentApi {
  readonly log = new CallLog();
  nextFileId = 'new-file';

  async upload(taskId: string, body: UploadBody): Promise<{ readonly id: string }> {
    this.log.record('upload', [taskId, body]);
    return { id: this.nextFileId };
  }

  async remove(taskId: string, fileId: string): Promise<{ readonly ok: true }> {
    this.log.record('remove', [taskId, fileId]);
    return { ok: true };
  }

  downloadUrl(taskId: string, fileId: string): string {
    // the link is pure, so the fake shares the real one
    return createAttachmentApi({ request: () => Promise.reject(new Error('unused')) }).downloadUrl(taskId, fileId);
  }
}
