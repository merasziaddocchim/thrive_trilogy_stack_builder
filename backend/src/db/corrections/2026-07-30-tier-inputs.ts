// =============================================================================
// EVIDENCE-TIER INPUTS BACKFILL — CLAIMS_COMPLIANCE §4a, PART ONE. 2026-07-30.
//
// Populates the two columns migration 0002 added, and fills the three sample sizes the
// founder resolved on 2026-07-29. It is deliberately a DATA-ONLY change:
//
//   *** THIS SCRIPT MOVES NO SCORE. ***
//
// It writes nothing to evidence_tier, and it aborts before committing anything if the tier
// spread is not identical before and after. Re-deriving the tiers from §4a is PART TWO, and
// that is the change that will move NMN and NR sub-scores and the composite SEI.
//
// Like the batch-1 scripts, this is the proper vehicle for a data change: the seed runner
// uses ON CONFLICT DO NOTHING and never UPDATEs existing rows. Idempotent — every write sets
// an absolute target value, so a second run reports the same counts and changes nothing.
//
// Writes require DATABASE_URL. NOT RUN HERE (no Neon reachable in the authoring env); it
// type-checks and mirrors the state now baked into seed-data.ts. Run once against production:
//   npm run db:tier-inputs
// then re-verify read-only with `npm run db:counts` (row counts are unchanged).
//
// Does two things:
//   1. scoring_parameters.outcome_proximity      <- §4a Step 2 classification (7 rows)
//      scoring_parameters.direction_of_evidence  <- DERIVED, never hand-assigned (7 rows)
//   2. sources.sample_size                       <- the 3 founder-resolved values (3 rows)
//      Covarrubias 2021 stays NULL: a mechanism_review with population_match 'n/a' has no
//      sample size to fill, and it feeds no scoring parameter.
// =============================================================================
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../client.js';
import { sources, scoringParameters, doseRecords } from '../schema.js';
import { SEED_SOURCE_IDS, SEED_COMPOUND_IDS, SEED_SCORING_PARAMETERS } from '../seed-data.js';
import { deriveDirection, type SourceEffectDirection } from '../derive-direction.js';
import type { OutcomeProximity } from '../schema.js';

const C = SEED_COMPOUND_IDS;
const S = SEED_SOURCE_IDS;

// Outcome-proximity classification, transcribed from CLAIMS_COMPLIANCE §4a's "Batch-1
// assignments under this rule". §4a originates these; this script does not decide them.
const OUTCOME_PROXIMITY: Record<string, OutcomeProximity> = {
  [`${C.berberine}|metabolic_health`]: 'clinical_outcome',
  [`${C.tmg}|healthy_aging`]: 'surrogate_biomarker',
  [`${C.nr}|healthy_aging`]: 'surrogate_biomarker',
  [`${C.nmn}|metabolic_health`]: 'surrogate_biomarker',
  [`${C.nmn}|training_and_recovery`]: 'performance_or_self_report',
  [`${C.resveratrol}|metabolic_health`]: 'surrogate_biomarker',
  [`${C.tmg}|training_and_recovery`]: 'performance_or_self_report',
};

// Founder-resolved 2026-07-29. McRae is a meta-analysis: 206 is the pooled n across its 5 trials.
const RESOLVED_SAMPLE_SIZES: Array<{ id: string; n: number; note: string }> = [
  { id: S.hoffman2009, n: 24, note: 'Hoffman 2009' },
  { id: S.mcrae2013, n: 206, note: 'McRae 2013 (pooled across 5 trials)' },
  { id: S.yoshino2012, n: 29, note: 'Yoshino 2012' },
];

type Spread = Record<string, number>;

async function tierSpread(): Promise<Spread> {
  const rows = await db
    .select({ tier: scoringParameters.evidenceTier, n: sql<number>`count(*)::int` })
    .from(scoringParameters)
    .groupBy(scoringParameters.evidenceTier);
  return Object.fromEntries(rows.map((r) => [r.tier, r.n]));
}

const fmt = (s: Spread) =>
  ['A_strong', 'B_moderate', 'C_limited', 'D_preliminary'].map((t) => `${t}=${s[t] ?? 0}`).join('  ');

async function main() {
  const compoundIds = Object.values(C);

  // ---- BEFORE -------------------------------------------------------------------------
  const spreadBefore = await tierSpread();
  console.log('--- BEFORE ---');
  console.log(`  tier spread            : ${fmt(spreadBefore)}`);
  const [{ p: proxBefore }] = await db
    .select({ p: sql<number>`count(*) filter (where ${scoringParameters.outcomeProximity} is not null)::int` })
    .from(scoringParameters);
  const [{ d: dirBefore }] = await db
    .select({ d: sql<number>`count(*) filter (where ${scoringParameters.directionOfEvidence} is not null)::int` })
    .from(scoringParameters);
  const [{ s: nBefore }] = await db
    .select({ s: sql<number>`count(*) filter (where ${sources.sampleSize} is null)::int` })
    .from(sources);
  console.log(`  outcome_proximity set  : ${proxBefore}/7`);
  console.log(`  direction_of_evidence  : ${dirBefore}/7`);
  console.log(`  sources with null n    : ${nBefore}`);

  // ---- 1. Derive direction from the live dose records, then write both columns ---------
  // Direction is computed from the DATABASE, not from a hardcoded list, so the stored value
  // is a function of the evidence actually present (CLAIMS_COMPLIANCE §4a).
  let proximityUpdated = 0;
  let directionUpdated = 0;

  for (const param of SEED_SCORING_PARAMETERS) {
    const compoundId = param.compoundId as string;
    const goalTag = param.goalTag as string;
    const contributing = param.contributingSourceIds as string[];

    const recorded = await db
      .select({ dir: doseRecords.effectDirection })
      .from(doseRecords)
      .where(
        sql`${doseRecords.compoundId} = ${compoundId} and ${doseRecords.sourceId} in ${contributing}`,
      );

    const directions = recorded
      .map((r) => r.dir)
      .filter((d): d is SourceEffectDirection => d != null);

    if (directions.length !== contributing.length) {
      throw new Error(
        `${compoundId}|${goalTag}: found ${directions.length} dose-record direction(s) for ` +
          `${contributing.length} contributing source(s). Refusing to derive from partial data.`,
      );
    }

    const direction = deriveDirection(directions);
    const proximity = OUTCOME_PROXIMITY[`${compoundId}|${goalTag}`];
    if (!proximity) {
      throw new Error(`${compoundId}|${goalTag}: no §4a outcome-proximity classification.`);
    }

    const updated = await db
      .update(scoringParameters)
      .set({ outcomeProximity: proximity, directionOfEvidence: direction })
      .where(
        sql`${scoringParameters.compoundId} = ${compoundId} and ${scoringParameters.goalTag} = ${goalTag}`,
      )
      .returning({ id: scoringParameters.scoringParameterId });

    proximityUpdated += updated.length;
    directionUpdated += updated.length;
    console.log(
      `  set ${goalTag.padEnd(22)} proximity=${proximity.padEnd(27)} direction=${direction.padEnd(15)} rows=${updated.length}`,
    );
  }

  // ---- 2. The three resolved sample sizes ---------------------------------------------
  let sampleSizesUpdated = 0;
  for (const { id, n, note } of RESOLVED_SAMPLE_SIZES) {
    const updated = await db
      .update(sources)
      .set({ sampleSize: n })
      .where(eq(sources.sourceId, id))
      .returning({ id: sources.sourceId });
    sampleSizesUpdated += updated.length;
    console.log(`  sample_size ${note.padEnd(38)} = ${String(n).padEnd(4)} rows=${updated.length}`);
  }

  // ---- AFTER --------------------------------------------------------------------------
  const spreadAfter = await tierSpread();
  const [{ p: proxAfter }] = await db
    .select({ p: sql<number>`count(*) filter (where ${scoringParameters.outcomeProximity} is not null)::int` })
    .from(scoringParameters);
  const [{ d: dirAfter }] = await db
    .select({ d: sql<number>`count(*) filter (where ${scoringParameters.directionOfEvidence} is not null)::int` })
    .from(scoringParameters);
  const [{ s: nAfter }] = await db
    .select({ s: sql<number>`count(*) filter (where ${sources.sampleSize} is null)::int` })
    .from(sources);

  console.log('--- AFTER ---');
  console.log(`  tier spread            : ${fmt(spreadAfter)}`);
  console.log(`  outcome_proximity set  : ${proxAfter}/7`);
  console.log(`  direction_of_evidence  : ${dirAfter}/7`);
  console.log(`  sources with null n    : ${nAfter}  (Covarrubias 2021 stays null by design)`);
  console.log('--- ROWS UPDATED ---');
  console.log(`  outcome_proximity      : ${proximityUpdated} (expected 7)`);
  console.log(`  direction_of_evidence  : ${directionUpdated} (expected 7)`);
  console.log(`  sources.sample_size    : ${sampleSizesUpdated} (expected 3)`);

  // ---- TRIPWIRE: no score may move ----------------------------------------------------
  // Part One's defining property. If the spread differs at all, something wrote a tier that
  // should not have been written — fail loudly rather than let a silent score change ship.
  if (fmt(spreadBefore) !== fmt(spreadAfter)) {
    throw new Error(
      `ABORT: evidence_tier spread changed.\n  before: ${fmt(spreadBefore)}\n  after : ${fmt(spreadAfter)}\n` +
        'Part One must move no score. Re-deriving tiers is Part Two.',
    );
  }
  console.log(`Verified: tier spread UNCHANGED (${fmt(spreadAfter)}) — no score moved.`);

  if (proximityUpdated !== 7 || directionUpdated !== 7 || sampleSizesUpdated !== 3) {
    throw new Error(
      `Unexpected row counts (proximity=${proximityUpdated}/7, direction=${directionUpdated}/7, ` +
        `sample_size=${sampleSizesUpdated}/3). Is the batch-1 seed loaded in this database?`,
    );
  }
  if (proxAfter !== 7 || dirAfter !== 7) {
    throw new Error(`Backfill incomplete: proximity=${proxAfter}/7, direction=${dirAfter}/7.`);
  }
  console.log('Verified: all 7 scoring parameters carry both §4a inputs.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
