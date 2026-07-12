// =============================================================================
// Scoring constants (TECH_DOCS §2). These are CONFIRMED/locked values (2026-07-12,
// per the §8 decision log and STATUS §9) — implemented as named constants, not magic
// numbers, so a future policy change is a one-line edit here and nowhere else.
// =============================================================================
import type { EvidenceTier } from '../db/schema.js';

// Evidence ceilings by tier (TECH_DOCS §2 Step 1). Weaker evidence caps the achievable
// sub-score regardless of dosing accuracy — the entire point of the ceiling design.
export const EVIDENCE_CEILINGS: Record<EvidenceTier, number> = {
  A_strong: 100,
  B_moderate: 80,
  C_limited: 60,
  D_preliminary: 40,
};

// Overdosing penalty slope (TECH_DOCS §2 Step 1). Overdosing decays gently past
// range_high; underdosing scales linearly down from range_low. Asymmetric by design.
export const OVERDOSE_PENALTY_SLOPE = 50;

// Safety modifier (TECH_DOCS §2 Step 2): any interaction with severity "avoid" hard-caps
// the composite AND surfaces a separate flag — never smoothed into the number.
export const SAFETY_AVOID_CAP = 50;

// Underdosing-waste band factors (TECH_DOCS §2 Step 3). The doc requires the dollar
// waste be expressed as a RANGE, never a false-precision single number, but does not
// pin the band width — these factors are an ENGINEERING ASSUMPTION, flagged for founder
// review. Interpretation: the high end assumes all under-delivered spend is wasted; the
// low end discounts to acknowledge partial benefit below the studied range.
export const UNDERDOSE_WASTE_BAND = { lowFactor: 0.6, highFactor: 1.0 };

export const MONTHS_PER_YEAR = 12;
