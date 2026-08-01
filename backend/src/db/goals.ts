// =============================================================================
// Canonical goal tags — the ONLY values permitted in `scoring_parameters.goal_tag` and in a
// POST /assessment `priority_goal`.
//
// WHY THIS FILE EXISTS. Until 2026-08-01 the frontend sent the DISPLAY LABEL ('Healthy aging')
// while the database stores the TAG ('healthy_aging'). They never compared equal, so the
// goal-matching lookup in repository.ts missed on every real assessment and silently fell
// through to "whichever row Postgres returned first". That decided which dose range a user was
// measured against and which Evidence Tier badge they saw. Tag and label are now separate
// values with one source of truth each, so the two can no longer drift.
//
// This list is the PRODUCT's outcome vocabulary, not the seeded data's. Only three of these
// tags currently have scoring_parameters rows (healthy_aging, metabolic_health,
// training_and_recovery); the rest are outcomes a user can legitimately choose and for which
// we simply have no evidence yet. That is a disclosure case (CLAIMS_COMPLIANCE §4b), not a
// validation failure — a goal must not be rejected merely because batch 1 is small.
// =============================================================================
import type { EvidenceTier } from './schema.js';

export const GOAL_TAGS = [
  'cognitive_performance',
  'daily_energy',
  'healthy_aging',
  'metabolic_health',
  'sleep_quality',
  'training_and_recovery',
] as const;

export type GoalTag = (typeof GOAL_TAGS)[number];

/**
 * Display labels. CLAIMS_COMPLIANCE §4b requires the outcome-mismatch disclosure to name both
 * outcomes "as display labels" rather than raw tags, so this mapping is what user-facing copy
 * renders — never `goal_tag` itself, and never a re-cased tag.
 */
export const GOAL_LABELS: Record<GoalTag, string> = {
  cognitive_performance: 'cognitive performance',
  daily_energy: 'daily energy',
  healthy_aging: 'healthy aging',
  metabolic_health: 'metabolic health',
  sleep_quality: 'sleep quality',
  training_and_recovery: 'training and recovery',
};

export function isGoalTag(value: unknown): value is GoalTag {
  return typeof value === 'string' && (GOAL_TAGS as readonly string[]).includes(value);
}

/** Display label for a stored tag. Unknown tags return the tag itself rather than throwing —
 *  a row seeded with an off-list tag must still be nameable in a disclosure, not crash it. */
export function goalLabel(tag: string): string {
  return isGoalTag(tag) ? GOAL_LABELS[tag] : tag;
}

// -----------------------------------------------------------------------------
// Deterministic parameter selection (CLAIMS_COMPLIANCE §4b).
// -----------------------------------------------------------------------------

/**
 * Evidence Tier ordering, written out explicitly.
 *
 * Deliberately NOT derived from `evidenceTierEnum.enumValues` or from Postgres's implicit enum
 * declaration order. Sorting by an enum's declaration order makes the ranking an accident of
 * how the type was written: reordering the enum for readability, or adding a tier in the middle
 * of it, would silently change which parameter every user is scored against. The ranking is a
 * rule, so it is stated as one.
 */
export const TIER_RANK: Record<EvidenceTier, number> = {
  A_strong: 4,
  B_moderate: 3,
  C_limited: 2,
  D_preliminary: 1,
};

/** The minimum a row must expose to be selectable. Kept structural so this stays pure and
 *  testable without a DB row type. */
export interface SelectableParameter {
  goalTag: string;
  evidenceTier: EvidenceTier;
}

/**
 * Pick the scoring parameter used to score one compound, per CLAIMS_COMPLIANCE §4b:
 *
 *   1. Exact goal_tag match, if one exists.
 *   2. Otherwise the parameter with the highest Evidence Tier.
 *   3. Ties broken by goal_tag ascending.
 *
 * TOTAL AND ORDER-INDEPENDENT BY CONSTRUCTION: step 3 breaks every tie step 2 can leave, and
 * `goal_tag` is unique per compound, so no two candidates can compare equal. The result cannot
 * depend on the order `rows` arrives in — which is the whole point, since the caller's query
 * returns rows in whatever order Postgres chooses. `db/select-parameter.test.ts` pins this by
 * feeding every permutation of the input.
 *
 * `goalTag` may be null (the user stated no outcome priority), in which case step 1 cannot
 * apply and selection falls to the tier rule.
 */
export function selectParameter<T extends SelectableParameter>(
  rows: readonly T[],
  goalTag: string | null,
): T | null {
  if (rows.length === 0) return null;

  if (goalTag != null) {
    const exact = rows.filter((r) => r.goalTag === goalTag);
    // Defensive: `goal_tag` is unique per compound, but if duplicates ever existed we still
    // must not return an order-dependent answer.
    if (exact.length > 0) return [...exact].sort(byTierThenTag)[0];
  }

  return [...rows].sort(byTierThenTag)[0];
}

function byTierThenTag(a: SelectableParameter, b: SelectableParameter): number {
  const rank = (TIER_RANK[b.evidenceTier] ?? 0) - (TIER_RANK[a.evidenceTier] ?? 0);
  if (rank !== 0) return rank; // highest tier first
  return a.goalTag < b.goalTag ? -1 : a.goalTag > b.goalTag ? 1 : 0; // then goal_tag ascending
}
