import { z } from 'zod';
import { AttachmentUpload } from '../../../domain/AttachmentUpload.ts';
import { HttpError } from '../../../../shared/adapter/in/web/http.ts';

// The body is the parsed JSON object. The rules live in the domain; the schema only runs them and reports the first
// refusal as a 400 with the domain's own message. Neither the name nor the content is ever logged or echoed.
const uploadBody = z.record(z.string(), z.unknown()).transform((body, context): AttachmentUpload => {
  try {
    return AttachmentUpload.from(body.name, body.content);
  } catch (error) {
    context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'invalid input' });
    return z.NEVER;
  }
});

export function parseUploadBody(body: Record<string, unknown>): AttachmentUpload {
  const result = uploadBody.safeParse(body);
  if (!result.success) throw new HttpError(400, result.error.issues[0]?.message ?? 'invalid input');
  return result.data;
}
