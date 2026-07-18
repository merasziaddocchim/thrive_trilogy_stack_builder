import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

// End-to-end CORS check: boot the real Express app with a production + localhost origin list
// and confirm the middleware reflects an allowed origin and refuses a disallowed one. Set the
// env BEFORE importing the app, since config/env parses process.env at module load. A dummy
// DATABASE_URL satisfies the schema; /health is dependency-free so no real DB is touched.
process.env.DATABASE_URL ??= 'postgres://user:pass@localhost:5432/db';
process.env.FRONTEND_ORIGIN = 'https://app.thrivetrilogy.com,http://localhost:3000';

async function boot() {
  const { createApp } = await import('../app.js');
  const app = createApp();
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const port = (server.address() as AddressInfo).port;
  return { server, base: `http://127.0.0.1:${port}` };
}

test('CORS reflects the production origin app.thrivetrilogy.com', async () => {
  const { server, base } = await boot();
  try {
    const res = await fetch(`${base}/health`, { headers: { Origin: 'https://app.thrivetrilogy.com' } });
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://app.thrivetrilogy.com');
  } finally {
    server.close();
  }
});

test('CORS still allows local dev origin from the same comma-separated list', async () => {
  const { server, base } = await boot();
  try {
    const res = await fetch(`${base}/health`, { headers: { Origin: 'http://localhost:3000' } });
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  } finally {
    server.close();
  }
});

test('CORS does NOT reflect a disallowed origin', async () => {
  const { server, base } = await boot();
  try {
    const res = await fetch(`${base}/health`, { headers: { Origin: 'https://evil.example.com' } });
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  } finally {
    server.close();
  }
});
