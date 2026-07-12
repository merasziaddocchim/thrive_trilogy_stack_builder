import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { healthRouter } from './api/routes/health.js';
import { assessmentRouter } from './api/routes/assessment.js';
import { intakeRouter } from './api/routes/intake.js';

// Express app factory - separated from server bootstrap so it can be imported in tests.
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/health', healthRouter);
  app.use('/assessment', assessmentRouter);
  app.use('/intake', intakeRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  return app;
}
