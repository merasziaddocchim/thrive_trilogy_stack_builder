// Build the TECH_DOCS §6 API response shapes (preview + report) from scoring-engine output.
// Pure and testable — no DB, no I/O. Every stop/keep claim object is passed through the
// claim-guard (CLAIMS §4) before it leaves here, and all finding text comes from the §9
// claim templates (never freehand).
//
// FLAGGED — categorization heuristic: the Stop/Keep/Start split is product logic that the
// governing docs describe by intent ("Stop = redundant/underdosed/unverifiable") but do not
// specify as an exact rule. The rule below is a reasonable first implementation, marked for
// founder review. "Start" (new-compound suggestions + affiliate links) is intentionally
// EMPTY here: it is the job of the separate recommendation/affiliate layer (firewalled from
// scoring), which is not built yet.
import { assertClaimCompliant } from '../../compliance/claim-guard.js';
import {
  tierLetter,
  doseComparison,
  withinRangeNote,
  preliminaryDoseNote,
  redundancyFlag,
  recognizedSummary,
  type TierLetter,
} from '../../compliance/claim-templates.js';
import type { ScoredCompoundInput, CompoundSubScore, StackScoreResult } from '../../scoring-engine/index.js';
// Type-only import — the Start section is COMPUTED by the affiliate-engine in assessment-service
// and passed in; report-builder only places it into the response shape (no affiliate logic here).
import type { StartSection } from '../../affiliate-engine/index.js';
// Same arrangement for article links: COMPUTED by the firewalled article-engine in
// assessment-service and passed in. report-builder only places them — it attaches the
// per-compound educational "Learn more" link to Stop/Keep rows (safe anywhere, no disclosure
// needed, CLAIMS §6) and carries the rest through. Roundups are never touched here: they belong
// to the Start section only, which is exactly the placement rule this file must not break.
import type { ArticleLinks, Article } from '../../article-engine/index.js';

export interface CompoundContext {
  input: ScoredCompoundInput;
  sub: CompoundSubScore;
  isRedundant: boolean;
  tierRationale: string;
  lastReviewed: string; // ISO date
  reviewerName: string;
  sourceShortName: string;
  /** Signed % of effective dose vs studied range (negative = below). 0 when within/unknown. */
  percentDelta: number;
  /**
   * CLAIMS_COMPLIANCE §4b disclosure, or null when the outcome matched. Computed once in
   * assessment-service (the only place that knows the user's stated goal) and carried here so
   * every surface renders the identical sentence rather than each deriving its own.
   */
  outcomeMismatchNote: string | null;
}

export interface OverlapGroup {
  sharedIngredient: string;
  productCount: number;
  approxMonthlyCost: number;
}

// ---- Preview (GET /assessment/:id/preview) ----------------------------------
// A compound the parser matched to the database, whether or not the user gave a dose.
// Recognition is separate from scorability: we recognize a compound as soon as it matches
// (so it shows in the Preview), but we can only SCORE it once a dose is also present.
export interface RecognizedCompound {
  compound_id: string;
  canonical_name: string;
  evidence_tier: TierLetter;
  /**
   * §4b: null unless this compound's Evidence Tier was established for an outcome other than
   * the user's stated priority. The tier badge is one of the two things §4b names, so the
   * disclosure has to travel with it.
   */
  outcome_mismatch_note: string | null;
}

export interface PreviewResponse {
  sufficient_for_scoring: boolean;
  recognized_compounds: RecognizedCompound[];
  evidence_tier_summary: Record<TierLetter, number>;
  overlap_flags: Array<{ shared_ingredient: string; product_count: number; approx_monthly_cost: number | null }>;
  spend_efficiency_index: number | null;
  estimated_annual_waste: { low: number; high: number } | null;
  headline_finding: string;
  dose_comparisons: Array<{
    compound: string;
    evidence_tier: TierLetter;
    user_dose: { amount: number; unit: string };
    studied_range: { low: number; high: number; unit: string };
    percent_delta: number;
    source_short_name: string;
    /** §4b: the dose range is the other of the two things the disclosure covers. */
    outcome_mismatch_note: string | null;
  }>;
}

function tierSummary(recognized: RecognizedCompound[]): Record<TierLetter, number> {
  const summary: Record<TierLetter, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const r of recognized) summary[r.evidence_tier] += 1;
  return summary;
}

function isTierAB(t: TierLetter): boolean {
  return t === 'A' || t === 'B';
}

export function buildPreview(
  // Every matched compound (dose or not) — drives recognized_compounds + tier summary.
  recognized: RecognizedCompound[],
  // Only the scorable (dosed) compounds — drives dose comparisons + SEI/waste.
  contexts: CompoundContext[],
  result: StackScoreResult,
  overlaps: OverlapGroup[],
  opts: { sufficientForScoring: boolean },
): PreviewResponse {
  const sufficient = opts.sufficientForScoring;

  const doseComparisons = sufficient
    ? contexts
        .filter(
          (c) =>
            isTierAB(tierLetter(c.input.evidenceTier)) &&
            c.input.rangeLowMg != null &&
            c.input.rangeHighMg != null,
        )
        .slice(0, 2)
        .map((c) => ({
          compound: c.input.canonicalName,
          evidence_tier: tierLetter(c.input.evidenceTier),
          user_dose: { amount: c.input.labelDoseMg, unit: 'mg' },
          studied_range: { low: c.input.rangeLowMg as number, high: c.input.rangeHighMg as number, unit: 'mg' },
          percent_delta: c.percentDelta,
          source_short_name: c.sourceShortName,
          outcome_mismatch_note: c.outcomeMismatchNote,
        }))
    : [];

  // Headline must be a §9 template. Prefer a redundancy finding when one exists and its cost
  // is known; otherwise a neutral recognized-count statement (never a fabricated number).
  const costedOverlap = overlaps.find((o) => o.approxMonthlyCost > 0);
  const headline =
    costedOverlap != null
      ? redundancyFlag({
          productCount: costedOverlap.productCount,
          sharedIngredient: costedOverlap.sharedIngredient,
          monthlyCost: costedOverlap.approxMonthlyCost,
        })
      : recognizedSummary(recognized.length);

  return {
    sufficient_for_scoring: sufficient,
    recognized_compounds: recognized,
    evidence_tier_summary: tierSummary(recognized),
    overlap_flags: overlaps.map((o) => ({
      shared_ingredient: o.sharedIngredient,
      product_count: o.productCount,
      approx_monthly_cost: o.approxMonthlyCost,
    })),
    spend_efficiency_index: sufficient ? result.compositeScore : null,
    estimated_annual_waste: sufficient
      ? { low: result.waste.annualLow, high: result.waste.annualHigh }
      : null,
    headline_finding: headline,
    dose_comparisons: doseComparisons,
  };
}

// ---- Report (GET /assessment/:id/report) ------------------------------------
interface EvidenceMeta {
  evidence_tier: TierLetter;
  tier_rationale: string;
  last_reviewed: string;
  reviewer_name: string;
  source_ids: string[];
  /** §4b disclosure for this row, or null when the outcome matched. */
  outcome_mismatch_note: string | null;
}

/** Educational "further reading" link on a Stop/Keep row. Never a roundup (CLAIMS §6). */
type LearnMore = { learn_more?: Article };

export interface ReportResponse {
  composite_score: number;
  safety_flag: boolean | null;
  stop: Array<EvidenceMeta & LearnMore & { compound: string; reason: string; est_monthly_waste: number }>;
  keep: Array<EvidenceMeta & LearnMore & { compound: string; note: string; monthly_cost: number }>;
  /** Legacy per-compound "start" suggestions (unused; superseded by start_section). */
  start: Array<EvidenceMeta & { compound: string; reason: string; affiliate_link?: null }>;
  /** Affiliate "Start" section — Tier 1/2/3 products (firewalled affiliate-engine output). */
  start_section: StartSection;
  /** Article cross-links (firewalled article-engine output). Roundups are Start-only. */
  article_links: ArticleLinks;
  total_estimated_annual_waste: { low: number; high: number };
}

function meta(c: CompoundContext): EvidenceMeta {
  const m: EvidenceMeta = {
    evidence_tier: tierLetter(c.input.evidenceTier),
    tier_rationale: c.tierRationale,
    last_reviewed: c.lastReviewed,
    reviewer_name: c.reviewerName,
    source_ids: c.input.contributingSourceIds,
    outcome_mismatch_note: c.outcomeMismatchNote,
  };
  // CLAIMS §4 hard gate: refuse to emit a claim object missing tier or sources.
  assertClaimCompliant({ evidenceTier: c.input.evidenceTier, sourceIds: c.input.contributingSourceIds }, c.input.canonicalName);
  return m;
}

function reasonFor(c: CompoundContext): string {
  const tier = tierLetter(c.input.evidenceTier);
  if (isTierAB(tier) && c.input.rangeLowMg != null && c.input.rangeHighMg != null) {
    return doseComparison({
      compound: c.input.canonicalName,
      amount: c.input.labelDoseMg,
      unit: 'mg',
      percent: c.percentDelta,
      rangeLow: c.input.rangeLowMg,
      rangeHigh: c.input.rangeHighMg,
      sourceShortName: c.sourceShortName,
    });
  }
  // Tier C/D or no interpretable range → hedged, no dose-adequacy verdict.
  return preliminaryDoseNote(c.input.canonicalName, c.input.labelDoseMg, 'mg');
}

export function buildReport(
  contexts: CompoundContext[],
  result: StackScoreResult,
  startSection: StartSection,
  articleLinks: ArticleLinks,
): ReportResponse {
  const stop: ReportResponse['stop'] = [];
  const keep: ReportResponse['keep'] = [];

  // Educational link for this compound's row, if the founder's mapping has one. Educational
  // articles are the ONLY kind allowed here (CLAIMS §6): a roundup in a Stop/Keep row would
  // blur the independence claim the same way a paid ranking would.
  const learnMoreFor = (compoundId: string): LearnMore => {
    const a = articleLinks.learn_more[compoundId];
    return a ? { learn_more: a } : {};
  };

  for (const c of contexts) {
    const tier = tierLetter(c.input.evidenceTier);
    const wellDosed = c.sub.withinStudiedRange === true;
    const verifiable = isTierAB(tier) && c.input.rangeLowMg != null;

    if (c.isRedundant) {
      stop.push({
        compound: c.input.canonicalName,
        reason: reasonFor(c),
        est_monthly_waste: round2(c.input.dollarsSpent),
        ...meta(c),
        ...learnMoreFor(c.input.compoundId),
      });
    } else if (wellDosed && verifiable) {
      keep.push({
        compound: c.input.canonicalName,
        note:
          c.input.rangeLowMg != null && c.input.rangeHighMg != null
            ? withinRangeNote({
                compound: c.input.canonicalName,
                amount: c.input.labelDoseMg,
                unit: 'mg',
                rangeLow: c.input.rangeLowMg,
                rangeHigh: c.input.rangeHighMg,
              })
            : reasonFor(c),
        monthly_cost: round2(c.input.dollarsSpent),
        ...meta(c),
        ...learnMoreFor(c.input.compoundId),
      });
    } else {
      // Underdosed/overdosed, or unverifiable (Tier C/D / no range) → Stop.
      const shortfall = (100 - c.sub.dosingAccuracy) / 100;
      stop.push({
        compound: c.input.canonicalName,
        reason: reasonFor(c),
        est_monthly_waste: round2(c.input.dollarsSpent * shortfall),
        ...meta(c),
        ...learnMoreFor(c.input.compoundId),
      });
    }
  }

  return {
    composite_score: result.compositeScore,
    safety_flag: result.safetyFlag,
    stop,
    keep,
    start: [], // legacy field retained for the §6 contract; superseded by start_section.
    start_section: startSection, // from the firewalled affiliate-engine (see assessment-service).
    article_links: articleLinks, // from the firewalled article-engine (see assessment-service).
    total_estimated_annual_waste: { low: result.waste.annualLow, high: result.waste.annualHigh },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
