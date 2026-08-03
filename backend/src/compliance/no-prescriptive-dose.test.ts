// =============================================================================
// NO PRESCRIPTIVE DOSE — CLAIMS_COMPLIANCE §4d.
//
// "No section may render a prescriptive dose. A finding may state the user's dose, the range
// used in human research, and the distance between them. It may not instruct the user to take
// a specific amount. ... Recommending a dose is clinical advice and this product does not give
// it."
//
// The risk this guards is specific to the Adjust section: a heading that names an action
// ("Adjust") invites a sentence that completes it ("...to 900 mg"). The section name is
// allowed to carry the action precisely BECAUSE the sentence does not.
//
// Reads RENDERED strings from a fully built report, not source, so it holds however the
// templates are written.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assembleAssessment,
  type EvidenceProvider,
  type ResolvedEvidence,
  type StoredIntake,
} from '../api/services/assessment-service.js';

/** Imperative dosing patterns. Each is a way of telling someone what to take. */
const PRESCRIPTIVE = [
  /\b(?:take|use|dose|consume|increase|decrease|raise|lower|reduce|bump|drop)\b[^.]*\b\d+\s*(?:mg|mcg|g|iu)\b/i,
  /\b(?:should|need to|must|ought to|try)\b[^.]*\b\d+\s*(?:mg|mcg|g|iu)\b/i,
  /\b(?:aim for|move to|go up to|go down to|switch to|adjust to|raise it to|lower it to)\b/i,
  /\b(?:we|our|the)\s+recommend(?:ed|s|ation)?\b/i,
  // AN AMOUNT IS REQUIRED on this one. §4d forbids instructing "a specific amount", and the
  // bare phrase is not that: the founder-approved preliminaryDoseNote ends "so an optimal dose
  // has not been established", which DENIES that a specific amount is known. Matching the words
  // alone flagged that sentence, which would have meant either weakening the rule or rewriting
  // approved copy. Requiring a quantity separates the assertion from its negation.
  /\b(?:recommended|optimal|ideal|correct|right|target)\s+dose\b[^.]*\b\d+\s*(?:mg|mcg|g|iu)\b/i,
  /\b\d+\s*(?:mg|mcg|g|iu)\s+(?:daily|per day|a day|twice daily)\b/i,
];

const EVIDENCE: Record<string, ResolvedEvidence> = {
  // Below range, Tier A — the Berberine case from the live report.
  cmp_berberine: {
    canonicalName: 'Berberine', goalTag: 'metabolic_health', directionOfEvidence: 'positive',
    rangeLowMg: 900, rangeHighMg: 1500, bioavailabilityAdjustmentFactor: 1,
    evidenceTier: 'A_strong', contributingSourceIds: ['src_berb'], tierRationale: 'Meta-analysis of 27 RCTs.',
    lastReviewed: '2026-07-30', reviewerName: 'Ziad Meras', sourceShortName: 'Meta-analysis',
  },
  // Above range, Tier C — exercises both the above-range branch and the widened tier gate.
  cmp_tmg: {
    canonicalName: 'TMG (Trimethylglycine)', goalTag: 'training_and_recovery', directionOfEvidence: 'positive',
    rangeLowMg: 2500, rangeHighMg: 5000, bioavailabilityAdjustmentFactor: 1,
    evidenceTier: 'C_limited', contributingSourceIds: ['src_tmg'], tierRationale: 'A single trial.',
    lastReviewed: '2026-07-30', reviewerName: 'Ziad Meras', sourceShortName: 'Hoffman 2009',
  },
  // In range — Keep.
  cmp_nmn: {
    canonicalName: 'NMN (Nicotinamide Mononucleotide)', goalTag: 'metabolic_health', directionOfEvidence: 'positive',
    rangeLowMg: 250, rangeHighMg: 500, bioavailabilityAdjustmentFactor: 1,
    evidenceTier: 'C_limited', contributingSourceIds: ['src_nmn'], tierRationale: 'One RCT.',
    lastReviewed: '2026-07-30', reviewerName: 'Ziad Meras', sourceShortName: 'Yoshino 2021',
  },
  // No studied range at all — the §4d no-range branch.
  cmp_spermidine: {
    canonicalName: 'Spermidine', goalTag: 'healthy_aging', directionOfEvidence: 'positive',
    rangeLowMg: null, rangeHighMg: null, bioavailabilityAdjustmentFactor: 1,
    evidenceTier: 'C_limited', contributingSourceIds: ['src_sperm'], tierRationale: 'Observational only.',
    lastReviewed: '2026-07-30', reviewerName: 'Ziad Meras', sourceShortName: 'cohort',
  },
  // Tier D — Stop.
  cmp_fisetin: {
    canonicalName: 'Fisetin', goalTag: 'healthy_aging', directionOfEvidence: 'positive',
    rangeLowMg: 100, rangeHighMg: 500, bioavailabilityAdjustmentFactor: 1,
    evidenceTier: 'D_preliminary', contributingSourceIds: ['src_fis'], tierRationale: 'Animal models only.',
    lastReviewed: '2026-07-30', reviewerName: 'Ziad Meras', sourceShortName: 'preclinical',
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

/** One item per section, including both an under- and an over-range Adjust row. */
const STACK: StoredIntake = {
  goalTag: 'healthy_aging',
  stackItems: [
    { compoundId: 'cmp_berberine', labelDoseMg: 500, deliveryFormat: 'standard_capsule', pricePaid: 22 },
    { compoundId: 'cmp_tmg', labelDoseMg: 8000, deliveryFormat: 'standard_capsule', pricePaid: 20 },
    { compoundId: 'cmp_nmn', labelDoseMg: 300, deliveryFormat: 'standard_capsule', pricePaid: 45 },
    { compoundId: 'cmp_spermidine', labelDoseMg: 5, deliveryFormat: 'standard_capsule', pricePaid: 30 },
    { compoundId: 'cmp_fisetin', labelDoseMg: 200, deliveryFormat: 'standard_capsule', pricePaid: 18 },
  ],
};

async function everyRenderedString(): Promise<Array<{ where: string; text: string }>> {
  const { preview, report } = await assembleAssessment(STACK, provider);
  const out: Array<{ where: string; text: string }> = [];
  for (const r of report.stop) out.push({ where: `stop/${r.compound}`, text: r.reason });
  for (const r of report.adjust) out.push({ where: `adjust/${r.compound}`, text: r.reason });
  for (const r of report.keep) out.push({ where: `keep/${r.compound}`, text: r.note });
  for (const r of [...report.stop, ...report.adjust, ...report.keep]) {
    out.push({ where: `rationale/${r.compound}`, text: r.tier_rationale });
    if (r.outcome_mismatch_note) out.push({ where: `mismatch/${r.compound}`, text: r.outcome_mismatch_note });
  }
  out.push({ where: 'preview/headline', text: preview.headline_finding });
  return out;
}

test('GUARD: no rendered finding instructs a dose', async () => {
  const offenders: string[] = [];
  for (const { where, text } of await everyRenderedString()) {
    for (const pattern of PRESCRIPTIVE) {
      if (pattern.test(text)) offenders.push(`${where}: ${pattern} matched -> ${text}`);
    }
  }
  assert.deepEqual(offenders, [], `prescriptive dosing language rendered:\n  ${offenders.join('\n  ')}`);
});

test('ANTI-VACUITY: the guard catches the sentences it exists to stop', async () => {
  // A guard that never fires proves nothing. These are the completions an "Adjust" heading
  // invites, and each must trip at least one pattern.
  const wouldBeWrong = [
    'Your current intake of Berberine is 500 mg. Increase to 900 mg to reach the studied range.',
    'You should take 1200 mg daily.',
    'Aim for the middle of the studied range.',
    'We recommend 900 mg.',
    'The optimal dose is 1000 mg.',
    'Try 900 mg instead.',
  ];
  for (const bad of wouldBeWrong) {
    assert.ok(
      PRESCRIPTIVE.some((p) => p.test(bad)),
      `guard failed to catch prescriptive text: ${bad}`,
    );
  }

  // The other direction, pinned so the guard cannot be re-broadened into flagging a DENIAL.
  // Each of these says no specific amount is known, or states a distance — the opposite of a
  // prescription — and each is founder-approved copy in service today.
  const mustNotFire = [
    'Studies of Fisetin have used doses around 200 mg. That evidence has not been independently replicated, so an optimal dose has not been established.',
    'Our reviewed database has no studied dose range for Spermidine, so your dose could not be compared against research.',
    'Your current intake of Berberine is 500 mg — 44% below the range used in human research (900–1500 mg), based on Meta-analysis.',
  ];
  for (const ok of mustNotFire) {
    const hit = PRESCRIPTIVE.find((p) => p.test(ok));
    assert.ok(!hit, `guard wrongly flagged non-prescriptive approved copy (${hit}): ${ok}`);
  }
});

test('§4d: every Adjust row states the finding that put it there', async () => {
  const { report } = await assembleAssessment(STACK, provider);
  assert.ok(report.adjust.length >= 2, 'the fixture must produce Adjust rows for this to mean anything');
  for (const r of report.adjust) {
    // Either a distance statement, or — when there is no range — the reason there is no
    // distance to state. A row under a heading naming an action must say why it is there.
    const statesDistance = /\d+% (?:below|above) the range used in human research/.test(r.reason);
    const statesNoRange = /no studied dose range for/.test(r.reason);
    assert.ok(
      statesDistance || statesNoRange,
      `Adjust row for ${r.compound} states no finding: ${r.reason}`,
    );
  }
});

test('§4d: a Tier C item ABOVE its range still gets the distance statement', async () => {
  // The specific gap the widened `reasonFor` gate closes. Before 2026-08-01 the dose comparison
  // was Tier A/B only, so a Tier C row in Adjust would have named an action and said nothing
  // about what to adjust.
  const { report } = await assembleAssessment(STACK, provider);
  const tmg = report.adjust.find((a) => a.compound.startsWith('TMG'));
  assert.ok(tmg, 'TMG 8000 mg against 2500-5000 mg belongs in Adjust');
  assert.equal(tmg.evidence_tier, 'C');
  assert.match(tmg.reason, /60% above the range used in human research \(2500–5000 mg\)/);
});

test('§4d: an item with no studied range lands in Adjust and says so', async () => {
  const { report } = await assembleAssessment(STACK, provider);
  const sperm = report.adjust.find((a) => a.compound === 'Spermidine');
  assert.ok(sperm, 'no studied range belongs in Adjust, not Keep');
  assert.match(sperm.reason, /no studied dose range for Spermidine/);
  // No number and no verdict: there was nothing to compare against.
  assert.doesNotMatch(sperm.reason, /\d+%/);
});

test('§4d: Tier D routes to Stop even at a correct dose', async () => {
  const { report } = await assembleAssessment(STACK, provider);
  assert.ok(report.stop.some((s) => s.compound === 'Fisetin'), 'Tier D belongs in Stop');
  assert.ok(!report.adjust.some((a) => a.compound === 'Fisetin'));
  assert.ok(!report.keep.some((k) => k.compound === 'Fisetin'));
});
