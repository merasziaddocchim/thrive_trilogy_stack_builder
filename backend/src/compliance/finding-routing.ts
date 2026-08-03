// =============================================================================
// FINDING ROUTING — CLAIMS_COMPLIANCE §4d.
//
// Which action section a scored item lands in. This lives under compliance/ rather than with
// the report builder because §4d says what it is: "The section a finding appears in is a
// recommendation about the user's spending and their regimen, and is therefore a claim in its
// own right, independent of the sentence rendered inside it." Telling someone to stop taking a
// compound is a claim whether or not a sentence says so.
//
// WHAT WAS WRONG. Until 2026-08-01 report-builder had two destinations and an `else`:
//
//     } else if (wellDosed && verifiable) {   // verifiable = Tier A/B with a range
//       keep.push(...)
//     } else {
//       // Underdosed/overdosed, or unverifiable (Tier C/D / no range) -> Stop.
//
// so underdosing and Tier C both meant Stop. A live stack of NMN 250 mg, TMG 1000 mg and
// Berberine 500 mg put ALL THREE in Stop and left Keep an empty heading — including Berberine,
// the strongest evidence in the database, and including NMN, which was INSIDE its range and
// therefore sat in "where your spend isn't working" with $0/mo of waste beside it.
//
// PURE AND STRUCTURAL BY DESIGN. It takes plain facts, not scoring types, so it holds no
// dependency on the scoring engine and every rule is exhaustively testable without building a
// stack (see finding-routing.test.ts). Same arrangement as db/goals.ts.
// =============================================================================
import type { EvidenceTier, EvidenceDirection } from '../db/schema.js';

/** The action sections, in the order §4d evaluates them and the order the report renders them. */
export const FINDING_SECTIONS = ['stop', 'adjust', 'keep'] as const;
export type FindingSection = (typeof FINDING_SECTIONS)[number];

export interface RoutableFinding {
  evidenceTier: EvidenceTier;
  /**
   * True when this item duplicates another resolving to the same compound AND is not the
   * best-dosed of them. §4d Stops the extras, not the keeper: "Duplicate spend" is the extra
   * copies, and the best-dosed one still has a dose worth judging on its own terms.
   */
  isRedundant: boolean;
  /**
   * The parameter's recorded direction, or null when it has not been derived.
   *
   * SQL NULL IS NOT THE ENUM VALUE `null_no_effect`. §4d is explicit: "An absent direction of
   * evidence means the value has not been derived and is never grounds for Stop." Conflating
   * them would route every un-backfilled row to Stop — telling users to abandon compounds
   * because of a migration that had not run yet.
   */
  directionOfEvidence: EvidenceDirection | null;
  /**
   * true inside the studied range, false outside it, **null when no range exists** and the
   * dose therefore cannot be checked. All three are distinct outcomes here.
   */
  withinStudiedRange: boolean | null;
}

/** Directions that mean an adequate study looked and found nothing, or found harm (§4d). */
const STOP_DIRECTIONS: ReadonlySet<EvidenceDirection> = new Set(['null_no_effect', 'negative']);

/**
 * Place one scored item, per CLAIMS_COMPLIANCE §4d. First match wins, in this order:
 *
 *   Stop   — a duplicate that is not the best-dosed copy; or Evidence Tier D; or a recorded
 *            direction of null_no_effect / negative.
 *   Adjust — the dose falls outside the studied range, or no studied range exists.
 *   Keep   — the dose falls inside the studied range.
 *
 * Note what is NOT here: Tier C. §4d says so outright — the evidence ceiling already lowers a
 * Tier C item's Spend Efficiency Index, and Stopping it as well would penalise the same fact
 * twice and tell the user to abandon a compound the reviewed evidence does not contradict.
 */
export function routeFinding(f: RoutableFinding): FindingSection {
  // --- Stop -------------------------------------------------------------------------------
  if (f.isRedundant) return 'stop';
  if (f.evidenceTier === 'D_preliminary') return 'stop';
  if (f.directionOfEvidence != null && STOP_DIRECTIONS.has(f.directionOfEvidence)) return 'stop';

  // --- Adjust -----------------------------------------------------------------------------
  // `false` = measured and outside. `null` = no range to measure against; §4d routes that here
  // too, because Keep would otherwise assert "the dose falls inside the studied range" about a
  // dose nothing was compared to.
  if (f.withinStudiedRange !== true) return 'adjust';

  // --- Keep -------------------------------------------------------------------------------
  return 'keep';
}
