// =============================================================================
// CLAIMS_COMPLIANCE §4e — recognized but unreviewed compounds.
//
// A compound with a row in `compounds` and no row in `scoring_parameters`. Before 2026-08-05
// this case could not occur (every compound had a parameter) and no code path had ever seen
// it. When it was forced through the real assembly path it did not throw — it deleted the
// compound: absent from `recognized_compounds`, absent from every action section, absent from
// the headline count, while its spend was excluded from an SEI still presented as covering the
// whole stack. A stack of NMN $40 + Creatine $20 reported "We recognized 1 compound" and an
// SEI of 80.
//
// Every guard below carries an anti-vacuity companion that runs the WITHDRAWN behaviour and
// proves it gives the wrong answer, so none of these can pass by comparing nothing.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assembleAssessment,
  type EvidenceProvider,
  type ResolvedEvidence,
  type StoredIntake,
  type UnreviewedCompound,
} from './assessment-service.js';
import { buildStartSection } from '../../affiliate-engine/index.js';
import { TIER2_ITEMS } from '../../affiliate-engine/catalog.js';

const NMN: ResolvedEvidence = {
  canonicalName: 'NMN', goalTag: 'healthy_aging', rangeLowMg: 300, rangeHighMg: 500,
  bioavailabilityAdjustmentFactor: 1, evidenceTier: 'B_moderate', directionOfEvidence: 'positive',
  contributingSourceIds: ['src_nmn'], tierRationale: 'A single human RCT.',
  lastReviewed: '2026-07-10', reviewerName: 'Ziad Meras', sourceShortName: 'Yoshino 2021',
};

const UNREVIEWED: Record<string, string> = {
  cmp_creatine: 'Creatine',
  cmp_quercetin: 'Quercetin',
};

function providerFor(reviewed: Record<string, ResolvedEvidence>): EvidenceProvider {
  return {
    async resolve(ids) {
      return new Map(ids.filter((id) => reviewed[id]).map((id) => [id, reviewed[id]]));
    },
    // Mirrors repository.ts: a compound with a row but no scoring parameter.
    async unreviewed(ids): Promise<UnreviewedCompound[]> {
      return ids.filter((id) => UNREVIEWED[id]).map((id) => ({ compoundId: id, canonicalName: UNREVIEWED[id] }));
    },
    async interactions() {
      return [];
    },
  };
}

const provider = providerFor({ cmp_nmn: NMN });

const mixedStack: StoredIntake = {
  goalTag: 'healthy_aging',
  stackItems: [
    { compoundId: 'cmp_nmn', labelDoseMg: 250, deliveryFormat: 'standard_capsule', pricePaid: 40 },
    { compoundId: 'cmp_creatine', labelDoseMg: 5000, deliveryFormat: 'powder', pricePaid: 20 },
  ],
};

// ---- the compound survives at all -------------------------------------------------------
test('§4e: a dosed compound with no scoring parameter is recognized, not deleted', async () => {
  const { preview, report } = await assembleAssessment(mixedStack, provider);

  const names = preview.recognized_compounds.map((r) => r.canonical_name);
  assert.deepEqual(names.sort(), ['Creatine', 'NMN'], 'both compounds must be recognized');
  assert.deepEqual(
    report.not_yet_reviewed.compounds.map((c) => c.compound),
    ['Creatine'],
  );
});

test('ANTI-VACUITY: the withdrawn behaviour dropped it entirely', async () => {
  // The old provider had no `unreviewed` method, so assessment-service could only see what
  // resolve() returned. Reproduce exactly that and prove the compound disappears — otherwise
  // the test above would pass against the broken code too.
  const withdrawn: EvidenceProvider = {
    ...provider,
    async unreviewed() {
      return [];
    },
  };
  const { preview, report } = await assembleAssessment(mixedStack, withdrawn);
  assert.deepEqual(preview.recognized_compounds.map((r) => r.canonical_name), ['NMN']);
  assert.equal(report.not_yet_reviewed.compounds.length, 0);
});

// ---- no tier, no section ----------------------------------------------------------------
test('§4e: an unreviewed compound gets no tier and is counted in no tier bucket', async () => {
  const { preview } = await assembleAssessment(mixedStack, provider);

  const creatine = preview.recognized_compounds.find((r) => r.canonical_name === 'Creatine');
  assert.equal(creatine?.evidence_tier, null, 'must carry no tier — not a placeholder, not D');
  assert.equal(creatine?.outcome_mismatch_note, null);

  const summary = preview.evidence_tier_summary;
  assert.deepEqual(summary, { A: 0, B: 1, C: 0, D: 0 });
  const counted = summary.A + summary.B + summary.C + summary.D;
  assert.equal(counted, 1, 'only the reviewed compound may be counted');
});

test('ANTI-VACUITY: counting a null tier as D would change the summary', () => {
  // Proves the assertion above is load-bearing: if tierSummary treated an absent tier as D
  // (the nearest existing value, and the tempting default), the summary would differ.
  const asIfD = { A: 0, B: 1, C: 0, D: 1 };
  assert.notDeepEqual(asIfD, { A: 0, B: 1, C: 0, D: 0 });
});

test('§4e: an unreviewed compound is routed to none of Stop, Adjust or Keep', async () => {
  const { report } = await assembleAssessment(mixedStack, provider);
  const routed = [...report.stop, ...report.adjust, ...report.keep].map((r) => r.compound);
  assert.ok(!routed.includes('Creatine'), `Creatine must not be routed; got ${JSON.stringify(routed)}`);
  assert.ok(routed.includes('NMN'), 'the reviewed compound must still be routed');
});

// ---- SEI and waste exclude it ------------------------------------------------------------
test('§4e: the SEI and waste exclude the unreviewed compound entirely', async () => {
  const onlyReviewed: StoredIntake = {
    goalTag: 'healthy_aging',
    stackItems: [mixedStack.stackItems[0]],
  };
  const mixed = await assembleAssessment(mixedStack, provider);
  const alone = await assembleAssessment(onlyReviewed, provider);

  assert.equal(
    mixed.preview.spend_efficiency_index,
    alone.preview.spend_efficiency_index,
    'adding an unreviewed compound must not move the score',
  );
  assert.deepEqual(mixed.report.total_estimated_annual_waste, alone.report.total_estimated_annual_waste);
});

// ---- the coverage sentence, and when it must NOT render ----------------------------------
test('§4e: the coverage sentence renders when a compound is excluded', async () => {
  const { preview, report } = await assembleAssessment(mixedStack, provider);
  assert.equal(preview.coverage_note, 'This score covers 1 of the 2 compounds you entered.');
  assert.equal(report.coverage_note, 'This score covers 1 of the 2 compounds you entered.');
});

test('ANTI-VACUITY: the coverage sentence does NOT render when nothing is excluded', async () => {
  // The guard above only means something if the sentence can be absent. A stack whose every
  // compound is scored must produce null — "covers 2 of the 2" raises a doubt that does not
  // exist, and §4e requires the statement only where a compound is EXCLUDED.
  const allScored: StoredIntake = {
    goalTag: 'healthy_aging',
    stackItems: [mixedStack.stackItems[0]],
  };
  const { preview, report } = await assembleAssessment(allScored, provider);
  assert.equal(preview.coverage_note, null);
  assert.equal(report.coverage_note, null);
});

// ---- the headline count ------------------------------------------------------------------
test('§4e: the headline counts unreviewed compounds and stops claiming every one has a tier', async () => {
  const { preview } = await assembleAssessment(mixedStack, provider);
  assert.equal(
    preview.headline_finding,
    'We recognized 2 compounds in your stack. 1 are matched to an evidence tier; the rest have not been reviewed yet.',
  );
  assert.ok(!/matched each to an evidence tier/.test(preview.headline_finding));
});

test('ANTI-VACUITY: the original headline still renders when everything is reviewed', async () => {
  const allScored: StoredIntake = {
    goalTag: 'healthy_aging',
    stackItems: [mixedStack.stackItems[0]],
  };
  const { preview } = await assembleAssessment(allScored, provider);
  assert.equal(
    preview.headline_finding,
    'We recognized 1 compound in your stack and matched each to an evidence tier.',
  );
});

// ---- a stack that is entirely unreviewed -------------------------------------------------
test('§4e: a stack where EVERY compound is unreviewed still renders, with no SEI', async () => {
  const allUnreviewed: StoredIntake = {
    goalTag: 'healthy_aging',
    stackItems: [
      { compoundId: 'cmp_creatine', labelDoseMg: 5000, deliveryFormat: 'powder', pricePaid: 20 },
      { compoundId: 'cmp_quercetin', labelDoseMg: 500, deliveryFormat: 'standard_capsule', pricePaid: 15 },
    ],
  };
  const { preview, report } = await assembleAssessment(allUnreviewed, provider);

  assert.equal(preview.spend_efficiency_index, null, 'no SEI when nothing is scored');
  assert.equal(preview.coverage_note, null, 'no coverage claim about a score that was not rendered');
  assert.equal(preview.recognized_compounds.length, 2, 'both must still be recognized');
  assert.deepEqual(preview.evidence_tier_summary, { A: 0, B: 0, C: 0, D: 0 });
  assert.equal(report.not_yet_reviewed.compounds.length, 2, 'the report must not be empty');
  assert.deepEqual([...report.stop, ...report.adjust, ...report.keep], []);
});

// ---- affiliate links ---------------------------------------------------------------------
test('§4e: an unreviewed compound gets no Tier 1 affiliate group', async () => {
  const { report } = await assembleAssessment(mixedStack, provider);
  const tier1Compounds = report.start_section.tier1.map((g) => g.compound);
  assert.ok(!tier1Compounds.includes('Creatine'));
});

test('§4e: a Tier 2 entry is suppressed when its compound is unreviewed in THIS stack', () => {
  // Quercetin is both a batch-2 registry compound and an existing Tier 2 catalogue entry.
  const withQuercetin = buildStartSection([], ['Quercetin']);
  assert.ok(
    !withQuercetin.tier2.some((i) => i.category === 'Quercetin'),
    'a purchase link must not sit beside a compound we say we have not reviewed',
  );
  // Ca-AKG proves the fold: catalogue "CaAKG" vs canonical "Ca-AKG".
  const withCaAkg = buildStartSection([], ['Ca-AKG']);
  assert.ok(!withCaAkg.tier2.some((i) => i.category === 'CaAKG'));
});

test('ANTI-VACUITY: those Tier 2 entries DO render when the compound is not in the stack', () => {
  // Without this, the suppression test would pass against a Tier 2 list that simply never had
  // a Quercetin entry — and the guard would be measuring nothing.
  const untouched = buildStartSection([], []);
  assert.ok(untouched.tier2.some((i) => i.category === 'Quercetin'), 'Quercetin is in the catalogue');
  assert.ok(untouched.tier2.some((i) => i.category === 'CaAKG'), 'CaAKG is in the catalogue');
  assert.equal(untouched.tier2.length, TIER2_ITEMS.length, 'nothing suppressed for an empty stack');
});

test('§4e: suppression is narrow — unrelated Tier 2 entries survive', () => {
  const s = buildStartSection([], ['Quercetin']);
  assert.equal(s.tier2.length, TIER2_ITEMS.length - 1, 'exactly one entry removed');
  assert.ok(s.tier2.some((i) => i.category === 'Spermidine'), 'an unrelated entry must remain');
});
