import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  timestamp,
} from 'drizzle-orm/pg-core';
import {
  compoundCategoryEnum,
  deliveryFormatEnum,
  effectDirectionEnum,
  interactionTypeEnum,
  interactionSeverityEnum,
} from './enums.js';
import { source } from './layer1_source.js';

// Layer 2 - Compound record: AI-populated, human-review-gated before use in scoring (TECH_DOCS §1, §3).
export const compound = pgTable('compound', {
  compoundId: uuid('compound_id').defaultRandom().primaryKey(),
  canonicalName: text('canonical_name').notNull(),
  aliases: text('aliases').array(),
  category: compoundCategoryEnum('category').notNull(),
  // Mechanism-level only - never benefit-level (CLAIMS_COMPLIANCE.md §5).
  mechanismSummary: text('mechanism_summary'),
});

export const doseRecord = pgTable('dose_record', {
  doseRecordId: uuid('dose_record_id').defaultRandom().primaryKey(),
  compoundId: uuid('compound_id')
    .notNull()
    .references(() => compound.compoundId),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => source.sourceId),
  studiedDoseMinMg: real('studied_dose_min_mg'),
  studiedDoseMaxMg: real('studied_dose_max_mg'),
  studiedDurationWeeks: integer('studied_duration_weeks'),
  deliveryFormat: deliveryFormatEnum('delivery_format'),
  outcomeMeasured: text('outcome_measured'),
  effectDirection: effectDirectionEnum('effect_direction'),
  effectSize: text('effect_size'),
  extractionMethod: text('extraction_method'),
  reviewerId: uuid('reviewer_id'),
  reviewDate: timestamp('review_date', { mode: 'date' }),
});

export const bioavailabilityRecord = pgTable('bioavailability_record', {
  bioavailabilityRecordId: uuid('bioavailability_record_id')
    .defaultRandom()
    .primaryKey(),
  compoundId: uuid('compound_id')
    .notNull()
    .references(() => compound.compoundId),
  deliveryFormat: deliveryFormatEnum('delivery_format').notNull(),
  relativeBioavailabilityPct: real('relative_bioavailability_pct'),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => source.sourceId),
});

export const interactionRecord = pgTable('interaction_record', {
  interactionRecordId: uuid('interaction_record_id')
    .defaultRandom()
    .primaryKey(),
  compoundIdA: uuid('compound_id_a')
    .notNull()
    .references(() => compound.compoundId),
  compoundIdB: uuid('compound_id_b')
    .notNull()
    .references(() => compound.compoundId),
  interactionType: interactionTypeEnum('interaction_type').notNull(),
  mechanismNote: text('mechanism_note'),
  severity: interactionSeverityEnum('severity').notNull().default('informational'),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => source.sourceId),
});
