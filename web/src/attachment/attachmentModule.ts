// Composition of the attachment context: services over the shared OrbitFunctions port, wrapped in the context's routes.
// The database is opened on first use, so building the routes never touches it.
import { DeleteAttachmentService } from './application/service/DeleteAttachmentService.ts';
import { DownloadAttachmentService } from './application/service/DownloadAttachmentService.ts';
import { UploadAttachmentService } from './application/service/UploadAttachmentService.ts';
import { attachmentRoutes } from './adapter/in/web/routes.ts';
import type { RouteDefinition } from '../shared/adapter/in/web/RouteRegistry.ts';
import type { OrbitFunctions } from '../shared/port/OrbitFunctions.ts';

export function attachmentModule(openDatabase: () => Promise<OrbitFunctions>): readonly RouteDefinition[] {
  const orbit: OrbitFunctions = { call: async (name, args) => (await openDatabase()).call(name, args) };
  return attachmentRoutes({
    uploadAttachment: new UploadAttachmentService(orbit),
    downloadAttachment: new DownloadAttachmentService(orbit),
    deleteAttachment: new DeleteAttachmentService(orbit),
  });
}
