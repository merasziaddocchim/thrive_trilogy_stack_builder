// TECH_DOCS §2 Step 1 — Compound Sub-Score = min(Dosing Accuracy, Evidence Ceiling).
import { EVIDENCE_CEILINGS } from './constants.js';
import { effectiveDose, dosingAccuracy, isWithinRange } from './dosing.js';
import type { ScoredCompoundInput, CompoundSubScore } from './types.js';

export function computeCompoundSubScore(item: ScoredCompoundInput): CompoundSubScore {
  const eff = effectiveDose(item.labelDoseMg, item.bioavailabilityAdjustmentFactor);
  const da = dosingAccuracy(eff, item.rangeLowMg, item.rangeHighMg);
  const ec = EVIDENCE_CEILINGS[item.evidenceTier];
  // The ceiling is the whole point: weak evidence drags the sub-score below what dosing
  // alone would suggest.
  const subScore = Math.min(da, ec);
  return {
    compoundId: item.compoundId,
    canonicalName: item.canonicalName,
    subScore,
    dosingAccuracy: da,
    evidenceCeiling: ec,
    effectiveDoseMg: eff,
    evidenceTier: item.evidenceTier,
    withinStudiedRange: isWithinRange(eff, item.rangeLowMg, item.rangeHighMg),
  };
}
