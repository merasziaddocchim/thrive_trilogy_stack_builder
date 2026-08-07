// Affiliate recommendation surface ("Start" section). Kept entirely separate from
// scoring-engine by hard constraint (TECH_DOCS §4, CLAIMS_COMPLIANCE §6): affiliate data must
// never influence evidence_tier, recommended_range, or the composite score, and this module
// must be un-importable by scoring-engine/ (and must not import it). Enforced by
// scripts/check-firewall.mjs.
//
// This module only SELECTS which founder-reviewed products to surface for a given stack. It
// emits no user-facing claim text and no disclosure copy — per-link affiliate disclosure lives
// in the frontend (CLAIMS_COMPLIANCE §6 / BRAND_GUIDELINES §7), rendered adjacent to every link.
import {
  TIER1_PRODUCTS,
  TIER2_ITEMS,
  TIER3_BUNDLES,
  type CatalogProduct,
  type CatalogTier2Item,
} from './catalog.js';

export type TierLetter = 'A' | 'B' | 'C' | 'D';

/** A compound present in the user's Stack Report (scored), used to select Start products. */
export interface RecognizedForStart {
  compoundId: string;
  canonicalName: string;
  evidenceTier: TierLetter;
}

/** Tier 1 group: one evidence-reviewed compound + the founder-mapped products for it. */
export interface StartTier1Group {
  compound_id: string;
  compound: string;
  /** The compound's established evidence tier — reflects the COMPOUND, never the product/brand. */
  evidence_tier: TierLetter;
  products: CatalogProduct[];
}

/** Tier 3 bundle as surfaced to the client (no tier badge; contents shown for relevance). */
export interface StartBundle {
  brand: string;
  product: string;
  href: string;
  contains: string;
  /**
   * Display names of contents this app has not evidence-reviewed (CLAIMS_COMPLIANCE §4e).
   *
   * DATA, NOT COPY. This module states at the top that it emits no user-facing claim text, and
   * that contract is why per-link disclosure lives elsewhere; turning these names into a
   * sentence here would break it. report-builder renders them through the §4e template, with
   * every other claim sentence, under the claim guard.
   *
   * STATIC — a property of the bundle, not of the reader. A bundle contains what it contains,
   * so this does not depend on the stack and nothing is threaded in from the report.
   */
  unreviewed_names: string[];
}

export interface StartSection {
  /** Evidence-reviewed compounds in the stack, each with its product options. */
  tier1: StartTier1Group[];
  /** "Also available" — not evidence-scored, no tier badge. */
  tier2: CatalogTier2Item[];
  /** Bundles relevant to the stack (overlap on >=1 contained compound). */
  tier3: StartBundle[];
}

/**
 * Build the Start section for a stack. `recognized` is the set of evidence-reviewed compounds
 * PRESENT IN THE STACK REPORT (i.e. the scored compounds) — deduped by compound_id.
 *
 * - Tier 1: one group per recognized compound that has catalog products, in recognition order.
 *   Products are listed as given, no ranking (no price data; founder decision).
 * - Tier 2: a general "also available" list, not stack-dependent, MINUS any item whose category
 *   names a compound this user is holding as unreviewed — see below.
 * - Tier 3: a bundle is included only if the stack contains >=1 compound the bundle contains.
 *
 * `unreviewedNames` are the canonical names of compounds in THIS stack that are recognized but
 * have no scoring parameter (CLAIMS_COMPLIANCE §4e). Tier 2 already carries entries for CaAKG,
 * Quercetin and Spermidine, and all three became registry compounds in the 2026-08-05 batch —
 * so without this filter a user entering Quercetin would read "not yet reviewed, not scored"
 * and then be offered a Quercetin purchase link on the same page. §4e forbids exactly that: "An
 * unreviewed compound must not carry a purchase link."
 *
 * Deliberately narrow. It suppresses only the collision — same compound, same report. Whether
 * Tier 2 should link compounds the app has never assessed AT ALL is a real question, it
 * predates this change, and it is logged rather than decided here.
 *
 * Names only. No score, dose, tier or dollar figure crosses this boundary, so the firewall
 * (TECH_DOCS §4) is untouched: affiliate data still cannot reach scoring, and scoring output
 * still cannot reach affiliate selection.
 */
export function buildStartSection(
  recognized: RecognizedForStart[],
  unreviewedNames: readonly string[] = [],
): StartSection {
  const byId = new Map<string, RecognizedForStart>();
  for (const r of recognized) if (!byId.has(r.compoundId)) byId.set(r.compoundId, r);

  const tier1: StartTier1Group[] = [];
  for (const r of byId.values()) {
    const products = TIER1_PRODUCTS[r.compoundId];
    if (!products || products.length === 0) continue;
    tier1.push({
      compound_id: r.compoundId,
      compound: r.canonicalName,
      evidence_tier: r.evidenceTier,
      products,
    });
  }

  const recognizedIds = new Set(byId.keys());
  const tier3: StartBundle[] = TIER3_BUNDLES.filter((b) =>
    b.containsCompoundIds.some((id) => recognizedIds.has(id)),
  ).map((b) => ({
    brand: b.brand,
    product: b.product,
    href: b.href,
    contains: b.containsDisplay,
    unreviewed_names: b.containsUnreviewedNames,
  }));

  // "CaAKG" vs "Ca-AKG" must compare equal, so fold case and drop everything that is not a
  // letter or digit before comparing.
  const fold = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const blocked = new Set(unreviewedNames.map(fold));
  const tier2 = blocked.size === 0 ? TIER2_ITEMS : TIER2_ITEMS.filter((i) => !blocked.has(fold(i.category)));

  return { tier1, tier2, tier3 };
}

export { EXCLUDED_HREFS } from './catalog.js';
export type { CatalogProduct, CatalogTier2Item } from './catalog.js';
