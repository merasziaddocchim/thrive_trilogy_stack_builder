// Durable assessment-session store (TECH_DOCS §1b). Replaces the old in-memory Map so a
// session survives Render restarts/cold starts and is safe across instances.
//
// Design:
//  - ANONYMOUS: session_id is a random token tied to no identity (no email/login/account).
//  - 48-HOUR EXPIRY: nothing is kept past created_at + 48h.
//  - CLEANUP without a cron (Render free tier has none): (a) lazy delete-on-read — an expired
//    session behaves as "not found" and is removed when fetched; (b) an opportunistic sweep of
//    all expired rows on each new session creation. Both are cheap and need no background job.
//
// The persistence is behind a small SessionRepository interface so the expiry/cleanup/not-found
// LOGIC here is unit-tested with an in-memory repo (no Postgres needed), while the real
// Drizzle/Postgres repository lives in session-repository.ts.
import { randomUUID } from 'node:crypto';
import type { StoredIntake } from './assessment-service.js';

/** 48 hours. Sessions are hard-deleted past this; nothing persists longer. */
export const SESSION_TTL_MS = 48 * 60 * 60 * 1000;

export interface SessionRow {
  sessionId: string;
  data: StoredIntake;
  createdAt: Date;
  expiresAt: Date;
}

export interface SessionRepository {
  insert(row: SessionRow): Promise<void>;
  /** Insert-or-update by session_id; preserves the original created_at/expires_at on conflict. */
  upsert(row: SessionRow): Promise<void>;
  findById(id: string): Promise<SessionRow | null>;
  deleteById(id: string): Promise<void>;
  deleteExpired(now: Date): Promise<void>;
}

/**
 * Create a new anonymous session and return its random id. Runs an opportunistic sweep of
 * expired rows first (best-effort — a cleanup hiccup must never block a real save).
 * Rejects if the durable INSERT fails, so the caller can surface an error instead of
 * pretending the save succeeded.
 */
export async function createSession(
  repo: SessionRepository,
  data: StoredIntake,
  now: Date = new Date(),
): Promise<string> {
  try {
    await repo.deleteExpired(now);
  } catch {
    // Opportunistic cleanup only — don't fail a user's save because a sweep glitched.
  }
  const row: SessionRow = {
    sessionId: randomUUID(),
    data,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  };
  await repo.insert(row);
  return row.sessionId;
}

/**
 * Fetch a session's data, or undefined if it doesn't exist OR has expired. Expiry is treated
 * as "not found" (never an error), and the expired row is lazily deleted (best-effort).
 */
export async function getSession(
  repo: SessionRepository,
  id: string,
  now: Date = new Date(),
): Promise<StoredIntake | undefined> {
  const row = await repo.findById(id);
  if (!row) return undefined;
  if (row.expiresAt.getTime() <= now.getTime()) {
    try {
      await repo.deleteById(id);
    } catch {
      // Best-effort cleanup; the session is expired regardless, so still report "not found".
    }
    return undefined;
  }
  return row.data;
}

/**
 * Upsert data for an existing/new session id. Safe under retries and concurrent writes to the
 * same id (last write wins on `data`; created_at/expires_at from first creation are preserved).
 * Not used by the current linear flow (each POST /assessment mints a fresh id) — provided for
 * retry-idempotency and future incremental saves.
 */
export async function writeSession(
  repo: SessionRepository,
  id: string,
  data: StoredIntake,
  now: Date = new Date(),
): Promise<void> {
  await repo.upsert({
    sessionId: id,
    data,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  });
}
