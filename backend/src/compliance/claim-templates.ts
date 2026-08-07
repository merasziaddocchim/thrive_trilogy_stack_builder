// Parameterized claim templates — the ONLY source of user-facing finding/headline text
// (CLAIMS_COMPLIANCE §9, TECH_DOCS §4). No freehand claim sentences ship: every string the
// API renders about a compound comes from one of these functions. Tier-appropriate hedging
// is baked in (CLAIMS §4): Tier C/D never state a dose-adequacy verdict.
import type { EvidenceTier } from '../db/schema.js';
import { goalLabel } from '../db/goals.js';

/** Public single-letter tier used in API responses and copy. */
export type TierLetter = 'A' | 'B' | 'C' | 'D';

export function tierLetter(tier: EvidenceTier): TierLetter {
  return tier.charAt(0) as TierLetter;
}

/** Dose comparison — permitted for Tier A/B only (CLAIMS §4/§9). */
export function doseComparison(params: {
  compound: string;
  amount: number;
  unit: string;
  percent: number; // signed; negative = below the studied range
  rangeLow: number;
  rangeHigh: number;
  sourceShortName: string;
}): string {
  const dir = params.percent < 0 ? 'below' : 'above';
  return (
    `Your current intake of ${params.compound} is ${params.amount} ${params.unit} — ` +
    `${Math.abs(params.percent)}% ${dir} the range used in human research ` +
    `(${params.rangeLow}–${params.rangeHigh} ${params.unit}), based on ${params.sourceShortName}.`
  );
}

/** Within-range statement (Tier A/B) — a factual comparison, no benefit claim (CLAIMS §0). */
export function withinRangeNote(params: {
  compound: string;
  amount: number;
  unit: string;
  rangeLow: number;
  rangeHigh: number;
}): string {
  return (
    `Your current intake of ${params.compound} is ${params.amount} ${params.unit}, within the ` +
    `range used in human research (${params.rangeLow}–${params.rangeHigh} ${params.unit}).`
  );
}

/**
 * Dose language for Tier C/D — heavily hedged, NO dose-adequacy verdict (CLAIMS §4/§9).
 *
 * Wording replaced 2026-07-31 (founder-approved). The previous sentence began "Preliminary,
 * non-human research on X..." and was false on every parameter it fired for: under §4a, Tier C
 * means the human evidence is UNREPLICATED, explicitly not that it is animal-only — §4a says so
 * in terms ("A Tier C rating does NOT mean the evidence is animal-only or poor quality"). Every
 * C_limited parameter in batch 1 is backed by human controlled trials. It also rendered
 * "Preliminary", Tier D's public label (CLAIMS §4), on Tier C rows.
 *
 * `amount` is REQUIRED: the approved wording has no variant for a missing dose, and the only
 * caller reaches this after the scoring gate, which drops any item whose labelDoseMg is null.
 * Typing it as required means "doses around undefined mg" cannot be constructed.
 *
 * `_unit` is retained so the existing call site is untouched, but is deliberately unused: the
 * approved wording fixes the unit as mg, which is correct by construction because `labelDoseMg`
 * has already been normalised to milligrams by toMg() before it reaches here.
 */
export function preliminaryDoseNote(compound: string, amount: number, _unit?: string): string {
  return (
    `Studies of ${compound} have used doses around ${amount} mg. ` +
    `That evidence has not been independently replicated, so an optimal dose has not been established.`
  );
}

/**
 * Outcome-mismatch disclosure (CLAIMS_COMPLIANCE §4b). Rendered on every surface that shows a
 * finding scored against an outcome other than the one the user chose.
 *
 * Both outcomes render as DISPLAY LABELS via goalLabel(), never as raw goal_tags — §4b
 * requires the sentence to name the outcomes as the user would recognize them, and
 * "training_and_recovery" is not that.
 *
 * Returns null when the outcomes match, so the caller cannot accidentally render an empty or
 * self-referential disclosure: "no evidence for X on healthy aging ... measured against healthy
 * aging instead" would be false. `claim-templates.test.ts` pins that it stays absent.
 */
export function outcomeMismatchNote(params: {
  compound: string;
  chosenGoalTag: string | null;
  selectedGoalTag: string;
}): string | null {
  if (params.chosenGoalTag == null || params.chosenGoalTag === params.selectedGoalTag) return null;
  return `Our reviewed database has no evidence for ${params.compound} on ${goalLabel(params.chosenGoalTag)}. Its Evidence Tier and dose range below are measured against ${goalLabel(params.selectedGoalTag)} instead.`;
}

/**
 * No studied dose range exists for this compound (CLAIMS_COMPLIANCE §4d). Rendered on an
 * Adjust row, where §4d requires the item to "state the finding that put it there".
 *
 * It states what is missing on OUR side, not a shortcoming of the user's dose: there is
 * nothing to compare against, which is different from a dose being wrong. No range means no
 * distance to report, so this sentence carries no number and no verdict.
 */
export function noStudiedRangeNote(compound: string): string {
  return `Our reviewed database has no studied dose range for ${compound}, so your dose could not be compared against research.`;
}

/** Redundancy flag (CLAIMS §9). */
export function redundancyFlag(params: {
  productCount: number;
  sharedIngredient: string;
  monthlyCost: number;
}): string {
  return (
    `You're taking ${params.productCount} products that each contain ${params.sharedIngredient}. ` +
    `Combined, you're spending approximately $${round(params.monthlyCost)}/month on overlapping sources.`
  );
}

/**
 * CLAIMS_COMPLIANCE §4e. Rendered instead of recognizedSummary() when the stack holds a
 * compound the evidence review has not reached, because that sentence ends "and matched each
 * to an evidence tier" — which stops being true the moment one of them has no tier. The old
 * sentence also under-counted: unreviewed compounds were dropped before it ran, so a two
 * compound stack reported "We recognized 1 compound".
 *
 * Founder-approved copy, inserted verbatim. Do not reword.
 */
export function recognizedSummaryWithUnreviewed(params: { total: number; reviewed: number }): string {
  return `We recognized ${params.total} compounds in your stack. We have matched an evidence tier to ${params.reviewed} of them; the rest have not been reviewed yet.`;
}

/**
 * §4e state 3: nothing in the stack has been reviewed. Needs its own sentence because the
 * mixed-state one above says "the rest have not been reviewed yet", which implies some were —
 * and before this existed, a wholly unreviewed stack rendered "0 are matched to an evidence
 * tier; the rest have not been reviewed yet". Founder-approved copy, verbatim.
 */
export function recognizedSummaryNoneReviewed(n: number): string {
  return `We recognized ${n} ${pluralCompounds(n)} in your stack, but none has been reviewed yet — so nothing here is scored.`;
}

/**
 * CLAIMS_COMPLIANCE §4f — the sentence beside the Spend Efficiency Index.
 *
 * KEYED ON THE BINDING CONSTRAINT, NOT ON THE SCORE. Until 2026-08-06 three sentences were
 * selected by score band inside the React component, and the middle band said "A meaningful
 * share of your spend sits outside the studied ranges." On the live 2026-08-06 stack that was
 * simply false: the one scored compound was NMN at 250 mg against a 250-500 mg range —
 * dosing accuracy 100, inside the range, $0 of waste — and the score was 60 only because a
 * Tier C ceiling capped it. The score-ceilings footnote directly beneath said so, so the
 * screen contradicted itself and the sentence was the wrong half.
 *
 * §4f: "A composite score does not identify its own cause." min(dosingAccuracy,
 * evidenceCeiling) is lossy — 60 can be a well-dosed Tier C item or a badly-dosed Tier A one,
 * and those call for opposite responses. So the two constraints are tested independently.
 *
 * Founder-approved copy, inserted verbatim. Do not reword.
 */
export interface ScoreConstraints {
  /** Any scored item where dosingAccuracy < evidenceCeiling — min() picked dosing. */
  dosingCosts: boolean;
  /** Any scored item whose evidenceCeiling is below the maximum — the tier is under A. */
  evidenceCaps: boolean;
}

export function scoreInterpretation(c: ScoreConstraints): string {
  if (c.dosingCosts && c.evidenceCaps) {
    return `Some of your doses sit outside the range used in human research, and the evidence behind some compounds limits how high this score can go.`;
  }
  if (c.dosingCosts) {
    return `Some of your doses sit outside the range used in human research, which is what limits this score.`;
  }
  if (c.evidenceCaps) {
    return `Every dose you entered sits inside the range used in human research. What limits this score is the strength of the evidence behind these compounds, not your dosing.`;
  }
  return `Every dose you entered sits inside the range used in human research, and every compound is at Evidence Tier A.`;
}

/**
 * §4e coverage statement, widened by §4f-era review: the waste estimate is computed over the
 * same scored items as the score, so the sentence now names both. It previously named only
 * the score while sitting directly beneath the waste figure it also qualified.
 *
 * Founder-approved copy, inserted verbatim. Do not reword.
 */
export function coverageSentence(params: { scored: number; total: number }): string {
  return `This score and the waste estimate cover ${params.scored} of the ${params.total} compounds you entered.`;
}

/**
 * §4e: a bundle that contains a compound we have not reviewed says so, beside the contents.
 * STATIC — a property of the bundle, not of the reader. It does not depend on what is in any
 * given stack, so it renders whenever the bundle renders.
 *
 * Founder-approved copy, inserted verbatim. Do not reword.
 */
export function bundleUnreviewedNote(names: readonly string[]): string | null {
  if (names.length === 0) return null;
  const params = { names: names.join(', ') };
  return `Not evidence-reviewed: ${params.names}`;
}

/**
 * The sentence, or null when the score covers everything the user entered. Null is the whole
 * point: §4e requires the statement only where a compound is EXCLUDED, and rendering "covers 2
 * of the 2" on a fully scored stack would raise a doubt that does not exist.
 */
export function coverageSentenceFor(params: { scored: number; total: number }): string | null {
  if (params.total <= 0 || params.scored >= params.total) return null;
  return coverageSentence(params);
}

/** Section heading for the §4e list. Founder-approved, verbatim. */
export const NOT_YET_REVIEWED_HEADING = 'Not yet reviewed';

/** Section description for the §4e list. Founder-approved, verbatim. */
export const NOT_YET_REVIEWED_DESCRIPTION =
  'We recognize these compounds, but our evidence review hasn\'t reached them yet — so they aren\'t scored.';

/** Neutral recognized-count statement for a State-B preview (no fabricated numbers). */
/**
 * "1 compound" / "2 compounds". A bare count in subject position reads wrong at one, and the
 * original headline shipped that bug: a single-compound stack rendered "We recognized 1
 * compounds in your stack". Kept to the one word these sentences need — this is not a
 * general pluralization utility and should not grow into one.
 */
export function pluralCompounds(n: number): string {
  return n === 1 ? 'compound' : 'compounds';
}
export function recognizedSummary(n: number): string {
  return `We recognized ${n} ${pluralCompounds(n)} in your stack and matched each to an evidence tier.`;
}

/** Evidence-tier disclosure line, always appended where a tier is shown (CLAIMS §9). */
export function tierDisclosure(params: {
  tier: TierLetter;
  rationale: string;
  lastReviewed: string;
  reviewerName: string;
}): string {
  return `Evidence Tier ${params.tier}. ${params.rationale} Last reviewed ${params.lastReviewed} by ${params.reviewerName}.`;
}

function round(n: number): number {
  return Math.round(n);
}
