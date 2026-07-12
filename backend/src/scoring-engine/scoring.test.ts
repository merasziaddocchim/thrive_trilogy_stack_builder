import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCompoundSubScore, scoreStack, EVIDENCE_CEILINGS } from './index.js';
import { dosingAccuracy } from './dosing.js';
import type { ScoredCompoundInput, StackInteraction } from './types.js';

function base(overrides: Partial<ScoredCompoundInput> = {}): ScoredCompoundInput {
  return {
    compoundId: 'cmp',
    canonicalName: 'Test',
    labelDoseMg: 100,
    deliveryFormat: 'standard_capsule',
    dollarsSpent: 30,
    rangeLowMg: 250,
    rangeHighMg: 500,
    bioavailabilityAdjustmentFactor: 1,
    evidenceTier: 'B_moderate',
    contributingSourceIds: ['src_1'],
    ...overrides,
  };
}

// ---- The worked example from TECH_DOCS §2 ----------------------------------
test('NMN worked example: 150mg, range 250–500, Tier B → sub-score 60', () => {
  const nmn = base({
    canonicalName: 'NMN',
    labelDoseMg: 150,
    evidenceTier: 'B_moderate',
  });
  const s = computeCompoundSubScore(nmn);
  assert.equal(s.dosingAccuracy, 60); // 100 × (150/250)
  assert.equal(s.evidenceCeiling, 80); // Tier B
  assert.equal(s.subScore, 60); // min(60, 80)
});

test('same 150mg dose at Tier D → evidence ceiling caps the sub-score at 40', () => {
  const s = computeCompoundSubScore(base({ labelDoseMg: 150, evidenceTier: 'D_preliminary' }));
  assert.equal(s.dosingAccuracy, 60);
  assert.equal(s.evidenceCeiling, 40); // Tier D
  assert.equal(s.subScore, 40); // min(60, 40) — evidence weakness drags it down
});

// ---- Dosing accuracy math --------------------------------------------------
test('dose within studied range scores DA 100', () => {
  assert.equal(dosingAccuracy(300, 250, 500), 100);
});

test('underdosing scales linearly from range_low', () => {
  assert.equal(dosingAccuracy(125, 250, 500), 50); // 100 × 125/250
});

test('overdosing decays via the confirmed 50× slope past range_high', () => {
  // 100 − 50 × ((1000 − 500)/500) = 100 − 50 = 50
  assert.equal(dosingAccuracy(1000, 250, 500), 50);
  // far overdose floors at 0, never negative
  assert.equal(dosingAccuracy(5000, 250, 500), 0);
});

test('null studied range cannot be assessed → DA 100 (bounded by ceiling elsewhere)', () => {
  assert.equal(dosingAccuracy(999, null, null), 100);
  const s = computeCompoundSubScore(base({ rangeLowMg: null, rangeHighMg: null, evidenceTier: 'C_limited' }));
  assert.equal(s.subScore, EVIDENCE_CEILINGS.C_limited); // 60
});

test('bioavailability factor scales the effective dose', () => {
  // 100mg × 2.5 = 250mg effective → within range → DA 100
  const s = computeCompoundSubScore(base({ labelDoseMg: 100, bioavailabilityAdjustmentFactor: 2.5 }));
  assert.equal(s.effectiveDoseMg, 250);
  assert.equal(s.dosingAccuracy, 100);
});

// ---- Composite: dollar-weighting ------------------------------------------
test('composite is dollar-weighted, not a flat average', () => {
  // A: sub 100 (well dosed) at $10; B: sub 40 (Tier D) at $190.
  const a = base({ compoundId: 'a', labelDoseMg: 300, evidenceTier: 'A_strong', dollarsSpent: 10 });
  const b = base({ compoundId: 'b', labelDoseMg: 300, evidenceTier: 'D_preliminary', dollarsSpent: 190 });
  const r = scoreStack([a, b]);
  // flat mean would be (100+40)/2 = 70; dollar-weighted ≈ (100×10 + 40×190)/200 = 43
  assert.equal(r.compositeScore, 43);
});

test('zero total spend falls back to a flat mean rather than dividing by zero', () => {
  const a = base({ compoundId: 'a', labelDoseMg: 300, evidenceTier: 'A_strong', dollarsSpent: 0 });
  const b = base({ compoundId: 'b', labelDoseMg: 300, evidenceTier: 'C_limited', dollarsSpent: 0 });
  const r = scoreStack([a, b]);
  assert.equal(r.compositeScore, 80); // (100 + 60) / 2
});

// ---- Safety modifier -------------------------------------------------------
test('an "avoid" interaction caps the composite at 50 and raises a separate flag', () => {
  const a = base({ compoundId: 'a', labelDoseMg: 300, evidenceTier: 'A_strong', dollarsSpent: 100 });
  const interactions: StackInteraction[] = [
    { compoundIdA: 'a', compoundIdB: 'x', severity: 'avoid', sourceIds: ['s'] },
  ];
  const r = scoreStack([a], interactions);
  assert.equal(r.compositeScore, 50); // capped down from 100
  assert.equal(r.safetyFlag, true);
});

test('a "caution" interaction does not cap the score but is returned as a note', () => {
  const a = base({ compoundId: 'a', labelDoseMg: 300, evidenceTier: 'A_strong', dollarsSpent: 100 });
  const r = scoreStack([a], [
    { compoundIdA: 'a', compoundIdB: 'x', severity: 'caution', sourceIds: ['s'] },
  ]);
  assert.equal(r.compositeScore, 100);
  assert.equal(r.safetyFlag, false);
  assert.equal(r.cautionNotes.length, 1);
});

// ---- Dollar waste ----------------------------------------------------------
test('redundancy waste = cost of every product beyond the best-dosed keeper in a group', () => {
  // Two NAD+ precursors sharing a pathway. NMN is well dosed (DA 100); NR is underdosed
  // (150mg in a 250–500 range → DA 60), so the well-dosed NMN is the keeper and the $20 NR
  // is redundant spend, regardless of price.
  const nmn = base({ compoundId: 'nmn', labelDoseMg: 300, dollarsSpent: 30, sharedIngredientKey: 'nad_precursor' });
  const nr = base({ compoundId: 'nr', labelDoseMg: 150, dollarsSpent: 20, sharedIngredientKey: 'nad_precursor' });
  const r = scoreStack([nmn, nr]);
  assert.equal(r.waste.redundancyMonthly, 20); // the non-keeper's monthly cost
  assert.equal(r.waste.annualHigh >= r.waste.annualLow, true);
});

test('estimated annual waste is always a low–high range, never a single figure', () => {
  const under = base({ labelDoseMg: 125, dollarsSpent: 40, evidenceTier: 'A_strong' }); // DA 50
  const r = scoreStack([under]);
  assert.equal(typeof r.waste.annualLow, 'number');
  assert.equal(typeof r.waste.annualHigh, 'number');
  assert.ok(r.waste.annualHigh > r.waste.annualLow);
});

// ---- Compliance gate -------------------------------------------------------
test('scoreStack refuses a compound missing contributing_source_ids (CLAIMS §4)', () => {
  assert.throws(
    () => scoreStack([base({ contributingSourceIds: [] })]),
    /contributing_source_ids/,
  );
});
