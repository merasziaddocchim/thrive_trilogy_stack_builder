import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSession,
  getSession,
  writeSession,
  SESSION_TTL_MS,
  type SessionRepository,
  type SessionRow,
} from './session-store.js';
import type { StoredIntake } from './assessment-service.js';

// In-memory SessionRepository so the expiry / cleanup / not-found LOGIC is fully tested
// without Postgres. The real Drizzle repository (session-repository.ts) mirrors these ops.
class InMemorySessionRepository implements SessionRepository {
  rows = new Map<string, SessionRow>();
  failDeleteExpired = false;
  failDeleteById = false;

  async insert(row: SessionRow): Promise<void> {
    this.rows.set(row.sessionId, { ...row });
  }
  async upsert(row: SessionRow): Promise<void> {
    const existing = this.rows.get(row.sessionId);
    // Preserve original created_at/expires_at on conflict; only data changes (last-write-wins).
    this.rows.set(row.sessionId, existing ? { ...existing, data: row.data } : { ...row });
  }
  async findById(id: string): Promise<SessionRow | null> {
    return this.rows.get(id) ?? null;
  }
  async deleteById(id: string): Promise<void> {
    if (this.failDeleteById) throw new Error('delete failed');
    this.rows.delete(id);
  }
  async deleteExpired(now: Date): Promise<void> {
    if (this.failDeleteExpired) throw new Error('sweep failed');
    for (const [k, v] of this.rows) if (v.expiresAt.getTime() <= now.getTime()) this.rows.delete(k);
  }
}

const DATA: StoredIntake = {
  goalTag: 'healthy_aging',
  stackItems: [{ compoundId: 'cmp_x', labelDoseMg: 100, deliveryFormat: null, pricePaid: 10 }],
};
const T0 = new Date('2026-07-18T00:00:00Z');

test('create then read within the 48h window returns the stored data', async () => {
  const repo = new InMemorySessionRepository();
  const id = await createSession(repo, DATA, T0);
  const got = await getSession(repo, id, new Date(T0.getTime() + 24 * 60 * 60 * 1000)); // +24h
  assert.deepEqual(got, DATA);
});

test('expires_at is exactly created_at + 48 hours', async () => {
  const repo = new InMemorySessionRepository();
  const id = await createSession(repo, DATA, T0);
  const row = await repo.findById(id);
  assert.ok(row);
  assert.equal(row.expiresAt.getTime() - row.createdAt.getTime(), SESSION_TTL_MS);
});

test('read after expiry behaves as "not found" (undefined, no throw) and removes the row', async () => {
  const repo = new InMemorySessionRepository();
  const id = await createSession(repo, DATA, T0);
  const past = new Date(T0.getTime() + SESSION_TTL_MS + 1000); // just past 48h
  const got = await getSession(repo, id, past);
  assert.equal(got, undefined);
  assert.equal(await repo.findById(id), null); // lazily deleted
});

test('read at exactly the 48h boundary is treated as expired', async () => {
  const repo = new InMemorySessionRepository();
  const id = await createSession(repo, DATA, T0);
  const got = await getSession(repo, id, new Date(T0.getTime() + SESSION_TTL_MS)); // == expiresAt
  assert.equal(got, undefined);
});

test('unknown session id returns undefined (not an error)', async () => {
  const repo = new InMemorySessionRepository();
  assert.equal(await getSession(repo, 'does-not-exist', T0), undefined);
});

test('creating a session sweeps already-expired rows (cleanup-on-create)', async () => {
  const repo = new InMemorySessionRepository();
  const oldId = await createSession(repo, DATA, T0);
  // 49h later, a new session creation should sweep the now-expired old row.
  await createSession(repo, DATA, new Date(T0.getTime() + 49 * 60 * 60 * 1000));
  assert.equal(await repo.findById(oldId), null);
});

test('a cleanup-sweep failure does NOT block saving a new session', async () => {
  const repo = new InMemorySessionRepository();
  repo.failDeleteExpired = true;
  const id = await createSession(repo, DATA, T0); // must not throw
  assert.ok(await repo.findById(id));
});

test('an expired-row delete failure still reports the session as not found', async () => {
  const repo = new InMemorySessionRepository();
  const id = await createSession(repo, DATA, T0);
  repo.failDeleteById = true;
  const got = await getSession(repo, id, new Date(T0.getTime() + SESSION_TTL_MS + 1));
  assert.equal(got, undefined);
});

test('concurrent writes to the same session id do not error; last write wins', async () => {
  const repo = new InMemorySessionRepository();
  const id = 'fixed-session-id';
  const a: StoredIntake = { ...DATA, goalTag: 'goal_a' };
  const b: StoredIntake = { ...DATA, goalTag: 'goal_b' };
  await assert.doesNotReject(Promise.all([writeSession(repo, id, a), writeSession(repo, id, b)]));
  const row = await repo.findById(id);
  assert.ok(row, 'exactly one row should exist');
  assert.ok(row.data.goalTag === 'goal_a' || row.data.goalTag === 'goal_b');
  assert.equal(repo.rows.size, 1);
});
