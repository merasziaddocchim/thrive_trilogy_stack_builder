import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreStack, type ScoredCompoundInput } from '../scoring-engine/index.js';
import { SEED_COMPOUNDS, SEED_SCORING_PARAMETERS, SEED_SOURCES } from './seed-data.js';

// Drives the REAL scoring engine against the REAL seeded evidence parameters (not a mock),
// using a synthetic stack that includes underdosed, in-range, and overdosed compounds. Also
// prints the computed sub-scores so the numbers are visible in the seeding report.

function nameOf(compoundId: string): string {
  return SEED_COMPOUNDS.find((c) => c.compoundId === compoundId)?.canonicalName ?? compoundId;
}

function input(
  compoundId: string,
  goalTag: string,
  labelDoseMg: number,
  dollarsSpent: number,
): ScoredCompoundInput {
  const p = SEED_SCORING_PARAMETERS.find((s) => s.compoundId === compoundId && s.goalTag === goalTag);
  assert.ok(p, `no seeded scoring_parameter for ${compoundId}/${goalTag}`);
  return {
    compoundId,
    canonicalName: nameOf(compoundId),
    labelDoseMg,
    deliveryFormat: 'standard_capsule',
    dollarsSpent,
    rangeLowMg: p.recommendedRangeLowMg ?? null,
    rangeHighMg: p.recommendedRangeHighMg ?? null,
    bioavailabilityAdjustmentFactor: p.bioavailabilityAdjustmentFactor ?? 1,
    evidenceTier: p.evidenceTier,
    contributingSourceIds: p.contributingSourceIds,
    sharedIngredientKey: compoundId,
  };
}

const C = {
  nmn: SEED_COMPOUNDS[0].compoundId!,
  nr: SEED_COMPOUNDS[1].compoundId!,
  resveratrol: SEED_COMPOUNDS[2].compoundId!,
  berberine: SEED_COMPOUNDS[3].compoundId!,
  tmg: SEED_COMPOUNDS[4].compoundId!,
};

// Synthetic stack: NMN underdosed, NR in-range, Resveratrol overdosed, Berberine in-range,
// TMG underdosed — a deliberate spread of dosing situations across the 5 tiers.
const STACK: ScoredCompoundInput[] = [
  input(C.nmn, 'metabolic_health', 150, 45), // 150 vs 250-500 → underdosed, Tier B (EC 80)
  input(C.nr, 'healthy_aging', 1000, 40), // 1000 vs 300-1000 → in range, Tier B (EC 80)
  input(C.resveratrol, 'metabolic_health', 1000, 18), // 1000 vs 150-500 → overdosed, Tier C (EC 60)
  input(C.berberine, 'metabolic_health', 1500, 22), // 1500 vs 900-1500 → in range, Tier A (EC 100)
  input(C.tmg, 'healthy_aging', 1000, 9), // 1000 vs 1500-6000 → underdosed, Tier B (EC 80)
];

test('real engine over seeded data: sub-scores are meaningfully differentiated', () => {
  const result = scoreStack(STACK);

  console.log('\n  Compound sub-scores (real engine × seeded evidence):');
  for (const s of result.subScores) {
    console.log(
      `    ${s.canonicalName.padEnd(34)} DA=${s.dosingAccuracy.toFixed(1).padStart(6)}  EC=${String(s.evidenceCeiling).padStart(3)}  sub=${s.subScore.toFixed(1).padStart(6)}  (Tier ${s.evidenceTier})`,
    );
  }
  console.log(
    `  Composite SEI=${result.compositeScore}  |  Estimated Annual Waste $${result.waste.annualLow}-$${result.waste.annualHigh}\n`,
  );

  const subs = result.subScores.map((s) => Math.round(s.subScore * 10) / 10);
  // Expected from the formula: NMN 60, NR 80, Resveratrol 50, Berberine 100, TMG ~66.7.
  assert.equal(subs.length, 5);
  const distinct = new Set(subs);
  assert.ok(distinct.size >= 4, `expected differentiated sub-scores, got ${[...subs].join(', ')}`);

  // Berberine (well dosed, Tier A) should top the stack; the overdosed Tier-C resveratrol
  // and underdosed NMN should trail it — proves both dosing and the ceiling are biting.
  const byName = new Map(result.subScores.map((s) => [s.canonicalName, s.subScore]));
  const berberine = byName.get('Berberine')!;
  const resveratrol = byName.get('Resveratrol')!;
  const nmn = byName.get('NMN (Nicotinamide Mononucleotide)')!;
  assert.ok(berberine > resveratrol, 'Berberine (Tier A, in range) should outscore overdosed Tier-C resveratrol');
  assert.ok(berberine > nmn, 'Berberine should outscore underdosed NMN');
  assert.equal(berberine, 100);
  assert.equal(resveratrol, 50);
  assert.equal(nmn, 60);
});

test('seeded scoring parameters all carry an evidence tier and non-empty sources (CLAIMS §4)', () => {
  for (const p of SEED_SCORING_PARAMETERS) {
    assert.ok(p.evidenceTier, `${p.compoundId} missing evidence tier`);
    assert.ok(p.contributingSourceIds.length > 0, `${p.compoundId} missing contributing sources`);
  }
});

test('batch-1 founder review is complete: sources human_reviewed, no pending-review suffix', () => {
  // Founder review completed 2026-07-20 — the review-pending state must be fully gone.
  for (const s of SEED_SOURCES) {
    assert.equal(
      s.extractionStatus,
      'human_reviewed',
      `${s.sourceId} should be human_reviewed after batch-1 sign-off`,
    );
  }
  for (const p of SEED_SCORING_PARAMETERS) {
    assert.doesNotMatch(
      p.evidenceTierRationale ?? '',
      /pending founder review/,
      `${p.compoundId} rationale still carries the review-pending suffix`,
    );
  }
});
