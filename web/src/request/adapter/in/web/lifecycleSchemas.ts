// Boundary validation of the edit and trash routes (zod). Each schema reproduces one validation block of the legacy
// server.js in the same order, with the same Korean message; the first failing stage supplies the message of the 400 answer.
//   POST /api/tasks/:id/edit                  server.js: every value is text of at most 10000 characters (checked BEFORE
//                                             trimming, unlike registration) -> title, requester, a readable request time,
//                                             a real due day -> reason 1..1000 after trimming and an integer revision >= 0
//   POST /api/tasks/:id/delete|restore|purge  server.js: reason 1..1000 after trimming; `confirmation` is
//                                             String(body.confirmation || '') and is not trimmed
import { z } from 'zod';
import { isValidDay } from '../../../../shared/domain/kstDates.ts';
import { EDITABLE_FIELDS, isReasonText, isRevision } from '../../../domain/TaskEdit.ts';
import { FIELD_MAX_LENGTH, isParsableInstant } from '../../../domain/TaskLimits.ts';
import type { NewTaskValues } from '../../../domain/TaskLimits.ts';
import type { ParseResult } from './schemas.ts';

export const LIFECYCLE_MESSAGES = {
  editField: '수정 항목을 확인하세요.',
  editRequired: '업무명·요청자·요청 시각·기한을 확인하세요.',
  editReason: '수정 사유와 버전을 확인하세요.',
  lifecycleReason: '사유를 1~1000자로 입력하세요.',
} as const;

// Legacy `body.values?.[k]`: a missing, null or non-object `values` simply has no keys.
const read = (source: unknown, key: string): unknown => (source === null || source === undefined ? undefined : (source as Record<string, unknown>)[key]);
const legacyText = (value: unknown): string => String(value || '').trim();

type EditInput = { readonly body: unknown; readonly values: NewTaskValues };
export type EditCommandValues = { readonly values: NewTaskValues; readonly revision: number; readonly reason: string };

const fieldsStage = z
  .unknown()
  .pipe(
    z.custom<unknown>(
      (body) => EDITABLE_FIELDS.every((field) => {
        const value = read(read(body, 'values'), field);
        return typeof value === 'string' && value.length <= FIELD_MAX_LENGTH;
      }),
      { error: LIFECYCLE_MESSAGES.editField },
    ),
  )
  .transform((body): EditInput => ({ body, values: Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, (read(read(body, 'values'), field) as string).trim()])) as NewTaskValues }));

const requiredStage = z.custom<EditInput>((v) => {
  const { values } = v as EditInput;
  return values.title !== '' && values.requester !== '' && isParsableInstant(values.requested_at) && (values.due_date === '' || isValidDay(values.due_date));
}, { error: LIFECYCLE_MESSAGES.editRequired });

const reasonStage = z
  .custom<EditInput>((v) => {
    const { body } = v as EditInput;
    return isReasonText(legacyText(read(body, 'reason'))) && isRevision(read(body, 'revision'));
  }, { error: LIFECYCLE_MESSAGES.editReason })
  .transform(({ body, values }): EditCommandValues => ({ values, revision: read(body, 'revision') as number, reason: legacyText(read(body, 'reason')) }));

const editSchema = fieldsStage.pipe(requiredStage).pipe(reasonStage);

export type LifecycleValues = { readonly reason: string; readonly confirmation: string };
const lifecycleSchema = z
  .unknown()
  .transform((body) => ({ reason: legacyText(read(body, 'reason')), confirmation: String(read(body, 'confirmation') || '') }))
  .pipe(z.custom<LifecycleValues>((v) => isReasonText((v as LifecycleValues).reason), { error: LIFECYCLE_MESSAGES.lifecycleReason }));

function parseWith<T>(schema: z.ZodType<T>, body: unknown): ParseResult<T> {
  const result = schema.safeParse(body);
  return result.success ? { ok: true, value: result.data } : { ok: false, message: result.error.issues[0].message };
}

export const parseEdit = (body: Record<string, unknown>): ParseResult<EditCommandValues> => parseWith(editSchema, body);
export const parseLifecycle = (body: Record<string, unknown>): ParseResult<LifecycleValues> => parseWith(lifecycleSchema, body);
