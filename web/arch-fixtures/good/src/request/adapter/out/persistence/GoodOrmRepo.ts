// Fixture: the persistence adapter may import the ORM and its drivers.
import { eq } from 'drizzle-orm';
import { PGlite } from '@electric-sql/pglite';

export const sameValue = eq;
export const database = PGlite;
