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
import { tierLetter } from '../../compliance/claim-templates.js';
// The affiliate-engine is firewalled from scoring; the orchestrator (this file) is the seam that
// composes scoring output with the affiliate Start section — affiliate never feeds the score.
import { buildStartSection, type RecognizedForStart } from '../../affiliate-engine/index.js';
import type { EvidenceTier } from '../../db/schema.js';

/** A user's stack item as captured/confirmed (mirrors user_stack_items). */
export interface StoredStackItem {
  compoundId: string | null;
  labelDoseMg: number | null;
  deliveryFormat: DeliveryFormat | null;
  pricePaid: number | null;
}

export interface StoredIntake {
  stackItems: StoredStackItem[];
  goalTag: string;
}

/** Evidence resolved from scoring_parameters (+ compound) for one compound/goal pair. */
export interface ResolvedEvidence {
  canonicalName: string;
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

export interface EvidenceProvider {
  /** Resolve evidence for each compound; missing compounds are simply absent from the map. */
  resolve(compoundIds: string[], goalTag: string): Promise<Map<string, ResolvedEvidence>>;
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

  // Recognized = every matched compound we have evidence for, WHETHER OR NOT a dose was
  // given (deduped). This is what the Preview lists as "recognized" and is deliberately
  // separate from whether we can SCORE the compound (which also needs a dose). Without this
  // split, a recognized-but-doseless compound (e.g. "TMG 500" with no unit) would vanish and
  // the Preview would wrongly say "couldn't recognize any compounds."
  const recognizedMap = new Map<string, RecognizedCompound>();
  for (const item of intake.stackItems) {
    if (!item.compoundId) continue;
    const ev = evidence.get(item.compoundId);
    if (!ev || recognizedMap.has(item.compoundId)) continue;
    recognizedMap.set(item.compoundId, {
      compound_id: item.compoundId,
      canonical_name: ev.canonicalName,
      evidence_tier: tierLetter(ev.evidenceTier),
    });
  }
  const recognized = [...recognizedMap.values()];

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
  const startSection = buildStartSection(recognizedForStart);

  return {
    preview: buildPreview(recognized, contexts, result, overlaps, { sufficientForScoring }),
    report: buildReport(contexts, result, startSection),
  };
}
