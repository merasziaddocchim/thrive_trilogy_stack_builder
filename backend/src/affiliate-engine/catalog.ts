// Founder-reviewed affiliate product catalog — the SINGLE source of truth for Start-section
// products, transcribed verbatim from Docs/affiliate-products-structured.md (the founder's
// structured mapping). Do NOT re-derive product data from anywhere else, and do NOT edit the
// /go/ paths — they are the existing thrivetrilogy.com cloaked redirects and are used exactly
// as given (founder decision).
//
// URLS: every href goes through `blogUrl()` from ../shared/blog-url.js — the ONE utility that
// resolves a founder-supplied path against the ROOT domain (thrivetrilogy.com). The /go/
// redirects live on the root domain, NOT on app.thrivetrilogy.com, so a bare relative string
// here resolves against the app and 404s. That bug shipped to production (all 23 links) and is
// invisible to the compiler — never write a raw '/go/...' string as an href in this file.
//
// Firewall (TECH_DOCS §4, CLAIMS_COMPLIANCE §6): this module holds affiliate data only. It is
// never importable by scoring-engine/, and it never imports scoring-engine/. It imports the
// compound UUIDs from the seed data purely to key products to compounds — no scoring logic.
import { SEED_COMPOUND_IDS } from '../db/seed-data.js';
import { blogUrl } from '../shared/blog-url.js';

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
  /**
   * Display names of bundle contents this app has NOT evidence-reviewed (CLAIMS_COMPLIANCE §4e).
   *
   * SEPARATE FIELD, AND DELIBERATELY NOT DERIVED FROM `containsCompoundIds`. That array holds
   * only reviewed compounds — the comment on the Longevity Starter Pack says so outright — so
   * the ids of the very contents needing disclosure are exactly the ones missing from it. A
   * check driven off it would find nothing to disclose.
   *
   * NAMES, NOT IDS, ON PURPOSE. The disclosure is a static statement about the bundle: it
   * contains what it contains regardless of which compounds happen to be in the registry, or in
   * any given user's stack, on any given day. Deriving it from the registry would make the
   * sentence appear and disappear as the registry grows.
   */
  containsUnreviewedNames: string[];
}

const C = SEED_COMPOUND_IDS;

// ---- TIER 1 — evidence-reviewed compounds; products keyed by compound_id -----------------
// Multiple brands per compound are listed EQUALLY, in source order — no ranking/sorting (no
// price data exists yet; founder decision).
export const TIER1_PRODUCTS: Record<string, CatalogProduct[]> = {
  [C.nmn]: [
    { brand: 'NMNBio', product: 'NMN supplement capsules 500mg', href: blogUrl('/go/nmnbio-nmn-500mg') },
    { brand: 'Renue by Science', product: 'NMN Liposomal Capsules', href: blogUrl('/go/renue-lipo-nmncapsules') },
    { brand: 'Genuine Purity', product: 'Liposomal NMN', href: blogUrl('/go/genuine-lipo-nmn') },
    { brand: 'Wonderfeel', product: 'Youngr™ NMN', href: blogUrl('/go/wonderfeel-nmn') },
    { brand: 'partiQlar', product: 'Pure NAD Booster (NMN)', href: blogUrl('/go/PartiQlar_NMN') },
  ],
  [C.tmg]: [
    { brand: 'NMNBio', product: 'TMG 500mg, 90 Capsules', href: blogUrl('/go/nmnbio-tmg') },
    { brand: 'Renue by Science', product: 'TMG Methylation Essentials', href: blogUrl('/go/renue-tmg') },
  ],
  [C.berberine]: [
    { brand: 'NMNBio', product: 'Berberine 400mg with Milk Thistle', href: blogUrl('/go/nmnbio-berberine') },
    { brand: 'Renue by Science', product: 'Berberine (Liposomal)', href: blogUrl('/go/renue-berberine') },
  ],
  [C.nr]: [
    // EXCLUDED (do not add): both partiQlar NR entries — /go/partiQlar_main and /go/partiQlar_NR —
    // are ambiguous duplicate tracking IDs for what looks like the same page; the founder is
    // unsure which is correct, so BOTH are held out pending confirmation (source file NOTE + task §4).
    { brand: 'Renue by Science', product: 'NR Powder Smooth Taste Blend', href: blogUrl('/go/renue-nrpowder') },
    { brand: 'Genuine Purity', product: 'Liposomal NR', href: blogUrl('/go/genuinepurity-nr') },
  ],
  [C.resveratrol]: [
    { brand: 'Renue by Science', product: 'Trans-Resveratrol (Liposomal)', href: blogUrl('/go/renue-trans-resveratrol') },
    { brand: 'Genuine Purity', product: 'Liposomal Trans-Resveratrol', href: blogUrl('/go/gen-trans-reservatrol') },
    { brand: 'partiQlar', product: 'Pure Resveratrol, 60 Capsules', href: blogUrl('/go/partiQlar_Resveratrol') },
  ],
};

// ---- TIER 2 — "Also available"; NO evidence-tier data, not evidence-scored ----------------
export const TIER2_ITEMS: CatalogTier2Item[] = [
  { brand: 'Renue by Science', product: 'CaAKG (Liposomal)', href: blogUrl('/go/renue-CaAKG'), category: 'CaAKG' },
  { brand: 'Renue by Science', product: 'Quercetin (Liposomal)', href: blogUrl('/go/renue-Quercetin'), category: 'Quercetin' },
  { brand: 'partiQlar', product: 'Pure Spermidine, 60 Capsules', href: blogUrl('/go/partiQlar_Spermidine'), category: 'Spermidine' },
  { brand: 'Calocurb', product: 'Calocurb GLP-1 Activator', href: blogUrl('/go/calocurb'), category: 'GLP-1 (not a reviewed compound)' },
  { brand: 'Jinfiniti', product: 'Ultimate Longevity Panel (CLIA-certified testing)', href: blogUrl('/go/jinfiniti-ultimate'), category: 'Diagnostic testing, not a supplement' },
  { brand: 'Jinfiniti', product: 'NAD Dosing Protocol ($396 offer)', href: blogUrl('/go/jinfiniti-dosing-prot'), category: 'Diagnostic testing, not a supplement' },
  // NOTE: /go/jinfiniti-nad-memebrship is spelled exactly as given in the source file (task §5:
  // do not modify links). The misspelling is in the founder's cloaked redirect, not a typo here.
  { brand: 'Jinfiniti', product: 'NAD Membership Program (15% recurring)', href: blogUrl('/go/jinfiniti-nad-memebrship'), category: 'Membership/discount program' },
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
    href: blogUrl('/go/nmnbio-long-starterpack'),
    containsDisplay: 'NMN, TMG, and Quercetin',
    // Quercetin is not an evidence-reviewed compound in our DB, so only NMN + TMG gate visibility.
    containsCompoundIds: [C.nmn, C.tmg],
    containsUnreviewedNames: ['Quercetin'],
  },
  {
    brand: 'NMNBio',
    product: 'Morning Bundle',
    href: blogUrl('/go/nmnbio-morning'),
    containsDisplay: 'NMN, TMG, and NAD+ Brain (a proprietary blend)',
    containsCompoundIds: [C.nmn, C.tmg],
    // Empty by founder decision, not by oversight. "NAD+ Brain" is a proprietary blend, not a
    // registry compound, and the display string already says so — which is the honest
    // disclosure, because the app cannot state what a proprietary blend contains. Do not parse
    // the string and do not enumerate its ingredients.
    containsUnreviewedNames: [],
  },
];

// Hrefs that must NEVER appear in any Start output (excluded storefront/blend items + the
// ambiguous/unitemized entries). Exported so tests can assert none of them leak through.
export const EXCLUDED_HREFS: readonly string[] = [
  blogUrl('/go/partiQlar_main'), // ambiguous partiQlar NR (oid=10)
  blogUrl('/go/partiQlar_NR'), // ambiguous partiQlar NR (oid=4)
  blogUrl('/go/nmnbio-longessentials'), // unitemized bundle — contents unconfirmed
  blogUrl('/go/nmnbio-ultbiohacker'), // unitemized bundle — contents unconfirmed
  blogUrl('/go/nmnbio-nad-brain'), // standalone proprietary blend, not a reviewed compound
  blogUrl('/go/longevity-plus'), // Genuine Purity blend, not a reviewed compound
];
