import { jsonResponse } from '../../../../shared/adapter/in/web/http.ts';
import type { RouteDefinition } from '../../../../shared/adapter/in/web/RouteRegistry.ts';
import type { DeleteAttachmentUseCase } from '../../../application/port/in/DeleteAttachmentUseCase.ts';
import type { DownloadAttachmentQuery } from '../../../application/port/in/DownloadAttachmentQuery.ts';
import type { UploadAttachmentUseCase } from '../../../application/port/in/UploadAttachmentUseCase.ts';
import { parseUploadBody } from './attachmentSchemas.ts';
import { withHttpFailures } from './failures.ts';

export type AttachmentUseCases = {
  readonly uploadAttachment: UploadAttachmentUseCase;
  readonly downloadAttachment: DownloadAttachmentQuery;
  readonly deleteAttachment: DeleteAttachmentUseCase;
};

// Legacy server.js has no list route (the files of a task come with its detail) and no PUT / DELETE: those, and a GET
// on /files, fall through to the guard pipeline's unsupported-request 404. Ids are passed on as raw path segments.
export function attachmentRoutes(useCases: AttachmentUseCases): readonly RouteDefinition[] {
  return [
    {
      method: 'POST',
      pattern: /^\/api\/tasks\/([^/]+)\/files$/,
      handler: (context) =>
        withHttpFailures(async () => {
          const upload = parseUploadBody(context.body);
          return jsonResponse(201, await useCases.uploadAttachment.upload({ taskId: context.params[0], upload }));
        }),
    },
    {
      method: 'GET',
      pattern: /^\/api\/tasks\/([^/]+)\/files\/([^/]+)$/,
      handler: (context) =>
        withHttpFailures(async () => {
          const file = await useCases.downloadAttachment.download({ taskId: context.params[0], fileId: context.params[1] });
          // Always an attachment, never inline, never sniffed, never cached: the stored type is not trusted.
          return new Response(file.bytes as Uint8Array<ArrayBuffer>, {
            status: 200,
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(file.name),
              'Content-Length': String(file.bytes.length),
              'Cache-Control': 'no-store',
              'X-Content-Type-Options': 'nosniff',
            },
          });
        }),
    },
    {
      method: 'POST',
      pattern: /^\/api\/tasks\/([^/]+)\/files\/([^/]+)$/,
      handler: (context) =>
        withHttpFailures(async () => jsonResponse(200, await useCases.deleteAttachment.delete({ taskId: context.params[0], fileId: context.params[1] }))),
    },
  ];
}
