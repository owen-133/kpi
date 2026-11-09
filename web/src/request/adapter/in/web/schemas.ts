// Boundary validation of the request routes (zod). Each schema reproduces one validation block of the legacy server.js
// in the same order, with the same Korean message; the first failing stage supplies the message of the 400 answer.
//   POST /api/tasks              server.js:  fields -> length (10000) -> required + time -> due date
//   POST /api/tasks/:id/status   server.js:  status in the list -> reason length (10000)
//   POST /api/tasks/:id/notes    server.js:  note trimmed, 1..10000
// Values are read as the legacy server reads them: `String(value || '').trim()`, so a number becomes its text, and
// null, false, 0 and a missing key become the empty text.
import { z } from 'zod';
import { isValidDay } from '../../../../shared/domain/kstDates.ts';
import { FIELD_MAX_LENGTH, NEW_TASK_FIELDS, isParsableInstant } from '../../../domain/TaskLimits.ts';
import type { NewTaskValues } from '../../../domain/TaskLimits.ts';
import { isTaskStatus } from '../../../domain/TaskStatus.ts';
import type { TaskStatus } from '../../../domain/TaskStatus.ts';

export const MESSAGES = {
  fieldLength: '입력 길이를 확인하세요.',
  requiredFields: '제목, 요청자, 요청 시각을 확인하세요.',
  dueDate: '기한을 확인하세요.',
  status: '올바른 상태를 선택하세요.',
  reasonLength: '사유가 너무 깁니다.',
  note: '메모를 1~10000자로 입력하세요.',
} as const;

const legacyText = (value: unknown): string => String(value || '').trim();
const fieldOf = (body: unknown, key: string): unknown => (body as Record<string, unknown>)[key];

const fieldsStage = z
  .unknown()
  .transform((body) => Object.fromEntries(NEW_TASK_FIELDS.map((field) => [field, legacyText(fieldOf(body, field))])) as NewTaskValues)
  .pipe(z.custom<NewTaskValues>((v) => Object.values(v as NewTaskValues).every((text) => text.length <= FIELD_MAX_LENGTH), { error: MESSAGES.fieldLength }));
const requiredStage = z.custom<NewTaskValues>((v) => {
  const values = v as NewTaskValues;
  return values.title !== '' && values.requester !== '' && values.requested_at !== '' && isParsableInstant(values.requested_at);
}, { error: MESSAGES.requiredFields });
const dueDateStage = z.custom<NewTaskValues>((v) => {
  const due = (v as NewTaskValues).due_date;
  return due === '' || isValidDay(due);
}, { error: MESSAGES.dueDate });

const newTaskSchema = fieldsStage.pipe(requiredStage).pipe(dueDateStage);

type StatusChange = { readonly status: TaskStatus; readonly reason: string };
const statusStage = z.custom<unknown>((body) => isTaskStatus(fieldOf(body, 'status')), { error: MESSAGES.status });
const reasonStage = z
  .unknown()
  .transform((body): StatusChange => ({ status: fieldOf(body, 'status') as TaskStatus, reason: legacyText(fieldOf(body, 'reason')) }))
  .pipe(z.custom<StatusChange>((v) => (v as StatusChange).reason.length <= FIELD_MAX_LENGTH, { error: MESSAGES.reasonLength }));
const statusChangeSchema = statusStage.pipe(reasonStage);

const noteSchema = z
  .unknown()
  .transform((body) => legacyText(fieldOf(body, 'note')))
  .pipe(z.custom<string>((note) => (note as string).length >= 1 && (note as string).length <= FIELD_MAX_LENGTH, { error: MESSAGES.note }))
  .transform((note) => ({ note }));

export type ParseResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly message: string };

function parseWith<T>(schema: z.ZodType<T>, body: unknown): ParseResult<T> {
  const result = schema.safeParse(body);
  return result.success ? { ok: true, value: result.data } : { ok: false, message: result.error.issues[0].message };
}

export const parseNewTask = (body: Record<string, unknown>): ParseResult<NewTaskValues> => parseWith(newTaskSchema, body);
export const parseStatusChange = (body: Record<string, unknown>): ParseResult<StatusChange> => parseWith(statusChangeSchema, body);
export const parseNote = (body: Record<string, unknown>): ParseResult<{ note: string }> => parseWith(noteSchema, body);
