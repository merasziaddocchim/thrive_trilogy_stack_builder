// =============================================================================
// COMPOUND DEFAULT-UNIT BACKFILL — CLAIMS_COMPLIANCE §4b. 2026-08-01.
//
// Populates the column migration 0003 added. WHY A SCRIPT AND NOT THE SEED: `npm run db:seed`
// inserts with ON CONFLICT DO NOTHING and never UPDATEs, so adding `defaultUnit` to
// seed-data.ts fixes a fresh database and does nothing at all to an existing one. Without this
// script the deployed compounds keep a NULL default_unit, and — correctly, per §4b — no bare
// number would ever resolve. The feature would silently not exist in production.
//
// *** THIS SCRIPT MOVES NO SCORE. ***
// It writes one column on `compounds`. It touches no scoring_parameters row, no evidence_tier,
// no dose range. Nothing in scoring-engine/ reads `default_unit`; it is consumed only by the
// intake parser, before anything is scored, and every unit it infers is disclosed to the user
// on the Confirm screen and remains editable there.
//
// PROVENANCE (§4b: "derived from the human-reviewed evidence database ... and never from a
// global constant, a product label, a brand catalogue, or any affiliate source"). All five
// batch-1 compounds are milligram-dosed in the literature already recorded in this database:
// every dose_records row states its dose in studied_dose_min_mg/studied_dose_max_mg, and every
// scoring_parameters range in recommended_range_low_mg/recommended_range_high_mg. The values
// below are read from SEED_COMPOUNDS, which carries the same facts. No affiliate or product
// table is imported here, and none exists in this schema.
//
// A compound with no literature-established unit must be left NULL rather than defaulted to
// 'mg'. Batch 2 introduces IU- and mcg-dosed compounds where that assumption is a 1000x error.
//
// Idempotent: every write sets an absolute value, so a second run reports the same counts and
// changes nothing. Requires DATABASE_URL. Run once:
//   npm run db:default-units
// =============================================================================
import { eq, sql } from 'drizzle-orm';
import { db } from '../client.js';
import { compounds } from '../schema.js';
import { SEED_COMPOUNDS } from '../seed-data.js';
import { usableDefaultUnit } from '../../intake-parser/units.js';

async function main() {
  // Refuse to write a unit the parser cannot use — that would be indistinguishable from NULL at
  // runtime while looking populated in the database.
  for (const c of SEED_COMPOUNDS) {
    const unit = c.defaultUnit ?? null;
    if (unit != null && usableDefaultUnit(unit) == null) {
      throw new Error(`${c.canonicalName}: default unit "${unit}" is not a unit the parser accepts`);
    }
  }

  const before = await countPopulated();
  let written = 0;

  for (const c of SEED_COMPOUNDS) {
    if (c.defaultUnit == null) continue; // no established unit → leave NULL, infer nothing
    const res = await db
      .update(compounds)
      .set({ defaultUnit: c.defaultUnit })
      .where(eq(compounds.compoundId, c.compoundId as string));
    written += (res as { rowCount?: number }).rowCount ?? 0;
  }

  const after = await countPopulated();

  const rows = await db
    .select({ name: compounds.canonicalName, unit: compounds.defaultUnit })
    .from(compounds)
    .orderBy(compounds.canonicalName);

  console.log(`default_unit populated: ${before} -> ${after} (${written} row(s) written)`);
  for (const r of rows) console.log(`  ${r.name.padEnd(36)} ${r.unit ?? '(none — no unit inferred)'}`);
}

async function countPopulated(): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(compounds)
    .where(sql`${compounds.defaultUnit} is not null`);
  return r?.n ?? 0;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
