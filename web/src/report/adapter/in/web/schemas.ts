// Request shapes of the report routes. The legacy portal coerces loosely (String(x || '')), so the body fields stay
// `unknown` here and the use case applies the coercions; the query month is text or absent.
import { z } from 'zod';

export const publishBodySchema = z.object({ month: z.unknown().optional(), fingerprint: z.unknown().optional(), draft: z.unknown().optional() });

export const previewQuerySchema = z.object({ month: z.string().nullable() });
