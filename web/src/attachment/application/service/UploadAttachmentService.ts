import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { UploadAttachmentCommand, UploadAttachmentUseCase } from '../port/in/UploadAttachmentUseCase.ts';
import { callKpi } from './callKpi.ts';

/** Every attachment is stored with this type and served with it: the file type is never trusted. */
const STORED_TYPE = 'application/octet-stream';

export class UploadAttachmentService implements UploadAttachmentUseCase {
  private readonly orbit: OrbitFunctions;

  constructor(orbit: OrbitFunctions) {
    this.orbit = orbit;
  }

  async upload(command: UploadAttachmentCommand): Promise<{ readonly id: string }> {
    const { upload } = command;
    const answer = await callKpi(this.orbit, 'file_add', {
      id: command.taskId,
      name: upload.name,
      content: upload.content,
      type: STORED_TYPE,
      size: upload.size,
    });
    const id = (answer as { id?: unknown } | null)?.id;
    if (typeof id !== 'string') throw new Error('unexpected file_add answer');
    return { id };
  }
}
