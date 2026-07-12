// =============================================================================
// Intake parser — public surface (TECH_DOCS §1a).
//
// Free text → extractor → match against compounds.canonical_name/aliases → ParsedItem[]
// with a confidence per item. Below the confidence threshold nothing is silently accepted;
// low/unmatched items are surfaced to the frontend's "Confirm What We Found" screen.
//
// ISOLATION (firewall): imports nothing from ../scoring-engine or ../affiliate-engine. It
// produces structured output that FEEDS scoring; scoring/affiliate never feed back in.
// Enforced by scripts/check-firewall.mjs.
// =============================================================================
import { HeuristicExtractor } from './extractor.js';
import { matchCompound } from './matcher.js';
import type { CompoundRef, Extractor, ParsedItem } from './types.js';

export * from './types.js';
export { HeuristicExtractor, LlmExtractor } from './extractor.js';
export { matchCompound, normalize, HIGH_CONFIDENCE_THRESHOLD, LOW_CONFIDENCE_THRESHOLD } from './matcher.js';

export interface ParseOptions {
  /** Defaults to the deterministic HeuristicExtractor; inject LlmExtractor in production. */
  extractor?: Extractor;
}

/**
 * Parse a free-text stack entry into confirmable items. A confident name match whose dose
 * could not be interpreted (e.g. "1 scoop") is deliberately downgraded to "low" so the user
 * is prompted to supply the dose before it is scored — matching the confirmation UX.
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
    let confidence = match.confidence;
    // Recognized compound but no interpretable dose → needs a human check, not a silent guess.
    if (confidence === 'high' && c.dose == null) confidence = 'low';

    return {
      clientId: `x${i + 1}`,
      rawText: c.rawText,
      canonicalName: match.compound?.canonicalName ?? null,
      compoundId: match.compound?.compoundId ?? null,
      dose: c.dose,
      deliveryFormat: c.deliveryFormat,
      monthlyPrice: c.monthlyPrice,
      confidence,
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
