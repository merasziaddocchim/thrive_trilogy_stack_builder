// TECH_DOCS §2 Step 2 — Composite Stack Score (dollar-weighted) + Safety Modifier.
import { SAFETY_AVOID_CAP } from './constants.js';
import type { StackInteraction } from './types.js';

/** One product's spend paired with its computed sub-score, aligned per stack item. */
export interface WeightedSubScore {
  dollarsSpent: number;
  subScore: number;
}

/**
 * Dollar-weighted mean of sub-scores — a $200/mo underdosed compound moves the score more
 * than an $8/mo one (TECH_DOCS §2 Step 2). Falls back to a flat mean when total spend is 0
 * (e.g. no prices captured) so a preview can still show a number — ENGINEERING ASSUMPTION,
 * flagged; the doc specifies dollar-weighting and is silent on the zero-spend edge case.
 * Paired per item (not keyed by compoundId) so two products of the same compound are handled.
 */
export function dollarWeightedBase(weighted: WeightedSubScore[]): number {
  if (weighted.length === 0) return 0;
  const totalSpend = weighted.reduce((sum, w) => sum + Math.max(0, w.dollarsSpent), 0);

  if (totalSpend <= 0) {
    return weighted.reduce((sum, w) => sum + w.subScore, 0) / weighted.length;
  }

  const weightedSum = weighted.reduce(
    (sum, w) => sum + w.subScore * Math.max(0, w.dollarsSpent),
    0,
  );
  return weightedSum / totalSpend;
}

export interface SafetyResult {
  compositeScore: number;
  safetyFlag: boolean;
  cautionNotes: StackInteraction[];
}

/**
 * Safety Modifier (TECH_DOCS §2 Step 2): any "avoid" interaction hard-caps the composite at
 * SAFETY_AVOID_CAP and raises a separate flag. "caution" interactions do not cap but are
 * returned as notes to render. Safety issues are categorically different from optimization
 * issues and must never be smoothed into the single number.
 */
export function applySafetyModifier(
  baseScore: number,
  interactions: StackInteraction[],
): SafetyResult {
  const hasAvoid = interactions.some((i) => i.severity === 'avoid');
  const cautionNotes = interactions.filter((i) => i.severity === 'caution');
  return {
    compositeScore: hasAvoid ? Math.min(baseScore, SAFETY_AVOID_CAP) : baseScore,
    safetyFlag: hasAvoid,
    cautionNotes,
  };
}
