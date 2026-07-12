// In-memory assessment store. V1 keeps captured intake in process memory keyed by an id —
// enough to bridge POST /assessment → GET preview/report within a session. Durable user-side
// persistence (user_profiles / user_stack_items in Postgres) is a later step; this is
// deliberately simple and FLAGGED as non-durable (lost on restart, not shared across
// instances). See TECH_DOCS §1 user-side tables for the eventual home.
import { randomUUID } from 'node:crypto';
import type { StoredIntake } from './assessment-service.js';

const store = new Map<string, StoredIntake>();

export function saveIntake(intake: StoredIntake): string {
  const id = randomUUID();
  store.set(id, intake);
  return id;
}

export function getIntake(id: string): StoredIntake | undefined {
  return store.get(id);
}
