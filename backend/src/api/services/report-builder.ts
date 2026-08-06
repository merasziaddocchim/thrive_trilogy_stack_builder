// Build the TECH_DOCS §6 API response shapes (preview + report) from scoring-engine output.
// Pure and testable — no DB, no I/O. Every stop/keep claim object is passed through the
// claim-guard (CLAIMS §4) before it leaves here, and all finding text comes from the §9
// claim templates (never freehand).
//
// SECTION ROUTING is no longer decided here. It is CLAIMS_COMPLIANCE §4d, implemented once in
// compliance/finding-routing.ts, because which section a finding lands in is itself a claim.
// The heuristic this file used to carry ("Stop = redundant/underdosed/unverifiable") was the
// flagged placeholder §4d replaces: it had no Adjust, so an underdosed Tier A compound and a
// well-dosed Tier C compound both landed in Stop. "Start" (new-compound suggestions +
// affiliate links) remains intentionally EMPTY in the legacy `start` field: it is the job of
// the separate recommendation/affiliate layer (firewalled from scoring), returned as
// `start_section` and untouched by this change.
import { assertClaimCompliant } from '../../compliance/claim-guard.js';
import {
  tierLetter,
  recognizedSummaryWithUnreviewed,
  coverageSentenceFor,
  NOT_YET_REVIEWED_HEADING,
  NOT_YET_REVIEWED_DESCRIPTION,
  doseComparison,
  withinRangeNote,
  preliminaryDoseNote,
  noStudiedRangeNote,
  redundancyFlag,
  recognizedSummary,
  type TierLetter,
} from '../../compliance/claim-templates.js';
import { routeFinding, type FindingSection } from '../../compliance/finding-routing.js';
import type { ScoredCompoundInput, CompoundSubScore, StackScoreResult } from '../../scoring-engine/index.js';
import type { EvidenceDirection } from '../../db/schema.js';
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
  /**
   * §4d routing input. NULL means "not yet derived" and is never grounds for Stop — distinct
   * from the enum value `null_no_effect`, which means a study looked and found nothing.
   */
  directionOfEvidence: EvidenceDirection | null;
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
  /**
   * NULL for a recognized-but-unreviewed compound (CLAIMS_COMPLIANCE §4e): it has no scoring
   * parameter, therefore no Evidence Tier, and §4e forbids giving it "a default or placeholder
   * grade of any kind". The null is why this is `TierLetter | null` rather than a letter with a
   * fallback — a fallback is exactly what §4e prohibits, and a nullable type makes every
   * consumer confront it. `tierSummary()` skips these; the UI renders "Not yet reviewed".
   */
  evidence_tier: TierLetter | null;
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
  /**
   * CLAIMS_COMPLIANCE §4e: how many of the user's compounds the Spend Efficiency Index covers.
   * NULL when it covers all of them — §4e requires the statement only where a compound is
   * EXCLUDED, and stating "covers 2 of the 2" would raise a doubt that does not exist.
   */
  coverage_note: string | null;
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

// §4e: an unreviewed compound "must not be assigned a tier". It therefore counts toward NO
// bucket here — not a fifth one, and certainly not D, which is a reviewed verdict meaning the
// evidence is preliminary. The two are different claims: D says we looked, null says we have
// not. Summing them would tell a user their creatine was judged and found weak.
function tierSummary(recognized: RecognizedCompound[]): Record<TierLetter, number> {
  const summary: Record<TierLetter, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const r of recognized) {
    if (r.evidence_tier == null) continue;
    summary[r.evidence_tier] += 1;
  }
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
  opts: { sufficientForScoring: boolean; coverage: { scored: number; total: number } },
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
  // §4e: recognizedSummary() ends "and matched each to an evidence tier", which is false as
  // soon as one recognized compound has none. Count the tiers actually present rather than
  // assuming every recognized compound has one.
  const reviewedCount = recognized.filter((r) => r.evidence_tier != null).length;
  const anyUnreviewed = reviewedCount < recognized.length;
  const costedOverlap = overlaps.find((o) => o.approxMonthlyCost > 0);
  const headline =
    costedOverlap != null
      ? redundancyFlag({
          productCount: costedOverlap.productCount,
          sharedIngredient: costedOverlap.sharedIngredient,
          monthlyCost: costedOverlap.approxMonthlyCost,
        })
      : anyUnreviewed
        ? recognizedSummaryWithUnreviewed({ total: recognized.length, reviewed: reviewedCount })
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
    // §4e. Null whenever the score already covers everything, so the sentence never appears on
    // a fully scored stack. Also null when there is no score at all — a coverage claim about a
    // number that was not rendered would be meaningless.
    coverage_note: sufficient ? coverageSentenceFor(opts.coverage) : null,
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
  /**
   * §4d: the compound is supported, the amount is not the amount that was studied. Rendered
   * BETWEEN Stop and Keep.
   *
   * Carries `monthly_cost`, not `est_monthly_waste`. The section says the compound is worth
   * keeping, so labelling its spend "waste" on the row would contradict the section it sits
   * in. Nothing is hidden by this: an out-of-range dose still contributes its shortfall to
   * Estimated Annual Waste, which the report shows at the top.
   */
  adjust: Array<EvidenceMeta & LearnMore & { compound: string; reason: string; monthly_cost: number }>;
  keep: Array<EvidenceMeta & LearnMore & { compound: string; note: string; monthly_cost: number }>;
  /** Legacy per-compound "start" suggestions (unused; superseded by start_section). */
  start: Array<EvidenceMeta & { compound: string; reason: string; affiliate_link?: null }>;
  /** Affiliate "Start" section — Tier 1/2/3 products (firewalled affiliate-engine output). */
  start_section: StartSection;
  /** Article cross-links (firewalled article-engine output). Roundups are Start-only. */
  article_links: ArticleLinks;
  /**
   * CLAIMS_COMPLIANCE §4e — compounds the registry recognises and the evidence review has not
   * reached. A PLAIN LIST, deliberately not a fourth action section: Stop, Adjust and Keep each
   * assert something about the evidence, and §4e is explicit that "absence of review is not a
   * finding, and must never be rendered as one". Carries a name and nothing else — no tier, no
   * range, no direction, no cost — because there is nothing else to carry.
   *
   * `heading` and `description` travel with the data so the wording is founder-approved copy
   * held in one place (claim-templates) rather than retyped in a component.
   */
  not_yet_reviewed: {
    heading: string;
    description: string;
    compounds: Array<{ compound_id: string; compound: string }>;
  };
  total_estimated_annual_waste: { low: number; high: number };
  /** §4e coverage statement, or null when the score covers every compound entered. */
  coverage_note: string | null;
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

/**
 * The sentence rendered on a row, given the section §4d placed it in.
 *
 * THE SECTION IS AN INPUT, deliberately. §4d: "Any item placed in Adjust must state the
 * finding that put it there, regardless of its Evidence Tier: a section that names an action
 * must show its reason." Gating the dose comparison on Tier A/B — the previous behaviour —
 * would put a Tier C item under a heading that names an action while saying nothing about what
 * to adjust. The studied range is what was studied; the tier says how much confidence to place
 * in the finding, not whether the range exists.
 *
 * No branch here instructs a dose. Every sentence states the user's dose, the studied range,
 * and the distance between them, which is the §4d boundary between evidence and prescription.
 */
function reasonFor(c: CompoundContext, section: FindingSection): string {
  const tier = tierLetter(c.input.evidenceTier);
  const hasRange = c.input.rangeLowMg != null && c.input.rangeHighMg != null;

  if (!hasRange) {
    // Nothing to compare against. On an Adjust row §4d requires that be said outright; in the
    // other sections the pre-existing hedged note still applies.
    return section === 'adjust'
      ? noStudiedRangeNote(c.input.canonicalName)
      : preliminaryDoseNote(c.input.canonicalName, c.input.labelDoseMg, 'mg');
  }

  if (section === 'adjust' || isTierAB(tier)) {
    return doseComparison({
      compound: c.input.canonicalName,
      amount: c.input.labelDoseMg,
      unit: 'mg',
      percent: c.percentDelta,
      rangeLow: c.input.rangeLowMg as number,
      rangeHigh: c.input.rangeHighMg as number,
      sourceShortName: c.sourceShortName,
    });
  }

  // Tier C/D outside Adjust → hedged, no dose-adequacy verdict.
  return preliminaryDoseNote(c.input.canonicalName, c.input.labelDoseMg, 'mg');
}

export function buildReport(
  contexts: CompoundContext[],
  result: StackScoreResult,
  startSection: StartSection,
  articleLinks: ArticleLinks,
  notYetReviewed: ReadonlyArray<{ compoundId: string; canonicalName: string }> = [],
  coverage: { scored: number; total: number } = { scored: 0, total: 0 },
): ReportResponse {
  const stop: ReportResponse['stop'] = [];
  const adjust: ReportResponse['adjust'] = [];
  const keep: ReportResponse['keep'] = [];

  // Educational link for this compound's row, if the founder's mapping has one. Educational
  // articles are the ONLY kind allowed here (CLAIMS §6): a roundup in a Stop/Keep row would
  // blur the independence claim the same way a paid ranking would.
  const learnMoreFor = (compoundId: string): LearnMore => {
    const a = articleLinks.learn_more[compoundId];
    return a ? { learn_more: a } : {};
  };

  for (const c of contexts) {
    // ONE decision, made in one place (CLAIMS_COMPLIANCE §4d). This loop no longer decides
    // anything about placement — it only builds the row for whichever section §4d names.
    const section = routeFinding({
      evidenceTier: c.input.evidenceTier,
      isRedundant: c.isRedundant,
      directionOfEvidence: c.directionOfEvidence,
      withinStudiedRange: c.sub.withinStudiedRange,
    });

    if (section === 'stop') {
      // A redundant copy wastes its whole cost; anything else Stopped wastes the portion its
      // dosing shortfall accounts for. Unchanged from the previous implementation.
      const wasted = c.isRedundant ? c.input.dollarsSpent : c.input.dollarsSpent * ((100 - c.sub.dosingAccuracy) / 100);
      stop.push({
        compound: c.input.canonicalName,
        reason: reasonFor(c, section),
        est_monthly_waste: round2(wasted),
        ...meta(c),
        ...learnMoreFor(c.input.compoundId),
      });
    } else if (section === 'adjust') {
      adjust.push({
        compound: c.input.canonicalName,
        reason: reasonFor(c, section),
        monthly_cost: round2(c.input.dollarsSpent),
        ...meta(c),
        ...learnMoreFor(c.input.compoundId),
      });
    } else {
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
            : reasonFor(c, section),
        monthly_cost: round2(c.input.dollarsSpent),
        ...meta(c),
        ...learnMoreFor(c.input.compoundId),
      });
    }
  }

  return {
    composite_score: result.compositeScore,
    safety_flag: result.safetyFlag,
    stop,
    adjust,
    keep,
    start: [], // legacy field retained for the §6 contract; superseded by start_section.
    start_section: startSection, // from the firewalled affiliate-engine (see assessment-service).
    article_links: articleLinks, // from the firewalled article-engine (see assessment-service).
    // §4e. No claim-guard call here, and that is correct rather than an omission: the guard
    // (CLAIMS §4) requires an evidence tier and source ids on every claim object, and these
    // rows make no claim about a compound — they state only that we have not reviewed it.
    not_yet_reviewed: {
      heading: NOT_YET_REVIEWED_HEADING,
      description: NOT_YET_REVIEWED_DESCRIPTION,
      compounds: notYetReviewed.map((u) => ({ compound_id: u.compoundId, compound: u.canonicalName })),
    },
    total_estimated_annual_waste: { low: result.waste.annualLow, high: result.waste.annualHigh },
    coverage_note: coverageSentenceFor(coverage),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
