// Founder-reviewed affiliate product catalog — the SINGLE source of truth for Start-section
// products, transcribed verbatim from Docs/affiliate-products-structured.md (the founder's
// structured mapping). Do NOT re-derive product data from anywhere else, and do NOT edit the
// /go/ links — they are the existing thrivetrilogy.com cloaked redirects and are used exactly
// as given (founder decision).
//
// Firewall (TECH_DOCS §4, CLAIMS_COMPLIANCE §6): this module holds affiliate data only. It is
// never importable by scoring-engine/, and it never imports scoring-engine/. It imports the
// compound UUIDs from the seed data purely to key products to compounds — no scoring logic.
import { SEED_COMPOUND_IDS } from '../db/seed-data.js';

export interface CatalogProduct {
  brand: string;
  product: string;
  href: string;
}

export interface CatalogTier2Item extends CatalogProduct {
  /** Compound or category label — NOT an evidence tier (these are not evidence-scored). */
  category: string;
}

export interface CatalogBundle extends CatalogProduct {
  /** Human-readable list of what the bundle contains (for the user to judge relevance). */
  containsDisplay: string;
  /** Reviewed compound_ids the bundle contains — drives the "show only if in stack" gate. */
  containsCompoundIds: string[];
}

const C = SEED_COMPOUND_IDS;

// ---- TIER 1 — evidence-reviewed compounds; products keyed by compound_id -----------------
// Multiple brands per compound are listed EQUALLY, in source order — no ranking/sorting (no
// price data exists yet; founder decision).
export const TIER1_PRODUCTS: Record<string, CatalogProduct[]> = {
  [C.nmn]: [
    { brand: 'NMNBio', product: 'NMN supplement capsules 500mg', href: '/go/nmnbio-nmn-500mg' },
    { brand: 'Renue by Science', product: 'NMN Liposomal Capsules', href: '/go/renue-lipo-nmncapsules' },
    { brand: 'Genuine Purity', product: 'Liposomal NMN', href: '/go/genuine-lipo-nmn' },
    { brand: 'Wonderfeel', product: 'Youngr™ NMN', href: '/go/wonderfeel-nmn' },
    { brand: 'partiQlar', product: 'Pure NAD Booster (NMN)', href: '/go/PartiQlar_NMN' },
  ],
  [C.tmg]: [
    { brand: 'NMNBio', product: 'TMG 500mg, 90 Capsules', href: '/go/nmnbio-tmg' },
    { brand: 'Renue by Science', product: 'TMG Methylation Essentials', href: '/go/renue-tmg' },
  ],
  [C.berberine]: [
    { brand: 'NMNBio', product: 'Berberine 400mg with Milk Thistle', href: '/go/nmnbio-berberine' },
    { brand: 'Renue by Science', product: 'Berberine (Liposomal)', href: '/go/renue-berberine' },
  ],
  [C.nr]: [
    // EXCLUDED (do not add): both partiQlar NR entries — /go/partiQlar_main and /go/partiQlar_NR —
    // are ambiguous duplicate tracking IDs for what looks like the same page; the founder is
    // unsure which is correct, so BOTH are held out pending confirmation (source file NOTE + task §4).
    { brand: 'Renue by Science', product: 'NR Powder Smooth Taste Blend', href: '/go/renue-nrpowder' },
    { brand: 'Genuine Purity', product: 'Liposomal NR', href: '/go/genuinepurity-nr' },
  ],
  [C.resveratrol]: [
    { brand: 'Renue by Science', product: 'Trans-Resveratrol (Liposomal)', href: '/go/renue-trans-resveratrol' },
    { brand: 'Genuine Purity', product: 'Liposomal Trans-Resveratrol', href: '/go/gen-trans-reservatrol' },
    { brand: 'partiQlar', product: 'Pure Resveratrol, 60 Capsules', href: '/go/partiQlar_Resveratrol' },
  ],
};

// ---- TIER 2 — "Also available"; NO evidence-tier data, not evidence-scored ----------------
export const TIER2_ITEMS: CatalogTier2Item[] = [
  { brand: 'Renue by Science', product: 'CaAKG (Liposomal)', href: '/go/renue-CaAKG', category: 'CaAKG' },
  { brand: 'Renue by Science', product: 'Quercetin (Liposomal)', href: '/go/renue-Quercetin', category: 'Quercetin' },
  { brand: 'partiQlar', product: 'Pure Spermidine, 60 Capsules', href: '/go/partiQlar_Spermidine', category: 'Spermidine' },
  { brand: 'Calocurb', product: 'Calocurb GLP-1 Activator', href: '/go/calocurb', category: 'GLP-1 (not a reviewed compound)' },
  { brand: 'Jinfiniti', product: 'Ultimate Longevity Panel (CLIA-certified testing)', href: '/go/jinfiniti-ultimate', category: 'Diagnostic testing, not a supplement' },
  { brand: 'Jinfiniti', product: 'NAD Dosing Protocol ($396 offer)', href: '/go/jinfiniti-dosing-prot', category: 'Diagnostic testing, not a supplement' },
  // NOTE: /go/jinfiniti-nad-memebrship is spelled exactly as given in the source file (task §5:
  // do not modify links). The misspelling is in the founder's cloaked redirect, not a typo here.
  { brand: 'Jinfiniti', product: 'NAD Membership Program (15% recurring)', href: '/go/jinfiniti-nad-memebrship', category: 'Membership/discount program' },
];

// ---- TIER 3 — bundles; shown only when the stack overlaps their contents ------------------
// Only the two ITEMIZED bundles are included. The two UNITEMIZED bundles — Longevity Essentials
// (/go/nmnbio-longessentials) and Ultimate Biohacker (/go/nmnbio-ultbiohacker) — are EXCLUDED
// pending founder confirmation of contents (source file + task §4). A bundle is not itself
// evidence-scored, so it carries no tier badge; `containsDisplay` lets the user judge relevance.
export const TIER3_BUNDLES: CatalogBundle[] = [
  {
    brand: 'NMNBio',
    product: 'Longevity Starter Pack',
    href: '/go/nmnbio-long-starterpack',
    containsDisplay: 'NMN, TMG, and Quercetin',
    // Quercetin is not an evidence-reviewed compound in our DB, so only NMN + TMG gate visibility.
    containsCompoundIds: [C.nmn, C.tmg],
  },
  {
    brand: 'NMNBio',
    product: 'Morning Bundle',
    href: '/go/nmnbio-morning',
    containsDisplay: 'NMN, TMG, and NAD+ Brain (a proprietary blend)',
    containsCompoundIds: [C.nmn, C.tmg],
  },
];

// Hrefs that must NEVER appear in any Start output (excluded storefront/blend items + the
// ambiguous/unitemized entries). Exported so tests can assert none of them leak through.
export const EXCLUDED_HREFS: readonly string[] = [
  '/go/partiQlar_main', // ambiguous partiQlar NR (oid=10)
  '/go/partiQlar_NR', // ambiguous partiQlar NR (oid=4)
  '/go/nmnbio-longessentials', // unitemized bundle — contents unconfirmed
  '/go/nmnbio-ultbiohacker', // unitemized bundle — contents unconfirmed
  '/go/nmnbio-nad-brain', // standalone proprietary blend, not a reviewed compound
  '/go/longevity-plus', // Genuine Purity blend, not a reviewed compound
];
