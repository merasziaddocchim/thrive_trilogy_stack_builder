import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

// Migrations are generated as plain SQL files committed to ./drizzle and reviewed,
// per TECH_DOCS §1 auditability requirement.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
