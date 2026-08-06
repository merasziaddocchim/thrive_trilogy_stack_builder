import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assembleAssessment,
  type EvidenceProvider,
  type ResolvedEvidence,
  type StoredIntake,
} from './assessment-service.js';

// Fake evidence provider standing in for the DB — lets us exercise the full assembly path
// (resolve → score → build §6 shapes) deterministically, without Postgres or seeded data.
// `directionOfEvidence` is stated on every fixture rather than left off: §4d Stops on
// null_no_effect/negative, so a fixture that omits it would be exercising the "not yet
// derived" path by accident instead of the direction it means to represent.
const EVIDENCE: Record<string, ResolvedEvidence> = {
  cmp_nmn: {
    canonicalName: 'NMN', rangeLowMg: 300, rangeHighMg: 500, bioavailabilityAdjustmentFactor: 1,
    evidenceTier: 'B_moderate', directionOfEvidence: 'positive', contributingSourceIds: ['src_nmn'], tierRationale: 'A single human RCT.',
    lastReviewed: '2026-07-10', reviewerName: 'Ziad Meras', sourceShortName: 'Yoshino 2021',
  },
  cmp_berberine: {
    canonicalName: 'Berberine', rangeLowMg: 900, rangeHighMg: 1500, bioavailabilityAdjustmentFactor: 1,
    evidenceTier: 'A_strong', directionOfEvidence: 'positive', contributingSourceIds: ['src_berb'], tierRationale: 'Meta-analysis of 27 RCTs.',
    lastReviewed: '2026-07-10', reviewerName: 'Ziad Meras', sourceShortName: 'Meta-analysis',
  },
  cmp_resveratrol: {
    canonicalName: 'Resveratrol', rangeLowMg: null, rangeHighMg: null, bioavailabilityAdjustmentFactor: 1,
    evidenceTier: 'C_limited', directionOfEvidence: 'positive', contributingSourceIds: ['src_resv'], tierRationale: 'Observational only.',
    lastReviewed: '2026-07-10', reviewerName: 'Ziad Meras', sourceShortName: 'cohort',
  },
  cmp_tmg: {
    canonicalName: 'TMG (Trimethylglycine)', rangeLowMg: 1500, rangeHighMg: 6000, bioavailabilityAdjustmentFactor: 1,
    evidenceTier: 'B_moderate', directionOfEvidence: 'positive', contributingSourceIds: ['src_tmg'], tierRationale: 'Meta-analysis of homocysteine RCTs.',
    lastReviewed: '2026-07-10', reviewerName: 'Ziad Meras', sourceShortName: 'McRae 2013',
  },
};

// Tier C but WITH a studied range — the case §4d exists to protect: limited evidence is not a
// reason to abandon a compound the user is dosing correctly.
EVIDENCE.cmp_resveratrol_ranged = {
  canonicalName: 'Resveratrol (ranged)', goalTag: 'healthy_aging', directionOfEvidence: 'positive',
  rangeLowMg: 150, rangeHighMg: 500, bioavailabilityAdjustmentFactor: 1,
  evidenceTier: 'C_limited', contributingSourceIds: ['src_resv'], tierRationale: 'Two RCTs, unreplicated.',
  lastReviewed: '2026-07-10', reviewerName: 'Ziad Meras', sourceShortName: 'Timmers 2011',
};

const provider: EvidenceProvider = {
  async resolve(ids) {
    return new Map(ids.filter((id) => EVIDENCE[id]).map((id) => [id, EVIDENCE[id]]));
  },
  // §4e: batch-1 fixtures are all reviewed, so nothing is unreviewed here. The dedicated
  // unreviewed-compound cases build their own provider below.
  async unreviewed() {
    return [];
  },
  async interactions() {
    return [];
  },
};

const withSpend: StoredIntake = {
  goalTag: 'healthy_aging',
  stackItems: [
    { compoundId: 'cmp_nmn', labelDoseMg: 250, deliveryFormat: 'sublingual', pricePaid: 45 },
    { compoundId: 'cmp_berberine', labelDoseMg: 1000, deliveryFormat: 'standard_capsule', pricePaid: 22 },
    { compoundId: 'cmp_resveratrol', labelDoseMg: 500, deliveryFormat: 'liposomal', pricePaid: 18 },
  ],
};

test('a recognized compound with NO dose still appears in the Preview (not the empty state)', async () => {
  // Regression for "TMG 500" (no unit → dose not parsed): the compound matched the DB, so the
  // Preview must list it as recognized rather than wrongly report "couldn't recognize any".
  const tmgNoDose: StoredIntake = {
    goalTag: 'healthy_aging',
    stackItems: [{ compoundId: 'cmp_tmg', labelDoseMg: null, deliveryFormat: null, pricePaid: null }],
  };
  const { preview } = await assembleAssessment(tmgNoDose, provider);
  assert.equal(preview.recognized_compounds.length, 1);
  assert.equal(preview.recognized_compounds[0].canonical_name, 'TMG (Trimethylglycine)');
  assert.equal(preview.recognized_compounds[0].evidence_tier, 'B');
  assert.deepEqual(preview.evidence_tier_summary, { A: 0, B: 1, C: 0, D: 0 });
  // Not scorable (no dose, no spend) → State B, no fabricated numbers.
  assert.equal(preview.sufficient_for_scoring, false);
  assert.equal(preview.spend_efficiency_index, null);
  assert.equal(preview.estimated_annual_waste, null);
});

test('State A (spend present): preview has an SEI and a waste range', async () => {
  const { preview } = await assembleAssessment(withSpend, provider);
  assert.equal(preview.sufficient_for_scoring, true);
  assert.equal(typeof preview.spend_efficiency_index, 'number');
  assert.ok(preview.estimated_annual_waste);
  assert.equal(preview.recognized_compounds.length, 3);
  assert.deepEqual(preview.evidence_tier_summary, { A: 1, B: 1, C: 1, D: 0 });
});

test('State B (no prices): no fabricated SEI or waste; neutral headline', async () => {
  const noSpend: StoredIntake = {
    goalTag: 'healthy_aging',
    stackItems: withSpend.stackItems.map((s) => ({ ...s, pricePaid: null })),
  };
  const { preview } = await assembleAssessment(noSpend, provider);
  assert.equal(preview.sufficient_for_scoring, false);
  assert.equal(preview.spend_efficiency_index, null);
  assert.equal(preview.estimated_annual_waste, null);
  assert.match(preview.headline_finding, /recognized 3 compounds/);
});

test('report categorizes: Berberine (in range, Tier A) → Keep', async () => {
  const { report } = await assembleAssessment(withSpend, provider);
  const kept = report.keep.map((k) => k.compound);
  assert.ok(kept.includes('Berberine'));
});

// Expected value re-derived 2026-08-01 (CLAIMS_COMPLIANCE §4d), NOT relaxed. This test used
// to assert Stop for an underdosed Tier B compound; §4d withdrew that — underdosing is a
// reason to change the amount, not to abandon the compound. The dose-comparison assertion is
// UNCHANGED and still the point of the test; only the section it is read from moved.
test('report categorizes: underdosed Tier B NMN → Adjust with a dose-comparison reason', async () => {
  const { report } = await assembleAssessment(withSpend, provider);
  const nmn = report.adjust.find((a) => a.compound === 'NMN');
  assert.ok(nmn, 'NMN should be in Adjust');
  assert.match(nmn.reason, /17% below the range used in human research \(300–500 mg\)/);
  assert.ok(!report.stop.some((s) => s.compound === 'NMN'), 'underdosing is not a reason to Stop');
});

// Re-derived twice now, each time to a narrower claim. 2026-07-31 replaced the sentence
// (the old one falsely called human evidence non-human). 2026-08-01 moved the section: §4d
// routes a compound with NO studied range to Adjust, because Keep would assert "the dose falls
// inside the studied range" about a dose nothing was compared to, and Stop would tell the user
// to abandon a compound the evidence does not contradict. Tier C alone is never a Stop.
test('report categorizes: Tier C Resveratrol (no range) → Adjust, hedged, no dose verdict', async () => {
  const { report } = await assembleAssessment(withSpend, provider);
  const resv = report.adjust.find((a) => a.compound === 'Resveratrol');
  assert.ok(resv, 'a compound with no studied range belongs in Adjust');
  assert.ok(!report.stop.some((s) => s.compound === 'Resveratrol'), 'Tier C is never a Stop by itself');
  // §4d: an Adjust row must state the finding that put it there. With no range, that is the
  // absence of a range — stated as OUR gap, with no number and no verdict on the user's dose.
  assert.match(resv.reason, /no studied dose range for Resveratrol/);
  assert.match(resv.reason, /could not be compared against research/);
  // The properties this test's name claims, asserted directly rather than through one sentence.
  assert.doesNotMatch(resv.reason, /\b(strong|moderate|limited|preliminary)\b/i);
  assert.doesNotMatch(resv.reason, /non-human/i);
  assert.doesNotMatch(resv.reason, /\b(below|above|within) the range\b/i);
});

test('every report claim object carries evidence_tier and non-empty source_ids (CLAIMS §4)', async () => {
  const { report } = await assembleAssessment(withSpend, provider);
  for (const row of [...report.stop, ...report.adjust, ...report.keep]) {
    assert.ok(row.evidence_tier);
    assert.ok(row.source_ids.length > 0);
  }
});

test('duplicate products of the same compound produce redundancy waste + an overlap flag', async () => {
  const dup: StoredIntake = {
    goalTag: 'healthy_aging',
    stackItems: [
      { compoundId: 'cmp_berberine', labelDoseMg: 1000, deliveryFormat: 'standard_capsule', pricePaid: 22 },
      { compoundId: 'cmp_berberine', labelDoseMg: 1000, deliveryFormat: 'standard_capsule', pricePaid: 15 },
    ],
  };
  const { preview, report } = await assembleAssessment(dup, provider);
  assert.ok(preview.overlap_flags.length >= 1);
  assert.equal(preview.overlap_flags[0].product_count, 2);
  assert.ok(report.stop.some((s) => s.compound === 'Berberine')); // the redundant one
});

// ---- §4d section routing, end to end -----------------------------------------------------
test('§4d: the live production stack no longer lands entirely in Stop', async () => {
  // The exact report from 2026-08-01: NMN 250 mg, TMG 1000 mg, Berberine 500 mg. Before §4d
  // all three were in Stop and Keep was an empty heading — including Berberine, the strongest
  // evidence in the database, and NMN, which was INSIDE its range with $0/mo of waste beside
  // it under "where your spend isn't working".
  const live: StoredIntake = {
    goalTag: 'healthy_aging',
    stackItems: [
      { compoundId: 'cmp_nmn', labelDoseMg: 400, deliveryFormat: 'standard_capsule', pricePaid: 45 },
      { compoundId: 'cmp_tmg', labelDoseMg: 1000, deliveryFormat: 'standard_capsule', pricePaid: 20 },
      { compoundId: 'cmp_berberine', labelDoseMg: 500, deliveryFormat: 'standard_capsule', pricePaid: 22 },
    ],
  };
  const { report } = await assembleAssessment(live, provider);
  assert.deepEqual(report.stop.map((r) => r.compound), [], 'nothing here is duplicate, Tier D, or null/negative');
  assert.deepEqual(
    report.adjust.map((r) => r.compound).sort(),
    ['Berberine', 'TMG (Trimethylglycine)'],
    'both out-of-range compounds belong in Adjust',
  );
  assert.deepEqual(report.keep.map((r) => r.compound), ['NMN'], 'in-range NMN belongs in Keep');
});

test('§4d: a stack where EVERY item is out of range still renders — the empty-state trap', async () => {
  // `report.start` is hardcoded [] by the backend, so the frontend's old empty predicate
  // (stop && keep && start all zero) would have called this report empty while it held two
  // findings. The backend half of that guarantee is asserted here; the predicate itself is
  // frontend and has no test runner.
  const allOut: StoredIntake = {
    goalTag: 'healthy_aging',
    stackItems: [
      { compoundId: 'cmp_nmn', labelDoseMg: 10, deliveryFormat: 'standard_capsule', pricePaid: 45 },
      { compoundId: 'cmp_berberine', labelDoseMg: 10, deliveryFormat: 'standard_capsule', pricePaid: 22 },
    ],
  };
  const { report } = await assembleAssessment(allOut, provider);
  assert.equal(report.stop.length, 0);
  assert.equal(report.keep.length, 0);
  assert.equal(report.start.length, 0); // the legacy field, always empty
  assert.equal(report.adjust.length, 2, 'the findings all live in Adjust');
  // The predicate the report page must use: Adjust alone is enough to make a report non-empty.
  const emptyByOldRule = report.stop.length === 0 && report.keep.length === 0 && report.start.length === 0;
  const emptyByNewRule = report.stop.length === 0 && report.adjust.length === 0 && report.keep.length === 0;
  assert.equal(emptyByOldRule, true, 'ANTI-VACUITY: the old predicate really would call this empty');
  assert.equal(emptyByNewRule, false, 'the corrected predicate must not');
});

test('§4d: nothing scored at all still produces a genuinely empty report', async () => {
  const { report } = await assembleAssessment({ goalTag: 'healthy_aging', stackItems: [] }, provider);
  assert.deepEqual([report.stop.length, report.adjust.length, report.keep.length], [0, 0, 0]);
});

test('§4d: a Tier C item inside its range lands in Keep, not Stop', async () => {
  const inRangeTierC: StoredIntake = {
    goalTag: 'healthy_aging',
    stackItems: [{ compoundId: 'cmp_resveratrol_ranged', labelDoseMg: 300, deliveryFormat: 'standard_capsule', pricePaid: 18 }],
  };
  const { report } = await assembleAssessment(inRangeTierC, provider);
  assert.deepEqual(report.keep.map((r) => r.compound), ['Resveratrol (ranged)']);
  assert.equal(report.stop.length, 0);
  assert.equal(report.adjust.length, 0);
});

test('§4d: duplicates — the extra Stops, the best-dosed copy continues to Adjust or Keep', async () => {
  const dup: StoredIntake = {
    goalTag: 'healthy_aging',
    stackItems: [
      { compoundId: 'cmp_berberine', labelDoseMg: 1000, deliveryFormat: 'standard_capsule', pricePaid: 22 }, // in range
      { compoundId: 'cmp_berberine', labelDoseMg: 200, deliveryFormat: 'standard_capsule', pricePaid: 15 }, // way below
    ],
  };
  const { report } = await assembleAssessment(dup, provider);
  assert.equal(report.stop.length, 1, 'exactly one copy is the redundant extra');
  assert.equal(report.stop[0].compound, 'Berberine');
  assert.equal(report.stop[0].est_monthly_waste, 15, 'the extra wastes its whole cost — the cheaper, worse-dosed one');
  assert.equal(report.keep.length, 1, 'the best-dosed copy is judged on its own dose');
  assert.equal(report.keep[0].compound, 'Berberine');
});
