import type { OrbitFunctions } from '../../../shared/port/OrbitFunctions.ts';
import type { AttachmentReference } from '../port/in/DownloadAttachmentQuery.ts';
import type { DeleteAttachmentUseCase } from '../port/in/DeleteAttachmentUseCase.ts';
import { callKpi } from './callKpi.ts';

export class DeleteAttachmentService implements DeleteAttachmentUseCase {
  private readonly orbit: OrbitFunctions;

  constructor(orbit: OrbitFunctions) {
    this.orbit = orbit;
  }

  async delete(reference: AttachmentReference): Promise<{ readonly ok: true }> {
    await callKpi(this.orbit, 'file_delete', { id: reference.taskId, file_id: reference.fileId });
    return { ok: true };
  }
}
