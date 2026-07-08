import {
  pgTable,
  uuid,
  text,
  real,
  timestamp,
} from 'drizzle-orm/pg-core';
import { evidenceTierEnum } from './enums.js';
import { compound } from './layer2_compound.js';

// Layer 3 - Scoring parameters: the distillation layer the formula (TECH_DOCS §2) reads.
// Only human_reviewed records should feed this layer (TECH_DOCS §3).
export const scoringParameter = pgTable('scoring_parameter', {
  scoringParameterId: uuid('scoring_parameter_id').defaultRandom().primaryKey(),
  compoundId: uuid('compound_id')
    .notNull()
    .references(() => compound.compoundId),
  goalTag: text('goal_tag').notNull(),
  recommendedRangeLowMg: real('recommended_range_low_mg'),
  recommendedRangeHighMg: real('recommended_range_high_mg'),
  evidenceTier: evidenceTierEnum('evidence_tier').notNull(),
  evidenceTierRationale: text('evidence_tier_rationale'),
  bioavailabilityAdjustmentFactor: real('bioavailability_adjustment_factor'),
  lastReviewedDate: timestamp('last_reviewed_date', { mode: 'date' }),
  // Sources that contributed to this parameter (TECH_DOCS §1). Array of source UUIDs.
  contributingSourceIds: uuid('contributing_source_ids').array(),
});
