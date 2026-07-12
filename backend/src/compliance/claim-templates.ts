// Parameterized claim templates — the ONLY source of user-facing finding/headline text
// (CLAIMS_COMPLIANCE §9, TECH_DOCS §4). No freehand claim sentences ship: every string the
// API renders about a compound comes from one of these functions. Tier-appropriate hedging
// is baked in (CLAIMS §4): Tier C/D never state a dose-adequacy verdict.
import type { EvidenceTier } from '../db/schema.js';

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

/** Dose language for Tier C/D — heavily hedged, NO dose-adequacy verdict (CLAIMS §4/§9). */
export function preliminaryDoseNote(compound: string, amount?: number, unit?: string): string {
  const around = amount != null ? ` around ${amount}${unit ? ' ' + unit : ''}` : '';
  return (
    `Preliminary, non-human research on ${compound} has used doses${around}. ` +
    `Human clinical data on optimal dosing is not yet available.`
  );
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
