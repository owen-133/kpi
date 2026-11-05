import { defineConfig } from 'drizzle-kit';

// `generate` needs no database. `migrate` reads DATABASE_URL and must use a direct or
// session connection, not the transaction pooler.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/request/adapter/out/persistence/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
