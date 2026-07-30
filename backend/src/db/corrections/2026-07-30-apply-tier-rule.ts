// =============================================================================
// EVIDENCE TIER RE-DERIVATION — CLAIMS_COMPLIANCE §4a, PART TWO. 2026-07-30.
//
// *** THIS SCRIPT MOVES REAL SCORES. *** Part One recorded §4a's inputs and deliberately moved
// nothing. This applies the rule to `evidence_tier` itself, which changes sub-scores and the
// composite Spend Efficiency Index of any stack containing NMN or NR.
//
// Every tier written here is COMPUTED by src/db/derive-tier.ts from the row's own contributing
// sources and stored outcome_proximity. There is no hardcoded list of tier values in this file
// and there must never be one: if the rule and the data disagree, the rule wins and this script
// is how that reaches production.
//
// Idempotent — it writes absolute derived values, so a second run recomputes the same tiers and
// reports the same spread. Safe to re-run.
//
// SAFETY ASSERTION, INVERTED FROM PART ONE. Part One aborted if the spread moved. This aborts
// if it does NOT move, and only accepts the exact expected destination:
//     A_strong 1 / B_moderate 4 / C_limited 2   ->   A_strong 1 / B_moderate 1 / C_limited 5
// Anything else means the rule, the data, or this script is not what was reviewed.
//
// Writes require DATABASE_URL. NOT RUN HERE (no Neon reachable in the authoring env); it
// type-checks and mirrors the state now baked into seed-data.ts. Run once against production:
//   npm run db:apply-tier-rule
// then re-verify read-only with `npm run db:counts` (row counts are unchanged — this updates
// 3 rows in place and inserts nothing).
//
// AFTER RUNNING: the change is user-visible. Confirm a real report in the browser rather than
// inferring success from the script exiting 0 (STATUS §10's standing lesson).
// =============================================================================
import { sql } from 'drizzle-orm';
import { db } from '../client.js';
import { sources, doseRecords, scoringParameters } from '../schema.js';
import { scoreStack, type ScoredCompoundInput } from '../../scoring-engine/index.js';
import { deriveTierDetailed, type ContributingSource } from '../derive-tier.js';
import { SEED_COMPOUNDS } from '../seed-data.js';
import type { EvidenceTier, OutcomeProximity } from '../schema.js';

const TIERS: readonly EvidenceTier[] = ['A_strong', 'B_moderate', 'C_limited', 'D_preliminary'];
const EXPECTED_BEFORE = 'A_strong=1  B_moderate=4  C_limited=2  D_preliminary=0';
const EXPECTED_AFTER = 'A_strong=1  B_moderate=1  C_limited=5  D_preliminary=0';

const fmtSpread = (s: Record<string, number>) => TIERS.map((t) => `${t}=${s[t] ?? 0}`).join('  ');

async function tierSpread(): Promise<Record<string, number>> {
  const rows = await db
    .select({ tier: scoringParameters.evidenceTier, n: sql<number>`count(*)::int` })
    .from(scoringParameters)
    .groupBy(scoringParameters.evidenceTier);
  return Object.fromEntries(rows.map((r) => [r.tier, r.n]));
}

/**
 * Representative stack, identical to the one in seed-scoring.test.ts: NMN underdosed, NR
 * in-range, Resveratrol overdosed, Berberine in-range, TMG underdosed. Not a user's data —
 * it exists so the before/after print shows the score movement in concrete terms rather than
 * as an abstract tier change.
 */
const STACK_SHAPE: Array<{ key: keyof typeof COMPOUND; goalTag: string; doseMg: number; spend: number }> = [
  { key: 'nmn', goalTag: 'metabolic_health', doseMg: 150, spend: 45 },
  { key: 'nr', goalTag: 'healthy_aging', doseMg: 1000, spend: 40 },
  { key: 'resveratrol', goalTag: 'metabolic_health', doseMg: 1000, spend: 18 },
  { key: 'berberine', goalTag: 'metabolic_health', doseMg: 1500, spend: 22 },
  { key: 'tmg', goalTag: 'healthy_aging', doseMg: 1000, spend: 9 },
];

const COMPOUND = {
  nmn: SEED_COMPOUNDS[0].compoundId!,
  nr: SEED_COMPOUNDS[1].compoundId!,
  resveratrol: SEED_COMPOUNDS[2].compoundId!,
  berberine: SEED_COMPOUNDS[3].compoundId!,
  tmg: SEED_COMPOUNDS[4].compoundId!,
};

// Founder-approved replacement wording, keyed by `compoundId|goalTag`. Written in the SAME
// UPDATE as the tier below, so a corrected tier and its corrected explanation land together.
//
// NR x healthy_aging only. Its previous rationale ended "so evidence is moderate and
// outcome-dependent"; "moderate" is Tier B's public label (CLAIMS_COMPLIANCE section 4) and
// this parameter is now C_limited. The rationale RENDERS TO USERS on Stop/Keep rows, so
// writing the tier without the wording would show a C badge beside the word moderate.
// Wording is founder-approved and reproduced verbatim -- it is not authored here.
const APPROVED_RATIONALES: Record<string, string> = {
  [`${COMPOUND.nr}|healthy_aging`]:
    'A human RCT found 1000 mg/day well-tolerated and NAD+-elevating; a separate RCT at 2000 mg/day found no change in insulin sensitivity. The two controlled trials do not agree with each other, so the evidence is limited and outcome-dependent.',
};

interface LiveParam {
  compoundId: string;
  goalTag: string;
  tier: EvidenceTier;
  rangeLow: number | null;
  rangeHigh: number | null;
  bioFactor: number;
  sourceIds: string[];
  proximity: OutcomeProximity;
}

async function loadParams(): Promise<LiveParam[]> {
  const rows = await db.select().from(scoringParameters);
  return rows.map((r) => ({
    compoundId: r.compoundId,
    goalTag: r.goalTag,
    tier: r.evidenceTier,
    rangeLow: r.recommendedRangeLowMg,
    rangeHigh: r.recommendedRangeHighMg,
    bioFactor: r.bioavailabilityAdjustmentFactor ?? 1,
    sourceIds: r.contributingSourceIds,
    proximity: r.outcomeProximity as OutcomeProximity,
  }));
}

function scoreWith(params: LiveParam[], tierOf: (p: LiveParam) => EvidenceTier) {
  const name = (id: string) =>
    (SEED_COMPOUNDS.find((c) => c.compoundId === id)?.canonicalName as string) ?? id;
  const inputs: ScoredCompoundInput[] = STACK_SHAPE.map((row) => {
    const compoundId = COMPOUND[row.key];
    const p = params.find((x) => x.compoundId === compoundId && x.goalTag === row.goalTag);
    if (!p) throw new Error(`no scoring_parameter for ${compoundId}/${row.goalTag}`);
    return {
      compoundId,
      canonicalName: name(compoundId),
      labelDoseMg: row.doseMg,
      deliveryFormat: 'standard_capsule',
      dollarsSpent: row.spend,
      rangeLowMg: p.rangeLow,
      rangeHighMg: p.rangeHigh,
      bioavailabilityAdjustmentFactor: p.bioFactor,
      evidenceTier: tierOf(p),
      contributingSourceIds: p.sourceIds,
      sharedIngredientKey: compoundId,
    };
  });
  return scoreStack(inputs);
}

function printScores(label: string, r: ReturnType<typeof scoreStack>) {
  console.log(`  ${label}`);
  for (const s of r.subScores) {
    console.log(
      `    ${s.canonicalName.padEnd(34)} DA=${s.dosingAccuracy.toFixed(1).padStart(6)}  ` +
        `EC=${String(s.evidenceCeiling).padStart(3)}  sub=${s.subScore.toFixed(1).padStart(6)}  (${s.evidenceTier})`,
    );
  }
  console.log(
    `    composite SEI=${r.compositeScore}   Estimated Annual Waste $${r.waste.annualLow}-$${r.waste.annualHigh}`,
  );
}

async function main() {
  const params = await loadParams();
  if (params.length !== 7) {
    throw new Error(`Expected 7 scoring parameters, found ${params.length}. Is batch 1 loaded?`);
  }
  for (const p of params) {
    if (!p.proximity) {
      throw new Error(
        `${p.compoundId}|${p.goalTag} has no outcome_proximity. Run db:tier-inputs (Part One) first.`,
      );
    }
  }

  // --- Derive the target tier for every parameter, from the LIVE rows -------------------
  const derived = new Map<string, ReturnType<typeof deriveTierDetailed>>();
  for (const p of params) {
    const contributing: ContributingSource[] = [];
    for (const sourceId of p.sourceIds) {
      const [src] = await db
        .select({ studyType: sources.studyType, sampleSize: sources.sampleSize })
        .from(sources)
        .where(sql`${sources.sourceId} = ${sourceId}`);
      const [dr] = await db
        .select({ dir: doseRecords.effectDirection })
        .from(doseRecords)
        .where(sql`${doseRecords.compoundId} = ${p.compoundId} and ${doseRecords.sourceId} = ${sourceId}`);
      if (!src || !dr?.dir) {
        throw new Error(
          `${p.compoundId}|${p.goalTag}: missing source or dose record for ${sourceId}. ` +
            'Refusing to derive a tier from partial data.',
        );
      }
      contributing.push({
        studyType: src.studyType as ContributingSource['studyType'],
        effectDirection: dr.dir as ContributingSource['effectDirection'],
        sampleSize: src.sampleSize,
      });
    }
    derived.set(`${p.compoundId}|${p.goalTag}`, deriveTierDetailed(contributing, p.proximity));
  }

  const tierOfOld = (p: LiveParam) => p.tier;
  const tierOfNew = (p: LiveParam) => derived.get(`${p.compoundId}|${p.goalTag}`)!.tier;

  // --- BEFORE ---------------------------------------------------------------------------
  const spreadBefore = await tierSpread();
  console.log('--- BEFORE ---');
  console.log(`  tier spread: ${fmtSpread(spreadBefore)}`);
  printScores('representative stack:', scoreWith(params, tierOfOld));

  // --- The per-parameter plan -------------------------------------------------------------
  console.log('--- DERIVED (§4a via derive-tier.ts, not hardcoded) ---');
  let moving = 0;
  for (const p of params) {
    const d = derived.get(`${p.compoundId}|${p.goalTag}`)!;
    const changed = d.tier !== p.tier;
    if (changed) moving++;
    console.log(
      `  ${p.goalTag.padEnd(22)} ${p.tier.padEnd(13)} -> ${d.tier.padEnd(13)} ${changed ? 'CHANGED' : 'unchanged'}` +
        `   [ceiling ${d.ceiling}, demoted ${d.demotedBy}, restored ${d.restored}]`,
    );
    if (d.restorationBlockedBy.length) console.log(`      restoration blocked: ${d.restorationBlockedBy.join('; ')}`);
  }

  // --- Apply -------------------------------------------------------------------------------
  // Tier and rationale go in ONE statement for any row that needs both, so there is never a
  // moment where production holds the new tier beside wording that contradicts it.
  let updated = 0;
  let rationalesUpdated = 0;
  for (const p of params) {
    const target = tierOfNew(p);
    const approved = APPROVED_RATIONALES[`${p.compoundId}|${p.goalTag}`];
    const rows = await db
      .update(scoringParameters)
      .set(
        approved
          ? { evidenceTier: target, evidenceTierRationale: approved }
          : { evidenceTier: target },
      )
      .where(sql`${scoringParameters.compoundId} = ${p.compoundId} and ${scoringParameters.goalTag} = ${p.goalTag}`)
      .returning({ id: scoringParameters.scoringParameterId });
    updated += rows.length;
    if (approved) {
      rationalesUpdated += rows.length;
      console.log(`  rationale rewritten for ${p.goalTag} (founder-approved; removes a Tier B label from a Tier C row)`);
    }
  }

  // --- AFTER --------------------------------------------------------------------------------
  const spreadAfter = await tierSpread();
  const paramsAfter = await loadParams();
  console.log('--- AFTER ---');
  console.log(`  tier spread: ${fmtSpread(spreadAfter)}`);
  printScores('representative stack:', scoreWith(paramsAfter, tierOfOld));
  console.log('--- ROWS ---');
  console.log(`  scoring_parameters written: ${updated} (expected 7; ${moving} of them change tier)`);
  console.log(`  rationales rewritten:       ${rationalesUpdated} (expected 1: NR x healthy_aging)`);

  // --- SAFETY ASSERTION (inverted from Part One) --------------------------------------------
  if (fmtSpread(spreadBefore) === EXPECTED_BEFORE && fmtSpread(spreadAfter) !== EXPECTED_AFTER) {
    throw new Error(
      `ABORT: the spread did not move to the reviewed destination.\n` +
        `  before: ${fmtSpread(spreadBefore)}\n  after : ${fmtSpread(spreadAfter)}\n` +
        `  wanted: ${EXPECTED_AFTER}\nPart Two must apply §4a exactly as reviewed.`,
    );
  }
  if (fmtSpread(spreadAfter) !== EXPECTED_AFTER) {
    throw new Error(
      `ABORT: unexpected final spread.\n  after : ${fmtSpread(spreadAfter)}\n  wanted: ${EXPECTED_AFTER}`,
    );
  }
  if (fmtSpread(spreadBefore) === fmtSpread(spreadAfter)) {
    // Only reachable on a re-run, where the tiers are already applied. That is fine and is
    // what idempotent means — say so rather than let it read as a silent no-op failure.
    console.log('Note: spread already at the post-§4a state — this was a re-run, and it is a no-op.');
  }
  if (updated !== 7) {
    throw new Error(`Expected to write 7 scoring parameters, wrote ${updated}.`);
  }
  if (rationalesUpdated !== 1) {
    throw new Error(`Expected to rewrite 1 rationale (NR x healthy_aging), rewrote ${rationalesUpdated}.`);
  }
  console.log(`Verified: tier spread is ${fmtSpread(spreadAfter)} — §4a applied.`);
  console.log('Now confirm a real report in the browser; do not infer success from this exit code.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
