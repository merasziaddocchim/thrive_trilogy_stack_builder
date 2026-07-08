import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { env } from '../config/env.js';
import * as schema from './schema.js';

// Use Neon's pooled endpoint. Pooling + a lean request path mitigate the
// Render + Neon double-cold-start risk documented in TECH_DOCS §5.
const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });
export type DB = typeof db;
