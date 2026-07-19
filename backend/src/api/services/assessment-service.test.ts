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
const EVIDENCE: Record<string, ResolvedEvidence> = {
  cmp_nmn: {
    canonicalName: 'NMN', rangeLowMg: 300, rangeHighMg: 500, bioavailabilityAdjustmentFactor: 1,
    evidenceTier: 'B_moderate', contributingSourceIds: ['src_nmn'], tierRationale: 'A single human RCT.',
    lastReviewed: '2026-07-10', reviewerName: 'Ziad Meras', sourceShortName: 'Yoshino 2021',
  },
  cmp_berberine: {
    canonicalName: 'Berberine', rangeLowMg: 900, rangeHighMg: 1500, bioavailabilityAdjustmentFactor: 1,
    evidenceTier: 'A_strong', contributingSourceIds: ['src_berb'], tierRationale: 'Meta-analysis of 27 RCTs.',
    lastReviewed: '2026-07-10', reviewerName: 'Ziad Meras', sourceShortName: 'Meta-analysis',
  },
  cmp_resveratrol: {
    canonicalName: 'Resveratrol', rangeLowMg: null, rangeHighMg: null, bioavailabilityAdjustmentFactor: 1,
    evidenceTier: 'C_limited', contributingSourceIds: ['src_resv'], tierRationale: 'Observational only.',
    lastReviewed: '2026-07-10', reviewerName: 'Ziad Meras', sourceShortName: 'cohort',
  },
  cmp_tmg: {
    canonicalName: 'TMG (Trimethylglycine)', rangeLowMg: 1500, rangeHighMg: 6000, bioavailabilityAdjustmentFactor: 1,
    evidenceTier: 'B_moderate', contributingSourceIds: ['src_tmg'], tierRationale: 'Meta-analysis of homocysteine RCTs.',
    lastReviewed: '2026-07-10', reviewerName: 'Ziad Meras', sourceShortName: 'McRae 2013',
  },
};

const provider: EvidenceProvider = {
  async resolve(ids) {
    return new Map(ids.filter((id) => EVIDENCE[id]).map((id) => [id, EVIDENCE[id]]));
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

test('report categorizes: underdosed Tier B NMN → Stop with a dose-comparison reason', async () => {
  const { report } = await assembleAssessment(withSpend, provider);
  const nmn = report.stop.find((s) => s.compound === 'NMN');
  assert.ok(nmn, 'NMN should be in Stop');
  assert.match(nmn.reason, /17% below the range used in human research \(300–500 mg\)/);
});

test('report categorizes: Tier C Resveratrol (no range) → Stop, hedged, no dose verdict', async () => {
  const { report } = await assembleAssessment(withSpend, provider);
  const resv = report.stop.find((s) => s.compound === 'Resveratrol');
  assert.ok(resv);
  assert.match(resv.reason, /Preliminary, non-human research/);
});

test('every report claim object carries evidence_tier and non-empty source_ids (CLAIMS §4)', async () => {
  const { report } = await assembleAssessment(withSpend, provider);
  for (const row of [...report.stop, ...report.keep]) {
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
