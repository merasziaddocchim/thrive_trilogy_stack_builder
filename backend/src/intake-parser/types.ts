// Intake-parser types (TECH_DOCS §1a). This module reads the user's free-text stack entry,
// extracts candidate compound + dose + price, and matches candidates against the reviewed
// compound registry. It is ISOLATED from scoring-engine and affiliate-engine: it feeds
// structured output INTO scoring, and never imports from it.
import type { DeliveryFormat } from '../db/schema.js';

export type { DeliveryFormat };

/** Match confidence — mirrors the frontend's "Confirm What We Found" screen contract. */
export type MatchConfidence = 'high' | 'low' | 'unmatched';

/**
 * How complete the dose on a parsed item is (CLAIMS_COMPLIANCE §4b). Deliberately SEPARATE
 * from MatchConfidence: dose completeness says nothing about whether the compound was
 * recognized, and until 2026-08-01 the two were conflated — a doseless item was downgraded to
 * 'low', so a perfectly recognized compound rendered under a "Low confidence — please check"
 * badge purely because the user omitted a unit.
 *
 *   explicit — the user supplied a unit.
 *   assumed  — a bare number resolved via the matched compound's stored default_unit. Must be
 *              disclosed to the user and remain editable before scoring (§4b).
 *   missing  — no number, or no usable default_unit. No unit is invented; dose stays null.
 */
export type DoseState = 'explicit' | 'assumed' | 'missing';

/** A minimal view of a compound the parser matches against (from the compounds table). */
export interface CompoundRef {
  compoundId: string;
  canonicalName: string;
  aliases: string[];
  /** Literature-derived dose unit, or null when none is established. Null means "do not
   *  infer" — never a cue to fall back to mg (CLAIMS_COMPLIANCE §4b). */
  defaultUnit: string | null;
}

/** Raw span the extractor pulled from one line of free text, before DB matching. */
export interface RawCandidate {
  rawText: string;
  nameGuess: string;
  dose: { amount: number; unit: string } | null;
  /**
   * A quantity the user typed with NO unit ("NMN 250"). Distinct from `dose: null`, which means
   * no quantity at all — the distinction the parser could not previously represent, so both
   * collapsed to "no dose". Resolving it needs the compound, which is not known until after
   * matching, so it stays unresolved here by design.
   */
  unitlessAmount: number | null;
  deliveryFormat: DeliveryFormat | null;
  monthlyPrice: number | null;
}

/**
 * A parsed stack item, shaped exactly like the frontend `ExtractedItem` so the API response
 * drops straight into the existing "Confirm What We Found" UI.
 */
export interface ParsedItem {
  clientId: string;
  rawText: string;
  canonicalName: string | null;
  compoundId: string | null;
  dose: { amount: number; unit: string } | null;
  deliveryFormat: DeliveryFormat | null;
  monthlyPrice: number | null;
  /** Whether the compound was recognized. Says nothing about the dose. */
  confidence: MatchConfidence;
  /** Whether the dose is complete. Says nothing about the match. */
  doseState: DoseState;
}

/** Pluggable free-text → candidate extractor. The heuristic default and the LLM-backed
 * production extractor both implement this, so the matching layer is agnostic to how spans
 * were produced. */
export interface Extractor {
  extract(text: string): Promise<RawCandidate[]>;
}
