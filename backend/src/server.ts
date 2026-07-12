import { createApp } from './app.js';
import { env } from './config/env.js';

// Standard Node start path (no platform lock-in). Render runs `npm start` -> `node dist/server.js`.
const app = createApp();

app.listen(env.PORT, () => {
  console.log(`stackoptimizer-backend listening on :${env.PORT} (${env.NODE_ENV})`);
});
