import 'dotenv/config';
import { z } from 'zod';

// Fail fast on misconfiguration rather than at first request (matters on Render cold starts).
const schema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:3000'),
});

export const env = schema.parse(process.env);
