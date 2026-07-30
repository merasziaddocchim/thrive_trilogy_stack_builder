// =============================================================================
// Evidence Tier, DERIVED — CLAIMS_COMPLIANCE §4a Steps 1-3.
//
// The single mechanical implementation of the assignment rule. Used by the correction script
// that writes `evidence_tier` AND by the test that checks every stored tier, so the rule is
// verified on every run rather than transcribed by hand into a list of values. Same shape and
// intent as derive-direction.ts.
//
// §4a owns the rule. This file only implements it: if the two ever disagree, §4a is right.
//
// NOT imported by scoring-engine/. The engine reads the stored `evidence_tier` column; this
// module decides what belongs in it. Keeping them apart is what lets a tier change be applied
// and verified as a data migration rather than a formula change.
// =============================================================================
import type { EvidenceTier, OutcomeProximity } from './schema.js';

/** `study_type` as recorded on a source. Mirrors the studyTypeEnum values exactly. */
export type StudyType =
  | 'meta_analysis'
  | 'systematic_review'
  | 'RCT'
  | 'cohort_observational'
  | 'animal_model'
  | 'in_vitro'
  | 'case_report'
  | 'mechanism_review';

/** The facts about one contributing source that §4a actually reads. */
export interface ContributingSource {
  studyType: StudyType;
  /** The effect direction on THIS source's dose record for the parameter's compound. */
  effectDirection: 'positive' | 'null_no_effect' | 'negative';
  /** Participants. `null` where the value was never recorded — treated as contributing 0. */
  sampleSize: number | null;
}

const ORDER: readonly EvidenceTier[] = ['A_strong', 'B_moderate', 'C_limited', 'D_preliminary'];

/**
 * §4a STEP 1 — study design to ceiling. Maps all eight `study_type` enum values onto §4a's
 * four design buckets:
 *
 *   meta_analysis, systematic_review  -> A  ("meta-analysis or systematic review of human RCTs")
 *   RCT                               -> B  ("human randomized controlled trial")
 *   cohort_observational, case_report -> C  ("human non-randomized, open-label, or observational")
 *   animal_model, in_vitro,
 *   mechanism_review                  -> D  ("mechanistic, animal, in vitro, or narrative review")
 *
 * Two notes on the two enum values §4a does not name outright:
 *
 * - `case_report` is placed at C, not D. It is a human, non-randomized, observational report,
 *   which is precisely bucket three; §4a's bucket four is animal/in-vitro/mechanistic/narrative,
 *   none of which a case report is. It is the weakest thing in bucket three, and outcome
 *   proximity will usually demote it further. No batch-1 source uses this value.
 * - `meta_analysis`/`systematic_review` map to A on the assumption the pooled studies were
 *   RCTs, which is what §4a's wording requires. The schema records no field for what a
 *   meta-analysis pooled, so a meta-analysis of cohort studies would map to A here and should
 *   not. Both batch-1 meta-analyses do pool RCTs (Lan 2015: 27 RCTs; McRae 2013: 5 RCTs), so
 *   this is correct today — but it is a real gap to close before batch 2 ships a pooled
 *   observational review.
 */
const CEILING: Record<StudyType, EvidenceTier> = {
  meta_analysis: 'A_strong',
  systematic_review: 'A_strong',
  RCT: 'B_moderate',
  cohort_observational: 'C_limited',
  case_report: 'C_limited',
  animal_model: 'D_preliminary',
  in_vitro: 'D_preliminary',
  mechanism_review: 'D_preliminary',
};

/** §4a STEP 2 — outcome proximity may demote, never promote. */
const DEMOTION: Record<OutcomeProximity, number> = {
  clinical_outcome: 0,
  surrogate_biomarker: 1,
  performance_or_self_report: 1,
};

/** §4a STEP 3 — pooled participants required across the qualifying trials. */
const MIN_POOLED_N = 30;

const step = (tier: EvidenceTier, by: number): EvidenceTier =>
  ORDER[Math.min(Math.max(ORDER.indexOf(tier) + by, 0), ORDER.length - 1)];

/** The intermediate values, exposed so the correction script and tests can show their working. */
export interface TierDerivation {
  tier: EvidenceTier;
  ceiling: EvidenceTier;
  afterProximity: EvidenceTier;
  demotedBy: number;
  restored: boolean;
  /** Why restoration did not apply, when it did not. Empty when it did, or was not needed. */
  restorationBlockedBy: string[];
  qualifyingRctCount: number;
  pooledN: number;
}

/**
 * Derive a parameter's Evidence Tier from its contributing sources and stored outcome proximity.
 *
 * Deliberately does NOT take the parameter's stored `direction_of_evidence`. That field
 * aggregates every contributing source, including non-RCTs, so it can read `mixed` when the
 * RCTs alone agree — two agreeing trials plus one dissenting observational study. §4a Step 3
 * asks whether the RANDOMIZED TRIALS agree, so agreement is recomputed here over the qualifying
 * trials only. This changes no batch-1 assignment and will matter in batch 2.
 */
export function deriveTierDetailed(
  sources: readonly ContributingSource[],
  outcomeProximity: OutcomeProximity,
): TierDerivation {
  if (sources.length === 0) {
    throw new Error('deriveTier: no contributing sources — cannot derive a tier.');
  }

  // --- Step 1: the BEST design present sets the ceiling.
  const ceiling = sources
    .map((s) => CEILING[s.studyType])
    .reduce((best, t) => (ORDER.indexOf(t) < ORDER.indexOf(best) ? t : best));

  // --- Step 2: proximity may demote, never promote.
  const demotedBy = DEMOTION[outcomeProximity];
  const afterProximity = step(ceiling, demotedBy);

  // --- Step 3: replication may restore ONE tier lost in Step 2, never more, and never above
  //     the Step 1 ceiling. A meta-analysis is excluded: its replication is already in the
  //     ceiling, and counting it again would double-count the same evidence.
  const rcts = sources.filter((s) => s.studyType === 'RCT');
  const rctDirections = new Set(rcts.map((s) => s.effectDirection));
  const pooledN = rcts.reduce((sum, s) => sum + (s.sampleSize ?? 0), 0);

  const blocked: string[] = [];
  if (demotedBy === 0) blocked.push('nothing was lost in Step 2 to restore');
  if (rcts.length < 2) blocked.push(`only ${rcts.length} qualifying RCT(s), needs 2+`);
  if (rcts.length >= 2 && rctDirections.size > 1) {
    blocked.push(`the RCTs disagree in direction (${[...rctDirections].join(', ')})`);
  }
  if (rcts.length >= 2 && pooledN < MIN_POOLED_N) {
    blocked.push(`pooled n across the RCTs is ${pooledN}, needs ${MIN_POOLED_N}+`);
  }

  const restored = blocked.length === 0;
  // Clamped to the ceiling: restoration gives back at most the one tier Step 2 took.
  const tier = restored ? step(afterProximity, -1) : afterProximity;
  if (ORDER.indexOf(tier) < ORDER.indexOf(ceiling)) {
    throw new Error(`deriveTier: ${tier} exceeds the Step 1 ceiling ${ceiling} — restoration over-applied.`);
  }

  return {
    tier,
    ceiling,
    afterProximity,
    demotedBy,
    restored,
    restorationBlockedBy: blocked,
    qualifyingRctCount: rcts.length,
    pooledN,
  };
}

/** The tier alone. Use `deriveTierDetailed` when the reasoning needs to be shown. */
export function deriveTier(
  sources: readonly ContributingSource[],
  outcomeProximity: OutcomeProximity,
): EvidenceTier {
  return deriveTierDetailed(sources, outcomeProximity).tier;
}

export { CEILING as STUDY_TYPE_CEILING, MIN_POOLED_N };
