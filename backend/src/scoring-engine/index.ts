// Public surface of the scoring engine. Business logic intentionally NOT implemented
// (formula, ceiling values, penalty slopes await sign-off - TECH_DOCS §2 open parameters).
//
// FIREWALL: do not import from ../affiliate-engine. Affiliate data must never be an
// input to any function here (TECH_DOCS §4, CLAIMS_COMPLIANCE.md §6).

export interface StackItemInput {
  compoundId: string;
  labelDoseMg: number;
  deliveryFormat: string;
  dollarsSpent: number;
}

export interface CompoundSubScore {
  compoundId: string;
  subScore: number;
  dosingAccuracy: number;
  evidenceCeiling: number;
}

export interface CompositeResult {
  compositeScore: number; // public: Spend Efficiency Index (SEI)
  safetyFlag: boolean | null;
  subScores: CompoundSubScore[];
}

/**
 * Per-compound sub-score (TECH_DOCS §2 Step 1). STUB.
 * DA = f(effective_dose, range); EC by evidence tier; subScore = min(DA, EC).
 */
export function computeCompoundSubScore(
  _item: StackItemInput,
): CompoundSubScore {
  throw new Error('Not implemented: scoring formula pending sign-off (TECH_DOCS §2).');
}

/**
 * Composite Spend Efficiency Index (TECH_DOCS §2 Step 2). STUB.
 * Dollar-weighted mean of sub-scores, then safety modifier.
 */
export function computeCompositeScore(
  _items: StackItemInput[],
): CompositeResult {
  throw new Error('Not implemented: composite formula pending sign-off (TECH_DOCS §2).');
}

/**
 * Dollar waste figure, kept SEPARATE from the 0-100 score (TECH_DOCS §2 Step 3). STUB.
 */
export function computeEstimatedAnnualWaste(
  _items: StackItemInput[],
): { low: number; high: number } {
  throw new Error('Not implemented: waste methodology pending sign-off (TECH_DOCS §2).');
}
