import 'dotenv/config';
import { z } from 'zod';

// Fail fast on misconfiguration rather than at first request (matters on Render cold starts).
const schema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Allowed CORS origin(s). Comma-separated so the production app AND local dev can both be
  // permitted at once. The default INCLUDES production, so CORS works even if the Render env
  // var is unset — but Render should still set this explicitly (see .env.example). Parsed
  // into a string[] for the cors() middleware, which reflects whichever origin matches.
  FRONTEND_ORIGIN: z
    .string()
    .default('https://app.thrivetrilogy.com,http://localhost:3000')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
});

export const env = schema.parse(process.env);
