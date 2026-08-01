// Priority-screen options and the canonical goal tags they map to.
//
// MUST MIRROR backend/src/db/goals.ts. The two are separate because there is no shared package
// in this repo (the same hand-mirrored arrangement as lib/types.ts and TECH_DOCS §6), and
// backend/src/db/goals.test.ts asserts that every seeded `goal_tag` is in that list.
//
// WHY THE SPLIT EXISTS AT ALL: the Priority screen used to put its DISPLAY LABEL straight into
// `priority_goal` — 'Healthy aging' where the database stores 'healthy_aging'. Nothing compared
// equal, so the backend silently scored every user against an arbitrary parameter row. Label
// and tag are now different fields with different jobs: the label is what a person reads, the
// tag is what the database matches. Neither is derived from the other by string munging.

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
 * The Priority screen's options, in display order.
 *
 * `tag: null` is NOT a missing value — it means the option names no outcome. "Simplifying my
 * stack" and "Not sure yet" are real answers to "what are you optimizing for?", but neither is
 * an outcome the evidence database can hold a parameter for, so neither can be matched against
 * one and neither can be mismatched against one. They are sent as a null priority_goal, which
 * the backend accepts as valid (CLAIMS_COMPLIANCE §4c: a disclosure is required only where the
 * user stated a priority and the finding was measured against a different one).
 */
export const PRIORITY_OPTIONS: Array<{ label: string; tag: GoalTag | null }> = [
  { label: 'Healthy aging', tag: 'healthy_aging' },
  { label: 'Daily energy', tag: 'daily_energy' },
  { label: 'Cognitive performance', tag: 'cognitive_performance' },
  { label: 'Metabolic health', tag: 'metabolic_health' },
  { label: 'Training and recovery', tag: 'training_and_recovery' },
  { label: 'Sleep quality', tag: 'sleep_quality' },
  { label: 'Simplifying my stack', tag: null },
  { label: 'Not sure yet', tag: null },
];
