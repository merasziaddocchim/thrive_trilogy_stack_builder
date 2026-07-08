import { Router } from 'express';

// Lightweight liveness endpoint. Kept dependency-free so it stays fast even on a
// cold Render instance (TECH_DOCS §5).
export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'stackoptimizer-backend' });
});
