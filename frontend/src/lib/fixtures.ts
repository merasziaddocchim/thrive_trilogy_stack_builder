// =============================================================================
// FIXTURES — mock data ONLY. Shaped exactly to the TECH_DOCS §6 API contract and
// the §1a intake-parser plan. When the real backend exists, delete this file and
// point mock-api.ts at the live endpoints — nothing else should need to change
// (prompt §10.7). Every export here is prefixed `FIXTURE_` so its provenance is
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
    confidence: 'low',
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
  },
  {
    clientId: 'x6',
    rawText: 'some kind of spermidine, not sure of the dose',
    canonicalName: 'Spermidine',
    compoundId: 'cmp_spermidine',
    dose: null,
    deliveryFormat: null,
    monthlyPrice: null,
    confidence: 'low',
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
  },
];

// ---- PREVIEW — STATE A: sufficient data recognized (prompt §5) --------------
// Shown only when the user supplied enough (recognized compounds + monthly spend).
export const FIXTURE_PREVIEW_STATE_A: PreviewResponse = {
  sufficient_for_scoring: true,
  recognized_compounds: [
    { compound_id: 'cmp_nmn', canonical_name: 'NMN (Nicotinamide Mononucleotide)', evidence_tier: 'B' },
    { compound_id: 'cmp_nr', canonical_name: 'NR (Nicotinamide Riboside)', evidence_tier: 'B' },
    { compound_id: 'cmp_resveratrol', canonical_name: 'Resveratrol', evidence_tier: 'C' },
    { compound_id: 'cmp_tmg', canonical_name: 'TMG (Trimethylglycine)', evidence_tier: 'B' },
    { compound_id: 'cmp_berberine', canonical_name: 'Berberine', evidence_tier: 'A' },
    { compound_id: 'cmp_spermidine', canonical_name: 'Spermidine', evidence_tier: 'C' },
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
      user_dose: { amount: 250, unit: 'mg' },
      studied_range: { low: 300, high: 500, unit: 'mg' },
      percent_delta: -17, // below studied range
      source_short_name: 'Yoshino 2021',
    },
    {
      compound: 'Berberine',
      evidence_tier: 'A',
      user_dose: { amount: 1000, unit: 'mg' },
      studied_range: { low: 900, high: 1500, unit: 'mg' },
      percent_delta: 0, // within range
      source_short_name: 'Meta-analysis, 27 RCTs',
    },
  ],
};

// ---- PREVIEW — STATE B: insufficient data for full scoring (prompt §5) ------
// The common V1 case: compounds recognized, but no monthly spend given, so NO SEI and
// NO Annual Waste are fabricated. Financial fields are null; the UI shows a nudge.
export const FIXTURE_PREVIEW_STATE_B: PreviewResponse = {
  sufficient_for_scoring: false,
  recognized_compounds: [
    { compound_id: 'cmp_nmn', canonical_name: 'NMN (Nicotinamide Mononucleotide)', evidence_tier: 'B' },
    { compound_id: 'cmp_resveratrol', canonical_name: 'Resveratrol', evidence_tier: 'C' },
    { compound_id: 'cmp_tmg', canonical_name: 'TMG (Trimethylglycine)', evidence_tier: 'B' },
    { compound_id: 'cmp_spermidine', canonical_name: 'Spermidine', evidence_tier: 'C' },
  ],
  evidence_tier_summary: { A: 0, B: 2, C: 2, D: 0 },
  overlap_flags: [],
  spend_efficiency_index: null,
  estimated_annual_waste: null,
  headline_finding:
    'We recognized 4 compounds in your stack and matched each to an evidence tier.',
  dose_comparisons: [],
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
      tier_rationale: 'A single human RCT supports NR at this dose range.',
      last_reviewed: REV_DATE,
      reviewer_name: REV,
      source_ids: ['src_nr_rct_2018', 'src_nad_salvage_review'],
    },
    {
      compound: 'Resveratrol',
      reason:
        'Preliminary research on resveratrol has used a range of doses; human clinical data on optimal dosing is not yet available. At a liposomal "1 scoop" serving, the delivered dose could not be interpreted, so its contribution to your stack cannot be verified.',
      est_monthly_waste: 18,
      evidence_tier: 'C',
      tier_rationale: 'Observational and animal data with mechanistic plausibility; not yet confirmed in human trials.',
      last_reviewed: REV_DATE,
      reviewer_name: REV,
      source_ids: ['src_resveratrol_bioavail', 'src_resveratrol_cohort'],
    },
  ],
  keep: [
    {
      compound: 'Berberine',
      note:
        'Your current intake of 1,000 mg/day sits within the range used in human research (900–1,500 mg). Evidence is strong for this compound.',
      monthly_cost: 22,
      evidence_tier: 'A',
      tier_rationale: 'Supported by a meta-analysis of 27 randomized controlled human trials.',
      last_reviewed: REV_DATE,
      reviewer_name: REV,
      source_ids: ['src_berberine_meta_2015', 'src_berberine_vs_metformin'],
    },
    {
      compound: 'TMG (Trimethylglycine)',
      note:
        'Your intake of 1,000 mg is within the studied range. TMG supports methylation, relevant if you also take NMN.',
      monthly_cost: 9,
      evidence_tier: 'B',
      tier_rationale: 'A clinical trial found effects on homocysteine at this dose range.',
      last_reviewed: REV_DATE,
      reviewer_name: REV,
      source_ids: ['src_tmg_rct'],
    },
  ],
  start: [
    {
      compound: 'NMN — consider adjusting toward the studied range',
      reason:
        'Your current intake of NMN is 250 mg — 17% below the range used in human research (300–500 mg), based on Yoshino 2021. If you keep NMN as your NAD+ precursor, moving toward the studied range may better match the evidence.',
      evidence_tier: 'B',
      tier_rationale: 'A single human RCT supports NMN in this range.',
      last_reviewed: REV_DATE,
      reviewer_name: REV,
      source_ids: ['src_nmn_rct_2021'],
      // Educational article — functionally a citation, no disclosure needed
      // (CLAIMS_COMPLIANCE §6). Illustrative internal path.
      educational_link: { href: 'https://thrivetrilogy.com/nmn-dosing-protocol', label: 'NMN Dosing Protocol Guide' },
      affiliate_link: null,
    },
    {
      compound: 'Urolithin A',
      reason:
        'Not currently in your stack. A clinical trial found effects on mitochondrial markers at studied doses. Consider whether it fits your priority before adding.',
      evidence_tier: 'B',
      tier_rationale: 'A single human RCT supports Urolithin A at the studied dose.',
      last_reviewed: REV_DATE,
      reviewer_name: REV,
      source_ids: ['src_urolithin_rct'],
      // Affiliate link → REQUIRES per-link disclosure rendered immediately adjacent.
      affiliate_link: { href: 'https://example-partner.com/urolithin-a', label: 'View a reviewed Urolithin A option' },
      educational_link: null,
    },
  ],
  total_estimated_annual_waste: { low: 340, high: 520 },
};
