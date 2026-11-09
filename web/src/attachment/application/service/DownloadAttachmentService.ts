import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import { decodeAttachmentContent } from '../../domain/AttachmentUpload.ts';
import type { AttachmentReference, DownloadAttachmentQuery, DownloadedAttachment } from '../port/in/DownloadAttachmentQuery.ts';
import { callKpi } from './callKpi.ts';

export class DownloadAttachmentService implements DownloadAttachmentQuery {
  private readonly orbit: OrbitFunctions;

  constructor(orbit: OrbitFunctions) {
    this.orbit = orbit;
  }

  async download(reference: AttachmentReference): Promise<DownloadedAttachment> {
    const answer = (await callKpi(this.orbit, 'file_get', { id: reference.taskId, file_id: reference.fileId })) as { name?: unknown; content?: unknown } | null;
    if (typeof answer?.name !== 'string' || typeof answer.content !== 'string') throw new Error('unexpected file_get answer');
    return { name: answer.name, bytes: decodeAttachmentContent(answer.content) };
  }
}
