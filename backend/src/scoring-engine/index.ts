// =============================================================================
// Scoring engine — public surface. Implements TECH_DOCS §2 in full.
//
// FIREWALL (TECH_DOCS §4, CLAIMS_COMPLIANCE §6): this module and everything it imports
// must never touch ../affiliate-engine. Affiliate data is not an input to any function
// here — enforced by scripts/check-firewall.mjs.
//
// Importing ../compliance/claim-guard is allowed (it is not affiliate): every scored
// compound must carry a non-empty contributing_source_ids, asserted below (CLAIMS §4).
// =============================================================================
import { assertClaimCompliant } from '../compliance/claim-guard.js';
import { computeCompoundSubScore } from './subscore.js';
import { dollarWeightedBase, applySafetyModifier } from './composite.js';
import { computeDollarWaste, type ScoredItem } from './waste.js';
import type {
  ScoredCompoundInput,
  StackInteraction,
  StackScoreResult,
  CompoundSubScore,
} from './types.js';

export * from './types.js';
export { computeCompoundSubScore } from './subscore.js';
export { redundantItems, computeDollarWaste, type ScoredItem } from './waste.js';
export { EVIDENCE_CEILINGS, OVERDOSE_PENALTY_SLOPE, SAFETY_AVOID_CAP } from './constants.js';

/**
 * Score a whole stack (TECH_DOCS §2, Steps 1–3). Pure: same inputs → same outputs.
 * Throws ClaimComplianceError if any compound lacks an evidence tier or sources (CLAIMS §4).
 */
export function scoreStack(
  items: ScoredCompoundInput[],
  interactions: StackInteraction[] = [],
): StackScoreResult {
  // Compliance gate: no compound may be scored without its evidence tier + sources.
  for (const item of items) {
    assertClaimCompliant(
      { evidenceTier: item.evidenceTier, sourceIds: item.contributingSourceIds },
      `compound ${item.canonicalName}`,
    );
  }

  // Step 1 — per-compound sub-scores (aligned to items).
  const scored: ScoredItem[] = items.map((item) => ({
    item,
    sub: computeCompoundSubScore(item),
  }));
  const subScores: CompoundSubScore[] = scored.map((s) => s.sub);

  // Step 2 — dollar-weighted composite, then the safety modifier.
  const base = dollarWeightedBase(
    scored.map((s) => ({ dollarsSpent: s.item.dollarsSpent, subScore: s.sub.subScore })),
  );
  const safety = applySafetyModifier(base, interactions);

  // Step 3 — dollar waste, kept separate from the 0–100 score.
  const waste = computeDollarWaste(scored);

  return {
    compositeScore: Math.round(safety.compositeScore),
    safetyFlag: safety.safetyFlag,
    cautionNotes: safety.cautionNotes,
    subScores,
    waste,
  };
}
