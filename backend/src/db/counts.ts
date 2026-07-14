// Read-only row-count check for the evidence tables. Prints how many rows exist in each
// layer so you can confirm whether a seed actually loaded. Runs no writes. Requires
// DATABASE_URL. Run with: npm run db:counts
import { sql } from 'drizzle-orm';
import { db } from './client.js';
import {
  sources,
  compounds,
  doseRecords,
  bioavailabilityRecords,
  interactionRecords,
  scoringParameters,
} from './schema.js';

const TABLES = {
  sources,
  compounds,
  dose_records: doseRecords,
  bioavailability_records: bioavailabilityRecords,
  interaction_records: interactionRecords,
  scoring_parameters: scoringParameters,
} as const;

async function main() {
  const counts: Record<string, number> = {};
  for (const [label, table] of Object.entries(TABLES)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(table as any);
    counts[label] = row?.n ?? 0;
  }
  console.log('Evidence table row counts:');
  for (const [label, n] of Object.entries(counts)) {
    console.log(`  ${label.padEnd(24)} ${n}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
