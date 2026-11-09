// Request shape of POST /api/improvements. The legacy portal coerces loosely, so the fields stay `unknown` here
// and the use case validates them (value first, then the revision of an existing entry).
import { z } from 'zod';

export const saveBodySchema = z.object({ id: z.unknown().optional(), revision: z.unknown().optional(), value: z.unknown().optional() });
