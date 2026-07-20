// =============================================================================
// FOUNDER SIGN-OFF SCRIPT — batch-1 evidence review complete, 2026-07-20
//
// Flips the LIVE evidence data from AI-extracted to human-reviewed after the founder
// personally verified all 12 sources against their primaries (only the McRae 2013
// citation needed fixing — already applied in PR #11 / db:correct:batch1).
//
// Like the correction script, this is the proper vehicle for a data change: the seed
// runner uses ON CONFLICT DO NOTHING and never UPDATEs existing rows. Idempotent — it
// sets absolute target values and strips a fixed substring, so re-running is safe.
// Writes require DATABASE_URL. Run once against production (after db:correct:batch1):
//   npm run db:signoff:batch1
// then re-verify read-only with `npm run db:counts` (row counts are unchanged).
//
// NOTE: not executed here (no DATABASE_URL / Neon reachable in the authoring env); it
// type-checks and mirrors the final state now baked into seed-data.ts.
//
// Does three things, all idempotent:
//   1. sources.extraction_status -> 'human_reviewed' + review_date for all 12 sources.
//   2. scoring_parameters.evidence_tier_rationale -> strip the trailing
//      " — AI-extracted, pending founder review." suffix (7 rows).
//   3. scoring_parameters.last_reviewed_date -> the review date (7 rows).
// =============================================================================
import { inArray, sql } from 'drizzle-orm';
import { db } from '../client.js';
import { sources, scoringParameters } from '../schema.js';
import { SEED_SOURCE_IDS, SEED_COMPOUND_IDS } from '../seed-data.js';

const REVIEWED_ON = new Date('2026-07-20');
const PENDING_SUFFIX = ' — AI-extracted, pending founder review.';

async function main() {
  const sourceIds = Object.values(SEED_SOURCE_IDS);
  const compoundIds = Object.values(SEED_COMPOUND_IDS);

  // 1. Flip all 12 sources to human_reviewed with a review date. reviewerId left as-is
  //    (null: no users row is modeled yet — the reviewer is documented for E-E-A-T in the
  //    frontend REVIEWER constant / methodology page, not as a FK here).
  const flipped = await db
    .update(sources)
    .set({ extractionStatus: 'human_reviewed', reviewDate: REVIEWED_ON })
    .where(inArray(sources.sourceId, sourceIds))
    .returning({ id: sources.sourceId });

  // 2. + 3. Strip the review-pending suffix and set last_reviewed_date on the scoring
  //    parameters. REPLACE is a no-op once the suffix is gone, so this is idempotent.
  const finalized = await db
    .update(scoringParameters)
    .set({
      evidenceTierRationale: sql`replace(${scoringParameters.evidenceTierRationale}, ${PENDING_SUFFIX}, '')`,
      lastReviewedDate: REVIEWED_ON,
    })
    .where(inArray(scoringParameters.compoundId, compoundIds))
    .returning({ id: scoringParameters.scoringParameterId });

  console.log(
    `batch-1 sign-off: sources set human_reviewed=${flipped.length} (expected 12), ` +
      `scoring_parameters finalized=${finalized.length} (expected 7).`,
  );
  if (flipped.length !== 12 || finalized.length !== 7) {
    throw new Error(
      `Unexpected row counts (sources=${flipped.length}/12, scoring_parameters=${finalized.length}/7). ` +
        'Is the batch-1 seed loaded in this database?',
    );
  }

  // Safety check: no scoring rationale should still carry the pending suffix.
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(scoringParameters)
    .where(sql`${scoringParameters.evidenceTierRationale} like ${'%pending founder review%'}`);
  if (n !== 0) {
    throw new Error(`${n} scoring rationale(s) still carry the pending-review suffix after sign-off.`);
  }
  console.log('Verified: no rationale still carries the pending-review suffix.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
