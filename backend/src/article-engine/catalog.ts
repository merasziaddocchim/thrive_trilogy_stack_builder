// Founder-reviewed article mapping — the SINGLE source of truth for Report article links,
// transcribed verbatim from Docs/article-linking-structured.md. Do NOT re-derive this mapping
// from the blog, the content inventory in STATUS.md §5, or anywhere else, and do NOT edit the
// paths — they are the live thrivetrilogy.com slugs exactly as the founder supplied them.
//
// Firewall (TECH_DOCS §4, CLAIMS_COMPLIANCE §6): this module holds article data only. It is
// never importable by scoring-engine/, and it never imports scoring-engine/. It imports the
// compound UUIDs from the seed data purely to key articles to compounds — no scoring logic.
//
// CLASSIFICATION IS A COMPLIANCE BOUNDARY, NOT A STYLE CHOICE (CLAIMS_COMPLIANCE §6 extension):
//   educational — explains a mechanism, dose, or delivery format; recommends no purchasable
//                 product. Functionally a citation. Linkable ANYWHERE, incl. Stop/Keep/Evidence
//                 Tier content, with no disclosure.
//   roundup     — ranks or recommends specific purchasable products, and is itself affiliate-
//                 monetized. Includes SINGLE-BRAND REVIEWS (founder decision, recorded in the
//                 source file). Start section ONLY, with per-link disclosure.
// Moving an article between these two arrays changes where it may legally appear. Any such move
// requires the founder decision to be recorded in Docs/article-linking-structured.md first.
import { SEED_COMPOUND_IDS } from '../db/seed-data.js';

/** The blog lives on the root domain; the app is a different subdomain (app.thrivetrilogy.com). */
export const BLOG_ORIGIN = 'https://thrivetrilogy.com';

/**
 * Absolute URL for a founder-supplied relative path. The source file stores relative paths
 * (e.g. `/nmn-dosing-protocol-guide/`); every href we emit must be absolute, because a relative
 * href on app.thrivetrilogy.com would resolve to the APP subdomain and 404 (task §3).
 */
export function blogUrl(path: string): string {
  return `${BLOG_ORIGIN}${path}`;
}

export interface Article {
  title: string;
  /** Absolute URL on thrivetrilogy.com — never relative (see blogUrl). */
  href: string;
  /**
   * True for the single best Stop/Keep-row "Learn more" candidate for this compound.
   * Only NMN carries an explicit founder marker ("highest relevance — direct dosing content,
   * strong candidate for Stop/Keep row link"); for every other compound the primary defaults
   * to the first article in source order. See README + PR notes — flagged assumption.
   */
  primary?: boolean;
}

const C = SEED_COMPOUND_IDS;

// ---- EDUCATIONAL — linkable anywhere, incl. Stop/Keep/Evidence Tier, no disclosure ---------
// Order is source order (the founder's file). Articles tagged under more than one compound are
// listed under EACH of them, exactly as the source file lists them — that repetition is the
// mapping, not an accident (task §1: dual-tagged articles appear under every compound).
export const EDUCATIONAL: Record<string, Article[]> = {
  [C.nmn]: [
    {
      title: 'NMN Dosing Protocol: The Evidence-Based Guide',
      href: blogUrl('/nmn-dosing-protocol-guide/'),
      primary: true, // founder-marked "highest relevance ... strong candidate for Stop/Keep row link"
    },
    {
      title: 'The NMN Bioavailability Crisis: Why 90% of Supplements Are Dead on Arrival',
      href: blogUrl('/nmn-bioavailability-chemistry/'),
    },
    {
      title: 'Liposomal NMN vs. Sublingual: A Chemist’s Guide to "Expensive Urine"',
      href: blogUrl('/liposomal-nmn-vs-capsules-bioavailability/'),
    },
    {
      title: 'Sublingual vs Liposomal vs Capsule NMN: Delivery Matrix',
      href: blogUrl('/sublingual-nmn-bioavailability-liposomal-capsule/'),
    },
    {
      title: 'NMN Stack 2026: Build the Honest NAD+ Longevity Protocol',
      href: blogUrl('/nmn-stack-longevity-protocol/'),
    },
    // dual-tagged, also under NR
    {
      title: 'NMN vs NR: Which NAD+ Precursor Actually Wins?',
      href: blogUrl('/nmn-vs-nr-nad-precursor/'),
    },
    {
      title: 'NAD+ Nootropic vs Standard NMN',
      href: blogUrl('/nad-nootropic-vs-nmn-brain-performance/'),
    },
    // dual-tagged, also under TMG
    {
      title: 'TMG and Methylation: Why You Need It With NMN',
      href: blogUrl('/tmg-supplement-methylation-nmn/'),
    },
    // dual-tagged, also under NR
    {
      title: 'The Salvage Pathway: Why Your Body Recycles NAD+',
      href: blogUrl('/nad-salvage-pathway/'),
    },
    // dual-tagged, also under NR
    {
      title: 'NAD+ and Longevity: What This Molecule Actually Does to Your Cells',
      href: blogUrl('/nad-longevity-molecule/'),
    },
  ],
  [C.nr]: [
    { title: 'NMN vs NR: Which NAD+ Precursor Actually Wins?', href: blogUrl('/nmn-vs-nr-nad-precursor/') },
    { title: 'The Salvage Pathway: Why Your Body Recycles NAD+', href: blogUrl('/nad-salvage-pathway/') },
    {
      title: 'NAD+ and Longevity: What This Molecule Actually Does to Your Cells',
      href: blogUrl('/nad-longevity-molecule/'),
    },
  ],
  [C.berberine]: [
    {
      title: 'Berberine vs Metformin: 5 Critical Differences a Chemist Actually Cares About',
      href: blogUrl('/berberine-vs-metformin/'),
    },
    {
      title: 'Why Your Berberine Isn’t Working — And What Dihydroberberine Actually Does',
      href: blogUrl('/dihydroberberine-vs-berberine/'),
    },
  ],
  [C.resveratrol]: [
    {
      title: 'The Resveratrol Paradox: Why You Are Excreting 99% of Your Longevity Supplement',
      href: blogUrl('/resveratrol-brick-dust-paradox/'),
    },
  ],
  [C.tmg]: [
    { title: 'TMG vs Methylfolate: Molecular Side-by-Side Matrix', href: blogUrl('/tmg-vs-methylfolate/') },
    {
      title: 'Methylation Supplements: The Biochemist’s Complete Guide',
      href: blogUrl('/methylation-supplements-guide/'),
    },
    // dual-tagged, also under NMN
    {
      title: 'TMG and Methylation: Why You Need It With NMN',
      href: blogUrl('/tmg-supplement-methylation-nmn/'),
    },
    {
      title: 'MTHFR Supplement Protocol: Chemist’s Quick Verdict',
      href: blogUrl('/mthfr-supplement-protocol/'),
    },
  ],
};

// ---- ROUNDUP — Start section ONLY, per-link disclosure (CLAIMS §6 extension) ---------------
// Includes single-brand review articles, treated as roundups per explicit founder decision.
// Where multiple roundups compete for one compound, ALL are shown — the founder chose breadth
// over picking a winner (source file, line 3).
export const ROUNDUP: Record<string, Article[]> = {
  [C.nmn]: [
    { title: 'Best Liposomal NMN Supplement 2026', href: blogUrl('/best-liposomal-nmn-supplement-2026/') },
    { title: 'Best NMN Supplement USA 2026', href: blogUrl('/best-nmn-supplement-usa/') },
    { title: 'Best NMN Supplements 2026', href: blogUrl('/best-nmn-supplements-2026/') },
    // dual-tagged, also under NR
    { title: 'Best NAD+ Supplements 2026', href: blogUrl('/5-best-nad-supplements-2026/') },
    {
      title: 'Renue by Science vs DoNotAge vs ProHealth: A Chemist’s NMN Brand Comparison',
      href: blogUrl('/renue-by-science-review-vs-donotage-prohealth/'),
    },
    // single-brand review, treated as roundup per founder decision
    { title: 'NMNBio Review: A Chemist’s Verdict', href: blogUrl('/nmnbio-review/') },
    // single-brand review, treated as roundup per founder decision
    { title: 'Renue by Science Lipo NMN Review', href: blogUrl('/renue-by-science-nmn-review/') },
  ],
  [C.nr]: [
    { title: 'Best NR Supplements 2026', href: blogUrl('/best-nr-supplements-2026/') },
    // dual-tagged, also under NMN
    { title: 'Best NAD+ Supplements 2026', href: blogUrl('/5-best-nad-supplements-2026/') },
  ],
  [C.berberine]: [
    { title: 'Best Berberine Supplements 2026', href: blogUrl('/best-berberine-supplements-2026/') },
  ],
  [C.resveratrol]: [
    { title: 'Best Resveratrol Supplements 2026', href: blogUrl('/best-resveratrol-supplements-2026/') },
  ],
  [C.tmg]: [
    { title: 'Best TMG Supplement 2026', href: blogUrl('/best-tmg-supplement-2026/') },
    { title: 'Best Methylation Supplement Stack 2026', href: blogUrl('/best-methylation-supplement-2026/') },
  ],
};

// ---- HUB PAGES — general links only ---------------------------------------------------------
// Explicitly NOT per-compound Report slots (source file + task §6): these are pillar pages, so
// they are surfaced as a general "research hubs" mention, never inside a compound's row or its
// Start group. Hubs are educational (they rank no purchasable product), so they need no
// disclosure. `relevance` is descriptive copy from the source file, not a targeting key.
export interface HubPage {
  title: string;
  href: string;
  relevance: string;
}

export const HUB_PAGES: HubPage[] = [
  {
    title: 'NAD+ Precursors: The Biochemist’s Complete Guide',
    href: blogUrl('/nad-precursors/'),
    relevance: 'NMN + NR',
  },
  {
    title: 'Methylation Supplements: The Biochemist’s Analysis',
    href: blogUrl('/methylation/'),
    relevance: 'TMG',
  },
  {
    title: 'Longevity Compounds: Molecular Analysis by a Chemist',
    href: blogUrl('/longevity-compounds/'),
    relevance: 'General',
  },
  {
    title: 'Supplement Delivery Systems: Bioavailability Decoded',
    href: blogUrl('/delivery-systems/'),
    relevance: 'General',
  },
];

// ---- EXCLUDED --------------------------------------------------------------------------------
// Articles for compounds NOT in the 5-compound evidence database, plus non-single-compound
// roundups. There is no Report placement for these and they must never surface anywhere
// (task §7). The source file names them by topic rather than URL, so exclusion is enforced two
// ways: (1) structurally — they are simply absent from the tables above, which are keyed only by
// the five seeded compound_ids; (2) by assertion — the slug fragments below are checked against
// every emitted href by the test suite, so a future edit that pastes one in fails the build.
//
// NOTE on near-misses, deliberately chosen to avoid false positives:
//   'best-liposomal-supplement'  does NOT match the allowed '/best-liposomal-nmn-supplement-2026/'
//   'best-longevity-supplement'  does NOT match the allowed '/nmn-stack-longevity-protocol/'
//   the excluded general "Supplement Delivery Systems" POST is distinct from the allowed
//   '/delivery-systems/' HUB page, and no slug fragment can separate them, so it is excluded
//   structurally only (its URL was never supplied).
export const EXCLUDED_SLUG_FRAGMENTS: readonly string[] = [
  'urolithin', // Urolithin A (2 articles)
  'spermidine', // Spermidine (3 articles)
  'fisetin', // Fisetin (1 article + 1 shared w/ Quercetin)
  'quercetin', // Quercetin (2 articles)
  'akg', // AKG/CaAKG (1 article)
  'synephrine', // p-Synephrine (1 article)
  'mtor', // MTOR VS AMPK (general mechanism, not single-compound)
  'ampk', // MTOR VS AMPK
  'best-liposomal-supplement', // general "Best Liposomal Supplement 2026" (not single-compound)
  'best-longevity-supplement', // general "Best Longevity Supplements 2026/UK" (not single-compound)
];
