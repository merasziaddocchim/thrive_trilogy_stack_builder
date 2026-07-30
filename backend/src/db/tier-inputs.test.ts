// =============================================================================
// CLAIMS_COMPLIANCE §4a PART ONE — the two new scoring_parameters inputs.
//
// Part One's defining property is that NO SCORE MOVES. These tests check the new columns are
// populated and internally consistent, and the tripwire at the bottom checks that nothing
// touched a tier. Nothing here reads the scoring engine; §4a's tier re-derivation is Part Two.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SEED_SCORING_PARAMETERS,
  SEED_DOSE_RECORDS,
  SEED_SOURCES,
  SEED_SOURCE_IDS,
} from './seed-data.js';
import { deriveDirection, type SourceEffectDirection } from './derive-direction.js';
import { outcomeProximityEnum, evidenceDirectionEnum } from './schema.js';

test('every scoring parameter has both §4a inputs populated and non-null', () => {
  assert.equal(SEED_SCORING_PARAMETERS.length, 7);
  for (const p of SEED_SCORING_PARAMETERS) {
    assert.ok(p.outcomeProximity != null, `${p.compoundId}|${p.goalTag} missing outcomeProximity`);
    assert.ok(
      p.directionOfEvidence != null,
      `${p.compoundId}|${p.goalTag} missing directionOfEvidence`,
    );
  }
});

test('outcome proximity is one of the three permitted §4a Step 2 values', () => {
  // Exactly three, matching §4a Step 2 — no fourth bucket may be invented in the data.
  assert.deepEqual([...outcomeProximityEnum.enumValues].sort(), [
    'clinical_outcome',
    'performance_or_self_report',
    'surrogate_biomarker',
  ]);
  for (const p of SEED_SCORING_PARAMETERS) {
    assert.ok(
      (outcomeProximityEnum.enumValues as readonly string[]).includes(p.outcomeProximity as string),
      `${p.compoundId}|${p.goalTag} has non-permitted outcomeProximity "${p.outcomeProximity}"`,
    );
  }
});

test('direction of evidence matches what the §4a derivation rule yields from the sources', () => {
  // The point of this test: direction is DERIVED, not hand-assigned. Recomputing it from each
  // parameter's contributing sources makes the rule checkable — if someone edits a stored
  // direction, or changes a dose record's effect_direction, this fails.
  for (const p of SEED_SCORING_PARAMETERS) {
    const contributing = p.contributingSourceIds as string[];
    const directions = contributing.map((sourceId) => {
      const dr = SEED_DOSE_RECORDS.find(
        (d) => d.compoundId === p.compoundId && d.sourceId === sourceId,
      );
      assert.ok(dr, `${p.compoundId}|${p.goalTag}: no dose record for contributing source ${sourceId}`);
      return dr.effectDirection as SourceEffectDirection;
    });
    assert.equal(
      p.directionOfEvidence,
      deriveDirection(directions),
      `${p.compoundId}|${p.goalTag}: stored direction disagrees with the rule applied to ${directions.join(', ')}`,
    );
  }
});

test('the derivation rule itself: harm precedence, unanimity, and disagreement', () => {
  assert.equal(deriveDirection(['positive', 'positive']), 'positive');
  assert.equal(deriveDirection(['null_no_effect', 'null_no_effect']), 'null_no_effect');
  assert.equal(deriveDirection(['positive', 'null_no_effect']), 'mixed');
  // Harm takes precedence over everything, and is not averaged away by agreeing positives.
  assert.equal(deriveDirection(['positive', 'positive', 'negative']), 'negative');
  assert.equal(deriveDirection(['null_no_effect', 'negative']), 'negative');
  assert.throws(() => deriveDirection([]), /no contributing source directions/);
  // 'mixed' exists only at the parameter level — a single dose record can never be mixed.
  assert.ok((evidenceDirectionEnum.enumValues as readonly string[]).includes('mixed'));
});

test('the two parameters with disagreeing sources are recorded as mixed, not positive', () => {
  // These are the two §4a calls out as failing restoration on direction. A regression that
  // flattened them to "positive" would be a user-facing misstatement, not just a data error.
  const mixed = SEED_SCORING_PARAMETERS.filter((p) => p.directionOfEvidence === 'mixed');
  assert.equal(mixed.length, 2);
  for (const p of mixed) {
    const dirs = (p.contributingSourceIds as string[]).map(
      (id) =>
        SEED_DOSE_RECORDS.find((d) => d.compoundId === p.compoundId && d.sourceId === id)!
          .effectDirection,
    );
    assert.ok(new Set(dirs).size > 1, `${p.compoundId}|${p.goalTag} marked mixed but sources agree`);
  }
});

test('the three founder-resolved sample sizes are filled; Covarrubias 2021 stays null', () => {
  const by = (id: string) => SEED_SOURCES.find((s) => s.sourceId === id)!;
  assert.equal(by(SEED_SOURCE_IDS.hoffman2009).sampleSize, 24);
  assert.equal(by(SEED_SOURCE_IDS.mcrae2013).sampleSize, 206);
  assert.equal(by(SEED_SOURCE_IDS.yoshino2012).sampleSize, 29);
  // Legitimately null: a mechanism_review with population_match 'n/a' has no sample size, and
  // it feeds no scoring parameter, so its null can never affect a tier.
  assert.equal(by(SEED_SOURCE_IDS.covarrubias2021).sampleSize, null);
  assert.equal(SEED_SOURCES.filter((s) => s.sampleSize == null).length, 1);
  for (const p of SEED_SCORING_PARAMETERS) {
    assert.ok(
      !(p.contributingSourceIds as string[]).includes(SEED_SOURCE_IDS.covarrubias2021),
      'Covarrubias 2021 must feed no scoring parameter',
    );
  }
});

// ---- TRIPWIRE ---------------------------------------------------------------------------
// *** THIS TEST IS EXPECTED TO FAIL IN PART TWO — DELIBERATELY. ***
//
// Part One adds the §4a inputs and moves NO score, so the stored spread must still be exactly
// what founder judgment produced on 2026-07-20: A x1 / B x4 / C x2.
//
// Part Two re-derives the tiers from §4a, which moves three parameters to C (NR x
// healthy_aging, NMN x metabolic_health, NMN x training_and_recovery) and makes the spread
// A x1 / B x1 / C x5. When that happens THIS TEST SHOULD FAIL, and the correct response is to
// update these expected counts as part of that change — not to weaken the assertion. Its job
// is to make an unintended tier change impossible to merge quietly in the meantime.
test('TRIPWIRE: stored tier spread is still A x1 / B x4 / C x2 (expected to fail in Part Two)', () => {
  const spread = SEED_SCORING_PARAMETERS.reduce<Record<string, number>>((acc, p) => {
    acc[p.evidenceTier as string] = (acc[p.evidenceTier as string] ?? 0) + 1;
    return acc;
  }, {});
  assert.deepEqual(spread, { A_strong: 1, B_moderate: 4, C_limited: 2 });
});
