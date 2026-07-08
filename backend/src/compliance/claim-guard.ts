// Hard constraint (TECH_DOCS §4, CLAIMS_COMPLIANCE.md §4/§6):
// no claim-bearing object may be served without a linked evidence_tier and
// contributing_source_ids. This guard is the enforcement point at the API layer.

export interface ClaimBearing {
  evidenceTier?: string | null;
  sourceIds?: string[] | null;
}

export class ClaimComplianceError extends Error {}

/**
 * Throws if a claim object is missing the required evidence tier + sources.
 * Wire this into serializers for every stop/keep/start object (API §6). STUB-safe:
 * the enforcement logic below is complete; what's not implemented is claim GENERATION.
 */
export function assertClaimCompliant<T extends ClaimBearing>(obj: T, context = 'claim'): T {
  if (!obj.evidenceTier) {
    throw new ClaimComplianceError(`${context}: missing evidence_tier (CLAIMS_COMPLIANCE §4).`);
  }
  if (!obj.sourceIds || obj.sourceIds.length === 0) {
    throw new ClaimComplianceError(`${context}: missing contributing_source_ids (CLAIMS_COMPLIANCE §4).`);
  }
  return obj;
}
