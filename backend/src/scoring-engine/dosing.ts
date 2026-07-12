// TECH_DOCS §2 Step 1 — Dosing Accuracy (DA) and effective dose. Pure math.
import { OVERDOSE_PENALTY_SLOPE } from './constants.js';

/** effective_dose = user_label_dose × bioavailability_adjustment_factor[delivery format]. */
export function effectiveDose(labelDoseMg: number, bioavailabilityFactor: number): number {
  return labelDoseMg * bioavailabilityFactor;
}

/**
 * Dosing Accuracy, 0–100 (TECH_DOCS §2 Step 1):
 *   within [low, high]          → 100
 *   below low                   → 100 × (dose / low)      (linear falloff)
 *   above high                  → max(0, 100 − slope × ((dose − high) / high))
 * Asymmetric on purpose: underdosing fails to deliver the benefit at all; overdosing only
 * wastes money, so it is penalized more gently.
 *
 * When no interpretable studied range exists (range null), we cannot assess dosing, so DA
 * returns 100 and the sub-score is left to be bounded by the Evidence Ceiling alone. This
 * null-range handling is an ENGINEERING ASSUMPTION (the §2 formula assumes a range) —
 * flagged for review.
 */
export function dosingAccuracy(
  dose: number,
  rangeLowMg: number | null,
  rangeHighMg: number | null,
  slope: number = OVERDOSE_PENALTY_SLOPE,
): number {
  if (rangeLowMg == null || rangeHighMg == null) return 100;
  if (dose >= rangeLowMg && dose <= rangeHighMg) return 100;
  if (dose < rangeLowMg) {
    if (rangeLowMg === 0) return 100;
    return clamp(100 * (dose / rangeLowMg));
  }
  // dose > rangeHighMg
  if (rangeHighMg === 0) return 0;
  return clamp(100 - slope * ((dose - rangeHighMg) / rangeHighMg));
}

/** True/false when a range exists, null when it doesn't (can't assess). */
export function isWithinRange(
  dose: number,
  rangeLowMg: number | null,
  rangeHighMg: number | null,
): boolean | null {
  if (rangeLowMg == null || rangeHighMg == null) return null;
  return dose >= rangeLowMg && dose <= rangeHighMg;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
