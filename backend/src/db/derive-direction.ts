// =============================================================================
// Direction of evidence, DERIVED — CLAIMS_COMPLIANCE §4a ("Deriving direction of evidence").
//
// A scoring parameter's direction is a function of the effect directions recorded on the dose
// records of its contributing sources. It is never hand-assigned: this module is the single
// implementation, used by the correction script that writes the column AND by the test that
// checks the stored value, so the rule is verified rather than transcribed twice.
//
// §4a owns the rule; this only implements it. The precedence is deliberate and not a majority
// vote — a harm signal wins outright, because findings that did not look for harm cannot
// average it away.
//
// NOT read by scoring-engine/. Direction is stored apart from evidence_tier and, per §4a, no
// user-facing statement may present it as a tier.
// =============================================================================
import type { EvidenceDirection } from './schema.js';

/** Effect direction as recorded on a single dose record (`effect_direction` enum). */
export type SourceEffectDirection = 'positive' | 'null_no_effect' | 'negative';

/**
 * Derive a parameter's direction from its contributing sources' recorded effect directions.
 *
 * Order matters and follows §4a exactly:
 *   1. any `negative` present            -> 'negative'  (harm takes precedence over everything)
 *   2. every source `positive`           -> 'positive'
 *   3. every source `null_no_effect`     -> 'null_no_effect'
 *   4. otherwise (they disagree)         -> 'mixed'
 *
 * Throws on an empty input: a scoring parameter cannot exist without contributing sources
 * (CLAIMS_COMPLIANCE §4 / TECH_DOCS §4 make `contributing_source_ids` NOT NULL), so an empty
 * list means the caller passed the wrong thing rather than that the answer is unknown.
 */
export function deriveDirection(sourceDirections: readonly SourceEffectDirection[]): EvidenceDirection {
  if (sourceDirections.length === 0) {
    throw new Error('deriveDirection: no contributing source directions — cannot derive a direction.');
  }
  if (sourceDirections.includes('negative')) return 'negative';
  if (sourceDirections.every((d) => d === 'positive')) return 'positive';
  if (sourceDirections.every((d) => d === 'null_no_effect')) return 'null_no_effect';
  return 'mixed';
}
