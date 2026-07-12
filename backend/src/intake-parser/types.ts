// Intake-parser types (TECH_DOCS §1a). This module reads the user's free-text stack entry,
// extracts candidate compound + dose + price, and matches candidates against the reviewed
// compound registry. It is ISOLATED from scoring-engine and affiliate-engine: it feeds
// structured output INTO scoring, and never imports from it.
import type { DeliveryFormat } from '../db/schema.js';

export type { DeliveryFormat };

/** Match confidence — mirrors the frontend's "Confirm What We Found" screen contract. */
export type MatchConfidence = 'high' | 'low' | 'unmatched';

/** A minimal view of a compound the parser matches against (from the compounds table). */
export interface CompoundRef {
  compoundId: string;
  canonicalName: string;
  aliases: string[];
}

/** Raw span the extractor pulled from one line of free text, before DB matching. */
export interface RawCandidate {
  rawText: string;
  nameGuess: string;
  dose: { amount: number; unit: string } | null;
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
  confidence: MatchConfidence;
}

/** Pluggable free-text → candidate extractor. The heuristic default and the LLM-backed
 * production extractor both implement this, so the matching layer is agnostic to how spans
 * were produced. */
export interface Extractor {
  extract(text: string): Promise<RawCandidate[]>;
}
