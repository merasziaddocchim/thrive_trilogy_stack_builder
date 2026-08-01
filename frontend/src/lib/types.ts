// Types mirroring the API contract in TECH_DOCS §6 (and the intake-parser plan in §1a).
// The eventual real backend must satisfy these shapes so swapping the mock API for the
// live one is a drop-in change, not a rebuild (prompt §10.7).
import type { GoalTag } from './goals';

export type EvidenceTier = 'A' | 'B' | 'C' | 'D';

// ---- Intake parsing (TECH_DOCS §1a) -----------------------------------------
// An LLM extracts candidate compound + dose + price from the free-text field and
// fuzzy/semantic-matches against compounds.canonical_name / aliases. Each match
// carries a confidence; low-confidence matches are surfaced for user confirmation.
export type MatchConfidence = 'high' | 'low' | 'unmatched';

/**
 * How complete the dose is — INDEPENDENT of MatchConfidence (CLAIMS_COMPLIANCE §4b).
 * Mirrors backend/src/intake-parser/types.ts.
 *   explicit — the user supplied a unit.
 *   assumed  — a bare number resolved via the compound's stored default unit. Must be shown.
 *   missing  — no number, or no default unit available. Nothing is invented.
 */
export type DoseState = 'explicit' | 'assumed' | 'missing';

export interface ExtractedItem {
  /** Client-side id for list editing; not a DB id. */
  clientId: string;
  /** Raw span the user typed that produced this candidate. */
  rawText: string;
  /** Canonical compound name the extractor matched to, if any. */
  canonicalName: string | null;
  /** Matched compound_id from the compounds table, if resolved. */
  compoundId: string | null;
  dose: { amount: number; unit: string } | null;
  deliveryFormat: DeliveryFormat | null;
  /** Approx price paid per month, if the user supplied it. */
  monthlyPrice: number | null;
  /** Whether the compound was recognized. Says nothing about the dose. */
  confidence: MatchConfidence;
  /** Whether the dose is complete. Says nothing about the match. */
  doseState: DoseState;
  /** True when the user (not the extractor) created or edited this row. */
  userEdited?: boolean;
}

export type DeliveryFormat =
  | 'standard_capsule'
  | 'liposomal'
  | 'sublingual'
  | 'powder'
  | 'injectable';

// ---- Assessment intake payload (POST /assessment) ---------------------------
export interface AssessmentPayload {
  stack_items: Array<{
    compound_id: string | null;
    canonical_name: string | null;
    dose: { amount: number; unit: string } | null;
    delivery_format: DeliveryFormat | null;
    monthly_price: number | null;
  }>;
  user_profile: {
    /** A canonical goal tag (lib/goals.ts) or null — NEVER a display label. */
    priority_goal: GoalTag | null;
    routine: { diet: string | null; activity: string | null; sleep: string | null };
    monthly_spend: { low: number; high: number } | null;
    audit_focus: string | null;
    safety_flag: 'yes' | 'no' | 'prefer_not_to_say' | null;
  };
}

// ---- GET /assessment/{id}/preview (free, pre-email) -------------------------
export interface RecognizedCompound {
  compound_id: string;
  canonical_name: string;
  evidence_tier: EvidenceTier;
  /** CLAIMS_COMPLIANCE §4c disclosure, or null when the outcome matched. */
  outcome_mismatch_note: string | null;
}

export interface OverlapFlag {
  shared_ingredient: string;
  product_count: number;
  approx_monthly_cost: number | null;
}

// State A vs State B (prompt §5) is expressed by `sufficient_for_scoring`.
export interface PreviewResponse {
  sufficient_for_scoring: boolean;
  recognized_compounds: RecognizedCompound[];
  evidence_tier_summary: Record<EvidenceTier, number>;
  overlap_flags: OverlapFlag[];
  /**
   * Present ONLY when sufficient_for_scoring is true. Never fabricate these in
   * State B — the UI must not imply a calculated financial number exists.
   */
  spend_efficiency_index: number | null;
  estimated_annual_waste: { low: number; high: number } | null;
  /** Built from a CLAIMS_COMPLIANCE §9 template — never freehand text. */
  headline_finding: string;
  /** One or two dose-vs-range comparisons, Tier A/B only (prompt §5 State A). */
  dose_comparisons: DoseComparison[];
}

export interface DoseComparison {
  compound: string;
  evidence_tier: EvidenceTier;
  user_dose: { amount: number; unit: string };
  studied_range: { low: number; high: number; unit: string };
  percent_delta: number; // signed; negative = below studied range
  source_short_name: string;
  /** CLAIMS_COMPLIANCE §4c disclosure, or null when the outcome matched. */
  outcome_mismatch_note: string | null;
}

// ---- GET /assessment/{id}/report (post email-capture) -----------------------
export interface EvidenceMeta {
  evidence_tier: EvidenceTier;
  tier_rationale: string;
  last_reviewed: string; // ISO date
  reviewer_name: string;
  source_ids: string[];
  /** CLAIMS_COMPLIANCE §4c disclosure, or null when the outcome matched. */
  outcome_mismatch_note: string | null;
}

// ---- Article cross-links (firewalled article-engine output) -----------------
// Placement is a compliance boundary, not a style choice (CLAIMS_COMPLIANCE §6 extension,
// applied in BRAND_GUIDELINES §8):
//   educational → anywhere, incl. Stop/Keep rows and Evidence Tier content. No disclosure.
//   roundup     → Start section ONLY, with per-link disclosure.
//   hub pages   → general placement only, never a per-compound slot.
// Every href is absolute on thrivetrilogy.com (a different subdomain from this app), so links
// render with target="_blank" rel="noopener noreferrer".
export interface ArticleLink {
  title: string;
  href: string;
  /** Marks the best Stop/Keep-row candidate for a compound; not used for rendering order. */
  primary?: boolean;
}

export interface ArticleGroup {
  compound_id: string;
  compound: string;
  articles: ArticleLink[];
}

export interface HubPage {
  title: string;
  href: string;
  relevance: string;
}

export interface ArticleLinks {
  /** Educational, per compound — safe to render anywhere in the Report. */
  related_reading: ArticleGroup[];
  /** Roundups, per compound — Start section ONLY, per-link disclosure required. */
  start_roundups: ArticleGroup[];
  /** General pillar pages — never rendered inside a per-compound slot. */
  hubs: HubPage[];
  /** compound_id → the single educational "Learn more" link for that compound's row. */
  learn_more: Record<string, ArticleLink>;
}

export interface StopRow extends EvidenceMeta {
  compound: string;
  reason: string;
  est_monthly_waste: number;
  /** Educational further-reading link. Never a roundup (CLAIMS_COMPLIANCE §6). */
  learn_more?: ArticleLink;
}

/**
 * CLAIMS_COMPLIANCE §4d — the compound is supported, the amount is not the amount studied.
 * Carries `monthly_cost`, not a waste figure: the section says the compound is worth keeping,
 * so labelling its spend "waste" on the row would contradict the section it sits in. The
 * shortfall still counts toward Estimated Annual Waste, shown at the top of the report.
 */
export interface AdjustRow extends EvidenceMeta {
  compound: string;
  reason: string;
  monthly_cost: number;
  /** Educational further-reading link. Never a roundup (CLAIMS_COMPLIANCE §6). */
  learn_more?: ArticleLink;
}

export interface KeepRow extends EvidenceMeta {
  compound: string;
  note: string;
  monthly_cost: number;
  /** Educational further-reading link. Never a roundup (CLAIMS_COMPLIANCE §6). */
  learn_more?: ArticleLink;
}

export interface StartRow extends EvidenceMeta {
  compound: string;
  reason: string;
  /** Affiliate link is optional; when present the UI MUST render per-link disclosure. */
  affiliate_link?: { href: string; label: string } | null;
  /** Educational article link — no disclosure needed (CLAIMS_COMPLIANCE §6). */
  educational_link?: { href: string; label: string } | null;
}

// ---- Affiliate "Start" section (firewalled affiliate-engine output) ---------
export interface StartProduct {
  brand: string;
  product: string;
  href: string; // existing thrivetrilogy.com /go/ cloaked redirect — used verbatim
}
// Tier 1: an evidence-reviewed compound in the stack + its product options. The tier reflects
// the COMPOUND (already established), never the product/brand.
export interface StartTier1Group {
  compound_id: string;
  compound: string;
  evidence_tier: EvidenceTier;
  products: StartProduct[];
}
// Tier 2: "Also available" — NOT evidence-scored, no tier badge.
export interface StartTier2Item extends StartProduct {
  category: string;
}
// Tier 3: a bundle relevant to the stack; not evidence-scored, contents noted for relevance.
export interface StartBundle extends StartProduct {
  contains: string;
}
export interface StartSectionData {
  tier1: StartTier1Group[];
  tier2: StartTier2Item[];
  tier3: StartBundle[];
}

export interface ReportResponse {
  composite_score: number; // Spend Efficiency Index, 0–100
  safety_flag: boolean | null;
  stop: StopRow[];
  /** §4d, rendered BETWEEN Stop and Keep. */
  adjust: AdjustRow[];
  keep: KeepRow[];
  /** Legacy per-compound start rows (unused; superseded by start_section). */
  start: StartRow[];
  /** Affiliate Start section — Tier 1/2/3 products. */
  start_section: StartSectionData;
  /** Article cross-links — educational (anywhere), roundups (Start only), hubs (general). */
  article_links: ArticleLinks;
  total_estimated_annual_waste: { low: number; high: number };
}
