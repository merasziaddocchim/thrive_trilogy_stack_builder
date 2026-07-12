// Scoring-engine inputs/outputs. The engine is a PURE function surface — no DB, no
// affiliate, no I/O. Everything it needs is passed in already-resolved, so it is trivially
// testable and the firewall (TECH_DOCS §4) has nothing to catch.
import type { EvidenceTier, DeliveryFormat, InteractionSeverity } from '../db/schema.js';

export type { EvidenceTier, DeliveryFormat, InteractionSeverity };

/**
 * One compound in the user's stack, with its evidence parameters already resolved from
 * scoring_parameters (range, tier, bioavailability factor, sources). Resolving these from
 * the DB is the API/service layer's job, not the engine's.
 */
export interface ScoredCompoundInput {
  compoundId: string;
  canonicalName: string;
  labelDoseMg: number;
  deliveryFormat: DeliveryFormat;
  /** Monthly dollars spent on this specific product. */
  dollarsSpent: number;

  /** Studied range from scoring_parameters; null when no interpretable range exists. */
  rangeLowMg: number | null;
  rangeHighMg: number | null;
  /** Multiplier for the user's delivery format (defaults to 1 when unknown). */
  bioavailabilityAdjustmentFactor: number;

  evidenceTier: EvidenceTier;
  /** COMPLIANCE (CLAIMS_COMPLIANCE §4): must be non-empty; the engine asserts it. */
  contributingSourceIds: string[];

  /**
   * Key identifying a shared active ingredient across products (e.g. a NAD+ precursor
   * pathway). Products with the same key are candidates for redundancy waste. Optional.
   */
  sharedIngredientKey?: string;
}

/** An interaction between two compounds in the stack (from interaction_records). */
export interface StackInteraction {
  compoundIdA: string;
  compoundIdB: string;
  severity: InteractionSeverity;
  mechanismNote?: string | null;
  sourceIds: string[];
}

export interface CompoundSubScore {
  compoundId: string;
  canonicalName: string;
  /** min(DA, EC), 0–100. */
  subScore: number;
  dosingAccuracy: number;
  evidenceCeiling: number;
  effectiveDoseMg: number;
  evidenceTier: EvidenceTier;
  /** True when a studied range existed and the effective dose was inside it. */
  withinStudiedRange: boolean | null;
}

export interface DollarWaste {
  redundancyMonthly: number;
  underdosingMonthlyLow: number;
  underdosingMonthlyHigh: number;
  /** Total Estimated Annual Waste — always a low–high RANGE (TECH_DOCS §2 Step 3). */
  annualLow: number;
  annualHigh: number;
}

export interface StackScoreResult {
  /** Public name: Spend Efficiency Index (SEI). */
  compositeScore: number;
  /** True if a severity="avoid" interaction applied. Surfaced separately, never buried. */
  safetyFlag: boolean;
  /** Non-capping "caution" interactions to render as notes. */
  cautionNotes: StackInteraction[];
  subScores: CompoundSubScore[];
  waste: DollarWaste;
}
