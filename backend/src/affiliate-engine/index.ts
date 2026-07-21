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
 * - Tier 2: always returned — a general "also available" list, not stack-dependent.
 * - Tier 3: a bundle is included only if the stack contains >=1 compound the bundle contains.
 */
export function buildStartSection(recognized: RecognizedForStart[]): StartSection {
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
  ).map((b) => ({ brand: b.brand, product: b.product, href: b.href, contains: b.containsDisplay }));

  return { tier1, tier2: TIER2_ITEMS, tier3 };
}

export { EXCLUDED_HREFS } from './catalog.js';
export type { CatalogProduct, CatalogTier2Item } from './catalog.js';
