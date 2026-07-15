import { Router } from 'express';

// Lightweight liveness endpoint. Kept dependency-free so it stays fast even on a
// cold Render instance (TECH_DOCS §5).
export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'stackoptimizer-backend' });
});

// Readiness check: confirms the deployed backend can actually reach the database.
// GET /health/db → { db: 'ok' } if a trivial query succeeds, else 503 with the reason.
// The db client is imported lazily so the plain liveness route above stays dependency-free
// and fast (this route is the one that pays the connection cost, only when called).
healthRouter.get('/db', async (_req, res) => {
  try {
    const { db } = await import('../../db/client.js');
    const { sql } = await import('drizzle-orm');
    await db.execute(sql`select 1`);
    res.json({ db: 'ok' });
  } catch (err) {
    res.status(503).json({ db: 'unreachable', detail: err instanceof Error ? err.message : String(err) });
  }
});
