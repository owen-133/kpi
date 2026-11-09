import { z } from 'zod';
import { AssigneeName } from '../../../domain/AssigneeName.ts';
import { parseTestDataFlag } from '../../../domain/TestDataFlag.ts';
import { HttpError } from '../../../../shared/adapter/in/web/http.ts';

// The body is the parsed JSON object. The rules live in the domain; these schemas only run them and report the
// first refusal as a 400 with the domain's own message.
function viaDomain<T>(parse: (body: Record<string, unknown>) => T) {
  return z.record(z.string(), z.unknown()).transform((body, context): T => {
    try {
      return parse(body);
    } catch (error) {
      context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'invalid input' });
      return z.NEVER;
    }
  });
}

const assignBody = viaDomain((body) => AssigneeName.from(body.assignee));
const testDataBody = viaDomain((body) => parseTestDataFlag(body.is_test));

function parseOrReject<T>(schema: z.ZodType<T>, body: Record<string, unknown>): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new HttpError(400, result.error.issues[0]?.message ?? 'invalid input');
  return result.data;
}

export const parseAssignBody = (body: Record<string, unknown>): AssigneeName => parseOrReject(assignBody, body);
export const parseTestDataBody = (body: Record<string, unknown>): boolean => parseOrReject(testDataBody, body);
