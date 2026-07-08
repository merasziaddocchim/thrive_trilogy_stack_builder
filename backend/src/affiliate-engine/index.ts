// Affiliate recommendation surface. Kept entirely separate from scoring-engine.
// Business logic intentionally NOT implemented at scaffold stage.

export interface AffiliateRecommendation {
  compoundId: string;
  affiliateLink: string;
  // Disclosure text is sourced from the compliance template bank, not generated here.
  disclosureRequired: true;
}

export function getAffiliateRecommendations(
  _compoundIds: string[],
): AffiliateRecommendation[] {
  throw new Error('Not implemented: affiliate recommendations pending build.');
}
