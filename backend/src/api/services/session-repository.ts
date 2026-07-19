// Postgres/Drizzle implementation of SessionRepository, plus the thin wrappers the routes use.
// The `db` client is imported lazily so this module loads without DATABASE_URL; only an actual
// query needs the database. UNTESTED against a live DB in the authoring environment (no
// DATABASE_URL / Neon reachable) — type-checked and logically wired; the pure store logic it
// backs (expiry, cleanup, not-found) is fully unit-tested via an in-memory repo.
import { eq, lte } from 'drizzle-orm';
import {
  createSession,
  getSession,
  type SessionRepository,
  type SessionRow,
} from './session-store.js';
import type { StoredIntake } from './assessment-service.js';

async function getDb() {
  const { db } = await import('../../db/client.js');
  return db;
}

export const pgSessionRepository: SessionRepository = {
  async insert(row) {
    const db = await getDb();
    const { assessmentSessions } = await import('../../db/schema.js');
    await db.insert(assessmentSessions).values({
      sessionId: row.sessionId,
      data: row.data,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    });
  },

  async upsert(row) {
    const db = await getDb();
    const { assessmentSessions } = await import('../../db/schema.js');
    await db
      .insert(assessmentSessions)
      .values({
        sessionId: row.sessionId,
        data: row.data,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
      })
      // Preserve the original created_at/expires_at (the 48h window is anchored to first save).
      .onConflictDoUpdate({ target: assessmentSessions.sessionId, set: { data: row.data } });
  },

  async findById(id): Promise<SessionRow | null> {
    const db = await getDb();
    const { assessmentSessions } = await import('../../db/schema.js');
    const [r] = await db
      .select()
      .from(assessmentSessions)
      .where(eq(assessmentSessions.sessionId, id))
      .limit(1);
    if (!r) return null;
    return {
      sessionId: r.sessionId,
      data: r.data as StoredIntake,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
    };
  },

  async deleteById(id) {
    const db = await getDb();
    const { assessmentSessions } = await import('../../db/schema.js');
    await db.delete(assessmentSessions).where(eq(assessmentSessions.sessionId, id));
  },

  async deleteExpired(now) {
    const db = await getDb();
    const { assessmentSessions } = await import('../../db/schema.js');
    await db.delete(assessmentSessions).where(lte(assessmentSessions.expiresAt, now));
  },
};

/** POST /assessment → create a durable session, return its id. Rejects if the DB write fails. */
export function createAssessmentSession(data: StoredIntake): Promise<string> {
  return createSession(pgSessionRepository, data);
}

/** GET preview/report → load a session's intake, or undefined if missing/expired. */
export function getAssessmentSession(id: string): Promise<StoredIntake | undefined> {
  return getSession(pgSessionRepository, id);
}
