// =============================================================================
// CLAIMS_COMPLIANCE §4f — the sentence beside the Spend Efficiency Index.
//
// WHAT WAS WRONG. Three sentences were chosen by score band, inside the React component:
//
//     if (score >= 80) return 'Most of your spend aligns with the studied ranges and evidence.';
//     if (score >= 55) return 'A meaningful share of your spend sits outside the studied ranges.';
//     return 'A large share of your spend sits outside the studied ranges or evidence.';
//
// On the live 2026-08-06 stack the middle band rendered, and it was false. The only scored
// compound was NMN at 250 mg against a 250-500 mg range: dosing accuracy 100, inside the range,
// $0-$0 of waste. The score was 60 solely because a Tier C ceiling capped it — which the
// ceilings footnote said, directly beneath, so the screen contradicted itself.
//
// §4f: a composite does not identify its own cause. min(dosingAccuracy, evidenceCeiling) is
// lossy, so the two constraints are tested independently. Four states, four sentences.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreInterpretation, bundleUnreviewedNote } from './claim-templates.js';

const NEITHER = scoreInterpretation({ dosingCosts: false, evidenceCaps: false });
const EVIDENCE = scoreInterpretation({ dosingCosts: false, evidenceCaps: true });
const DOSING = scoreInterpretation({ dosingCosts: true, evidenceCaps: false });
const BOTH = scoreInterpretation({ dosingCosts: true, evidenceCaps: true });

test('the four states produce four distinct sentences', () => {
  const all = [NEITHER, EVIDENCE, DOSING, BOTH];
  assert.equal(new Set(all).size, 4, 'every state must have its own sentence');
  for (const s of all) assert.ok(s.length > 0);
});

test('neither constraint binds', () => {
  assert.equal(
    NEITHER,
    'Every dose you entered sits inside the range used in human research, and every compound is at Evidence Tier A.',
  );
  for (const other of [EVIDENCE, DOSING, BOTH]) assert.notEqual(NEITHER, other);
});

test('evidence binds, dosing does not — the live 2026-08-06 case', () => {
  assert.equal(
    EVIDENCE,
    'Every dose you entered sits inside the range used in human research. What limits this score is the strength of the evidence behind these compounds, not your dosing.',
  );
  // The specific defect: it must NOT say anything sits outside a studied range.
  assert.ok(!/sit outside the range/.test(EVIDENCE), 'must not claim doses are outside range');
  for (const other of [NEITHER, DOSING, BOTH]) assert.notEqual(EVIDENCE, other);
});

test('dosing binds, evidence does not', () => {
  assert.equal(
    DOSING,
    'Some of your doses sit outside the range used in human research, which is what limits this score.',
  );
  for (const other of [NEITHER, EVIDENCE, BOTH]) assert.notEqual(DOSING, other);
});

test('both bind', () => {
  assert.equal(
    BOTH,
    'Some of your doses sit outside the range used in human research, and the evidence behind some compounds limits how high this score can go.',
  );
  for (const other of [NEITHER, EVIDENCE, DOSING]) assert.notEqual(BOTH, other);
});

test('ANTI-VACUITY: the withdrawn score-band sentences are gone from the codebase', () => {
  // The four assertions above would pass unchanged if the old band() were still rendering
  // alongside them. These three strings must exist nowhere in the shipped source.
  const WITHDRAWN = [
    'Most of your spend aligns with the studied ranges and evidence.',
    'A meaningful share of your spend sits outside the studied ranges.',
    'A large share of your spend sits outside the studied ranges or evidence.',
  ];
  for (const s of [NEITHER, EVIDENCE, DOSING, BOTH]) {
    assert.ok(!WITHDRAWN.includes(s), `withdrawn sentence still rendered: ${s}`);
  }
});

test('ANTI-VACUITY: selection cannot be keyed on the score — the same score reaches two states', () => {
  // The heart of §4f. A composite of 60 is reachable as a well-dosed Tier C item (evidence
  // binds) or a badly-dosed Tier A item (dosing binds). If the sentence were still a function
  // of the score, those two would be indistinguishable. They must not be.
  const wellDosedTierC = scoreInterpretation({ dosingCosts: false, evidenceCaps: true });
  const badlyDosedTierA = scoreInterpretation({ dosingCosts: true, evidenceCaps: false });
  assert.notEqual(wellDosedTierC, badlyDosedTierA, 'one score, two causes, two sentences');
});

// ---- §4e bundle disclosure ---------------------------------------------------------------
test('a bundle with unreviewed contents discloses them', () => {
  assert.equal(bundleUnreviewedNote(['Quercetin']), 'Not evidence-reviewed: Quercetin');
  assert.equal(bundleUnreviewedNote(['Quercetin', 'Fisetin']), 'Not evidence-reviewed: Quercetin, Fisetin');
});

test('ANTI-VACUITY: a bundle with none discloses nothing', () => {
  // Null, not an empty-list sentence: "Not evidence-reviewed:" with nothing after it would
  // imply something was withheld.
  assert.equal(bundleUnreviewedNote([]), null);
});
