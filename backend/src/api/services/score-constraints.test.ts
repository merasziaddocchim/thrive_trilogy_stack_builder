// =============================================================================
// CLAIMS_COMPLIANCE §4f, through the REAL assembly path.
//
// score-interpretation.test.ts pins the four sentences. This pins that the right one is
// selected for a real stack — including the live 2026-08-06 case that produced the false
// sentence, and including the assertion that the raw constraint numbers are NOT served.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assembleAssessment,
  type EvidenceProvider,
  type ResolvedEvidence,
  type StoredIntake,
} from './assessment-service.js';

const S = {
  NEITHER: 'Every dose you entered sits inside the range used in human research, and every compound is at Evidence Tier A.',
  EVIDENCE: 'Every dose you entered sits inside the range used in human research. What limits this score is the strength of the evidence behind these compounds, not your dosing.',
  DOSING: 'Some of your doses sit outside the range used in human research, which is what limits this score.',
  BOTH: 'Some of your doses sit outside the range used in human research, and the evidence behind some compounds limits how high this score can go.',
};

const ev = (over: Partial<ResolvedEvidence>): ResolvedEvidence => ({
  canonicalName: 'X', goalTag: 'healthy_aging', rangeLowMg: 250, rangeHighMg: 500,
  bioavailabilityAdjustmentFactor: 1, evidenceTier: 'A_strong', directionOfEvidence: 'positive',
  contributingSourceIds: ['s'], tierRationale: 'r', lastReviewed: '2026-07-20',
  reviewerName: 'Ziad Meras', sourceShortName: 'src', ...over,
});

function providerOf(map: Record<string, ResolvedEvidence>): EvidenceProvider {
  return {
    async resolve(ids) { return new Map(ids.filter((i) => map[i]).map((i) => [i, map[i]])); },
    async unreviewed() { return []; },
    async interactions() { return []; },
  };
}
const stack = (...ids: string[]): StoredIntake => ({
  goalTag: 'healthy_aging',
  stackItems: ids.map((id) => ({ compoundId: id, labelDoseMg: 300, deliveryFormat: 'standard_capsule' as const, pricePaid: 30 })),
});

// dose 300 against 250-500 = inside; against 1000-2000 = well below.
const IN_RANGE = { rangeLowMg: 250, rangeHighMg: 500 };
const OUT_OF_RANGE = { rangeLowMg: 1000, rangeHighMg: 2000 };

const CASES: Array<[string, ResolvedEvidence, string]> = [
  ['neither  (Tier A, in range)', ev({ ...IN_RANGE, evidenceTier: 'A_strong' }), S.NEITHER],
  ['evidence (Tier C, in range)', ev({ ...IN_RANGE, evidenceTier: 'C_limited' }), S.EVIDENCE],
  ['dosing   (Tier A, out of range)', ev({ ...OUT_OF_RANGE, evidenceTier: 'A_strong' }), S.DOSING],
  ['both     (Tier C, out of range)', ev({ ...OUT_OF_RANGE, evidenceTier: 'C_limited' }), S.BOTH],
];

for (const [label, evidence, expected] of CASES) {
  test(`§4f: ${label}`, async () => {
    const { preview, report } = await assembleAssessment(stack('c1'), providerOf({ c1: evidence }));
    assert.equal(preview.interpretation_note, expected, label);
    assert.equal(report.interpretation_note, expected, 'preview and report must agree');
    // and the other three must NOT render
    for (const other of Object.values(S)) {
      if (other === expected) continue;
      assert.notEqual(preview.interpretation_note, other, `wrong state rendered for: ${label}`);
    }
  });
}

test('§4f: the live 2026-08-06 stack renders the evidence-binds sentence', async () => {
  // NMN 250 mg against the real 250-500 mg metabolic_health range at Tier C: dosing accuracy
  // 100, evidence ceiling 60. The withdrawn band sentence claimed spend sat outside the
  // studied ranges; nothing did.
  const nmn = ev({ canonicalName: 'NMN', rangeLowMg: 250, rangeHighMg: 500, evidenceTier: 'C_limited' });
  const intake: StoredIntake = {
    goalTag: 'healthy_aging',
    stackItems: [{ compoundId: 'cmp_nmn', labelDoseMg: 250, deliveryFormat: 'standard_capsule', pricePaid: 40 }],
  };
  const { preview, report } = await assembleAssessment(intake, providerOf({ cmp_nmn: nmn }));

  assert.equal(preview.spend_efficiency_index, 60, 'the score that produced the false sentence');
  assert.equal(preview.interpretation_note, S.EVIDENCE);
  assert.equal(
    report.total_estimated_annual_waste.low + report.total_estimated_annual_waste.high,
    0,
    'no waste — corroborating that nothing is outside its range',
  );
  assert.notEqual(
    preview.interpretation_note,
    'A meaningful share of your spend sits outside the studied ranges.',
    'the withdrawn sentence must not render',
  );
});

test('ANTI-VACUITY: the withdrawn band logic gives the WRONG answer on that stack', () => {
  // Run the retired selector and prove it disagrees. Without this, the test above would pass
  // against the old code too, because the old code also produced *a* sentence for score 60.
  const withdrawnBand = (score: number): string =>
    score >= 80 ? 'Most of your spend aligns with the studied ranges and evidence.'
    : score >= 55 ? 'A meaningful share of your spend sits outside the studied ranges.'
    : 'A large share of your spend sits outside the studied ranges or evidence.';
  assert.equal(withdrawnBand(60), 'A meaningful share of your spend sits outside the studied ranges.');
  assert.notEqual(withdrawnBand(60), S.EVIDENCE, 'the old selector cannot reach the right sentence');
});

test('§4f: no API response carries the raw constraint numbers', async () => {
  // The sentence is emitted, not the inputs. dosingAccuracy/evidenceCeiling stay inside the
  // engine — serving them would invite a client to re-derive the claim outside the guard.
  const { preview, report } = await assembleAssessment(
    stack('c1'),
    providerOf({ c1: ev({ ...IN_RANGE, evidenceTier: 'C_limited' }) }),
  );
  for (const [label, body] of [['preview', preview], ['report', report]] as const) {
    const json = JSON.stringify(body);
    assert.ok(!/dosingAccuracy|dosing_accuracy/.test(json), `${label} leaks dosingAccuracy`);
    assert.ok(!/evidenceCeiling|evidence_ceiling/.test(json), `${label} leaks evidenceCeiling`);
  }
});

test('§4f: an unreviewed-only stack has no score and therefore no interpretation', async () => {
  const provider: EvidenceProvider = {
    async resolve() { return new Map(); },
    async unreviewed(ids) { return ids.map((id) => ({ compoundId: id, canonicalName: 'Creatine' })); },
    async interactions() { return []; },
  };
  const { preview, report } = await assembleAssessment(stack('c1'), provider);
  assert.equal(preview.spend_efficiency_index, null);
  assert.equal(preview.interpretation_note, null, 'nothing to interpret without a score');
  assert.equal(report.interpretation_note, null);
});

test('§4e: the bundle disclosure is served on the bundle that needs it, and not on the other', async () => {
  // NMN in the stack makes both NMNBio bundles visible; only the Starter Pack contains an
  // unreviewed compound.
  const { report } = await assembleAssessment(
    { goalTag: 'healthy_aging', stackItems: [{ compoundId: 'c0000000-0000-4000-8000-000000000001', labelDoseMg: 300, deliveryFormat: 'standard_capsule', pricePaid: 30 }] },
    providerOf({ 'c0000000-0000-4000-8000-000000000001': ev({ canonicalName: 'NMN' }) }),
  );
  const starter = report.start_section.tier3.find((b) => b.product === 'Longevity Starter Pack');
  const morning = report.start_section.tier3.find((b) => b.product === 'Morning Bundle');
  assert.ok(starter && morning, 'both bundles should be visible for an NMN stack');
  assert.equal(starter!.unreviewed_note, 'Not evidence-reviewed: Quercetin');
  assert.equal(morning!.unreviewed_note, null, 'a proprietary blend is not an unreviewed compound');
});
