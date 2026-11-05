// Fixture: config/database.ts may import the ORM and its drivers.
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export const connect = (url: string) => drizzle(postgres(url));
