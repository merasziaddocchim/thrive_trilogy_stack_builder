// Dose units the parser understands. One list, so the extractor's regex, the `default_unit`
// validator, and the milligram conversion in the API layer can never fall out of step —
// a unit that one of them accepts and another silently mishandles is exactly how
// `toMg` came to treat 5000 IU as 5000 mg.

/** Canonical unit spellings. `µg` is folded to `mcg` on the way in. */
export const KNOWN_UNITS = ['mg', 'mcg', 'g', 'iu'] as const;
export type KnownUnit = (typeof KNOWN_UNITS)[number];

/** Lowercases and folds the micro sign; returns null for anything not in KNOWN_UNITS. */
export function normalizeUnit(raw: string | null | undefined): KnownUnit | null {
  if (raw == null) return null;
  const u = raw.toLowerCase().trim().replace('µg', 'mcg');
  return (KNOWN_UNITS as readonly string[]).includes(u) ? (u as KnownUnit) : null;
}

/**
 * Whether a stored `compounds.default_unit` may be used to resolve a bare number.
 *
 * A value we cannot parse is treated exactly like NULL — no unit is inferred and the dose
 * stays unparsed (CLAIMS_COMPLIANCE §4b). It is never coerced to mg: silently rounding an
 * unrecognized unit to the most common one is the 1000x error §4b exists to prevent.
 */
export function usableDefaultUnit(stored: string | null | undefined): KnownUnit | null {
  return normalizeUnit(stored);
}
