// Orchestrates a stored intake into the §6 preview/report shapes: resolves evidence data
// via an injected EvidenceProvider, runs the scoring engine, and hands off to report-builder.
// Pure given the provider, so it is testable with a fake provider (no DB).
import {
  scoreStack,
  redundantItems,
  type ScoredCompoundInput,
  type StackInteraction,
  type ScoredItem,
  type DeliveryFormat,
} from '../../scoring-engine/index.js';
import {
  buildPreview,
  buildReport,
  type CompoundContext,
  type OverlapGroup,
  type PreviewResponse,
  type RecognizedCompound,
  type ReportResponse,
} from './report-builder.js';
import { tierLetter, outcomeMismatchNote } from '../../compliance/claim-templates.js';
// The affiliate-engine is firewalled from scoring; the orchestrator (this file) is the seam that
// composes scoring output with the affiliate Start section — affiliate never feeds the score.
import { buildStartSection, type RecognizedForStart } from '../../affiliate-engine/index.js';
// Same seam for article cross-links: the article-engine is firewalled from scoring, and this
// orchestrator composes its output with the scored report. Articles never feed the score.
import { buildArticleLinks, type RecognizedForArticles } from '../../article-engine/index.js';
import type { EvidenceTier, EvidenceDirection } from '../../db/schema.js';

/** A user's stack item as captured/confirmed (mirrors user_stack_items). */
export interface StoredStackItem {
  compoundId: string | null;
  labelDoseMg: number | null;
  deliveryFormat: DeliveryFormat | null;
  pricePaid: number | null;
}

export interface StoredIntake {
  stackItems: StoredStackItem[];
  /**
   * The user's stated priority as a CANONICAL GOAL TAG (db/goals.ts), never a display label.
   * Null when the user stated no outcome priority — "Not sure yet" and "Simplifying my stack"
   * are choices on the Priority screen but are not outcomes, so they carry no tag and there is
   * no stated priority for a finding to mismatch.
   */
  goalTag: string | null;
}

/** Evidence resolved from scoring_parameters (+ compound) for one compound/goal pair. */
export interface ResolvedEvidence {
  canonicalName: string;
  /** The goal_tag of the parameter actually selected — which may not be the user's (§4b). */
  goalTag: string;
  /**
   * §4d routing input. NULL means NOT YET DERIVED — never "an adequate study found no
   * effect", which is the enum value `null_no_effect`. The column existed and was populated
   * from 2026-07-30 but nothing read it: repository.ts selected the row and dropped this
   * field, so a direction of null_no_effect or negative could not reach a routing decision.
   */
  directionOfEvidence: EvidenceDirection | null;
  rangeLowMg: number | null;
  rangeHighMg: number | null;
  /** For the user's delivery format; defaults to 1 when unknown. */
  bioavailabilityAdjustmentFactor: number;
  evidenceTier: EvidenceTier;
  contributingSourceIds: string[];
  tierRationale: string;
  lastReviewed: string;
  reviewerName: string;
  sourceShortName: string;
}

/**
 * A compound the registry knows by name and the evidence review has not reached: a row in
 * `compounds` with zero rows in `scoring_parameters` (CLAIMS_COMPLIANCE §4e).
 *
 * IT CARRIES A NAME AND NOTHING ELSE, ON PURPOSE. §4e forbids assigning such a compound a tier,
 * a studied range, a direction of evidence, or "a default or placeholder grade of any kind", so
 * this type cannot express one. That is the enforcement: it is not possible to route one of
 * these into Stop/Adjust/Keep or into a tier count without first inventing a field that does
 * not exist here, which is a visible change rather than a silent default.
 */
export interface UnreviewedCompound {
  compoundId: string;
  canonicalName: string;
}

export interface EvidenceProvider {
  /** Resolve evidence for each compound; missing compounds are simply absent from the map. */
  resolve(compoundIds: string[], goalTag: string | null): Promise<Map<string, ResolvedEvidence>>;
  /**
   * Compounds that exist in `compounds` but have no scoring parameter (§4e).
   *
   * Before 2026-08-05 there was no such method and no caller: `repository.ts` hit
   * `if (p == null) continue;` and the compound left the pipeline entirely — absent from
   * `recognized_compounds`, absent from every action section, and absent from the Preview's
   * count, while its spend was quietly excluded from an SEI still presented as covering the
   * stack. Proven against the real assembly path: a stack of NMN $40 + Creatine $20 reported
   * "We recognized 1 compound", an SEI of 80 and no mention of creatine anywhere.
   */
  unreviewed(compoundIds: string[]): Promise<UnreviewedCompound[]>;
  /** Interactions among the given compounds (from interaction_records). */
  interactions(compoundIds: string[]): Promise<StackInteraction[]>;
}

export interface AssessmentOutputs {
  preview: PreviewResponse;
  report: ReportResponse;
}

/** Signed % of effective dose vs studied range (negative = below). 0 within/unknown. */
function percentDelta(effectiveDose: number, low: number | null, high: number | null): number {
  if (low == null || high == null) return 0;
  if (effectiveDose >= low && effectiveDose <= high) return 0;
  if (effectiveDose < low) return -Math.round((1 - effectiveDose / low) * 100);
  return Math.round(((effectiveDose - high) / high) * 100);
}

export async function assembleAssessment(
  intake: StoredIntake,
  provider: EvidenceProvider,
): Promise<AssessmentOutputs> {
  const compoundIds = intake.stackItems
    .map((s) => s.compoundId)
    .filter((id): id is string => id != null);
  const evidence = await provider.resolve(compoundIds, intake.goalTag);

  // CLAIMS_COMPLIANCE §4b. Computed here because this is the only layer that knows BOTH the
  // user's stated priority and which parameter the provider actually selected; every surface
  // below then renders the same sentence instead of re-deriving it.
  const mismatchFor = (ev: ResolvedEvidence): string | null =>
    outcomeMismatchNote({
      compound: ev.canonicalName,
      chosenGoalTag: intake.goalTag,
      selectedGoalTag: ev.goalTag,
    });

  // Recognized = every matched compound we have evidence for, WHETHER OR NOT a dose was
  // given (deduped). This is what the Preview lists as "recognized" and is deliberately
  // separate from whether we can SCORE the compound (which also needs a dose). Without this
  // split, a recognized-but-doseless compound (e.g. "TMG 500" with no unit) would vanish and
  // the Preview would wrongly say "couldn't recognize any compounds."
  // §4e: compounds in the registry that the evidence review has not reached. Resolved
  // alongside the evidence, not instead of it — a compound is in exactly one of the two sets.
  const unreviewedList = await provider.unreviewed(compoundIds);
  const unreviewedById = new Map(unreviewedList.map((u) => [u.compoundId, u]));

  const recognizedMap = new Map<string, RecognizedCompound>();
  for (const item of intake.stackItems) {
    if (!item.compoundId || recognizedMap.has(item.compoundId)) continue;
    const ev = evidence.get(item.compoundId);
    if (ev) {
      recognizedMap.set(item.compoundId, {
        compound_id: item.compoundId,
        canonical_name: ev.canonicalName,
        evidence_tier: tierLetter(ev.evidenceTier),
        outcome_mismatch_note: mismatchFor(ev),
      });
      continue;
    }
    // Recognized, unreviewed. It belongs in the Preview's recognized list — that is the whole
    // point of §4e — but with no tier and no §4b note, because both are statements about
    // evidence this compound has none of.
    const un = unreviewedById.get(item.compoundId);
    if (!un) continue;
    recognizedMap.set(item.compoundId, {
      compound_id: item.compoundId,
      canonical_name: un.canonicalName,
      evidence_tier: null,
      outcome_mismatch_note: null,
    });
  }
  const recognized = [...recognizedMap.values()];

  // Deduped, in first-seen order, for the report's "Not yet reviewed" list.
  const notYetReviewed: UnreviewedCompound[] = [];
  const seenUnreviewed = new Set<string>();
  for (const item of intake.stackItems) {
    if (!item.compoundId || seenUnreviewed.has(item.compoundId)) continue;
    const un = unreviewedById.get(item.compoundId);
    if (!un || evidence.has(item.compoundId)) continue;
    seenUnreviewed.add(item.compoundId);
    notYetReviewed.push(un);
  }

  // Scorable items: a matched compound, an interpretable dose, and resolved evidence.
  const inputs: ScoredCompoundInput[] = [];
  const evForInput: ResolvedEvidence[] = [];
  for (const item of intake.stackItems) {
    if (!item.compoundId || item.labelDoseMg == null) continue;
    const ev = evidence.get(item.compoundId);
    if (!ev) continue;
    inputs.push({
      compoundId: item.compoundId,
      canonicalName: ev.canonicalName,
      labelDoseMg: item.labelDoseMg,
      deliveryFormat: item.deliveryFormat ?? 'standard_capsule',
      dollarsSpent: item.pricePaid ?? 0,
      rangeLowMg: ev.rangeLowMg,
      rangeHighMg: ev.rangeHighMg,
      bioavailabilityAdjustmentFactor: ev.bioavailabilityAdjustmentFactor,
      evidenceTier: ev.evidenceTier,
      contributingSourceIds: ev.contributingSourceIds,
      // Same compound bought as two products = shared active ingredient (redundancy).
      // NOTE/FLAG: cross-compound pathway redundancy (e.g. NMN vs NR) is not grouped here —
      // it needs a shared-ingredient tag or the redundant_pathway interaction; future work.
      sharedIngredientKey: item.compoundId,
    });
    evForInput.push(ev);
  }

  const interactions = await provider.interactions(compoundIds);
  const result = scoreStack(inputs, interactions);

  const scored: ScoredItem[] = inputs.map((item, i) => ({ item, sub: result.subScores[i] }));
  const redundant = redundantItems(scored);

  const contexts: CompoundContext[] = scored.map((s, i) => {
    const ev = evForInput[i];
    return {
      input: s.item,
      sub: s.sub,
      isRedundant: redundant.has(s),
      tierRationale: ev.tierRationale,
      lastReviewed: ev.lastReviewed,
      reviewerName: ev.reviewerName,
      sourceShortName: ev.sourceShortName,
      percentDelta: percentDelta(s.sub.effectiveDoseMg, s.item.rangeLowMg, s.item.rangeHighMg),
      outcomeMismatchNote: mismatchFor(ev),
      directionOfEvidence: ev.directionOfEvidence,
    };
  });

  // Overlap groups: same compound appearing in >1 product.
  const overlaps: OverlapGroup[] = [];
  const byKey = new Map<string, ScoredItem[]>();
  for (const s of scored) {
    const key = s.item.sharedIngredientKey ?? s.item.compoundId;
    (byKey.get(key) ?? byKey.set(key, []).get(key)!).push(s);
  }
  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    overlaps.push({
      sharedIngredient: group[0].item.canonicalName,
      productCount: group.length,
      approxMonthlyCost: group.reduce((sum, s) => sum + Math.max(0, s.item.dollarsSpent), 0),
    });
  }

  const totalSpend = inputs.reduce((sum, i) => sum + Math.max(0, i.dollarsSpent), 0);
  const sufficientForScoring = totalSpend > 0 && inputs.length > 0;

  // Start section: keyed off the compounds PRESENT IN THE REPORT (the scored contexts), each
  // with its established evidence tier. The affiliate-engine only selects founder-reviewed
  // products; it cannot and does not influence any score above.
  const recognizedForStart: RecognizedForStart[] = contexts.map((c) => ({
    compoundId: c.input.compoundId,
    canonicalName: c.input.canonicalName,
    evidenceTier: tierLetter(c.input.evidenceTier),
  }));
  // §4e: unreviewed compounds are passed ONLY so their Tier 2 entries can be suppressed. They
  // are never added to `recognizedForStart`, so they can never acquire a Tier 1 group.
  const startSection = buildStartSection(
    recognizedForStart,
    notYetReviewed.map((u) => u.canonicalName),
  );

  // Article links: keyed off the same in-report compounds. Selection takes ONLY the compound
  // identity — no score, dose, tier, or dollar figure is passed in, so an article cannot
  // influence any number above (TECH_DOCS §4; enforced structurally by the firewall).
  const recognizedForArticles: RecognizedForArticles[] = contexts.map((c) => ({
    compoundId: c.input.compoundId,
    canonicalName: c.input.canonicalName,
  }));
  const articleLinks = buildArticleLinks(recognizedForArticles);

  // §4e coverage. `scored` counts DISTINCT compounds behind the SEI, not stack items, so two
  // products of one compound do not inflate it. `total` is every compound we could name —
  // reviewed and unreviewed alike. Anything excluded from the score (unreviewed, or recognized
  // with no interpretable dose) makes scored < total and triggers the coverage sentence.
  const scoredCompoundIds = new Set(contexts.map((c) => c.input.compoundId));
  const coverage = { scored: scoredCompoundIds.size, total: recognized.length };

  return {
    preview: buildPreview(recognized, contexts, result, overlaps, {
      sufficientForScoring,
      coverage,
    }),
    report: buildReport(contexts, result, startSection, articleLinks, notYetReviewed, coverage),
  };
}
