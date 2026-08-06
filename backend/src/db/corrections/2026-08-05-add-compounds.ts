// =============================================================================
// BATCH-2 COMPOUND REGISTRY — CLAIMS_COMPLIANCE §4e. 2026-08-05.
//
// Inserts 36 recognition-only compounds. WHY A SCRIPT AND NOT THE SEED: `npm run db:seed`
// inserts with ON CONFLICT DO NOTHING and never UPDATEs, so adding rows to seed-data.ts fixes
// a fresh database and does nothing to an existing one. Without this script the deployed
// registry keeps the batch-1 five, and a user typing "creatine" is still told it is not
// recognized — the exact failure this batch exists to remove.
//
// *** THIS SCRIPT MOVES NO SCORE. ***
// It writes rows to `compounds` and NOTHING ELSE. It creates no scoring_parameters row, no
// source, no dose record. Every compound it inserts therefore has no Evidence Tier, no studied
// range and no direction of evidence — which is precisely §4e's subject, not an oversight. No
// existing compound is touched: batch-1 ids live in SEED_COMPOUND_IDS and are not in this set,
// and the insert cannot update a row it collides with.
//
// PREREQUISITE — MIGRATION 0004. Six of the categories written here (micronutrient, fatty_acid,
// amino_acid, botanical_extract, structural_compound, hormone) do not exist in the
// compound_category enum until `npm run db:migrate` has applied
// drizzle/0004_compound_category_expansion.sql. Running this first fails with
// "invalid input value for enum compound_category". The preflight below checks for it and
// stops with that instruction rather than a raw Postgres error.
//
// The enum values must be committed before they can be used — verified on PostgreSQL 16.13 —
// which is why they ship in a migration and the rows ship here, in a later transaction.
//
// PROVENANCE. Canonical names, aliases and units are the founder-supplied registry list; no
// value comes from a product label, a brand catalogue or an affiliate source (§4b forbids that
// outright, and §4e adds that recognition "carries no statement about the compound"). Every
// mechanismSummary is deliberately NULL for the same reason: a mechanism summary is a
// statement about a compound whose evidence nobody has reviewed yet.
//
// Idempotent: ON CONFLICT DO NOTHING on the primary key, so a second run inserts nothing and
// reports 0 written. Requires DATABASE_URL. Run once, after db:migrate:
//   npm run db:migrate && npm run db:add-compounds
// =============================================================================
import { inArray, sql } from 'drizzle-orm';
import { db } from '../client.js';
import { compounds } from '../schema.js';
import { BATCH2_COMPOUNDS, BATCH2_COMPOUND_IDS, SEED_COMPOUND_IDS } from '../seed-data.js';
import { usableDefaultUnit } from '../../intake-parser/units.js';

async function main() {
  const ids = Object.values(BATCH2_COMPOUND_IDS) as string[];
  const batch1 = new Set(Object.values(SEED_COMPOUND_IDS) as string[]);

  // ---- preflight ------------------------------------------------------------------------
  // A unit the parser cannot use is worse than NULL: it looks populated but infers nothing.
  for (const c of BATCH2_COMPOUNDS) {
    const unit = c.defaultUnit ?? null;
    if (unit != null && usableDefaultUnit(unit) == null) {
      throw new Error(`${c.canonicalName}: default unit "${unit}" is not a unit the parser accepts`);
    }
    if (batch1.has(c.compoundId as string)) {
      throw new Error(`${c.canonicalName}: id collides with a batch-1 compound — refusing to run`);
    }
  }

  // Migration 0004 must already be applied, or every insert fails on the enum.
  const needed = ['micronutrient', 'fatty_acid', 'amino_acid', 'botanical_extract', 'structural_compound', 'hormone'];
  const present = await db.execute<{ v: string }>(
    sql`select unnest(enum_range(NULL::compound_category))::text as v`,
  );
  const have = new Set((present.rows ?? (present as unknown as Array<{ v: string }>)).map((r) => r.v));
  const missing = needed.filter((v) => !have.has(v));
  if (missing.length > 0) {
    throw new Error(
      `compound_category is missing ${missing.join(', ')} — run "npm run db:migrate" first ` +
        '(drizzle/0004_compound_category_expansion.sql).',
    );
  }

  // ---- write ----------------------------------------------------------------------------
  const before = await countRegistry(ids);

  const res = await db.insert(compounds).values(BATCH2_COMPOUNDS).onConflictDoNothing();
  const written = (res as { rowCount?: number }).rowCount ?? 0;

  const after = await countRegistry(ids);

  // ---- report ---------------------------------------------------------------------------
  const rows = await db
    .select({
      id: compounds.compoundId,
      name: compounds.canonicalName,
      category: compounds.category,
      unit: compounds.defaultUnit,
    })
    .from(compounds)
    .where(inArray(compounds.compoundId, ids))
    .orderBy(compounds.canonicalName);

  console.log(`batch-2 compounds present: ${before} -> ${after} of ${ids.length} (${written} row(s) inserted)`);
  for (const r of rows) {
    console.log(`  ${r.name.padEnd(24)} ${String(r.category).padEnd(21)} ${r.unit ?? '(no unit — nothing inferred)'}`);
  }

  if (after !== ids.length) {
    console.warn(`\nWARNING: ${ids.length - after} batch-2 compound(s) are still absent. Nothing was updated —` +
      ' this script only inserts. Investigate before re-running.');
  }
  console.log('\nNo scoring parameter was created. Every compound above is recognized and unreviewed (§4e).');
}

async function countRegistry(ids: string[]): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(compounds)
    .where(inArray(compounds.compoundId, ids));
  return r?.n ?? 0;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
