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

/** Neutral recognized-count statement for a State-B preview (no fabricated numbers). */
export function recognizedSummary(count: number): string {
  return `We recognized ${count} ${count === 1 ? 'compound' : 'compounds'} in your stack and matched each to an evidence tier.`;
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
