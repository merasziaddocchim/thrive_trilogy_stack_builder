// =============================================================================
// FIXTURES — sample data ONLY. Shaped exactly to the TECH_DOCS §6 API contract and
// the §1a intake-parser plan. These now back the FALLBACK path in lib/data.ts (used when
// the live backend is unreachable/unseeded) and are handy for tests/demos; the live app
// prefers real backend data. Every export here is prefixed `FIXTURE_` so its provenance is
// obvious at every call site. NONE of this is a real user's data or a real result.
// =============================================================================
import type {
  ExtractedItem,
  PreviewResponse,
  ReportResponse,
} from './types';
import { REVIEWER } from './constants';

const REV = REVIEWER.name;
const REV_DATE = REVIEWER.lastReviewed;

// The blog AND the /go/ affiliate redirects run on the root domain; this app is a different
// subdomain, so every outbound href is absolute (a relative path resolves against
// app.thrivetrilogy.com and 404s — that shipped as a production bug for all 23 affiliate
// links). Mirrors BLOG_ORIGIN in the backend's shared/blog-url.ts.
const BLOG = 'https://thrivetrilogy.com';

// A realistic multi-line free-text entry, used as the default extractor input so the
// "Confirm What We Found" screen has a mixed-confidence list to handle (prompt §4).
export const FIXTURE_RAW_STACK_INPUT = `NMN 250mg (Renue by Science, sublingual) - about $45/mo
Tru Niagen 300mg
liposomal resveratrol, 1 scoop
TMG 1000
berberine 500mg 2x day
some kind of spermidine, not sure of the dose
magnesium glycinate at night`;

// Mixed high- and low-confidence extraction. The "unmatched"/"low" rows are what make
// the correction UI meaningful — the user must be able to fix these before Preview.
export const FIXTURE_EXTRACTION: ExtractedItem[] = [
  {
    clientId: 'x1',
    rawText: 'NMN 250mg (Renue by Science, sublingual) - about $45/mo',
    canonicalName: 'NMN (Nicotinamide Mononucleotide)',
    compoundId: 'cmp_nmn',
    dose: { amount: 250, unit: 'mg' },
    deliveryFormat: 'sublingual',
    monthlyPrice: 45,
    confidence: 'high',
    doseState: 'explicit',
  },
  {
    clientId: 'x2',
    rawText: 'Tru Niagen 300mg',
    canonicalName: 'NR (Nicotinamide Riboside)',
    compoundId: 'cmp_nr',
    dose: { amount: 300, unit: 'mg' },
    deliveryFormat: 'standard_capsule',
    monthlyPrice: null,
    confidence: 'high',
    doseState: 'explicit',
  },
  {
    clientId: 'x3',
    rawText: 'liposomal resveratrol, 1 scoop',
    canonicalName: 'Resveratrol',
    compoundId: 'cmp_resveratrol',
    // "1 scoop" is not an interpretable dose — left null on purpose so the UI shows
    // the "dose not recognized" affordance rather than inventing a number.
    dose: null,
    deliveryFormat: 'liposomal',
    monthlyPrice: null,
    // Recognized compound, missing dose — two SEPARATE facts now (§4b). "1 scoop" is a
    // count, not a dose, and not knowing the dose says nothing about the match, so this
    // row is no longer demoted to 'low'.
    confidence: 'high',
    doseState: 'missing',
  },
  {
    clientId: 'x4',
    rawText: 'TMG 1000',
    canonicalName: 'TMG (Trimethylglycine / Betaine)',
    compoundId: 'cmp_tmg',
    dose: { amount: 1000, unit: 'mg' },
    deliveryFormat: 'standard_capsule',
    monthlyPrice: null,
    confidence: 'high',
    // "TMG 1000" — a bare number resolved through TMG's stored default unit. The Confirm
    // screen must disclose the inference and keep it editable (§4b).
    doseState: 'assumed',
  },
  {
    clientId: 'x5',
    rawText: 'berberine 500mg 2x day',
    canonicalName: 'Berberine',
    compoundId: 'cmp_berberine',
    dose: { amount: 1000, unit: 'mg' }, // 500mg × 2/day, extractor summed the daily dose
    deliveryFormat: 'standard_capsule',
    monthlyPrice: null,
    confidence: 'high',
    doseState: 'explicit',
  },
  {
    clientId: 'x6',
    rawText: 'some kind of spermidine, not sure of the dose',
    canonicalName: 'Spermidine',
    compoundId: 'cmp_spermidine',
    dose: null,
    deliveryFormat: null,
    monthlyPrice: null,
    confidence: 'high',
    doseState: 'missing',
  },
  {
    clientId: 'x7',
    rawText: 'magnesium glycinate at night',
    // Not in the reviewed compounds table's covered categories — surfaced as unmatched
    // so the user can decide to keep or drop it, rather than silently guessing.
    canonicalName: null,
    compoundId: null,
    dose: null,
    deliveryFormat: null,
    monthlyPrice: null,
    confidence: 'unmatched',
    doseState: 'missing',
  },
];

// ---- PREVIEW — STATE A: sufficient data recognized (prompt §5) --------------
// Shown only when the user supplied enough (recognized compounds + monthly spend).
export const FIXTURE_PREVIEW_STATE_A: PreviewResponse = {
  sufficient_for_scoring: true,
  recognized_compounds: [
    // §4e: recognized, no scoring parameter, therefore NO tier. Kept in the fixture so the
    // sample Preview exercises the null-tier badge rather than only the happy path.
    { compound_id: 'cmp_creatine', canonical_name: 'Creatine', evidence_tier: null, outcome_mismatch_note: null },
    { compound_id: 'cmp_nmn', canonical_name: 'NMN (Nicotinamide Mononucleotide)', evidence_tier: 'B', outcome_mismatch_note: null },
    { compound_id: 'cmp_nr', canonical_name: 'NR (Nicotinamide Riboside)', evidence_tier: 'B', outcome_mismatch_note: null },
    { compound_id: 'cmp_resveratrol', canonical_name: 'Resveratrol', evidence_tier: 'C', outcome_mismatch_note: null },
    { compound_id: 'cmp_tmg', canonical_name: 'TMG (Trimethylglycine)', evidence_tier: 'B', outcome_mismatch_note: null },
    { compound_id: 'cmp_berberine', canonical_name: 'Berberine', evidence_tier: 'A', outcome_mismatch_note: null },
    { compound_id: 'cmp_spermidine', canonical_name: 'Spermidine', evidence_tier: 'C', outcome_mismatch_note: null },
  ],
  evidence_tier_summary: { A: 1, B: 3, C: 2, D: 0 },
  overlap_flags: [
    { shared_ingredient: 'NAD+ precursor (NMN + NR)', product_count: 2, approx_monthly_cost: 72 },
  ],
  spend_efficiency_index: 58,
  estimated_annual_waste: { low: 340, high: 520 },
  // Built from CLAIMS_COMPLIANCE §9 redundancy template — no freehand text.
  headline_finding:
    "You're taking 2 products that each contain a NAD+ precursor. Combined, you're spending approximately $72/month on overlapping sources.",
  dose_comparisons: [
    {
      compound: 'NMN',
      evidence_tier: 'B',
      outcome_mismatch_note: null,
      user_dose: { amount: 250, unit: 'mg' },
      studied_range: { low: 300, high: 500, unit: 'mg' },
      percent_delta: -17, // below studied range
      source_short_name: 'Yoshino 2021',
    },
    {
      compound: 'Berberine',
      evidence_tier: 'A',
      outcome_mismatch_note: null,
      user_dose: { amount: 1000, unit: 'mg' },
      studied_range: { low: 900, high: 1500, unit: 'mg' },
      percent_delta: 0, // within range
      source_short_name: 'Meta-analysis, 27 RCTs',
    },
  ],
  // §4e: one recognized compound (Creatine) is excluded from the score, so the sentence renders.
  coverage_note: 'This score covers 4 of the 5 compounds you entered.',
};

// ---- PREVIEW — STATE B: insufficient data for full scoring (prompt §5) ------
// The common V1 case: compounds recognized, but no monthly spend given, so NO SEI and
// NO Annual Waste are fabricated. Financial fields are null; the UI shows a nudge.
export const FIXTURE_PREVIEW_STATE_B: PreviewResponse = {
  sufficient_for_scoring: false,
  recognized_compounds: [
    { compound_id: 'cmp_nmn', canonical_name: 'NMN (Nicotinamide Mononucleotide)', evidence_tier: 'B', outcome_mismatch_note: null },
    { compound_id: 'cmp_resveratrol', canonical_name: 'Resveratrol', evidence_tier: 'C', outcome_mismatch_note: null },
    { compound_id: 'cmp_tmg', canonical_name: 'TMG (Trimethylglycine)', evidence_tier: 'B', outcome_mismatch_note: null },
    { compound_id: 'cmp_spermidine', canonical_name: 'Spermidine', evidence_tier: 'C', outcome_mismatch_note: null },
  ],
  evidence_tier_summary: { A: 0, B: 2, C: 2, D: 0 },
  overlap_flags: [],
  spend_efficiency_index: null,
  estimated_annual_waste: null,
  headline_finding:
    'We recognized 4 compounds in your stack and matched each to an evidence tier.',
  dose_comparisons: [],
  // No SEI in State B, so there is no score to qualify — §4e's sentence would have nothing to
  // describe. Null, not a sentence about a number that was never rendered.
  coverage_note: null,
};

// ---- FULL STACK REPORT (post email-capture) ---------------------------------
export const FIXTURE_REPORT: ReportResponse = {
  composite_score: 58,
  safety_flag: false,
  stop: [
    {
      compound: 'NR (Nicotinamide Riboside)',
      reason:
        "You're taking 2 products that each contain a NAD+ precursor (NMN and NR). Combined, you're spending approximately $72/month on overlapping sources. NR and NMN feed the same salvage pathway — running both is redundant spend.",
      est_monthly_waste: 30,
      evidence_tier: 'B',
      outcome_mismatch_note: null,
      tier_rationale: 'A single human RCT supports NR at this dose range.',
      last_reviewed: REV_DATE,
      reviewer_name: REV,
      source_ids: ['src_nr_rct_2018', 'src_nad_salvage_review'],
      learn_more: { title: 'NMN vs NR: Which NAD+ Precursor Actually Wins?', href: `${BLOG}/nmn-vs-nr-nad-precursor/` },
    },
  ],
  // §4d. Resveratrol moved here from `stop` on 2026-08-01: it is Tier C with no interpretable
  // dose, and §4d says Tier C alone is never grounds for Stop. The row is RELOCATED verbatim —
  // the only edit is the money field name, which §4d requires (an Adjust row carries the user's
  // cost, not a waste figure, because the section says the compound is worth keeping).
  // FLAGGED, NOT FIXED: this row's `reason` is old freehand fixture copy predating the
  // approved templates, and still says "Preliminary research ... human clinical data on
  // optimal dosing is not yet available" — the sentence pattern PR #29 withdrew from the live
  // template. Fixture-only, never served by the backend, and rewriting it would be authoring
  // claims copy.
  adjust: [
    {
      compound: 'Resveratrol',
      reason:
        'Preliminary research on resveratrol has used a range of doses; human clinical data on optimal dosing is not yet available. At a liposomal "1 scoop" serving, the delivered dose could not be interpreted, so its contribution to your stack cannot be verified.',
      monthly_cost: 18,
      evidence_tier: 'C',
      outcome_mismatch_note: null,
      tier_rationale: 'Observational and animal data with mechanistic plausibility; not yet confirmed in human trials.',
      last_reviewed: REV_DATE,
      reviewer_name: REV,
      source_ids: ['src_resveratrol_bioavail', 'src_resveratrol_cohort'],
      learn_more: { title: 'The Resveratrol Paradox: Why You Are Excreting 99% of Your Longevity Supplement', href: `${BLOG}/resveratrol-brick-dust-paradox/` },
    },
  ],
  keep: [
    {
      compound: 'Berberine',
      note:
        'Your current intake of 1,000 mg/day sits within the range used in human research (900–1,500 mg). Evidence is strong for this compound.',
      monthly_cost: 22,
      evidence_tier: 'A',
      outcome_mismatch_note: null,
      tier_rationale: 'Supported by a meta-analysis of 27 randomized controlled human trials.',
      last_reviewed: REV_DATE,
      reviewer_name: REV,
      source_ids: ['src_berberine_meta_2015', 'src_berberine_vs_metformin'],
      learn_more: { title: 'Berberine vs Metformin: 5 Critical Differences a Chemist Actually Cares About', href: `${BLOG}/berberine-vs-metformin/` },
    },
    {
      compound: 'TMG (Trimethylglycine)',
      note:
        'Your intake of 1,000 mg is within the studied range. TMG supports methylation, relevant if you also take NMN.',
      monthly_cost: 9,
      evidence_tier: 'B',
      outcome_mismatch_note: null,
      tier_rationale: 'A clinical trial found effects on homocysteine at this dose range.',
      last_reviewed: REV_DATE,
      reviewer_name: REV,
      source_ids: ['src_tmg_rct'],
      learn_more: { title: 'TMG vs Methylfolate: Molecular Side-by-Side Matrix', href: `${BLOG}/tmg-vs-methylfolate/` },
    },
  ],
  // Legacy per-compound start rows are superseded by start_section (below).
  start: [],
  // Affiliate Start section — mirrors what the firewalled affiliate-engine returns for this
  // sample stack (Berberine, TMG, NR, Resveratrol present; TMG makes the bundles relevant).
  // Excluded/ambiguous items (partiQlar NR, unitemized bundles) are intentionally absent.
  start_section: {
    tier1: [
      {
        compound_id: 'cmp_berberine',
        compound: 'Berberine',
        evidence_tier: 'A',
        products: [
          { brand: 'NMNBio', product: 'Berberine 400mg with Milk Thistle', href: `${BLOG}/go/nmnbio-berberine` },
          { brand: 'Renue by Science', product: 'Berberine (Liposomal)', href: `${BLOG}/go/renue-berberine` },
        ],
      },
      {
        compound_id: 'cmp_tmg',
        compound: 'TMG (Trimethylglycine)',
        evidence_tier: 'B',
        products: [
          { brand: 'NMNBio', product: 'TMG 500mg, 90 Capsules', href: `${BLOG}/go/nmnbio-tmg` },
          { brand: 'Renue by Science', product: 'TMG Methylation Essentials', href: `${BLOG}/go/renue-tmg` },
        ],
      },
      {
        compound_id: 'cmp_nr',
        compound: 'NR (Nicotinamide Riboside)',
        evidence_tier: 'B',
        products: [
          { brand: 'Renue by Science', product: 'NR Powder Smooth Taste Blend', href: `${BLOG}/go/renue-nrpowder` },
          { brand: 'Genuine Purity', product: 'Liposomal NR', href: `${BLOG}/go/genuinepurity-nr` },
        ],
      },
      {
        compound_id: 'cmp_resveratrol',
        compound: 'Resveratrol',
        evidence_tier: 'C',
        products: [
          { brand: 'Renue by Science', product: 'Trans-Resveratrol (Liposomal)', href: `${BLOG}/go/renue-trans-resveratrol` },
          { brand: 'Genuine Purity', product: 'Liposomal Trans-Resveratrol', href: `${BLOG}/go/gen-trans-reservatrol` },
          { brand: 'partiQlar', product: 'Pure Resveratrol, 60 Capsules', href: `${BLOG}/go/partiQlar_Resveratrol` },
        ],
      },
    ],
    tier2: [
      { brand: 'Renue by Science', product: 'CaAKG (Liposomal)', href: `${BLOG}/go/renue-CaAKG`, category: 'CaAKG' },
      { brand: 'Renue by Science', product: 'Quercetin (Liposomal)', href: `${BLOG}/go/renue-Quercetin`, category: 'Quercetin' },
      { brand: 'partiQlar', product: 'Pure Spermidine, 60 Capsules', href: `${BLOG}/go/partiQlar_Spermidine`, category: 'Spermidine' },
      { brand: 'Calocurb', product: 'Calocurb GLP-1 Activator', href: `${BLOG}/go/calocurb`, category: 'GLP-1 (not a reviewed compound)' },
      { brand: 'Jinfiniti', product: 'Ultimate Longevity Panel (CLIA-certified testing)', href: `${BLOG}/go/jinfiniti-ultimate`, category: 'Diagnostic testing, not a supplement' },
      { brand: 'Jinfiniti', product: 'NAD Dosing Protocol ($396 offer)', href: `${BLOG}/go/jinfiniti-dosing-prot`, category: 'Diagnostic testing, not a supplement' },
      { brand: 'Jinfiniti', product: 'NAD Membership Program (15% recurring)', href: `${BLOG}/go/jinfiniti-nad-memebrship`, category: 'Membership/discount program' },
    ],
    tier3: [
      { brand: 'NMNBio', product: 'Longevity Starter Pack', href: `${BLOG}/go/nmnbio-long-starterpack`, contains: 'NMN, TMG, and Quercetin' },
      { brand: 'NMNBio', product: 'Morning Bundle', href: `${BLOG}/go/nmnbio-morning`, contains: 'NMN, TMG, and NAD+ Brain (a proprietary blend)' },
    ],
  },
  // Article cross-links — mirrors what the firewalled article-engine returns for this sample
  // stack (NR, Resveratrol, Berberine, TMG). Educational articles are grouped per compound and
  // may render anywhere; roundups are Start-section-only; hubs are general, never per-compound.
  // Excluded compounds (Urolithin A, Spermidine, Fisetin, Quercetin, AKG, p-Synephrine) and the
  // non-single-compound roundups never appear here, exactly as in the real output.
  article_links: {
    related_reading: [
      {
        compound_id: 'cmp_nr',
        compound: 'NR (Nicotinamide Riboside)',
        articles: [
          { title: 'NMN vs NR: Which NAD+ Precursor Actually Wins?', href: `${BLOG}/nmn-vs-nr-nad-precursor/` },
          { title: 'The Salvage Pathway: Why Your Body Recycles NAD+', href: `${BLOG}/nad-salvage-pathway/` },
          { title: 'NAD+ and Longevity: What This Molecule Actually Does to Your Cells', href: `${BLOG}/nad-longevity-molecule/` },
        ],
      },
      {
        compound_id: 'cmp_resveratrol',
        compound: 'Resveratrol',
        articles: [
          { title: 'The Resveratrol Paradox: Why You Are Excreting 99% of Your Longevity Supplement', href: `${BLOG}/resveratrol-brick-dust-paradox/` },
        ],
      },
      {
        compound_id: 'cmp_berberine',
        compound: 'Berberine',
        articles: [
          { title: 'Berberine vs Metformin: 5 Critical Differences a Chemist Actually Cares About', href: `${BLOG}/berberine-vs-metformin/` },
          { title: 'Why Your Berberine Isn\u2019t Working \u2014 And What Dihydroberberine Actually Does', href: `${BLOG}/dihydroberberine-vs-berberine/` },
        ],
      },
      {
        compound_id: 'cmp_tmg',
        compound: 'TMG (Trimethylglycine)',
        articles: [
          { title: 'TMG vs Methylfolate: Molecular Side-by-Side Matrix', href: `${BLOG}/tmg-vs-methylfolate/` },
          { title: 'Methylation Supplements: The Biochemist\u2019s Complete Guide', href: `${BLOG}/methylation-supplements-guide/` },
          { title: 'TMG and Methylation: Why You Need It With NMN', href: `${BLOG}/tmg-supplement-methylation-nmn/` },
          { title: 'MTHFR Supplement Protocol: Chemist\u2019s Quick Verdict', href: `${BLOG}/mthfr-supplement-protocol/` },
        ],
      },
    ],
    start_roundups: [
      {
        compound_id: 'cmp_nr',
        compound: 'NR (Nicotinamide Riboside)',
        articles: [
          { title: 'Best NR Supplements 2026', href: `${BLOG}/best-nr-supplements-2026/` },
          { title: 'Best NAD+ Supplements 2026', href: `${BLOG}/5-best-nad-supplements-2026/` },
        ],
      },
      {
        compound_id: 'cmp_resveratrol',
        compound: 'Resveratrol',
        articles: [
          { title: 'Best Resveratrol Supplements 2026', href: `${BLOG}/best-resveratrol-supplements-2026/` },
        ],
      },
      {
        compound_id: 'cmp_berberine',
        compound: 'Berberine',
        articles: [
          { title: 'Best Berberine Supplements 2026', href: `${BLOG}/best-berberine-supplements-2026/` },
        ],
      },
      {
        compound_id: 'cmp_tmg',
        compound: 'TMG (Trimethylglycine)',
        articles: [
          { title: 'Best TMG Supplement 2026', href: `${BLOG}/best-tmg-supplement-2026/` },
          { title: 'Best Methylation Supplement Stack 2026', href: `${BLOG}/best-methylation-supplement-2026/` },
        ],
      },
    ],
    hubs: [
      { title: 'NAD+ Precursors: The Biochemist\u2019s Complete Guide', href: `${BLOG}/nad-precursors/`, relevance: 'NMN + NR' },
      { title: 'Methylation Supplements: The Biochemist\u2019s Analysis', href: `${BLOG}/methylation/`, relevance: 'TMG' },
      { title: 'Longevity Compounds: Molecular Analysis by a Chemist', href: `${BLOG}/longevity-compounds/`, relevance: 'General' },
      { title: 'Supplement Delivery Systems: Bioavailability Decoded', href: `${BLOG}/delivery-systems/`, relevance: 'General' },
    ],
    learn_more: {
      cmp_nr: { title: 'NMN vs NR: Which NAD+ Precursor Actually Wins?', href: `${BLOG}/nmn-vs-nr-nad-precursor/` },
      cmp_resveratrol: { title: 'The Resveratrol Paradox: Why You Are Excreting 99% of Your Longevity Supplement', href: `${BLOG}/resveratrol-brick-dust-paradox/` },
      cmp_berberine: { title: 'Berberine vs Metformin: 5 Critical Differences a Chemist Actually Cares About', href: `${BLOG}/berberine-vs-metformin/` },
      cmp_tmg: { title: 'TMG vs Methylfolate: Molecular Side-by-Side Matrix', href: `${BLOG}/tmg-vs-methylfolate/` },
    },
  },
  // §4e: a plain list, no tier, no cost, no purchase link. Present in the fixture so the
  // sample report renders the block rather than leaving it untested by every visual pass.
  not_yet_reviewed: {
    heading: 'Not yet reviewed',
    description:
      "We recognize these compounds, but our evidence review hasn't reached them yet — so they aren't scored.",
    compounds: [{ compound_id: 'cmp_creatine', compound: 'Creatine' }],
  },
  total_estimated_annual_waste: { low: 340, high: 520 },
  coverage_note: 'This score covers 4 of the 5 compounds you entered.',
};
