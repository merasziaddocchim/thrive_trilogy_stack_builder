// =============================================================================
// Thrive Trilogy — Stack Optimizer: consolidated Drizzle schema
// =============================================================================
// Implements the three-layer data model from Docs/TECH_DOCS.md §1. Layers are kept
// as distinct tables so raw literature facts (Layer 1), extracted/editorial facts
// (Layer 2), and the consumer-facing scoring distillation (Layer 3) are never blended
// — this separation is what makes the system auditable.
//
// Compliance is enforced at the SCHEMA level, not by convention:
//   scoring_parameters.evidence_tier          -> NOT NULL
//   scoring_parameters.contributing_source_ids -> NOT NULL
// per CLAIMS_COMPLIANCE.md §4 and TECH_DOCS.md §4 (no scoring parameter may exist
// without a linked evidence tier and the sources that justify it).
//
// No business logic (scoring formula, ceiling values, penalty slopes, claim templates)
// lives here — schema and enums only.
// =============================================================================

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// -----------------------------------------------------------------------------
// Enums — values taken verbatim from TECH_DOCS §1 so the DB is the source of truth.
// -----------------------------------------------------------------------------

export const studyTypeEnum = pgEnum('study_type', [
  'meta_analysis',
  'systematic_review',
  'RCT',
  'cohort_observational',
  'animal_model',
  'in_vitro',
  'case_report',
  'mechanism_review',
]);

export const populationMatchEnum = pgEnum('population_match', [
  'general_healthy_adult',
  'older_adult_55plus',
  'clinical_condition',
  'animal_model',
  'n/a',
]);

export const journalTierEnum = pgEnum('journal_tier', [
  'tier_1_high_impact',
  'tier_2_peer_reviewed',
  'tier_3_preprint_or_low_impact',
]);

export const extractionStatusEnum = pgEnum('extraction_status', [
  'pending_ai_extraction',
  'ai_extracted',
  'human_reviewed',
  'rejected',
]);

// Category maps to existing site pillars (TECH_DOCS §1).
export const compoundCategoryEnum = pgEnum('compound_category', [
  'nad_precursor',
  'methylation',
  'longevity_compound',
  'delivery_modifier',
]);

export const deliveryFormatEnum = pgEnum('delivery_format', [
  'standard_capsule',
  'liposomal',
  'sublingual',
  'powder',
  'injectable',
]);

export const effectDirectionEnum = pgEnum('effect_direction', [
  'positive',
  'null_no_effect',
  'negative',
]);

export const interactionTypeEnum = pgEnum('interaction_type', [
  'synergistic',
  'redundant_pathway',
  'antagonistic',
  'contraindicated_with_medication_class',
]);

export const interactionSeverityEnum = pgEnum('interaction_severity', [
  'informational',
  'caution',
  'avoid',
]);

// Locked terminology (TECH_DOCS §1/§2, CLAIMS_COMPLIANCE §4) — never invent a parallel label.
export const evidenceTierEnum = pgEnum('evidence_tier', [
  'A_strong',
  'B_moderate',
  'C_limited',
  'D_preliminary',
]);

// Enum-derived TS types so the DB stays the single source of truth for these unions.
export type EvidenceTier = (typeof evidenceTierEnum.enumValues)[number];
export type DeliveryFormat = (typeof deliveryFormatEnum.enumValues)[number];
export type InteractionSeverity = (typeof interactionSeverityEnum.enumValues)[number];

// =============================================================================
// LAYER 1 — Source registry: one record per paper, before any extraction.
// =============================================================================

export const sources = pgTable('sources', {
  sourceId: uuid('source_id').defaultRandom().primaryKey(),
  citation: text('citation').notNull(),
  doiOrUrl: text('doi_or_url'),
  studyType: studyTypeEnum('study_type').notNull(),
  sampleSize: integer('sample_size'),
  populationMatch: populationMatchEnum('population_match').notNull(),
  journalTier: journalTierEnum('journal_tier').notNull(),
  publicationDate: timestamp('publication_date', { mode: 'date' }),
  extractionStatus: extractionStatusEnum('extraction_status')
    .notNull()
    .default('pending_ai_extraction'),
  reviewerId: uuid('reviewer_id'),
  reviewDate: timestamp('review_date', { mode: 'date' }),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// =============================================================================
// LAYER 2 — Compound records: extracted facts, human-review-gated before scoring use.
// =============================================================================

export const compounds = pgTable('compounds', {
  compoundId: uuid('compound_id').defaultRandom().primaryKey(),
  canonicalName: text('canonical_name').notNull(),
  aliases: text('aliases').array(),
  category: compoundCategoryEnum('category').notNull(),
  // Mechanism-level only — never benefit-level (CLAIMS_COMPLIANCE.md §5).
  mechanismSummary: text('mechanism_summary'),
});

export const doseRecords = pgTable('dose_records', {
  doseRecordId: uuid('dose_record_id').defaultRandom().primaryKey(),
  compoundId: uuid('compound_id')
    .notNull()
    .references(() => compounds.compoundId),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => sources.sourceId),
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

export const bioavailabilityRecords = pgTable('bioavailability_records', {
  bioavailabilityRecordId: uuid('bioavailability_record_id')
    .defaultRandom()
    .primaryKey(),
  compoundId: uuid('compound_id')
    .notNull()
    .references(() => compounds.compoundId),
  deliveryFormat: deliveryFormatEnum('delivery_format').notNull(),
  relativeBioavailabilityPct: real('relative_bioavailability_pct'),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => sources.sourceId),
});

export const interactionRecords = pgTable('interaction_records', {
  interactionRecordId: uuid('interaction_record_id')
    .defaultRandom()
    .primaryKey(),
  compoundIdA: uuid('compound_id_a')
    .notNull()
    .references(() => compounds.compoundId),
  compoundIdB: uuid('compound_id_b')
    .notNull()
    .references(() => compounds.compoundId),
  interactionType: interactionTypeEnum('interaction_type').notNull(),
  mechanismNote: text('mechanism_note'),
  severity: interactionSeverityEnum('severity').notNull().default('informational'),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => sources.sourceId),
});

// =============================================================================
// LAYER 3 — Scoring parameters: the distillation layer the formula (TECH_DOCS §2) reads.
// Only human_reviewed Layer 2 records should feed this layer (TECH_DOCS §3).
// =============================================================================

export const scoringParameters = pgTable('scoring_parameters', {
  scoringParameterId: uuid('scoring_parameter_id').defaultRandom().primaryKey(),
  compoundId: uuid('compound_id')
    .notNull()
    .references(() => compounds.compoundId),
  goalTag: text('goal_tag').notNull(),
  recommendedRangeLowMg: real('recommended_range_low_mg'),
  recommendedRangeHighMg: real('recommended_range_high_mg'),

  // COMPLIANCE HARD CONSTRAINT (CLAIMS_COMPLIANCE §4 / TECH_DOCS §4):
  // a scoring parameter may not exist without a linked evidence tier and the
  // sources that justify it. Enforced NOT NULL at the schema level.
  evidenceTier: evidenceTierEnum('evidence_tier').notNull(),
  contributingSourceIds: uuid('contributing_source_ids').array().notNull(),

  evidenceTierRationale: text('evidence_tier_rationale'),
  bioavailabilityAdjustmentFactor: real('bioavailability_adjustment_factor'),
  lastReviewedDate: timestamp('last_reviewed_date', { mode: 'date' }),
});

// =============================================================================
// USER-SIDE TABLES (TECH_DOCS §1 — standard shape). Minimal at scaffold stage.
// =============================================================================

export const userProfiles = pgTable('user_profiles', {
  userProfileId: uuid('user_profile_id').defaultRandom().primaryKey(),
  email: text('email'),
  goalsRanked: jsonb('goals_ranked'),
  budgetMonthly: real('budget_monthly'),
  riskTolerance: text('risk_tolerance'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userStackItems = pgTable('user_stack_items', {
  userStackItemId: uuid('user_stack_item_id').defaultRandom().primaryKey(),
  userProfileId: uuid('user_profile_id')
    .notNull()
    .references(() => userProfiles.userProfileId),
  compoundId: uuid('compound_id').references(() => compounds.compoundId),
  doseTakenMg: real('dose_taken_mg'),
  deliveryFormat: deliveryFormatEnum('delivery_format'),
  pricePaid: real('price_paid'),
  source: text('source'), // 'photo_scan' | 'manual'
});

export const userLabResults = pgTable('user_lab_results', {
  userLabResultId: uuid('user_lab_result_id').defaultRandom().primaryKey(),
  userProfileId: uuid('user_profile_id')
    .notNull()
    .references(() => userProfiles.userProfileId),
  marker: text('marker'),
  value: real('value'),
  unit: text('unit'),
  takenAt: timestamp('taken_at', { mode: 'date' }),
});

// Feeds a separate, clearly-labeled personalization layer only — never alters
// evidence_tier (TECH_DOCS §3).
export const userFeedback = pgTable('user_feedback', {
  userFeedbackId: uuid('user_feedback_id').defaultRandom().primaryKey(),
  userProfileId: uuid('user_profile_id')
    .notNull()
    .references(() => userProfiles.userProfileId),
  compoundId: uuid('compound_id').references(() => compounds.compoundId),
  outcomeSelfReport: text('outcome_self_report'),
  reportedAt: timestamp('reported_at').notNull().defaultNow(),
});

export const assessments = pgTable('assessments', {
  assessmentId: uuid('assessment_id').defaultRandom().primaryKey(),
  userProfileId: uuid('user_profile_id').references(() => userProfiles.userProfileId),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// =============================================================================
// ASSESSMENT SESSIONS (TECH_DOCS §1b) — durable, ANONYMOUS, 48h-expiring storage for an
// in-progress or completed assessment. This is NOT a user account: session_id is a random,
// identity-free token (no email, no login, no accounts). It replaces the old in-memory
// store so a session survives Render restarts/cold starts and is safe across instances.
// Independent of the evidence tables (compounds/sources/…), which are untouched.
// =============================================================================
export const assessmentSessions = pgTable(
  'assessment_sessions',
  {
    // The random session token — the same `assessment_id` returned by POST /assessment.
    sessionId: text('session_id').primaryKey(),
    // The assessment intake (stack items + profile) as JSON; the report is DERIVED from it
    // on read (single source of truth), not stored separately.
    data: jsonb('data').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
    // created_at + 48 hours. Rows past this are treated as "not found" and swept (see
    // session-store.ts). Nothing is persisted beyond this window.
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  },
  (t) => ({
    // Speeds up the expired-row sweep on session creation.
    expiresAtIdx: index('assessment_sessions_expires_at_idx').on(t.expiresAt),
  }),
);

export type AssessmentSessionRow = typeof assessmentSessions.$inferSelect;
export type NewAssessmentSessionRow = typeof assessmentSessions.$inferInsert;
