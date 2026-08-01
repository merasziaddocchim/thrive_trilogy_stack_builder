// =============================================================================
// Intake parser — public surface (TECH_DOCS §1a).
//
// Free text → extractor → match against compounds.canonical_name/aliases → ParsedItem[] with
// TWO independent per-item verdicts: a match `confidence` and a `doseState`. Below the
// confidence threshold nothing is silently accepted; low/unmatched items are surfaced to the
// frontend's "Confirm What We Found" screen. An item awaiting a dose is surfaced there too,
// but as its own state — never as an uncertain match (CLAIMS_COMPLIANCE §4b).
//
// ISOLATION (firewall): imports nothing from ../scoring-engine or ../affiliate-engine. It
// produces structured output that FEEDS scoring; scoring/affiliate never feed back in.
// Enforced by scripts/check-firewall.mjs.
// =============================================================================
import { HeuristicExtractor } from './extractor.js';
import { matchCompound } from './matcher.js';
import { usableDefaultUnit } from './units.js';
import type { CompoundRef, DoseState, Extractor, ParsedItem } from './types.js';

export * from './types.js';
export { HeuristicExtractor, LlmExtractor } from './extractor.js';
export { matchCompound, normalize, HIGH_CONFIDENCE_THRESHOLD, LOW_CONFIDENCE_THRESHOLD } from './matcher.js';
export { KNOWN_UNITS, normalizeUnit, usableDefaultUnit, type KnownUnit } from './units.js';

export interface ParseOptions {
  /** Defaults to the deterministic HeuristicExtractor; inject LlmExtractor in production. */
  extractor?: Extractor;
}

/**
 * Parse a free-text stack entry into confirmable items.
 *
 * Two independent judgements come out of this, and they are NOT combined
 * (CLAIMS_COMPLIANCE §4b):
 *
 *   `confidence` — did we recognize the compound? Purely the matcher's verdict.
 *   `doseState`  — is the dose complete? explicit / assumed / missing.
 *
 * Until 2026-08-01 a recognized compound with no interpretable dose was downgraded to 'low'
 * confidence, which rendered "Low confidence — please check" beside a compound we had matched
 * exactly. §4b now states it outright: "The absence of a dose is not evidence of an uncertain
 * compound match and must not be rendered as one."
 *
 * UNIT RESOLUTION happens HERE and nowhere earlier: the extractor sees text only and cannot
 * know which compound a line refers to, so a bare number arrives unresolved and is turned into
 * a dose using the matched compound's stored `default_unit`. Where that is absent or
 * unrecognized, no unit is invented — the dose stays null and the item is flagged for a dose.
 */
export async function parseIntake(
  text: string,
  compounds: CompoundRef[],
  opts: ParseOptions = {},
): Promise<ParsedItem[]> {
  const extractor = opts.extractor ?? new HeuristicExtractor();
  const candidates = await extractor.extract(text);

  return candidates.map((c, i) => {
    const match = matchCompound(c.nameGuess, compounds);

    let dose = c.dose;
    let doseState: DoseState = dose != null ? 'explicit' : 'missing';

    if (dose == null && c.unitlessAmount != null) {
      // Only the matched compound's own stored unit may resolve this — never a constant, a
      // product label, a brand catalogue, or any affiliate source (CLAIMS_COMPLIANCE §4b).
      const unit = usableDefaultUnit(match.compound?.defaultUnit);
      if (unit != null) {
        dose = { amount: c.unitlessAmount, unit };
        doseState = 'assumed';
      }
    }

    return {
      clientId: `x${i + 1}`,
      rawText: c.rawText,
      canonicalName: match.compound?.canonicalName ?? null,
      compoundId: match.compound?.compoundId ?? null,
      dose,
      deliveryFormat: c.deliveryFormat,
      monthlyPrice: c.monthlyPrice,
      confidence: match.confidence,
      doseState,
    };
  });
}

/**
 * Plain, factual description of what this capability does — for any user-facing disclosure.
 * Compliance (CLAIMS_COMPLIANCE §7/§10): describes extraction + human confirmation only;
 * contains NO banned capability overclaim ("AI-verified", "clinically proven", etc.).
 */
export function describeParser(): string {
  return (
    'Your entry is read by an automated text parser and matched to compounds in our ' +
    'reviewed database. Anything we are not confident about is shown to you to confirm or ' +
    'correct before it is scored.'
  );
}
