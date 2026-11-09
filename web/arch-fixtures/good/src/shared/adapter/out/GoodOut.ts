// Fixture: shared/adapter/out may import server-only and the ORM.
import 'server-only';
import { sql } from 'drizzle-orm';

export const good = sql;
