// Evidence seed runner — inserts the web-verified batch-1 data (seed-data.ts) into Postgres.
// Idempotent: explicit UUIDs + ON CONFLICT DO NOTHING, so re-running is safe. Requires
// DATABASE_URL. Run with: npm run db:seed  (after db:migrate).
//
// NOTE: this has NOT been executed against a live database in the authoring environment
// (no DATABASE_URL / Neon reachable here) — it type-checks and is logically ordered by FK
// dependency, but the founder should run it once against the real DB and confirm row counts.
import { db } from './client.js';
import {
  sources,
  compounds,
  doseRecords,
  bioavailabilityRecords,
  interactionRecords,
  scoringParameters,
} from './schema.js';
import {
  SEED_SOURCES,
  SEED_COMPOUNDS,
  SEED_DOSE_RECORDS,
  SEED_BIOAVAILABILITY_RECORDS,
  SEED_INTERACTION_RECORDS,
  SEED_SCORING_PARAMETERS,
} from './seed-data.js';

async function main() {
  // Insertion order respects foreign keys: sources & compounds first, then records that
  // reference them, then the Layer-3 scoring parameters last.
  await db.insert(sources).values(SEED_SOURCES).onConflictDoNothing();
  await db.insert(compounds).values(SEED_COMPOUNDS).onConflictDoNothing();
  await db.insert(doseRecords).values(SEED_DOSE_RECORDS).onConflictDoNothing();
  await db.insert(bioavailabilityRecords).values(SEED_BIOAVAILABILITY_RECORDS).onConflictDoNothing();
  await db.insert(interactionRecords).values(SEED_INTERACTION_RECORDS).onConflictDoNothing();
  await db.insert(scoringParameters).values(SEED_SCORING_PARAMETERS).onConflictDoNothing();

  console.log(
    `Seeded evidence batch 1: ${SEED_SOURCES.length} sources, ${SEED_COMPOUNDS.length} compounds, ` +
      `${SEED_DOSE_RECORDS.length} dose_records, ${SEED_BIOAVAILABILITY_RECORDS.length} bioavailability_records, ` +
      `${SEED_INTERACTION_RECORDS.length} interaction_records, ${SEED_SCORING_PARAMETERS.length} scoring_parameters.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
